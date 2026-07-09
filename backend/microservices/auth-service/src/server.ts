#!/usr/bin/env node

/**
 * Auth Service server entry point
 */

import authService from './app';

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    console.log('🚀 Starting Auth Service...');
    await authService.start();
  } catch (error) {
    console.error('❌ Error starting the server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
