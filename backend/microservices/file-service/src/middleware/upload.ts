import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { config } from '../config/config';
import { FileType } from '../types';
import { AppError } from './auth';

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = path.join(config.uploadPath, 'temp');
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    // Generate a unique name with timestamp and hash
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

/**
 * File filter with MIME type validation
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  try {
    const allowedMimes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm', 'video/x-msvideo',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm',
      // Documents
      'application/pdf', 'text/plain', 'text/csv',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Archives
      'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
      'application/gzip', 'application/x-tar'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type not allowed: ${file.mimetype}`, 400));
    }
  } catch (error) {
    cb(new AppError('Error during file validation', 500));
  }
};

/**
 * Main Multer configuration
 */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize,
    files: 10, // Maximum 10 files at once
    fields: 20,
    fieldNameSize: 100,
    fieldSize: 1024 * 1024 // 1MB for fields
  }
});

/**
 * Detects file type based on MIME type
 */
export const detectFileType = (mimetype: string): FileType => {
  if (mimetype.startsWith('image/')) return FileType.IMAGE;
  if (mimetype.startsWith('video/')) return FileType.VIDEO;
  if (mimetype.startsWith('audio/')) return FileType.AUDIO;
  if (mimetype === 'application/pdf' || 
      mimetype.includes('document') || 
      mimetype.includes('sheet') || 
      mimetype.includes('presentation') ||
      mimetype.startsWith('text/')) return FileType.DOCUMENT;
  if (mimetype.includes('zip') || 
      mimetype.includes('rar') || 
      mimetype.includes('tar') || 
      mimetype.includes('7z')) return FileType.ARCHIVE;
  return FileType.OTHER;
};

/**
 * Upload validation middleware
 */
export const validateUpload = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
      res.status(400).json({
        success: false,
        message: 'No file provided'
      });
      return;
    }

    // Check if the user is authenticated
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required for upload'
      });
      return;
    }

    // Additional file validation
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();

    for (const file of files) {
      if (!file) continue;

      // Check file size
      if (file.size > config.maxFileSize) {
        res.status(400).json({
          success: false,
          message: `File too large: ${file.originalname}. Maximum size: ${config.maxFileSize / (1024 * 1024)}MB`
        });
        return;
      }

      // Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      const dangerousExts = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];

      if (dangerousExts.includes(ext)) {
        res.status(400).json({
          success: false,
          message: `Dangerous file extension: ${ext}`
        });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('Upload validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during file validation'
    });
  }
};

/**
 * Middleware to clean up temporary files on error
 */
export const cleanupTempFiles = (req: Request, res: Response, next: NextFunction): void => {
  const originalSend = res.send;

  res.send = function(body) {
    // If error, clean up temporary files
    if (res.statusCode >= 400 && req.files) {
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();

      files.forEach(async (file) => {
        if (file && file.path) {
          try {
            await fs.unlink(file.path);
          } catch (error) {
            console.error('Error while cleaning up temporary file:', error);
          }
        }
      });
    }

    return originalSend.call(this, body);
  };

  next();
};

/**
 * Specialized middleware for images
 */
export const uploadImage = upload.single('image');
export const uploadImages = upload.array('images', 10);

/**
 * Specialized middleware for documents
 */
export const uploadDocument = upload.single('document');
export const uploadDocuments = upload.array('documents', 5);

/**
 * General middleware for any file type
 */
export const uploadAny = upload.any();

/**
 * Middleware for forms with files
 */
export const uploadFields = upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'documents', maxCount: 5 },
  { name: 'videos', maxCount: 3 },
  { name: 'audio', maxCount: 5 }
]);
