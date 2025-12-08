const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middlewares/auth');
const { cache, cacheKeyGenerators } = require('../middlewares/cache');

/**
 * @route   GET /api/dashboard
 * @desc    대시보드 전체 데이터 조회
 * @access  Private
 */
router.get(
  '/',
  requireAuth,
  cache(30, cacheKeyGenerators.dashboard), // 30초 캐시
  dashboardController.getDashboard
);

module.exports = router;
