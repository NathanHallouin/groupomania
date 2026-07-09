import { Request, Response } from 'express';
import { MessageService } from '../services/messageService';
import { asyncHandler } from '../middleware/errorHandler';
import { validationResult } from 'express-validator';
import { AuthenticatedRequest } from '../types';

/**
 * Controller for message management
 */
export class MessageController {
  private messageService: MessageService;

  constructor() {
    this.messageService = new MessageService();
  }

  /**
   * Create a new message
   */
  createMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid validation data',
        errors: errors.array(),
      });
    }

    const { content, channelId, parentId, attachments } = req.body;
    const userId = req.user!.userId;

    try {
      const message = await this.messageService.createMessage({
        content,
        channelId,
        authorId: userId,
        parentId,
        attachments,
      });

      res.status(201).json({
        success: true,
        message: 'Message created successfully',
        data: {
          message: message.toSocketJSON(),
        },
      });
    } catch (error: any) {
      console.error('Error creating message:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error creating message',
      });
    }
  });

  /**
   * Get a message by ID
   */
  getMessageById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const messageId = parseInt(req.params.id);

    if (isNaN(messageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID',
      });
    }

    try {
      const message = await this.messageService.getMessageById(messageId);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        });
      }

      res.json({
        success: true,
        data: {
          message: message.toSocketJSON(),
        },
      });
    } catch (error: any) {
      console.error('Error retrieving message:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error retrieving message',
      });
    }
  });

  /**
   * Get messages from a channel
   */
  getChannelMessages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const channelId = parseInt(req.params.channelId);

    if (isNaN(channelId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid channel ID',
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const before = req.query.before ? parseInt(req.query.before as string) : undefined;
    const after = req.query.after ? parseInt(req.query.after as string) : undefined;

    const userId = req.user!.userId;
    const userRole = req.user!.role;

    try {
      const result = await this.messageService.getChannelMessages(
        channelId,
        userId,
        userRole,
        { page, limit, before, after }
      );

      res.json({
        success: true,
        data: {
          messages: result.messages.map(message => message.toSocketJSON()),
          pagination: {
            page,
            limit,
            total: result.total,
            hasMore: result.hasMore,
          },
        },
      });
    } catch (error: any) {
      console.error('Error retrieving messages:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error retrieving messages',
      });
    }
  });

  /**
   * Update a message
   */
  updateMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid validation data',
        errors: errors.array(),
      });
    }

    const messageId = parseInt(req.params.id);

    if (isNaN(messageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID',
      });
    }

    const { content } = req.body;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    try {
      const message = await this.messageService.updateMessage(
        messageId,
        { content },
        userId,
        userRole
      );

      res.json({
        success: true,
        message: 'Message updated successfully',
        data: {
          message: message.toSocketJSON(),
        },
      });
    } catch (error: any) {
      console.error('Error updating message:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error updating message',
      });
    }
  });

  /**
   * Delete a message
   */
  deleteMessage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const messageId = parseInt(req.params.id);

    if (isNaN(messageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID',
      });
    }

    const userId = req.user!.userId;
    const userRole = req.user!.role;

    try {
      await this.messageService.deleteMessage(messageId, userId, userRole);

      res.json({
        success: true,
        message: 'Message deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting message:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error deleting message',
      });
    }
  });

  /**
   * Add a reaction to a message
   */
  addReaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid validation data',
        errors: errors.array(),
      });
    }

    const messageId = parseInt(req.params.id);

    if (isNaN(messageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID',
      });
    }

    const { reactionType } = req.body;
    const userId = req.user!.userId;

    try {
      const reaction = await this.messageService.addReaction(messageId, userId, reactionType);

      res.status(201).json({
        success: true,
        message: 'Reaction added successfully',
        data: {
          reaction: reaction.toSocketJSON(),
        },
      });
    } catch (error: any) {
      console.error('Error adding reaction:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error adding reaction',
      });
    }
  });

  /**
   * Remove a reaction from a message
   */
  removeReaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const messageId = parseInt(req.params.id);
    const reactionType = req.params.reactionType;

    if (isNaN(messageId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID',
      });
    }

    const userId = req.user!.userId;

    try {
      await this.messageService.removeReaction(messageId, userId, reactionType as any);

      res.json({
        success: true,
        message: 'Reaction removed successfully',
      });
    } catch (error: any) {
      console.error('Error removing reaction:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error removing reaction',
      });
    }
  });

  /**
   * Search messages
   */
  searchMessages = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query = req.query.q as string;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must contain at least 2 characters',
      });
    }

    const channelId = req.query.channelId ? parseInt(req.query.channelId as string) : undefined;
    const authorId = req.query.authorId ? parseInt(req.query.authorId as string) : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    try {
      const result = await this.messageService.searchMessages(
        query.trim(),
        channelId,
        authorId,
        { page, limit }
      );

      res.json({
        success: true,
        data: {
          messages: result.messages.map(message => message.toSocketJSON()),
          pagination: {
            page,
            limit,
            total: result.total,
          },
        },
      });
    } catch (error: any) {
      console.error('Error searching messages:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Error searching messages',
      });
    }
  });
}
