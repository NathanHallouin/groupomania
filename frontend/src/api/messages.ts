/**
 * @fileoverview Messages API client.
 * Handles message CRUD operations, reactions, and search.
 */

import apiClient from './client';
import type { Message, ApiResponse, CreateMessageRequest, ReactionType } from '../types';

/**
 * Response type for message list endpoints.
 */
interface MessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

/**
 * Messages API methods.
 */
export const messagesApi = {
  /**
   * Retrieves messages from a channel with pagination.
   * @param channelId - Channel ID
   * @param params - Query parameters
   * @param params.page - Page number
   * @param params.limit - Items per page (default: 50, max: 100)
   * @param params.before - Get messages before this message ID
   * @param params.after - Get messages after this message ID
   * @returns Promise with paginated message list
   */
  getChannelMessages: async (
    channelId: number,
    params?: { page?: number; limit?: number; before?: number; after?: number }
  ): Promise<MessagesResponse> => {
    const response = await apiClient.get<MessagesResponse>(`/messages/channel/${channelId}`, { params });
    return response.data;
  },

  /**
   * Retrieves a specific message by ID.
   * @param id - Message ID
   * @returns Promise with message data
   * @throws {AxiosError} 404 if message not found
   */
  getById: async (id: number): Promise<ApiResponse<{ message: Message }>> => {
    const response = await apiClient.get<ApiResponse<{ message: Message }>>(`/messages/${id}`);
    return response.data;
  },

  /**
   * Creates a new message in a channel.
   * @param data - Message creation data
   * @param data.content - Message content (1-2000 characters)
   * @param data.channelId - Target channel ID
   * @param data.parentId - Parent message ID for replies
   * @returns Promise with created message
   */
  create: async (data: CreateMessageRequest): Promise<ApiResponse<{ message: Message }>> => {
    const response = await apiClient.post<ApiResponse<{ message: Message }>>('/messages', data);
    return response.data;
  },

  /**
   * Updates an existing message.
   * @param id - Message ID
   * @param content - New message content
   * @returns Promise with updated message
   * @throws {AxiosError} 403 if not message author
   */
  update: async (id: number, content: string): Promise<ApiResponse<{ message: Message }>> => {
    const response = await apiClient.put<ApiResponse<{ message: Message }>>(`/messages/${id}`, { content });
    return response.data;
  },

  /**
   * Deletes a message.
   * @param id - Message ID
   * @returns Promise that resolves when deleted
   * @throws {AxiosError} 403 if not message author or admin
   */
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/messages/${id}`);
    return response.data;
  },

  /**
   * Adds a reaction to a message.
   * @param messageId - Message ID
   * @param reactionType - Type of reaction to add
   * @returns Promise with created reaction
   */
  addReaction: async (
    messageId: number,
    reactionType: ReactionType
  ): Promise<ApiResponse<{ reaction: { id: number; messageId: number; userId: number; type: string; createdAt: string } }>> => {
    const response = await apiClient.post(`/messages/${messageId}/reactions`, { reactionType });
    return response.data;
  },

  /**
   * Removes a reaction from a message.
   * @param messageId - Message ID
   * @param reactionType - Type of reaction to remove
   * @returns Promise that resolves when removed
   */
  removeReaction: async (messageId: number, reactionType: ReactionType): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/messages/${messageId}/reactions/${reactionType}`);
    return response.data;
  },

  /**
   * Searches messages by content.
   * @param query - Search query (minimum 2 characters)
   * @param params - Filter parameters
   * @param params.channelId - Filter by channel
   * @param params.authorId - Filter by author
   * @param params.page - Page number
   * @param params.limit - Items per page (default: 20, max: 50)
   * @returns Promise with matching messages
   */
  search: async (
    query: string,
    params?: { channelId?: number; authorId?: number; page?: number; limit?: number }
  ): Promise<MessagesResponse> => {
    const response = await apiClient.get<MessagesResponse>('/messages/search', {
      params: { q: query, ...params },
    });
    return response.data;
  },
};
