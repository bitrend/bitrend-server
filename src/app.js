const express = require('express');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

// Health check route
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/images', require('./routes/images.routes'));
// app.use('/api/users', require('./routes/user.routes'));

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
