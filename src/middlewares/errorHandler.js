const errorHandler = (error, _req, res, _next) => {
  console.error('[Error]', error);

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
