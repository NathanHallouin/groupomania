import { Request, Response, NextFunction } from 'express';
import { body, query, validationResult, ValidationChain } from 'express-validator';
import { UserRole, UserStatus } from '../types';

/**
 * Generic validation middleware
 */
export const validateRequest = (
  validations: ValidationChain[],
  source: 'body' | 'query' = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array().map((error: any) => ({
          field: error.path || error.param,
          message: error.msg,
          value: error.value || null,
        })),
      });
      return;
    }

    next();
  };
};

/**
 * Validation schema for profile update
 */
export const updateProfileSchema = [
  body('firstName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage('First name can only contain letters, spaces, hyphens and apostrophes'),

  body('lastName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s-']+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens and apostrophes'),

  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),

  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),

  body('location')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),

  body('birthDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid birth date')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      if (age < 16 || age > 100) {
        throw new Error('Age must be between 16 and 100 years');
      }
      return true;
    }),

  body('department')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),

  body('position')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Position cannot exceed 100 characters'),

  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employee'])
    .withMessage('Invalid role'),

  body('status')
    .optional()
    .isIn(['active', 'inactive', 'pending'])
    .withMessage('Invalid status'),

  body('manager')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid manager ID'),

  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),

  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Invalid theme'),

  body('preferences.language')
    .optional()
    .isIn(['fr', 'en', 'es'])
    .withMessage('Invalid language'),

  body('preferences.notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification preference must be a boolean'),

  body('preferences.notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification preference must be a boolean'),

  body('preferences.privacy.showProfile')
    .optional()
    .isBoolean()
    .withMessage('Profile visibility preference must be a boolean'),

  body('preferences.privacy.showEmail')
    .optional()
    .isBoolean()
    .withMessage('Email visibility preference must be a boolean'),
];

/**
 * Validation schema for user queries
 */
export const getUsersQuerySchema = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page number must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search must be between 2 and 100 characters'),

  query('role')
    .optional()
    .isIn(['admin', 'manager', 'employee'])
    .withMessage('Invalid role'),

  query('status')
    .optional()
    .isIn(['active', 'inactive', 'pending'])
    .withMessage('Invalid status'),

  query('department')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),

  query('sort')
    .optional()
    .isIn(['createdAt', 'firstName', 'lastName', 'email', 'department', 'lastLogin'])
    .withMessage('Invalid sort field'),

  query('order')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('Invalid sort order'),
];

/**
 * Validation schema for user search
 */
export const searchUsersSchema = [
  query('q')
    .notEmpty()
    .withMessage('Search term is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
];
