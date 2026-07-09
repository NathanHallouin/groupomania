import { Request } from 'express';

// User Types
export interface UserAttributes {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  emailHash: string;
  password: string;
  bio?: string;
  avatarUrl?: string;
  isAdmin: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockUntil?: Date | null;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  emailVerificationToken?: string;
  emailVerifiedAt?: Date;
  refreshTokens: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface UserCreationAttributes {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  bio?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
}

export interface UserLoginAttributes {
  email: string;
  password: string;
}

export interface UserProfileUpdateAttributes {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UserPasswordChangeAttributes {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Message Types
export interface MessageAttributes {
  id: number;
  userId: number;
  content: string;
  imageUrl?: string;
  likes: number;
  likedBy: number[];
  isEdited: boolean;
  editedAt?: Date;
  reportCount: number;
  reportedBy: number[];
  isHidden: boolean;
  hiddenAt?: Date;
  hiddenBy?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface MessageCreationAttributes {
  userId: number;
  content: string;
  imageUrl?: string;
}

export interface MessageUpdateAttributes {
  content?: string;
  imageUrl?: string;
}

export interface MessageLikeAttributes {
  action: 'like' | 'unlike';
}

// JWT Types
export interface JWTPayload {
  id: number;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  id: number;
  email: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

// Note: AuthenticatedRequest is now defined globally in types/express.d.ts

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: 'createdAt' | 'updatedAt' | 'likes';
  order?: 'ASC' | 'DESC';
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'ASC' | 'DESC';
  offset: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// Configuration Types
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  username: string;
  password: string;
  dialect: 'mysql' | 'postgres' | 'sqlite' | 'mariadb';
  logging: boolean | ((sql: string) => void);
  pool: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
  };
}

export interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface CookieConfig {
  secret: string;
  expiresIn: number;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    maxAge: number;
  };
}

export interface CorsConfig {
  origin: string[];
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  login: {
    windowMs: number;
    max: number;
  };
  signup: {
    windowMs: number;
    max: number;
  };
}

export interface LoggingConfig {
  level: string;
  file: string;
  maxSize: string;
  maxFiles: string;
}

export interface MonitoringConfig {
  healthEndpoint: string;
  metricsEndpoint: string;
}

export interface UploadConfig {
  path: string;
  maxFileSize: number;
  allowedTypes: string[];
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  url: string;
}

export interface SecurityConfig {
  bcryptRounds: number;
  password: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSymbols: boolean;
  };
}

export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  contact: {
    name: string;
    email: string;
  };
}

export interface AppConfig {
  env: string;
  port: number;
  host: string;
  apiVersion: string;
  database: DatabaseConfig;
  jwt: JWTConfig;
  cookie: CookieConfig;
  cors: CorsConfig;
  redis: RedisConfig;
  rateLimit: RateLimitConfig;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
  upload: UploadConfig;
  security: SecurityConfig;
  swagger: SwaggerConfig;
}

// API Response Types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  errors?: any[];
  timestamp: string;
}

export interface ApiError {
  status: 'error';
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  stack?: string;
}

// Utility Types
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type Partial<T> = { [P in keyof T]?: T[P] };
export type Required<T> = { [P in keyof T]-?: T[P] };

// Database Model Instance Types
export interface UserInstance extends UserAttributes {
  id: number;
  name: string;
  surname: string;
  email: string;
  emailHash: string;
  password: string;
  isAdmin: boolean;
  admin?: boolean; // Backward compatibility
  login_attempts: number;
  lock_until?: Date | null;
  comparePassword(candidatePassword: string): Promise<boolean>;
  isLocked(): boolean;
  incLoginAttempts(): Promise<UserInstance>;
  resetLoginAttempts(): Promise<UserInstance>;
  generatePasswordResetToken(): string;
  generateEmailVerificationToken(): string;
  update(values: Partial<UserAttributes>): Promise<UserInstance>;
}

export interface MessageInstance extends MessageAttributes {
  addLike(userId: number): Promise<MessageInstance>;
  removeLike(userId: number): Promise<MessageInstance>;
  isLikedBy(userId: number): boolean;
  addReport(userId: number): Promise<MessageInstance>;
  isReportedBy(userId: number): boolean;
  hide(adminUserId: number): Promise<MessageInstance>;
  unhide(): Promise<MessageInstance>;
  canBeEditedBy(userId: number): boolean;
  canBeDeletedBy(userId: number, isAdmin?: boolean): boolean;
}

// Auth Types
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    name: string;
    surname: string;
    admin: boolean;
  };
  token: string;
}

export interface TokenPayload {
  userId: number;
  admin: boolean;
  iat?: number;
  exp?: number;
}

// Service Types
export interface AuthService {
  register(userData: UserCreationAttributes): Promise<{ user: UserInstance; token: string }>;
  login(credentials: UserLoginAttributes): Promise<{ user: UserInstance; token: string; refreshToken: string }>;
  logout(userId: number): Promise<void>;
  refreshToken(token: string): Promise<{ token: string; refreshToken: string }>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  verifyEmail(token: string): Promise<void>;
}

export interface TokenService {
  generateTokens(user: UserInstance): Promise<{ accessToken: string; refreshToken: string }>;
  verifyAccessToken(token: string): Promise<JWTPayload>;
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload>;
  revokeRefreshToken(userId: number, token: string): Promise<void>;
  revokeAllRefreshTokens(userId: number): Promise<void>;
}

// Middleware Types
export interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skip?: (req: Request) => boolean;
  keyGenerator?: (req: Request) => string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// File Upload Types
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  destination: string;
  filename: string;
  path: string;
  size: number;
}

// Search and Filter Types
export interface SearchFilters {
  query?: string;
  userId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  isHidden?: boolean;
  hasImage?: boolean;
}

export interface SortOptions {
  field: keyof MessageAttributes | keyof UserAttributes;
  direction: 'ASC' | 'DESC';
}

// Metrics Types
export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  version: string;
}

export interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  services?: {
    database?: 'up' | 'down';
    redis?: 'up' | 'down';
  };
}
