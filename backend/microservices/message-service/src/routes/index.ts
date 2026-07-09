import { Router } from 'express';
import messageRoutes from './messageRoutes';
import channelRoutes from './channelRoutes';

const router = Router();

// Routes pour les messages
router.use('/messages', messageRoutes);

// Routes pour les canaux
router.use('/channels', channelRoutes);

// Route de santé
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Message Service is running',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

export default router;
