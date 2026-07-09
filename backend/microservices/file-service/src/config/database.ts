import { Sequelize } from 'sequelize-typescript';
import { config } from './config';

/**
 * PostgreSQL database configuration
 */
export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  username: config.database.username,
  password: config.database.password,
  
  // Connection pool configuration
  pool: {
    max: 20,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
  
  // SSL configuration for production
  dialectOptions: {
    ssl: config.server.env === 'production' ? {
      require: true,
      rejectUnauthorized: false,
    } : false,
  },
  
  // Custom logging
  logging: config.server.env === 'development' ? console.log : false,
  
  // Performance options
  benchmark: config.server.env === 'development',
  
  // Les modèles sont enregistrés explicitement via addModels() dans models/index.ts
  // (les fichiers ne suivent pas la convention *.model.ts attendue par modelMatch).

  // Global hooks configuration
  hooks: {
    beforeConnect: () => {
      console.log('🔄 Connecting to the database...');
    },
    afterConnect: () => {
      console.log('✅ Database connection established');
    },
    beforeDisconnect: () => {
      console.log('🔌 Disconnecting from the database...');
    },
  },

  // Disable deprecation warnings
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
    charset: 'utf8',
    collate: 'utf8_general_ci',
  },
  
  // Index configuration
  indexes: [
    {
      fields: ['filename'],
      name: 'files_filename_idx',
    },
    {
      fields: ['type'],
      name: 'files_type_idx',
    },
    {
      fields: ['uploadedBy'],
      name: 'files_uploaded_by_idx',
    },
    {
      fields: ['status'],
      name: 'files_status_idx',
    },
    {
      fields: ['createdAt'],
      name: 'files_created_at_idx',
    },
    {
      fields: ['mimeType'],
      name: 'files_mime_type_idx',
    },
    {
      fields: ['checksum'],
      name: 'files_checksum_idx',
      unique: true,
    },
  ],
});

/**
 * Test database connection
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    return false;
  }
};

/**
 * Synchronize models with the database
 */
export const syncDatabase = async (force: boolean = false): Promise<void> => {
  try {
    await sequelize.sync({
      force,
      alter: config.server.env === 'development',
    });
    console.log('✅ Database synchronization completed');
  } catch (error) {
    console.error('❌ Error during synchronization:', error);
    throw error;
  }
};

/**
 * Close database connection
 */
export const closeConnection = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error while closing connection:', error);
    throw error;
  }
};

export default sequelize;
