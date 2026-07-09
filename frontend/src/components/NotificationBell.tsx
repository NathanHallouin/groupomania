/**
 * @fileoverview Cloche de notifications : badge de non-lues + liste déroulante
 * des notifications temps réel reçues. Cliquer sur une notification ouvre le
 * canal concerné.
 */
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNotificationStore } from '../stores/notificationStore';
import { useUsersMap } from '../hooks/useUsers';

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const usersMap = useUsersMap();

  // Ferme le menu au clic extérieur.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const toggle = () => {
    setOpen((o) => {
      if (!o) markAllRead();
      return !o;
    });
  };

  const authorName = (authorId?: number) => {
    const u = authorId ? usersMap.get(authorId) : undefined;
    return u ? `${u.firstName} ${u.lastName}` : 'Quelqu’un';
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggle}
        title="Notifications"
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-900">
            Notifications
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                Aucune notification
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (n.channelId) navigate(`/channels/${n.channelId}`);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col items-start gap-0.5 border-b border-gray-50 px-4 py-2 text-left hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-900">
                    Nouveau message de{' '}
                    <span className="font-medium">{authorName(n.data?.authorId)}</span>
                  </span>
                  {n.data?.preview && (
                    <span className="line-clamp-1 text-xs text-gray-500">
                      {n.data.preview}
                    </span>
                  )}
                  <span className="text-[11px] text-gray-400">
                    {formatDistanceToNow(new Date(n.timestamp), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
