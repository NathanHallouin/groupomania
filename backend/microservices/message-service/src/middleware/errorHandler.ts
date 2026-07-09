import { Request, Response, NextFunction } from 'express';

/**
 * Custom error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handler
 */
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = undefined;

  // Custom application error
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }

  // Sequelize errors
  else if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation errors';
    details = error.errors.map((err: any) => ({
      field: err.path,
      message: err.message,
      value: err.value,
    }));
  }

  else if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Unique constraint violation';
    details = error.errors?.map((err: any) => ({
      field: err.path,
      message: `${err.path} must be unique`,
      value: err.value,
    }));
  }

  else if (error.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Invalid reference';
  }

  else if (error.name === 'SequelizeDatabaseError') {
    statusCode = 500;
    message = 'Database error';
  }

  // JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // express-validator validation errors
  else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON';
  }

  // Multer errors (upload)
  else if (error.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large';
  }

  else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
  }

  // JSON syntax error
  else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = 'Malformed JSON';
  }

  // Error logging
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    statusCode,
    url: req.url,
    method: req.method,
    user: req.user?.userId,
    timestamp: new Date().toISOString(),
  });

  // Error response
  const errorResponse: any = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    errorResponse.details = details;
  }

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = error.stack;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Handler for routes not found (404)
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Wrapper for async functions to capture errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Generic body validation middleware
 */
export const validateBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        message: 'Validation errors',
        details,
      });
      return;
    }

    req.body = value;
    next();
  };
};

/**
 * Query parameter validation middleware
 */
export const validateQuery = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        message: 'Query parameter validation errors',
        details,
      });
      return;
    }

    req.query = value;
    next();
  };
};

/**
 * URL parameter validation middleware
 */
export const validateParams = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
    });

    if (error) {
      const details = error.details.map((detail: any) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        message: 'URL parameter validation errors',
        details,
      });
      return;
    }

    req.params = value;
    next();
  };
};

/**
 * Specialized error classes
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : 'info';
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};
