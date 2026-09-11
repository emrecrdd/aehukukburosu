import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import {
  chatRoutes,
} from './modules/chat/chat.routes.js';
import {
  rateLimit,
  ipKeyGenerator,
} from 'express-rate-limit';

import {
  RedisStore,
} from 'rate-limit-redis';

import Redis from 'ioredis';

import cookieParser from 'cookie-parser';

import {
  isIP,
} from 'node:net';

import {
  config,
} from './config/env.js';

import {
  logger,
} from './config/logger.js';

import {
  checkDatabaseHealth,
} from './config/database.js';

import {
  errorHandler,
} from './middlewares/error.middleware.js';

import {
  requireTrustedOrigin,
} from './middlewares/origin.middleware.js';


import {
  enforceLicense,
} from './middlewares/license.middleware.js';
// ======================================================
// ROUTES
// ======================================================

import {
  authRoutes,
} from './modules/auth/auth.routes.js';

import {
  clientRoutes,
} from './modules/clients/client.routes.js';

import {
  caseRoutes,
} from './modules/cases/case.routes.js';

import {
  consultationRoutes,
} from './modules/consultations/consultation.routes.js';

import {
  casePartyRoutes,
} from './modules/case-parties/case-party.routes.js';

import {
  documentRoutes,
} from './modules/documents/document.routes.js';

import {
  taskRoutes,
} from './modules/tasks/task.routes.js';

import {
  financeV2Routes,
} from './modules/finance-v2/finance-v2.routes.js';

import {
  searchRoutes,
} from './modules/search/search.routes.js';

import {
  aiRoutes,
} from './modules/ai/ai.routes.js';

import {
  userRoutes,
} from './modules/users/user.routes.js';

import {
  eventRoutes,
} from './modules/events/event.routes.js';

import {
  dashboardRoutes,
} from './modules/dashboard/dashboard.routes.js';

import performanceRoutes
  from './modules/performance/performance.routes.js';

import {
  meetingRoutes,
} from './modules/meetings/meeting.routes.js';

import {
  notificationRoutes,
} from './modules/notifications/notification.routes.js';

import {
  auditLogRoutes,
} from './modules/audit-logs/audit-log.routes.js';

import {
  powerOfAttorneyRoutes,
} from './modules/power-of-attorney/powerOfAttorney.routes.js';

import {
  templateRoutes,
} from './modules/templates/template.routes.js';

import {
  calendarIntegrationRoutes,
} from './modules/calendar-integration/calendar-integration.routes.js';

import {
  screenLockRoutes,
} from './modules/screen-lock/screen-lock.routes.js';
import {
  licenseRoutes,
} from './modules/license/license.routes.js';
// ======================================================
// APP
// ======================================================

const app =
  express();

const isProduction =
  config.NODE_ENV ===
  'production';

app.disable(
  'x-powered-by'
);

// ======================================================
// TRUST PROXY
// ======================================================

app.set(
  'trust proxy',
  1
);

// ======================================================
// REAL CLIENT IP
// ======================================================

const normalizeIp = (
  value
) => {
  if (
    !value ||
    typeof value !==
      'string'
  ) {
    return null;
  }

  let candidate =
    value.trim();

  if (
    !candidate
  ) {
    return null;
  }

  if (
    candidate.startsWith(
      '::ffff:'
    )
  ) {
    candidate =
      candidate.slice(
        7
      );
  }

  if (
    !isIP(
      candidate
    )
  ) {
    return null;
  }

  return candidate;
};

const getForwardedClientIp = (
  req
) => {
  const forwardedFor =
    req.headers[
      'x-forwarded-for'
    ];

  if (
    typeof forwardedFor ===
      'string'
  ) {
    const firstIp =
      forwardedFor
        .split(',')[0]
        ?.trim();

    return normalizeIp(
      firstIp
    );
  }

  if (
    Array.isArray(
      forwardedFor
    ) &&
    forwardedFor.length >
      0
  ) {
    const firstIp =
      String(
        forwardedFor[0]
      )
        .split(',')[0]
        ?.trim();

    return normalizeIp(
      firstIp
    );
  }

  return null;
};

