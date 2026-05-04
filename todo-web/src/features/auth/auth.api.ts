import { apiFetch } from '@/lib/api';

type AuthStatusResponse =
  | { authenticated: false }
  | { authenticated: true; email: string };

export async function checkAuth(): Promise<AuthStatusResponse> {
  return apiFetch<AuthStatusResponse>('/api/public/auth/me', { method: 'GET' });
}
