import {
  config,
} from '../config/env.js';

import {
  logger,
} from '../config/logger.js';

// ======================================================
// ENVIRONMENT
// ======================================================

const isProduction =
  config.NODE_ENV ===
  'production';

// ======================================================
// TRUSTED ORIGINS
// ======================================================

const trustedOrigins =
  new Set(
    [
      ...config.CORS_ORIGINS,
      config.CLIENT_URL,

      ...(isProduction
        ? []
        : [
            'http://localhost:5173',
            'http://localhost:3000',
          ]),
    ]
      .filter(
        Boolean
      )
      .map(
        (
          value
        ) => {
          try {
            return new URL(
              value
            ).origin;
          } catch {
            return null;
          }
        }
      )
      .filter(
        Boolean
      )
  );

// ======================================================
// HELPERS
// ======================================================

const getRequestOrigin = (
  req
) => {
  const origin =
    req.get(
      'origin'
    );

  if (
    !origin ||
    typeof origin !==
      'string'
  ) {
    return null;
  }

  try {
    return new URL(
      origin
    ).origin;
  } catch {
    return null;
  }
};

// ======================================================
// TRUSTED ORIGIN MIDDLEWARE
// ======================================================

export const requireTrustedOrigin = (
  req,
  res,
  next
) => {
  /*
   * CSRF açısından yalnız state-changing
   * requestleri koruyoruz.
   */
  const safeMethods =
    new Set([
      'GET',
      'HEAD',
      'OPTIONS',
    ]);

  if (
    safeMethods.has(
      req.method
    )
  ) {
    return next();
  }

  const origin =
    getRequestOrigin(
      req
    );

  // ====================================================
  // DEVELOPMENT
  // ====================================================

  /*
   * Local development sırasında Postman/curl gibi
   * Origin göndermeyen araçları tamamen kırmıyoruz.
   *
   * Browser isteklerinde Origin varsa yine allowlist
   * kontrolü uygulanır.
   */
  if (
    !isProduction &&
    !origin
  ) {
    return next();
  }

  // ====================================================
  // PRODUCTION: ORIGIN REQUIRED
  // ====================================================

  /*
   * Login / refresh / logout gibi bu middleware'in
   * bağlandığı browser endpointlerinde production'da
   * Origin zorunludur.
   *
   * "null" veya eksik Origin kabul edilmez.
   */
  if (
    !origin
  ) {
    logger.warn(
      'Güvenilmeyen auth isteği engellendi',
      {
        reason:
          'missing-origin',

        method:
          req.method,

        path:
          req.path,

        clientIp:
          req.realClientIp ||
          null,
      }
    );

    return res
      .status(403)
      .json({
        success:
          false,

        message:
          'İstek kaynağı doğrulanamadı.',

        code:
          'CSRF_ORIGIN_REQUIRED',
      });
  }

  // ====================================================
  // ALLOWLIST
  // ====================================================

  if (
    !trustedOrigins.has(
      origin
    )
  ) {
    logger.warn(
      'Güvenilmeyen auth origin engellendi',
      {
        origin,

        method:
          req.method,

        path:
          req.path,

        clientIp:
          req.realClientIp ||
          null,
      }
    );

    return res
      .status(403)
      .json({
        success:
          false,

        message:
          'Bu kaynaktan gelen isteğe izin verilmiyor.',

        code:
          'CSRF_ORIGIN_DENIED',
      });
  }

  return next();
};

export default requireTrustedOrigin;