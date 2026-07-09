/**
 * @fileoverview Users API client.
 * Handles user profile operations, avatar management, and search.
 */

import apiClient from './client';
import type { User, ApiResponse, UpdateUserRequest, PaginatedResponse } from '../types';

/**
 * Users API methods.
 */
export const usersApi = {
  /**
   * Retrieves all users with filtering and pagination.
   * @param params - Query parameters
   * @param params.page - Page number
   * @param params.limit - Items per page (default: 20)
   * @param params.search - Search by name, email, or department
   * @param params.role - Filter by role ('employee' or 'admin')
   * @param params.department - Filter by department
   * @param params.sort - Sort field (default: 'createdAt')
   * @param params.order - Sort order ('ASC' or 'DESC')
   * @returns Promise with paginated user list
   */
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    department?: string;
    sort?: string;
    order?: 'ASC' | 'DESC';
  }): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get<PaginatedResponse<User>>('/users', { params });
    return response.data;
  },

  /**
   * Retrieves a specific user by ID.
   * @param userId - User ID
   * @returns Promise with user data
   * @throws {AxiosError} 404 if user not found
   */
  getById: async (userId: number): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(`/users/${userId}`);
    return response.data;
  },

  /**
   * Updates a user's profile.
   * @param userId - User ID
   * @param data - Fields to update
   * @returns Promise with updated user
   * @throws {AxiosError} 403 if not authorized (must be self or admin)
   */
  update: async (userId: number, data: UpdateUserRequest): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.put<ApiResponse<{ user: User }>>(`/users/${userId}`, data);
    return response.data;
  },

  /**
   * Uploads a new avatar image for a user.
   * @param userId - User ID
   * @param file - Image file (JPEG, PNG, GIF, WebP, max 5MB)
   * @returns Promise with avatar URLs in different sizes
   * @throws {AxiosError} 400 if file is invalid
   */
  uploadAvatar: async (userId: number, file: File): Promise<ApiResponse<{ avatar: User['avatar'] }>> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await apiClient.post<ApiResponse<{ avatar: User['avatar'] }>>(`/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Deletes a user's avatar.
   * @param userId - User ID
   * @returns Promise that resolves when deleted
   */
  deleteAvatar: async (userId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/users/${userId}/avatar`);
    return response.data;
  },

  /**
   * Searches users by name or email.
   * @param query - Search query
   * @param limit - Maximum results (default: 10)
   * @returns Promise with matching users
   */
  search: async (query: string, limit?: number): Promise<ApiResponse<{ users: User[] }>> => {
    const response = await apiClient.get<ApiResponse<{ users: User[] }>>('/users/search', {
      params: { q: query, limit },
    });
    return response.data;
  },

  /**
   * Retrieves all departments with user counts.
   * @returns Promise with department list
   */
  getDepartments: async (): Promise<ApiResponse<{ departments: { department: string; userCount: number }[] }>> => {
    const response = await apiClient.get('/users/departments');
    return response.data;
  },

  /**
   * Retrieves user statistics (admin only).
   * @returns Promise with user statistics
   * @throws {AxiosError} 403 if not admin
   */
  getStats: async (): Promise<ApiResponse<{
    stats: {
      totalUsers: number;
      activeUsers: number;
      newUsersThisMonth: number;
      usersByDepartment: Record<string, number>;
      usersByRole: Record<string, number>;
    };
  }>> => {
    const response = await apiClient.get('/users/stats');
    return response.data;
  },
};
