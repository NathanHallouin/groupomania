import { Model, Table, Column, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo, Index, Unique } from 'sequelize-typescript';
import { ChannelMemberAttributes, ChannelRole } from '../types';
import { Channel } from './Channel';

/**
 * Modèle ChannelMember - Représente l'adhésion d'un utilisateur à un canal
 */
@Table({
  tableName: 'channel_members',
  timestamps: true,
  indexes: [
    { fields: ['channelId', 'userId'], unique: true },
    { fields: ['userId'] },
    { fields: ['role'] },
    { fields: ['joinedAt'] },
  ],
})
export class ChannelMember extends Model<ChannelMemberAttributes> implements ChannelMemberAttributes {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  public id!: number;

  @ForeignKey(() => Channel)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'ID du canal',
  })
  @Index
  public channelId!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'ID de l\'utilisateur',
  })
  @Index
  public userId!: number;

  @Column({
    type: DataType.ENUM('owner', 'admin', 'moderator', 'member'),
    allowNull: false,
    defaultValue: 'member',
    comment: 'Rôle dans le canal',
  })
  @Index
  public role!: ChannelRole;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    comment: 'Date d\'adhésion au canal',
  })
  @Index
  public joinedAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    comment: 'Date de dernier message lu',
  })
  public lastRead?: Date;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Utilisateur en sourdine',
  })
  public isMuted!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Utilisateur bloqué',
  })
  public isBlocked!: boolean;

  // Timestamps automatiques
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Relations
  @BelongsTo(() => Channel)
  public channel!: Channel;

  /**
   * Marquer les messages comme lus jusqu'à maintenant
   */
  public async markAsRead(): Promise<void> {
    this.lastRead = new Date();
    await this.save();
  }

  /**
   * Vérifier si le membre peut effectuer une action
   */
  public canPerformAction(action: string): boolean {
    const permissions = this.getRolePermissions();
    return permissions.includes(action);
  }

  /**
   * Obtenir les permissions selon le rôle
   */
  public getRolePermissions(): string[] {
    const basePermissions = ['read_messages', 'send_messages'];
    
    switch (this.role) {
      case 'owner':
        return [
          ...basePermissions,
          'manage_channel',
          'delete_channel',
          'manage_members',
          'kick_members',
          'ban_members',
          'manage_messages',
          'delete_any_message',
          'pin_messages',
          'modify_settings',
        ];
      
      case 'admin':
        return [
          ...basePermissions,
          'manage_members',
          'kick_members',
          'ban_members',
          'manage_messages',
          'delete_any_message',
          'pin_messages',
        ];
      
      case 'moderator':
        return [
          ...basePermissions,
          'manage_messages',
          'delete_any_message',
          'kick_members',
        ];
      
      case 'member':
      default:
        return [
          ...basePermissions,
          'edit_own_messages',
          'delete_own_messages',
        ];
    }
  }

  /**
   * Vérifier si le membre peut gérer un autre membre
   */
  public canManageMember(targetMemberRole: ChannelRole): boolean {
    const roleHierarchy = {
      owner: 4,
      admin: 3,
      moderator: 2,
      member: 1,
    };

    const currentLevel = roleHierarchy[this.role];
    const targetLevel = roleHierarchy[targetMemberRole];

    return currentLevel > targetLevel;
  }

  /**
   * Promouvoir le membre à un rôle supérieur
   */
  public async promote(): Promise<boolean> {
    const promotionPath: Record<ChannelRole, ChannelRole | null> = {
      member: 'moderator',
      moderator: 'admin',
      admin: 'owner',
      owner: null, // Ne peut pas être promu plus haut
    };

    const newRole = promotionPath[this.role];
    if (!newRole) {
      return false;
    }

    this.role = newRole;
    await this.save();
    return true;
  }

  /**
   * Rétrograder le membre à un rôle inférieur
   */
  public async demote(): Promise<boolean> {
    const demotionPath: Record<ChannelRole, ChannelRole | null> = {
      owner: 'admin',
      admin: 'moderator',
      moderator: 'member',
      member: null, // Ne peut pas être rétrogradé plus bas
    };

    const newRole = demotionPath[this.role];
    if (!newRole) {
      return false;
    }

    this.role = newRole;
    await this.save();
    return true;
  }

  /**
   * Calculer la durée d'adhésion
   */
  public get membershipDuration(): number {
    const now = new Date();
    const joined = new Date(this.joinedAt);
    return now.getTime() - joined.getTime();
  }

  /**
   * Vérifier si c'est un membre récent (moins de 7 jours)
   */
  public get isNewMember(): boolean {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return new Date(this.joinedAt) > sevenDaysAgo;
  }

  /**
   * Sérialisation pour API publique
   */
  public toPublicJSON(): any {
    return {
      id: this.id,
      channelId: this.channelId,
      userId: this.userId,
      role: this.role,
      joinedAt: this.joinedAt,
      lastRead: this.lastRead,
      isMuted: this.isMuted,
      isBlocked: this.isBlocked,
      isNewMember: this.isNewMember,
      membershipDuration: this.membershipDuration,
      permissions: this.getRolePermissions(),
    };
  }

  /**
   * Sérialisation pour WebSocket
   */
  public toSocketJSON(): any {
    return {
      userId: this.userId,
      role: this.role,
      joinedAt: this.joinedAt,
      isMuted: this.isMuted,
    };
  }
}
