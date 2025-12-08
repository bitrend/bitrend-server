const CacheService = require('../services/cache.service');

const cacheService = new CacheService();

const cache = (ttl = 3600, keyGenerator = null) => {
  return async (req, res, next) => {
    try {
      // Generate cache key
      let cacheKey;
      if (keyGenerator && typeof keyGenerator === 'function') {
        cacheKey = keyGenerator(req);
      } else {
        // Default key generation: method + url + user id (if authenticated)
        const userId = req.user ? req.user.id : 'anonymous';
        cacheKey = `${req.method}:${req.path}:${userId}:${JSON.stringify(req.query)}`;
      }

      // Try to get cached response
      const cachedResponse = await cacheService.get(cacheKey);
      if (cachedResponse) {
        return res.json(cachedResponse);
      }

      // Store original res.json method
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function(body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheKey, body, ttl).catch(err => {
            console.error('Failed to cache response:', err);
          });
        }

        // Call original json method
        originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

const invalidateCache = (keyPattern) => {
  return async (req, res, next) => {
    try {
      // Store original res.json method
      const originalJson = res.json;

      // Override res.json to invalidate cache after successful operations
      res.json = function(body) {
        // Only invalidate on successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          let pattern;
          if (typeof keyPattern === 'function') {
            pattern = keyPattern(req);
          } else {
            pattern = keyPattern;
          }

          cacheService.invalidatePattern(pattern).catch(err => {
            console.error('Failed to invalidate cache:', err);
          });
        }

        // Call original json method
        originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Cache invalidation middleware error:', error);
      next();
    }
  };
};

// Specific cache key generators
const cacheKeyGenerators = {
  userRecommendations: (req) => {
    const userId = req.user.id;
    const limit = req.query.limit || 10;
    return cacheService.getUserRecommendationsKey(userId, limit);
  },

  analysisRecommendations: (req) => {
    const analysisId = req.params.analysisId;
    return cacheService.getAnalysisRecommendationsKey(analysisId);
  },

  userLearningPath: (req) => {
    const userId = req.user.id;
    return cacheService.getUserLearningPathKey(userId);
  },

  userStats: (req) => {
    const userId = req.params.userId || req.user.id;
    return cacheService.getUserStatsKey(userId);
  },

  userRanking: (req) => {
    const userId = req.params.userId || req.user.id;
    const category = req.query.category || 'overall';
    return cacheService.getUserRankingKey(userId, category);
  },

  ranking: (req) => {
    const category = req.query.category || 'overall';
    const limit = req.query.limit || 100;
    return cacheService.getRankingKey(category, limit);
  },

  dashboard: (req) => {
    const userId = req.user.id;
    return cacheService.getDashboardKey(userId);
  },

  gitHubRepositories: (req) => {
    const userId = req.user.id;
    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    return cacheService.getGitHubRepositoriesKey(userId, page, limit);
  }
};

// Cache invalidation patterns
const invalidationPatterns = {
  userCache: (req) => `user:${req.user.id}:*`,
  analysisCache: (req) => `analysis:${req.params.analysisId}:*`,
  rankingCache: () => 'ranking:*',
  githubCache: (req) => `github:${req.user.id}:*`
};

module.exports = {
  cache,
  invalidateCache,
  cacheKeyGenerators,
  invalidationPatterns,
  cacheService
};