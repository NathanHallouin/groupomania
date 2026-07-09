import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button, Input, Card } from '../components/ui';
import { authApi } from '../api';
import { useAuthStore } from '../stores/authStore';

const registerSchema = z
  .object({
    firstName: z
      .string()
      .min(2, 'Minimum 2 caractères')
      .max(50, 'Maximum 50 caractères'),
    lastName: z
      .string()
      .min(2, 'Minimum 2 caractères')
      .max(50, 'Maximum 50 caractères'),
    email: z.string().email('Email invalide'),
    department: z.string().optional(),
    password: z
      .string()
      .min(8, 'Minimum 8 caractères')
      .regex(/[a-z]/, 'Doit contenir une minuscule')
      .regex(/[A-Z]/, 'Doit contenir une majuscule')
      .regex(/[0-9]/, 'Doit contenir un chiffre')
      .regex(/[^a-zA-Z0-9]/, 'Doit contenir un caractère spécial'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError(null);
      const { confirmPassword: _, ...registerData } = data;
      const response = await authApi.register(registerData);
      login(response.data.user, response.data.tokens);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Erreur lors de l'inscription");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Groupomania</h1>
          <p className="mt-2 text-gray-600">Créez votre compte</p>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                placeholder="Jean"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label="Nom"
                placeholder="Dupont"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="vous@entreprise.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Département (optionnel)"
              placeholder="Marketing, IT, RH..."
              error={errors.department?.message}
              {...register('department')}
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.password?.message}
                helperText="8 caractères min., majuscule, minuscule, chiffre et symbole"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <Input
              label="Confirmer le mot de passe"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Créer mon compte
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Déjà un compte ?{' '}
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Se connecter
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
