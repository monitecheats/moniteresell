'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, LogOut } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface Metrics {
  total: number;
  active: number;
  pending: number;
  expired: number;
}

interface KeyItem {
  id: string;
  device: string | null;
  expires_at: number;
  duration: string | null;
  created_at: string | null;
  updated_at: string | null;
  game: string | null;
  game_uid: string | null;
}

interface SessionUser {
  sub: string;
  name: string;
  role: string;
  email?: string;
}

const deviceOptions = [
  { value: '', label: 'All devices' },
  { value: 'iphone', label: 'iPhone' },
  { value: 'android', label: 'Android' }
];

function formatDate(date: Date | null) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export default function DashboardView() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [gameFilter, setGameFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics/keys', {
        cache: 'no-store',
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to load metrics');
      }
      const data = (await res.json()) as Metrics;
      setMetrics(data);
      setMetricsError(null);
    } catch (error) {
      console.error(error);
      setMetricsError('Unable to load metrics');
    }
  }, []);

  const fetchKeys = useCallback(async () => {
    setKeysLoading(true);
    setKeysError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '10');
      if (gameFilter) {
        params.set('game_uid', gameFilter);
      }
      if (deviceFilter) {
        params.set('device', deviceFilter);
      }
      const res = await fetch(`/api/keys/recent?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to load keys');
      }
      const data = (await res.json()) as { keys: KeyItem[] };
      setKeys(data.keys);
    } catch (error) {
      console.error(error);
      setKeysError('Unable to load recent activity');
    } finally {
      setKeysLoading(false);
    }
  }, [deviceFilter, gameFilter]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        cache: 'no-store',
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to load user');
      }
      const data = (await res.json()) as { user: SessionUser };
      setUser(data.user);
    } catch (error) {
      console.error(error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchUser().finally(() => setInitialLoading(false));

    const interval = setInterval(() => {
      fetchMetrics();
      fetchKeys();
    }, 30_000);

    return () => clearInterval(interval);
  }, [fetchKeys, fetchMetrics, fetchUser]);

  useEffect(() => {
    fetchKeys();
  }, [deviceFilter, gameFilter, fetchKeys]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.replace('/login');
    router.refresh();
  }, [router]);

  const formattedKeys = useMemo(() => {
    return keys.map((item) => ({
      ...item,
      expiresDate: item.expires_at ? new Date(item.expires_at * 1000) : null,
      createdDate: item.created_at ? new Date(item.created_at) : null,
      updatedDate: item.updated_at ? new Date(item.updated_at) : null
    }));
  }, [keys]);

  const dashboardReady = metrics && !initialLoading;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Monite</p>
            <h1 className="text-2xl font-semibold">Reseller dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Track subscription performance and review the latest key activity in real time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                fetchMetrics();
                fetchKeys();
              }}
              title="Refresh metrics"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button type="button" variant="destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10">
        <section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardReady ? (
              [
                { title: 'Total keys', value: metrics?.total },
                { title: 'Active keys', value: metrics?.active },
                { title: 'Pending keys', value: metrics?.pending },
                { title: 'Expired keys', value: metrics?.expired }
              ].map((card) => (
                <Card key={card.title} className="border-muted/80">
                  <CardHeader>
                    <CardDescription>{card.title}</CardDescription>
                    <CardTitle className="text-3xl font-semibold">{card.value ?? '—'}</CardTitle>
                  </CardHeader>
                </Card>
              ))
            ) : (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)
            )}
          </div>
          {metricsError && <Alert className="mt-4">{metricsError}</Alert>}
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card className="border-muted/80">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Latest key events from the last synchronisation window.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="space-y-1">
                  <Label htmlFor="gameFilter" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Game UID
                  </Label>
                  <Input
                    id="gameFilter"
                    value={gameFilter}
                    onChange={(event) => setGameFilter(event.target.value)}
                    placeholder="Search by game UID"
                    className="w-48"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="deviceFilter" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Device
                  </Label>
                  <select
                    id="deviceFilter"
                    value={deviceFilter}
                    onChange={(event) => setDeviceFilter(event.target.value)}
                    className="flex h-10 w-40 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {deviceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {keysError && <Alert className="mb-4">{keysError}</Alert>}
              <div className="rounded-xl border border-dashed border-muted/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Key</TableHead>
                      <TableHead>Game</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keysLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                          Loading recent keys…
                        </TableCell>
                      </TableRow>
                    ) : formattedKeys.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                          No recent activity to display.
                        </TableCell>
                      </TableRow>
                    ) : (
                      formattedKeys.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.id}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{item.game ?? '—'}</span>
                              <span className="text-xs text-muted-foreground">{item.game_uid ?? '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{item.device ?? 'Unassigned'}</TableCell>
                          <TableCell>{formatDate(item.expiresDate)}</TableCell>
                          <TableCell>{item.duration ?? '—'}</TableCell>
                          <TableCell>{formatDate(item.createdDate)}</TableCell>
                          <TableCell>{formatDate(item.updatedDate)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted/80">
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Your authenticated reseller identity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user ? (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-base font-semibold">{user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Username</p>
                    <p className="text-base font-semibold">{user.sub}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Role</p>
                    <p className="text-base font-semibold capitalize">{user.role}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-base font-semibold">{user.email ?? '—'}</p>
                  </div>
                </>
              ) : initialLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : (
                <Alert>Unable to load account details.</Alert>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
