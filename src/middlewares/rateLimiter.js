// Simple in-memory rate limiter
// For production, consider using Redis or a proper rate limiting library

const rateLimitStore = new Map();

const createRateLimiter = (windowMs, maxRequests) => {
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    if (rateLimitStore.has(clientId)) {
      const requests = rateLimitStore.get(clientId);
      const validRequests = requests.filter(
        (timestamp) => timestamp > windowStart
      );
      rateLimitStore.set(clientId, validRequests);
    }

    // Get current requests for this client
    const currentRequests = rateLimitStore.get(clientId) || [];

    // Check if limit exceeded
    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please try again later.",
      });
    }

    // Add current request
    currentRequests.push(now);
    rateLimitStore.set(clientId, currentRequests);

    next();
  };
};

// Rate limiters for different endpoints
const searchRateLimit = createRateLimiter(60 * 1000, 60); // 60 requests per minute
const userLookupRateLimit = createRateLimiter(60 * 1000, 100); // 100 requests per minute

module.exports = {
  searchRateLimit,
  userLookupRateLimit,
};
