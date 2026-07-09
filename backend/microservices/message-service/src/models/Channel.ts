import { Model, Table, Column, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, HasMany, BeforeCreate, Index, Unique } from 'sequelize-typescript';
import { ChannelAttributes, ChannelType, ChannelStatus, ChannelSettings } from '../types';
import { Message } from './Message';
import { ChannelMember } from './ChannelMember';

/**
 * Channel Model - Represents a communication channel
 */
@Table({
  tableName: 'channels',
  timestamps: true,
  paranoid: true, // Soft delete
  indexes: [
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['ownerId'] },
    { fields: ['isPrivate'] },
    { fields: ['createdAt'] },
  ],
})
export class Channel extends Model<ChannelAttributes> implements ChannelAttributes {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id!: number;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    comment: 'Channel name',
    validate: {
      len: [2, 100],
      notEmpty: true,
    },
  })
  public name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    comment: 'Channel description',
    validate: {
      len: [0, 500],
    },
  })
  public description?: string;

  @Column({
    type: DataType.ENUM('public', 'private', 'direct', 'group'),
    allowNull: false,
    defaultValue: 'public',
    comment: 'Channel type',
  })
  @Index
  public type!: ChannelType;

  @Column({
    type: DataType.ENUM('active', 'archived', 'deleted'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Channel status',
  })
  @Index
  public status!: ChannelStatus;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'Channel owner ID',
  })
  @Index
  public ownerId!: number;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Private channel (invitation required)',
  })
  @Index
  public isPrivate!: boolean;

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    comment: 'Maximum number of members',
    validate: {
      min: 2,
      max: 10000,
    },
  })
  public maxMembers?: number;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
    comment: 'Channel settings',
  })
  public settings?: ChannelSettings;

  // Automatic timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt?: Date;

  // Relations
  @HasMany(() => Message)
  public messages!: Message[];

  @HasMany(() => ChannelMember)
  public members!: ChannelMember[];

  /**
   * Before create hook - initialize default settings
   */
  @BeforeCreate
  static initializeDefaults(instance: Channel): void {
    if (!instance.settings) {
      instance.settings = {
        allowFileUploads: true,
        allowExternalLinks: true,
        moderateMessages: false,
        slowMode: 0,
      };
    }

    // Type-specific validation
    if (instance.type === 'direct' && !instance.maxMembers) {
      instance.maxMembers = 2;
    }
  }

  /**
   * Get settings with default values
   */
  public getSettingsWithDefaults(): ChannelSettings {
    return {
      allowFileUploads: true,
      allowExternalLinks: true,
      moderateMessages: false,
      slowMode: 0,
      ...this.settings,
    };
  }

  /**
   * Check if a user can post in the channel
   */
  public canUserPost(userId: number, userRole: string): boolean {
    // Deleted or archived channel
    if (this.status !== 'active') {
      return false;
    }

    // Owner and admins can always post
    if (this.ownerId === userId || userRole === 'admin') {
      return true;
    }

    // Check if the user is a member
    const member = this.members?.find(m => m.userId === userId);
    if (!member || member.isBlocked) {
      return false;
    }

    // Check if the channel is in muted mode
    if (member.isMuted) {
      return false;
    }

    return true;
  }

  /**
   * Check if a user can view the channel
   */
  public canUserView(userId: number, userRole: string): boolean {
    // Public channel - everyone can view
    if (!this.isPrivate && this.status === 'active') {
      return true;
    }

    // Owner and admins can always view
    if (this.ownerId === userId || userRole === 'admin') {
      return true;
    }

    // Private channel - check membership
    if (this.isPrivate) {
      const member = this.members?.find(m => m.userId === userId);
      return !!member;
    }

    return false;
  }

  /**
   * Get the number of members
   */
  public get memberCount(): number {
    return this.members?.length || 0;
  }

  /**
   * Get the number of messages
   */
  public get messageCount(): number {
    return this.messages?.length || 0;
  }

  /**
   * Check if the channel is full
   */
  public get isFull(): boolean {
    if (!this.maxMembers) {
      return false;
    }
    return this.memberCount >= this.maxMembers;
  }

  /**
   * Get the last message
   */
  public get lastMessage(): Message | undefined {
    if (!this.messages || this.messages.length === 0) {
      return undefined;
    }

    return this.messages.reduce((latest, current) => {
      return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
    });
  }

  /**
   * Generate a unique name for direct channels
   */
  public static generateDirectChannelName(userId1: number, userId2: number): string {
    const [smaller, larger] = [userId1, userId2].sort((a, b) => a - b);
    return `direct_${smaller}_${larger}`;
  }

  /**
   * Serialization for public API
   */
  public toPublicJSON(): any {
    const lastMessage = this.lastMessage;

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      status: this.status,
      ownerId: this.ownerId,
      isPrivate: this.isPrivate,
      maxMembers: this.maxMembers,
      memberCount: this.memberCount,
      messageCount: this.messageCount,
      isFull: this.isFull,
      settings: this.getSettingsWithDefaults(),
      lastMessage: lastMessage ? {
        id: lastMessage.id,
        content: lastMessage.preview,
        authorId: lastMessage.authorId,
        createdAt: lastMessage.createdAt,
      } : null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Serialization for members (with more info)
   */
  public toMemberJSON(userId: number): any {
    const member = this.members?.find(m => m.userId === userId);

    return {
      ...this.toPublicJSON(),
      memberRole: member?.role || null,
      joinedAt: member?.joinedAt || null,
      lastRead: member?.lastRead || null,
      isMuted: member?.isMuted || false,
      unreadCount: this.getUnreadCount(userId),
    };
  }

  /**
   * Calculate the number of unread messages for a user
   */
  public getUnreadCount(userId: number): number {
    const member = this.members?.find(m => m.userId === userId);
    if (!member || !member.lastRead) {
      return this.messageCount;
    }

    if (!this.messages) {
      return 0;
    }

    return this.messages.filter(message =>
      new Date(message.createdAt) > new Date(member.lastRead!)
    ).length;
  }

  /**
   * Serialization for WebSocket
   */
  public toSocketJSON(): any {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      memberCount: this.memberCount,
      updatedAt: this.updatedAt,
    };
  }
}
