import { useState } from 'react';
import { Link, useLoaderData, useSearchParams } from 'react-router-dom';
import { Search, Hash } from 'lucide-react';
import { Card, Avatar } from '../components/ui';
import type { User, Channel } from '../types';

interface LoaderData {
  q: string;
  users: User[];
  channels: Channel[];
}

export function SearchPage() {
  const { q, users, channels } = useLoaderData() as LoaderData;
  const [, setSearchParams] = useSearchParams();
  const [input, setInput] = useState(q);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    setSearchParams(value ? { q: value } : {});
  };

  const total = users.length + channels.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <form onSubmit={submit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Rechercher des utilisateurs, des canaux…"
          className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </form>

      {!q.trim() ? (
        <p className="text-center text-gray-500 py-8">
          Saisissez un terme pour lancer la recherche.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {total} résultat{total > 1 ? 's' : ''} pour « {q} »
          </p>

          {/* Utilisateurs */}
          {users.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Utilisateurs
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {users.map((u) => (
                  <Link key={u.id} to={`/users/${u.id}`}>
                    <Card className="hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {u.position || u.department || 'Employé'}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Canaux */}
          {channels.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Canaux
              </h2>
              <div className="space-y-2">
                {channels.map((c) => (
                  <Link key={c.id} to={`/channels/${c.id}`}>
                    <Card className="hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                          <Hash className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{c.name}</p>
                          {c.description && (
                            <p className="text-sm text-gray-500 truncate">
                              {c.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {total === 0 && (
            <Card className="text-center py-12">
              <p className="text-gray-500">Aucun résultat pour « {q} »</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
