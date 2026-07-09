import * as Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler';

/**
 * Validation result interface
 */
interface ValidationResult {
  error?: Joi.ValidationError | undefined;
  value: any;
}

/**
 * Validation schemas for different routes
 */
const schemas = {
  // User registration schema
  userRegistration: Joi.object({
    firstName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .required()
      .messages({
        'string.base': 'First name must be a string',
        'string.empty': 'First name is required',
        'string.min': 'First name must be at least 2 characters',
        'string.max': 'First name cannot exceed 50 characters',
        'string.pattern.base': 'First name can only contain letters, spaces, hyphens and apostrophes',
        'any.required': 'First name is required'
      }),

    lastName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .required()
      .messages({
        'string.base': 'Last name must be a string',
        'string.empty': 'Last name is required',
        'string.min': 'Last name must be at least 2 characters',
        'string.max': 'Last name cannot exceed 50 characters',
        'string.pattern.base': 'Last name can only contain letters, spaces, hyphens and apostrophes',
        'any.required': 'Last name is required'
      }),

    email: Joi.string()
      .trim()
      .lowercase()
      .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'fr', 'edu', 'gov'] } })
      .required()
      .messages({
        'string.base': 'Email must be a string',
        'string.empty': 'Email is required',
        'string.email': 'Email must be valid',
        'any.required': 'Email is required'
      }),

    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.base': 'Password must be a string',
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 8 characters',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must contain at least: 1 lowercase, 1 uppercase, 1 digit and 1 special character',
        'any.required': 'Password is required'
      }),

    confirmPassword: Joi.any()
      .equal(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Password confirmation must match password',
        'any.required': 'Password confirmation is required'
      })
  }),

  // User login schema
  userLogin: Joi.object({
    email: Joi.string()
      .trim()
      .lowercase()
      .email()
      .required()
      .messages({
        'string.base': 'Email must be a string',
        'string.empty': 'Email is required',
        'string.email': 'Email must be valid',
        'any.required': 'Email is required'
      }),

    password: Joi.string()
      .required()
      .messages({
        'string.base': 'Password must be a string',
        'string.empty': 'Password is required',
        'any.required': 'Password is required'
      })
  }),

  // User profile update schema
  userProfileUpdate: Joi.object({
    firstName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .optional()
      .messages({
        'string.base': 'First name must be a string',
        'string.min': 'First name must be at least 2 characters',
        'string.max': 'First name cannot exceed 50 characters',
        'string.pattern.base': 'First name can only contain letters, spaces, hyphens and apostrophes'
      }),

    lastName: Joi.string()
      .trim()
      .min(2)
      .max(50)
      .pattern(/^[a-zA-ZÀ-ÿ\s-']+$/)
      .optional()
      .messages({
        'string.base': 'Last name must be a string',
        'string.min': 'Last name must be at least 2 characters',
        'string.max': 'Last name cannot exceed 50 characters',
        'string.pattern.base': 'Last name can only contain letters, spaces, hyphens and apostrophes'
      }),

    bio: Joi.string()
      .trim()
      .max(500)
      .optional()
      .allow('')
      .messages({
        'string.base': 'Bio must be a string',
        'string.max': 'Bio cannot exceed 500 characters'
      })
  }),

  // Message creation schema
  messageCreation: Joi.object({
    title: Joi.string()
      .trim()
      .min(1)
      .max(200)
      .required()
      .messages({
        'string.base': 'Title must be a string',
        'string.empty': 'Title is required',
        'string.min': 'Title must be at least 1 character',
        'string.max': 'Title cannot exceed 200 characters',
        'any.required': 'Title is required'
      }),

    content: Joi.string()
      .trim()
      .min(1)
      .max(5000)
      .required()
      .messages({
        'string.base': 'Content must be a string',
        'string.empty': 'Content is required',
        'string.min': 'Content must be at least 1 character',
        'string.max': 'Content cannot exceed 5000 characters',
        'any.required': 'Content is required'
      })
  }),

  // Message update schema
  messageUpdate: Joi.object({
    title: Joi.string()
      .trim()
      .min(1)
      .max(200)
      .optional()
      .messages({
        'string.base': 'Title must be a string',
        'string.min': 'Title must be at least 1 character',
        'string.max': 'Title cannot exceed 200 characters'
      }),

    content: Joi.string()
      .trim()
      .min(1)
      .max(5000)
      .optional()
      .messages({
        'string.base': 'Content must be a string',
        'string.min': 'Content must be at least 1 character',
        'string.max': 'Content cannot exceed 5000 characters'
      })
  }),

  // ID parameter validation
  idParam: Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'ID must be a number',
        'number.integer': 'ID must be an integer',
        'number.positive': 'ID must be positive',
        'any.required': 'ID is required'
      })
  })
};

/**
 * Create validation middleware for a specific schema
 * @param {Joi.ObjectSchema} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'params', 'query')
 * @returns {Function} Express middleware function
 */
/**
 * Create validation middleware for a given schema
 */
const createValidationMiddleware = (schema: Joi.ObjectSchema, source: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = (req as any)[source];
    
    const { error, value }: ValidationResult = schema.validate(dataToValidate, {
      abortEarly: false, // Collect all errors
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert data types
    });

    if (error) {
      const errors = error.details.map((detail: Joi.ValidationErrorItem) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      throw new ValidationError('Validation error', errors);
    }

    // Replace the original data with the validated and sanitized data
    (req as any)[source] = value;
    next();
  };
};

/**
 * Validation middleware factory
 */
export const validate = {
  userRegistration: createValidationMiddleware(schemas.userRegistration),
  userLogin: createValidationMiddleware(schemas.userLogin),
  userProfileUpdate: createValidationMiddleware(schemas.userProfileUpdate),
  messageCreation: createValidationMiddleware(schemas.messageCreation),
  messageUpdate: createValidationMiddleware(schemas.messageUpdate),
  idParam: createValidationMiddleware(schemas.idParam, 'params'),
};

// Backward compatibility
export const validateSignup = validate.userRegistration;
export const validateLogin = validate.userLogin;
export const validateUpdateProfile = validate.userProfileUpdate;
export const validateCreateMessage = validate.messageCreation;

/**
 * Generic validation middleware
 */
export const validateSchema = (schema: Joi.ObjectSchema, source: 'body' | 'params' | 'query' = 'body') => {
  return createValidationMiddleware(schema, source);
};

export { schemas };
