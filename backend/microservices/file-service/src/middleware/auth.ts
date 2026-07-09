import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { AuthenticatedUser } from '../types';

/**
 * Custom error class for the application
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
 * JWT authentication middleware
 * Validates tokens issued by the Auth Service
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. Token required',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token with the same secret as Auth Service
    const decoded = jwt.verify(token, config.jwt.secret) as AuthenticatedUser;

    // Add user information to the request
    req.user = decoded;

    next();
  } catch (error: any) {
    console.error('Authentication error:', error);

    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token expired',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Optional authentication middleware
 * Does not fail if no token, but decodes if present
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret) as AuthenticatedUser;
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Ignore authentication errors for this middleware
    next();
  }
};

/**
 * Role verification middleware
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Admin verification middleware
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Moderator or admin verification middleware
 */
export const requireModerator = requireRole(['admin', 'moderator']);
