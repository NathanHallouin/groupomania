/**
 * @fileoverview Client WebSocket (socket.io) temps réel pour la messagerie.
 *
 * Se connecte directement au message-service (le gateway ne proxifie pas encore
 * le WebSocket). L'authentification réutilise le JWT du store d'auth, passé dans
 * le handshake (`auth.token`) — c'est ce qu'attend `authenticateSocket` côté
 * backend.
 */
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';

/** URL du service temps réel (message-service). */
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3003';

/** Événements émis par le serveur vers le client. */
export interface ServerToClientEvents {
  message_created: (message: unknown) => void;
  message_updated: (message: unknown) => void;
  message_deleted: (payload: { messageId: number }) => void;
  reaction_added: (payload: { messageId: number; userId: number; reactionType: string }) => void;
  reaction_removed: (payload: { messageId: number; userId: number; reactionType: string }) => void;
  user_typing: (payload: { channelId: number; userId: number }) => void;
  user_stopped_typing: (payload: { channelId: number; userId: number }) => void;
  member_joined: (payload: { channelId: number; userId: number }) => void;
  member_left: (payload: { channelId: number; userId: number }) => void;
  channel_joined: (payload: { channelId: number }) => void;
  channel_left: (payload: { channelId: number }) => void;
  notification: (payload: unknown) => void;
  error: (payload: { message: string }) => void;
}

/** Événements émis par le client vers le serveur. */
export interface ClientToServerEvents {
  join_channel: (channelId: number) => void;
  leave_channel: (channelId: number) => void;
  send_message: (data: unknown) => void;
  edit_message: (messageId: number, content: string) => void;
  delete_message: (messageId: number) => void;
  add_reaction: (messageId: number, reactionType: string) => void;
  remove_reaction: (messageId: number, reactionType: string) => void;
  typing_start: (channelId: number) => void;
  typing_stop: (channelId: number) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;
/** Abonnement au store d'auth pour couper le socket à la déconnexion. */
let authUnsub: (() => void) | null = null;

/**
 * Retourne le socket courant (peut être null s'il n'est pas encore connecté).
 */
export function getSocket(): AppSocket | null {
  return socket;
}

/**
 * Établit (ou réutilise) la connexion WebSocket authentifiée.
 * No-op si aucun token n'est disponible (utilisateur non connecté).
 */
export function connectSocket(): AppSocket | null {
  const token = useAuthStore.getState().tokens?.accessToken;
  if (!token) return null;

  if (!socket) {
    socket = io(WS_URL, {
      autoConnect: false,
      transports: ['websocket'],
      auth: { token },
    });
  } else {
    // Garde le token à jour (rafraîchissement éventuel).
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  // Coupe automatiquement le socket dès que l'utilisateur se déconnecte.
  if (!authUnsub) {
    authUnsub = useAuthStore.subscribe((state) => {
      if (!state.tokens?.accessToken) disconnectSocket();
    });
  }
  return socket;
}

/**
 * Ferme la connexion WebSocket et réinitialise le singleton.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (authUnsub) {
    authUnsub();
    authUnsub = null;
  }
}
