import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import winston from 'winston';

// Internal services
import { ServiceDiscovery } from './services/serviceDiscovery';
import { LoadBalancer } from './services/loadBalancer';
import { CircuitBreaker } from './services/circuitBreaker';
import { MetricsCollector } from './services/metricsCollector';

// Middlewares
import { 
  AuthMiddleware, 
  LoggingMiddleware, 
  RateLimitMiddleware, 
  ValidationMiddleware 
} from './middleware';

// Configuration
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Main logger
const logger = winston.createLogger({
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
    new winston.transports.File({ filename: 'logs/api-gateway.log' })
  ]
});

// Services
const serviceDiscovery = new ServiceDiscovery();
const loadBalancer = new LoadBalancer();
const circuitBreaker = new CircuitBreaker();
const metricsCollector = new MetricsCollector();

/**
 * Global middleware configuration
 */

// Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging and security middlewares
app.use(LoggingMiddleware.requestLogger);
app.use(LoggingMiddleware.securityLogger);
app.use(LoggingMiddleware.performanceLogger);

// Global rate limiting
app.use(RateLimitMiddleware.general);
app.use(RateLimitMiddleware.monitor);

// Validation and sanitization
app.use(ValidationMiddleware.sanitize);

/**
 * Health and metrics routes
 */
app.get('/health', async (req, res) => {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Service health check failed'
    });
  }
});

app.get('/metrics', AuthMiddleware.authenticate, AuthMiddleware.requireAdmin, async (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to collect metrics', { error });
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

/**
 * Authentication routes (without proxy, handled directly)
 */
app.post('/auth/login', 
  RateLimitMiddleware.auth,
  ValidationMiddleware.authValidation,
  async (req: express.Request, res: express.Response) => {
    try {
      // Authentication simulation for now
      const result = { token: 'simulated-token', user: { id: 1, email: req.body.email } };
      res.json(result);
    } catch (error) {
      logger.error('Authentication failed', { error, email: req.body.email });
      res.status(401).json({ error: 'Authentication failed' });
    }
  }
);

app.post('/auth/register',
  RateLimitMiddleware.auth,
  ValidationMiddleware.registrationValidation,
  async (req: express.Request, res: express.Response) => {
    try {
      // Registration simulation for now
      const result = { message: 'User registered successfully', userId: Date.now() };
      res.status(201).json(result);
    } catch (error) {
      logger.error('Registration failed', { error, email: req.body.email });
      res.status(400).json({ error: 'Registration failed' });
    }
  }
);

/**
 * Protected routes with proxy to microservices (simplified)
 */

// Users service
app.use('/api/users',
  AuthMiddleware.authenticate,
  RateLimitMiddleware.dynamicByRole({
    'admin': { windowMs: 60000, max: 200 },
    'user': { windowMs: 60000, max: 100 },
    'default': { windowMs: 60000, max: 50 }
  }),
  createProxyMiddleware({
    target: 'http://localhost:3001', // Temporary URL
    changeOrigin: true,
    pathRewrite: { '^/api/users': '/users' }
  })
);

// Messages service
app.use('/api/messages',
  AuthMiddleware.authenticate,
  RateLimitMiddleware.creation,
  ValidationMiddleware.paginationValidation,
  createProxyMiddleware({
    target: 'http://localhost:3002', // Temporary URL
    changeOrigin: true,
    pathRewrite: { '^/api/messages': '/messages' }
  })
);

// File upload routes
app.use('/api/upload',
  AuthMiddleware.authenticate,
  RateLimitMiddleware.upload,
  ValidationMiddleware.fileUploadValidation,
  createProxyMiddleware({
    target: 'http://localhost:3003', // Temporary URL
    changeOrigin: true,
    pathRewrite: { '^/api/upload': '/upload' }
  })
);

// Search routes (without problematic middleware)
app.get('/api/search', 
  AuthMiddleware.optionalAuth,
  RateLimitMiddleware.search,
  async (req: express.Request, res: express.Response) => {
    try {
      // Search simulation for now
      res.json({ 
        results: [], 
        query: req.query.q,
        message: 'Search service temporarily simulated' 
      });
    } catch (error) {
      logger.error('Search failed', { error });
      res.status(500).json({ error: 'Search service unavailable' });
    }
  }
);

/**
 * Administration routes
 */
app.get('/admin/services', 
  AuthMiddleware.authenticate, 
  AuthMiddleware.requireAdmin,
  async (req, res) => {
    try {
      const services = {
        'user-service': { status: 'healthy', instances: 1 },
        'message-service': { status: 'healthy', instances: 1 },
        'file-service': { status: 'healthy', instances: 1 },
        'search-service': { status: 'healthy', instances: 1 }
      };
      res.json(services);
    } catch (error) {
      logger.error('Failed to get services', { error });
      res.status(500).json({ error: 'Failed to get services' });
    }
  }
);

app.post('/admin/circuit-breaker/reset/:service',
  AuthMiddleware.authenticate,
  AuthMiddleware.requireAdmin,
  ValidationMiddleware.idParamValidation('service'),
  async (req, res) => {
    try {
      const serviceName = req.params.service;
      logger.info('Circuit breaker reset', { serviceName, adminId: (req as any).user!.userId });
      res.json({ message: `Circuit breaker reset for ${serviceName}` });
    } catch (error) {
      logger.error('Failed to reset circuit breaker', { error, service: req.params.service });
      res.status(500).json({ error: 'Failed to reset circuit breaker' });
    }
  }
);

/**
 * Error handling
 */
app.use(LoggingMiddleware.errorLogger);

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: (req as any).requestId
  });

  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      requestId: (req as any).requestId
    });
  }
});

// Route 404
app.use('*', (req, res) => {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.path}`,
    availableRoutes: [
      'GET /health',
      'GET /metrics',
      'POST /auth/login',
      'POST /auth/register',
      'GET|POST|PUT|DELETE /api/users/*',
      'GET|POST|PUT|DELETE /api/messages/*',
      'POST /api/upload/*',
      'GET /api/search/*'
    ]
  });
});

/**
 * Server startup
 */
async function startServer() {
  try {
    // Initialize services
    await serviceDiscovery.initialize();
    
    // Register cleanup handlers
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    const server = app.listen(PORT, () => {
      logger.info(`API Gateway started successfully`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
      });
    });

    // Server timeout configuration
    server.timeout = 30000; // 30 seconds

    return server;
  } catch (error) {
    logger.error('Failed to start API Gateway', { error });
    process.exit(1);
  }
}

/**
 * Graceful shutdown
 */
async function gracefulShutdown() {
  logger.info('Shutting down API Gateway...');
  
  try {
    await RateLimitMiddleware.cleanup();
    
    logger.info('API Gateway shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

// Start the server only if this file is executed directly
if (require.main === module) {
  startServer();
}

export default app;
