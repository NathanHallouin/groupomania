import { Request, Response, NextFunction } from 'express';
import { AppError } from './auth';

/**
 * Interface for errors with code
 */
interface ErrorWithCode extends Error {
  code?: string;
  statusCode?: number;
  status?: number;
  isOperational?: boolean;
}

/**
 * Global error handling middleware
 */
export const errorHandler = (
  error: ErrorWithCode,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = undefined;

  // Log error for debugging
  console.error('Error caught:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.userId
  });

  // Custom application errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }
  // Sequelize errors
  else if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Data validation error';
    details = error.message;
  }
  else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'This resource already exists';
    details = error.message;
  }
  else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Invalid reference to a resource';
    details = error.message;
  }
  else if (error.name === 'SequelizeConnectionError') {
    statusCode = 503;
    message = 'Database connection error';
  }
  // Multer errors (upload)
  else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large';
  }
  else if (error.code === 'LIMIT_FILE_COUNT') {
    statusCode = 400;
    message = 'Too many files provided';
  }
  else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
  }
  else if (error.code === 'LIMIT_FIELD_KEY') {
    statusCode = 400;
    message = 'Field name too long';
  }
  else if (error.code === 'LIMIT_FIELD_VALUE') {
    statusCode = 400;
    message = 'Field value too long';
  }
  else if (error.code === 'LIMIT_FIELD_COUNT') {
    statusCode = 400;
    message = 'Too many fields provided';
  }
  // Express validation errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid request data';
    details = error.message;
  }
  // JSON errors
  else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
    statusCode = 400;
    message = 'Invalid JSON format';
  }
  // Cast/conversion errors
  else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
  }
  // File system errors
  else if (error.code === 'ENOENT') {
    statusCode = 404;
    message = 'File not found';
  }
  else if (error.code === 'EACCES') {
    statusCode = 403;
    message = 'File access denied';
  }
  else if (error.code === 'ENOSPC') {
    statusCode = 507;
    message = 'Insufficient storage space';
  }
  // JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  }
  // Redis errors
  else if (error.name === 'ReplyError') {
    statusCode = 503;
    message = 'Redis cache error';
  }
  // Other known errors
  else if (error.statusCode || error.status) {
    statusCode = error.statusCode || error.status || 500;
    message = error.message || message;
  }

  // Error response
  const errorResponse: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
  };

  // Add details in development or for certain errors
  if (process.env.NODE_ENV === 'development' || statusCode < 500) {
    if (details) {
      errorResponse.details = details;
    }
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
    }
  }

  // Add a correlation ID for tracking
  if (req.headers['x-correlation-id']) {
    errorResponse.correlationId = req.headers['x-correlation-id'];
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Middleware to handle 404 (routes not found)
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Wrapper for async controller functions
 * Avoids having to do try/catch in each async function
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware to log requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.userId,
      timestamp: new Date().toISOString(),
    };
    
    // Log differently based on the level
    if (res.statusCode >= 500) {
      console.error('REQUEST ERROR:', logData);
    } else if (res.statusCode >= 400) {
      console.warn('REQUEST WARNING:', logData);
    } else if (process.env.NODE_ENV === 'development') {
      console.log('REQUEST:', logData);
    }
  });
  
  next();
};

/**
 * Service health validation middleware
 */
export const healthCheck = (req: Request, res: Response): void => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  res.status(200).json(healthData);
};
