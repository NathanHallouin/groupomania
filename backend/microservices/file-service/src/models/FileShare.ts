import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  ForeignKey,
  BelongsTo,
  BeforeCreate,
  Index,
} from 'sequelize-typescript';
import { FileShare, SharePermission } from '../types';
import { File } from './File';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';

@Table({
  tableName: 'file_shares',
  timestamps: true,
  indexes: [
    { fields: ['shareToken'], unique: true },
    { fields: ['fileId'] },
    { fields: ['sharedBy'] },
    { fields: ['sharedWith'] },
    { fields: ['expiresAt'] },
  ],
})
export class FileShareModel extends Model<FileShare> implements FileShare {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id!: number;

  @ForeignKey(() => File)
  @Index
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    references: {
      model: 'files',
      key: 'id',
    },
    onDelete: 'CASCADE',
  })
  fileId!: number;

  @BelongsTo(() => File)
  file!: File;

  @Index
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    // Relation logique vers l'utilisateur (autre service) — pas de FK base.
  })
  sharedBy!: number;

  @Index
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    // Relation logique vers l'utilisateur (autre service) — pas de FK base.
  })
  sharedWith?: number;

  @Index
  @Column({
    type: DataType.STRING(64),
    allowNull: false,
    unique: true,
  })
  shareToken!: string;

  @Column({
    type: DataType.ARRAY(DataType.ENUM(...Object.values(SharePermission))),
    allowNull: false,
    defaultValue: [SharePermission.VIEW],
  })
  permissions!: SharePermission[];

  @Index
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  expiresAt?: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
    },
  })
  accessCount!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
    },
  })
  maxAccess?: number;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  password?: string;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;

  /**
   * Hook avant création - générer le token de partage
   */
  @BeforeCreate
  static async beforeCreateHook(share: FileShareModel): Promise<void> {
    if (!share.shareToken) {
      share.shareToken = uuidv4();
    }

    // Hasher le mot de passe si fourni
    if (share.password) {
      const salt = await bcrypt.genSalt(10);
      share.password = await bcrypt.hash(share.password, salt);
    }
  }

  /**
   * Vérifier si le partage a expiré
   */
  isExpired(): boolean {
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  /**
   * Vérifier si le nombre maximum d'accès est atteint
   */
  isMaxAccessReached(): boolean {
    return this.maxAccess ? this.accessCount >= this.maxAccess : false;
  }

  /**
   * Vérifier si le partage est encore valide
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isMaxAccessReached();
  }

  /**
   * Vérifier le mot de passe du partage
   */
  async verifyPassword(password: string): Promise<boolean> {
    if (!this.password) return true;
    return await bcrypt.compare(password, this.password);
  }

  /**
   * Vérifier si l'utilisateur a une permission spécifique
   */
  hasPermission(permission: SharePermission): boolean {
    return this.permissions.includes(permission);
  }

  /**
   * Incrémenter le compteur d'accès
   */
  async incrementAccess(): Promise<void> {
    this.accessCount += 1;
    await this.save();
  }

  /**
   * Générer l'URL de partage
   */
  getShareUrl(): string {
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3004';
    return `${baseUrl}/share/${this.shareToken}`;
  }

  /**
   * Convertir en format JSON pour l'API
   */
  toJSON(): Partial<FileShare> {
    const json = super.toJSON() as FileShare;
    
    // Retirer le mot de passe hashé des réponses
    delete json.password;
    
    return {
      ...json,
      shareUrl: this.getShareUrl(),
      isExpired: this.isExpired(),
      isValid: this.isValid(),
      remainingAccess: this.maxAccess ? this.maxAccess - this.accessCount : null,
    };
  }
}
