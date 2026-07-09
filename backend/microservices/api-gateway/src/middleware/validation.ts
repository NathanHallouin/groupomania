import { Request, Response, NextFunction } from 'express';
import { body, validationResult, ValidationError } from 'express-validator';
import winston from 'winston';

/**
 * Interface for custom validation errors
 */
interface CustomValidationError {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

/**
 * Validation middleware for the API Gateway
 */
export class ValidationMiddleware {
  private static logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()]
  });

  /**
   * Main validation middleware
   */
  public static validate = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const formattedErrors = ValidationMiddleware.formatValidationErrors(errors.array());
      
      ValidationMiddleware.logger.warn('Validation failed', {
        requestId: req.requestId,
        path: req.path,
        method: req.method,
        errors: formattedErrors,
        body: req.body,
        query: req.query,
        params: req.params
      });

      res.status(400).json({
        error: 'Validation failed',
        message: 'The request contains invalid data',
        details: formattedErrors,
        code: 'VALIDATION_ERROR'
      });
      return;
    }

    next();
  };

  /**
   * Validations for authentication
   */
  public static authValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    ValidationMiddleware.validate
  ];

  /**
   * Validations for registration
   */
  public static registrationValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

    body('firstName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters')
      .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

    body('lastName')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters')
      .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return value;
      }),

    ValidationMiddleware.validate
  ];

  /**
   * Validations for messages
   */
  public static messageValidation = [
    body('content')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Message content must be between 1 and 2000 characters')
      .custom((value) => {
        // Basic anti-spam verification
        const spamPatterns = [
          /(.)\1{10,}/, // Excessive character repetition
          /https?:\/\/[^\s]+/gi, // Multiple URLs (more than 3)
        ];

        for (const pattern of spamPatterns) {
          if (pattern.test(value)) {
            throw new Error('Message content appears to be spam');
          }
        }

        return value;
      }),

    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),

    body('attachments')
      .optional()
      .isArray({ max: 5 })
      .withMessage('Maximum 5 attachments allowed'),

    body('attachments.*')
      .optional()
      .isURL()
      .withMessage('Each attachment must be a valid URL'),

    ValidationMiddleware.validate
  ];

  /**
   * Validations for profile update
   */
  public static profileUpdateValidation = [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('First name must be between 2 and 50 characters')
      .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Last name must be between 2 and 50 characters')
      .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must not exceed 500 characters'),

    body('avatar')
      .optional()
      .isURL()
      .withMessage('Avatar must be a valid URL'),

    body('phone')
      .optional()
      .matches(/^[\+]?[(]?[\d\s\-\(\)]{10,15}$/)
      .withMessage('Please provide a valid phone number'),

    ValidationMiddleware.validate
  ];

  /**
   * Validations for search
   */
  public static searchValidation = [
    body('query')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .custom((value) => {
        // Prevent malicious special characters
        const maliciousPatterns = [
          /<script/i,
          /javascript:/i,
          /on\w+\s*=/i,
          /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/i
        ];

        for (const pattern of maliciousPatterns) {
          if (pattern.test(value)) {
            throw new Error('Search query contains invalid characters');
          }
        }

        return value;
      }),

    body('filters')
      .optional()
      .isObject()
      .withMessage('Filters must be an object'),

    body('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    body('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),

    ValidationMiddleware.validate
  ];

  /**
   * Validation for file uploads
   */
  public static fileUploadValidation = (req: Request, res: Response, next: NextFunction): void => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const maxFileSize = 10 * 1024 * 1024; // 10MB

    // Check file type via Content-Type
    const contentType = req.headers['content-type'];
    if (contentType && !allowedMimeTypes.some(type => contentType.includes(type))) {
      ValidationMiddleware.logger.warn('Invalid file type upload attempt', {
        contentType,
        path: req.path,
        ip: req.ip,
        userId: req.user?.userId
      });

      res.status(400).json({
        error: 'Invalid file type',
        message: 'Only images, PDFs, and documents are allowed',
        allowedTypes: allowedMimeTypes
      });
      return;
    }

    // Check file size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > maxFileSize) {
      ValidationMiddleware.logger.warn('File too large upload attempt', {
        contentLength,
        maxFileSize,
        path: req.path,
        userId: req.user?.userId
      });

      res.status(400).json({
        error: 'File too large',
        message: `File size must not exceed ${maxFileSize / 1024 / 1024}MB`,
        maxSize: maxFileSize
      });
      return;
    }

    next();
  };

  /**
   * URL parameter validation
   */
  public static idParamValidation = (paramName: string = 'id') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const id = req.params[paramName];
      
      if (!id) {
        res.status(400).json({
          error: 'Missing parameter',
          message: `Parameter ${paramName} is required`
        });
        return;
      }

      // Check that the ID is a valid number
      if (!/^\d+$/.test(id)) {
        ValidationMiddleware.logger.warn('Invalid ID parameter', {
          paramName,
          value: id,
          path: req.path,
          userId: req.user?.userId
        });

        res.status(400).json({
          error: 'Invalid parameter',
          message: `Parameter ${paramName} must be a valid number`,
          value: id
        });
        return;
      }

      next();
    };
  };

  /**
   * Pagination validation
   */
  public static paginationValidation = (req: Request, res: Response, next: NextFunction): void => {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    if (isNaN(page) || page < 1) {
      res.status(400).json({
        error: 'Invalid pagination',
        message: 'Page must be a positive integer'
      });
      return;
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      res.status(400).json({
        error: 'Invalid pagination',
        message: 'Limit must be between 1 and 100'
      });
      return;
    }

    // Add validated values to the request
    req.query.page = page.toString();
    req.query.limit = limit.toString();

    next();
  };

  /**
   * Input data sanitization
   */
  public static sanitize = (req: Request, res: Response, next: NextFunction): void => {
    // Sanitize the body
    if (req.body && typeof req.body === 'object') {
      req.body = ValidationMiddleware.sanitizeObject(req.body);
    }

    // Sanitize query parameters.
    // En Express 5, req.query est en lecture seule (getter) : on redéfinit la
    // propriété au lieu de la réassigner directement.
    if (req.query && typeof req.query === 'object') {
      Object.defineProperty(req, 'query', {
        value: ValidationMiddleware.sanitizeObject(req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }

    next();
  };

  /**
   * Required headers validation
   */
  public static requiredHeaders = (headers: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const missingHeaders: string[] = [];

      headers.forEach(header => {
        if (!req.headers[header.toLowerCase()]) {
          missingHeaders.push(header);
        }
      });

      if (missingHeaders.length > 0) {
        ValidationMiddleware.logger.warn('Missing required headers', {
          missingHeaders,
          path: req.path,
          providedHeaders: Object.keys(req.headers)
        });

        res.status(400).json({
          error: 'Missing required headers',
          message: 'Some required headers are missing',
          missingHeaders
        });
        return;
      }

      next();
    };
  };

  /**
   * Format validation errors
   */
  private static formatValidationErrors(errors: ValidationError[]): CustomValidationError[] {
    return errors.map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
      code: 'INVALID_VALUE'
    }));
  }

  /**
   * Sanitize an object recursively
   */
  private static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return ValidationMiddleware.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => ValidationMiddleware.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      // En Express 5, req.query a un prototype null : utiliser Object.hasOwn
      // (obj.hasOwnProperty n'existe pas sur ces objets).
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = ValidationMiddleware.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize a string
   */
  private static sanitizeString(str: string): string {
    return str
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove JavaScript protocols
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  /**
   * Custom validation for regular expressions
   */
  public static customRegexValidation = (field: string, pattern: RegExp, message: string) => {
    return body(field).matches(pattern).withMessage(message);
  };

  /**
   * Get validation statistics
   */
  public static getValidationStats(): any {
    return {
      // To implement with counters
      totalValidations: 0,
      failedValidations: 0,
      commonErrors: [],
      timestamp: new Date().toISOString()
    };
  }
}
