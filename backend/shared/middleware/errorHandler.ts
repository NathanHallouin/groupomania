import { Request, Response, NextFunction } from 'express';
// Use require for logger
const logger = require('../utils/logger');
// Use require to avoid path resolution issues during build
const config = require('../config/config');

/**
 * Error response interface
 */
interface ErrorResponse {
  status: string;
  message: string;
  code?: string | null;
  timestamp: string;
  errors?: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
  path?: string;
  method?: string;
  stack?: string;
  error?: any;
}

/**
 * Custom error classes for better error handling
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string | null;
  public isOperational: boolean;
  public timestamp: string;

  constructor(message: string, statusCode: number, code: string | null = null, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public errors: Array<{
    field: string;
    message: string;
    value?: any;
  }>;

  constructor(message: string, errors: Array<{ field: string; message: string; value?: any }> = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR', false);
  }
}

/**
 * Handle different types of errors and convert them to AppError instances
 */
const handleSequelizeValidationError = (err: any): ValidationError => {
  const errors = err.errors?.map((error: any) => ({
    field: error.path,
    message: error.message,
    value: error.value,
  })) || [];
  
  return new ValidationError('Validation failed', errors);
};

const handleSequelizeUniqueConstraintError = (err: any): ConflictError => {
  const field = err.errors?.[0]?.path || 'field';
  const message = `${field} already exists`;
  return new ConflictError(message);
};

const handleSequelizeForeignKeyConstraintError = (err: any): ValidationError => {
  const message = 'Referenced resource does not exist';
  return new ValidationError(message);
};

const handleJWTError = (): AuthenticationError =>
  new AuthenticationError('Invalid token. Please log in again!');

const handleJWTExpiredError = (): AuthenticationError =>
  new AuthenticationError('Your token has expired! Please log in again.');

const handleSequelizeConnectionError = (): DatabaseError =>
  new DatabaseError('Database connection failed');

/**
 * Send error response for development environment
 */
const sendErrorDev = (err: AppError, req: Request, res: Response): Response => {
  (logger as any).logError(err, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId,
  });

  return res.status(err.statusCode).json({
    status: 'error',
    error: err,
    message: err.message,
    code: err.code,
    timestamp: err.timestamp,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });
};

/**
 * Send error response for production environment
 */
const sendErrorProd = (err: AppError, req: Request, res: Response): Response => {
  // Log all errors
  (logger as any).logError(err, {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId,
  });

  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const response: ErrorResponse = {
      status: 'error',
      message: err.message,
      code: err.code || null,
      timestamp: err.timestamp,
    };

    // Add validation errors if present
    if ((err as any).errors) {
      response.errors = (err as any).errors;
    }

    return res.status(err.statusCode).json(response);
  }

  // Programming or other unknown error: don't leak error details
  logger.error('UNKNOWN ERROR', err);
  
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    code: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Global error handling middleware
 */
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  // Handle specific error types
  if (error.name === 'SequelizeValidationError') error = handleSequelizeValidationError(error);
  if (error.name === 'SequelizeUniqueConstraintError') error = handleSequelizeUniqueConstraintError(error);
  if (error.name === 'SequelizeForeignKeyConstraintError') error = handleSequelizeForeignKeyConstraintError(error);
  if (error.name === 'SequelizeConnectionError') error = handleSequelizeConnectionError();
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  if (config.env === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * Async error wrapper to catch async errors
 */
export const catchAsync = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle 404 errors for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const err = new NotFoundError(`Can't find ${req.originalUrl} on this server!`);
  next(err);
};

// Backward compatibility
export const errorHandler = globalErrorHandler;
export const notFound = notFoundHandler;
export const asyncHandler = catchAsync;
