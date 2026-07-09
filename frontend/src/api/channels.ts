/**
 * @fileoverview Channels API client.
 * Handles channel CRUD operations, membership, and search.
 */

import apiClient from './client';
import type { Channel, ApiResponse, CreateChannelRequest, PaginatedResponse } from '../types';

/**
 * Channels API methods.
 */
export const channelsApi = {
  /**
   * Retrieves all channels with pagination.
   * @param params - Pagination parameters
   * @param params.page - Page number (default: 1)
   * @param params.limit - Items per page (default: 20)
   * @returns Promise with paginated channel list
   */
  getAll: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Channel>> => {
    const response = await apiClient.get<PaginatedResponse<Channel>>('/channels', { params });
    return response.data;
  },

  /**
   * Retrieves channels the current user has joined.
   * @returns Promise with list of user's channels
   */
  getUserChannels: async (): Promise<ApiResponse<{ channels: Channel[] }>> => {
    const response = await apiClient.get<ApiResponse<{ channels: Channel[] }>>('/channels/user');
    return response.data;
  },

  /**
   * Retrieves a specific channel by ID.
   * @param id - Channel ID
   * @returns Promise with channel data
   * @throws {AxiosError} 404 if channel not found, 403 if access denied
   */
  getById: async (id: number): Promise<ApiResponse<{ channel: Channel }>> => {
    const response = await apiClient.get<ApiResponse<{ channel: Channel }>>(`/channels/${id}`);
    return response.data;
  },

  /**
   * Creates a new channel.
   * @param data - Channel creation data
   * @returns Promise with created channel
   */
  create: async (data: CreateChannelRequest): Promise<ApiResponse<{ channel: Channel }>> => {
    const response = await apiClient.post<ApiResponse<{ channel: Channel }>>('/channels', data);
    return response.data;
  },

  /**
   * Updates an existing channel.
   * @param id - Channel ID
   * @param data - Fields to update
   * @returns Promise with updated channel
   * @throws {AxiosError} 403 if not channel owner/admin
   */
  update: async (id: number, data: Partial<CreateChannelRequest>): Promise<ApiResponse<{ channel: Channel }>> => {
    const response = await apiClient.put<ApiResponse<{ channel: Channel }>>(`/channels/${id}`, data);
    return response.data;
  },

  /**
   * Deletes a channel.
   * @param id - Channel ID
   * @returns Promise that resolves when deleted
   * @throws {AxiosError} 403 if not channel owner/admin
   */
  delete: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/channels/${id}`);
    return response.data;
  },

  /**
   * Joins a public channel.
   * @param id - Channel ID
   * @returns Promise with channel data
   * @throws {AxiosError} 403 if channel is private
   */
  join: async (id: number): Promise<ApiResponse<Channel>> => {
    const response = await apiClient.post<ApiResponse<Channel>>(`/channels/${id}/join`);
    return response.data;
  },

  /**
   * Leaves a channel.
   * @param id - Channel ID
   * @returns Promise that resolves when left
   */
  leave: async (id: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/channels/${id}/leave`);
    return response.data;
  },

  /**
   * Searches for channels by name.
   * @param query - Search query (minimum 2 characters)
   * @param params - Pagination parameters
   * @returns Promise with matching channels
   */
  search: async (query: string, params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Channel>> => {
    const response = await apiClient.get<PaginatedResponse<Channel>>('/channels/search', {
      params: { q: query, ...params },
    });
    return response.data;
  },

  /**
   * Adds a member to a channel.
   * @param channelId - Channel ID
   * @param userId - User ID to add
   * @param role - Member role (default: 'member')
   * @returns Promise that resolves when member is added
   * @throws {AxiosError} 403 if not authorized to add members
   */
  addMember: async (channelId: number, userId: number, role?: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>(`/channels/${channelId}/members`, { userId, role });
    return response.data;
  },

  /**
   * Removes a member from a channel.
   * @param channelId - Channel ID
   * @param userId - User ID to remove
   * @returns Promise that resolves when member is removed
   * @throws {AxiosError} 403 if not authorized to remove members
   */
  removeMember: async (channelId: number, userId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/channels/${channelId}/members/${userId}`);
    return response.data;
  },
};
