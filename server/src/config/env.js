import dotenv from 'dotenv';

dotenv.config();

// ======================================================
// PARSERS
// ======================================================

const parseInteger = (
  value,
  fallback
) => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return fallback;
  }

  const parsed =
    Number(
      value
    );

  if (
    !Number.isInteger(
      parsed
    )
  ) {
    return fallback;
  }

  return parsed;
};

const parseBoolean = (
  value,
  fallback = false
) => {
  if (
    value === undefined ||
    value === ''
  ) {
    return fallback;
  }

  const normalized =
    String(
      value
    )
      .trim()
      .toLowerCase();

  if (
    normalized ===
    'true'
  ) {
    return true;
  }

  if (
    normalized ===
    'false'
  ) {
    return false;
  }

  return fallback;
};

const parseList = (
  value,
  fallback = []
) => {
  if (
    !value
  ) {
    return fallback;
  }

  return value
    .split(',')
    .map(
      (
        item
      ) =>
        item.trim()
    )
    .filter(
      Boolean
    );
};

// ======================================================
// CONFIG
// ======================================================

export const config = {
  // ====================================================
  // APPLICATION
  // ====================================================

  NODE_ENV:
    process.env.NODE_ENV ||
    'development',

  PORT:
    parseInteger(
      process.env.PORT,
      5000
    ),

  LEGACY_FINANCE_API_ENABLED:
    parseBoolean(
      process.env.LEGACY_FINANCE_API_ENABLED,
      true
    ),

  // ====================================================
  // DATABASE
  // ====================================================

  DATABASE_URL:
    process.env.DATABASE_URL ||
    '',

  // ====================================================
  // JWT
  // ====================================================

  JWT_SECRET:
    process.env.JWT_SECRET ||
    '',

  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    '',

  /*
   * Access token kısa ömürlü.
   *
   * Refresh token sistemi zaten mevcut olduğu için
   * access tokenın günlerce geçerli kalmasına gerek yok.
   */
  JWT_EXPIRES_IN:
    process.env.JWT_EXPIRES_IN ||
    '30m',

  JWT_REFRESH_EXPIRES_IN:
    process.env.JWT_REFRESH_EXPIRES_IN ||
    '30d',

  /*
   * Mutlak oturum süresi.
   *
   * Refresh token rotation bu süreyi UZATMAZ.
   * Varsayılan: 8 saat.
   */
  AUTH_SESSION_MAX_AGE_MS:
    parseInteger(
      process.env.AUTH_SESSION_MAX_AGE_MS,
      8 * 60 * 60 * 1000
    ),

  // ====================================================
  // CORS
  // ====================================================

  CLIENT_URL:
    process.env.CLIENT_URL ||
    'http://localhost:5173',

  CORS_ORIGINS:
    parseList(
      process.env.CORS_ORIGINS,
      [
        process.env.CLIENT_URL ||
          'http://localhost:5173',
      ]
    ),

  // ====================================================
  // REDIS
  // ====================================================

  /*
   * Şimdilik memory queue kullanılabilir.
   * Redis gerektiğinde etkinleştirilebilir.
   */

  REDIS_URL:
    process.env.REDIS_URL ||
    '',

  REDIS_ENABLED:
    parseBoolean(
      process.env.REDIS_ENABLED,
      false
    ),

  // ====================================================
  // OPENAI
  // ====================================================

  OPENAI_API_KEY:
    process.env.OPENAI_API_KEY ||
    '',

  OPENAI_MODEL:
    process.env.OPENAI_MODEL ||
    'gpt-5-mini',

  OPENAI_MAX_OUTPUT_TOKENS:
    parseInteger(
      process.env
        .OPENAI_MAX_OUTPUT_TOKENS,
      4000
    ),

  OPENAI_TIMEOUT_MS:
    parseInteger(
      process.env
        .OPENAI_TIMEOUT_MS,
      120000
    ),

  OPENAI_MAX_RETRIES:
    parseInteger(
      process.env
        .OPENAI_MAX_RETRIES,
      2
    ),

  OPENAI_ENABLED:
    parseBoolean(
      process.env.OPENAI_ENABLED,
      true
    ),

  OPENAI_MOCK_ENABLED:
    parseBoolean(
      process.env.OPENAI_MOCK_ENABLED,
      false
    ),

  // ====================================================
  // BREVO EMAIL API
  // ====================================================

  BREVO_API_KEY:
    process.env.BREVO_API_KEY ||
    '',

  BREVO_SENDER_NAME:
    process.env.BREVO_SENDER_NAME ||
    'Derkenar Hukuk Bürosu Yönetim Sistemi',

  BREVO_SENDER_EMAIL:
    process.env.BREVO_SENDER_EMAIL ||
    '',

  BREVO_TIMEOUT_MS:
    parseInteger(
      process.env
        .BREVO_TIMEOUT_MS,
      20000
    ),

  BREVO_ENABLED:
    parseBoolean(
      process.env.BREVO_ENABLED,
      true
    ),

  // ====================================================
  // MINIO
  // ====================================================

  MINIO_ENABLED:
    parseBoolean(
      process.env.MINIO_ENABLED,
      false
    ),

  MINIO_ENDPOINT:
    process.env.MINIO_ENDPOINT ||
    '',

  MINIO_PORT:
    parseInteger(
      process.env.MINIO_PORT,
      9000
    ),

  MINIO_USE_SSL:
    parseBoolean(
      process.env.MINIO_USE_SSL,
      false
    ),

  MINIO_ACCESS_KEY:
    process.env.MINIO_ACCESS_KEY ||
    '',

  MINIO_SECRET_KEY:
    process.env.MINIO_SECRET_KEY ||
    '',

  MINIO_BUCKET:
    process.env.MINIO_BUCKET ||
    'legal-documents',

  // ====================================================
  // UPLOAD
  // ====================================================

  MAX_FILE_SIZE_MB:
    parseInteger(
      process.env.MAX_FILE_SIZE_MB,
      10
    ),

  MAX_UPLOAD_FILES:
    parseInteger(
      process.env.MAX_UPLOAD_FILES,
      5
    ),
};