const getRealClientIp = (
  req
) => {
  if (
    isProduction
  ) {
    const forwardedIp =
      getForwardedClientIp(
        req
      );

    if (
      forwardedIp
    ) {
      return forwardedIp;
    }
  }

  const expressIp =
    normalizeIp(
      req.ip
    );

  if (
    expressIp
  ) {
    return expressIp;
  }

  const socketIp =
    normalizeIp(
      req.socket
        ?.remoteAddress
    );

  if (
    socketIp
  ) {
    return socketIp;
  }

  return null;
};

app.use(
  (
    req,
    res,
    next
  ) => {
    req.realClientIp =
      getRealClientIp(
        req
      );

    return next();
  }
);

// ======================================================
// SECURITY HEADERS
// ======================================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy:
        'cross-origin',
    },
  })
);

app.use(
  cookieParser()
);

// ======================================================
// CORS
// ======================================================

const allowedOrigins =
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
    ].filter(
      Boolean
    )
  );

const corsOptions = {
  origin(
    origin,
    callback
  ) {
    if (
      !origin
    ) {
      return callback(
        null,
        true
      );
    }

    if (
      allowedOrigins.has(
        origin
      )
    ) {
      return callback(
        null,
        true
      );
    }

    logger.warn(
      'CORS isteği engellendi',
      {
        origin,
      }
    );

    const error =
      new Error(
        'Bu kaynaktan gelen isteğe izin verilmiyor.'
      );

    error.statusCode =
      403;

    error.code =
      'CORS_ORIGIN_DENIED';

    return callback(
      error
    );
  },

  credentials:
    true,

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],

  allowedHeaders: [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-Request-ID',
  'Idempotency-Key',
],

  exposedHeaders: [
    'Content-Disposition',
    'RateLimit',
    'RateLimit-Policy',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
  ],

  maxAge:
    86_400,
};

app.use(
  cors(
    corsOptions
  )
);

// ======================================================
// CSRF / TRUSTED ORIGIN PROTECTION
// ======================================================

app.use(
  '/api/auth/login',
  requireTrustedOrigin
);

app.use(
  '/api/auth/refresh-token',
  requireTrustedOrigin
);

app.use(
  '/api/auth/logout',
  requireTrustedOrigin
);

app.use(
  '/api/screen-lock',
  requireTrustedOrigin
);

// ======================================================
// REQUEST BODY
// ======================================================

app.use(
  express.json({
    limit:
      '1mb',

    strict:
      true,
  })
);

app.use(
  express.urlencoded({
    extended:
      true,

    limit:
      '1mb',

    parameterLimit:
      1000,
  })
);

// ======================================================
// SAFE HTTP LOGGING HELPERS
// ======================================================

const stripQueryString = (
  value
) => {
  if (
    !value ||
    typeof value !==
      'string'
  ) {
    return '-';
  }

  return (
    value.split('?')[0] ||
    '/'
  );
};

const sanitizeReferrer = (
  value
) => {
  if (
    !value ||
    typeof value !==
      'string'
  ) {
    return '-';
  }

  try {
    const url =
      new URL(
        value
      );

    return (
      `${url.origin}${url.pathname}`
    );
  } catch {
    return '-';
  }
};

// ======================================================
// MORGAN SAFE TOKENS
// ======================================================

morgan.token(
  'safe-url',
  (
    req
  ) =>
    stripQueryString(
      req.originalUrl ||
      req.url
    )
);

morgan.token(
  'safe-referrer',
  (
    req
  ) =>
    sanitizeReferrer(
      req.headers
        ?.referer ||
      req.headers
        ?.referrer
    )
);

morgan.token(
  'safe-remote-addr',
  (
    req
  ) => {
    return (
      req.realClientIp ||
      '-'
    );
  }
);

// ======================================================
// HTTP LOGGING
// ======================================================

if (
  config.NODE_ENV ===
  'development'
) {
  app.use(
    morgan(
      ':method :safe-url :status :response-time ms - :res[content-length]'
    )
  );
} else {
  app.use(
    morgan(
      ':safe-remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :status :res[content-length] ":safe-referrer" ":user-agent"',
      {
        stream: {
          write(
            message
          ) {
            logger.info(
              message.trim()
            );
          },
        },

        skip(
          req
        ) {
          return (
            req.path ===
              '/health' ||
            req.path ===
              '/health/ready'
          );
        },
      }
    )
  );
}

