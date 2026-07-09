import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import winston from 'winston';

/**
 * Interface for authenticated users
 */
interface AuthenticatedUser {
  userId: number;
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

/**
 * Extension of Request to include the user
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

/**
 * Authentication middleware for the API Gateway
 */
export class AuthMiddleware {
  private static logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()]
  });

  /**
   * Main authentication middleware
   */
  public static authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = AuthMiddleware.extractToken(req);
      
      if (!token) {
        AuthMiddleware.logger.warn('Authentication failed: No token provided', {
          path: req.path,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        res.status(401).json({
          error: 'Access denied',
          message: 'No authentication token provided',
          code: 'NO_TOKEN'
        });
        return;
      }

      const decoded = await AuthMiddleware.verifyToken(token);
      req.user = decoded;

      AuthMiddleware.logger.debug('User authenticated', {
        userId: decoded.userId,
        role: decoded.role,
        path: req.path
      });

      next();
    } catch (error) {
      AuthMiddleware.handleAuthError(error as Error, req, res);
    }
  };

  /**
   * Middleware to verify admin permissions
   */
  public static requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
      return;
    }

    if (req.user.role !== 'admin') {
      AuthMiddleware.logger.warn('Admin access denied', {
        userId: req.user.userId,
        role: req.user.role,
        path: req.path
      });

      res.status(403).json({
        error: 'Access forbidden',
        message: 'Admin privileges required',
        code: 'INSUFFICIENT_PRIVILEGES'
      });
      return;
    }

    next();
  };

  /**
   * Middleware to verify resource ownership
   */
  public static requireOwnership = (resourceIdParam: string = 'id') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
        return;
      }

      const resourceId = req.params[resourceIdParam];
      const userId = req.user.userId.toString();

      // Admins can access all resources
      if (req.user.role === 'admin') {
        next();
        return;
      }

      // Check if the user is the owner of the resource
      if (resourceId !== userId) {
        AuthMiddleware.logger.warn('Resource access denied', {
          userId: req.user.userId,
          resourceId,
          path: req.path
        });

        res.status(403).json({
          error: 'Access forbidden',
          message: 'You can only access your own resources',
          code: 'RESOURCE_ACCESS_DENIED'
        });
        return;
      }

      next();
    };
  };

  /**
   * Optional authentication middleware (does not block if no token)
   */
  public static optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = AuthMiddleware.extractToken(req);
      
      if (token) {
        const decoded = await AuthMiddleware.verifyToken(token);
        req.user = decoded;
      }

      next();
    } catch (error) {
      // In optional mode, we continue even if authentication fails
      AuthMiddleware.logger.debug('Optional authentication failed', {
        error: (error as Error).message,
        path: req.path
      });
      
      next();
    }
  };

  /**
   * Middleware for public routes with logging
   */
  public static publicRoute = (req: Request, res: Response, next: NextFunction): void => {
    AuthMiddleware.logger.debug('Public route accessed', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    next();
  };

  /**
   * Extract JWT token from the request
   */
  private static extractToken(req: Request): string | null {
    // Check the Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Check cookies
    const cookieToken = req.cookies?.token;
    if (cookieToken) {
      return cookieToken;
    }

    // Check query parameters (not recommended for production)
    const queryToken = req.query.token as string;
    if (queryToken && process.env.NODE_ENV !== 'production') {
      return queryToken;
    }

    return null;
  }

  /**
   * Verify and decode the JWT token
   */
  private static async verifyToken(token: string): Promise<AuthenticatedUser> {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      throw new Error('JWT secret not configured');
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Verify token structure
      if (!decoded.userId || !decoded.email) {
        throw new Error('Invalid token structure');
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role || 'user',
        iat: decoded.iat,
        exp: decoded.exp
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.NotBeforeError) {
        throw new Error('Token not active');
      } else {
        throw error;
      }
    }
  }

  /**
   * Handle authentication errors
   */
  private static handleAuthError(error: Error, req: Request, res: Response): void {
    AuthMiddleware.logger.warn('Authentication error', {
      error: error.message,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    let statusCode = 401;
    let errorCode = 'AUTH_FAILED';

    if (error.message === 'Token expired') {
      statusCode = 401;
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.message === 'Invalid token') {
      statusCode = 401;
      errorCode = 'INVALID_TOKEN';
    } else if (error.message === 'JWT secret not configured') {
      statusCode = 500;
      errorCode = 'SERVER_ERROR';
    }

    res.status(statusCode).json({
      error: 'Authentication failed',
      message: error.message,
      code: errorCode
    });
  }

  /**
   * Generate authentication metrics
   */
  public static getAuthMetrics(): any {
    // This method could be extended to collect statistics
    // about authentication attempts, failures, etc.
    return {
      // Placeholder for future auth metrics
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate permissions for a specific action
   */
  public static validatePermission = (permission: string) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required'
        });
        return;
      }

      // Permission validation logic
      // This could be extended with a more complex RBAC system
      const userPermissions = AuthMiddleware.getUserPermissions(req.user);
      
      if (!userPermissions.includes(permission)) {
        AuthMiddleware.logger.warn('Permission denied', {
          userId: req.user.userId,
          requiredPermission: permission,
          userPermissions,
          path: req.path
        });

        res.status(403).json({
          error: 'Permission denied',
          message: `Required permission: ${permission}`,
          code: 'PERMISSION_DENIED'
        });
        return;
      }

      next();
    };
  };

  /**
   * Get user permissions
   */
  private static getUserPermissions(user: AuthenticatedUser): string[] {
    const basePermissions = ['read_own_profile', 'update_own_profile'];
    
    if (user.role === 'admin') {
      return [
        ...basePermissions,
        'read_all_users',
        'update_all_users',
        'delete_users',
        'manage_system',
        'view_metrics'
      ];
    }

    return [
      ...basePermissions,
      'create_messages',
      'update_own_messages',
      'delete_own_messages'
    ];
  }
}
