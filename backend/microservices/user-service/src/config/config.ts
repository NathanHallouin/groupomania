import dotenv from 'dotenv';
import { Config } from '../types';

// Charger les variables d'environnement
dotenv.config();

/**
 * Configuration de l'application User Service
 */
export const config: Config = {
  // Port du serveur
  port: parseInt(process.env.PORT || '3002', 10),
  
  // Environnement
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  
  // Configuration serveur
  server: {
    port: parseInt(process.env.PORT || '3002', 10),
  },
  
  // Configuration de la base de données
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'groupomania_users',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    sync: process.env.DB_SYNC === 'true' || true,
  },
  
  // Configuration JWT (pour valider les tokens depuis Auth Service)
  jwt: {
    secret: process.env.JWT_ACCESS_SECRET || 'access-secret-key-very-long-and-secure',
  },
  
  // Configuration des uploads
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB par défaut
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
    destination: process.env.UPLOAD_DESTINATION || './uploads/avatars',
  },
  
  // Configuration CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:4200'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Configuration rate limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // 100 requêtes par fenêtre
  },

  // Configuration des autres services
  services: {
    authService: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    fileService: process.env.FILE_SERVICE_URL || 'http://localhost:3004',
    messageService: process.env.MESSAGE_SERVICE_URL || 'http://localhost:3003',
  },
};

/**
 * Valider la configuration
 */
export const validateConfig = (): void => {
  const requiredEnvVars = [
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_ACCESS_SECRET',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('⚠️  Variables d\'environnement manquantes (valeurs par défaut utilisées):');
    missingVars.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
  }

  // Validation du secret JWT
  if (config.jwt.secret.length < 32) {
    console.warn('⚠️  JWT_ACCESS_SECRET devrait contenir au moins 32 caractères pour une sécurité optimale');
  }

  // Validation de l'environnement de production
  if (config.nodeEnv === 'production') {
    const productionWarnings: string[] = [];

    if (config.jwt.secret === 'access-secret-key-very-long-and-secure') {
      productionWarnings.push('JWT_ACCESS_SECRET utilise la valeur par défaut');
    }

    if (config.database.password === 'password') {
      productionWarnings.push('DB_PASSWORD utilise la valeur par défaut');
    }

    if (productionWarnings.length > 0) {
      console.error('❌ Erreurs de configuration pour la production:');
      productionWarnings.forEach(warning => {
        console.error(`   - ${warning}`);
      });
      throw new Error('Configuration de production invalide');
    }
  }

  console.log('✅ Configuration User Service validée avec succès');
  console.log(`   - Environnement: ${config.nodeEnv}`);
  console.log(`   - Port: ${config.port}`);
  console.log(`   - Base de données: ${config.database.host}:${config.database.port}/${config.database.database}`);
  console.log(`   - Upload max size: ${Math.round(config.upload.maxFileSize / 1024 / 1024)}MB`);
  console.log(`   - Types autorisés: ${config.upload.allowedTypes.join(', ')}`);
};

// Valider la configuration au démarrage
validateConfig();
