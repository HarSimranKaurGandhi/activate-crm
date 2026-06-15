import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../../services/authService';
import { AUTH_TOKEN_KEY } from '../../services/apiClient';

const AUTH_USER_CACHE_KEY = 'AUTH_USER_CACHE_V1';

interface AuthContextValue {
  user: any;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<any>(() => {
    const cached = sessionStorage.getItem(AUTH_USER_CACHE_KEY);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached);
    } catch {
      sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(token) && !user);

  useEffect(() => {
    let mounted = true;

    if (!token) {
      setUser(null);
      setLoading(false);
      sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
      return;
    }

    if (user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    authService
      .me()
      .then((profile) => {
        if (mounted) {
          setUser(profile);
          sessionStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(profile));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    isAuthenticated: Boolean(token),
    async login(email: string, password: string) {
      const data = await authService.login({ email, password });
      setToken(data.token);
      setUser(data.user);
      sessionStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(data.user));
    },
    async logout() {
      await authService.logout();
      setToken(null);
      setUser(null);
      sessionStorage.removeItem(AUTH_USER_CACHE_KEY);
    },
  }), [loading, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
