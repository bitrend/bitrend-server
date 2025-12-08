const { getRedisClient } = require('../config/redis');

class CacheService {
  constructor() {
    this.redis = getRedisClient();
    this.defaultTTL = 60 * 60; // 1 hour in seconds
  }

  async get(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, stringValue);
      } else {
        await this.redis.set(key, stringValue);
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async flush() {
    try {
      await this.redis.flushdb();
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  async exists(key) {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async expire(key, ttl) {
    try {
      await this.redis.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  async getMany(keys) {
    try {
      if (keys.length === 0) return {};

      const values = await this.redis.mget(keys);
      const result = {};

      keys.forEach((key, index) => {
        result[key] = values[index] ? JSON.parse(values[index]) : null;
      });

      return result;
    } catch (error) {
      console.error('Cache getMany error:', error);
      return {};
    }
  }

  async setMany(keyValuePairs, ttl = this.defaultTTL) {
    try {
      const pipeline = this.redis.pipeline();

      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const stringValue = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, stringValue);
        } else {
          pipeline.set(key, stringValue);
        }
      });

      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache setMany error:', error);
      return false;
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache invalidatePattern error:', error);
      return false;
    }
  }

  // Cache key generators for different data types
  getUserKey(userId) {
    return `user:${userId}`;
  }

  getUserRecommendationsKey(userId, limit) {
    return `user:${userId}:recommendations:${limit}`;
  }

  getAnalysisKey(analysisId) {
    return `analysis:${analysisId}`;
  }

  getAnalysisRecommendationsKey(analysisId) {
    return `analysis:${analysisId}:recommendations`;
  }

  getUserLearningPathKey(userId) {
    return `user:${userId}:learning-path`;
  }

  getUserStatsKey(userId) {
    return `user:${userId}:stats`;
  }

  getUserRankingKey(userId, category = 'overall') {
    return `user:${userId}:ranking:${category}`;
  }

  getRankingKey(category = 'overall', limit = 100) {
    return `ranking:${category}:${limit}`;
  }

  getGitHubRepositoriesKey(userId, page = 1, limit = 20) {
    return `github:${userId}:repos:${page}:${limit}`;
  }

  getRepositoryDetailsKey(repositoryId) {
    return `repository:${repositoryId}:details`;
  }

  getDashboardKey(userId) {
    return `dashboard:${userId}`;
  }

  // Invalidation helpers
  async invalidateUserCache(userId) {
    await this.invalidatePattern(`user:${userId}:*`);
    await this.invalidatePattern(`dashboard:${userId}`);
  }

  async invalidateAnalysisCache(analysisId) {
    await this.invalidatePattern(`analysis:${analysisId}:*`);
  }

  async invalidateRankingCache() {
    await this.invalidatePattern(`ranking:*`);
  }

  async invalidateGitHubCache(userId) {
    await this.invalidatePattern(`github:${userId}:*`);
  }

  // Utility methods
  async cacheWithFallback(key, fallbackFn, ttl = this.defaultTTL) {
    try {
      // Try to get from cache first
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, execute fallback function
      const result = await fallbackFn();

      // Cache the result
      await this.set(key, result, ttl);

      return result;
    } catch (error) {
      console.error('Cache with fallback error:', error);
      // If caching fails, still return the result from fallback
      return await fallbackFn();
    }
  }

  async warmUpCache() {
    // This method can be called on startup to pre-populate frequently accessed data
    console.log('Cache warm-up completed');
  }
}

module.exports = CacheService;