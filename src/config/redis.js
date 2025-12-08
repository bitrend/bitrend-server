const Redis = require('ioredis');

let redis;

const createRedisConnection = () => {
  if (redis) {
    return redis;
  }

  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('ready', () => {
      console.log('Redis ready for use');
    });

    redis.on('close', () => {
      console.log('Redis connection closed');
    });

    redis.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });

  } catch (error) {
    console.error('Failed to create Redis connection:', error);
  }

  return redis;
};

const getRedisClient = () => {
  if (!redis) {
    return createRedisConnection();
  }
  return redis;
};

const closeRedisConnection = async () => {
  if (redis) {
    await redis.quit();
    redis = null;
  }
};

module.exports = {
  getRedisClient,
  createRedisConnection,
  closeRedisConnection
};