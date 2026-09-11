import {
  config,
} from '../config/env.js';

import {
  User,
} from '../models/User.js';

import {
  logger,
} from '../config/logger.js';

import {
  verifyToken,
  TOKEN_TYPES,
  TOKEN_AUDIENCES,
} from '../utils/jwt.js';

import {
  ROLES,
  PERMISSIONS,
  isValidPermission,
} from '../constants/roles.js';

import {
  enforceScreenLockForRequest,
} from '../modules/screen-lock/screen-lock.guard.js';

// ======================================================
// HELPERS
// ======================================================

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

const isValidAccessTokenType = (
  decoded
) => {
  if (!decoded) {
    return false;
  }

  /*
   * GEÇİŞ UYUMLULUĞU
   *
   * Eski access tokenlarda type alanı yok.
   * Yeni tokenlarda type=access bulunuyor.
   *
   * Eski kullanıcıları deploy sırasında topluca
   * logout etmemek için type olmayan legacy
   * tokenları geçici olarak kabul ediyoruz.
   *
   * Açıkça refresh token verilirse reddedilir.
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
    TOKEN_TYPES.ACCESS
  );
};

const isValidTokenVersion = (
  decoded,
  user
) => {
  const databaseVersion =
    Number(
      user?.token_version ??
        0
    );

  if (
    !Number.isInteger(
      databaseVersion
    ) ||
    databaseVersion < 0
  ) {
    return false;
  }

  /*
   * LEGACY TOKEN KONTROLÜ
   *
   * Eski JWT'lerde tokenVersion yoktu.
   *
   * Legacy token yalnızca DB token_version
   * hâlâ 0 ise kabul edilir.
   */
  if (
    decoded?.tokenVersion ===
      undefined ||
    decoded?.tokenVersion ===
      null
  ) {
    return (
      databaseVersion ===
      0
    );
  }

  const jwtVersion =
    Number(
      decoded.tokenVersion
    );

  if (
    !Number.isInteger(
      jwtVersion
    ) ||
    jwtVersion < 0
  ) {
    return false;
  }

  return (
    jwtVersion ===
    databaseVersion
  );
};

// ======================================================
// AUTHENTICATE
// ======================================================

export const authenticate = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    // ==================================================
    // BEARER TOKEN
    // ==================================================

    if (
      !authHeader ||
      !authHeader.startsWith(
        'Bearer '
      )
    ) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Oturum bilgisi bulunamadı',
        });
    }

    const token =
      authHeader
        .substring(7)
        .trim();

    if (!token) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Geçersiz oturum bilgisi',
        });
    }

    // ==================================================
    // JWT VERIFY
    // ==================================================

    /*
     * Merkezi verifyToken:
     *
     * - signature
     * - expiration
     * - HS256
     * - issuer
     * - audience
     *
     * kontrollerini yapar.
     *
     * allowLegacyClaims=true:
     *
     * Eski iss/aud taşımayan tokenlar geçiş
     * döneminde kabul edilir.
     *
     * Yeni token yanlış iss/aud taşıyorsa
     * kesinlikle reddedilir.
     */
    const decoded =
      verifyToken(
        token,
        config.JWT_SECRET,
        {
          audience:
            TOKEN_AUDIENCES.ACCESS,

          allowLegacyClaims:
            true,
        }
      );

    // ==================================================
    // TOKEN TYPE
    // ==================================================

    if (
      !isValidAccessTokenType(
        decoded
      )
    ) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Geçersiz oturum türü',
        });
    }

    // ==================================================
    // USER ID
    // ==================================================

    const userId =
      getTokenUserId(
        decoded
      );

    if (!userId) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Geçersiz oturum bilgisi',
        });
    }

    // ==================================================
    // USER
    // ==================================================

    const user =
      await User.findByPk(
        userId,
        {
          attributes: {
            exclude: [
              'password',
              'refresh_token',
              'email_verification_token',
              'password_reset_token',
              'password_reset_expires',
            ],
          },
        }
      );

    if (!user) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Kullanıcı bulunamadı',
        });
    }

    // ==================================================
    // ACCOUNT STATUS
    // ==================================================

    if (
      user.is_active !==
      true
    ) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Kullanıcı hesabı aktif değil',
        });
    }

    // ==================================================
    // TOKEN VERSION / REVOCATION
    // ==================================================

    if (
      !isValidTokenVersion(
        decoded,
        user
      )
    ) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Oturum geçerliliğini kaybetti. Lütfen tekrar giriş yapın.',
        });
    }

    // ==================================================
    // REQUEST USER
    // ==================================================

    req.user =
      user;

    req.auth = {
      tokenId:
        decoded?.jti ||
        null,

      tokenType:
        decoded?.type ||
        null,

      tokenVersion:
        decoded?.tokenVersion ??
        null,

      issuer:
        decoded?.iss ||
        null,

      audience:
        decoded?.aud ||
        null,

      issuedAt:
        decoded?.iat ||
        null,

      expiresAt:
        decoded?.exp ||
        null,
    };

    // ==================================================
    // BACKEND SCREEN LOCK ENFORCEMENT
    // ==================================================

    const screenLockResult =
      await enforceScreenLockForRequest(
        req
      );

    if (
      screenLockResult
    ) {
      return res
        .status(
          screenLockResult.statusCode
        )
        .json(
          screenLockResult.body
        );
    }

    return next();
  } catch (error) {
    // ==================================================
    // EXPIRED
    // ==================================================

    if (
      error?.name ===
      'TokenExpiredError'
    ) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Oturum süresi doldu',
        });
    }

    // ==================================================
    // NOT BEFORE
    // ==================================================

    if (
      error?.name ===
      'NotBeforeError'
    ) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Oturum henüz geçerli değil',
        });
    }

    // ==================================================
    // INVALID JWT
    // ==================================================

    if (
      error?.name ===
      'JsonWebTokenError'
    ) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Geçersiz oturum bilgisi',
        });
    }

    // ==================================================
    // INTERNAL ERROR
    // ==================================================

    logger.error(
      'Auth middleware error:',
      error
    );

    return res
      .status(500)
      .json({
        success:
          false,

        message:
          'Kimlik doğrulama sırasında sunucu hatası oluştu',
      });
  }
};

