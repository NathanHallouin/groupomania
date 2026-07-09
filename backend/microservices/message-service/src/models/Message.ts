import { Model, Table, Column, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany, BeforeCreate, BeforeUpdate, Index } from 'sequelize-typescript';
import { MessageAttributes, MessageType, MessageStatus, MessageMetadata } from '../types';
import { Channel } from './Channel';
import { Reaction } from './Reaction';
import sanitizeHtml from 'sanitize-html';

/**
 * Message Model - Represents a message in a channel
 */
@Table({
  tableName: 'messages',
  timestamps: true,
  paranoid: true, // Soft delete for history preservation
  indexes: [
    { fields: ['channelId', 'createdAt'] },
    { fields: ['authorId'] },
    { fields: ['parentId'] },
    { fields: ['threadId'] },
    { fields: ['status'] },
    { fields: ['type'] },
  ],
})
export class Message extends Model<MessageAttributes> implements MessageAttributes {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id!: number;

  @ForeignKey(() => Channel)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'ID of the channel where the message is posted',
  })
  public channelId!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'ID of the message author',
  })
  @Index
  public authorId!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
    comment: 'Message content',
    validate: {
      len: [1, 4000], // Limit of 4000 characters
    },
  })
  public content!: string;

  @Column({
    type: DataType.ENUM('text', 'image', 'file', 'link', 'system'),
    allowNull: false,
    defaultValue: 'text',
    comment: 'Message type',
  })
  public type!: MessageType;

  @Column({
    type: DataType.ENUM('sent', 'delivered', 'read', 'deleted'),
    allowNull: false,
    defaultValue: 'sent',
    comment: 'Message status',
  })
  public status!: MessageStatus;

  @ForeignKey(() => Message)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'ID of the parent message (for replies)',
  })
  @Index
  public parentId?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Thread ID',
  })
  @Index
  public threadId?: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'Message metadata (attachments, mentions, links)',
  })
  public metadata?: MessageMetadata;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Last modification date',
  })
  public editedAt?: Date;

  // Automatic timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;

  // Relations
  @BelongsTo(() => Channel)
  public channel!: Channel;

  @BelongsTo(() => Message, { foreignKey: 'parentId', as: 'parent' })
  public parent?: Message;

  @HasMany(() => Message, { foreignKey: 'parentId', as: 'replies' })
  public replies!: Message[];

  @HasMany(() => Reaction)
  public reactions!: Reaction[];

  /**
   * Before create hook - sanitize content
   */
  @BeforeCreate
  static sanitizeContent(instance: Message): void {
    if (instance.content) {
      instance.content = sanitizeHtml(instance.content, {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'br', 'p', 'ul', 'ol', 'li', 'code', 'pre'],
        allowedAttributes: {
          'a': ['href'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
      }).trim();
    }

    // Automatically detect mentions
    if (instance.content && instance.type === 'text') {
      const mentions = instance.extractMentions();
      if (mentions.length > 0) {
        instance.metadata = {
          ...instance.metadata,
          mentions,
        };
      }
    }
  }

  /**
   * Before update hook
   */
  @BeforeUpdate
  static updateEditTimestamp(instance: Message): void {
    if (instance.changed('content')) {
      instance.editedAt = new Date();

      // Sanitize the new content
      Message.sanitizeContent(instance);

      // Save edit history
      if (!instance.metadata) {
        instance.metadata = {};
      }
      if (!instance.metadata.editHistory) {
        instance.metadata.editHistory = [];
      }

      instance.metadata.editHistory.push({
        content: instance.getDataValue('content'),
        editedAt: new Date(),
        editedBy: instance.authorId,
      });

      instance.metadata.edited = true;
    }
  }

  /**
   * Extract user mentions from content
   */
  public extractMentions(): number[] {
    const mentionRegex = /@(\d+)/g;
    const mentions: number[] = [];
    let match;

    while ((match = mentionRegex.exec(this.content)) !== null) {
      const userId = parseInt(match[1], 10);
      if (!mentions.includes(userId)) {
        mentions.push(userId);
      }
    }

    return mentions;
  }

  /**
   * Extract links from content
   */
  public extractLinks(): string[] {
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    return this.content.match(urlRegex) || [];
  }

  /**
   * Mark as read by a user
   */
  public async markAsRead(userId: number): Promise<void> {
    // Logic for marking as read
    // Can be implemented via a separate MessageRead model
  }

  /**
   * Check if the message can be edited by a user
   */
  public canEdit(userId: number, userRole: string): boolean {
    // The author can edit within 15 minutes after creation
    const editWindow = 15 * 60 * 1000; // 15 minutes in milliseconds
    const canEditTime = new Date(this.createdAt.getTime() + editWindow);

    if (this.authorId === userId && new Date() <= canEditTime) {
      return true;
    }

    // Admins can always edit
    return userRole === 'admin';
  }

  /**
   * Check if the message can be deleted by a user
   */
  public canDelete(userId: number, userRole: string): boolean {
    // The author can always delete
    if (this.authorId === userId) {
      return true;
    }

    // Admins and moderators can delete
    return ['admin', 'moderator'].includes(userRole);
  }

  /**
   * Get a short preview of the message
   */
  public get preview(): string {
    const maxLength = 100;
    const cleanContent = this.content.replace(/<[^>]*>/g, ''); // Remove HTML tags

    if (cleanContent.length <= maxLength) {
      return cleanContent;
    }

    return cleanContent.substring(0, maxLength) + '...';
  }

  /**
   * Count reactions by type
   */
  public get reactionCounts(): Record<string, number> {
    if (!this.reactions) {
      return {};
    }

    return this.reactions.reduce((counts, reaction) => {
      counts[reaction.type] = (counts[reaction.type] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  /**
   * Serialization for public API
   */
  public toPublicJSON(): any {
    return {
      id: this.id,
      channelId: this.channelId,
      authorId: this.authorId,
      content: this.content,
      type: this.type,
      status: this.status,
      parentId: this.parentId,
      threadId: this.threadId,
      metadata: this.metadata,
      editedAt: this.editedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      preview: this.preview,
      reactionCounts: this.reactionCounts,
      canEdit: false, // Will be calculated dynamically
      canDelete: false, // Will be calculated dynamically
    };
  }

  /**
   * Serialization for WebSocket
   */
  public toSocketJSON(): any {
    return {
      id: this.id,
      channelId: this.channelId,
      authorId: this.authorId,
      content: this.content,
      type: this.type,
      metadata: this.metadata,
      createdAt: this.createdAt,
      editedAt: this.editedAt,
    };
  }
}
