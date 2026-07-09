/**
 * @fileoverview Authentication API client.
 * Handles user authentication, registration, and session management.
 */

import apiClient from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, User, ApiResponse } from '../types';

/**
 * Authentication API methods.
 */
export const authApi = {
  /**
   * Authenticates a user with email and password.
   * @param data - Login credentials
   * @returns Promise with user data and JWT tokens
   * @throws {AxiosError} 401 if credentials are invalid, 423 if account is locked
   */
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  /**
   * Registers a new user account.
   * @param data - Registration data including name, email, and password
   * @returns Promise with new user data and JWT tokens
   * @throws {AxiosError} 409 if email already exists
   */
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Logs out the current user and invalidates their tokens.
   * @returns Promise that resolves when logout is complete
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  /**
   * Retrieves the current user's profile.
   * @returns Promise with user profile data
   * @throws {AxiosError} 401 if not authenticated
   */
  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    const response = await apiClient.get<ApiResponse<{ user: User }>>('/auth/profile');
    return response.data;
  },

  /**
   * Refreshes the access token using a refresh token.
   * @param refreshToken - The refresh token
   * @returns Promise with new token pair
   * @throws {AxiosError} 401 if refresh token is invalid or expired
   */
  refreshTokens: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken });
    return response.data;
  },

  /**
   * Changes the current user's password.
   * @param currentPassword - The user's current password
   * @param newPassword - The new password (must meet complexity requirements)
   * @returns Promise that resolves when password is changed
   * @throws {AxiosError} 401 if current password is incorrect
   */
  changePassword: async (currentPassword: string, newPassword: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.put<ApiResponse<void>>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  /**
   * Verifies the current access token is valid.
   * @returns Promise with basic user info if token is valid
   * @throws {AxiosError} 401 if token is invalid
   */
  verifyToken: async (): Promise<ApiResponse<{ user: { userId: number; email: string; role: string } }>> => {
    const response = await apiClient.get('/auth/verify-token');
    return response.data;
  },

  /**
   * Requests a password reset link for the given email.
   * Always resolves (anti-enumeration). In dev, may return a `resetUrl`.
   * @param email - Account email
   */
  forgotPassword: async (
    email: string
  ): Promise<ApiResponse<{ resetUrl?: string }>> => {
    const response = await apiClient.post<ApiResponse<{ resetUrl?: string }>>(
      '/auth/forgot-password',
      { email }
    );
    return response.data;
  },

  /**
   * Resets the password using a valid reset token.
   * @param token - Reset token from the email link
   * @param password - New password (must meet complexity requirements)
   */
  resetPassword: async (token: string, password: string): Promise<ApiResponse<void>> => {
    const response = await apiClient.post<ApiResponse<void>>('/auth/reset-password', {
      token,
      password,
    });
    return response.data;
  },
};
