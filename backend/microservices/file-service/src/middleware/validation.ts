import { Request, Response, NextFunction } from 'express';
import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { FileType, SecurityLevel } from '../types';
import { AppError } from './auth';

/**
 * Middleware pour gérer les erreurs de validation
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    res.status(400).json({
      success: false,
      message: 'Erreurs de validation',
      errors: errorMessages
    });
    return;
  }
  
  next();
};

/**
 * Validations pour l'upload de fichiers
 */
export const validateFileUpload: ValidationChain[] = [
  body('title')
    .optional()
    .isString()
    .withMessage('Le titre doit être une chaîne de caractères')
    .isLength({ min: 1, max: 255 })
    .withMessage('Le titre doit faire entre 1 et 255 caractères'),
    
  body('description')
    .optional()
    .isString()
    .withMessage('La description doit être une chaîne de caractères')
    .isLength({ max: 1000 })
    .withMessage('La description ne peut pas dépasser 1000 caractères'),
    
  body('tags')
    .optional()
    .isArray()
    .withMessage('Les tags doivent être un tableau')
    .custom((tags: string[]) => {
      if (tags.length > 10) {
        throw new Error('Pas plus de 10 tags autorisés');
      }
      for (const tag of tags) {
        if (typeof tag !== 'string' || tag.length > 50) {
          throw new Error('Chaque tag doit être une chaîne de moins de 50 caractères');
        }
      }
      return true;
    }),
    
  body('securityLevel')
    .optional()
    .isIn(Object.values(SecurityLevel))
    .withMessage(`Le niveau de sécurité doit être: ${Object.values(SecurityLevel).join(', ')}`),
    
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('La date d\'expiration doit être au format ISO8601')
    .custom((value: string) => {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error('La date d\'expiration doit être dans le futur');
      }
      return true;
    }),
    
  body('password')
    .optional()
    .isString()
    .withMessage('Le mot de passe doit être une chaîne de caractères')
    .isLength({ min: 6, max: 100 })
    .withMessage('Le mot de passe doit faire entre 6 et 100 caractères'),
];

/**
 * Validations pour la mise à jour de fichier
 */
export const validateFileUpdate: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('L\'ID du fichier doit être un entier positif'),
    
  body('title')
    .optional()
    .isString()
    .withMessage('Le titre doit être une chaîne de caractères')
    .isLength({ min: 1, max: 255 })
    .withMessage('Le titre doit faire entre 1 et 255 caractères'),
    
  body('description')
    .optional()
    .isString()
    .withMessage('La description doit être une chaîne de caractères')
    .isLength({ max: 1000 })
    .withMessage('La description ne peut pas dépasser 1000 caractères'),
    
  body('tags')
    .optional()
    .isArray()
    .withMessage('Les tags doivent être un tableau'),
    
  body('securityLevel')
    .optional()
    .isIn(Object.values(SecurityLevel))
    .withMessage(`Le niveau de sécurité doit être: ${Object.values(SecurityLevel).join(', ')}`),
];

/**
 * Validations pour la récupération de fichier
 */
export const validateFileGet: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('L\'ID du fichier doit être un entier positif'),
];

/**
 * Validations pour la liste des fichiers
 */
export const validateFileList: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La page doit être un entier positif'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La limite doit être entre 1 et 100'),
    
  query('type')
    .optional()
    .isIn(Object.values(FileType))
    .withMessage(`Le type doit être: ${Object.values(FileType).join(', ')}`),
    
  query('search')
    .optional()
    .isString()
    .withMessage('La recherche doit être une chaîne de caractères')
    .isLength({ min: 1, max: 100 })
    .withMessage('La recherche doit faire entre 1 et 100 caractères'),
    
  query('tags')
    .optional()
    .isArray()
    .withMessage('Les tags doivent être un tableau'),
    
  query('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('L\'ID utilisateur doit être un entier positif'),
    
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'name', 'size', 'type'])
    .withMessage('Le tri doit être: createdAt, updatedAt, name, size, type'),
    
  query('sortOrder')
    .optional()
    .isIn(['ASC', 'DESC'])
    .withMessage('L\'ordre doit être ASC ou DESC'),
];

/**
 * Validations pour le partage de fichier
 */
export const validateFileShare: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('L\'ID du fichier doit être un entier positif'),
    
  body('permissions')
    .optional()
    .isArray()
    .withMessage('Les permissions doivent être un tableau')
    .custom((permissions: string[]) => {
      const validPermissions = ['read', 'download', 'share'];
      for (const permission of permissions) {
        if (!validPermissions.includes(permission)) {
          throw new Error(`Permission invalide: ${permission}. Autorisées: ${validPermissions.join(', ')}`);
        }
      }
      return true;
    }),
    
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('La date d\'expiration doit être au format ISO8601')
    .custom((value: string) => {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error('La date d\'expiration doit être dans le futur');
      }
      return true;
    }),
    
  body('password')
    .optional()
    .isString()
    .withMessage('Le mot de passe doit être une chaîne de caractères')
    .isLength({ min: 6, max: 100 })
    .withMessage('Le mot de passe doit faire entre 6 et 100 caractères'),
    
  body('maxDownloads')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Le nombre max de téléchargements doit être un entier positif'),
];

/**
 * Validations pour l'accès au fichier partagé
 */
export const validateSharedFileAccess: ValidationChain[] = [
  param('token')
    .isString()
    .withMessage('Le token doit être une chaîne de caractères')
    .isLength({ min: 32, max: 128 })
    .withMessage('Le token doit faire entre 32 et 128 caractères'),
    
  body('password')
    .optional()
    .isString()
    .withMessage('Le mot de passe doit être une chaîne de caractères'),
];

/**
 * Validations pour le traitement d'image
 */
export const validateImageProcessing: ValidationChain[] = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('L\'ID du fichier doit être un entier positif'),
    
  query('width')
    .optional()
    .isInt({ min: 1, max: 4096 })
    .withMessage('La largeur doit être entre 1 et 4096 pixels'),
    
  query('height')
    .optional()
    .isInt({ min: 1, max: 4096 })
    .withMessage('La hauteur doit être entre 1 et 4096 pixels'),
    
  query('quality')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('La qualité doit être entre 1 et 100'),
    
  query('format')
    .optional()
    .isIn(['jpeg', 'png', 'webp', 'gif'])
    .withMessage('Le format doit être: jpeg, png, webp, gif'),
    
  query('crop')
    .optional()
    .isBoolean()
    .withMessage('Le recadrage doit être un booléen'),
];

/**
 * Middleware de validation d'ID de fichier
 */
export const validateFileId = (req: Request, res: Response, next: NextFunction): void => {
  const fileId = parseInt(req.params.id);
  
  if (isNaN(fileId) || fileId <= 0) {
    res.status(400).json({
      success: false,
      message: 'ID de fichier invalide'
    });
    return;
  }
  
  req.params.id = fileId.toString();
  next();
};

/**
 * Middleware de validation de token de partage
 */
export const validateShareToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.params.token;
  
  if (!token || typeof token !== 'string' || token.length < 32) {
    res.status(400).json({
      success: false,
      message: 'Token de partage invalide'
    });
    return;
  }
  
  next();
};
