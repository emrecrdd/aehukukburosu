import {
  Sequelize,
} from 'sequelize';

import {
  config,
} from './env.js';

import {
  logger,
} from './logger.js';

import {
  initModels,
} from '../models/index.js';

// ======================================================
// REQUIRED CONFIG
// ======================================================

if (
  !config.DATABASE_URL
) {
  throw new Error(
    'DATABASE_URL ortam değişkeni tanımlanmamış.'
  );
}

const isProduction =
  config.NODE_ENV ===
  'production';

// ======================================================
// SEQUELIZE
// ======================================================

export const sequelize =
  new Sequelize(
    config.DATABASE_URL,
    {
      dialect:
        'postgres',

      dialectOptions:
        isProduction
          ? {
              ssl: {
                require:
                  true,

                rejectUnauthorized:
                  false,
              },
            }
          : {},

      logging:
        config.NODE_ENV ===
        'development'
          ? (
              message
            ) =>
              logger.debug(
                message
              )
          : false,

      pool: {
        max:
          isProduction
            ? 10
            : 5,

        min:
          0,

        acquire:
          30000,

        idle:
          10000,

        evict:
          1000,
      },

      retry: {
        max:
          3,

        match: [
          /SequelizeConnectionError/,
          /SequelizeConnectionRefusedError/,
          /SequelizeHostNotFoundError/,
          /SequelizeHostNotReachableError/,
          /SequelizeInvalidConnectionError/,
          /SequelizeConnectionTimedOutError/,
          /Connection terminated unexpectedly/,
          /ECONNRESET/,
          /ETIMEDOUT/,
        ],
      },

      define: {
        underscored:
          true,

        timestamps:
          true,

        createdAt:
          'created_at',

        updatedAt:
          'updated_at',

        deletedAt:
          'deleted_at',

        paranoid:
          true,

        freezeTableName:
          true,
      },

      timezone:
        '+00:00',

      benchmark:
        config.NODE_ENV ===
        'development',
    }
  );

// ======================================================
// INTERNAL STATE
// ======================================================

let modelsInitialized =
  false;

let databaseConnected =
  false;

// ======================================================
// HEALTH CHECK CONFIG
// ======================================================

const HEALTH_SUCCESS_CACHE_MS =
  5000;

const HEALTH_FAILURE_CACHE_MS =
  2000;

const HEALTH_ERROR_LOG_INTERVAL_MS =
  30_000;

let healthCache = {
  result:
    null,

  expiresAt:
    0,
};

let healthCheckPromise =
  null;

let lastHealthErrorLogAt =
  0;

// ======================================================
// MODEL INITIALIZATION
// ======================================================

const initializeModels = () => {
  if (
    modelsInitialized
  ) {
    return;
  }

  initModels(
    sequelize
  );

  modelsInitialized =
    true;

  logger.info(
    'Sequelize modelleri başlatıldı'
  );
};

// ======================================================
// CONNECT
// ======================================================

export const connectDB =
  async () => {
    if (
      databaseConnected
    ) {
      return sequelize;
    }

    initializeModels();

    try {
      await sequelize.authenticate();

      databaseConnected =
        true;

      healthCache = {
        result:
          null,

        expiresAt:
          0,
      };

      logger.info(
        'Neon PostgreSQL bağlantısı kuruldu',
        {
          environment:
            config.NODE_ENV,

          poolMax:
            isProduction
              ? 10
              : 5,
        }
      );

      /*
       * Şema runtime sırasında değiştirilmez.
       *
       * Tüm schema değişiklikleri migration ile yapılır:
       *
       * npx sequelize-cli db:migrate
       */

      return sequelize;
    } catch (
      error
    ) {
      databaseConnected =
        false;

      logger.error(
        'Veritabanı bağlantısı kurulamadı',
        {
          name:
            error.name,

          message:
            error.message,

          originalCode:
            error.original
              ?.code,

          stack:
            config.NODE_ENV ===
            'development'
              ? error.stack
              : undefined,
        }
      );

      throw error;
    }
  };

// ======================================================
// HEALTH RESPONSE
// ======================================================

const createHealthResult = ({
  healthy,
  durationMs,
}) => {
  if (
    isProduction
  ) {
    return {
      healthy:
        healthy === true,
    };
  }

  return {
    healthy:
      healthy === true,

    connected:
      healthy === true,

    durationMs,
  };
};

// ======================================================
// HEALTH CHECK
// ======================================================

const executeDatabaseHealthCheck =
  async () => {
    const startedAt =
      Date.now();

    try {
      await sequelize.query(
        'SELECT 1',
        {
          logging:
            false,
        }
      );

      databaseConnected =
        true;

      const result =
        createHealthResult({
          healthy:
            true,

          durationMs:
            Date.now() -
            startedAt,
        });

      healthCache = {
        result,

        expiresAt:
          Date.now() +
          HEALTH_SUCCESS_CACHE_MS,
      };

      return result;
    } catch (
      error
    ) {
      databaseConnected =
        false;

      const now =
        Date.now();

      if (
        now -
          lastHealthErrorLogAt >=
        HEALTH_ERROR_LOG_INTERVAL_MS
      ) {
        lastHealthErrorLogAt =
          now;

        logger.error(
          'Veritabanı sağlık kontrolü başarısız',
          {
            name:
              error.name,

            message:
              error.message,
          }
        );
      }

      const result =
        createHealthResult({
          healthy:
            false,

          durationMs:
            Date.now() -
            startedAt,
        });

      healthCache = {
        result,

        expiresAt:
          Date.now() +
          HEALTH_FAILURE_CACHE_MS,
      };

      return result;
    }
  };

// ======================================================
// PUBLIC HEALTH CHECK
// ======================================================

export const checkDatabaseHealth =
  async () => {
    const now =
      Date.now();

    if (
      healthCache.result &&
      healthCache.expiresAt >
        now
    ) {
      return healthCache.result;
    }

    if (
      healthCheckPromise
    ) {
      return healthCheckPromise;
    }

    healthCheckPromise =
      executeDatabaseHealthCheck();

    try {
      return await healthCheckPromise;
    } finally {
      healthCheckPromise =
        null;
    }
  };

// ======================================================
// DISCONNECT
// ======================================================

export const disconnectDB =
  async () => {
    if (
      !databaseConnected
    ) {
      return;
    }

    try {
      await sequelize.close();

      databaseConnected =
        false;

      healthCache = {
        result:
          null,

        expiresAt:
          0,
      };

      logger.info(
        'Veritabanı bağlantıları kapatıldı'
      );
    } catch (
      error
    ) {
      logger.error(
        'Veritabanı bağlantıları kapatılamadı',
        {
          name:
            error.name,

          message:
            error.message,
        }
      );

      throw error;
    }
  };

export default sequelize;