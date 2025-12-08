const { logError, logSecurityEvent } = require('../config/logger');

const errorHandler = (error, req, res, _next) => {
  // Log the error with context
  logError(error, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // Handle different types of errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details
    });
  }

  if (error.name === 'UnauthorizedError' || error.name === 'JsonWebTokenError') {
    // Log security event for unauthorized access attempts
    logSecurityEvent('unauthorized_access_attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });

    return res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }

  if (error.name === 'TokenExpiredError') {
    logSecurityEvent('expired_token_usage', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });

    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  if (error.name === 'PrismaClientKnownRequestError') {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Resource already exists'
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Invalid foreign key constraint'
      });
    }
  }

  // Rate limiting errors
  if (error.name === 'RateLimitError') {
    logSecurityEvent('rate_limit_exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });

    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded'
    });
  }

  // Network/External API errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable'
    });
  }

  // GitHub API errors
  if (error.response && error.response.status) {
    const status = error.response.status;
    if (status === 403 && error.response.headers['x-ratelimit-remaining'] === '0') {
      return res.status(429).json({
        success: false,
        message: 'GitHub API rate limit exceeded'
      });
    }

    if (status === 404) {
      return res.status(404).json({
        success: false,
        message: 'GitHub resource not found'
      });
    }
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_SERVER_ERROR';
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      code,
      message
    },
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = errorHandler;
