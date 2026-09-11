import crypto from 'crypto';

import {
  CalendarIntegration,
} from '../../models/CalendarIntegration.js';

import {
  GOOGLE_CALENDAR_SCOPES,
  createGoogleCalendarOAuthClient,
} from '../../config/googleCalendar.js';

import {
  encryptToken,
  decryptToken,
} from '../../utils/tokenEncryption.util.js';

import {
  logger,
} from '../../config/logger.js';

// ======================================================
// CONSTANTS
// ======================================================

const GOOGLE_PROVIDER =
  'google';

const GOOGLE_CALENDAR_ID =
  'primary';

const STATE_TTL_MS =
  10 * 60 * 1000;

// ======================================================
// STATE HELPERS
// ======================================================

/*
 * OAuth callback state içine user_id koyuyoruz.
 *
 * Ancak düz user_id gönderip güvenmiyoruz.
 * HMAC imzasıyla doğruluyoruz.
 *
 * Böylece başka bir kullanıcı callback state'ini
 * değiştirerek Google hesabını farklı kullanıcıya
 * bağlayamaz.
 */

const getStateSecret = () => {
  const secret =
    process.env
      .CALENDAR_TOKEN_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      'CALENDAR_TOKEN_ENCRYPTION_KEY tanımlı değil'
    );
  }

  return secret;
};

const signStatePayload = (
  payload
) => {
  return crypto
    .createHmac(
      'sha256',
      getStateSecret()
    )
    .update(
      payload
    )
    .digest(
      'base64url'
    );
};

const createOAuthState = (
  userId
) => {
  if (!userId) {
    throw new Error(
      'OAuth state için kullanıcı gereklidir'
    );
  }

  const now =
    Date.now();

  const payload = {
    user_id:
      String(userId),

    issued_at:
      now,

    expires_at:
      now +
      STATE_TTL_MS,

    nonce:
      crypto
        .randomBytes(16)
        .toString(
          'base64url'
        ),
  };

  const encodedPayload =
    Buffer
      .from(
        JSON.stringify(
          payload
        ),
        'utf8'
      )
      .toString(
        'base64url'
      );

  const signature =
    signStatePayload(
      encodedPayload
    );

  return `${encodedPayload}.${signature}`;
};

const verifyOAuthState = (
  state
) => {
  if (!state) {
    throw new Error(
      'Google OAuth state bilgisi eksik'
    );
  }

  const parts =
    String(state)
      .split('.');

  if (
    parts.length !==
    2
  ) {
    throw new Error(
      'Google OAuth state bilgisi geçersiz'
    );
  }

  const [
    encodedPayload,
    receivedSignature,
  ] = parts;

  const expectedSignature =
    signStatePayload(
      encodedPayload
    );

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      'utf8'
    );

  const receivedBuffer =
    Buffer.from(
      receivedSignature,
      'utf8'
    );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    throw new Error(
      'Google OAuth state doğrulanamadı'
    );
  }

  const valid =
    crypto.timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    );

  if (!valid) {
    throw new Error(
      'Google OAuth state doğrulanamadı'
    );
  }

  let payload;

  try {
    payload =
      JSON.parse(
        Buffer
          .from(
            encodedPayload,
            'base64url'
          )
          .toString(
            'utf8'
          )
      );
  } catch {
    throw new Error(
      'Google OAuth state içeriği geçersiz'
    );
  }

  if (
    !payload?.user_id ||
    !payload?.expires_at
  ) {
    throw new Error(
      'Google OAuth state içeriği eksik'
    );
  }

  if (
    Date.now() >
    Number(
      payload.expires_at
    )
  ) {
    throw new Error(
      'Google OAuth bağlantı isteğinin süresi doldu'
    );
  }

  return payload;
};

// ======================================================
// TOKEN HELPERS
// ======================================================

const getCredentialsFromIntegration = (
  integration
) => {
  if (!integration) {
    throw new Error(
      'Google Calendar bağlantısı bulunamadı'
    );
  }

  if (
    !integration
      .refresh_token_encrypted &&
    !integration
      .access_token_encrypted
  ) {
    throw new Error(
      'Google Calendar bağlantı tokenı bulunamadı'
    );
  }

  const credentials = {};

  if (
    integration
      .access_token_encrypted
  ) {
    credentials.access_token =
      decryptToken(
        integration
          .access_token_encrypted
      );
  }

  if (
    integration
      .refresh_token_encrypted
  ) {
    credentials.refresh_token =
      decryptToken(
        integration
          .refresh_token_encrypted
      );
  }

  if (
    integration
      .token_type
  ) {
    credentials.token_type =
      integration
        .token_type;
  }

  if (
    integration
      .scope
  ) {
    credentials.scope =
      integration.scope;
  }

  if (
    integration
      .expires_at
  ) {
    credentials.expiry_date =
      new Date(
        integration
          .expires_at
      ).getTime();
  }

  return credentials;
};

