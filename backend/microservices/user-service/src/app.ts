import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { config } from './config/config';
import { sequelize } from './models';
import userRoutes from './routes/userRoutes';
import { errorHandler } from './middleware/errorHandler';

/**
 * User Service Application
 */
class UserServiceApp {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middlewares
   */
  private initializeMiddlewares(): void {
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: true,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimiting.windowMs,
      max: config.rateLimiting.max,
      message: {
        success: false,
        message: 'Too many requests. Please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

    this.app.use(limiter);

    // Logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve static files (avatars)
    this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Health check
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'User Service is running',
        timestamp: new Date().toISOString(),
        service: 'user-service',
        version: '1.0.0',
      });
    });
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // User API routes
    this.app.use('/api/users', userRoutes);

    // Default route
    this.app.get('/', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Groupomania User Service API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          users: '/api/users',
          docs: '/api/docs',
        },
      });
    });

    // 404 route
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
      });
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  /**
   * Connect to the database
   */
  public async connectDatabase(): Promise<void> {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL database connection established');

      if (config.database.sync) {
        await sequelize.sync({ alter: true });
        console.log('✅ Models synchronized with database');
      }
    } catch (error) {
      console.error('❌ Database connection error:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  public listen(): void {
    const port = config.server.port;
    this.app.listen(port, () => {
      console.log(`
🚀 User Service started successfully!
📍 Port: ${port}
🌍 Environment: ${config.nodeEnv}
📊 Database: ${config.database.host}:${config.database.port}/${config.database.database}
🔒 CORS Origin: ${config.cors.origin}
📝 Logs: enabled
⏱️  Rate limiting: ${config.rateLimiting.max} req/${config.rateLimiting.windowMs}ms
      `);
    });
  }
}

export default UserServiceApp;
