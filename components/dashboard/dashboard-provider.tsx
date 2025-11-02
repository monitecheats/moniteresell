'use client';

import * as React from 'react';
import { useToast } from '@/components/ui/use-toast';

export type DashboardUser = {
  sub: string;
  name: string;
  role: string;
  email?: string;
  permissions: string[];
  allowed_games: string[];
  credits: number;
};

type DashboardContextValue = {
  user: DashboardUser | null;
  loading: boolean;
  error: string | null;
  csrfToken: string | null;
  refreshUser: () => Promise<void>;
  refreshCsrf: () => Promise<string | null>;
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
  registerCreateHandler: (handler: (() => void) | null) => void;
  triggerCreate: () => void;
};

const DashboardContext = React.createContext<DashboardContextValue | undefined>(undefined);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = React.useState<DashboardUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [csrfToken, setCsrfToken] = React.useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = React.useState('');
  const createHandlerRef = React.useRef<(() => void) | null>(null);

  const refreshCsrf = React.useCallback(async () => {
    try {
      const response = await fetch('/api/auth/csrf', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      const data = (await response.json()) as { csrfToken: string };
      setCsrfToken(data.csrfToken);
      return data.csrfToken;
    } catch (err) {
      console.error(err);
      setCsrfToken(null);
      return null;
    }
  }, []);

  const refreshUser = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load profile');
      }
      const data = (await response.json()) as { user: Partial<DashboardUser> & { permissions?: unknown[]; allowed_games?: unknown[] } };
      const nextUser: DashboardUser = {
        sub: data.user.sub ?? '',
        name: data.user.name ?? data.user.sub ?? 'Unknown user',
        role: data.user.role ?? 'reseller',
        email: data.user.email,
        permissions: Array.isArray(data.user.permissions) ? (data.user.permissions as string[]) : [],
        allowed_games: Array.isArray(data.user.allowed_games) ? (data.user.allowed_games as string[]) : [],
        credits: typeof data.user.credits === 'number' ? data.user.credits : 0
      };
      setUser(nextUser);
      setError(null);
    } catch (err) {
      console.error(err);
      setUser(null);
      setError('Unable to load profile');
      toast({ variant: 'destructive', title: 'Session error', description: 'We could not load your profile details.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    refreshUser();
    refreshCsrf();
  }, [refreshUser, refreshCsrf]);

  const registerCreateHandler = React.useCallback((handler: (() => void) | null) => {
    createHandlerRef.current = handler;
  }, []);

  const triggerCreate = React.useCallback(() => {
    createHandlerRef.current?.();
  }, []);

  const value = React.useMemo<DashboardContextValue>(
    () => ({
      user,
      loading,
      error,
      csrfToken,
      refreshUser,
      refreshCsrf,
      globalSearch,
      setGlobalSearch,
      registerCreateHandler,
      triggerCreate
    }),
    [user, loading, error, csrfToken, refreshUser, refreshCsrf, globalSearch, registerCreateHandler, triggerCreate]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = React.useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
