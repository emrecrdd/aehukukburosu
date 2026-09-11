import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import {
  config,
} from '../config/env.js';

// ======================================================
// JWT SECURITY CONSTANTS
// ======================================================

export const JWT_ALGORITHM =
  'HS256';

export const JWT_ISSUER =
  'derkenar-api';

export const TOKEN_TYPES = {
  ACCESS:
    'access',

  REFRESH:
    'refresh',
};

export const TOKEN_AUDIENCES = {
  ACCESS:
    'derkenar-web',

  REFRESH:
    'derkenar-refresh',
};

// ======================================================
// HELPERS
// ======================================================

const getTokenVersion = (
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

const hasExpectedAudience = (
  audience,
  expectedAudience
) => {
  if (
    !expectedAudience
  ) {
    return true;
  }

  if (
    Array.isArray(
      audience
    )
  ) {
    return audience.includes(
      expectedAudience
    );
  }

  return (
    audience ===
    expectedAudience
  );
};

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

const normalizeNumericDate = (
  value
) => {
  const numeric =
    Number(
      value
    );

  if (
    !Number.isFinite(
      numeric
    ) ||
    numeric <= 0
  ) {
    return null;
  }

  return Math.floor(
    numeric
  );
};

const resolveSessionWindow = (
  options = {}
) => {
  const now =
    getNowSeconds();

  const requestedStart =
    normalizeNumericDate(
      options.sessionStartedAt
    );

  const sessionStartedAt =
    requestedStart ||
    now;

  const requestedExpiry =
    normalizeNumericDate(
      options.sessionExpiresAt
    );

  const sessionExpiresAt =
    requestedExpiry ||
    (
      sessionStartedAt +
      getSessionMaxAgeSeconds()
    );

  if (
    sessionExpiresAt <=
    now
  ) {
    throw new jwt.TokenExpiredError(
      'Oturumun azami süresi doldu',
      new Date(
        sessionExpiresAt * 1000
      )
    );
  }

  return {
    sessionStartedAt,
    sessionExpiresAt,
  };
};

const validateAbsoluteSession = (
  decoded,
  {
    allowLegacySession = true,
  } = {}
) => {
  const sessionExpiresAt =
    normalizeNumericDate(
      decoded?.sessionExpiresAt
    );

  if (
    !sessionExpiresAt
  ) {
    if (
      !allowLegacySession
    ) {
      throw new jwt.JsonWebTokenError(
        'JWT session expiry bulunamadı'
      );
    }

    return;
  }

  if (
    sessionExpiresAt <=
    getNowSeconds()
  ) {
    throw new jwt.TokenExpiredError(
      'Oturumun azami süresi doldu',
      new Date(
        sessionExpiresAt * 1000
      )
    );
  }
};

// ======================================================
// GENERATE TOKENS
// ======================================================

export const generateTokens = (
  user,
  options = {}
) => {
  if (
    !user?.id
  ) {
    throw new Error(
      'Token oluşturmak için geçerli kullanıcı gereklidir'
    );
  }

  const {
    sessionStartedAt,
    sessionExpiresAt,
  } = resolveSessionWindow(
    options
  );

  // ====================================================
  // BASE PAYLOAD
  // ====================================================

  /*
   * id/email/role mevcut frontend ve backend
   * uyumluluğunu korumak için şimdilik tutuluyor.
   *
   * sessionStartedAt/sessionExpiresAt refresh rotation
   * boyunca değişmez. Böylece refresh işlemi mutlak
   * oturum süresini yeniden başlatamaz.
   */
  const basePayload = {
    id:
      user.id,

    email:
      user.email,

    role:
      user.role,

    tokenVersion:
      getTokenVersion(
        user
      ),

    sessionStartedAt,
    sessionExpiresAt,
  };

  // ====================================================
  // ACCESS TOKEN
  // ====================================================

  const accessToken =
    jwt.sign(
      {
        ...basePayload,

        type:
          TOKEN_TYPES.ACCESS,
      },
      config.JWT_SECRET,
      {
        algorithm:
          JWT_ALGORITHM,

        expiresIn:
          config.JWT_EXPIRES_IN,

        jwtid:
          crypto.randomUUID(),

        issuer:
          JWT_ISSUER,

        audience:
          TOKEN_AUDIENCES.ACCESS,
      }
    );

  // ====================================================
  // REFRESH TOKEN
  // ====================================================

  const refreshToken =
    jwt.sign(
      {
        ...basePayload,

        type:
          TOKEN_TYPES.REFRESH,
      },
      config.JWT_REFRESH_SECRET,
      {
        algorithm:
          JWT_ALGORITHM,

        expiresIn:
          config.JWT_REFRESH_EXPIRES_IN,

        jwtid:
          crypto.randomUUID(),

        issuer:
          JWT_ISSUER,

        audience:
          TOKEN_AUDIENCES.REFRESH,
      }
    );

  return {
    accessToken,
    refreshToken,
    sessionStartedAt,
    sessionExpiresAt,
  };
};

// ======================================================
// VERIFY TOKEN
// ======================================================

export const verifyToken = (
  token,
  secret,
  options = {}
) => {
  if (
    !token ||
    typeof token !==
      'string'
  ) {
    throw new jwt.JsonWebTokenError(
      'Token bulunamadı'
    );
  }

  if (
    !secret ||
    typeof secret !==
      'string'
  ) {
    throw new Error(
      'JWT secret yapılandırılmamış'
    );
  }

  const {
    audience:
      expectedAudience = null,

    allowLegacyClaims = true,

    /*
     * Geçiş döneminde eski tokenlarda sessionExpiresAt
     * claim'i bulunmayabilir. Refresh edildiğinde yeni
     * tokenlar mutlak oturum claim'leriyle üretilecektir.
     */
    allowLegacySession = true,
  } = options;

  // ====================================================
  // SIGNATURE / EXPIRATION / ALGORITHM
  // ====================================================

  const decoded =
    jwt.verify(
      token,
      secret,
      {
        algorithms: [
          JWT_ALGORITHM,
        ],
      }
    );

  // ====================================================
  // ISSUER
  // ====================================================

  if (
    decoded?.iss ===
      undefined ||
    decoded?.iss ===
      null
  ) {
    if (
      !allowLegacyClaims
    ) {
      throw new jwt.JsonWebTokenError(
        'JWT issuer bulunamadı'
      );
    }
  } else if (
    decoded.iss !==
    JWT_ISSUER
  ) {
    throw new jwt.JsonWebTokenError(
      'Geçersiz JWT issuer'
    );
  }

  // ====================================================
  // AUDIENCE
  // ====================================================

  if (
    expectedAudience
  ) {
    if (
      decoded?.aud ===
        undefined ||
      decoded?.aud ===
        null
    ) {
      if (
        !allowLegacyClaims
      ) {
        throw new jwt.JsonWebTokenError(
          'JWT audience bulunamadı'
        );
      }
    } else if (
      !hasExpectedAudience(
        decoded.aud,
        expectedAudience
      )
    ) {
      throw new jwt.JsonWebTokenError(
        'Geçersiz JWT audience'
      );
    }
  }

  // ====================================================
  // ABSOLUTE SESSION EXPIRY
  // ====================================================

  validateAbsoluteSession(
    decoded,
    {
      allowLegacySession,
    }
  );

  return decoded;
};

// ======================================================
// DECODE TOKEN
// ======================================================

export const decodeToken = (
  token
) => {
  if (
    !token ||
    typeof token !==
      'string'
  ) {
    return null;
  }

  return jwt.decode(
    token
  );
};

export default {
  generateTokens,
  verifyToken,
  decodeToken,

  JWT_ALGORITHM,
  JWT_ISSUER,

  TOKEN_TYPES,
  TOKEN_AUDIENCES,
};
