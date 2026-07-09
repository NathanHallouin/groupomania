import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import { UserRole, UserStatus, UserPreferences } from '../types';

/**
 * Interface pour les attributs utilisateur étendus
 */
export interface UserAttributes {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  position?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: {
    thumbnail: string;
    medium: string;
    large: string;
  } | null;
  bio?: string;
  phone?: string;
  location?: string;
  birthDate?: Date;
  hireDate?: Date;
  manager?: number; // ID du manager
  preferences: UserPreferences;
  lastLogin?: Date;
  isEmailVerified: boolean;
  isProfileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Attributs optionnels lors de la création
 */
export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

/**
 * Modèle User avec profil étendu
 */
export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public firstName!: string;
  public lastName!: string;
  public department!: string;
  public position?: string;
  public role!: UserRole;
  public status!: UserStatus;
  public avatar?: {
    thumbnail: string;
    medium: string;
    large: string;
  } | null;
  public bio?: string;
  public phone?: string;
  public location?: string;
  public birthDate?: Date;
  public hireDate?: Date;
  public manager?: number;
  public preferences!: UserPreferences;
  public lastLogin?: Date;
  public isEmailVerified!: boolean;
  public isProfileComplete!: boolean;

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  /**
   * Obtenir le nom complet
   */
  public get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  /**
   * Obtenir l'URL de l'avatar avec fallback
   */
  public get avatarUrl(): string {
    if (this.avatar?.medium) {
      return this.avatar.medium.startsWith('http') 
        ? this.avatar.medium 
        : `/uploads/avatars/${this.avatar.medium}`;
    }
    
    // Gravatar fallback basé sur l'email
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(this.email.toLowerCase()).digest('hex');
    return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
  }

  /**
   * Vérifier si le profil est complet
   */
  public checkProfileCompleteness(): boolean {
    const requiredFields = [
      this.firstName,
      this.lastName,
      this.email,
      this.department,
      this.position,
    ];

    const isComplete = requiredFields.every(field => field && field.trim().length > 0);
    
    if (this.isProfileComplete !== isComplete) {
      this.isProfileComplete = isComplete;
    }

    return isComplete;
  }

  /**
   * Mettre à jour la dernière connexion
   */
  public async updateLastLogin(): Promise<void> {
    this.lastLogin = new Date();
    await this.save();
  }

  /**
   * Obtenir les préférences avec valeurs par défaut
   */
  public getPreferencesWithDefaults(): UserPreferences {
    const defaultPreferences: UserPreferences = {
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
    };

    return {
      ...defaultPreferences,
      ...this.preferences,
      notifications: {
        ...defaultPreferences.notifications,
        ...this.preferences?.notifications,
      },
      privacy: {
        ...defaultPreferences.privacy,
        ...this.preferences?.privacy,
      },
    };
  }

  /**
   * Sérialiser pour JSON (version publique)
   */
  public toPublicJSON(): Partial<UserAttributes> {
    const preferences = this.getPreferencesWithDefaults();
    
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      fullName: this.fullName,
      email: preferences.privacy.showEmail ? this.email : undefined,
      department: preferences.privacy.showDepartment ? this.department : undefined,
      position: this.position,
      role: this.role,
      status: this.status,
      avatar: this.avatarUrl,
      bio: this.bio,
      location: this.location,
      lastLogin: preferences.privacy.showLastLogin ? this.lastLogin : undefined,
      isProfileComplete: this.isProfileComplete,
      createdAt: this.createdAt,
    } as any;
  }

  /**
   * Sérialiser pour JSON (version privée/propriétaire)
   */
  public toPrivateJSON(): Partial<UserAttributes> {
    return {
      ...this.toPublicJSON(),
      email: this.email,
      phone: this.phone,
      birthDate: this.birthDate,
      hireDate: this.hireDate,
      manager: this.manager,
      preferences: this.getPreferencesWithDefaults(),
      isEmailVerified: this.isEmailVerified,
      lastLogin: this.lastLogin,
      updatedAt: this.updatedAt,
    } as any;
  }

  /**
   * Associations
   */
  public static associate(): void {
    // Auto-association pour le manager
    User.belongsTo(User, {
      as: 'Manager',
      foreignKey: 'manager',
    });

    User.hasMany(User, {
      as: 'DirectReports',
      foreignKey: 'manager',
    });
  }
}
