import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';

// Constantes pour la sécurité
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 heures en millisecondes

/**
 * Interface pour les attributs utilisateur
 */
export interface UserAttributes {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string;
  role: 'employee' | 'admin';
  isActive: boolean;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour la création d'utilisateur (champs optionnels)
 */
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role' | 'isActive' | 'emailVerified' | 'loginAttempts' | 'createdAt' | 'updatedAt'> {}

/**
 * Modèle User avec méthodes d'instance et statiques
 */
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password!: string;
  public firstName!: string;
  public lastName!: string;
  public department!: string;
  public role!: 'employee' | 'admin';
  public isActive!: boolean;
  public emailVerified!: boolean;
  public emailVerificationToken?: string;
  public passwordResetToken?: string;
  public passwordResetExpires?: Date;
  public lastLogin?: Date;
  public loginAttempts!: number;
  public lockUntil?: Date;
  
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Vérifier si le mot de passe est correct
   */
  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  /**
   * Hasher le mot de passe avant sauvegarde
   */
  public async hashPassword(): Promise<void> {
    if (this.changed('password')) {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  /**
   * Vérifier si le compte est verrouillé
   */
  public isLocked(): boolean {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  /**
   * Incrémenter les tentatives de connexion
   */
  public async incLoginAttempts(): Promise<void> {
    const maxAttempts = 5;
    const lockTime = 2 * 60 * 60 * 1000; // 2 heures

    this.loginAttempts += 1;

    if (this.loginAttempts >= maxAttempts && !this.isLocked()) {
      this.lockUntil = new Date(Date.now() + lockTime);
    }

    await this.save();
  }

  /**
   * Comparer le mot de passe avec le hash stocké
   */
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }

  /**
   * Incrémenter les tentatives de connexion échouées
   */
  public async incrementLoginAttempts(): Promise<void> {
    // Si le verrou a expiré, réinitialiser
    if (this.lockUntil && this.lockUntil <= new Date()) {
      await this.update({
        loginAttempts: 1,
        lockUntil: undefined,
      });
      return;
    }

    const updates: Partial<UserAttributes> = { loginAttempts: this.loginAttempts + 1 };
    
    // Si on atteint la limite, verrouiller le compte
    if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked()) {
      updates.lockUntil = new Date(Date.now() + LOCK_TIME);
    }

    await this.update(updates);
  }

  /**
   * Réinitialiser les tentatives de connexion
   */
  public async resetLoginAttempts(): Promise<void> {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    this.lastLogin = new Date();
    await this.save();
  }

  /**
   * Obtenir le nom complet
   */
  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Sérialiser pour JSON (sans le mot de passe)
   */
  public toJSON(): Partial<UserAttributes> {
    const values = { ...this.get() } as UserAttributes;
    delete (values as any).password;
    delete (values as any).emailVerificationToken;
    delete (values as any).passwordResetToken;
    return values;
  }
}

/**
 * Initialiser le modèle User
 */
export function initUserModel(sequelize: Sequelize): typeof User {
  User.init(
    {
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
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          len: [8, 128],
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
        defaultValue: 'General',
        validate: {
          len: [2, 100],
        },
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
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: true,
      hooks: {
        beforeSave: async (user: User) => {
          await user.hashPassword();
        },
      },
      indexes: [
        {
          unique: true,
          fields: ['email'],
        },
        {
          fields: ['emailVerificationToken'],
        },
        {
          fields: ['passwordResetToken'],
        },
        {
          fields: ['isActive'],
        },
      ],
    }
  );

  return User;
}
