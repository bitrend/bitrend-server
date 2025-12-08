require('dotenv').config();
const app = require('./app');
const { logger } = require('./config/logger');
const { createRedisConnection } = require('./config/redis');

const PORT = process.env.PORT || 3000;

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close Redis connection
    const { closeRedisConnection } = require('./config/redis');
    await closeRedisConnection();
    logger.info('Redis connection closed');

    // Close database connections (Prisma handles this automatically)
    const { prisma } = require('./config/prisma');
    await prisma.$disconnect();
    logger.info('Database connection closed');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Initialize connections
const startServer = async () => {
  try {
    // Initialize Redis connection (optional - will work without Redis)
    try {
      await createRedisConnection();
      logger.info('Redis connection established');
    } catch (error) {
      logger.warn('Redis connection failed, continuing without caching:', error.message);
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server listening on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info('Server started successfully');
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error:', error);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
