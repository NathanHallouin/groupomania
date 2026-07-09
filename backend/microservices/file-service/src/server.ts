#!/usr/bin/env node
/**
 * File Service — point d'entrée
 */
import 'dotenv/config';
import app from './app';
import { config } from './config/config';
import { connectDatabase, closeDatabase } from './models';

const startServer = async (): Promise<void> => {
  try {
    console.log('🚀 Démarrage du File Service...');
    await connectDatabase();

    const server = app.listen(config.server.port, () => {
      console.log(`✅ File Service à l'écoute sur le port ${config.server.port}`);
    });

    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n${signal} reçu, arrêt du File Service...`);
      server.close(async () => {
        await closeDatabase();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('❌ Échec du démarrage du File Service:', error);
    process.exit(1);
  }
};

startServer();
