import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home,
  MessageSquare,
  Users,
  Settings,
  Hash,
  Plus,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useChannelStore } from '../../stores/channelStore';
import { Avatar } from '../ui/Avatar';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { channels } = useChannelStore();

  const navItems = [
    { to: '/', icon: Home, label: 'Accueil' },
    { to: '/channels', icon: MessageSquare, label: 'Channels' },
    { to: '/users', icon: Users, label: 'Utilisateurs' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="flex flex-col w-64 bg-gray-900 text-white h-screen">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-primary-500">Groupomania</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* Channels section */}
        <div className="pt-6">
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Channels
            </span>
            <NavLink
              to="/channels/new"
              className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </NavLink>
          </div>

          <div className="space-y-1">
            {channels.slice(0, 10).map((channel) => (
              <NavLink
                key={channel.id}
                to={`/channels/${channel.id}`}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  )
                }
              >
                <Hash className="h-4 w-4" />
                <span className="truncate">{channel.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <Avatar user={user} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
