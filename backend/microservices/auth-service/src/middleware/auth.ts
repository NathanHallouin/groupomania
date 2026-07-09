import { Request, Response, NextFunction } from 'express';
import { TokenService } from '../services/tokenService';
import { User } from '../models';
import { AppError } from './errorHandler';
import { AuthenticatedUser, UserRole } from '../types';

/**
 * JWT authentication middleware
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tokenService = new TokenService();

    // Extract token from Authorization header
    const authHeader = req.header('Authorization');
    const token = tokenService.extractTokenFromHeader(authHeader || '');

    if (!token) {
      throw new AppError('Access denied. Token required', 401);
    }

    // Verify token
    const decoded = tokenService.verifyAccessToken(token);

    // Verify that user still exists
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      throw new AppError('Invalid token - user not found', 401);
    }

    // Verify that account is active
    if (!user.isActive) {
      throw new AppError('Account disabled', 403);
    }

    // Add user information to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role as UserRole,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }
  }
};

/**
 * Role-based authorization middleware
 */
export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };
};

/**
 * Optional authentication middleware
 * Does not fail if no token is provided
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tokenService = new TokenService();
    
    const authHeader = req.header('Authorization');
    const token = tokenService.extractTokenFromHeader(authHeader || '');
    
    if (token) {
      const decoded = tokenService.verifyAccessToken(token);
      const user = await User.findByPk(decoded.userId);
      
      if (user && user.isActive) {
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role as UserRole,
        };
      }
    }

    next();
  } catch (error) {
    // In case of error, continue without authentication
    next();
  }
};

/**
 * Middleware to verify that user can access their own data
 */
export const ownershipMiddleware = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const targetUserId = parseInt(req.params[userIdParam]);

      // Admins can access all data
      if (req.user.role === 'admin') {
        return next();
      }

      // Users can only access their own data
      if (req.user.userId !== targetUserId) {
        throw new AppError('Access denied - you can only access your own data', 403);
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
        });
      }
    }
  };
};

/**
 * Middleware to verify token validity without using it
 */
export const tokenValidationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tokenService = new TokenService();
    const { token } = req.body;

    if (!token) {
      throw new AppError('Token required', 400);
    }

    // Just verify validity, do not decode
    tokenService.verifyAccessToken(token);

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};
