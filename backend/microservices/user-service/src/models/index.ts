import { Sequelize, DataTypes } from 'sequelize';
import { User } from './User';
import { config } from '../config/config';

/**
 * Database configuration and initialization
 */
class Database {
  public sequelize: Sequelize;
  public User: typeof User;

  constructor() {
    this.sequelize = new Sequelize({
      dialect: 'postgres',
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      username: config.database.username,
      password: config.database.password,
      logging: config.nodeEnv === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions: {
        charset: 'utf8mb4',
        // SSL for production
        ...(config.nodeEnv === 'production' && {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }),
      },
      define: {
        timestamps: true,
        underscored: false,
        freezeTableName: true,
      },
    });

    // Initialize models
    User.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [2, 50],
        },
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [2, 50],
        },
      },
      department: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [2, 100],
        },
      },
      position: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [2, 100],
        },
      },
      role: {
        type: DataTypes.ENUM('employee', 'admin'),
        allowNull: false,
        defaultValue: 'employee',
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
        allowNull: false,
        defaultValue: 'active',
      },
      avatar: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        validate: {
          len: [0, 500],
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          is: /^[\+]?[1-9][\d]{0,15}$/,
        },
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          len: [2, 100],
        },
      },
      birthDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      hireDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      manager: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      preferences: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {
          theme: 'light',
          language: 'fr',
          notifications: {
            email: true,
            push: true,
            mentions: true,
            messages: true,
          },
          privacy: {
            showEmail: false,
            showDepartment: true,
            showLastLogin: false,
          },
        },
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      isEmailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isProfileComplete: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    }, {
      sequelize: this.sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      indexes: [
        {
          fields: ['email'],
          unique: true,
        },
        {
          fields: ['department'],
        },
        {
          fields: ['role'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['manager'],
        },
        {
          fields: ['createdAt'],
        },
      ],
    });
    
    this.User = User;

    // Define associations
    User.associate();
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      console.log('✅ User Service database connection established successfully');
    } catch (error) {
      console.error('❌ Unable to connect to User Service database:', error);
      throw error;
    }
  }

  /**
   * Synchronize database
   */
  public async syncDatabase(force = false): Promise<void> {
    try {
      if (force) {
        console.log('⚠️  Dropping and recreating User Service tables...');
      }

      await this.sequelize.sync({ force, alter: !force });
      console.log('✅ User Service database synchronized successfully');
    } catch (error) {
      console.error('❌ Error synchronizing User Service:', error);
      throw error;
    }
  }
}

const database = new Database();

// Export database instance
export const sequelize = database.sequelize;
export { User } from './User';
export default database;
