import { Sequelize, DataTypes } from 'sequelize';
import { User } from './User';
import { config } from '../config/config';

/**
 * Configuration et initialisation de la base de données
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
        define: {
          timestamps: true,
          underscored: false,
        },
      }
    );

    // Initialiser les modèles
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
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      department: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'General',
      },
      role: {
        type: DataTypes.ENUM('employee', 'admin'),
        allowNull: false,
        defaultValue: 'employee',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      emailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      emailVerificationToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      loginAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lockUntil: {
        type: DataTypes.DATE,
        allowNull: true,
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
    });
    
    this.User = User;
  }

  /**
   * Connecter à la base de données
   */
  public async connect(): Promise<void> {
    try {
      await this.sequelize.authenticate();
      console.log('✅ Database connection established successfully');
    } catch (error) {
      console.error('❌ Unable to connect to the database:', error);
      throw error;
    }
  }

  /**
   * Synchroniser les modèles avec la base de données
   */
  public async sync(force = false): Promise<void> {
    try {
      await this.sequelize.sync({ force });
      console.log('✅ Database synchronized successfully');
    } catch (error) {
      console.error('❌ Database synchronization failed:', error);
      throw error;
    }
  }

  /**
   * Fermer la connexion à la base de données
   */
  public async close(): Promise<void> {
    try {
      await this.sequelize.close();
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
      throw error;
    }
  }
}

// Instance singleton
const database = new Database();

// Export de l'instance de base de données
export const sequelize = database.sequelize;
export { User } from './User';
export default database;