// ======================================================
// RATE LIMIT REDIS
// ======================================================

let rateLimitRedisClient =
  null;

let lastRedisErrorLogAt =
  0;

const REDIS_ERROR_LOG_INTERVAL_MS =
  30_000;

if (
  config.REDIS_ENABLED &&
  config.REDIS_URL
) {
  rateLimitRedisClient =
    new Redis(
      config.REDIS_URL,
      {
        enableOfflineQueue:
          false,

        maxRetriesPerRequest:
          1,

        connectTimeout:
          5000,

        retryStrategy(
          times
        ) {
          return Math.min(
            times * 500,
            5000
          );
        },
      }
    );

  rateLimitRedisClient.on(
    'error',
    (
      error
    ) => {
      const now =
        Date.now();

      if (
        now -
          lastRedisErrorLogAt <
        REDIS_ERROR_LOG_INTERVAL_MS
      ) {
        return;
      }

      lastRedisErrorLogAt =
        now;

      logger.warn(
        'Rate-limit Redis bağlantı hatası',
        {
          message:
            error?.message ||
            'Redis connection error',
        }
      );
    }
  );
}

// ======================================================
// RATE LIMIT STORE FACTORY
// ======================================================

const createRateLimitStore = (
  prefix
) => {
  if (
    !rateLimitRedisClient
  ) {
    return null;
  }

  return new RedisStore({
    prefix,

    sendCommand:
      async (
        command,
        ...args
      ) => {
        return rateLimitRedisClient.call(
          command,
          ...args
        );
      },
  });
};

// ======================================================
// RATE LIMIT KEY
// ======================================================

const getRateLimitKey = (
  req
) => {
  const clientIp =
    req.realClientIp;

  if (
    !clientIp ||
    !isIP(
      clientIp
    )
  ) {
    return 'unknown-client';
  }

  return ipKeyGenerator(
    clientIp,
    56
  );
};

// ======================================================
// RATE LIMIT FACTORY
// ======================================================

const createLimiter = ({
  prefix,
  ...options
}) => {
  const store =
    createRateLimitStore(
      prefix
    );

  return rateLimit({
    ...options,

    keyGenerator:
      getRateLimitKey,

    passOnStoreError:
      true,

    ...(store
      ? {
          store,
        }
      : {}),
  });
};

// ======================================================
// GLOBAL API RATE LIMIT
// ======================================================

const apiRateLimiter =
  createLimiter({
    prefix:
      'rl:api:',

    identifier:
      'api-general',

    windowMs:
      15 *
      60 *
      1000,

    limit:
      5000,

    standardHeaders:
      'draft-8',

    legacyHeaders:
      false,

    message: {
      success:
        false,

      message:
        'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',

      code:
        'API_RATE_LIMIT_EXCEEDED',
    },
  });

// ======================================================
// LOGIN RATE LIMIT
// ======================================================

const loginRateLimiter =
  createLimiter({
    prefix:
      'rl:auth:login:',

    identifier:
      'auth-login',

    windowMs:
      15 *
      60 *
      1000,

    limit:
      20,

    standardHeaders:
      'draft-8',

    legacyHeaders:
      false,

    skipSuccessfulRequests:
      true,

    message: {
      success:
        false,

      message:
        'Çok fazla başarısız giriş denemesi yapıldı. Lütfen bir süre sonra tekrar deneyin.',

      code:
        'LOGIN_RATE_LIMIT_EXCEEDED',
    },
  });

// ======================================================
// PASSWORD RECOVERY RATE LIMIT
// ======================================================

const passwordRecoveryRateLimiter =
  createLimiter({
    prefix:
      'rl:auth:recovery:',

    identifier:
      'auth-recovery',

    windowMs:
      15 *
      60 *
      1000,

    limit:
      10,

    standardHeaders:
      'draft-8',

    legacyHeaders:
      false,

    message: {
      success:
        false,

      message:
        'Çok fazla şifre sıfırlama isteği gönderildi. Lütfen bir süre sonra tekrar deneyin.',

      code:
        'PASSWORD_RECOVERY_RATE_LIMIT_EXCEEDED',
    },
  });

// ======================================================
// APPLY SPECIFIC RATE LIMITS
// ======================================================

app.use(
  '/api/auth/login',
  loginRateLimiter
);

