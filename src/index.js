const express = require('express');
const db = require('./db');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

// Health check route for uptime monitoring
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Basic error handler for API responses
app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
