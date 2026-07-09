/**
 * @fileoverview Hook d'accès au répertoire des utilisateurs, mis en cache via
 * React Query. Sert à enrichir les entités qui ne portent qu'un `userId`
 * (messages, membres de canal…) avec le profil correspondant — l'identité vit
 * dans le user-service, séparé du message-service.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import type { User } from '../types';

/**
 * Retourne une `Map<userId, User>` des utilisateurs connus (cache 5 min).
 */
export function useUsersMap(): Map<number, User> {
  const { data } = useQuery({
    queryKey: ['users', 'directory'],
    queryFn: async () => (await usersApi.getAll({ limit: 100 })).data ?? [],
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const map = new Map<number, User>();
    (data ?? []).forEach((u) => map.set(u.id, u));
    return map;
  }, [data]);
}
