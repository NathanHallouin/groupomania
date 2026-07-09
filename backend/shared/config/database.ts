import dotenv from 'dotenv';
import { Sequelize, Options } from 'sequelize';

// Load environment variables
dotenv.config();

// Database configuration interface
interface DatabaseConfig {
  development: Options;
  test: Options;
  production: Options;
}

const config: DatabaseConfig = {
  development: {
    username: process.env.DB_USERNAME || 'groupomania',
    password: process.env.DB_PASSWORD || 'groupomania',
    database: process.env.DB_NAME || 'groupomania_development',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres' as const,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10', 10), // Increased from 5
      min: parseInt(process.env.DB_POOL_MIN || '2', 10), // Increased from 0
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
      evict: parseInt(process.env.DB_POOL_EVICT || '1000', 10), // Connection eviction interval
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false,
      // Performance optimizations
      statement_timeout: 30000, // 30 seconds
      query_timeout: 30000,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    },
    // Sequelize performance optimizations
    benchmark: true, // Log execution time
    isolationLevel: 'READ_COMMITTED', // Better for concurrent access
    retry: {
      max: 3, // Retry failed queries
      match: [
        'ETIMEDOUT',
        'EHOSTUNREACH',
        'ECONNRESET',
        'ECONNREFUSED',
        'ENOTFOUND'
      ]
    }
  },
  test: {
    username: process.env.DB_USERNAME || 'groupomania',
    password: process.env.DB_PASSWORD || 'groupomania',
    database: process.env.DB_NAME_TEST || 'groupomania_test',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres' as const,
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '5', 10),
      min: parseInt(process.env.DB_POOL_MIN || '1', 10),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
      evict: 1000,
    },
    dialectOptions: {
      ssl: false,
      statement_timeout: 10000, // Shorter for tests
      query_timeout: 10000,
    },
    benchmark: false, // Disable for faster tests
    isolationLevel: 'READ_COMMITTED',
  },
  production: {
    username: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres' as const,
    logging: false,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '25', 10), // Higher for production
      min: parseInt(process.env.DB_POOL_MIN || '5', 10), // Keep connections warm
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '60000', 10), // Longer timeout
      idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
      evict: 1000,
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false
      } : false,
      // Production optimizations
      statement_timeout: 60000, // 1 minute
      query_timeout: 60000,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      // Enable prepared statements for better performance
      native: true,
    },
    benchmark: false, // Disable logging in production
    isolationLevel: 'READ_COMMITTED',
    retry: {
      max: 5, // More retries in production
      match: [
        'ETIMEDOUT',
        'EHOSTUNREACH',
        'ECONNRESET',
        'ECONNREFUSED',
        'ENOTFOUND',
        'SequelizeConnectionError',
        'SequelizeConnectionRefusedError',
        'SequelizeHostNotFoundError',
        'SequelizeHostNotReachableError'
      ]
    },
    // Production-specific optimizations
    define: {
      freezeTableName: true, // Prevent table name pluralization
      underscored: true, // Use snake_case for column names
      timestamps: true, // Enable timestamps
    }
  }
};

// Create Sequelize instance
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env as keyof DatabaseConfig];

export const sequelize = new Sequelize(
  dbConfig.database as string,
  dbConfig.username as string,
  dbConfig.password as string,
  dbConfig
);

module.exports = config;
export default config;
