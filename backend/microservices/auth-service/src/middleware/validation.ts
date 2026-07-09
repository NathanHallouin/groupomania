import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from './errorHandler';

/**
 * Data validation middleware
 * Uses express-validator to validate input data
 */
export const validationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    const message = errorMessages.join(', ');
    
    throw new AppError(message, 400);
  }
  
  next();
};

/**
 * Custom validation middleware for business rules
 */
export const customValidation = {
  /**
   * Validate that email belongs to company domain
   */
  validateCompanyEmail: (req: Request, res: Response, next: NextFunction): void => {
    const { email } = req.body;
    const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || [];

    if (allowedDomains.length > 0) {
      const emailDomain = email.split('@')[1];
      if (!allowedDomains.includes(emailDomain)) {
        throw new AppError('Email must belong to company domain', 400);
      }
    }

    next();
  },

  /**
   * Validate password strength
   */
  validatePasswordStrength: (req: Request, res: Response, next: NextFunction): void => {
    const { password } = req.body;

    // Additional security checks
    const commonPasswords = [
      'password', '123456', 'admin', 'qwerty', 'letmein',
      'welcome', 'monkey', '1234567890', 'password123'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      throw new AppError('Password is too common, please choose another one', 400);
    }

    // Verify that password does not contain personal information
    const { firstName, lastName, email } = req.body;
    const personalInfo = [firstName, lastName, email?.split('@')[0]].filter(Boolean);

    for (const info of personalInfo) {
      if (password.toLowerCase().includes(info.toLowerCase())) {
        throw new AppError('Password must not contain personal information', 400);
      }
    }

    next();
  },

  /**
   * Validate name format (first name/last name)
   */
  validateNames: (req: Request, res: Response, next: NextFunction): void => {
    const { firstName, lastName } = req.body;

    // Verify that names do not contain numbers
    if (/\d/.test(firstName) || /\d/.test(lastName)) {
      throw new AppError('Names must not contain numbers', 400);
    }

    // Verify that names are not identical
    if (firstName.toLowerCase() === lastName.toLowerCase()) {
      throw new AppError('First name and last name must be different', 400);
    }

    next();
  }
};

/**
 * Middleware to sanitize input data
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize strings
  const sanitizeString = (str: string): string => {
    return str.trim().replace(/\s+/g, ' '); // Replace multiple spaces with a single one
  };

  // Apply sanitization to string fields
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    });
  }

  next();
};
