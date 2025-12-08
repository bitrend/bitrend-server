const dashboardService = require('../services/dashboard.service');

/**
 * GET /api/dashboard
 * 대시보드 전체 데이터 조회
 */
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period = '30d' } = req.query;

    // period 유효성 검사
    const validPeriods = ['7d', '30d', '90d', '1y'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PERIOD',
          message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
        }
      });
    }

    const dashboardData = await dashboardService.getDashboardData(userId, period);

    res.json(dashboardData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboard
};
