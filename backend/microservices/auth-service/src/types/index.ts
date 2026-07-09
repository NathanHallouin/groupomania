/**
 * Types globaux pour le service d'authentification
 */

/**
 * Rôles utilisateur autorisés
 */
export type UserRole = 'employee' | 'admin';

/**
 * Utilisateur authentifié
 */
export interface AuthenticatedUser {
  userId: number;
  email: string;
  role: UserRole;
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
}

/**
 * Interface pour les logs d'audit
 */
export interface AuditLog {
  userId?: number;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Configuration d'environnement
 */
export interface Config {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  database: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiry: string;
    refreshExpiry: string;
  };
  security: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    lockTime: number;
  };
  cors: {
    origin: string[];
    credentials: boolean;
  };
}
