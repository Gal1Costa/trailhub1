/* eslint-disable */
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
  }
}

class UnauthorizedError extends AppError { constructor(message = 'Unauthorized') { super(message, 401); } }
class ForbiddenError extends AppError { constructor(message = 'Forbidden') { super(message, 403); } }
class NotFoundError extends AppError { constructor(message = 'Not Found') { super(message, 404); } }

/**
 * Centralized error handler middleware.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';
  
  console.error('[errorHandler] Error:', {
    status,
    message: err.message,
    stack: err.stack,
    code: err.code,
    meta: err.meta,
    path: req.path,
    method: req.method,
  });
  
  const response = {
    error: err.message || 'Internal Server Error',
  };
  
  // Include stack trace in development
  if (isDev && err.stack) {
    response.stack = err.stack;
  }
  
  // Include Prisma error details if available
  if (err.code && err.meta) {
    response.code = err.code;
    if (isDev) {
      response.meta = err.meta;
    }
  }
  
  res.status(status).json(response);
}

module.exports = { AppError, UnauthorizedError, ForbiddenError, NotFoundError, errorHandler };
