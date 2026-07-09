import dotenv from 'dotenv';
import { Config } from '../types';

// Charger les variables d'environnement
dotenv.config();

/**
 * Configuration de l'application
 */
export const config: Config = {
  // Port du serveur
  port: parseInt(process.env.PORT || '3001', 10),
  
  // Environnement
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  
  // Configuration de la base de données
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'groupomania_auth',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  },
  
  // Configuration JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-key-very-long-and-secure',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key-very-long-and-secure',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  // Configuration de sécurité
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockTime: parseInt(process.env.LOCK_TIME || '7200000', 10), // 2 heures en millisecondes
  },
  
  // Configuration CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:4200'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
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
    'JWT_REFRESH_SECRET',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.warn('⚠️  Variables d\'environnement manquantes (valeurs par défaut utilisées):');
    missingVars.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
  }

  // Validation des secrets JWT
  if (config.jwt.accessSecret.length < 32) {
    console.warn('⚠️  JWT_ACCESS_SECRET devrait contenir au moins 32 caractères pour une sécurité optimale');
  }

  if (config.jwt.refreshSecret.length < 32) {
    console.warn('⚠️  JWT_REFRESH_SECRET devrait contenir au moins 32 caractères pour une sécurité optimale');
  }

  // Validation de l'environnement de production
  if (config.nodeEnv === 'production') {
    const productionWarnings: string[] = [];

    if (config.jwt.accessSecret === 'access-secret-key-very-long-and-secure') {
      productionWarnings.push('JWT_ACCESS_SECRET utilise la valeur par défaut');
    }

    if (config.jwt.refreshSecret === 'refresh-secret-key-very-long-and-secure') {
      productionWarnings.push('JWT_REFRESH_SECRET utilise la valeur par défaut');
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

  console.log('✅ Configuration validée avec succès');
  console.log(`   - Environnement: ${config.nodeEnv}`);
  console.log(`   - Port: ${config.port}`);
  console.log(`   - Base de données: ${config.database.host}:${config.database.port}/${config.database.database}`);
  console.log(`   - JWT Access Expiry: ${config.jwt.accessExpiry}`);
  console.log(`   - JWT Refresh Expiry: ${config.jwt.refreshExpiry}`);
};

// Valider la configuration au démarrage
validateConfig();
