import { useState } from 'react';
import { Form, useLoaderData, useActionData, useNavigation } from 'react-router-dom';
import { Camera, Mail, Phone, MapPin, Calendar, Edit2, X, Save } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, Avatar } from '../components/ui';
import { useAuthStore } from '../stores/authStore';
import { usersApi } from '../api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { User } from '../types';

interface LoaderData {
  user: User;
}

interface ActionData {
  success?: boolean;
  error?: string;
  message?: string;
}

export function ProfilePage() {
  const { user } = useLoaderData() as LoaderData;
  const actionData = useActionData() as ActionData | undefined;
  const navigation = useNavigation();
  const { updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isSubmitting = navigation.state === 'submitting';

  // Complétude du profil : proportion des champs clés renseignés.
  const PROFILE_FIELDS: (keyof User)[] = [
    'firstName',
    'lastName',
    'email',
    'department',
    'position',
    'bio',
    'phone',
    'location',
  ];
  const filledCount = PROFILE_FIELDS.filter((f) => {
    const v = user[f];
    return typeof v === 'string' ? v.trim().length > 0 : Boolean(v);
  }).length;
  const completeness = Math.round((filledCount / PROFILE_FIELDS.length) * 100);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const response = await usersApi.uploadAvatar(user.id, file);
      if (response.data?.avatar) {
        updateUser({ avatar: response.data.avatar });
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>

      {/* Success/Error messages */}
      {actionData?.success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {actionData.message || 'Modifications enregistrées'}
        </div>
      )}
      {actionData?.error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {actionData.error}
        </div>
      )}

      {/* Profile header */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <Avatar user={user} size="xl" className="w-24 h-24" />
            <label className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full cursor-pointer hover:bg-primary-700 transition-colors">
              <Camera className="h-4 w-4" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-gray-500">{user.position || user.department || 'Employé'}</p>

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
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                Membre depuis {format(new Date(user.createdAt), 'MMMM yyyy', { locale: fr })}
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Annuler
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Modifier
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Complétude du profil */}
      {completeness < 100 && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Profil complété à {completeness}%
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Compléter
            </button>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-primary-600 transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Ajoutez une bio, un téléphone et une localisation pour un profil complet.
          </p>
        </Card>
      )}

      {/* Profile form */}
      {isEditing && (
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Modifier le profil</CardTitle>
          </CardHeader>
          <CardContent>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="update-profile" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prénom"
                  name="firstName"
                  defaultValue={user.firstName}
                  required
                />
                <Input
                  label="Nom"
                  name="lastName"
                  defaultValue={user.lastName}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bio
                </label>
                <textarea
                  name="bio"
                  defaultValue={user.bio || ''}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Parlez-nous de vous..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Téléphone"
                  name="phone"
                  type="tel"
                  defaultValue={user.phone || ''}
                />
                <Input
                  label="Localisation"
                  name="location"
                  placeholder="Paris, France"
                  defaultValue={user.location || ''}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" isLoading={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Password change */}
      <Card padding="lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Sécurité</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChangingPassword(!isChangingPassword)}
            >
              {isChangingPassword ? 'Annuler' : 'Changer le mot de passe'}
            </Button>
          </div>
        </CardHeader>

        {isChangingPassword && (
          <CardContent>
            <Form method="post" className="space-y-4">
              <input type="hidden" name="intent" value="change-password" />

              <Input
                label="Mot de passe actuel"
                name="currentPassword"
                type="password"
                required
              />

              <Input
                label="Nouveau mot de passe"
                name="newPassword"
                type="password"
                required
                minLength={8}
                helperText="8 caractères min., majuscule, minuscule, chiffre et symbole"
              />

              <Input
                label="Confirmer le nouveau mot de passe"
                name="confirmPassword"
                type="password"
                required
              />

              <div className="flex justify-end">
                <Button type="submit" isLoading={isSubmitting}>
                  Mettre à jour le mot de passe
                </Button>
              </div>
            </Form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
