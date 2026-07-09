/**
 * @fileoverview Type definitions for the Groupomania frontend application.
 * Contains interfaces for users, authentication, channels, messages, and API responses.
 */

// ============================================================================
// User Types
// ============================================================================

/**
 * Represents a user in the system.
 */
export interface User {
  /** Unique identifier */
  id: number;
  /** User's email address */
  email: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** Department the user belongs to */
  department?: string;
  /** Job position/title */
  position?: string;
  /** User's role in the system */
  role: 'employee' | 'admin';
  /** Account status */
  status?: 'active' | 'inactive' | 'suspended';
  /** Whether the account is active */
  isActive: boolean;
  /** User's avatar images in different sizes */
  avatar?: {
    thumbnail: string;
    medium: string;
    large: string;
  };
  /** User's biography/description */
  bio?: string;
  /** Phone number */
  phone?: string;
  /** Geographic location */
  location?: string;
  /** Date of birth (ISO string) */
  birthDate?: string;
  /** User preferences */
  preferences?: UserPreferences;
  /** Account creation date (ISO string) */
  createdAt: string;
  /** Last update date (ISO string) */
  updatedAt?: string;
  /** Last login date (ISO string) */
  lastLogin?: string;
}

/**
 * User preference settings.
 */
export interface UserPreferences {
  /** UI theme preference */
  theme: 'light' | 'dark';
  /** Preferred language code */
  language: string;
  /** Notification settings */
  notifications: {
    /** Receive email notifications */
    email: boolean;
    /** Receive push notifications */
    push: boolean;
    /** Notify on mentions */
    mentions: boolean;
    /** Notify on direct messages */
    messages: boolean;
  };
  /** Privacy settings */
  privacy: {
    /** Show email to other users */
    showEmail: boolean;
    /** Show department to other users */
    showDepartment: boolean;
    /** Show last login time */
    showLastLogin: boolean;
  };
}

// ============================================================================
// Authentication Types
// ============================================================================

/**
 * JWT authentication tokens.
 */
export interface AuthTokens {
  /** JWT access token for API requests */
  accessToken: string;
  /** JWT refresh token for obtaining new access tokens */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
}

/**
 * Login request payload.
 */
export interface LoginRequest {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
}

/**
 * Registration request payload.
 */
export interface RegisterRequest {
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User's email address */
  email: string;
  /** User's password (must meet complexity requirements) */
  password: string;
  /** Optional department */
  department?: string;
}

/**
 * Authentication response from login/register endpoints.
 */
export interface AuthResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Response message */
  message: string;
  /** Response data containing user and tokens */
  data: {
    user: User;
    tokens: AuthTokens;
  };
}

// ============================================================================
// Channel Types
// ============================================================================

/**
 * Represents a communication channel.
 */
export interface Channel {
  /** Unique identifier */
  id: number;
  /** Channel name */
  name: string;
  /** Channel description */
  description?: string;
  /** Channel type */
  type: 'public' | 'private' | 'direct' | 'group';
  /** Channel status */
  status: 'active' | 'archived' | 'deleted';
  /** ID of the channel owner */
  ownerId: number;
  /** Whether the channel requires invitation to join */
  isPrivate: boolean;
  /** Maximum number of members allowed */
  maxMembers?: number;
  /** Creation date (ISO string) */
  createdAt: string;
  /** Last update date (ISO string) */
  updatedAt: string;
}

/**
 * Represents a user's membership in a channel.
 */
export interface ChannelMember {
  /** Channel ID */
  channelId: number;
  /** User ID */
  userId: number;
  /** Member's role in the channel */
  role: 'admin' | 'moderator' | 'member' | 'read_only';
  /** Date when the user joined (ISO string) */
  joinedAt: string;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Represents a message in a channel.
 */
export interface Message {
  /** Unique identifier */
  id: number;
  /** ID of the channel this message belongs to */
  channelId: number;
  /** ID of the message author */
  authorId: number;
  /** Message content */
  content: string;
  /** Type of message */
  type: 'text' | 'image' | 'file' | 'link' | 'system';
  /** Delivery status */
  status: 'sent' | 'delivered' | 'read' | 'deleted';
  /** Parent message ID for replies */
  parentId?: number;
  /** Thread ID for threaded conversations */
  threadId?: number;
  /** Additional message metadata */
  metadata?: {
    /** File attachments */
    attachments?: MessageAttachment[];
    /** IDs of mentioned users */
    mentions?: number[];
    /** URLs found in the message */
    links?: string[];
  };
  /** Reactions to this message */
  reactions?: Reaction[];
  /** Author user object (when populated) */
  author?: User;
  /** Creation date (ISO string) */
  createdAt: string;
  /** Last update date (ISO string) */
  updatedAt: string;
  /** Edit date if message was modified (ISO string) */
  editedAt?: string;
}

/**
 * Represents a file attachment on a message.
 */
export interface MessageAttachment {
  /** Unique identifier */
  id: number;
  /** Original filename */
  filename: string;
  /** URL to access the file */
  url: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

/**
 * Represents a reaction to a message.
 */
export interface Reaction {
  /** Unique identifier */
  id: number;
  /** ID of the message this reaction is on */
  messageId: number;
  /** ID of the user who reacted */
  userId: number;
  /** Type of reaction */
  type: ReactionType;
  /** Date when the reaction was added (ISO string) */
  createdAt: string;
}

/**
 * Available reaction types.
 */
export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper.
 * @template T - The type of data returned in the response
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Optional message */
  message?: string;
  /** Response data */
  data?: T;
  /** Validation or error messages */
  errors?: string[];
}

/**
 * Paginated API response.
 * @template T - The type of items in the data array
 */
export interface PaginatedResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Array of items */
  data: T[];
  /** Pagination metadata */
  meta: PaginationMeta;
}

/**
 * Pagination metadata.
 */
export interface PaginationMeta {
  /** Current page number */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request payload for creating a new channel.
 */
export interface CreateChannelRequest {
  /** Channel name */
  name: string;
  /** Channel description */
  description?: string;
  /** Channel type */
  type?: 'public' | 'private' | 'direct' | 'group';
  /** Whether the channel is private */
  isPrivate?: boolean;
}

/**
 * Request payload for creating a new message.
 */
export interface CreateMessageRequest {
  /** Message content */
  content: string;
  /** Target channel ID */
  channelId: number;
  /** Parent message ID for replies */
  parentId?: number;
  /** Message type (attachments use `image`/`file`) */
  type?: 'text' | 'image' | 'file' | 'link' | 'system';
  /** Additional metadata (attachments, mentions, links) */
  metadata?: {
    attachments?: MessageAttachment[];
    mentions?: number[];
    links?: string[];
  };
}

/**
 * Request payload for updating user profile.
 */
export interface UpdateUserRequest {
  /** First name */
  firstName?: string;
  /** Last name */
  lastName?: string;
  /** Biography */
  bio?: string;
  /** Phone number */
  phone?: string;
  /** Location */
  location?: string;
  /** User preferences */
  preferences?: Partial<UserPreferences>;
}
