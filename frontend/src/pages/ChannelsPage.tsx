import { useState } from 'react';
import { Link, useLoaderData, useFetcher } from 'react-router-dom';
import { Plus, Hash, Lock, Search } from 'lucide-react';
import { Button, Card } from '../components/ui';
import type { Channel } from '../types';

interface LoaderData {
  userChannels: Channel[];
  allChannels: Channel[];
}

export function ChannelsPage() {
  const { userChannels, allChannels } = useLoaderData() as LoaderData;
  const fetcher = useFetcher();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');

  const handleJoinChannel = (channelId: number) => {
    fetcher.submit(
      { intent: 'join', channelId: String(channelId) },
      { method: 'post', action: `/channels/${channelId}/join` }
    );
  };

  const handleLeaveChannel = (channelId: number) => {
    fetcher.submit(
      { intent: 'leave', channelId: String(channelId) },
      { method: 'post', action: `/channels/${channelId}/leave` }
    );
  };

  const displayedChannels = activeTab === 'my' ? userChannels : allChannels;
  const filteredChannels = displayedChannels.filter((channel) =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isJoined = (channelId: number) =>
    userChannels.some((ch) => ch.id === channelId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Channels</h1>
        <Link to="/channels/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau channel
          </Button>
        </Link>
      </div>

      {/* Tabs and search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'my'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Mes channels ({userChannels.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tous les channels ({allChannels.length})
          </button>
        </div>

        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un channel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Channel list */}
      {filteredChannels.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500">
            {searchQuery
              ? 'Aucun channel trouvé'
              : activeTab === 'my'
              ? "Vous n'avez rejoint aucun channel"
              : 'Aucun channel disponible'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChannels.map((channel) => (
            <Card key={channel.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  {channel.isPrivate ? (
                    <Lock className="h-5 w-5" />
                  ) : (
                    <Hash className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/channels/${channel.id}`}
                    className="font-semibold text-gray-900 hover:text-primary-600 truncate block"
                  >
                    {channel.name}
                  </Link>
                  <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                    {channel.description || 'Aucune description'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    channel.isPrivate
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {channel.isPrivate ? 'Privé' : 'Public'}
                </span>

                {isJoined(channel.id) ? (
                  <div className="flex items-center gap-2">
                    <Link to={`/channels/${channel.id}`}>
                      <Button size="sm" variant="primary">
                        Ouvrir
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleLeaveChannel(channel.id)}
                      disabled={fetcher.state !== 'idle'}
                    >
                      Quitter
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleJoinChannel(channel.id)}
                    disabled={fetcher.state !== 'idle'}
                  >
                    Rejoindre
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
