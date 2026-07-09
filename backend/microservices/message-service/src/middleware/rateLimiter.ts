import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Global rate limiting configuration
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit of 1000 requests per window per IP
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Skip rate limiting for health check requests
    return req.path === '/api/health' || req.path === '/health';
  },
  keyGenerator: (req: Request) => {
    // Use the real IP behind proxies
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
});

/**
 * Strict rate limiting for authentication
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit of 10 login attempts per IP
  message: {
    success: false,
    message: 'Too many login attempts, please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Do not count successful requests
});

/**
 * Rate limiting for content creation
 */
export const createContentRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 creations per minute
  message: {
    success: false,
    message: 'Too many content creations, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting for messages (more restrictive)
 */
export const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute
  message: {
    success: false,
    message: 'You are sending messages too quickly, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use the user ID if available, otherwise IP
    return req.user?.userId?.toString() || req.ip || 'unknown';
  },
});

/**
 * Rate limiting for searches
 */
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 searches per minute
  message: {
    success: false,
    message: 'Too many searches, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting for file uploads
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per minute
  message: {
    success: false,
    message: 'Too many file uploads, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Types d'extension pour les requêtes
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: string;
        iat?: number;
        exp?: number;
      };
    }
  }
}
