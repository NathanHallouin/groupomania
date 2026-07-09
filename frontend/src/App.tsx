import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { useAuthStore } from './stores/authStore';
import { authApi } from './api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function AppContent() {
  const { tokens, setLoading, logout, setUser } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      if (tokens?.accessToken) {
        try {
          // Verify token and get fresh user data
          const response = await authApi.getProfile();
          if (response.data?.user) {
            setUser(response.data.user);
          }
        } catch (error) {
          // Token invalid, logout
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
