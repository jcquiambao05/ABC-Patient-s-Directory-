import { toast } from '../hooks/useToast';

export async function api(path: string, opts: RequestInit = {}, token: string | null = null) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(path, { ...opts, headers });
  } catch {
    // Network error — server unreachable
    throw new Error('Cannot reach server. Check your connection.');
  }

  // JWT expired or invalid → auto-logout
  if (res.status === 401 || res.status === 403) {
    const data = await res.json().catch(() => ({}));
    const msg: string = data?.error ?? '';
    if (msg.includes('expired') || msg.includes('Invalid') || msg.includes('token')) {
      localStorage.removeItem('mediflow_auth_token');
      sessionStorage.setItem('session_expired', '1');
      window.location.href = '/';
      throw new Error('Session expired. Please log in again.');
    }
    throw new Error(msg || 'Access denied.');
  }

  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(e.error || res.statusText);
  }

  return res.json();
}

// Show session-expired banner on next login page load
export function checkSessionExpiry(): string | null {
  const expired = sessionStorage.getItem('session_expired');
  if (expired) {
    sessionStorage.removeItem('session_expired');
    return 'Your session expired. Please log in again.';
  }
  return null;
}
