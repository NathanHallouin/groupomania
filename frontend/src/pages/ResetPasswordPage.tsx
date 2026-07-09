import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Card } from '../components/ui';
import { authApi } from '../api';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Au moins 8 caractères')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Une minuscule, une majuscule, un chiffre et un caractère spécial'
      ),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirm'],
  });

type ResetForm = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: ResetForm) => {
    try {
      setError(null);
      await authApi.resetPassword(token, data.password);
      setDone(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Lien invalide ou expiré');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Groupomania</h1>
          <p className="mt-2 text-gray-600">Nouveau mot de passe</p>
        </div>

        <Card padding="lg">
          {!token ? (
            <div className="space-y-4 text-center">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                Lien de réinitialisation invalide.
              </div>
              <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                Demander un nouveau lien
              </Link>
            </div>
          ) : done ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
              Mot de passe réinitialisé. Redirection vers la connexion…
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              <Input
                label="Nouveau mot de passe"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />
              <Input
                label="Confirmer le mot de passe"
                type="password"
                placeholder="••••••••"
                error={errors.confirm?.message}
                {...register('confirm')}
              />
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Réinitialiser
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
