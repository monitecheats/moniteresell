'use client';

import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { useDashboard } from '@/components/dashboard/dashboard-provider';

interface Metrics {
  total: number;
  active: number;
  pending: number;
  expired: number;
}

interface RecentKey {
  id: string;
  status: 'active' | 'expired' | 'pending' | 'disabled';
  game: string | null;
  game_uid: string | null;
  device: string | null;
  expires_at: number | string;
  duration: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const statusVariant: Record<RecentKey['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  pending: 'secondary',
  expired: 'outline',
  disabled: 'destructive'
};

const deviceFilters = [
  { value: '', label: 'All devices' },
  { value: 'iphone', label: 'iPhone' },
  { value: 'android', label: 'Android' }
];

function formatDate(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function AnalyticsView() {
  const { user } = useDashboard();
  const [metrics, setMetrics] = React.useState<Metrics | null>(null);
  const [recent, setRecent] = React.useState<RecentKey[]>([]);
  const [metricsError, setMetricsError] = React.useState<string | null>(null);
  const [recentError, setRecentError] = React.useState<string | null>(null);
  const [recentLoading, setRecentLoading] = React.useState(false);
  const [gameFilter, setGameFilter] = React.useState('');
  const [deviceFilter, setDeviceFilter] = React.useState('');

  const loadMetrics = React.useCallback(async () => {
    try {
      const response = await fetch('/api/metrics/keys', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load metrics');
      }
      const data = (await response.json()) as Metrics;
      setMetrics(data);
      setMetricsError(null);
    } catch (error) {
      console.error(error);
      setMetrics(null);
      setMetricsError('Unable to load metrics');
    }
  }, []);

  const loadRecent = React.useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const params = new URLSearchParams({ limit: '10' });
      if (gameFilter) params.set('game_uid', gameFilter);
      if (deviceFilter) params.set('device', deviceFilter);
      const response = await fetch(`/api/keys/recent?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load recent activity');
      }
      const data = (await response.json()) as { keys: RecentKey[] };
      setRecent(data.keys);
    } catch (error) {
      console.error(error);
      setRecent([]);
      setRecentError('Unable to load recent activity');
    } finally {
      setRecentLoading(false);
    }
  }, [deviceFilter, gameFilter]);

  React.useEffect(() => {
    loadMetrics();
    loadRecent();
    const interval = setInterval(() => {
      loadMetrics();
      loadRecent();
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadMetrics, loadRecent]);

  const handleRefresh = () => {
    loadMetrics();
    loadRecent();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Welcome back, {user?.name ?? 'reseller'}.</h2>
          <p className="text-sm text-muted-foreground">Monitor the health of your subscriptions and stay ahead of renewals.</p>
        </div>
        <Button type="button" variant="outline" onClick={handleRefresh} className="self-start lg:self-auto">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh data
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics ? (
          [
            { title: 'Total keys', value: metrics.total },
            { title: 'Active keys', value: metrics.active },
            { title: 'Pending keys', value: metrics.pending },
            { title: 'Expired keys', value: metrics.expired }
          ].map((metric) => (
            <Card key={metric.title}>
              <CardHeader>
                <CardDescription>{metric.title}</CardDescription>
                <CardTitle className="text-3xl">{metric.value}</CardTitle>
              </CardHeader>
            </Card>
          ))
        ) : (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse bg-muted/40">
              <CardHeader>
                <CardDescription className="h-4 w-1/3 rounded bg-muted" />
                <CardTitle className="mt-2 h-6 w-1/4 rounded bg-muted" />
              </CardHeader>
            </Card>
          ))
        )}
      </section>
      {metricsError && <Alert>{metricsError}</Alert>}

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest keys created or updated across your portfolio.</CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={gameFilter}
              onChange={(event) => setGameFilter(event.target.value)}
              placeholder="Filter by game UID"
              className="w-full sm:w-56"
            />
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                {deviceFilters.map((device) => (
                  <SelectItem key={device.value} value={device.value}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {recentError && <Alert className="mb-4">{recentError}</Alert>}
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      Loading activity…
                    </TableCell>
                  </TableRow>
                ) : recent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No recent activity to display.
                    </TableCell>
                  </TableRow>
                ) : (
                  recent.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.id}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[entry.status]} className="capitalize">
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{entry.game ?? '—'}</span>
                          <span className="text-xs text-muted-foreground">{entry.game_uid ?? '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{entry.device ?? 'Unassigned'}</TableCell>
                      <TableCell>{entry.duration ?? '—'}</TableCell>
                      <TableCell>{formatDate(entry.created_at, '—')}</TableCell>
                      <TableCell>{formatDate(entry.updated_at, '—')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
