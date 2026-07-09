import UserServiceApp from './app';

/**
 * User Service startup
 */
async function startServer(): Promise<void> {
  try {
    const app = new UserServiceApp();

    // Connect to database
    await app.connectDatabase();

    // Start the server
    app.listen();
  } catch (error) {
    console.error('❌ Error starting User Service:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled promise rejection:', reason);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Graceful server shutdown...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Graceful server shutdown...');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

export default startServer;
