import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import config from '../config/config';

// Define logger extensions interface
interface LoggerExtensions {
  stream: {
    write: (message: string) => void;
  };
  logError: (error: Error, context?: Record<string, any>) => void;
  logHttpRequest: (req: Request, res: Response, responseTime: number) => void;
  logSecurityEvent: (event: string, details?: Record<string, any>) => void;
  logDatabaseQuery: (query: string, duration: number, error?: Error | null) => void;
  logBusinessEvent: (event: string, data?: Record<string, any>) => void;
}

type ExtendedLogger = winston.Logger & LoggerExtensions;

// Create logs directory if it doesn't exist
const logDir = path.dirname(config.logging.file);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Custom format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Common transport configuration
const commonTransportConfig = {
  handleExceptions: true,
  handleRejections: true,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
};

// Configure transports based on environment
const transports: winston.transport[] = [];

// Console transport for development
if (config.env === 'development') {
  transports.push(
    new winston.transports.Console({
      level: config.logging.level,
      format: developmentFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );
}

// File transports for all environments
transports.push(
  // Daily rotate file for all logs
  new DailyRotateFile({
    ...commonTransportConfig,
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: config.logging.level,
    format: productionFormat,
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    auditFile: path.join(logDir, 'audit.json'),
  }),
  
  // Separate file for errors
  new DailyRotateFile({
    ...commonTransportConfig,
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: productionFormat,
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    auditFile: path.join(logDir, 'error-audit.json'),
  }),
  
  // Separate file for HTTP access logs
  new DailyRotateFile({
    ...commonTransportConfig,
    filename: path.join(logDir, 'access-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxSize: config.logging.maxSize,
    maxFiles: config.logging.maxFiles,
    auditFile: path.join(logDir, 'access-audit.json'),
  })
);

// Create the logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  transports,
  exitOnError: false,
}) as ExtendedLogger;

// Add colors for console output
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
});

// Create a stream for Morgan HTTP logging
(logger as any).stream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
logger.logError = (error: Error, context: Record<string, any> = {}): void => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
  });
};

logger.logHttpRequest = (req: Request, res: Response, responseTime: number): void => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userId: (req as any).user?.id,
  });
};

logger.logSecurityEvent = (event: string, details: Record<string, any> = {}): void => {
  logger.warn('Security Event', {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

logger.logDatabaseQuery = (query: string, duration: number, error: Error | null = null): void => {
  if (error) {
    logger.error('Database Query Failed', {
      query: query.substring(0, 100), // Truncate long queries
      duration: `${duration}ms`,
      error: error.message,
    });
  } else if (config.env === 'development') {
    logger.debug('Database Query', {
      query: query.substring(0, 100),
      duration: `${duration}ms`,
    });
  }
};

logger.logBusinessEvent = (event: string, data: Record<string, any> = {}): void => {
  logger.info('Business Event', {
    event,
    timestamp: new Date().toISOString(),
    ...data,
  });
};

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
  });
});

export default logger;
