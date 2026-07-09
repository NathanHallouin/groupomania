import dotenv from 'dotenv';
import { Config } from '../types';

// Charger les variables d'environnement
dotenv.config();

/**
 * Validation de configuration
 */
const validateConfig = (config: Config): void => {
  const requiredVars = [
    'database.host',
    'database.port',
    'database.database',
    'database.username',
    'jwt.secret',
  ];

  for (const varPath of requiredVars) {
    const keys = varPath.split('.');
    let value: any = config;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    if (value === undefined || value === '') {
      throw new Error(`Variable de configuration manquante: ${varPath}`);
    }
  }
};

/**
 * Configuration de l'application Message Service
 */
export const config: Config = {
  // Environnement
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  
  // Configuration serveur
  server: {
    port: parseInt(process.env.PORT || '3003', 10),
    host: process.env.HOST || 'localhost',
    env: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  },
  
  // Configuration de la base de données PostgreSQL
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'groupomania_messages',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    sync: process.env.DB_SYNC === 'true' || true,
  },
  
  // Configuration JWT (pour valider les tokens depuis Auth Service)
  jwt: {
    secret: process.env.JWT_ACCESS_SECRET || 'access-secret-key-very-long-and-secure',
  },
  
  // Configuration Redis pour cache et sessions WebSocket
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '1', 10),
  },
  
  // Configuration des uploads
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB par défaut
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,application/pdf,text/plain').split(','),
    destination: process.env.UPLOAD_DESTINATION || './uploads/messages',
  },
  
  // Configuration CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:4200'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Configuration rate limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requêtes par minute
  },

  // Configuration WebSocket/Socket.IO
  websocket: {
    enabled: process.env.WEBSOCKET_ENABLED !== 'false',
    transports: (process.env.WEBSOCKET_TRANSPORTS || 'websocket,polling').split(','),
    pingTimeout: parseInt(process.env.WEBSOCKET_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.WEBSOCKET_PING_INTERVAL || '25000', 10),
  },

  // Configuration des autres services
  services: {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    fileService: process.env.FILE_SERVICE_URL || 'http://localhost:3004',
  },
};

// Valider la configuration au démarrage
try {
  validateConfig(config);
} catch (error) {
  console.error('❌ Erreur de configuration:', error);
  process.exit(1);
}

/**
 * Configuration spécifique par environnement
 */
export const getEnvironmentConfig = () => {
  const baseConfig = { ...config };

  switch (config.nodeEnv) {
    case 'development':
      return {
        ...baseConfig,
        database: {
          ...baseConfig.database,
          logging: true,
          sync: true,
        },
      };

    case 'production':
      return {
        ...baseConfig,
        database: {
          ...baseConfig.database,
          logging: false,
          sync: false,
        },
        websocket: {
          ...baseConfig.websocket,
          transports: ['websocket'], // WebSocket uniquement en production
        },
      };

    case 'test':
      return {
        ...baseConfig,
        database: {
          ...baseConfig.database,
          database: `${baseConfig.database.database}_test`,
          logging: false,
          sync: true,
        },
        rateLimiting: {
          windowMs: 100,
          max: 1000, // Plus permissif pour les tests
        },
      };

    default:
      return baseConfig;
  }
};

export default config;
