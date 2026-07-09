import { Link, useLoaderData, useSearchParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { Card, Avatar, Button } from '../components/ui';
import type { User, PaginationMeta } from '../types';

interface LoaderData {
  users: User[];
  pagination: PaginationMeta;
  departments: { department: string; userCount: number }[];
}

export function UsersPage() {
  const { users, pagination, departments } = useLoaderData() as LoaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('search') || '';
  const selectedDepartment = searchParams.get('department') || '';

  const handleSearchChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const handleDepartmentChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('department', value);
    } else {
      params.delete('department');
    }
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500 mt-1">{pagination.total} membres</p>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="relative">
          <select
            value={selectedDepartment}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">Tous les départements</option>
            {departments.map((dept) => (
              <option key={dept.department} value={dept.department}>
                {dept.department} ({dept.userCount})
              </option>
            ))}
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Users grid */}
      {users.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500">Aucun utilisateur trouvé</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Link key={user.id} to={`/users/${user.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <Avatar user={user} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {user.firstName} {user.lastName}
                    </h3>
                    {user.position && (
                      <p className="text-sm text-gray-600 truncate">
                        {user.position}
                      </p>
                    )}
                    {user.department && (
                      <p className="text-sm text-gray-500 truncate">
                        {user.department}
                      </p>
                    )}
                  </div>
                </div>

                {user.bio && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                    {user.bio}
                  </p>
                )}

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {user.role === 'admin' ? 'Admin' : 'Employé'}
                  </span>
                  <Button size="sm" variant="ghost">
                    Voir le profil
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
