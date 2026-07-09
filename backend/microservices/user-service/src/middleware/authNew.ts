import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { UserRole } from '../types';

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

    // Maintain stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Interface for JWT payload
 */
interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Extension of Request interface to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * JWT authentication middleware
 * Validates tokens issued by the Auth Service
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. Token required',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify token with same secret as Auth Service
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Add user information to request
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
};

/**
 * Role authorization middleware
 */
export const requireRole = (roles: UserRole | UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
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
 * Middleware to check if user can access the resource
 */
export const requireOwnershipOrRole = (roles: UserRole | UserRole[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const resourceUserId = parseInt(req.params.userId);

    // Check if user is resource owner or has required role
    if (req.user.userId === resourceUserId || allowedRoles.includes(req.user.role)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message: 'Access denied',
    });
  };
};