// ======================================================
// ROLE AUTHORIZATION
//
// Mevcut route'lar için backward compatible.
// ======================================================

export const authorize = (
  ...roles
) => {
  return (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Yetkilendirme için oturum gereklidir',
        });
    }

    if (
      roles.length ===
      0
    ) {
      return next();
    }

    if (
      !roles.includes(
        req.user.role
      )
    ) {
      return res
        .status(403)
        .json({
          success:
            false,

          message:
            'Bu işlem için yetkiniz bulunmuyor',
        });
    }

    return next();
  };
};

// ======================================================
// PERMISSION OVERRIDES
// ======================================================

const getPermissionOverrides = (
  user
) => {
  const value =
    user?.permissions;

  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value
    )
  ) {
    return {};
  }

  return value;
};

// ======================================================
// HAS PERMISSION
// ======================================================

export const hasPermission = (
  user,
  permission
) => {
  if (
    !user ||
    !permission
  ) {
    return false;
  }

  if (
    user.role ===
    ROLES.ADMIN
  ) {
    return true;
  }

  if (
    !isValidPermission(
      permission
    )
  ) {
    logger.warn(
      `Unknown permission requested: ${permission}`
    );

    return false;
  }

  const rolePermissions =
    PERMISSIONS[
      user.role
    ] || [];

  const overrides =
    getPermissionOverrides(
      user
    );

  if (
    Object.prototype
      .hasOwnProperty
      .call(
        overrides,
        permission
      )
  ) {
    return (
      overrides[
        permission
      ] === true
    );
  }

  return (
    rolePermissions.includes(
      'all'
    ) ||
    rolePermissions.includes(
      permission
    )
  );
};

// ======================================================
// HAS ANY PERMISSION
// ======================================================

export const hasAnyPermission = (
  user,
  permissions = []
) => {
  if (
    !Array.isArray(
      permissions
    ) ||
    permissions.length ===
      0
  ) {
    return false;
  }

  return permissions.some(
    (
      permission
    ) =>
      hasPermission(
        user,
        permission
      )
  );
};

// ======================================================
// HAS ALL PERMISSIONS
// ======================================================

export const hasAllPermissions = (
  user,
  permissions = []
) => {
  if (
    !Array.isArray(
      permissions
    ) ||
    permissions.length ===
      0
  ) {
    return false;
  }

  return permissions.every(
    (
      permission
    ) =>
      hasPermission(
        user,
        permission
      )
  );
};

// ======================================================
// AUTHORIZE PERMISSION
// ======================================================

export const authorizePermission = (
  ...permissions
) => {
  return (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Yetkilendirme için oturum gereklidir',
        });
    }

    if (
      permissions.length ===
      0
    ) {
      return next();
    }

    const allowed =
      hasAllPermissions(
        req.user,
        permissions
      );

    if (!allowed) {
      return res
        .status(403)
        .json({
          success:
            false,

          message:
            'Bu işlem için gerekli yetkiye sahip değilsiniz',
        });
    }

    return next();
  };
};

// ======================================================
// AUTHORIZE ANY PERMISSION
// ======================================================

export const authorizeAnyPermission = (
  ...permissions
) => {
  return (
    req,
    res,
    next
  ) => {
    if (!req.user) {
      return res
        .status(401)
        .json({
          success:
            false,

          message:
            'Yetkilendirme için oturum gereklidir',
        });
    }

    if (
      permissions.length ===
      0
    ) {
      return next();
    }

    const allowed =
      hasAnyPermission(
        req.user,
        permissions
      );

    if (!allowed) {
      return res
        .status(403)
        .json({
          success:
            false,

          message:
            'Bu işlem için gerekli yetkiye sahip değilsiniz',
        });
    }

    return next();
  };
};