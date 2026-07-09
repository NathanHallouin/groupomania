import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { AuthenticatedUser } from '../types';

/**
 * Custom error class for the application
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * JWT authentication middleware
 * Validates tokens issued by the Auth Service
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. Token required',
      });
      return;
    }

    const token = authHeader.substring(7);

    // Verify the token with the same secret as Auth Service
    const decoded = jwt.verify(token, config.jwt.secret) as AuthenticatedUser;

    // Add user information to the request
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: 'Token expired',
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }
};

/**
 * WebSocket authentication middleware
 */
export const authenticateSocket = (socket: any, next: any): void => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Token required'));
    }

    const decoded = jwt.verify(token, config.jwt.secret) as AuthenticatedUser;
    socket.user = decoded;

    next();
  } catch (error) {
    console.error('WebSocket authentication error:', error);
    next(new Error('Invalid token'));
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to verify channel membership
 */
export const requireChannelMembership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { channelId } = req.params;
    const userId = req.user.userId;

    // Dynamic import to avoid circular dependencies
    const { Channel, ChannelMember } = await import('../models');

    // Check if the channel exists
    const channel = await Channel.findByPk(channelId, {
      include: [{ model: ChannelMember, as: 'members' }],
    });

    if (!channel) {
      res.status(404).json({
        success: false,
        message: 'Channel not found',
      });
      return;
    }

    // Check if the user can view the channel
    if (!channel.canUserView(userId, req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access to channel denied',
      });
      return;
    }

    // Add the channel to the request to avoid reloading it
    (req as any).channel = channel;

    next();
  } catch (error) {
    console.error('Channel membership verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

/**
 * Middleware to verify message permissions
 */
export const requireMessagePermission = (action: 'edit' | 'delete') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { messageId } = req.params;
      const userId = req.user.userId;

      // Dynamic import to avoid circular dependencies
      const { Message } = await import('../models');

      const message = await Message.findByPk(messageId);

      if (!message) {
        res.status(404).json({
          success: false,
          message: 'Message not found',
        });
        return;
      }

      // Check permissions based on action
      let hasPermission = false;

      if (action === 'edit') {
        hasPermission = message.canEdit(userId, req.user.role);
      } else if (action === 'delete') {
        hasPermission = message.canDelete(userId, req.user.role);
      }

      if (!hasPermission) {
        res.status(403).json({
          success: false,
          message: `Permission denied to ${action} this message`,
        });
        return;
      }

      // Add the message to the request
      (req as any).message = message;

      next();
    } catch (error) {
      console.error('Message permission verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  };
};

/**
 * Middleware to validate channel admin permissions
 */
export const requireChannelAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    const { channelId } = req.params;
    const userId = req.user.userId;

    // Dynamic import
    const { Channel, ChannelMember } = await import('../models');

    const channel = await Channel.findByPk(channelId, {
      include: [{ model: ChannelMember, as: 'members' }],
    });

    if (!channel) {
      res.status(404).json({
        success: false,
        message: 'Channel not found',
      });
      return;
    }

    // Check if the user is owner, channel admin, or system admin
    const member = channel.members?.find(m => m.userId === userId);
    const isChannelAdmin = member && ['owner', 'admin'].includes(member.role);
    const isSystemAdmin = req.user.role === 'admin';

    if (!isChannelAdmin && !isSystemAdmin) {
      res.status(403).json({
        success: false,
        message: 'Admin permissions required',
      });
      return;
    }

    (req as any).channel = channel;
    (req as any).channelMember = member;

    next();
  } catch (error) {
    console.error('Admin permission verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
