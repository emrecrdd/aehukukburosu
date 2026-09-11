import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import {
  authRepository,
} from './auth.repository.js';

import {
  generateTokens,
  verifyToken,
  TOKEN_TYPES,
  TOKEN_AUDIENCES,
} from '../../utils/jwt.js';

import {
  config,
} from '../../config/env.js';

import {
  logger,
} from '../../config/logger.js';

import {
  emailService,
} from '../../integrations/email.service.js';

// ======================================================
// CONSTANTS
// ======================================================

const MIN_PASSWORD_LENGTH =
  12;

const RESET_TOKEN_EXPIRY_MS =
  60 * 60 * 1000;

const DUMMY_PASSWORD_HASH =
  bcrypt.hashSync(
    'derkenar-invalid-login-placeholder',
    12
  );

const getNowSeconds = () =>
  Math.floor(
    Date.now() / 1000
  );

const getSessionMaxAgeSeconds = () =>
  Math.max(
    1,
    Math.floor(
      Number(
        config.AUTH_SESSION_MAX_AGE_MS
      ) / 1000
    )
  );

const getSessionWindowFromToken = (
  decoded
) => {
  const now =
    getNowSeconds();

  const rawStartedAt =
    Number(
      decoded?.sessionStartedAt ??
      decoded?.iat
    );

  const sessionStartedAt =
    Number.isFinite(
      rawStartedAt
    ) &&
    rawStartedAt > 0
      ? Math.floor(
          rawStartedAt
        )
      : now;

  const rawExpiresAt =
    Number(
      decoded?.sessionExpiresAt
    );

  const sessionExpiresAt =
    Number.isFinite(
      rawExpiresAt
    ) &&
    rawExpiresAt > 0
      ? Math.floor(
          rawExpiresAt
        )
      : sessionStartedAt +
        getSessionMaxAgeSeconds();

  return {
    sessionStartedAt,
    sessionExpiresAt,
    isExpired:
      sessionExpiresAt <=
      now,
  };
};

// ======================================================
// HELPERS
// ======================================================

const normalizeEmail = (
  email
) => {
  return String(
    email || ''
  )
    .trim()
    .toLowerCase();
};

const validatePassword = (
  password
) => {
  if (
    typeof password !==
    'string'
  ) {
    throw new Error(
      'GeÃ§erli bir ÅŸifre girilmelidir'
    );
  }

  if (
    password.length <
    MIN_PASSWORD_LENGTH
  ) {
    throw new Error(
      `Åifre en az ${MIN_PASSWORD_LENGTH} karakter olmalÄ±dÄ±r`
    );
  }

  if (
    password.trim()
      .length === 0
  ) {
    throw new Error(
      'Åifre yalnÄ±zca boÅŸluk karakterlerinden oluÅŸamaz'
    );
  }

  /*
   * bcrypt ilk 72 byte sonrasÄ±nÄ± iÅŸleyemez.
   * Sessiz truncation'a izin vermiyoruz.
   */
  if (
    typeof bcrypt.truncates ===
      'function' &&
    bcrypt.truncates(
      password
    )
  ) {
    throw new Error(
      'Åifre Ã§ok uzun. LÃ¼tfen daha kÄ±sa bir ÅŸifre kullanÄ±n.'
    );
  }
};

const getTokenUserId = (
  decoded
) => {
  return (
    decoded?.id ||
    decoded?.userId ||
    decoded?.sub ||
    null
  );
};

const getUserTokenVersion = (
  user
) => {
  const value =
    Number(
      user?.token_version
    );

  if (
    Number.isInteger(
      value
    ) &&
    value >= 0
  ) {
    return value;
  }

  return 0;
};

const increaseTokenVersion = (
  user
) => {
  user.token_version =
    getUserTokenVersion(
      user
    ) + 1;
};

const validateRefreshTokenType = (
  decoded
) => {
  if (!decoded) {
    return false;
  }

  /*
   * LEGACY TOKEN
   *
   * Eski tokenlarda type alanÄ± yoktu.
   * Yeni tokenlarda type=refresh zorunlu.
   */
  if (
    decoded.type ===
      undefined ||
    decoded.type ===
      null
  ) {
    return true;
  }

  return (
    decoded.type ===
    TOKEN_TYPES.REFRESH
  );
};

