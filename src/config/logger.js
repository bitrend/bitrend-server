const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }

    return log;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} ${level}: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return log;
  })
);

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Transport configurations
const transports = [];

// Console transport (always enabled in development)
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      level: 'info'
    })
  );
}

// File transports
transports.push(
  // Combined log file with rotation
  new DailyRotateFile({
    filename: path.join(logsDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: customFormat,
    level: 'info'
  }),

  // Error log file
  new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: customFormat,
    level: 'error'
  }),

  // Access log file for HTTP requests
  new DailyRotateFile({
    filename: path.join(logsDir, 'access-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '7d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
);

// Create the main logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
  // Handle uncaught exceptions and unhandled promise rejections
  handleExceptions: true,
  handleRejections: true
});

// Create specialized loggers for different purposes
const createSpecializedLogger = (service, options = {}) => {
  return logger.child({
    service,
    ...options
  });
};

// HTTP Request logger
const httpLogger = createSpecializedLogger('http');

// Database logger
const dbLogger = createSpecializedLogger('database');

// Auth logger
const authLogger = createSpecializedLogger('auth');

// Analysis logger
const analysisLogger = createSpecializedLogger('analysis');

// Cache logger
const cacheLogger = createSpecializedLogger('cache');

// GitHub API logger
const githubLogger = createSpecializedLogger('github');

// Performance logger
const performanceLogger = createSpecializedLogger('performance');

// Error types for better categorization
const logError = (error, context = {}) => {
  const errorInfo = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context
  };

  // Categorize errors
  if (error.name === 'PrismaClientKnownRequestError') {
    dbLogger.error('Database error', errorInfo);
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    authLogger.error('Authentication error', errorInfo);
  } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    logger.error('Network error', errorInfo);
  } else {
    logger.error('Application error', errorInfo);
  }
};

// Performance logging helpers
const logPerformance = (operation, duration, metadata = {}) => {
  performanceLogger.info('Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata
  });

  // Log slow operations
  if (duration > 1000) {
    performanceLogger.warn('Slow operation detected', {
      operation,
      duration: `${duration}ms`,
      ...metadata
    });
  }
};

// HTTP request logging middleware
const httpLoggingMiddleware = (req, res, next) => {
  const start = Date.now();

  // Log request
  httpLogger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - start;

    httpLogger.info('HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id
    });

    // Log slow requests
    if (duration > 2000) {
      performanceLogger.warn('Slow HTTP request', {
        method: req.method,
        url: req.url,
        duration: `${duration}ms`,
        userId: req.user?.id
      });
    }

    originalEnd.apply(this, args);
  };

  next();
};

// Database operation logging wrapper
const logDatabaseOperation = async (operation, queryFn) => {
  const start = Date.now();

  try {
    dbLogger.debug(`Starting database operation: ${operation}`);
    const result = await queryFn();
    const duration = Date.now() - start;

    dbLogger.info('Database operation completed', {
      operation,
      duration: `${duration}ms`
    });

    if (duration > 1000) {
      dbLogger.warn('Slow database operation', {
        operation,
        duration: `${duration}ms`
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;

    dbLogger.error('Database operation failed', {
      operation,
      duration: `${duration}ms`,
      error: error.message
    });

    throw error;
  }
};

// Security event logging
const logSecurityEvent = (event, details = {}) => {
  logger.warn('Security event', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Business logic logging
const logBusinessEvent = (event, details = {}) => {
  logger.info('Business event', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Create logs directory on startup
const fs = require('fs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = {
  logger,
  httpLogger,
  dbLogger,
  authLogger,
  analysisLogger,
  cacheLogger,
  githubLogger,
  performanceLogger,
  logError,
  logPerformance,
  httpLoggingMiddleware,
  logDatabaseOperation,
  logSecurityEvent,
  logBusinessEvent,
  createSpecializedLogger
};