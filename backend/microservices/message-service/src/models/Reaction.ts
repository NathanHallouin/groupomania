import { Model, Table, Column, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, Index, Unique } from 'sequelize-typescript';
import { ReactionAttributes, ReactionType } from '../types';
import { Message } from './Message';

/**
 * Modèle Reaction - Représente une réaction à un message
 */
@Table({
  tableName: 'reactions',
  timestamps: true,
  indexes: [
    { fields: ['messageId', 'userId'], unique: true },
    { fields: ['messageId'] },
    { fields: ['userId'] },
    { fields: ['type'] },
  ],
})
export class Reaction extends Model<ReactionAttributes> implements ReactionAttributes {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id!: number;

  @ForeignKey(() => Message)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'ID du message',
  })
  @Index
  public messageId!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'ID de l\'utilisateur qui a réagi',
  })
  @Index
  public userId!: number;

  @Column({
    type: DataType.ENUM('like', 'love', 'laugh', 'wow', 'sad', 'angry'),
    allowNull: false,
    comment: 'Type de réaction',
  })
  @Index
  public type!: ReactionType;

  // Timestamps automatiques
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relations
  @BelongsTo(() => Message)
  public message!: Message;

  /**
   * Obtenir l'emoji correspondant au type de réaction
   */
  public get emoji(): string {
    const emojiMap: Record<ReactionType, string> = {
      like: '👍',
      love: '❤️',
      laugh: '😂',
      wow: '😮',
      sad: '😢',
      angry: '😠',
    };

    return emojiMap[this.type];
  }

  /**
   * Obtenir le label de la réaction
   */
  public get label(): string {
    const labelMap: Record<ReactionType, string> = {
      like: 'J\'aime',
      love: 'J\'adore',
      laugh: 'Rigolo',
      wow: 'Wow',
      sad: 'Triste',
      angry: 'En colère',
    };

    return labelMap[this.type];
  }

  /**
   * Sérialisation pour API publique
   */
  public toPublicJSON(): any {
    return {
      id: this.id,
      messageId: this.messageId,
      userId: this.userId,
      type: this.type,
      emoji: this.emoji,
      label: this.label,
      createdAt: this.createdAt,
    };
  }

  /**
   * Sérialisation pour WebSocket
   */
  public toSocketJSON(): any {
    return {
      id: this.id,
      messageId: this.messageId,
      userId: this.userId,
      type: this.type,
      emoji: this.emoji,
    };
  }
}
