/**
 * @fileoverview État des notifications temps réel reçues via WebSocket
 * (event `notification`). Conserve une liste récente + un compteur de non-lues.
 */
import { create } from 'zustand';

/** Notification telle qu'émise par le message-service. */
export interface AppNotification {
  id: string;
  type: 'message' | 'mention' | 'reaction' | 'join' | 'leave' | string;
  channelId?: number;
  messageId?: number;
  data?: { authorId?: number; preview?: string };
  timestamp: string | Date;
  read?: boolean;
}

/** Nombre maximum de notifications conservées en mémoire. */
const MAX = 50;

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  /** Ajoute une notification entrante (en tête de liste). */
  add: (n: AppNotification) => void;
  /** Marque toutes les notifications comme lues. */
  markAllRead: () => void;
  /** Retire une notification. */
  remove: (id: string) => void;
  /** Vide la liste. */
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  add: (n) =>
    set((state) => {
      // Déduplication par id (une même notif peut arriver via plusieurs sockets).
      if (state.notifications.some((x) => x.id === n.id)) return state;
      const notifications = [{ ...n, read: false }, ...state.notifications].slice(0, MAX);
      return { notifications, unreadCount: state.unreadCount + 1 };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  remove: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clear: () => set({ notifications: [], unreadCount: 0 }),
}));
