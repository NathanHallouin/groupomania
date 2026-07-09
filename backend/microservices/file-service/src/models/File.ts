import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  Index,
  BeforeCreate,
  BeforeUpdate,
  AfterCreate,
  AfterUpdate,
  AfterDestroy,
} from 'sequelize-typescript';
import {
  FileAttributes,
  FileType,
  FileStatus,
  SecurityLevel,
  FileMetadata,
} from '../types';
import * as crypto from 'crypto';
import * as fs from 'fs-extra';
import * as path from 'path';

@Table({
  tableName: 'files',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['filename'] },
    { fields: ['type'] },
    { fields: ['uploadedBy'] },
    { fields: ['status'] },
    { fields: ['mimeType'] },
    { fields: ['checksum'], unique: true },
    { fields: ['securityLevel'] },
    { fields: ['createdAt'] },
    { fields: ['isPublic'] },
  ],
})
export class File extends Model<FileAttributes> implements FileAttributes {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255],
    },
  })
  filename!: string;

  @Column({
    type: DataType.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 500],
    },
  })
  originalName!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  })
  path!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  url?: string;

  @Index
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  })
  mimeType!: string;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    validate: {
      min: 0,
    },
  })
  size!: number;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(FileType)),
    allowNull: false,
    defaultValue: FileType.OTHER,
  })
  type!: FileType;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(FileStatus)),
    allowNull: false,
    defaultValue: FileStatus.UPLOADING,
  })
  status!: FileStatus;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(SecurityLevel)),
    allowNull: false,
    defaultValue: SecurityLevel.PRIVATE,
  })
  securityLevel!: SecurityLevel;

  @Index
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  })
  uploadedBy!: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  metadata?: FileMetadata;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  })
  downloadCount!: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastAccessedAt?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  expiresAt?: Date;

  @Index
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  })
  isPublic!: boolean;

  @Index
  @Column({
    type: DataType.STRING(64),
    allowNull: true,
    unique: true,
  })
  checksum?: string;

  @CreatedAt
  @Index
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;

  @DeletedAt
  @Column(DataType.DATE)
  deletedAt?: Date;

  /**
   * Hook before creation
   */
  @BeforeCreate
  static async beforeCreateHook(file: File): Promise<void> {
    // Generate checksum if the file exists
    if (fs.existsSync(file.path)) {
      file.checksum = await File.generateChecksum(file.path);
    }

    // Set the URL if the file is public
    if (file.isPublic) {
      file.url = File.generatePublicUrl(file.filename);
    }

    // Detect file type based on MIME type
    file.type = File.detectFileType(file.mimeType);
  }

  /**
   * Hook before update
   */
  @BeforeUpdate
  static async beforeUpdateHook(file: File): Promise<void> {
    // Update URL if necessary
    if (file.isPublic && !file.url) {
      file.url = File.generatePublicUrl(file.filename);
    } else if (!file.isPublic && file.url) {
      file.url = undefined;
    }
  }

  /**
   * Hook after creation
   */
  @AfterCreate
  static async afterCreateHook(file: File): Promise<void> {
    console.log(`✅ File created: ${file.filename} (ID: ${file.id})`);
  }

  /**
   * Hook after update
   */
  @AfterUpdate
  static async afterUpdateHook(file: File): Promise<void> {
    console.log(`🔄 File updated: ${file.filename} (ID: ${file.id})`);
  }

  /**
   * Hook after deletion
   */
  @AfterDestroy
  static async afterDestroyHook(file: File): Promise<void> {
    try {
      // Delete the physical file
      if (fs.existsSync(file.path)) {
        await fs.remove(file.path);
        console.log(`🗑️ Physical file deleted: ${file.path}`);
      }

      // Delete thumbnails and derived files
      const thumbnailPath = File.getThumbnailPath(file.path);
      if (fs.existsSync(thumbnailPath)) {
        await fs.remove(thumbnailPath);
      }
    } catch (error) {
      console.error(`❌ Error while deleting file ${file.path}:`, error);
    }
  }

  /**
   * Generate file checksum
   */
  static async generateChecksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Generate public URL for a file
   */
  static generatePublicUrl(filename: string): string {
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3004';
    return `${baseUrl}/uploads/${filename}`;
  }

  /**
   * Detect file type based on MIME type
   */
  static detectFileType(mimeType: string): FileType {
    if (mimeType.startsWith('image/')) {
      return FileType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return FileType.VIDEO;
    } else if (mimeType.startsWith('audio/')) {
      return FileType.AUDIO;
    } else if (
      mimeType === 'application/pdf' ||
      mimeType.includes('document') ||
      mimeType.includes('text') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('presentation')
    ) {
      return FileType.DOCUMENT;
    } else if (
      mimeType === 'application/zip' ||
      mimeType === 'application/x-rar-compressed' ||
      mimeType === 'application/x-tar' ||
      mimeType === 'application/gzip'
    ) {
      return FileType.ARCHIVE;
    }
    return FileType.OTHER;
  }

  /**
   * Get thumbnail path
   */
  static getThumbnailPath(originalPath: string): string {
    const dir = path.dirname(originalPath);
    const name = path.basename(originalPath, path.extname(originalPath));
    const ext = path.extname(originalPath);
    return path.join(dir, 'thumbnails', `${name}_thumb${ext}`);
  }

  /**
   * Check if the file has expired
   */
  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  /**
   * Check if the file is an image
   */
  isImage(): boolean {
    return this.type === FileType.IMAGE;
  }

  /**
   * Check if the file is a video
   */
  isVideo(): boolean {
    return this.type === FileType.VIDEO;
  }

  /**
   * Check if the file is a document
   */
  isDocument(): boolean {
    return this.type === FileType.DOCUMENT;
  }

  /**
   * Get formatted file size
   */
  getFormattedSize(): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (this.size === 0) return '0 B';
    const i = Math.floor(Math.log(this.size) / Math.log(1024));
    return Math.round(this.size / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Increment download counter
   */
  async incrementDownloadCount(): Promise<void> {
    this.downloadCount += 1;
    this.lastAccessedAt = new Date();
    await this.save();
  }

  /**
   * Get file extension
   */
  getExtension(): string {
    return path.extname(this.filename).toLowerCase();
  }

  /**
   * Check access permissions
   */
  canAccess(userId: number, userRole: string): boolean {
    // The uploader always has access
    if (this.uploadedBy === userId) {
      return true;
    }

    // Admins have access to everything
    if (userRole === 'admin') {
      return true;
    }

    // Public files are accessible to everyone
    if (this.isPublic) {
      return true;
    }

    // Private files only for the owner
    return false;
  }

  /**
   * Convert to JSON format for the API
   */
  toJSON(): Partial<FileAttributes> {
    const json = super.toJSON() as FileAttributes;

    // Add computed properties
    return {
      ...json,
      formattedSize: this.getFormattedSize(),
      extension: this.getExtension(),
      isExpired: this.isExpired(),
      thumbnailUrl: this.isImage() ? File.generatePublicUrl(`thumbnails/${this.filename}`) : undefined,
    };
  }
}
