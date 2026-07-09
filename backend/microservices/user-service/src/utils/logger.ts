import { createLogger, format, transports } from 'winston';
import { config } from '../config/config';

/**
 * Configuration du logger Winston
 */
const logger = createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'user-service' },
  transports: [
    // Fichier pour toutes les erreurs
    new transports.File({
      filename: 'logs/user-service-error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Fichier pour tous les logs
    new transports.File({
      filename: 'logs/user-service-combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// En développement, ajouter la console
if (config.nodeEnv !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      ),
    })
  );
}

/**
 * Utilitaires de logging
 */
export class Logger {
  /**
   * Log d'information
   */
  public static info(message: string, meta?: any): void {
    logger.info(message, meta);
  }

  /**
   * Log d'erreur
   */
  public static error(message: string, error?: Error | any): void {
    logger.error(message, { error: error?.message, stack: error?.stack, ...error });
  }

  /**
   * Log de debug
   */
  public static debug(message: string, meta?: any): void {
    logger.debug(message, meta);
  }

  /**
   * Log d'avertissement
   */
  public static warn(message: string, meta?: any): void {
    logger.warn(message, meta);
  }

  /**
   * Log d'événement utilisateur
   */
  public static userActivity(userId: number, action: string, details?: any): void {
    logger.info('User activity', {
      userId,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log de sécurité
   */
  public static security(message: string, details?: any): void {
    logger.warn(`[SECURITY] ${message}`, {
      ...details,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log de performance
   */
  public static performance(operation: string, duration: number, details?: any): void {
    logger.info(`[PERFORMANCE] ${operation}`, {
      duration: `${duration}ms`,
      ...details,
      timestamp: new Date().toISOString(),
    });
  }
}

export default logger;
