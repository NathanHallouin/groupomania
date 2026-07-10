import { Channel } from '../models/Channel';
import { ChannelMember } from '../models/ChannelMember';
import { Message } from '../models/Message';
import { ChannelAttributes, ChannelType, UserRole, ChannelMemberRole } from '../types';
import { ValidationError, NotFoundError, UnauthorizedError } from '../middleware/errorHandler';
import { RedisService } from './redisService';
import { Op } from 'sequelize';
import { sequelize } from '../models';

/**
 * Service for channel management
 */
export class ChannelService {
  private redisService: RedisService;

  constructor() {
    this.redisService = new RedisService();
  }

  /**
   * Create a new channel
   */
  async createChannel(channelData: Partial<ChannelAttributes>, creatorId: number): Promise<Channel> {
    const transaction = await sequelize.transaction();

    let channel: Channel;
    try {
      // Required data validation
      if (!channelData.name || !channelData.type) {
        throw new ValidationError('Channel name and type required');
      }

      // Create the channel
      channel = await Channel.create({
        ...channelData,
        ownerId: creatorId,
        createdBy: creatorId,
      } as ChannelAttributes, { transaction });

      // Add the creator as channel admin
      await ChannelMember.create({
        channelId: channel.id,
        userId: creatorId,
        role: ChannelMemberRole.ADMIN,
        joinedAt: new Date(),
        canRead: true,
        canWrite: true,
        canModerate: true,
        canManageMembers: true,
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // Lecture des associations APRÈS le commit : une erreur ici ne doit pas
    // déclencher un rollback sur une transaction déjà finalisée.
    return (await this.getChannelById(channel.id)) ?? channel;
  }

  /**
   * Get a channel by ID
   */
  async getChannelById(channelId: number): Promise<Channel | null> {
    const cacheKey = `channel:${channelId}`;

    // Check Redis cache
    const cachedChannel = await this.redisService.get(cacheKey);
    if (cachedChannel) {
      return cachedChannel as Channel;
    }

    // Retrieve from database. Pas d'include `user`/`creator` : l'identité vit
    // dans un autre service (pas de modèle User ici).
    const channel = await Channel.findByPk(channelId, {
      include: [
        {
          model: ChannelMember,
          as: 'members',
        },
      ],
    });

    // Cache if found
    if (channel) {
      await this.redisService.set(cacheKey, channel, 1800); // 30 minutes
    }

    return channel;
  }

  /**
   * Get a user's channels
   */
  async getUserChannels(userId: number): Promise<Channel[]> {
    const cacheKey = `user:${userId}:channels`;

    // Check Redis cache
    const cachedChannels = await this.redisService.get(cacheKey);
    if (cachedChannels) {
      return cachedChannels as Channel[];
    }

    // Retrieve from database
    const channels = await Channel.findAll({
      include: [
        {
          model: ChannelMember,
          as: 'members',
          where: { userId },
          required: true,
        },
      ],
      order: [['updatedAt', 'DESC']],
    });

    // Cache
    await this.redisService.set(cacheKey, channels, 900); // 15 minutes

    return channels;
  }

  /**
   * Update a channel
   */
  async updateChannel(
    channelId: number,
    updateData: Partial<ChannelAttributes>,
    userId: number,
    userRole: UserRole
  ): Promise<Channel> {
    const transaction = await sequelize.transaction();

    try {
      // Retrieve existing channel
      const channel = await Channel.findByPk(channelId, { transaction });
      if (!channel) {
        throw new NotFoundError('Channel not found');
      }

      // Check permissions
      const canManage = await this.checkManagePermission(channelId, userId, userRole);
      if (!canManage) {
        throw new UnauthorizedError('Insufficient permissions to modify this channel');
      }

      // Update the channel
      await channel.update(updateData, { transaction });

      // Invalidate cache
      await this.redisService.del(`channel:${channelId}`);

      await transaction.commit();

      // Return the updated channel
      return await this.getChannelById(channelId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete a channel
   */
  async deleteChannel(channelId: number, userId: number, userRole: UserRole): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      // Retrieve existing channel
      const channel = await Channel.findByPk(channelId, { transaction });
      if (!channel) {
        throw new NotFoundError('Channel not found');
      }

      // Check permissions (only admins and creator can delete)
      const canDelete = userRole === UserRole.ADMIN || channel.createdBy === userId;
      if (!canDelete) {
        throw new UnauthorizedError('Insufficient permissions to delete this channel');
      }

      // Delete the channel (members and messages will be deleted in cascade)
      await channel.destroy({ transaction });

      // Invalidate caches
      await this.redisService.del(`channel:${channelId}`);
      await this.invalidateUserChannelsCaches(channelId);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Add a member to the channel
   */
  async addMember(
    channelId: number,
    targetUserId: number,
    inviterId: number,
    inviterRole: UserRole,
    memberRole: ChannelMemberRole = ChannelMemberRole.MEMBER
  ): Promise<ChannelMember> {
    const transaction = await sequelize.transaction();

    try {
      // Check that the channel exists
      const channel = await Channel.findByPk(channelId, { transaction });
      if (!channel) {
        throw new NotFoundError('Channel not found');
      }

      // Check invitation permissions
      const canInvite = await this.checkManageMembersPermission(channelId, inviterId, inviterRole);
      if (!canInvite) {
        throw new UnauthorizedError('Insufficient permissions to invite members');
      }

      // Check if the user is not already a member
      const existingMember = await ChannelMember.findOne({
        where: { channelId, userId: targetUserId },
        transaction,
      });

      if (existingMember) {
        throw new ValidationError('User is already a member of this channel');
      }

      // Create membership
      const member = await ChannelMember.create({
        channelId,
        userId: targetUserId,
        role: memberRole,
        joinedAt: new Date(),
        canRead: true,
        canWrite: memberRole !== ChannelMemberRole.READ_ONLY,
        canModerate: memberRole === ChannelMemberRole.MODERATOR || memberRole === ChannelMemberRole.ADMIN,
        canManageMembers: memberRole === ChannelMemberRole.ADMIN,
      }, { transaction });

      // Invalidate caches
      await this.redisService.del(`channel:${channelId}`);
      await this.redisService.del(`user:${targetUserId}:channels`);

      await transaction.commit();

      // Pas de refetch avec include `user` (association cross-service inexistante) :
      // on retourne le membre créé.
      return member;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Remove a member from the channel
   */
  async removeMember(
    channelId: number,
    targetUserId: number,
    removerId: number,
    removerRole: UserRole
  ): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      // Check that the channel exists
      const channel = await Channel.findByPk(channelId, { transaction });
      if (!channel) {
        throw new NotFoundError('Channel not found');
      }

      // Retrieve the member to delete
      const member = await ChannelMember.findOne({
        where: { channelId, userId: targetUserId },
        transaction,
      });

      if (!member) {
        throw new NotFoundError('Member not found in this channel');
      }

      // Check permissions
      const canRemove = await this.checkRemoveMemberPermission(
        channelId,
        removerId,
        removerRole,
        targetUserId,
        member.role
      );

      if (!canRemove) {
        throw new UnauthorizedError('Insufficient permissions to remove this member');
      }

      // Prevent deletion of the last admin
      if (member.role === ChannelMemberRole.ADMIN) {
        const adminCount = await ChannelMember.count({
          where: {
            channelId,
            role: ChannelMemberRole.ADMIN
          },
          transaction,
        });

        if (adminCount <= 1) {
          throw new ValidationError('Cannot remove the last administrator from the channel');
        }
      }

      // Delete the member
      await member.destroy({ transaction });

      // Invalidate caches
      await this.redisService.del(`channel:${channelId}`);
      await this.redisService.del(`user:${targetUserId}:channels`);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update a member's role
   */
  async updateMemberRole(
    channelId: number,
    targetUserId: number,
    newRole: ChannelMemberRole,
    updaterId: number,
    updaterRole: UserRole
  ): Promise<ChannelMember> {
    const transaction = await sequelize.transaction();

    try {
      // Check permissions
      const canManage = await this.checkManageMembersPermission(channelId, updaterId, updaterRole);
      if (!canManage) {
        throw new UnauthorizedError('Insufficient permissions to modify roles');
      }

      // Retrieve the member
      const member = await ChannelMember.findOne({
        where: { channelId, userId: targetUserId },
        transaction,
      });

      if (!member) {
        throw new NotFoundError('Member not found in this channel');
      }

      // Update the role and permissions
      await member.update({
        role: newRole,
        canRead: true,
        canWrite: newRole !== ChannelMemberRole.READ_ONLY,
        canModerate: newRole === ChannelMemberRole.MODERATOR || newRole === ChannelMemberRole.ADMIN,
        canManageMembers: newRole === ChannelMemberRole.ADMIN,
      }, { transaction });

      // Invalidate cache
      await this.redisService.del(`channel:${channelId}`);

      await transaction.commit();

      // Return the updated member
      return await ChannelMember.findByPk(member.id, {
        include: ['user', 'channel'],
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Join a public channel
   */
  async joinChannel(channelId: number, userId: number): Promise<ChannelMember> {
    const transaction = await sequelize.transaction();

    try {
      // Check that the channel exists and is public
      const channel = await Channel.findByPk(channelId, { transaction });
      if (!channel) {
        throw new NotFoundError('Channel not found');
      }

      if (channel.type !== ChannelType.PUBLIC) {
        throw new ValidationError('Only public channels can be joined directly');
      }

      // Check if the user is not already a member
      const existingMember = await ChannelMember.findOne({
        where: { channelId, userId },
        transaction,
      });

      if (existingMember) {
        throw new ValidationError('You are already a member of this channel');
      }

      // Create membership
      const member = await ChannelMember.create({
        channelId,
        userId,
        role: ChannelMemberRole.MEMBER,
        joinedAt: new Date(),
        canRead: true,
        canWrite: true,
        canModerate: false,
        canManageMembers: false,
      }, { transaction });

      // Invalidate caches
      await this.redisService.del(`channel:${channelId}`);
      await this.redisService.del(`user:${userId}:channels`);

      await transaction.commit();

      // Pas de refetch avec include `user` (association cross-service inexistante).
      return member;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Leave a channel
   */
  async leaveChannel(channelId: number, userId: number): Promise<void> {
    const transaction = await sequelize.transaction();

    try {
      // Retrieve the member
      const member = await ChannelMember.findOne({
        where: { channelId, userId },
        transaction,
      });

      if (!member) {
        throw new NotFoundError('You are not a member of this channel');
      }

      // Prevent the last admin from leaving
      if (member.role === ChannelMemberRole.ADMIN) {
        const adminCount = await ChannelMember.count({
          where: {
            channelId,
            role: ChannelMemberRole.ADMIN
          },
          transaction,
        });

        if (adminCount <= 1) {
          throw new ValidationError('Cannot leave the channel as the last administrator');
        }
      }

      // Delete membership
      await member.destroy({ transaction });

      // Invalidate caches
      await this.redisService.del(`channel:${channelId}`);
      await this.redisService.del(`user:${userId}:channels`);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Check if a user can view a channel
   */
  async canUserViewChannel(channelId: number, userId: number, userRole: UserRole): Promise<boolean> {
    // Admins have access to everything
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return false;
    }

    // Canal public : visible par tout utilisateur authentifié (sans être membre).
    if (channel.type === ChannelType.PUBLIC) {
      return true;
    }

    // Propriétaire
    if (channel.ownerId === userId) {
      return true;
    }

    // Sinon (privé / groupe / direct) : appartenance requise
    const membership = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    return !!membership;
  }

  /**
   * Search public channels
   */
  /**
   * Liste les canaux publics (pour la découverte / rejoindre un canal).
   */
  async getPublicChannels(
    options: { page?: number; limit?: number } = {}
  ): Promise<{ channels: Channel[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await Channel.findAndCountAll({
      where: { type: ChannelType.PUBLIC },
      include: [{ model: ChannelMember, as: 'members', attributes: ['id'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      distinct: true, // count les canaux, pas les lignes de jointure des membres
    });

    return { channels: rows, total: count };
  }

  async searchPublicChannels(
    query: string,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ channels: Channel[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await Channel.findAndCountAll({
      where: {
        type: ChannelType.PUBLIC,
        [Op.or]: [
          { name: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
        ],
      },
      include: [
        {
          model: ChannelMember,
          as: 'members',
          attributes: ['id'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      channels: rows,
      total: count,
    };
  }

  /**
   * Check channel management permissions
   */
  private async checkManagePermission(channelId: number, userId: number, userRole: UserRole): Promise<boolean> {
    // Admins always have permissions
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Check if the user is a channel admin
    const membership = await ChannelMember.findOne({
      where: {
        channelId,
        userId,
        role: ChannelMemberRole.ADMIN
      },
    });

    return !!membership;
  }

  /**
   * Check member management permissions
   */
  private async checkManageMembersPermission(channelId: number, userId: number, userRole: UserRole): Promise<boolean> {
    // Admins always have permissions
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Check if the user can manage members
    const membership = await ChannelMember.findOne({
      where: {
        channelId,
        userId,
        canManageMembers: true
      },
    });

    return !!membership;
  }

  /**
   * Check member removal permissions
   */
  private async checkRemoveMemberPermission(
    channelId: number,
    removerId: number,
    removerRole: UserRole,
    targetUserId: number,
    targetRole: ChannelMemberRole
  ): Promise<boolean> {
    // System admins can do everything
    if (removerRole === UserRole.ADMIN) {
      return true;
    }

    // A user can remove themselves
    if (removerId === targetUserId) {
      return true;
    }

    // Check remover permissions
    const removerMembership = await ChannelMember.findOne({
      where: { channelId, userId: removerId },
    });

    if (!removerMembership || !removerMembership.canManageMembers) {
      return false;
    }

    // A channel admin cannot remove another admin
    if (targetRole === ChannelMemberRole.ADMIN && removerMembership.role !== ChannelMemberRole.ADMIN) {
      return false;
    }

    return true;
  }

  /**
   * Invalidate user channel caches
   */
  private async invalidateUserChannelsCaches(channelId: number): Promise<void> {
    // Retrieve all channel members to invalidate their caches
    const members = await ChannelMember.findAll({
      where: { channelId },
      attributes: ['userId'],
    });

    const promises = members.map(member =>
      this.redisService.del(`user:${member.userId}:channels`)
    );

    await Promise.all(promises);
  }
}
