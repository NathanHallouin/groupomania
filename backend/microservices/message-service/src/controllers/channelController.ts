import { Request, Response } from 'express';
import { ChannelService } from '../services/channelService';
import { asyncHandler } from '../middleware/errorHandler';
import { validationResult } from 'express-validator';
import { AuthenticatedUser, ChannelType } from '../types';

// Interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Sérialise une entité de manière défensive : les valeurs venant du cache Redis
 * sont des objets simples (pas d'instance Sequelize, donc pas de `toJSON`).
 */
const serialize = (entity: any): any =>
  entity && typeof entity.toJSON === 'function' ? entity.toJSON() : entity;

/**
 * Controller for channel management
 */
export class ChannelController {
  private channelService: ChannelService;

  constructor() {
    this.channelService = new ChannelService();
  }

  /**
   * Create a new channel
   */
  createChannel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid validation data',
        errors: errors.array(),
      });
    }

    const { name, description, type, isPrivate } = req.body;
    const userId = req.user!.userId;

    try {
      const channel = await this.channelService.createChannel(
        {
          name,
          description,
          type,
          isPrivate: isPrivate || false,
        },
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Channel created successfully',
        data: {
          channel: serialize(channel),
        },
      });
    } catch (error: any) {
      console.error('Error creating channel:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error creating channel',
      });
    }
  });

  /**
   * Get a channel by ID
   */
  getChannelById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const channelId = parseInt(req.params.id);

    if (isNaN(channelId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel ID',
      });
    }

    try {
      const channel = await this.channelService.getChannelById(channelId);

      if (!channel) {
        return res.status(404).json({
          success: false,
          message: 'Channel not found',
        });
      }

      // Check view permissions
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const canView = await this.channelService.canUserViewChannel(channelId, userId, userRole);

      if (!canView) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this channel',
        });
      }

      res.json({
        success: true,
        data: {
          channel: serialize(channel),
        },
      });
    } catch (error: any) {
      console.error('Error retrieving channel:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error retrieving channel',
      });
    }
  });

  /**
   * List public channels (discovery). Renvoie data: Channel[] + meta.
   */
  getChannels = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    try {
      const result = await this.channelService.getPublicChannels({ page, limit });

      res.json({
        success: true,
        data: result.channels.map(channel => serialize(channel)),
        meta: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      });
    } catch (error: any) {
      console.error('Error listing channels:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error listing channels',
      });
    }
  });

  /**
   * Get user channels
   */
  getUserChannels = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;

    try {
      const channels = await this.channelService.getUserChannels(userId);

      res.json({
        success: true,
        data: {
          channels: channels.map(channel => serialize(channel)),
        },
      });
    } catch (error: any) {
      console.error('Error retrieving user channels:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error retrieving channels',
      });
    }
  });

  /**
   * Update a channel
   */
  updateChannel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid validation data',
        errors: errors.array(),
      });
    }

    const channelId = parseInt(req.params.id);

    if (isNaN(channelId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel ID',
      });
    }

    const { name, description, isPrivate } = req.body;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    try {
      const channel = await this.channelService.updateChannel(
        channelId,
        { name, description, isPrivate },
        userId,
        userRole
      );

      res.json({
        success: true,
        message: 'Channel updated successfully',
        data: {
          channel: serialize(channel),
        },
      });
    } catch (error: any) {
      console.error('Error updating channel:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error updating channel',
      });
    }
  });

  /**
   * Delete a channel
   */
  deleteChannel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const channelId = parseInt(req.params.id);

    if (isNaN(channelId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel ID',
      });
    }

    const userId = req.user!.userId;
    const userRole = req.user!.role;

    try {
      await this.channelService.deleteChannel(channelId, userId, userRole);

      res.json({
        success: true,
        message: 'Channel deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting channel:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error deleting channel',
      });
    }
  });

  /**
   * Add a member to the channel
   */
  addMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid validation data',
        errors: errors.array(),
      });
    }

    const channelId = parseInt(req.params.id);

    if (isNaN(channelId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel ID',
      });
    }

    const { userId: targetUserId, role } = req.body;
    const inviterId = req.user!.userId;
    const inviterRole = req.user!.role;

    try {
      const member = await this.channelService.addMember(
        channelId,
        targetUserId,
        inviterId,
        inviterRole,
        role
      );

      res.status(201).json({
        success: true,
        message: 'Member added to channel successfully',
        data: {
          member: serialize(member),
        },
      });
    } catch (error: any) {
      console.error('Error adding member:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error adding member',
      });
    }
  });

  /**
   * Remove a member from the channel
   */
  removeMember = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const channelId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);

    if (isNaN(channelId) || isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel or user ID',
      });
    }

    const removerId = req.user!.userId;
    const removerRole = req.user!.role;

    try {
      await this.channelService.removeMember(channelId, targetUserId, removerId, removerRole);

      res.json({
        success: true,
        message: 'Member removed from channel successfully',
      });
    } catch (error: any) {
      console.error('Error removing member:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error removing member',
      });
    }
  });

  /**
   * Update a member's role
   */
  updateMemberRole = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid validation data',
        errors: errors.array(),
      });
    }

    const channelId = parseInt(req.params.id);
    const targetUserId = parseInt(req.params.userId);

    if (isNaN(channelId) || isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel or user ID',
      });
    }

    const { role } = req.body;
    const updaterId = req.user!.userId;
    const updaterRole = req.user!.role;

    try {
      const member = await this.channelService.updateMemberRole(
        channelId,
        targetUserId,
        role,
        updaterId,
        updaterRole
      );

      res.json({
        success: true,
        message: 'Member role updated successfully',
        data: {
          member: serialize(member),
        },
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error updating role',
      });
    }
  });

  /**
   * Join a public channel
   */
  joinChannel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const channelId = parseInt(req.params.id);

    if (isNaN(channelId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel ID',
      });
    }

    const userId = req.user!.userId;

    try {
      const member = await this.channelService.joinChannel(channelId, userId);

      res.status(201).json({
        success: true,
        message: 'Channel joined successfully',
        data: {
          member: serialize(member),
        },
      });
    } catch (error: any) {
      console.error('Error joining channel:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error joining channel',
      });
    }
  });

  /**
   * Leave a channel
   */
  leaveChannel = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const channelId = parseInt(req.params.id);

    if (isNaN(channelId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel ID',
      });
    }

    const userId = req.user!.userId;

    try {
      await this.channelService.leaveChannel(channelId, userId);

      res.json({
        success: true,
        message: 'Channel left successfully',
      });
    } catch (error: any) {
      console.error('Error leaving channel:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error leaving channel',
      });
    }
  });

  /**
   * Search public channels
   */
  searchChannels = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query = req.query.q as string;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must contain at least 2 characters',
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    try {
      const result = await this.channelService.searchPublicChannels(
        query.trim(),
        { page, limit }
      );

      res.json({
        success: true,
        data: {
          channels: result.channels.map(channel => serialize(channel)),
          pagination: {
            page,
            limit,
            total: result.total,
          },
        },
      });
    } catch (error: any) {
      console.error('Error searching channels:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error searching channels',
      });
    }
  });
}
