const { getMonitoringService } = require('../services/monitoring.service');
const { logger } = require('../config/logger');

class MonitoringController {
  constructor() {
    this.monitoringService = getMonitoringService();
  }

  getMetrics = async (req, res, next) => {
    try {
      const metrics = this.monitoringService.getCurrentMetrics();

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      next(error);
    }
  };

  getHealth = async (req, res, next) => {
    try {
      const health = await this.monitoringService.getHealthStatus();

      const statusCode = health.status === 'healthy' ? 200 :
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: true,
        data: health
      });
    } catch (error) {
      next(error);
    }
  };

  getDetailedHealth = async (req, res, next) => {
    try {
      const health = await this.monitoringService.getHealthStatus();
      const metrics = this.monitoringService.getCurrentMetrics();

      const detailed = {
        ...health,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        node_version: process.version,
        uptime: process.uptime(),
        detailed_metrics: metrics
      };

      const statusCode = health.status === 'healthy' ? 200 :
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: true,
        data: detailed
      });
    } catch (error) {
      next(error);
    }
  };

  // Simple liveness probe
  getLiveness = async (req, res) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  };

  // Simple readiness probe
  getReadiness = async (req, res, next) => {
    try {
      const { prisma } = require('../config/prisma');

      // Quick database check
      await prisma.$queryRaw`SELECT 1`;

      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Readiness check failed:', error);
      res.status(503).json({
        status: 'not ready',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

module.exports = MonitoringController;