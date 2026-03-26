import { useState, useEffect } from 'react';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'staff' | 'admin';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  role: 'staff' | 'admin' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const TOKEN_KEY = 'mediflow_auth_token';

let _token: string | null = null;
let _setToken: ((t: string | null) => void) | null = null;
let _setUser: ((u: AuthUser | null) => void) | null = null;

export function useAuth() {
  const [token, setToken] = useState<string | null>(_token);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  _setToken = setToken;
  _setUser = setUser;

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) { setIsLoading(false); return; }

    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setToken(stored);
        setUser(data.user);
        _token = stored;
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = (newToken: string, userData: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(userData);
    _token = newToken;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    _token = null;
  };

  return {
    token,
    user,
    role: user?.role ?? null,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
  };
}

// Helper for non-hook contexts (API calls from outside components)
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
