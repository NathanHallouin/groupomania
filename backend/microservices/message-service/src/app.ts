import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { config } from './config/config';
import { connectDatabase } from './models';
import { RedisService, WebSocketService } from './services';
import { errorHandler, requestLogger } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import routes from './routes';

/**
 * Application Message Service
 */
class MessageServiceApp {
  public app: express.Application;
  public server: any;
  private redisService: RedisService;
  private webSocketService: WebSocketService;

  constructor() {
    this.app = express();
    this.redisService = new RedisService();
    
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
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Compression
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use(requestLogger);

    // Rate limiting
    this.app.use(rateLimiter);

    // Trust proxy for reverse proxy headers
    this.app.set('trust proxy', 1);
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // API routes
    this.app.use('/api', routes);

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Groupomania Message Service API',
        version: process.env.npm_package_version || '1.0.0',
        docs: '/api/health',
        timestamp: new Date().toISOString(),
      });
    });

    // 404 route
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl,
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
  private async connectToDatabase(): Promise<void> {
    try {
      await connectDatabase();
      console.log('✅ Database connected');
    } catch (error) {
      console.error('❌ Database connection error:', error);
      throw error;
    }
  }

  /**
   * Connect to Redis
   */
  private async connectToRedis(): Promise<void> {
    try {
      await this.redisService.connect();
      console.log('✅ Redis connected');
    } catch (error) {
      console.error('⚠️ Warning: Redis unavailable, cache will be disabled');
      // Do not fail the application if Redis is not available
    }
  }

  /**
   * Initialize WebSocket
   */
  private initializeWebSocket(): void {
    this.server = createServer(this.app);
    this.webSocketService = new WebSocketService(this.server);
    console.log('✅ WebSocket service initialized');
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Connect to the database
      await this.connectToDatabase();

      // Connect to Redis
      await this.connectToRedis();

      // Initialize WebSocket
      this.initializeWebSocket();

      // Start the server
      const port = config.server.port;
      this.server.listen(port, () => {
        console.log(`
🚀 Message Service started successfully!
📡 Port: ${port}
🌍 Environment: ${config.server.env}
🔗 URL: http://localhost:${port}
📚 API Docs: http://localhost:${port}/api/health
📱 WebSocket: Enabled
⚡ Redis: ${this.redisService.isRedisConnected() ? 'Connected' : 'Disconnected'}
        `);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Error starting the server:', error);
      process.exit(1);
    }
  }

  /**
   * Configure graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n🛑 Signal ${signal} received, shutting down...`);

      try {
        // Close HTTP server
        if (this.server) {
          await new Promise<void>((resolve, reject) => {
            this.server.close((err: any) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });
          console.log('✅ HTTP server closed');
        }

        // Close WebSocket
        if (this.webSocketService) {
          this.webSocketService.close();
        }

        // Close Redis
        if (this.redisService) {
          await this.redisService.disconnect();
        }

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Uncaught error handling
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled promise rejection:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * Get the application instance
   */
  public getApp(): express.Application {
    return this.app;
  }

  /**
   * Get the WebSocket service
   */
  public getWebSocketService(): WebSocketService {
    return this.webSocketService;
  }

  /**
   * Get the Redis service
   */
  public getRedisService(): RedisService {
    return this.redisService;
  }
}

export default MessageServiceApp;
