import {
  authService,
} from './auth.service.js';

import {
  authRepository,
} from './auth.repository.js';

import {
  successResponse,
  errorResponse,
} from '../../utils/response.js';

import {
  logger,
} from '../../config/logger.js';

import {
  config,
} from '../../config/env.js';

// ======================================================
// COOKIE CONFIG
// ======================================================

const getRefreshCookieOptions = (
  maxAge =
    config.AUTH_SESSION_MAX_AGE_MS
) => ({
  httpOnly: true,

  secure:
    process.env.NODE_ENV ===
    'production',

  sameSite:
    process.env.NODE_ENV ===
    'production'
      ? 'none'
      : 'lax',

  /*
   * Cookie ömrü mutlak oturum süresini aşamaz.
   * Refresh rotation bu süreyi yeniden başlatmaz.
   */
  maxAge:
    Math.max(
      1,
      Math.min(
        Number(
          maxAge
        ) ||
          config.AUTH_SESSION_MAX_AGE_MS,
        config.AUTH_SESSION_MAX_AGE_MS
      )
    ),

  /*
   * Refresh cookie yalnızca auth endpointlerine
   * gönderilsin.
   */
  path:
    '/api/auth',
});

const getRemainingSessionMs = (
  sessionExpiresAt
) => {
  const expiresAtMs =
    Number(
      sessionExpiresAt
    ) * 1000;

  if (
    !Number.isFinite(
      expiresAtMs
    )
  ) {
    return config.AUTH_SESSION_MAX_AGE_MS;
  }

  return Math.max(
    1,
    expiresAtMs -
      Date.now()
  );
};

// ======================================================
// USER SANITIZER
// ======================================================

const sanitizeUser = (
  user
) => {
  if (!user) {
    return user;
  }

  const plainUser =
    typeof user.get ===
    'function'
      ? user.get({
          plain: true,
        })
      : {
          ...user,
        };

  /*
   * Hassas / internal alanlar hiçbir koşulda
   * API response'una gönderilmez.
   */
  delete plainUser.password;

  delete plainUser.refresh_token;

  delete plainUser.email_verification_token;

  delete plainUser.password_reset_token;

  delete plainUser.password_reset_expires;

  delete plainUser.token_version;

  return plainUser;
};

// ======================================================
// CONTROLLER
// ======================================================

