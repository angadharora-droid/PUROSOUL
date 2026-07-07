import multer from 'multer';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors;

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 422;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0]?.message || 'Validation failed';
  }

  // Invalid ObjectId etc.
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  // Duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = `Duplicate ${field}: "${err.keyValue?.[field]}" already exists`;
  }

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5 MB)' : err.message;
  }

  if (statusCode >= 500) console.error(err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(env.nodeEnv === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}
