import {
  logger,
} from '../config/logger.js';

const isProduction =
  process.env.NODE_ENV ===
  'production';

const getStatusCode = (
  err
) => {
  const statusCode =
    Number(
      err?.statusCode ||
      err?.status
    );

  if (
    Number.isInteger(
      statusCode
    ) &&
    statusCode >= 400 &&
    statusCode <= 599
  ) {
    return statusCode;
  }

  return 500;
};

const getPublicMessage = (
  err,
  statusCode
) => {
  /*
   * 4xx hatalar çoğunlukla uygulamanın
   * bilinçli oluşturduğu kullanıcı hatalarıdır.
   *
   * Örn:
   * - Dava bulunamadı
   * - Yetkiniz yok
   * - Geçersiz istek
   *
   * Bu mesajları kullanıcı görebilir.
   */
  if (
    statusCode >= 400 &&
    statusCode < 500
  ) {
    return (
      err?.message ||
      'İstek işlenemedi.'
    );
  }

  /*
   * Development ortamında debug amacıyla
   * gerçek hata mesajını gösteriyoruz.
   */
  if (
    !isProduction
  ) {
    return (
      err?.message ||
      'Internal server error'
    );
  }

  /*
   * Production ortamında beklenmeyen
   * server / database / external API
   * detaylarını istemciye sızdırmıyoruz.
   */
  return 'Beklenmeyen bir sunucu hatası oluştu.';
};

export const errorHandler = (
  err,
  req,
  res,
  next
) => {
  /*
   * Express error middleware imzasında
   * next parametresi bulunmalıdır.
   *
   * Response başladıysa Express'in
   * kendi error handler'ına bırakıyoruz.
   */
  if (
    res.headersSent
  ) {
    return next(
      err
    );
  }

  const statusCode =
    getStatusCode(
      err
    );

  // ======================================================
  // SERVER-SIDE ERROR LOG
  // ======================================================

  logger.error(
    'Application error',
    {
      name:
        err?.name,

      message:
        err?.message,

      stack:
        err?.stack,

      status:
        statusCode,

      code:
        err?.code,

      path:
        req.path,

      method:
        req.method,
    }
  );

  // ======================================================
  // SEQUELIZE VALIDATION
  // ======================================================

  if (
    err?.name ===
    'SequelizeValidationError'
  ) {
    const message =
      Array.isArray(
        err.errors
      ) &&
      err.errors.length > 0
        ? err.errors
            .map(
              (
                item
              ) =>
                item.message
            )
            .filter(
              Boolean
            )
            .join(
              ', '
            )
        : 'Gönderilen veriler geçersiz.';

    return res
      .status(
        400
      )
      .json({
        success:
          false,

        message,
      });
  }

  // ======================================================
  // SEQUELIZE UNIQUE CONSTRAINT
  // ======================================================

  if (
    err?.name ===
    'SequelizeUniqueConstraintError'
  ) {
    const message =
      Array.isArray(
        err.errors
      ) &&
      err.errors.length > 0
        ? err.errors
            .map(
              (
                item
              ) =>
                item.message
            )
            .filter(
              Boolean
            )
            .join(
              ', '
            )
        : 'Bu kayıt zaten mevcut.';

    return res
      .status(
        409
      )
      .json({
        success:
          false,

        message,
      });
  }

  // ======================================================
  // JWT
  // ======================================================

  if (
    err?.name ===
    'JsonWebTokenError'
  ) {
    return res
      .status(
        401
      )
      .json({
        success:
          false,

        message:
          'Geçersiz oturum bilgisi.',
      });
  }

  if (
    err?.name ===
    'TokenExpiredError'
  ) {
    return res
      .status(
        401
      )
      .json({
        success:
          false,

        message:
          'Oturum süresi doldu.',
      });
  }

  if (
    err?.name ===
    'NotBeforeError'
  ) {
    return res
      .status(
        401
      )
      .json({
        success:
          false,

        message:
          'Oturum henüz geçerli değil.',
      });
  }

  // ======================================================
  // DEFAULT
  // ======================================================

  return res
    .status(
      statusCode
    )
    .json({
      success:
        false,

      message:
        getPublicMessage(
          err,
          statusCode
        ),

      code:
        statusCode < 500
          ? err?.code
          : undefined,

      ...(
        !isProduction &&
        {
          stack:
            err?.stack,
        }
      ),
    });
};