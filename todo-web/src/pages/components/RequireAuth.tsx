import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';
import { apiFetch } from '@/lib/api';
import { ApiError } from '@/lib/api';

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    apiFetch('/api/health')
      .then(() => setAuthState('authenticated'))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          setAuthState('unauthenticated');
        } else {
          setAuthState('authenticated');
        }
      });
  }, []);

  if (authState === 'loading') return null;
  if (authState === 'unauthenticated') return <Navigate to="/login" replace />;
  return <>{children}</>;
}
