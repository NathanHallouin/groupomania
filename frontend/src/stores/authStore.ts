/**
 * @fileoverview Authentication state management using Zustand.
 * Handles user session, JWT tokens, and authentication state.
 * State is persisted to localStorage for session persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '../types';

/**
 * Authentication store state and actions.
 */
interface AuthState {
  /** Currently authenticated user, null if not logged in */
  user: User | null;
  /** JWT tokens (access and refresh) */
  tokens: AuthTokens | null;
  /** Whether a user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether the auth state is being initialized */
  isLoading: boolean;

  /**
   * Updates the current user.
   * @param user - User data to set
   */
  setUser: (user: User) => void;

  /**
   * Updates the authentication tokens.
   * @param tokens - New tokens to set
   */
  setTokens: (tokens: AuthTokens) => void;

  /**
   * Logs in a user with their data and tokens.
   * @param user - User data
   * @param tokens - JWT tokens
   */
  login: (user: User, tokens: AuthTokens) => void;

  /**
   * Logs out the current user and clears all auth state.
   */
  logout: () => void;

  /**
   * Sets the loading state.
   * @param loading - Loading state
   */
  setLoading: (loading: boolean) => void;

  /**
   * Partially updates the current user.
   * @param updates - Fields to update
   */
  updateUser: (updates: Partial<User>) => void;
}

/**
 * Authentication store hook.
 *
 * @example
 * ```tsx
 * function Component() {
 *   const { user, isAuthenticated, login, logout } = useAuthStore();
 *
 *   if (!isAuthenticated) {
 *     return <LoginForm onLogin={login} />;
 *   }
 *
 *   return <div>Hello, {user.firstName}!</div>;
 * }
 * ```
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user }),

      setTokens: (tokens) => set({ tokens }),

      login: (user, tokens) =>
        set({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        }),

      logout: () =>
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
