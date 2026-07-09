/**
 * File Service — Express application
 *
 * Bootstrap HTTP du microservice de gestion de fichiers.
 * Câble les briques existantes (upload, traitement d'image, modèles, erreurs).
 */
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';

import { config } from './config/config';
import {
  requestLogger,
  healthCheck,
  errorHandler,
  notFoundHandler,
  optionalAuthenticate,
  authenticate,
  uploadAny,
  validateUpload,
  cleanupTempFiles,
  detectFileType,
} from './middleware';

const app: Application = express();

// Sécurité & parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','),
    credentials: true,
  })
);
app.use(compression());
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// Fichiers servis statiquement (uploads)
app.use(config.storage.local.publicPath, express.static(path.resolve(config.uploadPath)));

// Health
app.get('/health', healthCheck);
app.get('/api/files/health', healthCheck);

/**
 * Upload de fichiers (multipart) — authentifié.
 * Renvoie les métadonnées des fichiers stockés.
 */
app.post(
  '/api/files/upload',
  authenticate,
  uploadAny,
  validateUpload,
  cleanupTempFiles,
  (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[] | undefined) || [];
    res.status(201).json({
      success: true,
      message: `${files.length} fichier(s) reçu(s)`,
      data: files.map((f) => ({
        originalName: f.originalname,
        filename: f.filename,
        mimetype: f.mimetype,
        type: detectFileType(f.mimetype),
        size: f.size,
        path: `${config.storage.local.publicPath}/temp/${f.filename}`,
      })),
    });
  }
);

/**
 * Liste basique (placeholder) — protégée, à enrichir (modèle File).
 */
app.get('/api/files', optionalAuthenticate, (_req: Request, res: Response) => {
  res.json({ success: true, data: [], message: 'Endpoint liste — à implémenter' });
});

// 404 + gestion d'erreurs (doit rester en dernier)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
