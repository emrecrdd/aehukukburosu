import {
  config,
} from '../config/env.js';

import {
  User,
} from '../models/User.js';

import {
  verifyToken,
  TOKEN_TYPES,
  TOKEN_AUDIENCES,
} from '../utils/jwt.js';

const createSocketAuthError = (
  message,
  code
) => {
  const error =
    new Error(message);

  error.data = {
    code,
  };

  return error;
};

const getTokenUserId = (
  decoded
) => (
  decoded?.id ||
  decoded?.userId ||
  decoded?.sub ||
  null
);

const isValidAccessTokenType = (
  decoded
) => {
  if (!decoded) {
    return false;
  }

  /*
   * HTTP auth middleware ile aynı legacy geçiş kuralı.
   * type alanı olmayan eski access tokenlar geçici olarak
   * kabul edilir; açıkça refresh token reddedilir.
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

export const authenticateSocket = async (
  socket,
  next
) => {
  const token =
    socket.handshake.auth
      ?.token;

  if (
    !token ||
    typeof token !==
      'string'
  ) {
    return next(
      createSocketAuthError(
        'Kimlik doğrulaması gerekli.',
        'SOCKET_AUTH_REQUIRED'
      )
    );
  }

  try {
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

    if (
      !isValidAccessTokenType(
        decoded
      )
    ) {
      return next(
        createSocketAuthError(
          'Geçersiz oturum türü.',
          'SOCKET_INVALID_TOKEN_TYPE'
        )
      );
    }

    const userId =
      getTokenUserId(
        decoded
      );

    if (!userId) {
      return next(
        createSocketAuthError(
          'Token içinde kullanıcı bilgisi bulunamadı.',
          'SOCKET_INVALID_TOKEN'
        )
      );
    }

    const user =
      await User.findByPk(
        userId,
        {
          attributes: [
            'id',
            'first_name',
            'last_name',
            'role',
            'is_active',
            'token_version',
          ],
        }
      );

    if (
      !user ||
      user.is_active !==
        true
    ) {
      return next(
        createSocketAuthError(
          'Kullanıcı hesabı aktif değil.',
          'SOCKET_USER_INACTIVE'
        )
      );
    }

    if (
      !isValidTokenVersion(
        decoded,
        user
      )
    ) {
      return next(
        createSocketAuthError(
          'Oturum geçerliliğini kaybetti.',
          'SOCKET_SESSION_REVOKED'
        )
      );
    }

    socket.data.userId =
      user.id;

    socket.data.user = {
      id:
        user.id,

      first_name:
        user.first_name,

      last_name:
        user.last_name,

      role:
        user.role,

      is_active:
        true,
    };

    socket.data.tokenPayload = {
      id:
        user.id,

      role:
        user.role ||
        null,

      tokenVersion:
        decoded?.tokenVersion ??
        null,
    };

    return next();
  } catch (
    error
  ) {
    if (
      error?.name ===
      'TokenExpiredError'
    ) {
      return next(
        createSocketAuthError(
          'Socket oturum süresi doldu.',
          'SOCKET_TOKEN_EXPIRED'
        )
      );
    }

    return next(
      createSocketAuthError(
        'Geçersiz veya süresi dolmuş token.',
        'SOCKET_INVALID_TOKEN'
      )
    );
  }
};

export default authenticateSocket;
