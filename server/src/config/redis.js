import Redis from 'ioredis';
import { config } from './env.js';
import { logger } from './logger.js';

let redisClient = null;
let isRedisConnected = false;

export const connectRedis = async () => {
  if (isRedisConnected && redisClient) {
    return redisClient;
  }

  try {
    redisClient = new Redis(config.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis is ready');
    });

    redisClient.on('error', (error) => {
      logger.error('❌ Redis connection error:', error.message);
      isRedisConnected = false;
    });

    redisClient.on('close', () => {
      logger.warn('⚠️ Redis connection closed');
      isRedisConnected = false;
    });

    redisClient.on('reconnecting', () => {
      logger.warn('⚠️ Redis reconnecting...');
    });

    // Test connection
    await redisClient.ping();
    return redisClient;
  } catch (error) {
    logger.error('❌ Redis connection failed:', error.message);
    return null;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    logger.warn('⚠️ Redis client not initialized');
    return null;
  }
  return redisClient;
};

export const isRedisReady = () => isRedisConnected && redisClient !== null;

export const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    isRedisConnected = false;
    logger.info('Redis disconnected');
  }
};

export default {
  connectRedis,
  getRedisClient,
  isRedisReady,
  disconnectRedis,
};