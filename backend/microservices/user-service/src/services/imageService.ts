import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { Request } from 'express';
import { config } from '../config/config';
import { AppError } from '../middleware/auth';

/**
 * Interface for resize options
 */
interface ResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Image and upload management service
 */
export class ImageService {
  private uploadPath: string;

  constructor() {
    this.uploadPath = config.upload.destination;
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadPath);
    } catch {
      await fs.mkdir(this.uploadPath, { recursive: true });
      console.log(`📁 Upload folder created: ${this.uploadPath}`);
    }
  }

  /**
   * Multer configuration for memory upload
   */
  public getMulterConfig() {
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: config.upload.maxFileSize,
        files: 1,
      },
      fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        // Check MIME type
        if (!config.upload.allowedTypes.includes(file.mimetype)) {
          cb(new AppError(
            `File type not allowed. Accepted types: ${config.upload.allowedTypes.join(', ')}`,
            400
          ));
          return;
        }

        // Check extension
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
          cb(new AppError(
            `File extension not allowed. Accepted extensions: ${allowedExtensions.join(', ')}`,
            400
          ));
          return;
        }

        cb(null, true);
      },
    });
  }

  /**
   * Resize and optimize an image
   */
  public async processImage(
    buffer: Buffer,
    filename: string,
    options: ResizeOptions = {}
  ): Promise<string> {
    try {
      const {
        width = 400,
        height = 400,
        quality = 85,
        format = 'webp'
      } = options;

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2);
      const processedFilename = `${timestamp}-${randomString}.${format}`;
      const outputPath = path.join(this.uploadPath, processedFilename);

      // Process image with Sharp
      await sharp(buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .toFormat(format, { quality })
        .toFile(outputPath);

      console.log(`✅ Image processed: ${processedFilename}`);
      return processedFilename;

    } catch (error) {
      console.error('❌ Error processing image:', error);
      throw new AppError('Error processing image', 500);
    }
  }

  /**
   * Create multiple avatar sizes
   */
  public async createAvatarSizes(buffer: Buffer, baseFilename: string): Promise<{
    thumbnail: string;
    medium: string;
    large: string;
  }> {
    try {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2);
      const baseName = `${timestamp}-${randomString}`;

      const sizes = await Promise.all([
        // Thumbnail: 64x64
        this.processImage(buffer, `${baseName}-thumb`, {
          width: 64,
          height: 64,
          quality: 80,
          format: 'webp'
        }),
        // Medium: 200x200  
        this.processImage(buffer, `${baseName}-medium`, {
          width: 200,
          height: 200,
          quality: 85,
          format: 'webp'
        }),
        // Large: 400x400
        this.processImage(buffer, `${baseName}-large`, {
          width: 400,
          height: 400,
          quality: 90,
          format: 'webp'
        }),
      ]);

      return {
        thumbnail: sizes[0],
        medium: sizes[1],
        large: sizes[2],
      };

    } catch (error) {
      console.error('❌ Error creating avatar sizes:', error);
      throw new AppError('Error creating avatars', 500);
    }
  }

  /**
   * Delete an image file
   */
  public async deleteImage(filename: string): Promise<void> {
    try {
      if (!filename) return;

      const filePath = path.join(this.uploadPath, filename);

      try {
        await fs.unlink(filePath);
        console.log(`🗑️  Image deleted: ${filename}`);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // File does not exist, no error
      }
    } catch (error) {
      console.error('❌ Error deleting image:', error);
      // Do not throw error for file deletion
    }
  }

  /**
   * Delete all avatar sizes
   */
  public async deleteAvatarSizes(avatarData: any): Promise<void> {
    try {
      if (typeof avatarData === 'string') {
        // Old format, just a filename
        await this.deleteImage(avatarData);
      } else if (avatarData && typeof avatarData === 'object') {
        // New format with multiple sizes
        const { thumbnail, medium, large } = avatarData;
        await Promise.all([
          this.deleteImage(thumbnail),
          this.deleteImage(medium),
          this.deleteImage(large),
        ]);
      }
    } catch (error) {
      console.error('❌ Error deleting avatars:', error);
    }
  }

  /**
   * Validate that a file is a valid image
   */
  public async validateImage(buffer: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(buffer).metadata();
      return !!(metadata.width && metadata.height);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get image metadata
   */
  public async getImageMetadata(buffer: Buffer): Promise<sharp.Metadata> {
    try {
      return await sharp(buffer).metadata();
    } catch (error) {
      throw new AppError('Unable to read image metadata', 400);
    }
  }

  /**
   * Get full avatar URL with fallback
   */
  public getAvatarUrl(avatarData: any, size: 'thumbnail' | 'medium' | 'large' = 'medium'): string {
    try {
      if (!avatarData) {
        return this.getDefaultAvatar();
      }

      if (typeof avatarData === 'string') {
        // Ancien format
        return avatarData.startsWith('http') 
          ? avatarData 
          : `/uploads/avatars/${avatarData}`;
      }

      if (avatarData && typeof avatarData === 'object') {
        // Nouveau format avec tailles
        const filename = avatarData[size];
        if (filename) {
          return `/uploads/avatars/${filename}`;
        }
      }

      return this.getDefaultAvatar();
    } catch (error) {
      return this.getDefaultAvatar();
    }
  }

  /**
   * Get default avatar (Gravatar)
   */
  private getDefaultAvatar(email?: string): string {
    if (email) {
      const crypto = require('crypto');
      const hash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
      return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
    }
    return 'https://www.gravatar.com/avatar/default?d=identicon&s=200';
  }
}
