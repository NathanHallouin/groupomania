/**
 * Types globaux pour le service utilisateur
 */

/**
 * Rôles utilisateur autorisés
 */
export type UserRole = 'employee' | 'admin';

/**
 * Status utilisateur
 */
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

/**
 * Utilisateur authentifié
 */
export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Extension de l'interface Request d'Express
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Interface pour les réponses API standardisées
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

/**
 * Interface pour les métadonnées de pagination
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
 * Interface pour les réponses paginées
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * Interface pour les options de requête
 */
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  department?: string;
}

/**
 * Interface pour les filtres de recherche utilisateur
 */
export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  department?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Interface pour les statistiques utilisateur
 */
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByDepartment: Record<string, number>;
  usersByRole: Record<string, number>;
}

/**
 * Interface pour l'upload de fichiers
 */
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Interface pour les préférences utilisateur
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    mentions: boolean;
    messages: boolean;
  };
  privacy: {
    showEmail: boolean;
    showDepartment: boolean;
    showLastLogin: boolean;
  };
}

/**
 * Configuration d'environnement
 */
export interface Config {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  server: {
    port: number;
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
  services: {
    authService: string;
    fileService: string;
    messageService: string;
  };
}
