import MessageServiceApp from './app';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create and start the application
const app = new MessageServiceApp();

// Start the server
app.start().catch((error) => {
  console.error('❌ Unable to start the server:', error);
  process.exit(1);
});

// Export for tests
export default app;
