const { performanceLogger, logPerformance } = require('../config/logger');
const { getRedisClient } = require('../config/redis');
const { prisma } = require('../config/prisma');

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: new Map(),
      responses: new Map(),
      errors: new Map(),
      performance: new Map(),
      system: new Map()
    };

    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;

    // Initialize monitoring intervals
    this.initializeMonitoring();
  }

  initializeMonitoring() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Clean up old metrics every 5 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);

    // Log performance summary every minute
    setInterval(() => {
      this.logPerformanceSummary();
    }, 60000);
  }

  // HTTP Request monitoring
  trackRequest(req, res, next) {
    const startTime = Date.now();
    this.requestCount++;

    const originalEnd = res.end;
    res.end = (...args) => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Track request metrics
      this.recordRequestMetric(req, res, duration);

      // Log slow requests
      if (duration > 1000) {
        performanceLogger.warn('Slow request detected', {
          method: req.method,
          url: req.path,
          duration: `${duration}ms`,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          userId: req.user?.id
        });
      }

      // Call original end method
      originalEnd.apply(res, args);
    };

    next();
  }

  recordRequestMetric(req, res, duration) {
    const key = `${req.method} ${req.path}`;
    const now = Date.now();

    if (!this.metrics.requests.has(key)) {
      this.metrics.requests.set(key, []);
    }

    this.metrics.requests.get(key).push({
      timestamp: now,
      duration,
      statusCode: res.statusCode,
      userId: req.user?.id
    });

    // Track error rates
    if (res.statusCode >= 400) {
      this.errorCount++;
      this.recordErrorMetric(req, res, duration);
    }
  }

  recordErrorMetric(req, res, duration) {
    const key = `${req.method} ${req.path}`;
    const now = Date.now();

    if (!this.metrics.errors.has(key)) {
      this.metrics.errors.set(key, []);
    }

    this.metrics.errors.get(key).push({
      timestamp: now,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id
    });
  }

  // Database monitoring
  async trackDatabaseQuery(operation, queryFn) {
    const startTime = process.hrtime();

    try {
      const result = await queryFn();
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      this.recordDatabaseMetric(operation, duration, 'success');

      if (duration > 1000) {
        performanceLogger.warn('Slow database query', {
          operation,
          duration: `${duration.toFixed(2)}ms`
        });
      }

      return result;
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      this.recordDatabaseMetric(operation, duration, 'error');
      throw error;
    }
  }

  recordDatabaseMetric(operation, duration, status) {
    const now = Date.now();

    if (!this.metrics.performance.has('database')) {
      this.metrics.performance.set('database', []);
    }

    this.metrics.performance.get('database').push({
      timestamp: now,
      operation,
      duration,
      status
    });
  }

  // System metrics collection
  async collectSystemMetrics() {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Database connection metrics
      let dbMetrics = null;
      try {
        const activeConnections = await this.getActiveConnections();
        dbMetrics = { activeConnections };
      } catch (error) {
        performanceLogger.warn('Failed to get database metrics:', error.message);
      }

      // Redis metrics
      let redisMetrics = null;
      try {
        const redis = getRedisClient();
        const info = await redis.info('memory');
        const memoryUsed = this.parseRedisInfo(info, 'used_memory');
        redisMetrics = { memoryUsed };
      } catch (error) {
        // Redis might not be available
        redisMetrics = { status: 'unavailable' };
      }

      const systemMetrics = {
        timestamp: Date.now(),
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        uptime: process.uptime(),
        database: dbMetrics,
        redis: redisMetrics,
        requestCount: this.requestCount,
        errorCount: this.errorCount,
        errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0
      };

      this.metrics.system.set('current', systemMetrics);

      // Log critical metrics
      if (systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal > 0.9) {
        performanceLogger.warn('High memory usage detected', {
          heapUsage: `${((systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100).toFixed(2)}%`
        });
      }

      if (systemMetrics.errorRate > 5) {
        performanceLogger.warn('High error rate detected', {
          errorRate: `${systemMetrics.errorRate.toFixed(2)}%`,
          totalRequests: systemMetrics.requestCount,
          totalErrors: systemMetrics.errorCount
        });
      }

    } catch (error) {
      performanceLogger.error('Failed to collect system metrics:', error);
    }
  }

  async getActiveConnections() {
    // This is a simplified version - in production, you might want to use
    // database-specific queries to get actual connection pool metrics
    try {
      await prisma.$queryRaw`SELECT 1`;
      return 1; // Simplified - Prisma manages connections internally
    } catch (error) {
      return 0;
    }
  }

  parseRedisInfo(info, key) {
    const lines = info.split('\n');
    for (const line of lines) {
      if (line.startsWith(key + ':')) {
        return parseInt(line.split(':')[1]);
      }
    }
    return null;
  }

  // Performance summary logging
  logPerformanceSummary() {
    try {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      // Request metrics for the last minute
      const recentRequests = this.getMetricsInTimeRange('requests', oneMinuteAgo, now);
      const recentErrors = this.getMetricsInTimeRange('errors', oneMinuteAgo, now);

      if (recentRequests.length > 0) {
        const avgResponseTime = recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length;
        const errorRate = recentErrors.length > 0 ? (recentErrors.length / recentRequests.length) * 100 : 0;

        performanceLogger.info('Performance Summary (1 min)', {
          totalRequests: recentRequests.length,
          avgResponseTime: `${avgResponseTime.toFixed(2)}ms`,
          errorRate: `${errorRate.toFixed(2)}%`,
          statusCodes: this.getStatusCodeDistribution(recentRequests)
        });
      }

      // Database metrics
      const dbMetrics = this.metrics.performance.get('database') || [];
      const recentDbQueries = dbMetrics.filter(m => m.timestamp >= oneMinuteAgo);

      if (recentDbQueries.length > 0) {
        const avgDbTime = recentDbQueries.reduce((sum, q) => sum + q.duration, 0) / recentDbQueries.length;
        const dbErrorRate = recentDbQueries.filter(q => q.status === 'error').length / recentDbQueries.length * 100;

        performanceLogger.info('Database Performance (1 min)', {
          totalQueries: recentDbQueries.length,
          avgQueryTime: `${avgDbTime.toFixed(2)}ms`,
          errorRate: `${dbErrorRate.toFixed(2)}%`
        });
      }

    } catch (error) {
      performanceLogger.error('Failed to log performance summary:', error);
    }
  }

  getMetricsInTimeRange(metricType, startTime, endTime) {
    const allMetrics = [];
    for (const [key, metrics] of this.metrics[metricType]) {
      const filtered = metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
      allMetrics.push(...filtered);
    }
    return allMetrics;
  }

  getStatusCodeDistribution(requests) {
    const distribution = {};
    for (const req of requests) {
      const code = Math.floor(req.statusCode / 100) * 100; // Group by 2xx, 3xx, 4xx, 5xx
      distribution[code] = (distribution[code] || 0) + 1;
    }
    return distribution;
  }

  // Cleanup old metrics
  cleanupOldMetrics() {
    const fiveMinutesAgo = Date.now() - 300000;

    // Clean up request metrics
    for (const [key, metrics] of this.metrics.requests) {
      const filtered = metrics.filter(m => m.timestamp > fiveMinutesAgo);
      this.metrics.requests.set(key, filtered);
    }

    // Clean up error metrics
    for (const [key, metrics] of this.metrics.errors) {
      const filtered = metrics.filter(m => m.timestamp > fiveMinutesAgo);
      this.metrics.errors.set(key, filtered);
    }

    // Clean up performance metrics
    for (const [key, metrics] of this.metrics.performance) {
      const filtered = metrics.filter(m => m.timestamp > fiveMinutesAgo);
      this.metrics.performance.set(key, filtered);
    }
  }

  // Get current metrics for API endpoints
  getCurrentMetrics() {
    const systemMetrics = this.metrics.system.get('current') || {};
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const fiveMinutesAgo = now - 300000;

    const recentRequests = this.getMetricsInTimeRange('requests', oneMinuteAgo, now);
    const recentErrors = this.getMetricsInTimeRange('errors', oneMinuteAgo, now);

    return {
      system: systemMetrics,
      requests: {
        lastMinute: recentRequests.length,
        avgResponseTime: recentRequests.length > 0
          ? recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length
          : 0,
        errorRate: recentRequests.length > 0
          ? (recentErrors.length / recentRequests.length) * 100
          : 0
      },
      uptime: process.uptime(),
      timestamp: now
    };
  }

  // Health check
  async getHealthStatus() {
    const metrics = this.getCurrentMetrics();
    const health = {
      status: 'healthy',
      checks: {
        database: 'unknown',
        redis: 'unknown',
        memory: 'unknown',
        responseTime: 'unknown'
      },
      metrics
    };

    // Database health check
    try {
      await prisma.$queryRaw`SELECT 1`;
      health.checks.database = 'healthy';
    } catch (error) {
      health.checks.database = 'unhealthy';
      health.status = 'unhealthy';
    }

    // Redis health check
    try {
      const redis = getRedisClient();
      await redis.ping();
      health.checks.redis = 'healthy';
    } catch (error) {
      health.checks.redis = 'degraded'; // Redis is optional
    }

    // Memory check
    const memUsage = metrics.system.memory;
    if (memUsage && memUsage.heapUsed / memUsage.heapTotal > 0.9) {
      health.checks.memory = 'warning';
      if (health.status === 'healthy') health.status = 'degraded';
    } else {
      health.checks.memory = 'healthy';
    }

    // Response time check
    if (metrics.requests.avgResponseTime > 2000) {
      health.checks.responseTime = 'warning';
      if (health.status === 'healthy') health.status = 'degraded';
    } else {
      health.checks.responseTime = 'healthy';
    }

    return health;
  }
}

// Singleton instance
let monitoringService;

const getMonitoringService = () => {
  if (!monitoringService) {
    monitoringService = new MonitoringService();
  }
  return monitoringService;
};

module.exports = {
  MonitoringService,
  getMonitoringService
};