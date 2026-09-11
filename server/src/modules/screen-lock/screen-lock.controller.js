import {
  logger,
} from '../../config/logger.js';

import {
  screenLockService,
  ScreenLockError,
} from './screen-lock.service.js';

const getContext = (
  req
) => {
  return {
    ipAddress:
      req.realClientIp ||
      req.ip ||
      null,

    userAgent:
      req.headers
        ?.['user-agent'] ||
      null,
  };
};

const sendSuccess = (
  res,
  data,
  message = 'OK',
  statusCode = 200
) => {
  return res
    .status(
      statusCode
    )
    .json({
      success:
        true,
      message,
      data,
    });
};

const sendError = (
  res,
  error
) => {
  if (
    error instanceof
    ScreenLockError
  ) {
    return res
      .status(
        error.statusCode
      )
      .json({
        success:
          false,

        message:
          error.message,

        code:
          error.code,

        ...(error.details &&
        Object.keys(
          error.details
        ).length > 0
          ? {
              data:
                error.details,
            }
          : {}),
      });
  }

  logger.error(
    'Screen-lock controller error:',
    error
  );

  return res
    .status(500)
    .json({
      success:
        false,

      message:
        'Ekran kilidi işlemi sırasında sunucu hatası oluştu.',

      code:
        'SCREEN_LOCK_INTERNAL_ERROR',
    });
};

export const screenLockController = {
  async status(
    req,
    res
  ) {
    try {
      const data =
        await screenLockService
          .getStatus(
            req.user.id,
            getContext(
              req
            )
          );

      return sendSuccess(
        res,
        data,
        'Ekran kilidi durumu alındı.'
      );
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  },

  async setup(
    req,
    res
  ) {
    try {
      const data =
        await screenLockService
          .setup(
            req.user.id,
            req.body?.pin,
            req.body?.confirmPin,
            getContext(
              req
            )
          );

      return sendSuccess(
        res,
        data,
        'Ekran kilidi PIN’i oluşturuldu.',
        201
      );
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  },

  async lock(
    req,
    res
  ) {
    try {
      const data =
        await screenLockService
          .lock(
            req.user.id,
            getContext(
              req
            ),
            req.body?.reason ||
              'manual'
          );

      return sendSuccess(
        res,
        data,
        'Ekran kilitlendi.'
      );
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  },

  async touch(
    req,
    res
  ) {
    try {
      const data =
        await screenLockService
          .touch(
            req.user.id,
            getContext(
              req
            )
          );

      return sendSuccess(
        res,
        data,
        'Aktivite kaydedildi.'
      );
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  },

  async unlock(
    req,
    res
  ) {
    try {
      const data =
        await screenLockService
          .unlock(
            req.user.id,
            req.body?.pin,
            getContext(
              req
            )
          );

      return sendSuccess(
        res,
        data,
        'Ekran kilidi açıldı.'
      );
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  },

  async recoverWithPassword(
    req,
    res
  ) {
    try {
      const data =
        await screenLockService
          .recoverWithPassword(
            req.user.id,
            req.body?.password,
            req.body?.newPin,
            req.body?.confirmPin,
            getContext(
              req
            )
          );

      return sendSuccess(
        res,
        data,
        'PIN hesap şifresi ile sıfırlandı.'
      );
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  },

  async recoverWithCode(
    req,
    res
  ) {
    try {
      const data =
        await screenLockService
          .recoverWithCode(
            req.user.id,
            req.body?.recoveryCode,
            req.body?.newPin,
            req.body?.confirmPin,
            getContext(
              req
            )
          );

      return sendSuccess(
        res,
        data,
        'PIN kurtarma kodu ile sıfırlandı.'
      );
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  },

  async regenerateRecoveryCodes(
    req,
    res
  ) {
    try {
      const data =
        await screenLockService
          .regenerateRecoveryCodes(
            req.user.id,
            req.body?.password,
            getContext(
              req
            )
          );

      return sendSuccess(
        res,
        data,
        'Kurtarma kodları yenilendi.'
      );
    } catch (error) {
      return sendError(
        res,
        error
      );
    }
  },
};

export default screenLockController;
