import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
// Use require to avoid path resolution issues during build
const config = require('../config/config');
const logger = require('../utils/logger');
import { RateLimitError } from '../middleware/errorHandler';

/**
 * Rate limit message interface
 */
interface RateLimitMessage {
  error: string;
  code: string;
  retryAfter?: number;
}

/**
 * Rate limit options interface
 */
interface RateLimitOptions extends Partial<Options> {
  windowMs?: number;
  max?: number;
  message?: RateLimitMessage;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response, next: NextFunction) => void;
  skip?: (req: Request) => boolean;
}

/**
 * Create a rate limiter with custom options
 */
const createRateLimiter = (options: RateLimitOptions = {}): RateLimitRequestHandler => {
  const defaultOptions = {
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max, // Changed from max to limit
    message: {
      error: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil((options.windowMs || config.rateLimit.windowMs) / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response, next: NextFunction) => {
      (logger as any).logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.userId,
      });

      const error = new RateLimitError(
        options.message?.error || 'Too many requests from this IP, please try again later'
      );
      next(error);
    },
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      return req.user?.userId ? `user:${req.user.userId}` : `ip:${req.ip}`;
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks and metrics
      const skipPaths = ['/health', '/metrics'];
      return skipPaths.includes(req.path);
    },
    ...options,
  };

  return rateLimit(defaultOptions);
};

/**
 * General API rate limiter
 */
export const apiLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  limit: config.rateLimit.max, // 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'TOO_MANY_REQUESTS',
  },
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = createRateLimiter({
  windowMs: config.rateLimit.login.windowMs, // 15 minutes
  limit: config.rateLimit.login.max, // 5 attempts per window
  message: {
    error: 'Too many login attempts from this IP, please try again later',
    code: 'LOGIN_LIMIT_EXCEEDED',
  },
  keyGenerator: (req: Request) => `auth:${req.ip}`, // Always use IP for auth attempts
});

/**
 * Account creation rate limiter
 */
export const signupLimiter = createRateLimiter({
  windowMs: config.rateLimit.signup.windowMs, // 1 hour
  limit: config.rateLimit.signup.max, // 3 accounts per hour
  message: {
    error: 'Too many account creations from this IP, please try again in an hour',
    code: 'SIGNUP_LIMIT_EXCEEDED',
  },
  keyGenerator: (req: Request) => `signup:${req.ip}`, // Always use IP for signup attempts
});

/**
 * Login rate limiter
 */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 login attempts per window
  message: {
    error: 'Too many login attempts from this IP, please try again in 15 minutes',
    code: 'LOGIN_LIMIT_EXCEEDED',
  },
  keyGenerator: (req: Request) => `login:${req.ip}`,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Password reset rate limiter
 */
export const passwordResetLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3, // 3 attempts per hour
  message: {
    error: 'Too many password reset attempts, please try again later',
    code: 'PASSWORD_RESET_LIMIT_EXCEEDED',
  },
  keyGenerator: (req: Request) => `password-reset:${req.ip}`,
});

/**
 * File upload rate limiter
 */
export const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // 10 uploads per hour
  message: {
    error: 'Too many file uploads, please try again later',
    code: 'UPLOAD_LIMIT_EXCEEDED',
  },
});

/**
 * Message creation rate limiter
 */
export const messageLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 5, // 5 messages per minute
  message: {
    error: 'Too many messages posted, please slow down',
    code: 'MESSAGE_LIMIT_EXCEEDED',
  },
});

/**
 * Dynamic rate limiter based on user role
 */
export const dynamicLimiter = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.admin) {
    // More permissive for admin users
    createRateLimiter({
      windowMs: 15 * 60 * 1000,
      limit: 1000,
      message: {
        error: 'Admin rate limit exceeded',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
      },
    })(req, res, next);
    return;
  }
  apiLimiter(req, res, next);
};

export { createRateLimiter };
