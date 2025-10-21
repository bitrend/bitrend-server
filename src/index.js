const express = require('express');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

// Health check route for uptime monitoring
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
