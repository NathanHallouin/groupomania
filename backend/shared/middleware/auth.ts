/// <reference path="../types/express.d.ts" />
import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/authService';
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Verifies JWT token from cookies and adds user info to request
 */
export const auth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      res.status(401).json({
        error: 'Missing authentication token',
        code: 'MISSING_TOKEN'
      });
      return;
    }

    // Validate token and get user info
    const userInfo = await AuthService.validateToken(token);

    // Add user info to request object
    req.user = userInfo;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      error: 'Invalid authentication token',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Admin authorization middleware
 * Checks if authenticated user has admin privileges
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'AUTHENTICATION_REQUIRED'
    });
    return;
  }

  if (!req.user.admin) {
    res.status(403).json({
      error: 'Admin privileges required',
      code: 'ADMIN_REQUIRED'
    });
    return;
  }

  next();
};

/**
 * Resource ownership middleware
 * Checks if user owns the resource or is admin
 */
export const requireOwnershipOrAdmin = (resourceIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
      return;
    }

    const resourceUserId = parseInt(req.params[resourceIdParam], 10);
    const currentUserId = req.user.userId;
    const isAdmin = req.user.admin;

    if (resourceUserId !== currentUserId && !isAdmin) {
      res.status(403).json({
        error: 'Unauthorized access to this resource',
        code: 'ACCESS_DENIED'
      });
      return;
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Adds user info to request if token is present and valid, but doesn't fail if not
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies.token;
    
    if (token) {
      const userInfo = await AuthService.validateToken(token);
      req.user = userInfo;
    }
    
    next();
  } catch (error) {
    // Continue without user info if token is invalid
    logger.warn('Optional auth failed:', (error as Error).message);
    next();
  }
};
