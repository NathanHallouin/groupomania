/**
 * @fileoverview Axios HTTP client configuration with authentication interceptors.
 * Handles automatic token injection and refresh on 401 responses.
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

/**
 * Base URL for API requests.
 * Defaults to localhost:3000/api if VITE_API_URL is not set.
 */
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Configured Axios instance for making API requests.
 * Includes automatic token injection and refresh handling.
 *
 * @example
 * ```ts
 * import { apiClient } from './api/client';
 *
 * const response = await apiClient.get('/users');
 * ```
 */
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * Request interceptor that adds the JWT access token to outgoing requests.
 * Retrieves the token from the auth store and sets the Authorization header.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor that handles token refresh on 401 Unauthorized responses.
 *
 * Flow:
 * 1. If response is 401 and we have a refresh token, attempt to refresh
 * 2. If refresh succeeds, retry the original request with the new token
 * 3. If refresh fails, logout the user and redirect to login page
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().tokens?.refreshToken;
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { tokens } = response.data.data;
          useAuthStore.getState().setTokens(tokens);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user and redirect to login
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
