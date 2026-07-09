/**
 * Global types for the file service
 */

import { Request } from 'express';

/**
 * Supported file types
 */
export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  OTHER = 'other'
}

/**
 * File status
 */
export enum FileStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  READY = 'ready',
  ERROR = 'error',
  DELETED = 'deleted'
}

/**
 * Image processing types
 */
export enum ImageProcessingType {
  THUMBNAIL = 'thumbnail',
  RESIZE = 'resize',
  COMPRESS = 'compress',
  CROP = 'crop',
  WATERMARK = 'watermark',
  AVATAR = 'avatar'
}

/**
 * File security levels
 */
export enum SecurityLevel {
  PUBLIC = 'public',
  PRIVATE = 'private',
  RESTRICTED = 'restricted',
  CONFIDENTIAL = 'confidential'
}

/**
 * System user roles
 */
export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user'
}

/**
 * Authenticated user
 */
export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Interface for authenticated requests
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

/**
 * Extension of Express Request interface
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Interface for standardized API responses
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

/**
 * Interface for pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Interface for query options
 */
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
  search?: string;
  filter?: Record<string, any>;
}

/**
 * Interface for file attributes
 */
export interface FileAttributes {
  id?: number;
  filename: string;
  originalName: string;
  path: string;
  url?: string;
  mimeType: string;
  size: number;
  type: FileType;
  status: FileStatus;
  securityLevel: SecurityLevel;
  uploadedBy: number;
  metadata?: FileMetadata;
  downloadCount?: number;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  isPublic?: boolean;
  checksum?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

/**
 * File metadata
 */
export interface FileMetadata {
  dimensions?: ImageDimensions;
  duration?: number; // For videos/audio in seconds
  pages?: number; // For PDF documents
  encoding?: string;
  compression?: string;
  quality?: number;
  exif?: ExifData;
  thumbnail?: string;
  preview?: string;
  tags?: string[];
  description?: string;
  author?: string;
  copyright?: string;
  location?: GeoLocation;
  scanned?: boolean; // Antivirus scan
  scanResults?: ScanResults;
}

/**
 * Image dimensions
 */
export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * EXIF data for images
 */
export interface ExifData {
  camera?: string;
  lens?: string;
  iso?: number;
  aperture?: string;
  shutterSpeed?: string;
  focalLength?: string;
  dateTaken?: Date;
  gps?: GeoLocation;
}

/**
 * Geographic location
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

/**
 * Antivirus scan results
 */
export interface ScanResults {
  clean: boolean;
  threats?: string[];
  scanner: string;
  scannedAt: Date;
  version: string;
}

/**
 * Interface for upload options
 */
export interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
  generateThumbnail?: boolean;
  compress?: boolean;
  quality?: number;
  resize?: ImageDimensions;
  watermark?: WatermarkOptions;
  securityLevel?: SecurityLevel;
  expiresIn?: number; // In seconds
  tags?: string[];
  description?: string;
}

/**
 * Watermark options
 */
export interface WatermarkOptions {
  text?: string;
  image?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  size?: number;
}

/**
 * Interface for image processing options
 */
export interface ImageProcessingOptions {
  type?: ImageProcessingType;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  crop?: CropOptions | boolean;
  watermark?: WatermarkOptions;
  effects?: ImageEffect[];
  // Additional properties for the service
  autoRotate?: boolean;
  allowEnlargement?: boolean;
  blur?: number;
  sharpen?: boolean;
  normalize?: boolean;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  tint?: string;
  grayscale?: boolean;
  addWatermark?: boolean;
  watermarkText?: string;
}

/**
 * Crop options
 */
export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Image effects
 */
export interface ImageEffect {
  type: 'blur' | 'sharpen' | 'brightness' | 'contrast' | 'saturation' | 'gamma';
  value: number;
}

/**
 * Interface for file statistics
 */
