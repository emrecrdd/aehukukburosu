class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  set(key, data, ttl = this.defaultTTL) {
    const expires = Date.now() + ttl;
    this.cache.set(key, { data, expires });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  remove(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    return this.cache.has(key) && Date.now() < this.cache.get(key).expires;
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  size() {
    return this.cache.size;
  }

  // Clear expired items
  clean() {
    for (const [key, value] of this.cache) {
      if (Date.now() > value.expires) {
        this.cache.delete(key);
      }
    }
  }

  // Get with auto-refresh
  async getOrFetch(key, fetchFn, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }
}

export const cacheService = new CacheService();
export default cacheService;