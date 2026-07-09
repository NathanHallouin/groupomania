import { Sequelize } from 'sequelize-typescript';
import { config } from '../config/config';
import { Message } from './Message';
import { Channel } from './Channel';
import { ChannelMember } from './ChannelMember';
import { Reaction } from './Reaction';

/**
 * Sequelize database configuration
 */
export const sequelize = new Sequelize({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  username: config.database.username,
  password: config.database.password,
  dialect: 'postgres',

  // Connection pool options
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },

  // Logging
  logging: config.nodeEnv === 'development' ? console.log : false,

  // Performance options
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
  },

  // Timezone
  timezone: '+00:00',

  // SSL in production
  dialectOptions: config.nodeEnv === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  } : {},
});

// Register models
sequelize.addModels([
  Message,
  Channel,
  ChannelMember,
  Reaction,
]);

/**
 * Initialize model associations
 */
export const initializeAssociations = (): void => {
  // Channel -> Message (A channel has many messages)
  Channel.hasMany(Message, {
    foreignKey: 'channelId',
    as: 'messages',
    onDelete: 'CASCADE',
  });

  Message.belongsTo(Channel, {
    foreignKey: 'channelId',
    as: 'channel',
  });

  // Message -> Message (Replies and threads)
  Message.hasMany(Message, {
    foreignKey: 'parentId',
    as: 'replies',
  });

  Message.belongsTo(Message, {
    foreignKey: 'parentId',
    as: 'parent',
  });

  // Channel -> ChannelMember (A channel has many members)
  Channel.hasMany(ChannelMember, {
    foreignKey: 'channelId',
    as: 'members',
    onDelete: 'CASCADE',
  });

  ChannelMember.belongsTo(Channel, {
    foreignKey: 'channelId',
    as: 'channel',
  });

  // Message -> Reaction (A message has many reactions)
  Message.hasMany(Reaction, {
    foreignKey: 'messageId',
    as: 'reactions',
    onDelete: 'CASCADE',
  });

  Reaction.belongsTo(Message, {
    foreignKey: 'messageId',
    as: 'message',
  });
};

/**
 * Database initialization function
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ PostgreSQL database connection established');

    // Initialize associations
    initializeAssociations();
    console.log('✅ Model associations initialized');

    // Synchronize models (only in development)
    if (config.database.sync) {
      await sequelize.sync({
        alter: config.nodeEnv === 'development',
        force: false, // Never force in production
      });
      console.log('✅ Models synchronized with the database');
    }

    // Create custom indexes if needed
    await createCustomIndexes();

  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
};

/**
 * Create custom indexes for performance optimization
 */
const createCustomIndexes = async (): Promise<void> => {
  try {
    const queryInterface = sequelize.getQueryInterface();

    // Index for message content search
    await queryInterface.addIndex('messages', {
      fields: ['content'],
      name: 'messages_content_gin_idx',
      using: 'gin',
      operator: 'gin_trgm_ops',
    }).catch(() => {
      // Index already exists or extension is not available
      console.log('ℹ️ GIN index for text search not created (pg_trgm extension required)');
    });

    // Composite index for frequent queries
    await queryInterface.addIndex('messages', {
      fields: ['channelId', 'createdAt', 'status'],
      name: 'messages_channel_time_status_idx',
    }).catch(() => {
      // Index already exists
    });

    // Index for active channels
    await queryInterface.addIndex('channels', {
      fields: ['status', 'type', 'isPrivate'],
      name: 'channels_active_type_privacy_idx',
    }).catch(() => {
      // Index already exists
    });

    console.log('✅ Custom indexes created');
  } catch (error) {
    console.warn('⚠️ Error creating custom indexes:', error);
  }
};

/**
 * Close the database connection
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
    throw error;
  }
};

/**
 * Connect to database and synchronize models
 */
export const connectDatabase = async (): Promise<void> => {
  try {
    // Test the connection
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established');

    // Initialize associations
    initializeAssociations();
    console.log('✅ Model associations initialized');

    // Synchronize models (without forcing)
    await sequelize.sync({ alter: false });
    console.log('✅ Model synchronization completed');

  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
};

export {
  Message,
  Channel,
  ChannelMember,
  Reaction,
};