export const authController = {
  // ====================================================
  // LOGIN
  // ====================================================

  async login(
    req,
    res
  ) {
    try {
      const {
        email,
        password,
      } = req.body;

      if (
        !email ||
        !password
      ) {
        return errorResponse(
          res,
          'E-posta ve şifre gereklidir',
          400
        );
      }

      const result =
        await authService.login(
          email,
          password
        );

      // ==================================================
      // REFRESH TOKEN COOKIE
      // ==================================================

      res.cookie(
        'refreshToken',
        result.refreshToken,
        getRefreshCookieOptions(
          getRemainingSessionMs(
            result.sessionExpiresAt
          )
        )
      );

      /*
       * KRİTİK:
       *
       * refreshToken response body'ye DÖNMÜYOR.
       *
       * Browser bunu yalnızca HttpOnly cookie
       * olarak tutacak.
       *
       * JavaScript yalnız accessToken alır.
       */
      const safeResult = {
        user:
          sanitizeUser(
            result.user
          ),

        accessToken:
          result.accessToken,

        sessionExpiresAt:
          result.sessionExpiresAt,
      };

      return successResponse(
        res,
        safeResult,
        'Giriş başarılı'
      );
    } catch (
      error
    ) {
      logger.error(
        'Login error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Giriş yapılamadı',
        401
      );
    }
  },

  // ====================================================
  // LOGOUT
  // ====================================================

  async logout(
    req,
    res
  ) {
    try {
      /*
       * Refresh token artık yalnızca HttpOnly
       * cookie'den alınır.
       *
       * Request body'den token kabul etmiyoruz.
       */
      const refreshToken =
        req.cookies
          ?.refreshToken;

      if (
        refreshToken
      ) {
        await authService.logout(
          refreshToken
        );
      }

      res.clearCookie(
        'refreshToken',
        {
          ...getRefreshCookieOptions(),

          maxAge:
            undefined,
        }
      );

      return successResponse(
        res,
        null,
        'Çıkış başarılı'
      );
    } catch (
      error
    ) {
      logger.error(
        'Logout error:',
        error
      );

      /*
       * Backend tarafındaki işlem hata verse bile
       * browser cookie'sini temizlemeye çalış.
       */
      res.clearCookie(
        'refreshToken',
        {
          ...getRefreshCookieOptions(),

          maxAge:
            undefined,
        }
      );

      return errorResponse(
        res,
        'Çıkış işlemi tamamlanamadı',
        400
      );
    }
  },

  // ====================================================
  // REFRESH TOKEN
  // ====================================================

  async refreshToken(
    req,
    res
  ) {
    try {
      /*
       * Refresh token JavaScript tarafından
       * gönderilmez.
       *
       * Browser HttpOnly cookie'yi otomatik gönderir.
       */
      const refreshToken =
        req.cookies
          ?.refreshToken;

      if (
        !refreshToken
      ) {
        return errorResponse(
          res,
          'Refresh token bulunamadı',
          401
        );
      }

      const result =
        await authService.refreshToken(
          refreshToken
        );

      /*
       * Rotation sonrası yeni refresh token
       * yalnızca cookie'ye yazılır.
       */
      res.cookie(
        'refreshToken',
        result.refreshToken,
        getRefreshCookieOptions(
          getRemainingSessionMs(
            result.sessionExpiresAt
          )
        )
      );

      /*
       * KRİTİK:
       *
       * Yeni refresh token response body'ye
       * kesinlikle gönderilmez.
       */
      return successResponse(
        res,
        {
          accessToken:
            result.accessToken,

          sessionExpiresAt:
            result.sessionExpiresAt,
        },
        'Oturum yenilendi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Refresh token error:',
        error
      );

      /*
       * Refresh başarısızsa artık kullanılamayan
       * cookie'yi browser'dan da temizle.
       */
      res.clearCookie(
        'refreshToken',
        {
          ...getRefreshCookieOptions(),

          maxAge:
            undefined,
        }
      );

      return errorResponse(
        res,
        error.message ||
          'Oturum yenilenemedi',
        401
      );
    }
  },

  // ====================================================
  // PROFILE
  // ====================================================

  async getProfile(
    req,
    res
  ) {
    try {
      const user =
        await authService.getProfile(
          req.user.id
        );

      return successResponse(
        res,
        sanitizeUser(
          user
        ),
        'Profil getirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Get profile error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Profil getirilemedi',
        400
      );
    }
  },

  // ====================================================
  // UPDATE PROFILE
  // ====================================================

  async updateProfile(
    req,
    res
  ) {
    try {
      const userId =
        req.user.id;

      const {
        first_name,
        last_name,
        phone,
        title,
        bio,
      } = req.body;

      const user =
        await authRepository.findById(
          userId
        );

      if (
        !user
      ) {
        return errorResponse(
          res,
          'Kullanıcı bulunamadı',
          404
        );
      }

      const updateData =
        {};

      if (
        first_name !==
        undefined
      ) {
        const value =
          String(
            first_name
          ).trim();

        if (
          !value
        ) {
          return errorResponse(
            res,
            'Ad boş olamaz',
            400
          );
        }

        updateData.first_name =
          value;
      }

      if (
        last_name !==
        undefined
      ) {
        const value =
          String(
            last_name
          ).trim();

        if (
          !value
        ) {
          return errorResponse(
            res,
            'Soyad boş olamaz',
            400
          );
        }

        updateData.last_name =
          value;
      }

      if (
        phone !==
        undefined
      ) {
        updateData.phone =
          phone === null
            ? null
            : String(
                phone
              ).trim() ||
              null;
      }

      if (
        title !==
        undefined
      ) {
        updateData.title =
          title === null
            ? null
            : String(
                title
              ).trim() ||
              null;
      }

      if (
        bio !==
        undefined
      ) {
        updateData.bio =
          bio === null
            ? null
            : String(
                bio
              ).trim() ||
              null;
      }

      await user.update(
        updateData
      );

      const updatedUser =
        await authRepository.findById(
          userId
        );

      return successResponse(
        res,
        sanitizeUser(
          updatedUser
        ),
        'Profil başarıyla güncellendi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Update profile error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Profil güncellenemedi',
        400
      );
    }
  },

  // ====================================================
  // CHANGE PASSWORD
  // ====================================================

  async changePassword(
    req,
    res
  ) {
    try {
      const {
        currentPassword,
        newPassword,
      } = req.body;

      if (
        !currentPassword ||
        !newPassword
      ) {
        return errorResponse(
          res,
          'Mevcut ve yeni şifre gereklidir',
          400
        );
      }

      

      await authService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      /*
       * Şifre değişince:
       *
       * - token_version arttı
       * - refresh token DB'den silindi
       * - eski access tokenlar öldü
       *
       * Cookie'yi de browser'dan temizliyoruz.
       */
      res.clearCookie(
        'refreshToken',
        {
          ...getRefreshCookieOptions(),

          maxAge:
            undefined,
        }
      );

      return successResponse(
        res,
        null,
        'Şifre başarıyla değiştirildi'
      );
    } catch (
      error
    ) {
      logger.error(
        'Change password error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Şifre değiştirilemedi',
        400
      );
    }
  },

  // ====================================================
  // FORGOT PASSWORD
  // ====================================================

  async forgotPassword(
    req,
    res
  ) {
    try {
      const {
        email,
      } = req.body;

      if (
        !email
      ) {
        return errorResponse(
          res,
          'E-posta adresi gereklidir',
          400
        );
      }

      await authService.forgotPassword(
        email
      );

      /*
       * Account enumeration engeli.
       */
      return successResponse(
        res,
        null,
        'Eğer bu e-posta adresine bağlı bir hesap varsa şifre sıfırlama talimatları gönderilecektir.'
      );
    } catch (
      error
    ) {
      logger.error(
        'Forgot password error:',
        error
      );

      /*
       * Dışarı her durumda aynı cevap.
       */
      return successResponse(
        res,
        null,
        'Eğer bu e-posta adresine bağlı bir hesap varsa şifre sıfırlama talimatları gönderilecektir.'
      );
    }
  },

  // ====================================================
  // RESET PASSWORD
  // ====================================================

  async resetPassword(
    req,
    res
  ) {
    try {
      const {
        token,
        password,
      } = req.body;

      if (
        !token ||
        !password
      ) {
        return errorResponse(
          res,
          'Token ve yeni şifre gereklidir',
          400
        );
      }

      

      await authService.resetPassword(
        token,
        password
      );

      return successResponse(
        res,
        null,
        'Şifre başarıyla sıfırlandı'
      );
    } catch (
      error
    ) {
      logger.error(
        'Reset password error:',
        error
      );

      return errorResponse(
        res,
        error.message ||
          'Şifre sıfırlanamadı',
        400
      );
    }
  },
};