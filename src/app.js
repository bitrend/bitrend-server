const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('../swagger.json');

const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

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
app.use('/api/analysis', require('./routes/analysis.routes'));

// Error handler (must be last)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use(errorHandler);

module.exports = app;
