/**
 * @fileoverview Écoute globale des notifications temps réel. À monter une fois
 * dans un composant présent sur toutes les pages authentifiées (le Layout) :
 * ouvre le socket et route les events `notification` vers le store.
 */
import { useEffect } from 'react';
import { connectSocket } from '../api/socket';
import { useAuthStore } from '../stores/authStore';
import { useNotificationStore, type AppNotification } from '../stores/notificationStore';

export function useNotificationListener(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const add = useNotificationStore((s) => s.add);

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = connectSocket();
    if (!socket) return;

    const handler = (payload: unknown) => add(payload as AppNotification);
    socket.on('notification', handler);

    return () => {
      socket.off('notification', handler);
    };
  }, [isAuthenticated, add]);
}
