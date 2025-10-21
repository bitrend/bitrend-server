const express = require('express');

const PORT = process.env.PORT || 3000;
const app = express();

// Parse incoming JSON payloads
app.use(express.json());

// Health check route for uptime monitoring
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Example API route
app.get('/api/trends', (_req, res) => {
  res.json([
    { id: 1, name: 'Express', popularity: 95 },
    { id: 2, name: 'TypeScript', popularity: 92 }
  ]);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
