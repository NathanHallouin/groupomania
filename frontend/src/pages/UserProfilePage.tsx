import { Link, useLoaderData } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Briefcase } from 'lucide-react';
import { Card, Avatar, Button } from '../components/ui';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { User } from '../types';

interface LoaderData {
  user: User;
}

export function UserProfilePage() {
  const { user } = useLoaderData() as LoaderData;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/users"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux utilisateurs
      </Link>

      {/* Profile header */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <Avatar user={user} size="xl" className="w-24 h-24" />

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-3 justify-center sm:justify-start">
              <h1 className="text-2xl font-bold text-gray-900">
                {user.firstName} {user.lastName}
              </h1>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  user.role === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {user.role === 'admin' ? 'Admin' : 'Employé'}
              </span>
            </div>

            {(user.position || user.department) && (
              <div className="flex items-center gap-2 mt-2 text-gray-600 justify-center sm:justify-start">
                <Briefcase className="h-4 w-4" />
                {user.position && <span>{user.position}</span>}
                {user.position && user.department && <span>•</span>}
                {user.department && <span>{user.department}</span>}
              </div>
            )}

            <div className="flex flex-wrap gap-4 mt-4 justify-center sm:justify-start">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                {user.email}
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  {user.phone}
                </div>
              )}
              {user.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {user.location}
                </div>
              )}
            </div>
          </div>

          <Button variant="outline">Envoyer un message</Button>
        </div>

        {user.bio && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="font-medium text-gray-900 mb-2">À propos</h3>
            <p className="text-gray-600">{user.bio}</p>
          </div>
        )}
      </Card>

      {/* Additional info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-medium text-gray-900 mb-4">Informations</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Membre depuis</dt>
              <dd className="text-gray-900">
                {format(new Date(user.createdAt), 'dd MMMM yyyy', { locale: fr })}
              </dd>
            </div>
            {user.lastLogin && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Dernière connexion</dt>
                <dd className="text-gray-900">
                  {format(new Date(user.lastLogin), 'dd MMMM yyyy à HH:mm', {
                    locale: fr,
                  })}
                </dd>
              </div>
            )}
            {user.department && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Département</dt>
                <dd className="text-gray-900">{user.department}</dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <h3 className="font-medium text-gray-900 mb-4">Activité</h3>
          <p className="text-gray-500 text-sm">
            Statistiques d'activité à venir...
          </p>
        </Card>
      </div>
    </div>
  );
}
