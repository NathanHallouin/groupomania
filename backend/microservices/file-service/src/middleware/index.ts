/**
 * Index des middlewares pour le File Service
 */

// Authentification et autorisation
export {
  AppError,
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireAdmin,
  requireModerator
} from './auth';

// Upload de fichiers
export {
  upload,
  detectFileType,
  validateUpload,
  cleanupTempFiles,
  uploadImage,
  uploadImages,
  uploadDocument,
  uploadDocuments,
  uploadAny,
  uploadFields
} from './upload';

// Validation des données
export {
  handleValidationErrors,
  validateFileUpload,
  validateFileUpdate,
  validateFileGet,
  validateFileList,
  validateFileShare,
  validateSharedFileAccess,
  validateImageProcessing,
  validateFileId,
  validateShareToken
} from './validation';

// Gestion d'erreurs
export {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestLogger,
  healthCheck
} from './errorHandler';
