import { useState } from 'react';
import { useLoaderData, useRevalidator } from 'react-router-dom';
import { Users as UsersIcon, UserCheck, UserPlus, Shield } from 'lucide-react';
import { Card, Avatar, Button } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { usersApi } from '../api';
import type { User } from '../types';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  usersByDepartment: Record<string, number>;
  usersByRole: Record<string, number>;
}

interface LoaderData {
  users: User[];
  stats: Stats | null;
}

export function AdminPage() {
  const { users, stats } = useLoaderData() as LoaderData;
  const revalidator = useRevalidator();
  const { user: me } = useAuthStore();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const act = async (id: number, patch: Partial<User>) => {
    setPendingId(id);
    try {
      await usersApi.update(id, patch as never);
      revalidator.revalidate();
    } catch {
      // silencieux : l'état reste cohérent au prochain rafraîchissement
    } finally {
      setPendingId(null);
    }
  };

  const cards = [
    { icon: UsersIcon, label: 'Utilisateurs', value: stats?.totalUsers ?? users.length },
    { icon: UserCheck, label: 'Actifs', value: stats?.activeUsers ?? '—' },
    { icon: UserPlus, label: 'Nouveaux (mois)', value: stats?.newUsersThisMonth ?? '—' },
    { icon: Shield, label: 'Admins', value: stats?.usersByRole?.admin ?? '—' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-500 mt-1">Gestion des utilisateurs</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ icon: Icon, label, value }) => (
          <Card key={label} padding="md">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Liste des utilisateurs */}
      <Card padding="none">
        <div className="divide-y divide-gray-100">
          {users.map((u) => {
            const isSelf = u.id === me?.id;
            const busy = pendingId === u.id;
            const suspended = u.status === 'suspended';
            return (
              <div
                key={u.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar user={u} size="md" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {u.firstName} {u.lastName}
                      {isSelf && <span className="ml-2 text-xs text-gray-400">(vous)</span>}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {u.role === 'admin' ? 'Admin' : 'Employé'}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      suspended
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {suspended ? 'Suspendu' : 'Actif'}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSelf || busy}
                    onClick={() =>
                      act(u.id, { role: u.role === 'admin' ? 'employee' : 'admin' })
                    }
                  >
                    {u.role === 'admin' ? 'Rétrograder' : 'Promouvoir admin'}
                  </Button>
                  <Button
                    size="sm"
                    variant={suspended ? 'primary' : 'ghost'}
                    disabled={isSelf || busy}
                    onClick={() =>
                      act(u.id, { status: suspended ? 'active' : 'suspended' })
                    }
                  >
                    {suspended ? 'Réactiver' : 'Suspendre'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
