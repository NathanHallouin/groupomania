import Joi from 'joi';
import type { AppConfig } from '../types';

// Environment validation schema
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  HOST: Joi.string().default('localhost'),
  API_VERSION: Joi.string().default('v1'),
  
  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME_TEST: Joi.string().default('groupomania_test'),
  DB_POOL_MAX: Joi.number().default(10),
  DB_POOL_MIN: Joi.number().default(2),
  DB_POOL_ACQUIRE: Joi.number().default(30000),
  DB_POOL_IDLE: Joi.number().default(10000),
  
  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  
  // Cookie
  COOKIE_SECRET: Joi.string().min(32).required(),
  COOKIE_EXPIRES_IN: Joi.number().default(7),
  
  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),
  
  // CORS
  CORS_ORIGIN: Joi.string().default('http://localhost:3001'),
  CORS_CREDENTIALS: Joi.boolean().default(true),
  
  // File Upload
  UPLOAD_PATH: Joi.string().default('uploads'),
  MAX_FILE_SIZE: Joi.number().default(5242880),
  ALLOWED_FILE_TYPES: Joi.string().default('image/jpeg,image/png,image/gif'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  RATE_LIMIT_LOGIN_WINDOW_MS: Joi.number().default(900000),
  RATE_LIMIT_LOGIN_MAX_REQUESTS: Joi.number().default(5),
  RATE_LIMIT_SIGNUP_WINDOW_MS: Joi.number().default(3600000),
  RATE_LIMIT_SIGNUP_MAX_REQUESTS: Joi.number().default(3),
  
  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  LOG_FILE: Joi.string().default('logs/app.log'),
  LOG_MAX_SIZE: Joi.string().default('20m'),
  LOG_MAX_FILES: Joi.string().default('14d'),
  
  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),
  PASSWORD_MIN_LENGTH: Joi.number().default(8),
  PASSWORD_REQUIRE_UPPERCASE: Joi.boolean().default(true),
  PASSWORD_REQUIRE_LOWERCASE: Joi.boolean().default(true),
  PASSWORD_REQUIRE_NUMBERS: Joi.boolean().default(true),
  PASSWORD_REQUIRE_SYMBOLS: Joi.boolean().default(true),
}).unknown();

const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config: AppConfig = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  host: envVars.HOST,
  apiVersion: envVars.API_VERSION,
  
  database: {
    host: envVars.DB_HOST,
    port: envVars.DB_PORT,
    name: envVars.DB_NAME,
    username: envVars.DB_USERNAME,
    password: envVars.DB_PASSWORD,
    dialect: 'postgres' as const,
    logging: envVars.NODE_ENV === 'development',
    pool: {
      max: envVars.DB_POOL_MAX,
      min: envVars.DB_POOL_MIN,
      acquire: envVars.DB_POOL_ACQUIRE,
      idle: envVars.DB_POOL_IDLE,
    },
  },
  
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
    refreshSecret: envVars.JWT_REFRESH_SECRET,
    refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
  },
  
  cookie: {
    secret: envVars.COOKIE_SECRET,
    expiresIn: envVars.COOKIE_EXPIRES_IN,
    options: {
      httpOnly: true,
      secure: envVars.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: envVars.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000, // Convert days to milliseconds
    },
  },
  
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD || undefined,
    db: envVars.REDIS_DB,
    url: `redis://${envVars.REDIS_PASSWORD ? `:${envVars.REDIS_PASSWORD}@` : ''}${envVars.REDIS_HOST}:${envVars.REDIS_PORT}/${envVars.REDIS_DB}`,
  },
  
  cors: {
    origin: envVars.CORS_ORIGIN.split(',').map((origin: string) => origin.trim()),
    credentials: envVars.CORS_CREDENTIALS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  
  upload: {
    path: envVars.UPLOAD_PATH,
    maxFileSize: envVars.MAX_FILE_SIZE,
    allowedTypes: envVars.ALLOWED_FILE_TYPES.split(',').map((type: string) => type.trim()),
  },
  
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    max: envVars.RATE_LIMIT_MAX_REQUESTS,
    login: {
      windowMs: envVars.RATE_LIMIT_LOGIN_WINDOW_MS,
      max: envVars.RATE_LIMIT_LOGIN_MAX_REQUESTS,
    },
    signup: {
      windowMs: envVars.RATE_LIMIT_SIGNUP_WINDOW_MS,
      max: envVars.RATE_LIMIT_SIGNUP_MAX_REQUESTS,
    },
  },
  
  logging: {
    level: envVars.LOG_LEVEL,
    file: envVars.LOG_FILE,
    maxSize: envVars.LOG_MAX_SIZE,
    maxFiles: envVars.LOG_MAX_FILES,
  },
  
  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    password: {
      minLength: envVars.PASSWORD_MIN_LENGTH,
      requireUppercase: envVars.PASSWORD_REQUIRE_UPPERCASE,
      requireLowercase: envVars.PASSWORD_REQUIRE_LOWERCASE,
      requireNumbers: envVars.PASSWORD_REQUIRE_NUMBERS,
      requireSymbols: envVars.PASSWORD_REQUIRE_SYMBOLS,
    },
  },
  
  swagger: {
    title: envVars.SWAGGER_TITLE || 'Groupomania API',
    description: envVars.SWAGGER_DESCRIPTION || 'Enterprise Social Network API',
    version: envVars.SWAGGER_VERSION || '3.0.0',
    contact: {
      name: envVars.SWAGGER_CONTACT_NAME || 'Groupomania Development Team',
      email: envVars.SWAGGER_CONTACT_EMAIL || 'dev@groupomania.com',
    },
  },
  
  monitoring: {
    healthEndpoint: envVars.HEALTH_CHECK_ENDPOINT || '/health',
    metricsEndpoint: envVars.METRICS_ENDPOINT || '/metrics',
  },
};

export default config;
