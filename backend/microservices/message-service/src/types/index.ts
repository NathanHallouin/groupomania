/**
 * Global types for the message service
 */

import { Request } from 'express';

/**
 * Message types
 */
export type MessageType = 'text' | 'image' | 'file' | 'link' | 'system';

/**
 * Message statuses
 */
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'deleted';

/**
 * Reaction types
 */
export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';

/**
 * Channel types
 */
export enum ChannelType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  DIRECT = 'direct',
  GROUP = 'group'
}

/**
 * Channel statuses
 */
export type ChannelStatus = 'active' | 'archived' | 'deleted';

/**
 * Channel roles
 */
export type ChannelRole = 'owner' | 'admin' | 'moderator' | 'member';

/**
 * System user roles
 */
export enum UserRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  USER = 'user'
}

/**
 * Channel member roles
 */
export enum ChannelMemberRole {
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  READ_ONLY = 'read_only'
}

/**
 * Notification types
 */
export type NotificationType = 'message' | 'mention' | 'reaction' | 'join' | 'leave';

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
}

/**
 * Express Request interface extension
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
}

/**
 * Interface for message attributes
 */
export interface MessageAttributes {
  id?: number;
  channelId: number;
  authorId: number;
  content: string;
  type: MessageType;
  status: MessageStatus;
  parentId?: number; // For replies
  threadId?: number; // For threads
  metadata?: MessageMetadata;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Message metadata
 */
export interface MessageMetadata {
  attachments?: MessageAttachment[];
  mentions?: number[]; // IDs of mentioned users
  links?: LinkPreview[];
  edited?: boolean;
  editHistory?: EditHistory[];
}

/**
 * Message attachment
 */
export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
}

/**
 * Link preview
 */
export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

/**
 * Edit history
 */
export interface EditHistory {
  content: string;
  editedAt: Date;
  editedBy: number;
}

/**
 * Interface for channel attributes
 */
export interface ChannelAttributes {
  id?: number;
  name: string;
  description?: string;
  type: ChannelType;
  status: ChannelStatus;
  ownerId: number;
  isPrivate: boolean;
  maxMembers?: number;
  settings?: ChannelSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Channel settings
 */
export interface ChannelSettings {
  allowFileUploads: boolean;
  allowExternalLinks: boolean;
  moderateMessages: boolean;
  mutedUntil?: Date;
  slowMode?: number; // Delay in seconds between messages
}

/**
 * Interface for channel member attributes
 */
export interface ChannelMemberAttributes {
  id?: number;
  channelId: number;
  userId: number;
  role: ChannelRole;
  joinedAt: Date;
  lastRead?: Date;
  isMuted: boolean;
  isBlocked: boolean;
}

/**
 * Interface for reaction attributes
 */
export interface ReactionAttributes {
  id?: number;
  messageId: number;
  userId: number;
  type: ReactionType;
  createdAt?: Date;
}

/**
 * Interface for message statistics
 */
export interface MessageStats {
  totalMessages: number;
  messagesThisWeek: number;
  messagesThisMonth: number;
  messagesByType: Record<MessageType, number>;
  messagesByChannel: Record<string, number>;
  activeUsers: number;
  topChannels: Array<{
    channelId: number;
    channelName: string;
    messageCount: number;
  }>;
}

/**
 * Interface for real-time notifications
 */
export interface RealTimeNotification {
  id: string;
  type: NotificationType;
  userId: number;
  channelId?: number;
  messageId?: number;
  data: any;
  timestamp: Date;
}

/**
 * Interface for Socket.IO events
 */
export interface SocketEvents {
  // Client -> Server events
  'join_channel': (channelId: number) => void;
  'leave_channel': (channelId: number) => void;
  'send_message': (messageData: Partial<MessageAttributes>) => void;
  'edit_message': (messageId: number, content: string) => void;
  'delete_message': (messageId: number) => void;
  'add_reaction': (messageId: number, reactionType: ReactionType) => void;
  'remove_reaction': (messageId: number, reactionType: ReactionType) => void;
  'typing_start': (channelId: number) => void;
  'typing_stop': (channelId: number) => void;

  // Server -> Client events
  'message_created': (message: MessageAttributes) => void;
  'message_updated': (message: MessageAttributes) => void;
  'message_deleted': (messageId: number) => void;
  'reaction_added': (messageId: number, reaction: ReactionAttributes) => void;
  'reaction_removed': (messageId: number, reactionId: number) => void;
  'user_typing': (channelId: number, userId: number) => void;
  'user_stopped_typing': (channelId: number, userId: number) => void;
  'channel_updated': (channel: ChannelAttributes) => void;
  'member_joined': (channelId: number, userId: number) => void;
  'member_left': (channelId: number, userId: number) => void;
  'notification': (notification: RealTimeNotification) => void;
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
    allowedTypes: string[];
    destination: string;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimiting: {
    windowMs: number;
    max: number;
  };
  websocket: {
    enabled: boolean;
    transports: string[];
    pingTimeout: number;
    pingInterval: number;
  };
  services: {
    authService: string;
    userService: string;
    fileService: string;
  };
}

/**
 * Interface for message search filters
 */
export interface MessageFilters {
  channelId?: number;
  authorId?: number;
  type?: MessageType;
  content?: string;
  hasAttachments?: boolean;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Interface for channel search filters
 */
export interface ChannelFilters {
  type?: ChannelType;
  status?: ChannelStatus;
  ownerId?: number;
  search?: string;
  isPrivate?: boolean;
}