app.use(
  '/api/auth/forgot-password',
  passwordRecoveryRateLimiter
);

app.use(
  '/api/auth/reset-password',
  passwordRecoveryRateLimiter
);

// ======================================================
// APPLY GLOBAL API RATE LIMIT
// ======================================================

app.use(
  '/api',
  apiRateLimiter
);

// ======================================================
// HEALTH
// ======================================================

app.get(
  '/health',
  (
    req,
    res
  ) => {
    res.set(
      'Cache-Control',
      'no-store'
    );

    return res
      .status(
        200
      )
      .json({
        status:
          'ok',

        service:
          'legal-system-api',

        environment:
          config.NODE_ENV,

        timestamp:
          new Date()
            .toISOString(),
      });
  }
);

app.get(
  '/health/ready',
  async (
    req,
    res,
    next
  ) => {
    try {
      res.set(
        'Cache-Control',
        'no-store'
      );

      const database =
        await checkDatabaseHealth();

      const healthy =
        database.healthy ===
        true;

      if (
        isProduction
      ) {
        return res
          .status(
            healthy
              ? 200
              : 503
          )
          .json({
            status:
              healthy
                ? 'ready'
                : 'not_ready',
          });
      }

      return res
        .status(
          healthy
            ? 200
            : 503
        )
        .json({
          status:
            healthy
              ? 'ready'
              : 'not_ready',

          service:
            'legal-system-api',

          checks: {
            database,
          },

          timestamp:
            new Date()
              .toISOString(),
        });
    } catch (
      error
    ) {
      return next(
        error
      );
    }
  }
);

app.use(
  '/api',
  enforceLicense
);
// ======================================================
// API ROUTES
// ======================================================

app.use(
  '/api/auth',
  authRoutes
);
app.use(
  '/api/license',
  licenseRoutes
);

app.use(
  '/api/screen-lock',
  screenLockRoutes
);

app.use(
  '/api/clients',
  clientRoutes
);

app.use(
  '/api/cases',
  caseRoutes
);

app.use(
  '/api/consultations',
  consultationRoutes
);

app.use(
  '/api/case-parties',
  casePartyRoutes
);

app.use(
  '/api/documents',
  documentRoutes
);

app.use(
  '/api/tasks',
  taskRoutes
);

app.use(
  '/api/finance-v2',
  financeV2Routes
);

// Legacy finance/payment write APIs were retired after Finance V2 reconciliation.
// Keep explicit 410 responses during the cutover window so stale clients fail safely.
app.use('/api/finance', (req, res) => res.status(410).json({
  success: false,
  message: 'Legacy finans API kaldırıldı. Finance V2 kullanılmalıdır.',
}));

app.use('/api/payments', (req, res) => res.status(410).json({
  success: false,
  message: 'Legacy ödeme API kaldırıldı. Finance V2 kullanılmalıdır.',
}));

app.use(
  '/api/search',
  searchRoutes
);

app.use(
  '/api/ai',
  aiRoutes
);

app.use(
  '/api/users',
  userRoutes
);

app.use(
  '/api/events',
  eventRoutes
);

app.use(
  '/api/dashboard',
  dashboardRoutes
);

app.use(
  '/api/performance',
  performanceRoutes
);

app.use(
  '/api/meetings',
  meetingRoutes
);

app.use(
  '/api/calendar-integrations',
  calendarIntegrationRoutes
);

app.use(
  '/api/notifications',
  notificationRoutes
);
app.use(
  '/api/chat',
  chatRoutes
);
app.use(
  '/api/audit-logs',
  auditLogRoutes
);

app.use(
  '/api/power-of-attorney',
  powerOfAttorneyRoutes
);

app.use(
  '/api/templates',
  templateRoutes
);

// ======================================================
// 404
// ======================================================

app.use(
  (
    req,
    res
  ) => {
    const safePath =
      stripQueryString(
        req.originalUrl ||
        req.url
      );

    return res
      .status(
        404
      )
      .json({
        success:
          false,

        message:
          'İstenen API endpoint’i bulunamadı.',

        code:
          'ROUTE_NOT_FOUND',

        path:
          safePath,
      });
  }
);

// ======================================================
// GLOBAL ERROR HANDLER
// ======================================================

app.use(
  errorHandler
);

export {
  app,
};

export default app;