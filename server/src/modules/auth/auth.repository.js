import crypto from 'crypto';

import {
  Op,
} from 'sequelize';

import {
  User,
} from '../../models/User.js';

// ======================================================
// SAFE ATTRIBUTES
// ======================================================

const SAFE_USER_EXCLUDES = [
  'password',
  'refresh_token',
  'email_verification_token',
  'password_reset_token',
  'password_reset_expires',
];

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

// ======================================================
// TOKEN HASH
// ======================================================

const hashToken = (
  token
) => {
  if (
    !token
  ) {
    return null;
  }

  return crypto
    .createHash(
      'sha256'
    )
    .update(
      String(
        token
      ),
      'utf8'
    )
    .digest(
      'hex'
    );
};

/*
 * GEÇİŞ UYUMLULUĞU
 *
 * Eski sistem tokenları DB'ye plaintext olarak
 * yazıyordu.
 *
 * Yeni sistem yalnızca SHA-256 hash saklıyor.
 *
 * Kullanıcıları topluca logout etmemek için
 * lookup sırasında hem:
 *
 * - eski plaintext değer
 * - yeni hashed değer
 *
 * aranır.
 *
 * Eski tokenların ömrü dolduktan sonra
 * plaintext fallback kaldırılabilir.
 */
const getTokenCandidates = (
  token
) => {
  if (
    !token
  ) {
    return [];
  }

  const rawToken =
    String(
      token
    );

  const hashedToken =
    hashToken(
      rawToken
    );

  return [
    rawToken,
    hashedToken,
  ];
};

// ======================================================
// REPOSITORY
// ======================================================

export const authRepository = {
  // ====================================================
  // FIND BY EMAIL
  //
  // Login için password alanı gerekli olduğu için
  // burada exclude kullanmıyoruz.
  // ====================================================

  findByEmail: (
    email
  ) => {
    const normalizedEmail =
      normalizeEmail(
        email
      );

    return User.findOne({
      where: {
        email:
          normalizedEmail,
      },
    });
  },

  // ====================================================
  // PROFILE / SAFE USER
  // ====================================================

  findById: (
    id
  ) => {
    return User.findByPk(
      id,
      {
        attributes: {
          exclude:
            SAFE_USER_EXCLUDES,
        },
      }
    );
  },

  // ====================================================
  // USER WITH PASSWORD
  //
  // Şifre değişikliği için kullanılır.
  // ====================================================

  findByIdWithPassword: (
    id
  ) => {
    return User.findByPk(
      id
    );
  },

  // ====================================================
  // CREATE
  //
  // Password hash işlemini User model hook'u yapıyor.
  // ====================================================

  create: (
    userData
  ) => {
    return User.create(
      userData
    );
  },

  // ====================================================
  // REFRESH TOKEN
  // ====================================================

  /*
   * KRİTİK:
   *
   * Raw refresh token artık DB'ye yazılmaz.
   * Yalnızca SHA-256 hash saklanır.
   */
  updateRefreshToken: (
    userId,
    refreshToken
  ) => {
    const refreshTokenHash =
      refreshToken
        ? hashToken(
            refreshToken
          )
        : null;

    return User.update(
      {
        refresh_token:
          refreshTokenHash,
      },
      {
        where: {
          id:
            userId,
        },
      }
    );
  },

  // ====================================================
  // FIND BY REFRESH TOKEN
  // ====================================================

  findByRefreshToken: (
    refreshToken
  ) => {
    if (
      !refreshToken
    ) {
      return null;
    }

    const candidates =
      getTokenCandidates(
        refreshToken
      );

    return User.findOne({
      where: {
        refresh_token: {
          [Op.in]:
            candidates,
        },
      },
    });
  },

  // ====================================================
  // INVALIDATE REFRESH TOKEN
  // ====================================================

  invalidateRefreshToken: (
    refreshToken
  ) => {
    if (
      !refreshToken
    ) {
      return null;
    }

    const candidates =
      getTokenCandidates(
        refreshToken
      );

    return User.update(
      {
        refresh_token:
          null,
      },
      {
        where: {
          refresh_token: {
            [Op.in]:
              candidates,
          },
        },
      }
    );
  },

  // ====================================================
  // INVALIDATE ALL REFRESH TOKENS
  // ====================================================

  invalidateAllRefreshTokens: (
    userId
  ) => {
    return User.update(
      {
        refresh_token:
          null,
      },
      {
        where: {
          id:
            userId,
        },
      }
    );
  },

  // ====================================================
  // ATOMIC REFRESH TOKEN ROTATION
  // ====================================================

  /*
   * Refresh işlemi sırasında:
   *
   * eski token hâlâ DB'deyse
   *      ↓
   * yeni token hashini yaz
   *
   * eski token artık yoksa
   *      ↓
   * hiçbir satırı değiştirme
   *
   * Böylece aynı refresh token ile eşzamanlı
   * iki isteğin ikisinin de başarılı olması
   * engellenebilir.
   *
   * Bir sonraki auth.service.js güncellemesinde
   * bu fonksiyonu kullanacağız.
   */
  rotateRefreshToken: async (
    userId,
    currentRefreshToken,
    newRefreshToken
  ) => {
    if (
      !userId ||
      !currentRefreshToken ||
      !newRefreshToken
    ) {
      return false;
    }

    const currentCandidates =
      getTokenCandidates(
        currentRefreshToken
      );

    const newRefreshTokenHash =
      hashToken(
        newRefreshToken
      );

    const [
      affectedRows,
    ] =
      await User.update(
        {
          refresh_token:
            newRefreshTokenHash,
        },
        {
          where: {
            id:
              userId,

            refresh_token: {
              [Op.in]:
                currentCandidates,
            },
          },
        }
      );

    return (
      affectedRows ===
      1
    );
  },

  // ====================================================
  // PASSWORD RESET
  // ====================================================

  /*
   * KRİTİK:
   *
   * E-postaya raw reset token gider.
   * DB'de yalnız SHA-256 hash saklanır.
   */
  savePasswordResetToken: (
    userId,
    token,
    expires
  ) => {
    const tokenHash =
      token
        ? hashToken(
            token
          )
        : null;

    return User.update(
      {
        password_reset_token:
          tokenHash,

        password_reset_expires:
          expires,
      },
      {
        where: {
          id:
            userId,
        },
      }
    );
  },

  // ====================================================
  // FIND BY PASSWORD RESET TOKEN
  // ====================================================

  findByPasswordResetToken: (
    token
  ) => {
    if (
      !token
    ) {
      return null;
    }

    const candidates =
      getTokenCandidates(
        token
      );

    /*
     * Hem eski plaintext reset tokenlar
     * hem yeni hashed tokenlar geçiş
     * döneminde desteklenir.
     */
    return User.findOne({
      where: {
        password_reset_token: {
          [Op.in]:
            candidates,
        },
      },
    });
  },

  // ====================================================
  // CLEAR PASSWORD RESET TOKEN
  // ====================================================

  clearPasswordResetToken: (
    userId
  ) => {
    return User.update(
      {
        password_reset_token:
          null,

        password_reset_expires:
          null,
      },
      {
        where: {
          id:
            userId,
        },
      }
    );
  },
};

export default authRepository;