const validateTokenVersion = (
  decoded,
  user
) => {
  const databaseVersion =
    getUserTokenVersion(
      user
    );

  /*
   * Eski JWT'lerde tokenVersion yok.
   *
   * Legacy token yalnÄ±zca kullanÄ±cÄ±nÄ±n
   * token_version deÄŸeri hÃ¢lÃ¢ 0 ise kabul edilir.
   */
  if (
    decoded?.tokenVersion ===
      undefined ||
    decoded?.tokenVersion ===
      null
  ) {
    return (
      databaseVersion === 0
    );
  }

  const tokenVersion =
    Number(
      decoded.tokenVersion
    );

  if (
    !Number.isInteger(
      tokenVersion
    ) ||
    tokenVersion < 0
  ) {
    return false;
  }

  return (
    tokenVersion ===
    databaseVersion
  );
};

// ======================================================
// SERVICE
// ======================================================

export const authService = {
  // ====================================================
  // LOGIN
  // ====================================================

  async login(
    email,
    password
  ) {
    const cleanEmail =
      normalizeEmail(
        email
      );

    if (
      !cleanEmail ||
      !password
    ) {
      throw new Error(
        'E-posta ve ÅŸifre gereklidir'
      );
    }

    const user =
      await authRepository.findByEmail(
        cleanEmail
      );

    // ==================================================
    // TIMING PROTECTION
    // ==================================================

    const passwordHash =
      user?.password ||
      DUMMY_PASSWORD_HASH;

    let isPasswordValid =
      false;

    try {
      isPasswordValid =
        await bcrypt.compare(
          password,
          passwordHash
        );
    } catch {
      isPasswordValid =
        false;
    }
if (
      !user ||
      !user.password ||
      !isPasswordValid
    ) {
      throw new Error(
        'E-posta veya ÅŸifre hatalÄ±'
      );
    }

    // ==================================================
    // ACCOUNT STATUS
    // ==================================================

    if (
      user.is_active !==
      true
    ) {
      throw new Error(
        'HesabÄ±nÄ±z pasif durumda. BÃ¼ro yÃ¶neticinizle iletiÅŸime geÃ§in.'
      );
    }

    // ==================================================
    // TOKENS
    // ==================================================

    const {
      accessToken,
      refreshToken,
      sessionExpiresAt,
    } = generateTokens(
      user
    );

    /*
     * Repository refresh tokenÄ±n SHA-256
     * hash'ini saklÄ±yor.
     */
    await authRepository.updateRefreshToken(
      user.id,
      refreshToken
    );

    await user.update({
      last_login:
        new Date(),
    });

    return {
      user,
      accessToken,
      refreshToken,
      sessionExpiresAt,
    };
  },

  // ====================================================
  // LOGOUT
  // ====================================================

  async logout(
    refreshToken
  ) {
    if (
      !refreshToken
    ) {
      return;
    }

    const user =
      await authRepository.findByRefreshToken(
        refreshToken
      );

    if (
      !user
    ) {
      /*
       * Logout idempotent.
       */
      return;
    }

    /*
     * Mevcut access tokenlarÄ± da geÃ§ersiz kÄ±l.
     */
    increaseTokenVersion(
      user
    );

    await user.save();

    /*
     * Server-side refresh tokenÄ± iptal et.
     */
    await authRepository.invalidateRefreshToken(
      refreshToken
    );
  },

  // ====================================================
  // REFRESH TOKEN
  // ====================================================

  async refreshToken(
    refreshToken
  ) {
    if (
      !refreshToken
    ) {
      throw new Error(
        'Refresh token gerekli'
      );
    }

    // ================================================
    // JWT VERIFY
    // ================================================

    let decoded;

    try {
      /*
       * Burada artÄ±k:
       *
       * - signature
       * - expiration
       * - HS256
       * - issuer
       * - refresh audience
       *
       * doÄŸrulanÄ±yor.
       *
       * Eski iss/aud taÅŸÄ±mayan tokenlara geÃ§iÅŸ
       * dÃ¶neminde izin veriliyor.
       */
      decoded =
        verifyToken(
          refreshToken,
          config.JWT_REFRESH_SECRET,
          {
            audience:
              TOKEN_AUDIENCES.REFRESH,

            allowLegacyClaims:
              true,
          }
        );
    } catch {
      try {
        await authRepository.invalidateRefreshToken(
          refreshToken
        );
      } catch (
        cleanupError
      ) {
        logger.warn(
          'Invalid refresh-token cleanup failed:',
          cleanupError
        );
      }

      throw new Error(
        'GeÃ§ersiz veya sÃ¼resi dolmuÅŸ oturum'
      );
    }

    if (
      !decoded
    ) {
      throw new Error(
        'GeÃ§ersiz veya sÃ¼resi dolmuÅŸ oturum'
      );
    }

    // ================================================
    // ABSOLUTE SESSION WINDOW
    // ================================================

    const {
      sessionStartedAt,
      sessionExpiresAt,
      isExpired:
        isAbsoluteSessionExpired,
    } = getSessionWindowFromToken(
      decoded
    );

    if (
      isAbsoluteSessionExpired
    ) {
      try {
        await authRepository.invalidateRefreshToken(
          refreshToken
        );
      } catch (
        cleanupError
      ) {
        logger.warn(
          'Expired absolute-session refresh-token cleanup failed:',
          cleanupError
        );
      }

      throw new Error(
        'Oturum sÃ¼reniz doldu. LÃ¼tfen tekrar giriÅŸ yapÄ±n.'
      );
    }

    // ================================================
    // TOKEN TYPE
    // ================================================

    if (
      !validateRefreshTokenType(
        decoded
      )
    ) {
      throw new Error(
        'GeÃ§ersiz oturum tÃ¼rÃ¼'
      );
    }

    // ================================================
    // TOKEN USER ID
    // ================================================

    const tokenUserId =
      getTokenUserId(
        decoded
      );

    if (
      !tokenUserId
    ) {
      throw new Error(
        'GeÃ§ersiz oturum'
      );
    }

    // ================================================
    // SERVER-SIDE TOKEN CHECK
    // ================================================

    const user =
      await authRepository.findByRefreshToken(
        refreshToken
      );

    if (
      !user
    ) {
      throw new Error(
        'GeÃ§ersiz veya sÃ¼resi dolmuÅŸ oturum'
      );
    }

    // ================================================
    // TOKEN / USER MATCH
    // ================================================

    if (
      String(
        tokenUserId
      ) !==
      String(
        user.id
      )
    ) {
      try {
        await authRepository.invalidateRefreshToken(
          refreshToken
        );
      } catch (
        cleanupError
      ) {
        logger.warn(
          'Refresh-token mismatch cleanup failed:',
          cleanupError
        );
      }

      throw new Error(
        'GeÃ§ersiz oturum'
      );
    }

    // ================================================
    // ACCOUNT STATUS
    // ================================================

    if (
      user.is_active !==
      true
    ) {
      try {
        await authRepository.invalidateRefreshToken(
          refreshToken
        );
      } catch (
        error
      ) {
        logger.warn(
          'Inactive user refresh-token cleanup failed:',
          error
        );
      }

      throw new Error(
        'KullanÄ±cÄ± hesabÄ± aktif deÄŸil'
      );
    }

    // ================================================
    // TOKEN VERSION
    // ================================================

    if (
      !validateTokenVersion(
        decoded,
        user
      )
    ) {
      try {
        await authRepository.invalidateRefreshToken(
          refreshToken
        );
      } catch (
        cleanupError
      ) {
        logger.warn(
          'Revoked refresh-token cleanup failed:',
          cleanupError
        );
      }

      throw new Error(
        'Oturum geÃ§erliliÄŸini kaybetti. LÃ¼tfen tekrar giriÅŸ yapÄ±n.'
      );
    }

    // ================================================
    // CREATE NEW TOKENS
    // ================================================

    const {
      accessToken,
      refreshToken:
        newRefreshToken,
    } = generateTokens(
      user,
      {
        sessionStartedAt,
        sessionExpiresAt,
      }
    );

    // ================================================
    // ATOMIC ROTATION
    // ================================================

    const rotated =
      await authRepository.rotateRefreshToken(
        user.id,
        refreshToken,
        newRefreshToken
      );

    if (
      !rotated
    ) {
      throw new Error(
        'GeÃ§ersiz veya sÃ¼resi dolmuÅŸ oturum'
      );
    }

    return {
      accessToken,

      refreshToken:
        newRefreshToken,

      sessionExpiresAt,
    };
  },

  // ====================================================
  // PROFILE
  // ====================================================

  async getProfile(
    userId
  ) {
    if (
      !userId
    ) {
      throw new Error(
        'KullanÄ±cÄ± bilgisi bulunamadÄ±'
      );
    }

    const user =
      await authRepository.findById(
        userId
      );

    if (
      !user
    ) {
      throw new Error(
        'KullanÄ±cÄ± bulunamadÄ±'
      );
    }

    if (
      user.is_active !==
      true
    ) {
      throw new Error(
        'KullanÄ±cÄ± hesabÄ± aktif deÄŸil'
      );
    }

    return user;
  },

  // ====================================================
  // CHANGE PASSWORD
  // ====================================================

  async changePassword(
    userId,
    currentPassword,
    newPassword
  ) {
    if (
      !currentPassword
    ) {
      throw new Error(
        'Mevcut ÅŸifre gereklidir'
      );
    }

    validatePassword(
      newPassword
    );

    if (
      currentPassword ===
      newPassword
    ) {
      throw new Error(
        'Yeni ÅŸifre mevcut ÅŸifre ile aynÄ± olamaz'
      );
    }

    const user =
      await authRepository.findByIdWithPassword(
        userId
      );

    if (
      !user
    ) {
      throw new Error(
        'KullanÄ±cÄ± bulunamadÄ±'
      );
    }

    if (
      !user.password
    ) {
      throw new Error(
        'KullanÄ±cÄ± ÅŸifresi bulunamadÄ±'
      );
    }

    const isPasswordValid =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (
      !isPasswordValid
    ) {
      throw new Error(
        'Mevcut ÅŸifre yanlÄ±ÅŸ'
      );
    }

    /*
     * Åifre deÄŸiÅŸince mevcut access tokenlarÄ±n
     * tamamÄ± geÃ§ersiz hale gelir.
     */
    user.password =
      newPassword;

    increaseTokenVersion(
      user
    );

    await user.save();

    /*
     * Mevcut refresh oturumlarÄ±nÄ± da kapat.
     */
    await authRepository.invalidateAllRefreshTokens(
      userId
    );
  },

  // ====================================================
  // FORGOT PASSWORD
  // ====================================================

  async forgotPassword(
    email
  ) {
    const cleanEmail =
      normalizeEmail(
        email
      );

    if (
      !cleanEmail
    ) {
      return;
    }

    const user =
      await authRepository.findByEmail(
        cleanEmail
      );

    /*
     * ACCOUNT ENUMERATION KORUMASI
     */
    if (
      !user
    ) {
      return;
    }

    if (
      user.is_active !==
      true
    ) {
      return;
    }

    // ================================================
    // RESET TOKEN
    // ================================================

    const resetToken =
      crypto
        .randomBytes(
          32
        )
        .toString(
          'hex'
        );

    const resetExpires =
      new Date(
        Date.now() +
          RESET_TOKEN_EXPIRY_MS
      );

    await authRepository.savePasswordResetToken(
      user.id,
      resetToken,
      resetExpires
    );

    // ================================================
    // EMAIL
    // ================================================

    try {
      await emailService.sendPasswordResetEmail(
        user,
        resetToken
      );
    } catch (
      error
    ) {
      logger.error(
        'Password reset email error:',
        error
      );
    }
  },

  // ====================================================
  // RESET PASSWORD
  // ====================================================

  async resetPassword(
    token,
    newPassword
  ) {
    if (
      !token
    ) {
      throw new Error(
        'Åifre sÄ±fÄ±rlama baÄŸlantÄ±sÄ± geÃ§ersiz'
      );
    }

    validatePassword(
      newPassword
    );

    const user =
      await authRepository.findByPasswordResetToken(
        token
      );

    if (
      !user
    ) {
      throw new Error(
        'Åifre sÄ±fÄ±rlama baÄŸlantÄ±sÄ± geÃ§ersiz veya sÃ¼resi dolmuÅŸ'
      );
    }

    // ================================================
    // EXPIRATION
    // ================================================

    if (
      !user.password_reset_expires ||
      new Date(
        user.password_reset_expires
      ) <=
        new Date()
    ) {
      try {
        await authRepository.clearPasswordResetToken(
          user.id
        );
      } catch (
        cleanupError
      ) {
        logger.warn(
          'Expired password-reset-token cleanup failed:',
          cleanupError
        );
      }

      throw new Error(
        'Åifre sÄ±fÄ±rlama baÄŸlantÄ±sÄ±nÄ±n sÃ¼resi dolmuÅŸ'
      );
    }

    // ================================================
    // ACCOUNT STATUS
    // ================================================

    if (
      user.is_active !==
      true
    ) {
      try {
        await authRepository.clearPasswordResetToken(
          user.id
        );
      } catch (
        cleanupError
      ) {
        logger.warn(
          'Inactive user password-reset-token cleanup failed:',
          cleanupError
        );
      }

      throw new Error(
        'KullanÄ±cÄ± hesabÄ± aktif deÄŸil'
      );
    }

    // ================================================
    // PASSWORD + TOKEN REVOCATION
    // ================================================

    user.password =
      newPassword;

    increaseTokenVersion(
      user
    );

    /*
     * Reset token tek kullanÄ±mlÄ±k.
     */
    user.password_reset_token =
      null;

    user.password_reset_expires =
      null;

    await user.save();

    /*
     * BÃ¼tÃ¼n refresh oturumlarÄ±nÄ± da kapat.
     */
    await authRepository.invalidateAllRefreshTokens(
      user.id
    );
  },
};

export default authService;
