import {
  config,
} from './env.js';

// ======================================================
// LEVELS
// ======================================================

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// ======================================================
// COLORS
// ======================================================

const colors = {
  error:
    '\x1b[31m',

  warn:
    '\x1b[33m',

  info:
    '\x1b[36m',

  http:
    '\x1b[35m',

  debug:
    '\x1b[32m',

  reset:
    '\x1b[0m',
};

// ======================================================
// SENSITIVE FIELDS
// ======================================================

const sensitiveKeys =
  new Set([
    'password',
    'password_hash',
    'current_password',
    'new_password',

    'token',
    'access_token',
    'refresh_token',
    'id_token',

    'authorization',
    'proxy_authorization',

    'cookie',
    'set_cookie',

    'client_secret',
    'api_key',
    'apikey',

    'secret',
    'jwt_secret',

    'encryption_key',
    'calendar_token_encryption_key',
  ]);

// ======================================================
// HELPERS
// ======================================================

const normalizeKey = (
  key
) => {
  return String(
    key || ''
  )
    .trim()
    .toLowerCase()
    .replace(
      /-/g,
      '_'
    );
};

const maskSensitiveString = (
  value
) => {
  if (
    typeof value !==
    'string'
  ) {
    return value;
  }

  let sanitized =
    value;

  /*
   * Authorization / Bearer token.
   */
  sanitized =
    sanitized.replace(
      /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
      'Bearer [REDACTED]'
    );

  /*
   * URL veya metin içinde açıkça bulunan
   * hassas query/body değerleri.
   */
  sanitized =
    sanitized.replace(
      /((?:access_token|refresh_token|id_token|client_secret|password|api_key|apikey)=)[^&\s]+/gi,
      '$1[REDACTED]'
    );

  return sanitized;
};

const sanitizeValue = (
  value,
  seen =
    new WeakSet(),
  depth =
    0
) => {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof value ===
    'string'
  ) {
    return maskSensitiveString(
      value
    );
  }

  if (
    typeof value ===
      'number' ||
    typeof value ===
      'boolean' ||
    typeof value ===
      'bigint'
  ) {
    return value;
  }

  if (
    typeof value ===
    'function'
  ) {
    return '[Function]';
  }

  /*
   * Log objesinin aşırı derinleşmesini
   * veya devasa payload oluşturmasını engeller.
   */
  if (
    depth > 8
  ) {
    return '[MaxDepth]';
  }

  if (
    value instanceof
    Error
  ) {
    return {
      name:
        value.name,

      message:
        maskSensitiveString(
          value.message
        ),

      stack:
        maskSensitiveString(
          value.stack
        ),

      code:
        value.code,

      status:
        value.status,

      statusCode:
        value.statusCode,
    };
  }

  if (
    typeof value ===
    'object'
  ) {
    if (
      seen.has(
        value
      )
    ) {
      return '[Circular]';
    }

    seen.add(
      value
    );

    if (
      Array.isArray(
        value
      )
    ) {
      return value.map(
        (
          item
        ) =>
          sanitizeValue(
            item,
            seen,
            depth + 1
          )
      );
    }

    const sanitized =
      {};

    for (
      const [
        key,
        itemValue,
      ] of Object.entries(
        value
      )
    ) {
      const normalizedKey =
        normalizeKey(
          key
        );

      if (
        sensitiveKeys.has(
          normalizedKey
        )
      ) {
        sanitized[key] =
          '[REDACTED]';

        continue;
      }

      sanitized[key] =
        sanitizeValue(
          itemValue,
          seen,
          depth + 1
        );
    }

    return sanitized;
  }

  return String(
    value
  );
};

const sanitizeArgs = (
  args
) => {
  return args.map(
    (
      arg
    ) =>
      sanitizeValue(
        arg
      )
  );
};

// ======================================================
// LOGGER
// ======================================================

class Logger {
  constructor() {
    this.isProduction =
      config.NODE_ENV ===
      'production';

    this.level =
      this.isProduction
        ? 'info'
        : 'debug';
  }

  log(
    level,
    message,
    ...args
  ) {
    const levelValue =
      levels[level];

    const currentLevelValue =
      levels[
        this.level
      ];

    if (
      levelValue ===
        undefined ||
      levelValue >
        currentLevelValue
    ) {
      return;
    }

    const timestamp =
      new Date()
        .toISOString();

    const sanitizedMessage =
      maskSensitiveString(
        String(
          message ?? ''
        )
      );

    const sanitizedArgs =
      sanitizeArgs(
        args
      );

    /*
     * Production loglarında ANSI renk kodu
     * kullanmıyoruz.
     *
     * Render gibi merkezi log sistemlerinde
     * temiz metin daha sağlıklıdır.
     */
    const prefix =
      this.isProduction
        ? `[${timestamp}] ${level.toUpperCase()}`
        : `[${timestamp}] ${
            colors[level] ||
            colors.reset
          }${level.toUpperCase()}${colors.reset}`;

    /*
     * Error ve warning'leri stderr'e,
     * normal uygulama loglarını stdout'a
     * gönderiyoruz.
     */
    if (
      level ===
      'error'
    ) {
      console.error(
        prefix,
        sanitizedMessage,
        ...sanitizedArgs
      );

      return;
    }

    if (
      level ===
      'warn'
    ) {
      console.warn(
        prefix,
        sanitizedMessage,
        ...sanitizedArgs
      );

      return;
    }

    console.log(
      prefix,
      sanitizedMessage,
      ...sanitizedArgs
    );
  }

  error(
    message,
    ...args
  ) {
    this.log(
      'error',
      message,
      ...args
    );
  }

  warn(
    message,
    ...args
  ) {
    this.log(
      'warn',
      message,
      ...args
    );
  }

  info(
    message,
    ...args
  ) {
    this.log(
      'info',
      message,
      ...args
    );
  }

  http(
    message,
    ...args
  ) {
    this.log(
      'http',
      message,
      ...args
    );
  }

  debug(
    message,
    ...args
  ) {
    this.log(
      'debug',
      message,
      ...args
    );
  }
}

export const logger =
  new Logger();

export default logger;