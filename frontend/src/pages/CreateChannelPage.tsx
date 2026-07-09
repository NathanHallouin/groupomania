import { useState } from 'react';
import { Link, Form, useNavigation, useActionData } from 'react-router-dom';
import { ArrowLeft, Hash, Lock } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../components/ui';

interface ActionData {
  error?: string;
}

export function CreateChannelPage() {
  const navigation = useNavigation();
  const actionData = useActionData() as ActionData | undefined;
  const [isPrivate, setIsPrivate] = useState(false);

  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        to="/channels"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux channels
      </Link>

      <Card padding="lg">
        <CardHeader>
          <CardTitle>Créer un nouveau channel</CardTitle>
        </CardHeader>

        <CardContent>
          <Form method="post" className="space-y-6">
            {actionData?.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {actionData.error}
              </div>
            )}

            <Input
              label="Nom du channel"
              name="name"
              placeholder="général, projet-x, marketing..."
              required
              pattern="^[a-zA-Z0-9\s\-_]+$"
              maxLength={50}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optionnel)
              </label>
              <textarea
                name="description"
                placeholder="Décrivez le sujet de ce channel..."
                rows={3}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <input type="hidden" name="isPrivate" value={String(isPrivate)} />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Visibilité
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setIsPrivate(false)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    !isPrivate
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Hash
                      className={`h-5 w-5 ${
                        !isPrivate ? 'text-primary-600' : 'text-gray-400'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">Public</p>
                      <p className="text-sm text-gray-500">
                        Tout le monde peut rejoindre
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrivate(true)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    isPrivate
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Lock
                      className={`h-5 w-5 ${
                        isPrivate ? 'text-primary-600' : 'text-gray-400'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">Privé</p>
                      <p className="text-sm text-gray-500">
                        Sur invitation uniquement
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Link to="/channels">
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </Link>
              <Button type="submit" isLoading={isSubmitting}>
                Créer le channel
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