// ======================================================
// VALIDATION HELPERS
// ======================================================

const validateProductionOrigin = (
  origin
) => {
  let url;

  try {
    url =
      new URL(
        origin
      );
  } catch {
    throw new Error(
      `Geçersiz CORS origin: ${origin}`
    );
  }

  if (
    url.protocol !==
    'https:'
  ) {
    throw new Error(
      `Production CORS origin HTTPS olmalıdır: ${origin}`
    );
  }

  if (
    url.hostname ===
      'localhost' ||
    url.hostname ===
      '127.0.0.1' ||
    url.hostname ===
      '::1'
  ) {
    throw new Error(
      `Production CORS origin localhost olamaz: ${origin}`
    );
  }

  /*
   * Origin yalnız:
   *
   * protocol + host + port
   *
   * içermelidir.
   *
   * Path/query/hash kabul etmiyoruz.
   */
  if (
    url.pathname !==
      '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `CORS origin path/query/hash içeremez: ${origin}`
    );
  }
};

// ======================================================
// VALIDATE CONFIG
// ======================================================

const validateConfig = () => {
  // ====================================================
  // REQUIRED CORE FIELDS
  // ====================================================

  const requiredFields = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missingFields =
    requiredFields.filter(
      (
        key
      ) =>
        !config[key]
    );

  if (
    missingFields.length >
    0
  ) {
    throw new Error(
      `Eksik zorunlu ortam değişkenleri: ${missingFields.join(
        ', '
      )}`
    );
  }

  // ====================================================
  // JWT SECURITY
  // ====================================================

  /*
   * Çok kısa JWT secret kullanımına izin vermiyoruz.
   *
   * Secretların rastgele üretilmiş olması ayrıca
   * deployment seviyesinde sağlanmalıdır.
   */
  if (
    config.JWT_SECRET.length <
    32
  ) {
    throw new Error(
      'JWT_SECRET en az 32 karakter olmalıdır.'
    );
  }

  if (
    config.JWT_REFRESH_SECRET.length <
    32
  ) {
    throw new Error(
      'JWT_REFRESH_SECRET en az 32 karakter olmalıdır.'
    );
  }

  /*
   * Access ve refresh tokenların aynı secret ile
   * imzalanmasına izin vermiyoruz.
   */
  if (
    config.JWT_SECRET ===
    config.JWT_REFRESH_SECRET
  ) {
    throw new Error(
      'JWT_SECRET ve JWT_REFRESH_SECRET farklı olmalıdır.'
    );
  }

  /*
   * Kurumsal oturum politikası:
   * en az 1 saat, en fazla 24 saat.
   * Varsayılan 8 saattir.
   */
  if (
    config.AUTH_SESSION_MAX_AGE_MS <
      60 * 60 * 1000 ||
    config.AUTH_SESSION_MAX_AGE_MS >
      24 * 60 * 60 * 1000
  ) {
    throw new Error(
      'AUTH_SESSION_MAX_AGE_MS 1 saat ile 24 saat arasında olmalıdır.'
    );
  }

  // ====================================================
  // OPENAI
  // ====================================================

  if (
    config.OPENAI_ENABLED &&
    !config.OPENAI_API_KEY &&
    !config.OPENAI_MOCK_ENABLED
  ) {
    throw new Error(
      'OPENAI_ENABLED=true ancak OPENAI_API_KEY tanımlanmamış.'
    );
  }

  if (
    config.OPENAI_MAX_OUTPUT_TOKENS <
    1
  ) {
    throw new Error(
      'OPENAI_MAX_OUTPUT_TOKENS en az 1 olmalıdır.'
    );
  }

  if (
    config.OPENAI_TIMEOUT_MS <
    1000
  ) {
    throw new Error(
      'OPENAI_TIMEOUT_MS en az 1000 olmalıdır.'
    );
  }

  if (
    config.OPENAI_MAX_RETRIES <
    0
  ) {
    throw new Error(
      'OPENAI_MAX_RETRIES negatif olamaz.'
    );
  }

  // ====================================================
  // BREVO
  // ====================================================

  if (
    config.BREVO_ENABLED
  ) {
    const requiredBrevoFields = [
      'BREVO_API_KEY',
      'BREVO_SENDER_EMAIL',
    ];

    const missingBrevoFields =
      requiredBrevoFields.filter(
        (
          key
        ) =>
          !config[key]
      );

    if (
      missingBrevoFields.length >
      0
    ) {
      throw new Error(
        `Eksik Brevo ortam değişkenleri: ${missingBrevoFields.join(
          ', '
        )}`
      );
    }

    const senderEmailIsValid =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        config.BREVO_SENDER_EMAIL
      );

    if (
      !senderEmailIsValid
    ) {
      throw new Error(
        'BREVO_SENDER_EMAIL geçerli bir e-posta adresi olmalıdır.'
      );
    }

    if (
      config.BREVO_TIMEOUT_MS <
      1000
    ) {
      throw new Error(
        'BREVO_TIMEOUT_MS en az 1000 olmalıdır.'
      );
    }
  }

  // ====================================================
  // MINIO
  // ====================================================

  if (
    config.MINIO_ENABLED
  ) {
    const requiredMinioFields = [
      'MINIO_ENDPOINT',
      'MINIO_ACCESS_KEY',
      'MINIO_SECRET_KEY',
      'MINIO_BUCKET',
    ];

    const missingMinioFields =
      requiredMinioFields.filter(
        (
          key
        ) =>
          !config[key]
      );

    if (
      missingMinioFields.length >
      0
    ) {
      throw new Error(
        `Eksik MinIO ortam değişkenleri: ${missingMinioFields.join(
          ', '
        )}`
      );
    }

    if (
      config.MINIO_PORT <
      1 ||
      config.MINIO_PORT >
      65535
    ) {
      throw new Error(
        'MINIO_PORT 1 ile 65535 arasında olmalıdır.'
      );
    }
  }

  // ====================================================
  // REDIS
  // ====================================================

  if (
    config.REDIS_ENABLED &&
    !config.REDIS_URL
  ) {
    throw new Error(
      'REDIS_ENABLED=true ancak REDIS_URL tanımlanmamış.'
    );
  }

  // ====================================================
  // PRODUCTION
  // ====================================================

  if (
    config.NODE_ENV ===
    'production'
  ) {
    /*
     * Ana frontend adresi.
     */
    validateProductionOrigin(
      config.CLIENT_URL
    );

    /*
     * CORS allowlist'teki HER origin ayrı ayrı
     * doğrulanır.
     *
     * Böylece production ortamına yanlışlıkla:
     *
     * http://localhost:5173
     *
     * gibi bir origin eklenemez.
     */
    for (
      const origin of
      config.CORS_ORIGINS
    ) {
      validateProductionOrigin(
        origin
      );
    }
  }

  // ====================================================
  // UPLOAD LIMITS
  // ====================================================

  if (
    config.MAX_FILE_SIZE_MB <
    1
  ) {
    throw new Error(
      'MAX_FILE_SIZE_MB en az 1 olmalıdır.'
    );
  }

  if (
    config.MAX_UPLOAD_FILES <
    1
  ) {
    throw new Error(
      'MAX_UPLOAD_FILES en az 1 olmalıdır.'
    );
  }
};

validateConfig();

export default config;