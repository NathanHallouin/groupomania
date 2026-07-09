import { Config } from '../types';

/**
 * Validate required environment variables
 */
const validateRequiredEnvVars = (config: Config): void => {
  const requiredVars = [
    'server.port',
    'database.host',
    'database.database',
    'jwt.secret',
  ];
  
  for (const varPath of requiredVars) {
    const keys = varPath.split('.');
    let value: any = config;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    if (value === undefined || value === '') {
      throw new Error(`Missing configuration variable: ${varPath}`);
    }
  }
};

/**
 * File Service application configuration
 */
export const config: Config = {
  // Environment
  nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',

  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3004', 10),
    host: process.env.HOST || 'localhost',
    env: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  },
  
  // PostgreSQL database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'groupomania_files',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    sync: process.env.DB_SYNC === 'true',
  },
  
  // JWT configuration (must match the Auth Service)
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  },
  
  // Redis configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '2', 10),
  },
  
  // Upload configuration
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB by default
    maxFiles: parseInt(process.env.MAX_FILES || '10', 10),
    allowedTypes: (process.env.ALLOWED_TYPES || 'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(','),
    destination: process.env.UPLOAD_DESTINATION || 'uploads/',
    tempDirectory: process.env.TEMP_DIRECTORY || 'temp/',
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL || '60', 10), // 60 minutes
  },

  // Image processing configuration
  image: {
    quality: parseInt(process.env.IMAGE_QUALITY || '80', 10),
    thumbnailSize: parseInt(process.env.THUMBNAIL_SIZE || '200', 10),
    maxDimensions: {
      width: parseInt(process.env.MAX_IMAGE_WIDTH || '4096', 10),
      height: parseInt(process.env.MAX_IMAGE_HEIGHT || '4096', 10),
      aspectRatio: 0, // Calculé dynamiquement
    },
    formats: (process.env.IMAGE_FORMATS || 'jpeg,png,webp').split(','),
    enableWatermark: process.env.ENABLE_WATERMARK === 'true',
    watermarkText: process.env.WATERMARK_TEXT || 'Groupomania',
  },
  
  // Video configuration
  video: {
    maxDuration: parseInt(process.env.MAX_VIDEO_DURATION || '600', 10), // 10 minutes
    maxSize: parseInt(process.env.MAX_VIDEO_SIZE || '524288000', 10), // 500MB
    allowedFormats: (process.env.VIDEO_FORMATS || 'mp4,webm,ogg').split(','),
    thumbnailTimestamp: parseInt(process.env.VIDEO_THUMBNAIL_TIME || '5', 10), // 5 seconds
  },

  // Security configuration
  security: {
    enableScanning: process.env.ENABLE_VIRUS_SCAN === 'true',
    quarantinePath: process.env.QUARANTINE_PATH || 'quarantine/',
    maxScanSize: parseInt(process.env.MAX_SCAN_SIZE || '104857600', 10), // 100MB
    allowExecutables: process.env.ALLOW_EXECUTABLES === 'true',
  },
  
  // Storage configuration
  storage: {
    local: {
      uploadPath: process.env.LOCAL_UPLOAD_PATH || 'uploads/',
      publicPath: process.env.LOCAL_PUBLIC_PATH || '/uploads',
      maxSize: parseInt(process.env.LOCAL_MAX_SIZE || '1073741824', 10), // 1GB
    },
    s3: process.env.AWS_S3_BUCKET ? {
      bucket: process.env.AWS_S3_BUCKET,
      region: process.env.AWS_S3_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      publicUrl: process.env.AWS_S3_PUBLIC_URL,
    } : undefined,
    gcs: process.env.GCS_BUCKET ? {
      projectId: process.env.GCS_PROJECT_ID || '',
      keyFilename: process.env.GCS_KEY_FILENAME || '',
      bucket: process.env.GCS_BUCKET,
      publicUrl: process.env.GCS_PUBLIC_URL,
    } : undefined,
  },
  
  // CORS configuration
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  
  // Monitoring configuration
  monitoring: {
    healthEndpoint: process.env.HEALTH_ENDPOINT || '/health',
    metricsEndpoint: process.env.METRICS_ENDPOINT || '/metrics',
  },
  
  // Backward compatibility properties for middlewares
  uploadPath: process.env.UPLOAD_PATH || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
};

// Calculate max aspect ratio
config.image.maxDimensions.aspectRatio = config.image.maxDimensions.width / config.image.maxDimensions.height;

// Validate configuration
if (config.nodeEnv !== 'test') {
  try {
    validateRequiredEnvVars(config);
    console.log('✅ Configuration validated successfully');
  } catch (error) {
    console.error('❌ Configuration error:', error.message);
    process.exit(1);
  }
}

export default config;
