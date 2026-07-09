import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card } from '../components/ui';
import { authApi } from '../api';

type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');
  // Évite une double vérification en mode StrictMode (double montage).
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (!token) {
      setStatus('error');
      setMessage('Lien de vérification invalide.');
      return;
    }

    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Votre adresse email a bien été vérifiée.');
      })
      .catch((err: unknown) => {
        const e = err as { response?: { data?: { message?: string } } };
        setStatus('error');
        setMessage(e.response?.data?.message || 'Lien invalide ou expiré.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">Groupomania</h1>
          <p className="mt-2 text-gray-600">Vérification de l'email</p>
        </div>

        <Card padding="lg">
          <div className="flex flex-col items-center gap-4 text-center">
            {status === 'verifying' && (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
                <p className="text-gray-600">Vérification en cours…</p>
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-10 w-10 text-green-500" />
                <p className="text-gray-700">{message}</p>
                <Link
                  to="/"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Accéder à l'application
                </Link>
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-10 w-10 text-red-500" />
                <p className="text-gray-700">{message}</p>
                <Link
                  to="/login"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  Retour à la connexion
                </Link>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
