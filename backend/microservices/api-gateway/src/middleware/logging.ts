import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for request information
 */
interface RequestInfo {
  requestId: string;
  method: string;
  url: string;
  path: string;
  query: any;
  headers: any;
  body?: any;
  userAgent: string;
  ip: string;
  timestamp: Date;
  userId?: number;
  userEmail?: string;
}

/**
 * Interface for response information
 */
interface ResponseInfo {
  requestId: string;
  statusCode: number;
  contentLength?: number;
  responseTime: number;
  timestamp: Date;
  headers?: any;
}

/**
 * Logging middleware for the API Gateway
 */
export class LoggingMiddleware {
  private static logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'api-gateway' },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }),
      new winston.transports.File({ 
        filename: 'logs/api-gateway-error.log', 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: 'logs/api-gateway-combined.log' 
      }),
      new winston.transports.File({
        filename: 'logs/api-gateway-access.log',
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    ]
  });

  /**
   * Main request logging middleware
   */
  public static requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const requestId = uuidv4();
    
    // Add request ID to the request object
    req.requestId = requestId;

    // Collect request information
    const requestInfo: RequestInfo = {
      requestId,
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      headers: LoggingMiddleware.sanitizeHeaders(req.headers),
      userAgent: req.get('User-Agent') || '',
      ip: LoggingMiddleware.getClientIp(req),
      timestamp: new Date(),
      userId: req.user?.userId,
      userEmail: req.user?.email
    };

    // Add body for POST/PUT/PATCH requests (with sanitization)
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      requestInfo.body = LoggingMiddleware.sanitizeBody(req.body);
    }

    // Log the incoming request
    LoggingMiddleware.logger.info('Incoming request', requestInfo);

    // Intercept the response
    const originalSend = res.send;
    let responseBody: any;

    res.send = function (body: any) {
      responseBody = body;
      return originalSend.call(this, body);
    };

    // Log the response when finished
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      
      const responseInfo: ResponseInfo = {
        requestId,
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : undefined,
        responseTime,
        timestamp: new Date(),
        headers: LoggingMiddleware.sanitizeHeaders(res.getHeaders())
      };

      // Add the appropriate log level based on status code
      if (res.statusCode >= 500) {
        LoggingMiddleware.logger.error('Request completed with server error', {
          ...responseInfo,
          responseBody: LoggingMiddleware.sanitizeResponseBody(responseBody)
        });
      } else if (res.statusCode >= 400) {
        LoggingMiddleware.logger.warn('Request completed with client error', {
          ...responseInfo,
          responseBody: LoggingMiddleware.sanitizeResponseBody(responseBody)
        });
      } else {
        LoggingMiddleware.logger.info('Request completed successfully', responseInfo);
      }

      // Performance metrics
      if (responseTime > 5000) {
        LoggingMiddleware.logger.warn('Slow request detected', {
          requestId,
          path: req.path,
          method: req.method,
          responseTime,
          threshold: 5000
        });
      }
    });

    next();
  };

  /**
   * Error logging middleware
   */
  public static errorLogger = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    const errorInfo = {
      requestId: req.requestId,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      },
      request: {
        method: req.method,
        url: req.url,
        path: req.path,
        headers: LoggingMiddleware.sanitizeHeaders(req.headers),
        body: LoggingMiddleware.sanitizeBody(req.body),
        query: req.query,
        params: req.params
      },
      user: req.user ? {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role
      } : null,
      timestamp: new Date()
    };

    LoggingMiddleware.logger.error('Request error', errorInfo);
    next(err);
  };

  /**
   * Logger for service discovery events
   */
  public static serviceLogger = {
    serviceRegistered: (serviceName: string, serviceInfo: any) => {
      LoggingMiddleware.logger.info('Service registered', {
        event: 'service_registered',
        serviceName,
        serviceInfo,
        timestamp: new Date()
      });
    },

    serviceDeregistered: (serviceName: string, instanceId: string) => {
      LoggingMiddleware.logger.info('Service deregistered', {
        event: 'service_deregistered',
        serviceName,
        instanceId,
        timestamp: new Date()
      });
    },

    serviceHealthCheck: (serviceName: string, instanceId: string, healthy: boolean) => {
      const level = healthy ? 'debug' : 'warn';
      LoggingMiddleware.logger.log(level, 'Service health check', {
        event: 'service_health_check',
        serviceName,
        instanceId,
        healthy,
        timestamp: new Date()
      });
    },

    loadBalancerSelection: (serviceName: string, selectedInstance: any, strategy: string) => {
      LoggingMiddleware.logger.debug('Load balancer selection', {
        event: 'load_balancer_selection',
        serviceName,
        selectedInstance,
        strategy,
        timestamp: new Date()
      });
    }
  };

  /**
   * Logger for circuit breaker events
   */
  public static circuitBreakerLogger = {
    circuitOpened: (serviceName: string, reason: string) => {
      LoggingMiddleware.logger.warn('Circuit breaker opened', {
        event: 'circuit_opened',
        serviceName,
        reason,
        timestamp: new Date()
      });
    },

    circuitClosed: (serviceName: string) => {
      LoggingMiddleware.logger.info('Circuit breaker closed', {
        event: 'circuit_closed',
        serviceName,
        timestamp: new Date()
      });
    },

    circuitHalfOpen: (serviceName: string) => {
      LoggingMiddleware.logger.info('Circuit breaker half-open', {
        event: 'circuit_half_open',
        serviceName,
        timestamp: new Date()
      });
    },

    requestFailed: (serviceName: string, error: string) => {
      LoggingMiddleware.logger.error('Circuit breaker request failed', {
        event: 'circuit_request_failed',
        serviceName,
        error,
        timestamp: new Date()
      });
    }
  };

  /**
   * Sanitize sensitive headers
   */
  private static sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    const sanitized = { ...headers };

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body
   */
  private static sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'auth'];
    const sanitized = { ...body };

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Sanitize responses (to avoid logging sensitive data)
   */
  private static sanitizeResponseBody(body: any): any {
    if (!body) return body;

    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      
      if (parsed && typeof parsed === 'object') {
        const sanitized = { ...parsed };
        
        // Mask tokens in responses
        if (sanitized.token) {
          sanitized.token = '[REDACTED]';
        }
        
        if (sanitized.accessToken) {
          sanitized.accessToken = '[REDACTED]';
        }

        if (sanitized.refreshToken) {
          sanitized.refreshToken = '[REDACTED]';
        }

        return sanitized;
      }
    } catch (e) {
      // If we can't parse, return as is
      return body;
    }

    return body;
  }

  /**
   * Get the real client IP
   */
  private static getClientIp(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Middleware to log performance metrics
   */
  public static performanceLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = process.hrtime.bigint();

    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      LoggingMiddleware.logger.info('Performance metrics', {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        memoryUsage: process.memoryUsage(),
        timestamp: new Date()
      });
    });

    next();
  };

  /**
   * Middleware to log security attempts
   */
  public static securityLogger = (req: Request, res: Response, next: NextFunction): void => {
    // Detect SQL injection attempts
    const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i;
    const bodyStr = JSON.stringify(req.body);
    const queryStr = JSON.stringify(req.query);

    if (sqlInjectionPattern.test(bodyStr) || sqlInjectionPattern.test(queryStr)) {
      LoggingMiddleware.logger.warn('Potential SQL injection attempt', {
        requestId: req.requestId,
        ip: LoggingMiddleware.getClientIp(req),
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        suspiciousContent: {
          body: bodyStr.match(sqlInjectionPattern)?.[0],
          query: queryStr.match(sqlInjectionPattern)?.[0]
        },
        timestamp: new Date()
      });
    }

    // Detect XSS attempts
    const xssPattern = /<script|javascript:|on\w+\s*=/i;
    if (xssPattern.test(bodyStr) || xssPattern.test(queryStr)) {
      LoggingMiddleware.logger.warn('Potential XSS attempt', {
        requestId: req.requestId,
        ip: LoggingMiddleware.getClientIp(req),
        method: req.method,
        path: req.path,
        timestamp: new Date()
      });
    }

    next();
  };

  /**
   * Get logging statistics
   */
  public static getLoggingStats(): any {
    return {
      totalRequests: 0, // To implement with a counter
      errorRate: 0,     // To implement with counters
      averageResponseTime: 0, // To implement
      timestamp: new Date().toISOString()
    };
  }
}
