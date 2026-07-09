import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { sequelize } from './models';
import authRoutes from './routes/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { config } from './config/config';

/**
 * Main class for the Auth Service application
 */
class AuthService {
  public app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middlewares
   */
  private initializeMiddlewares(): void {
    // Security
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Compression
    this.app.use(compression());

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    // Stricter rate limiting for authentication
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit to 5 login attempts per IP
      message: {
        success: false,
        message: 'Too many login attempts, please try again later.',
      },
      skipSuccessfulRequests: true,
    });
    this.app.use('/api/auth/login', authLimiter);
    this.app.use('/api/auth/register', authLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Additional security headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Health check route
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Auth Service is running',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // Authentication routes
    this.app.use('/api/auth', authRoutes);

    // Default route
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Groupomania Auth Service API',
        version: process.env.npm_package_version || '1.0.0',
        documentation: '/api/docs',
      });
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // Route not found
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Initialize database
   */
  public async initializeDatabase(): Promise<void> {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established successfully.');

      if (process.env.NODE_ENV === 'development') {
        await sequelize.sync({ alter: true });
        console.log('✅ Models synchronized with the database.');
      }
    } catch (error) {
      console.error('❌ Unable to connect to the database:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      await this.initializeDatabase();

      this.app.listen(this.port, () => {
        console.log(`🚀 Auth Service started on port ${this.port}`);
        console.log(`📝 Documentation available at http://localhost:${this.port}/api/docs`);
        console.log(`🔍 Health check: http://localhost:${this.port}/health`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      });
    } catch (error) {
      console.error('❌ Unable to start the server:', error);
      process.exit(1);
    }
  }

  /**
   * Stop the server gracefully
   */
  public async stop(): Promise<void> {
    try {
      await sequelize.close();
      console.log('✅ Database connection closed.');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Shutdown signal handling
const authService = new AuthService();

process.on('SIGTERM', () => {
  console.log('📝 SIGTERM signal received');
  authService.stop();
});

process.on('SIGINT', () => {
  console.log('📝 SIGINT signal received');
  authService.stop();
});

// Uncaught error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled promise rejection:', promise, 'reason:', reason);
  authService.stop();
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  authService.stop();
});

export default authService;
