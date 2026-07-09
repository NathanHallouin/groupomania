import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cacheService';
const logger = require('../utils/logger');

// Interface for cacheable requests
interface CacheableRequest extends Request {
  user?: {
    userId: number;
    admin: boolean;
  };
  cacheKey?: string;
  skipCache?: boolean;
}

// Cache configuration per endpoint
interface CacheConfig {
  ttl: number;
  keyGenerator?: (req: CacheableRequest) => string;
  skipIf?: (req: CacheableRequest) => boolean;
  varyBy?: string[];
}

/**
 * Smart cache middleware for API responses
 */
export class CacheMiddleware {
  
  /**
   * Create a cache middleware with custom configuration
   */
  public static create(config: CacheConfig) {
    return async (req: CacheableRequest, res: Response, next: NextFunction) => {
      try {
        // Check if cache should be skipped
        if (config.skipIf && config.skipIf(req)) {
          req.skipCache = true;
          return next();
        }

        // Generate cache key
        const cacheKey = config.keyGenerator
          ? config.keyGenerator(req)
          : CacheMiddleware.generateDefaultKey(req, config.varyBy);

        req.cacheKey = cacheKey;

        // Check cache for GET requests
        if (req.method === 'GET') {
          const cachedData = await cacheService.get(cacheKey);
          if (cachedData) {
            logger.debug(`Cache hit: ${cacheKey}`);

            // Add cache headers
            res.set({
              'X-Cache': 'HIT',
              'X-Cache-Key': cacheKey,
              'Cache-Control': `public, max-age=${config.ttl}`
            });

            return res.json(cachedData);
          }
        }

        // Intercept response to cache it
        const originalJson = res.json;
        res.json = function(data: any) {
          // Only cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300 && req.method === 'GET') {
            cacheService.set(cacheKey, data, config.ttl)
              .catch(err => logger.error('Failed to cache response:', err));
          }

          // Add cache headers
          res.set({
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
            'Cache-Control': req.method === 'GET'
              ? `public, max-age=${config.ttl}`
              : 'no-cache'
          });

          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error:', error);
        next();
      }
    };
  }

  /**
   * Cache middleware for messages (5 minutes)
   */
  public static messages = CacheMiddleware.create({
    ttl: 300, // 5 minutes
    keyGenerator: (req) => {
      const { page = 1, limit = 10, sort = 'createdAt', order = 'DESC' } = req.query;
      return `messages:list:${page}:${limit}:${sort}:${order}`;
    },
    varyBy: ['page', 'limit', 'sort', 'order'],
    skipIf: (req) => req.user?.admin === true // Admins always see fresh data
  });

  /**
   * Cache middleware for users (10 minutes)
   */
  public static users = CacheMiddleware.create({
    ttl: 600, // 10 minutes
    keyGenerator: (req) => {
      const { page = 1, limit = 10, search = '' } = req.query;
      return `users:list:${page}:${limit}:${search}`;
    },
    varyBy: ['page', 'limit', 'search']
  });

  /**
   * Cache middleware for a specific user profile (15 minutes)
   */
  public static userProfile = CacheMiddleware.create({
    ttl: 900, // 15 minutes
    keyGenerator: (req) => `user:profile:${req.params.id}`,
    skipIf: (req) => req.user?.userId.toString() === req.params.id // Users always see their own fresh data
  });

  /**
   * Cache middleware for a specific message (10 minutes)
   */
  public static messageDetail = CacheMiddleware.create({
    ttl: 600, // 10 minutes
    keyGenerator: (req) => `message:detail:${req.params.id}`
  });

  /**
   * Cache middleware for statistics (30 minutes)
   */
  public static statistics = CacheMiddleware.create({
    ttl: 1800, // 30 minutes
    keyGenerator: (req) => {
      const { period = 'day' } = req.query;
      return `stats:${period}`;
    },
    varyBy: ['period']
  });

  /**
   * Generate a default cache key
   */
  private static generateDefaultKey(req: CacheableRequest, varyBy?: string[]): string {
    const baseKey = `${req.method}:${req.path}`;
    
    if (!varyBy || varyBy.length === 0) {
      return baseKey;
    }

    const queryParts = varyBy
      .map(param => `${param}=${req.query[param] || ''}`)
      .join(':');

    return `${baseKey}:${queryParts}`;
  }
}

/**
 * Middleware to invalidate cache after modifications
 */
export class CacheInvalidationMiddleware {

  /**
   * Invalidate message cache after create/update/delete
   */
  public static invalidateMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Intercept response
      const originalJson = res.json;
      res.json = function(data: any) {
        // Only invalidate cache for successful operations
        if (res.statusCode >= 200 && res.statusCode < 300) {
          CacheInvalidationMiddleware.invalidateMessageCache()
            .catch(err => logger.error('Failed to invalidate message cache:', err));
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache invalidation middleware error:', error);
      next();
    }
  };

  /**
   * Invalidate user cache after modifications
   */
  public static invalidateUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const originalJson = res.json;
      res.json = function(data: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          CacheInvalidationMiddleware.invalidateUserCache(req.params.id)
            .catch(err => logger.error('Failed to invalidate user cache:', err));
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache invalidation middleware error:', error);
      next();
    }
  };

  /**
   * Invalidate message cache
   */
  private static async invalidateMessageCache(): Promise<void> {
    await Promise.all([
      cacheService.delPattern('messages:*'),
      cacheService.delPattern('message:detail:*'),
      cacheService.delPattern('stats:*')
    ]);
    logger.debug('Message cache invalidated');
  }

  /**
   * Invalidate user cache
   */
  private static async invalidateUserCache(userId?: string): Promise<void> {
    const patterns = ['users:*', 'stats:*'];

    if (userId) {
      patterns.push(`user:profile:${userId}`);
    }

    await Promise.all(patterns.map(pattern => cacheService.delPattern(pattern)));
    logger.debug(`User cache invalidated ${userId ? `for user ${userId}` : 'globally'}`);
  }
}

/**
 * Cache control middleware using headers
 */
export const cacheControlMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Respect cache control headers
  const cacheControl = req.get('Cache-Control');
  const pragma = req.get('Pragma');

  if (cacheControl === 'no-cache' || pragma === 'no-cache') {
    (req as CacheableRequest).skipCache = true;
  }

  next();
};
