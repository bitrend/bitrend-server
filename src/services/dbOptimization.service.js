const { prisma } = require('../config/prisma');

class DatabaseOptimizationService {
  constructor() {
    this.queryCache = new Map();
  }

  // Optimized user queries
  async findUserWithStats(userId) {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userStats: true,
        userRanking: {
          where: {
            calculatedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          },
          orderBy: { calculatedAt: 'desc' }
        },
        evaluationProjects: {
          include: {
            repository: {
              select: {
                id: true,
                name: true,
                fullName: true,
                language: true,
                stars: true
              }
            },
            analyses: {
              where: { status: 'completed' },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                score: true,
                grade: true,
                completedAt: true
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });
  }

  // Optimized analysis queries with pagination
  async findAnalysesWithMetrics(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status = null,
      includeMetrics = false,
      includeRecommendations = false
    } = options;

    const where = {
      userId,
      ...(status && { status })
    };

    const include = {
      evaluationProject: {
        include: {
          repository: {
            select: {
              id: true,
              name: true,
              fullName: true,
              language: true,
              stars: true
            }
          }
        }
      },
      ...(includeMetrics && {
        metrics: {
          orderBy: { category: 'asc' }
        }
      }),
      ...(includeRecommendations && {
        recommendations: {
          orderBy: { priority: 'desc' },
          take: 5
        }
      })
    };

    const [analyses, total] = await Promise.all([
      prisma.analysis.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.analysis.count({ where })
    ]);

    return {
      data: analyses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Optimized ranking queries
  async findRankings(category = 'overall', options = {}) {
    const {
      page = 1,
      limit = 100,
      minScore = null
    } = options;

    const where = {
      category,
      calculatedAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      },
      ...(minScore && { score: { gte: minScore } })
    };

    return await prisma.userRanking.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { rank: 'asc' },
      skip: (page - 1) * limit,
      take: limit
    });
  }

  // Optimized activity queries
  async findUserActivities(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      type = null,
      dateFrom = null,
      dateTo = null
    } = options;

    const where = {
      userId,
      ...(type && { type }),
      ...(dateFrom && { createdAt: { gte: dateFrom } }),
      ...(dateTo && { createdAt: { lte: dateTo } })
    };

    return await prisma.userActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    });
  }

  // Batch operations for better performance
  async batchUpdateUserStats(userStatsUpdates) {
    const updates = userStatsUpdates.map(({ userId, stats }) =>
      prisma.userStats.upsert({
        where: { userId },
        update: stats,
        create: { userId, ...stats }
      })
    );

    return await prisma.$transaction(updates);
  }

  async batchCreateAnalysisMetrics(analysisId, metrics) {
    const metricsData = metrics.map(metric => ({
      analysisId,
      category: metric.category,
      name: metric.name,
      value: metric.value,
      maxValue: metric.maxValue,
      weight: metric.weight || 1.0
    }));

    return await prisma.analysisMetric.createMany({
      data: metricsData,
      skipDuplicates: true
    });
  }

  async batchUpdateRankings(rankings) {
    const updates = rankings.map(({ userId, category, rank, score, percentile }) =>
      prisma.userRanking.upsert({
        where: {
          userId_category: {
            userId,
            category
          }
        },
        update: {
          rank,
          score,
          percentile,
          calculatedAt: new Date()
        },
        create: {
          userId,
          category,
          rank,
          score,
          percentile
        }
      })
    );

    return await prisma.$transaction(updates);
  }

  // Aggregation queries for analytics
  async getAnalyticsData(userId, options = {}) {
    const {
      dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      dateTo = new Date()
    } = options;

    const [
      analysisCount,
      averageScore,
      scoreDistribution,
      categoryBreakdown,
      recentActivity
    ] = await Promise.all([
      // Total analysis count
      prisma.analysis.count({
        where: {
          userId,
          status: 'completed',
          completedAt: {
            gte: dateFrom,
            lte: dateTo
          }
        }
      }),

      // Average score
      prisma.analysis.aggregate({
        where: {
          userId,
          status: 'completed',
          score: { not: null },
          completedAt: {
            gte: dateFrom,
            lte: dateTo
          }
        },
        _avg: { score: true }
      }),

      // Score distribution by grade
      prisma.analysis.groupBy({
        by: ['grade'],
        where: {
          userId,
          status: 'completed',
          grade: { not: null },
          completedAt: {
            gte: dateFrom,
            lte: dateTo
          }
        },
        _count: { grade: true }
      }),

      // Category breakdown
      prisma.analysisMetric.groupBy({
        by: ['category'],
        where: {
          analysis: {
            userId,
            status: 'completed',
            completedAt: {
              gte: dateFrom,
              lte: dateTo
            }
          }
        },
        _avg: { value: true },
        _count: { category: true }
      }),

      // Recent activity
      prisma.userActivity.findMany({
        where: {
          userId,
          createdAt: {
            gte: dateFrom,
            lte: dateTo
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    return {
      summary: {
        totalAnalyses: analysisCount,
        averageScore: averageScore._avg.score || 0,
        period: { from: dateFrom, to: dateTo }
      },
      scoreDistribution,
      categoryBreakdown,
      recentActivity
    };
  }

  // Query performance monitoring
  async executeWithTiming(queryName, queryFn) {
    const startTime = process.hrtime();

    try {
      const result = await queryFn();
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

      console.log(`Query ${queryName} took ${duration.toFixed(2)}ms`);

      // Log slow queries
      if (duration > 1000) { // Queries taking more than 1 second
        console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1000000;

      console.error(`Query ${queryName} failed after ${duration.toFixed(2)}ms:`, error.message);
      throw error;
    }
  }

  // Connection pool monitoring
  async getConnectionInfo() {
    const metrics = await prisma.$metrics.prometheus();
    return {
      connectionPool: {
        active: prisma._engine?.connectionPool?.size || 0,
        idle: prisma._engine?.connectionPool?.available || 0
      },
      metrics
    };
  }

  // Cleanup old data
  async cleanupOldData(options = {}) {
    const {
      deleteActivitiesOlderThan = 90, // days
      deleteFailedAnalysesOlderThan = 30, // days
      deleteOldRankingsOlderThan = 7 // days
    } = options;

    const now = new Date();

    const results = await Promise.all([
      // Delete old user activities
      prisma.userActivity.deleteMany({
        where: {
          createdAt: {
            lt: new Date(now.getTime() - deleteActivitiesOlderThan * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Delete old failed analyses
      prisma.analysis.deleteMany({
        where: {
          status: 'failed',
          createdAt: {
            lt: new Date(now.getTime() - deleteFailedAnalysesOlderThan * 24 * 60 * 60 * 1000)
          }
        }
      }),

      // Delete old rankings
      prisma.userRanking.deleteMany({
        where: {
          calculatedAt: {
            lt: new Date(now.getTime() - deleteOldRankingsOlderThan * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    return {
      deletedActivities: results[0].count,
      deletedFailedAnalyses: results[1].count,
      deletedOldRankings: results[2].count
    };
  }
}

module.exports = DatabaseOptimizationService;