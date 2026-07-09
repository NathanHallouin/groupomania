import { useEffect } from 'react';
import { Link, useLoaderData } from 'react-router-dom';
import { MessageSquare, Users, TrendingUp, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Avatar } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { useChannelStore } from '../stores/channelStore';
import type { Channel, User } from '../types';

interface LoaderData {
  channels: Channel[];
  recentUsers: User[];
  totalUsers: number;
}

export function HomePage() {
  const { user } = useAuthStore();
  const { channels, setChannels } = useChannelStore();
  const loaderData = useLoaderData() as LoaderData;

  useEffect(() => {
    if (loaderData.channels) {
      setChannels(loaderData.channels);
    }
  }, [loaderData.channels, setChannels]);

  const statCards = [
    {
      icon: MessageSquare,
      label: 'Channels',
      value: loaderData.channels.length,
      color: 'bg-blue-500',
    },
    {
      icon: Users,
      label: 'Utilisateurs',
      value: loaderData.totalUsers,
      color: 'bg-green-500',
    },
    {
      icon: TrendingUp,
      label: "Messages aujourd'hui",
      value: 0,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Bonjour, {user?.firstName} !</h1>
        <p className="mt-1 text-primary-100">
          Bienvenue sur le réseau social d'entreprise Groupomania
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent channels */}
        <Card padding="none">
          <CardHeader className="px-4 pt-4">
            <CardTitle>Mes channels</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {channels.length === 0 ? (
              <p className="text-gray-500 text-sm">
                Vous n'avez rejoint aucun channel.{' '}
                <Link to="/channels" className="text-primary-600 hover:underline">
                  Explorer les channels
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                {channels.slice(0, 5).map((channel) => (
                  <Link
                    key={channel.id}
                    to={`/channels/${channel.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center font-semibold">
                      #
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {channel.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {channel.description || 'Aucune description'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent users */}
        <Card padding="none">
          <CardHeader className="px-4 pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <CardTitle>Connectés récemment</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {loaderData.recentUsers.length === 0 ? (
              <p className="text-gray-500 text-sm">Aucun utilisateur récent</p>
            ) : (
              <div className="space-y-3">
                {loaderData.recentUsers.map((recentUser) => (
                  <Link
                    key={recentUser.id}
                    to={`/users/${recentUser.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Avatar user={recentUser} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {recentUser.firstName} {recentUser.lastName}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {recentUser.department || recentUser.email}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
