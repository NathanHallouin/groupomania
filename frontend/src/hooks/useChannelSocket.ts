/**
 * @fileoverview Hook temps réel pour une page de canal.
 *
 * Rejoint la room du canal, écoute les événements de messages/réactions et
 * déclenche un rafraîchissement (callback), tout en exposant les utilisateurs
 * « en train d'écrire » et une fonction pour signaler sa propre saisie.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { connectSocket, getSocket } from '../api/socket';

/** Délai d'inactivité avant d'émettre `typing_stop` (ms). */
const TYPING_TIMEOUT = 2000;

interface TypingPayload {
  channelId: number;
  userId: number;
}

/**
 * @param channelId - Canal courant (undefined = pas d'abonnement).
 * @param onMessageChange - Appelé quand un message/réaction change (→ recharger).
 */
export function useChannelSocket(
  channelId: number | undefined,
  onMessageChange: () => void
) {
  const [typingUserIds, setTypingUserIds] = useState<number[]>([]);

  // Garde la dernière version du callback sans re-souscrire à chaque rendu.
  const onChangeRef = useRef(onMessageChange);
  onChangeRef.current = onMessageChange;

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!channelId) return;
    const socket = connectSocket();
    if (!socket) return;

    socket.emit('join_channel', channelId);

    const handleChange = () => onChangeRef.current();
    const handleTyping = ({ channelId: cid, userId }: TypingPayload) => {
      if (cid !== channelId) return;
      setTypingUserIds((ids) => (ids.includes(userId) ? ids : [...ids, userId]));
    };
    const handleStopTyping = ({ channelId: cid, userId }: TypingPayload) => {
      if (cid !== channelId) return;
      setTypingUserIds((ids) => ids.filter((id) => id !== userId));
    };

    socket.on('message_created', handleChange);
    socket.on('message_updated', handleChange);
    socket.on('message_deleted', handleChange);
    socket.on('reaction_added', handleChange);
    socket.on('reaction_removed', handleChange);
    socket.on('user_typing', handleTyping);
    socket.on('user_stopped_typing', handleStopTyping);

    return () => {
      socket.emit('leave_channel', channelId);
      socket.off('message_created', handleChange);
      socket.off('message_updated', handleChange);
      socket.off('message_deleted', handleChange);
      socket.off('reaction_added', handleChange);
      socket.off('reaction_removed', handleChange);
      socket.off('user_typing', handleTyping);
      socket.off('user_stopped_typing', handleStopTyping);
      setTypingUserIds([]);
    };
  }, [channelId]);

  /** Signale que l'utilisateur est en train d'écrire (débounce `typing_stop`). */
  const notifyTyping = useCallback(() => {
    if (!channelId) return;
    const socket = getSocket();
    if (!socket) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing_start', channelId);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing_stop', channelId);
    }, TYPING_TIMEOUT);
  }, [channelId]);

  return { typingUserIds, notifyTyping };
}
