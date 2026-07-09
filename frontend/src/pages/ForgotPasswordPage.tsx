import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '../components/ui';
import { authApi } from '../api';

const schema = z.object({
  email: z.string().email('Email invalide'),
});

type ForgotForm = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // En développement (pas de SMTP), le backend renvoie le lien : on l'affiche.
  const [devLink, setDevLink] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: ForgotForm) => {
    try {
      setError(null);
      const res = await authApi.forgotPassword(data.email);
      setSent(true);
      setDevLink(res.data?.resetUrl ?? null);
    } catch {
      // Réponse volontairement générique (anti-énumération) même en cas d'erreur.
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Groupomania</h1>
          <p className="mt-2 text-gray-600">Réinitialiser votre mot de passe</p>
        </div>

        <Card padding="lg">
          {sent ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                Si un compte existe pour cet email, un lien de réinitialisation vient
                d'être envoyé.
              </div>
              {devLink && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs break-all">
                  <p className="font-medium mb-1">Mode développement (pas d'email) :</p>
                  <Link to={devLink.replace(window.location.origin, '')} className="text-primary-700 underline">
                    {devLink}
                  </Link>
                </div>
              )}
              <Link to="/login" className="block text-center text-sm text-primary-600 hover:text-primary-700">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              <p className="text-sm text-gray-600">
                Saisissez votre email : nous vous enverrons un lien pour réinitialiser
                votre mot de passe.
              </p>
              <Input
                label="Email"
                type="email"
                placeholder="vous@entreprise.com"
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Envoyer le lien
              </Button>
              <Link to="/login" className="block text-center text-sm text-primary-600 hover:text-primary-700">
                Retour à la connexion
              </Link>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
