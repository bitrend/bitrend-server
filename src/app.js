const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/errorHandler');
const { httpLoggingMiddleware, logger } = require('./config/logger');
const { getMonitoringService } = require('./services/monitoring.service');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');

// Handle BigInt serialization in JSON
BigInt.prototype.toJSON = function() {
  return this.toString();
};

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  crossOriginEmbedderPolicy: false
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.'
      }
    });
  }
});

// API rate limiting (more restrictive for API routes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limit each IP to 500 requests per windowMs for API routes
  message: 'Too many API requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);
app.use('/api/', apiLimiter);

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTP logging middleware
app.use(httpLoggingMiddleware);

// Performance monitoring middleware
const monitoringService = getMonitoringService();
app.use(monitoringService.trackRequest.bind(monitoringService));

// Health check route
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/images', require('./routes/images.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/github', require('./routes/github.routes'));
app.use('/api/evaluation', require('./routes/evaluationProject.routes'));
app.use('/api/projects', require('./routes/evaluationProject.routes'));
app.use('/api/analysis', require('./routes/analysis.routes'));
app.use('/api/monitoring', require('./routes/monitoring.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));

// Error handler (must be last)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(errorHandler);

module.exports = app;
