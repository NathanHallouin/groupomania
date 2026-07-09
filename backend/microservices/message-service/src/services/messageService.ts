import { Message } from '../models/Message';
import { Reaction } from '../models/Reaction';
import { Channel } from '../models/Channel';
import { ChannelMember } from '../models/ChannelMember';
import { MessageAttributes, ReactionType, UserRole, ChannelMemberRole } from '../types';
import { ValidationError, NotFoundError, UnauthorizedError } from '../middleware/errorHandler';
import { RedisService } from './redisService';
import { Op } from 'sequelize';
import { sequelize } from '../models';

/**
 * Service for message management
 */
export class MessageService {
  private redisService: RedisService;

  constructor() {
    this.redisService = new RedisService();
  }

  /**
   * Create a new message
   */
  async createMessage(messageData: Partial<MessageAttributes>): Promise<Message> {
    const transaction = await sequelize.transaction();

    try {
      // Required data validation
      if (!messageData.content || !messageData.channelId || !messageData.authorId) {
        throw new ValidationError('Content, channel and author required');
      }

      // Check that the user can write to the channel
      const canWrite = await this.checkWritePermission(messageData.channelId!, messageData.authorId!);
      if (!canWrite) {
        throw new UnauthorizedError('Insufficient permissions to write in this channel');
      }

      // Create the message
      const message = await Message.create(messageData as MessageAttributes, { transaction });

      // Update channel cache
      await this.updateChannelCache(messageData.channelId!);

      await transaction.commit();

      // Return the message with associations
      return await this.getMessageById(message.id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get a message by ID
   */
  async getMessageById(messageId: number): Promise<Message | null> {
    const cacheKey = `message:${messageId}`;

    // Check Redis cache
    const cachedMessage = await this.redisService.get(cacheKey);
    if (cachedMessage) {
      return cachedMessage as Message;
    }

    // Retrieve from database
    // Note : pas d'include `author`/`user` — l'identité vit dans un autre service
    // (pas de modèle User ici). Seules les associations locales sont chargées.
    const message = await Message.findByPk(messageId, {
      include: [
        {
          model: Reaction,
          as: 'reactions',
        },
        'channel',
      ],
    });

    // Cache if found
    if (message) {
      await this.redisService.set(cacheKey, message, 3600); // 1 hour
    }

    return message;
  }

  /**
   * Get channel messages with pagination
   */
  async getChannelMessages(
    channelId: number,
    userId: number,
    userRole: UserRole,
    options: {
      page?: number;
      limit?: number;
      before?: number;
      after?: number;
    } = {}
  ): Promise<{ messages: Message[]; total: number; hasMore: boolean }> {
    // Check read permissions
    const canRead = await this.checkReadPermission(channelId, userId, userRole);
    if (!canRead) {
      throw new UnauthorizedError('Insufficient permissions to read this channel');
    }

    const { page = 1, limit = 50, before, after } = options;
    const offset = (page - 1) * limit;

    // Build search conditions
    const whereConditions: any = { channelId };

    if (before) {
      whereConditions.id = { [Op.lt]: before };
    }
    if (after) {
      whereConditions.id = { [Op.gt]: after };
    }

    // Retrieve messages
    const { count, rows } = await Message.findAndCountAll({
      where: whereConditions,
      // Pas d'include `author`/`user` (identité dans un autre service).
      include: [
        {
          model: Reaction,
          as: 'reactions',
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      messages: rows,
      total: count,
      hasMore: count > offset + limit,
    };
  }

  /**
   * Update a message
   */
  async updateMessage(
    messageId: number,
    updateData: Partial<MessageAttributes>,
    userId: number,
    userRole: UserRole
  ): Promise<Message> {
    const transaction = await sequelize.transaction();

    try {
      // Retrieve existing message
      const message = await Message.findByPk(messageId, { transaction });
      if (!message) {
        throw new NotFoundError('Message not found');
      }

      // Check permissions
      const canEdit = await this.checkEditPermission(message, userId, userRole);
      if (!canEdit) {
        throw new UnauthorizedError('Insufficient permissions to modify this message');
      }

      // Update the message
      await message.update(updateData, { transaction });

      // Invalidate cache
      await this.redisService.del(`message:${messageId}`);

      await transaction.commit();

      // Return the updated message
      return await this.getMessageById(messageId);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(
    messageId: number,
    userId: number,
    userRole: UserRole
  ): Promise<{ channelId: number }> {
    const transaction = await sequelize.transaction();

    try {
      // Retrieve existing message
      const message = await Message.findByPk(messageId, { transaction });
      if (!message) {
        throw new NotFoundError('Message not found');
      }

      // Check permissions
      const canDelete = await this.checkDeletePermission(message, userId, userRole);
      if (!canDelete) {
        throw new UnauthorizedError('Insufficient permissions to delete this message');
      }

      const channelId = message.channelId;

      // Delete the message (reactions will be deleted in cascade)
      await message.destroy({ transaction });

      // Invalidate cache
      await this.redisService.del(`message:${messageId}`);
      await this.updateChannelCache(channelId);

      await transaction.commit();

      return { channelId };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Add a reaction to a message
   */
  async addReaction(messageId: number, userId: number, reactionType: ReactionType): Promise<Reaction> {
    const transaction = await sequelize.transaction();

    try {
      // Check that the message exists
      const message = await Message.findByPk(messageId, { transaction });
      if (!message) {
        throw new NotFoundError('Message not found');
      }

      // Check channel read permissions
      const canRead = await this.checkReadPermission(message.channelId, userId, UserRole.USER);
      if (!canRead) {
        throw new UnauthorizedError('Insufficient permissions to react to this message');
      }

      // Check if the reaction already exists
      const existingReaction = await Reaction.findOne({
        where: {
          messageId,
          userId,
          type: reactionType,
        },
        transaction,
      });

      if (existingReaction) {
        throw new ValidationError('Reaction already exists');
      }

      // Create the reaction
      const reaction = await Reaction.create({
        messageId,
        userId,
        type: reactionType,
      }, { transaction });

      // Invalidate message cache
      await this.redisService.del(`message:${messageId}`);

      await transaction.commit();

      // Pas d'include `user` (identité dans un autre service).
      return reaction;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Remove a reaction from a message
   */
  async removeReaction(messageId: number, userId: number, reactionType: ReactionType): Promise<number> {
    const transaction = await sequelize.transaction();

    try {
      // Check that the message exists
      const message = await Message.findByPk(messageId, { transaction });
      if (!message) {
        throw new NotFoundError('Message not found');
      }

      // Find the reaction
      const reaction = await Reaction.findOne({
        where: {
          messageId,
          userId,
          type: reactionType,
        },
        transaction,
      });

      if (!reaction) {
        throw new NotFoundError('Reaction not found');
      }

      const reactionId = reaction.id;

      // Delete the reaction
      await reaction.destroy({ transaction });

      // Invalidate message cache
      await this.redisService.del(`message:${messageId}`);

      await transaction.commit();

      return reactionId;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Search messages
   */
  async searchMessages(
    query: string,
    channelId?: number,
    userId?: number,
    options: {
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ messages: Message[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // Build search conditions. Recherche sur le contenu (il n'existe pas de
    // colonne `mentions` : les mentions vivent dans `metadata`).
    const whereConditions: any = {
      content: { [Op.iLike]: `%${query}%` },
    };

    if (channelId) {
      whereConditions.channelId = channelId;
    }

    if (userId) {
      whereConditions.authorId = userId;
    }

    // Retrieve messages
    const { count, rows } = await Message.findAndCountAll({
      where: whereConditions,
      // Pas d'include `author`/`user` (identité dans un autre service).
      include: [
        {
          model: Reaction,
          as: 'reactions',
        },
        'channel',
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return {
      messages: rows,
      total: count,
    };
  }

  /**
   * Check read permissions
   */
  private async checkReadPermission(channelId: number, userId: number, userRole: UserRole): Promise<boolean> {
    // Admins always have access
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // Check channel membership
    const membership = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    return !!membership;
  }

  /**
   * Check write permissions
   */
  private async checkWritePermission(channelId: number, userId: number): Promise<boolean> {
    // Check channel membership
    const membership = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    if (!membership) {
      return false;
    }

    // Check channel permissions
    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return false;
    }

    // Le droit d'écriture découle du rôle : tout membre peut écrire sauf en
    // lecture seule. (Il n'existe pas de colonne `canWrite` en base.)
    return membership.role !== ChannelMemberRole.READ_ONLY;
  }

  /**
   * Check edit permissions
   */
  private async checkEditPermission(message: Message, userId: number, userRole: UserRole): Promise<boolean> {
    // Admins can edit all messages
    if (userRole === UserRole.ADMIN) {
      return true;
    }

    // The author can edit their own message
    if (message.authorId === userId) {
      return true;
    }

    // Moderators can edit messages in their channels
    if (userRole === UserRole.MODERATOR) {
      const membership = await ChannelMember.findOne({
        where: {
          channelId: message.channelId,
          userId,
          role: ['moderator', 'admin']
        },
      });
      return !!membership;
    }

    return false;
  }

  /**
   * Check delete permissions
   */
  private async checkDeletePermission(message: Message, userId: number, userRole: UserRole): Promise<boolean> {
    // Same logic as for editing
    return this.checkEditPermission(message, userId, userRole);
  }

  /**
   * Update channel cache
   */
  private async updateChannelCache(channelId: number): Promise<void> {
    await this.redisService.del(`channel:${channelId}:messages`);
    await this.redisService.del(`channel:${channelId}:last_message`);
  }
}
