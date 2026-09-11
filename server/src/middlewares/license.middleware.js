import {
  licenseService,
} from '../modules/license/license.service.js';

import {
  logger,
} from '../config/logger.js';

const isEnabled = () =>
  String(
    process.env
      .LICENSE_ENFORCEMENT_ENABLED ||
      ''
  ).toLowerCase() ===
  'true';

const normalizePath = (
  req
) => {
  const value =
    req.path ||
    req.url ||
    '';

  return String(value)
    .split('?')[0];
};

const isExemptPath = (
  path
) => {
  const exact =
    new Set([
      '/auth/login',
      '/auth/logout',
      '/auth/refresh',
      '/auth/profile',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/license/current',
    ]);

  if (exact.has(path)) {
    return true;
  }

  // Ekran kilidi ve hesap kurtarma akışları lisans problemi
  // yaşansa bile kullanıcıyı güvenli biçimde oturumdan çıkarabilmeli.
  if (
    path.startsWith(
      '/screen-lock'
    )
  ) {
    return true;
  }

  return false;
};

const isUserCreationRequest = (
  req,
  path
) => {
  if (
    req.method !== 'POST'
  ) {
    return false;
  }

  return (
    path === '/users' ||
    path === '/auth/register'
  );
};

export const enforceLicense =
  async (
    req,
    res,
    next
  ) => {
    if (!isEnabled()) {
      return next();
    }

    const path =
      normalizePath(req);

    if (
      isExemptPath(path)
    ) {
      return next();
    }

    try {
      if (
        isUserCreationRequest(
          req,
          path
        )
      ) {
        await licenseService
          .assertSeatAvailable();
      } else {
        await licenseService
          .assertUsable();
      }

      return next();
    } catch (error) {
      const code =
        error?.code ||
        'LICENSE_CHECK_FAILED';

      if (
        code.startsWith(
          'LICENSE_'
        )
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              error.message,
            code,
            license:
              error.license
                ? {
                    effectiveStatus:
                      error.license
                        .effectiveStatus,
                    statusLabel:
                      error.license
                        .statusLabel,
                    expiresAt:
                      error.license
                        .expiresAt ||
                      null,
                    maxUsers:
                      error.license
                        .maxUsers ||
                      null,
                    activeUsers:
                      error.license
                        .activeUsers ||
                      null,
                  }
                : undefined,
          });
      }

      logger.error(
        'License enforcement error',
        {
          message:
            error?.message,
          path,
        }
      );

      return res
        .status(503)
        .json({
          success: false,
          message:
            'Lisans doğrulama servisine şu anda ulaşılamıyor.',
          code:
            'LICENSE_CHECK_UNAVAILABLE',
        });
    }
  };

export default enforceLicense;
