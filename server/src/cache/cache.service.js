import { getRedisClient, isRedisReady } from '../config/redis.js';
import { logger } from '../config/logger.js';

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.defaultTTL = 3600; // 1 hour
    this.useRedis = false;
  }

  async initialize() {
    try {
      this.useRedis = isRedisReady();
      if (this.useRedis) {
        logger.info('✅ Cache service using Redis');
      } else {
        logger.warn('⚠️ Cache service using memory (fallback)');
      }
    } catch (error) {
      logger.error('Cache initialization error:', error);
      this.useRedis = false;
    }
  }

  async get(key) {
    try {
      if (this.useRedis) {
        const client = getRedisClient();
        if (!client) return this.getMemory(key);
        
        const data = await client.get(key);
        if (!data) return null;
        
        return JSON.parse(data);
      }
      
      return this.getMemory(key);
    } catch (error) {
      logger.error('Cache get error:', error);
      return this.getMemory(key);
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (this.useRedis) {
        const client = getRedisClient();
        if (!client) return this.setMemory(key, value, ttl);
        
        await client.set(key, JSON.stringify(value), 'EX', ttl);
        return;
      }
      
      this.setMemory(key, value, ttl);
    } catch (error) {
      logger.error('Cache set error:', error);
      this.setMemory(key, value, ttl);
    }
  }

  async del(key) {
    try {
      if (this.useRedis) {
        const client = getRedisClient();
        if (!client) return this.delMemory(key);
        
        await client.del(key);
        return;
      }
      
      this.delMemory(key);
    } catch (error) {
      logger.error('Cache del error:', error);
      this.delMemory(key);
    }
  }

  async clearPattern(pattern) {
    try {
      if (this.useRedis) {
        const client = getRedisClient();
        if (!client) return this.clearMemoryPattern(pattern);
        
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(keys);
        }
        return;
      }
      
      this.clearMemoryPattern(pattern);
    } catch (error) {
      logger.error('Cache clear pattern error:', error);
      this.clearMemoryPattern(pattern);
    }
  }

  // Memory cache methods
  getMemory(key) {
    const item = this.memoryCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.memoryCache.delete(key);
      return null;
    }
    
    return item.data;
  }

  setMemory(key, value, ttl = this.defaultTTL) {
    const expires = Date.now() + (ttl * 1000);
    this.memoryCache.set(key, { data: value, expires });
  }

  delMemory(key) {
    this.memoryCache.delete(key);
  }

  clearMemoryPattern(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  clearMemory() {
    this.memoryCache.clear();
  }

  // Utility methods
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {});
    
    return `${prefix}:${JSON.stringify(sortedParams)}`;
  }

  async getOrFetch(key, fetchFn, ttl = this.defaultTTL) {
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const data = await fetchFn();
    if (data !== null && data !== undefined) {
      await this.set(key, data, ttl);
    }
    return data;
  }

  async invalidate(prefix, params = null) {
    const pattern = params 
      ? this.generateKey(prefix, params)
      : `${prefix}:*`;
    
    await this.clearPattern(pattern);
  }

  async flushAll() {
    if (this.useRedis) {
      const client = getRedisClient();
      if (client) {
        await client.flushdb();
      }
    }
    this.clearMemory();
  }
}

export const cacheService = new CacheService();
export default cacheService;