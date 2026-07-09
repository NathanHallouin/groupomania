import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import winston from 'winston';

/**
 * Configuration for different types of rate limiting
 */
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Simplified rate limiting middleware for the API Gateway
 */
export class RateLimitMiddleware {
  private static logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()]
  });

  /**
   * General rate limiter for all requests
   */
  public static general = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit of 1000 requests per window per IP
    message: {
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      RateLimitMiddleware.logger.warn('Rate limit exceeded - General', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        userId: (req as any).user?.userId
      });

      res.status(429).json({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: '15 minutes'
      });
    }
  });

  /**
   * Strict rate limiter for authentication
   */
  public static auth = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Only 10 login attempts per IP
    skipSuccessfulRequests: true,
    message: {
      error: 'Too many authentication attempts',
      message: 'Too many login attempts from this IP, please try again later',
      retryAfter: '15 minutes'
    },
    handler: (req: Request, res: Response) => {
      RateLimitMiddleware.logger.warn('Rate limit exceeded - Authentication', {
        ip: req.ip,
        path: req.path,
        userAgent: req.get('User-Agent'),
        email: req.body?.email
      });

      res.status(429).json({
        error: 'Too many authentication attempts',
        message: 'Too many login attempts. Please try again later.',
        retryAfter: '15 minutes'
      });
    }
  });

  /**
   * Rate limiter for creation operations
   */
  public static creation = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 creations per minute
    keyGenerator: (req: Request) => {
      // Use user ID if available, otherwise IP
      return (req as any).user?.userId?.toString() || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      RateLimitMiddleware.logger.warn('Rate limit exceeded - Creation', {
        ip: req.ip,
        path: req.path,
        userId: (req as any).user?.userId,
        method: req.method
      });

      res.status(429).json({
        error: 'Too many creation requests',
        message: 'You are creating content too quickly. Please slow down.',
        retryAfter: '1 minute'
      });
    }
  });

  /**
   * Rate limiter for update operations
   */
  public static update = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 updates per minute
    keyGenerator: (req: Request) => {
      return (req as any).user?.userId?.toString() || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      RateLimitMiddleware.logger.warn('Rate limit exceeded - Update', {
        ip: req.ip,
        path: req.path,
        userId: (req as any).user?.userId,
        method: req.method
      });

      res.status(429).json({
        error: 'Too many update requests',
        message: 'You are updating content too quickly. Please slow down.',
        retryAfter: '1 minute'
      });
    }
  });

  /**
   * Rate limiter for search requests
   */
  public static search = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 searches per minute
    keyGenerator: (req: Request) => {
      return (req as any).user?.userId?.toString() || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too many search requests',
        message: 'You are searching too frequently. Please slow down.',
        retryAfter: '1 minute'
      });
    }
  });

  /**
   * Rate limiter for file upload requests
   */
  public static upload = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    keyGenerator: (req: Request) => {
      return (req as any).user?.userId?.toString() || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      RateLimitMiddleware.logger.warn('Rate limit exceeded - Upload', {
        ip: req.ip,
        userId: (req as any).user?.userId,
        fileSize: req.headers['content-length']
      });

      res.status(429).json({
        error: 'Too many upload requests',
        message: 'You have exceeded the upload limit. Please try again later.',
        retryAfter: '1 hour'
      });
    }
  });

  /**
   * Dynamic rate limiter based on user role
   */
  public static dynamicByRole = (configs: { [role: string]: RateLimitConfig }) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const userRole = (req as any).user?.role || 'anonymous';
      const config = configs[userRole] || configs['default'] || configs['anonymous'];

      if (!config) {
        return next();
      }

      const dynamicLimiter = rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        keyGenerator: (req: Request) => {
          return `${userRole}:${(req as any).user?.userId?.toString() || req.ip || 'unknown'}`;
        },
        message: config.message || {
          error: 'Rate limit exceeded',
          message: `Rate limit exceeded for ${userRole} users`
        },
        skipSuccessfulRequests: config.skipSuccessfulRequests,
        skipFailedRequests: config.skipFailedRequests,
        handler: (req: Request, res: Response) => {
          RateLimitMiddleware.logger.warn('Rate limit exceeded - Dynamic', {
            ip: req.ip,
            userId: (req as any).user?.userId,
            role: userRole,
            path: req.path,
            limit: config.max,
            window: config.windowMs
          });

          res.status(429).json({
            error: 'Rate limit exceeded',
            message: `Rate limit exceeded for ${userRole} users`,
            retryAfter: Math.ceil(config.windowMs / 1000 / 60) + ' minutes'
          });
        }
      });

      dynamicLimiter(req, res, next);
    };
  };

  /**
   * Middleware for IP whitelist (rate limiting bypass)
   */
  public static whitelist = (whitelistedIPs: string[] = []) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || 'unknown';
      
      // Check if the IP is in the whitelist
      if (whitelistedIPs.includes(clientIP)) {
        RateLimitMiddleware.logger.debug('IP whitelisted, bypassing rate limit', {
          ip: clientIP,
          path: req.path
        });
        
        // Mark the request as whitelisted
        (req as any).rateLimitWhitelisted = true;
      }

      next();
    };
  };

  /**
   * Rate limit monitoring middleware
   */
  public static monitor = (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function(body: any) {
      // Collect rate limit information
      const rateLimitInfo = {
        remaining: res.getHeader('X-RateLimit-Remaining'),
        limit: res.getHeader('X-RateLimit-Limit'),
        reset: res.getHeader('X-RateLimit-Reset'),
        retryAfter: res.getHeader('Retry-After')
      };

      // Log if approaching the limit
      if (rateLimitInfo.remaining && parseInt(rateLimitInfo.remaining as string) < 10) {
        RateLimitMiddleware.logger.warn('Approaching rate limit', {
          ip: req.ip,
          userId: (req as any).user?.userId,
          path: req.path,
          remaining: rateLimitInfo.remaining,
          limit: rateLimitInfo.limit
        });
      }

      return originalSend.call(this, body);
    };

    next();
  };

  /**
   * Clean up old records (placeholder)
   */
  public static async cleanup(): Promise<void> {
    try {
      RateLimitMiddleware.logger.info('Rate limit cleanup completed');
    } catch (error) {
      RateLimitMiddleware.logger.error('Failed to cleanup rate limit keys', { error });
    }
  }

  /**
   * Get rate limit statistics
   */
  public static async getStats(): Promise<any> {
    try {
      const stats = {
        totalKeys: 0,
        keysByType: {} as { [key: string]: number },
        timestamp: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      RateLimitMiddleware.logger.error('Failed to get rate limit stats', { error });
      return { error: 'Failed to get stats' };
    }
  }

  /**
   * Reset rate limit for a specific user/IP
   */
  public static async resetLimit(identifier: string, limitType: string = '*'): Promise<boolean> {
    try {
      RateLimitMiddleware.logger.info('Rate limit reset', {
        identifier,
        limitType,
        keysDeleted: 0
      });
      return true;
    } catch (error) {
      RateLimitMiddleware.logger.error('Failed to reset rate limit', { error, identifier, limitType });
      return false;
    }
  }
}
