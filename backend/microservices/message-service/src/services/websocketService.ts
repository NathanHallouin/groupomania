import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { config } from '../config/config';
import { authenticateSocket } from '../middleware/auth';
import { MessageService } from './messageService';
import { ChannelService } from './channelService';
import { SocketEvents, RealTimeNotification, MessageAttributes, ReactionAttributes } from '../types';

/**
 * WebSocket service for real-time communications
 */
export class WebSocketService {
  private io: SocketIOServer;
  private messageService: MessageService;
  private channelService: ChannelService;
  private connectedUsers: Map<number, Set<string>> = new Map(); // userId -> Set<socketId>
  private userChannels: Map<string, Set<number>> = new Map(); // socketId -> Set<channelId>

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.cors.origin,
        credentials: config.cors.credentials,
      },
      transports: config.websocket.transports,
      pingTimeout: config.websocket.pingTimeout,
      pingInterval: config.websocket.pingInterval,
    });

    this.messageService = new MessageService();
    this.channelService = new ChannelService();

    this.initializeMiddleware();
    this.initializeEventHandlers();
  }

  /**
   * Initialize Socket.IO middlewares
   */
  private initializeMiddleware(): void {
    // Authentication
    this.io.use(authenticateSocket);

    // Connection logging
    this.io.use((socket, next) => {
      console.log(`New WebSocket connection: ${socket.id} (User: ${socket.user?.userId})`);
      next();
    });
  }

  /**
   * Initialize event handlers
   */
  private initializeEventHandlers(): void {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle a new connection
   */
  private handleConnection(socket: any): void {
    const userId = socket.user.userId;

    // Register user connection
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socket.id);

    // Initialize user channels
    this.userChannels.set(socket.id, new Set());

    // Channel events
    socket.on('join_channel', (channelId: number) => this.handleJoinChannel(socket, channelId));
    socket.on('leave_channel', (channelId: number) => this.handleLeaveChannel(socket, channelId));

    // Message events
    socket.on('send_message', (messageData: Partial<MessageAttributes>) =>
      this.handleSendMessage(socket, messageData));
    socket.on('edit_message', (messageId: number, content: string) =>
      this.handleEditMessage(socket, messageId, content));
    socket.on('delete_message', (messageId: number) =>
      this.handleDeleteMessage(socket, messageId));

    // Reaction events
    socket.on('add_reaction', (messageId: number, reactionType: string) =>
      this.handleAddReaction(socket, messageId, reactionType));
    socket.on('remove_reaction', (messageId: number, reactionType: string) =>
      this.handleRemoveReaction(socket, messageId, reactionType));

    // Typing events
    socket.on('typing_start', (channelId: number) => this.handleTypingStart(socket, channelId));
    socket.on('typing_stop', (channelId: number) => this.handleTypingStop(socket, channelId));

    // Disconnection
    socket.on('disconnect', () => this.handleDisconnection(socket));
  }

  /**
   * Join a channel
   */
  private async handleJoinChannel(socket: any, channelId: number): Promise<void> {
    try {
      const userId = socket.user.userId;
      const userRole = socket.user.role;

      // Check permissions
      const canJoin = await this.channelService.canUserViewChannel(channelId, userId, userRole);
      if (!canJoin) {
        socket.emit('error', { message: 'Access to channel denied' });
        return;
      }

      // Join Socket.IO room
      const roomName = `channel_${channelId}`;
      await socket.join(roomName);

      // Register the channel for this user
      this.userChannels.get(socket.id)?.add(channelId);

      // Notify other members
      socket.to(roomName).emit('member_joined', { channelId, userId });

      // Confirm to the user
      socket.emit('channel_joined', { channelId });

      console.log(`User ${userId} joined channel ${channelId}`);
    } catch (error) {
      console.error('Error joining channel:', error);
      socket.emit('error', { message: 'Error joining channel' });
    }
  }

  /**
   * Leave a channel
   */
  private async handleLeaveChannel(socket: any, channelId: number): Promise<void> {
    try {
      const userId = socket.user.userId;
      const roomName = `channel_${channelId}`;

      // Leave Socket.IO room
      await socket.leave(roomName);

      // Remove the channel from user's list
      this.userChannels.get(socket.id)?.delete(channelId);

      // Notify other members
      socket.to(roomName).emit('member_left', { channelId, userId });

      // Confirm to the user
      socket.emit('channel_left', { channelId });

      console.log(`User ${userId} left channel ${channelId}`);
    } catch (error) {
      console.error('Error leaving channel:', error);
      socket.emit('error', { message: 'Error leaving channel' });
    }
  }

  /**
   * Send a message
   */
  private async handleSendMessage(socket: any, messageData: Partial<MessageAttributes>): Promise<void> {
    try {
      const userId = socket.user.userId;

      // Complete message data
      const completeMessageData = {
        ...messageData,
        authorId: userId,
      };

      // Create message via service
      const message = await this.messageService.createMessage(completeMessageData);

      // Broadcast message to channel members
      const roomName = `channel_${message.channelId}`;
      this.io.to(roomName).emit('message_created', message.toSocketJSON());

      console.log(`Message ${message.id} created in channel ${message.channelId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Error sending message' });
    }
  }

  /**
   * Edit a message
   */
  private async handleEditMessage(socket: any, messageId: number, content: string): Promise<void> {
    try {
      const userId = socket.user.userId;
      const userRole = socket.user.role;

      // Edit message via service
      const message = await this.messageService.updateMessage(messageId, { content }, userId, userRole);

      // Broadcast the edit
      const roomName = `channel_${message.channelId}`;
      this.io.to(roomName).emit('message_updated', message.toSocketJSON());

      console.log(`Message ${messageId} updated by user ${userId}`);
    } catch (error) {
      console.error('Error editing message:', error);
      socket.emit('error', { message: 'Error editing message' });
    }
  }

  /**
   * Delete a message
   */
  private async handleDeleteMessage(socket: any, messageId: number): Promise<void> {
    try {
      const userId = socket.user.userId;
      const userRole = socket.user.role;

      // Delete message via service
      const { channelId } = await this.messageService.deleteMessage(messageId, userId, userRole);

      // Broadcast the deletion
      const roomName = `channel_${channelId}`;
      this.io.to(roomName).emit('message_deleted', { messageId });

      console.log(`Message ${messageId} deleted by user ${userId}`);
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Error deleting message' });
    }
  }

  /**
   * Add a reaction
   */
  private async handleAddReaction(socket: any, messageId: number, reactionType: string): Promise<void> {
    try {
      const userId = socket.user.userId;

      // Add reaction via service
      const reaction = await this.messageService.addReaction(messageId, userId, reactionType as any);

      // Get message info for the channel
      const message = await this.messageService.getMessageById(messageId);
      if (!message) return;

      // Broadcast the reaction
      const roomName = `channel_${message.channelId}`;
      this.io.to(roomName).emit('reaction_added', {
        messageId,
        reaction: reaction.toSocketJSON(),
      });

      console.log(`Reaction ${reactionType} added to message ${messageId} by user ${userId}`);
    } catch (error) {
      console.error('Error adding reaction:', error);
      socket.emit('error', { message: 'Error adding reaction' });
    }
  }

  /**
   * Remove a reaction
   */
  private async handleRemoveReaction(socket: any, messageId: number, reactionType: string): Promise<void> {
    try {
      const userId = socket.user.userId;

      // Remove reaction via service
      const reactionId = await this.messageService.removeReaction(messageId, userId, reactionType as any);

      // Get message info for the channel
      const message = await this.messageService.getMessageById(messageId);
      if (!message) return;

      // Broadcast reaction removal
      const roomName = `channel_${message.channelId}`;
      this.io.to(roomName).emit('reaction_removed', {
        messageId,
        reactionId,
      });

      console.log(`Reaction ${reactionType} removed from message ${messageId} by user ${userId}`);
    } catch (error) {
      console.error('Error removing reaction:', error);
      socket.emit('error', { message: 'Error removing reaction' });
    }
  }

  /**
   * Start typing
   */
  private handleTypingStart(socket: any, channelId: number): void {
    const userId = socket.user.userId;
    const roomName = `channel_${channelId}`;

    // Notify other members (except sender)
    socket.to(roomName).emit('user_typing', { channelId, userId });
  }

  /**
   * Stop typing
   */
  private handleTypingStop(socket: any, channelId: number): void {
    const userId = socket.user.userId;
    const roomName = `channel_${channelId}`;

    // Notify other members (except sender)
    socket.to(roomName).emit('user_stopped_typing', { channelId, userId });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(socket: any): void {
    const userId = socket.user.userId;

    // Remove user connection
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    // Leave all channels
    const userChannels = this.userChannels.get(socket.id);
    if (userChannels) {
      userChannels.forEach(channelId => {
        const roomName = `channel_${channelId}`;
        socket.to(roomName).emit('member_left', { channelId, userId });
      });
    }

    // Clean up session data
    this.userChannels.delete(socket.id);

    console.log(`User ${userId} disconnected (Socket: ${socket.id})`);
  }

  /**
   * Send a notification to a specific user
   */
  public sendNotificationToUser(userId: number, notification: RealTimeNotification): void {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.to(socketId).emit('notification', notification);
      });
    }
  }

  /**
   * Broadcast a message to a channel
   */
  public broadcastToChannel(channelId: number, event: string, data: any): void {
    const roomName = `channel_${channelId}`;
    this.io.to(roomName).emit(event, data);
  }

  /**
   * Get the number of connected users
   */
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get the list of connected users
   */
  public getConnectedUsers(): number[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Check if a user is connected
   */
  public isUserOnline(userId: number): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Close the WebSocket service
   */
  public close(): void {
    this.io.close();
    console.log('✅ WebSocket service closed');
  }
}
