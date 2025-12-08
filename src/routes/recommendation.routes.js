const express = require('express');
const RecommendationController = require('../controllers/recommendation.controller');
const auth = require('../middlewares/auth');
const { cache, invalidateCache, cacheKeyGenerators, invalidationPatterns } = require('../middlewares/cache');

const router = express.Router();
const recommendationController = new RecommendationController();

// Get user's recommendations (cached for 30 minutes)
router.get('/',
  auth,
  cache(1800, cacheKeyGenerators.userRecommendations),
  recommendationController.getUserRecommendations
);

// Get recommendations for specific analysis (cached for 1 hour)
router.get('/analysis/:analysisId',
  auth,
  cache(3600, cacheKeyGenerators.analysisRecommendations),
  recommendationController.getRecommendationsByAnalysis
);

// Get personalized learning path (cached for 2 hours)
router.get('/learning-path',
  auth,
  cache(7200, cacheKeyGenerators.userLearningPath),
  recommendationController.getPersonalizedLearningPath
);

// Generate recommendations for analysis (invalidate related caches)
router.post('/analysis/:analysisId/generate',
  auth,
  invalidateCache(invalidationPatterns.analysisCache),
  invalidateCache(invalidationPatterns.userCache),
  recommendationController.generateRecommendations
);

module.exports = router;