export interface FileStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<FileType, number>;
  filesByStatus: Record<FileStatus, number>;
  uploadsByDay: Array<{
    date: string;
    count: number;
    size: number;
  }>;
  topFiles: Array<{
    id: number;
    filename: string;
    downloadCount: number;
    size: number;
  }>;
  storageUsageByUser: Array<{
    userId: number;
    fileCount: number;
    totalSize: number;
  }>;
}

/**
 * File processing result
 */
export interface ProcessingResult {
  success: boolean;
  error?: string;
  originalSize: number;
  processedSize: number;
  originalDimensions: { width: number; height: number };
  processedDimensions: { width: number; height: number };
  format: string;
  processingTime: number;
  compressionRatio: number;
}

/**
 * Interface for storage management
 */
export interface StorageProvider {
  name: string;
  upload(file: Buffer, path: string, options?: any): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<boolean>;
  exists(path: string): Promise<boolean>;
  getUrl(path: string): string;
  copy(sourcePath: string, destPath: string): Promise<boolean>;
  move(sourcePath: string, destPath: string): Promise<boolean>;
}

/**
 * Storage provider configuration
 */
export interface StorageConfig {
  local: {
    uploadPath: string;
    publicPath: string;
    maxSize: number;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicUrl?: string;
  };
  gcs?: {
    projectId: string;
    keyFilename: string;
    bucket: string;
    publicUrl?: string;
  };
}

/**
 * Environment configuration
 */
export interface Config {
  nodeEnv: 'development' | 'production' | 'test';
  server: {
    port: number;
    host: string;
    env: 'development' | 'production' | 'test';
  };
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    sync: boolean;
  };
  jwt: {
    secret: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  upload: {
    maxFileSize: number;
    maxFiles: number;
    allowedTypes: string[];
    destination: string;
    tempDirectory: string;
    cleanupInterval: number; // In minutes
  };
  image: {
    quality: number;
    thumbnailSize: number;
    maxDimensions: ImageDimensions;
    formats: string[];
    enableWatermark: boolean;
    watermarkText: string;
  };
  video: {
    maxDuration: number; // In seconds
    maxSize: number;
    allowedFormats: string[];
    thumbnailTimestamp: number; // Second to generate the thumbnail
  };
  security: {
    enableScanning: boolean;
    quarantinePath: string;
    maxScanSize: number;
    allowExecutables: boolean;
  };
  storage: StorageConfig;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  monitoring: {
    healthEndpoint: string;
    metricsEndpoint: string;
  };
  // Backward compatibility properties for middlewares
  uploadPath: string;
  maxFileSize: number;
}

/**
 * Interface for background processing tasks
 */
export interface ProcessingJob {
  id: string;
  fileId: number;
  type: 'image' | 'video' | 'document' | 'scan';
  options: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Interface for file events
 */
export interface FileEvent {
  type: 'upload' | 'download' | 'delete' | 'process' | 'scan';
  fileId: number;
  userId: number;
  timestamp: Date;
  metadata?: any;
}

/**
 * Interface for user quotas
 */
export interface UserQuota {
  userId: number;
  maxFiles: number;
  maxStorage: number; // In bytes
  currentFiles: number;
  currentStorage: number; // In bytes
  allowedTypes: FileType[];
  maxFileSize: number; // In bytes
}

/**
 * Interface for file shares
 */
export interface FileShare {
  id?: number;
  fileId: number;
  sharedBy: number;
  sharedWith?: number; // null pour partage public
  shareToken: string;
  permissions: SharePermission[];
  expiresAt?: Date;
  accessCount: number;
  maxAccess?: number;
  password?: string;
  createdAt?: Date;
}

/**
 * Share permissions
 */
export enum SharePermission {
  VIEW = 'view',
  DOWNLOAD = 'download',
  EDIT = 'edit',
  DELETE = 'delete'
}

/**
 * Interface for file collections
 */
export interface FileCollection {
  id?: number;
  name: string;
  description?: string;
  ownerId: number;
  isPublic: boolean;
  files: number[]; // IDs des fichiers
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export default Config;