// ======================================================
// SAFE RESPONSE
// ======================================================

const serializeIntegration = (
  integration
) => {
  if (!integration) {
    return {
      connected:
        false,

      provider:
        GOOGLE_PROVIDER,
    };
  }

  return {
    connected:
      Boolean(
        integration
          .is_active
      ),

    id:
      integration.id,

    provider:
      integration.provider,

    account_email:
      integration
        .account_email,

    calendar_id:
      integration
        .calendar_id,

    is_active:
      integration
        .is_active,

    expires_at:
      integration
        .expires_at,

    last_synced_at:
      integration
        .last_synced_at,

    last_error:
      integration
        .last_error,

    created_at:
      integration
        .created_at,

    updated_at:
      integration
        .updated_at,
  };
};

// ======================================================
// SERVICE
// ======================================================

export const calendarIntegrationService = {

  // ====================================================
  // GOOGLE AUTH URL
  // ====================================================

  async getGoogleAuthorizationUrl(
    userId
  ) {
    if (!userId) {
      throw new Error(
        'Kullanıcı bilgisi gereklidir'
      );
    }

    const oauthClient =
      createGoogleCalendarOAuthClient();

    const state =
      createOAuthState(
        userId
      );

    /*
     * offline:
     * refresh_token almak için gerekir.
     *
     * consent:
     * Kullanıcının daha önce izin verdiği durumlarda da
     * yeni bağlantıda refresh_token alma ihtimalimizi
     * güvenilir tutar.
     *
     * include_granted_scopes:
     * incremental authorization için Google'ın
     * önerdiği ayardır.
     */
    return oauthClient.generateAuthUrl({
      access_type:
        'offline',

      prompt:
        'consent',

      scope:
        GOOGLE_CALENDAR_SCOPES,

      include_granted_scopes:
        true,

      state,
    });
  },

  // ====================================================
  // GOOGLE CALLBACK
  // ====================================================

  async handleGoogleCallback({
    code,
    state,
  }) {
    if (!code) {
      throw new Error(
        'Google OAuth authorization code eksik'
      );
    }

    const statePayload =
      verifyOAuthState(
        state
      );

    const userId =
      statePayload
        .user_id;

    const oauthClient =
      createGoogleCalendarOAuthClient();

    const {
      tokens,
    } =
      await oauthClient.getToken(
        code
      );

    if (
      !tokens
        ?.access_token
    ) {
      throw new Error(
        'Google access token alınamadı'
      );
    }

    const existingIntegration =
      await CalendarIntegration.findOne({
        where: {
          user_id:
            userId,

          provider:
            GOOGLE_PROVIDER,
        },
      });

    /*
     * Google her authorization code exchange işleminde
     * refresh_token döndürmeyebilir.
     *
     * Eğer mevcut bağlantıda refresh token varsa
     * kaybetmiyoruz.
     */
    let refreshTokenEncrypted =
      existingIntegration
        ?.refresh_token_encrypted ||
      null;

    if (
      tokens.refresh_token
    ) {
      refreshTokenEncrypted =
        encryptToken(
          tokens.refresh_token
        );
    }

    if (
      !refreshTokenEncrypted
    ) {
      throw new Error(
        'Google refresh token alınamadı. Google bağlantısını yeniden deneyin.'
      );
    }

    const values = {
      user_id:
        userId,

      provider:
        GOOGLE_PROVIDER,

      calendar_id:
        GOOGLE_CALENDAR_ID,

      access_token_encrypted:
        encryptToken(
          tokens.access_token
        ),

      refresh_token_encrypted:
        refreshTokenEncrypted,

      token_type:
        tokens.token_type ||
        'Bearer',

      scope:
        tokens.scope ||
        GOOGLE_CALENDAR_SCOPES.join(
          ' '
        ),

      expires_at:
        tokens.expiry_date
          ? new Date(
              tokens.expiry_date
            )
          : null,

      is_active:
        true,

      last_error:
        null,
    };

    let integration;

    if (
      existingIntegration
    ) {
      await existingIntegration.update(
        values
      );

      integration =
        existingIntegration;
    } else {
      integration =
        await CalendarIntegration.create(
          values
        );
    }

    return serializeIntegration(
      integration
    );
  },

  // ====================================================
  // CONNECTION STATUS
  // ====================================================

  async getGoogleIntegration(
    userId
  ) {
    const integration =
      await CalendarIntegration.findOne({
        where: {
          user_id:
            userId,

          provider:
            GOOGLE_PROVIDER,
        },
      });

    return serializeIntegration(
      integration
    );
  },

  // ====================================================
  // AUTHORIZED GOOGLE CLIENT
  // ====================================================

  async getAuthorizedGoogleClient(
    userId
  ) {
    const integration =
      await CalendarIntegration.findOne({
        where: {
          user_id:
            userId,

          provider:
            GOOGLE_PROVIDER,

          is_active:
            true,
        },
      });

    if (!integration) {
      throw new Error(
        'Google Calendar bağlı değil'
      );
    }

    const credentials =
      getCredentialsFromIntegration(
        integration
      );

    const oauthClient =
      createGoogleCalendarOAuthClient();

    oauthClient.setCredentials(
      credentials
    );

    /*
     * Google client access_token yenilerse
     * yeni tokenı tekrar şifreli şekilde saklıyoruz.
     *
     * refresh_token event içinde gelmezse eskisini
     * koruyoruz.
     */
    oauthClient.on(
      'tokens',
      async (
        tokens
      ) => {
        try {
          const updates = {
            last_error:
              null,
          };

          if (
            tokens.access_token
          ) {
            updates.access_token_encrypted =
              encryptToken(
                tokens.access_token
              );
          }

          if (
            tokens.refresh_token
          ) {
            updates.refresh_token_encrypted =
              encryptToken(
                tokens.refresh_token
              );
          }

          if (
            tokens.token_type
          ) {
            updates.token_type =
              tokens.token_type;
          }

          if (
            tokens.scope
          ) {
            updates.scope =
              tokens.scope;
          }

          if (
            tokens.expiry_date
          ) {
            updates.expires_at =
              new Date(
                tokens.expiry_date
              );
          }

          await integration.update(
            updates
          );
        } catch (
          tokenUpdateError
        ) {
          logger.error(
            'Google Calendar refreshed token save error:',
            tokenUpdateError
          );
        }
      }
    );

    return {
      oauthClient,
      integration,
    };
  },

  // ====================================================
  // SYNC SUCCESS
  // ====================================================

  async markGoogleSyncSuccess(
    integration
  ) {
    if (!integration) {
      return;
    }

    await integration.update({
      last_synced_at:
        new Date(),

      last_error:
        null,
    });
  },

  // ====================================================
  // SYNC ERROR
  // ====================================================

  async markGoogleSyncError(
    integration,
    error
  ) {
    if (!integration) {
      return;
    }

    const message =
      String(
        error?.message ||
        'Google Calendar senkronizasyon hatası'
      ).slice(
        0,
        5000
      );

    await integration.update({
      last_error:
        message,
    });
  },

  // ====================================================
  // DISCONNECT GOOGLE
  // ====================================================

  async disconnectGoogle(
    userId
  ) {
    const integration =
      await CalendarIntegration.findOne({
        where: {
          user_id:
            userId,

          provider:
            GOOGLE_PROVIDER,
        },
      });

    if (!integration) {
      return {
        disconnected:
          true,
      };
    }

    /*
     * Önce Google tarafında tokenı revoke etmeye
     * çalışıyoruz.
     *
     * Revoke başarısız olsa bile Derkenar tarafındaki
     * bağlantıyı kaldıracağız.
     */
    try {
      const oauthClient =
        createGoogleCalendarOAuthClient();

      const refreshToken =
        integration
          .refresh_token_encrypted
          ? decryptToken(
              integration
                .refresh_token_encrypted
            )
          : null;

      const accessToken =
        integration
          .access_token_encrypted
          ? decryptToken(
              integration
                .access_token_encrypted
            )
          : null;

      const tokenToRevoke =
        refreshToken ||
        accessToken;

      if (
        tokenToRevoke
      ) {
        await oauthClient.revokeToken(
          tokenToRevoke
        );
      }
    } catch (
      revokeError
    ) {
      logger.error(
        'Google Calendar token revoke error:',
        revokeError
      );
    }

    await integration.destroy();

    return {
      disconnected:
        true,
    };
  },
};

export default calendarIntegrationService;