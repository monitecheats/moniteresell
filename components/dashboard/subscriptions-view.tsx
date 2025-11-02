'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, MoreVertical, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import { CreateSubscriptionDialog } from '@/components/dashboard/create-subscription-dialog';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface SubscriptionItem {
  id: string;
  status: 'active' | 'pending' | 'expired' | 'disabled';
  game: string | null;
  game_uid: string | null;
  device: string | null;
  iphone_id?: string | null;
  android_id?: string | null;
  expires_at: number | string;
  created_at: string | null;
  updated_at: string | null;
  generated_by: string | null;
}

interface SubscriptionResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: SubscriptionItem[];
}

interface GameFilterOption {
  uid: string | null;
  name: string | null;
}

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'expired', label: 'Expired' },
  { value: 'disabled', label: 'Disabled' }
];

const pageSizeOptions = [10, 25, 50, 100];

const statusVariant: Record<SubscriptionItem['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  pending: 'secondary',
  expired: 'outline',
  disabled: 'destructive'
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatExpiry(expires: number | string): string {
  if (expires === 'pending') return 'Pending';
  if (typeof expires === 'number') {
    const date = new Date(expires * 1000);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }
  }
  return '—';
}

function buildDeviceLabel(item: SubscriptionItem): string {
  const udid = item.iphone_id ?? item.android_id;
  if (!udid) {
    return item.device ?? 'Unassigned';
  }
  return `${item.device ?? 'Device'} — ${udid}`;
}

export function SubscriptionsView() {
  const { toast } = useToast();
  const { csrfToken, refreshCsrf, globalSearch, registerCreateHandler, refreshUser } = useDashboard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = React.useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState('all');
  const [gameUid, setGameUid] = React.useState('');
  const [gameOptions, setGameOptions] = React.useState<GameFilterOption[]>([]);
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [sort, setSort] = React.useState<'created_at_desc' | 'created_at_asc' | 'expires_at_desc' | 'expires_at_asc'>(
    'created_at_desc'
  );
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    registerCreateHandler(() => setDialogOpen(true));
    return () => registerCreateHandler(null);
  }, [registerCreateHandler]);

  React.useEffect(() => {
    if (searchParams?.get('create') === '1') {
      setDialogOpen(true);
      router.replace('/dashboard/subscriptions');
    }
  }, [router, searchParams]);

  const fetchGames = React.useCallback(async () => {
    try {
      const response = await fetch('/api/games', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load games');
      }
      const payload = (await response.json()) as { games: GameFilterOption[] };
      setGameOptions(payload.games);
    } catch (err) {
      console.error(err);
      setGameOptions([]);
    }
  }, []);

  React.useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const loadSubscriptions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status,
        sort
      });
      if (gameUid) params.set('game_uid', gameUid);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (globalSearch) params.set('q', globalSearch);
      const response = await fetch(`/api/subscriptions?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Failed to load subscriptions');
      }
      const payload = (await response.json()) as SubscriptionResponse;
      setData(payload);
    } catch (err) {
      console.error(err);
      setError('Unable to load subscriptions');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, sort, gameUid, from, to, globalSearch]);

  React.useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions, refreshKey]);

  const handleAction = React.useCallback(
    async (id: string, endpoint: string, successMessage: string) => {
      try {
        let token = csrfToken;
        if (!token) {
          token = await refreshCsrf();
        }
        if (!token) {
          throw new Error('Missing CSRF token');
        }
        const response = await fetch(`/api/subscriptions/${id}/${endpoint}`, {
          method: 'POST',
          headers: {
            'X-CSRF-Token': token
          },
          credentials: 'include'
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error((payload?.error as string) ?? 'Request failed');
        }
        toast({ title: successMessage });
        setRefreshKey((prev) => prev + 1);
        if (endpoint === 'delete' || endpoint === 'disable' || endpoint === 'enable') {
          await refreshUser();
        }
      } catch (err) {
        console.error(err);
        toast({ variant: 'destructive', title: 'Action failed', description: err instanceof Error ? err.message : undefined });
      }
    },
    [csrfToken, refreshCsrf, toast, refreshUser]
  );

  const handleDeviceAction = React.useCallback(
    async (udid: string, endpoint: 'disable' | 'enable') => {
      try {
        let token = csrfToken;
        if (!token) {
          token = await refreshCsrf();
        }
        if (!token) {
          throw new Error('Missing CSRF token');
        }
        const response = await fetch(`/api/devices/${encodeURIComponent(udid)}/${endpoint}`, {
          method: 'POST',
          headers: {
            'X-CSRF-Token': token
          },
          credentials: 'include'
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error((payload?.error as string) ?? 'Request failed');
        }
        toast({ title: `Device ${endpoint === 'disable' ? 'disabled' : 'enabled'}` });
      } catch (err) {
        console.error(err);
        toast({ variant: 'destructive', title: 'Device update failed', description: err instanceof Error ? err.message : undefined });
      }
    },
    [csrfToken, refreshCsrf, toast]
  );

  const resetFilters = () => {
    setStatus('all');
    setGameUid('');
    setFrom('');
    setTo('');
    setSort('created_at_desc');
    setPage(1);
  };

  const toggleSort = (column: 'created' | 'expires') => {
    if (column === 'created') {
      setSort((current) => (current === 'created_at_desc' ? 'created_at_asc' : 'created_at_desc'));
    } else {
      setSort((current) => (current === 'expires_at_desc' ? 'expires_at_asc' : 'expires_at_desc'));
    }
  };

  const totalPages = data?.totalPages ?? 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Subscription inventory</h2>
          <p className="text-sm text-muted-foreground">Filter, audit, and manage active keys across all games.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => setRefreshKey((prev) => prev + 1)} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} /> Refresh table
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
          <CardDescription>
            Use the toolbar to refine results. Global search from the header filters by key prefix instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={gameUid} onValueChange={(value) => { setGameUid(value); setPage(1); }}>
                <SelectTrigger className="w-full md:w-60">
                  <SelectValue placeholder="All games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All games</SelectItem>
                  {gameOptions.map((option) => (
                    <SelectItem key={option.uid ?? ''} value={option.uid ?? ''}>
                      {option.name ?? option.uid ?? 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="from-date" className="text-xs text-muted-foreground">
                    From (UTC)
                  </Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={from}
                    onChange={(event) => {
                      setFrom(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="to-date" className="text-xs text-muted-foreground">
                    To (UTC)
                  </Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={to}
                    onChange={(event) => {
                      setTo(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={resetFilters}>
                Reset
              </Button>
              <CreateSubscriptionDialog
                open={dialogOpen}
                onOpenChange={(value) => setDialogOpen(value)}
                onCreated={() => {
                  setRefreshKey((prev) => prev + 1);
                  refreshUser();
                }}
              />
            </div>
          </div>

          {error && <Alert>{error}</Alert>}

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Device / UDID</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('expires')}>
                    Expires
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort('created')}>
                    Created
                  </TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Loading subscriptions…
                    </TableCell>
                  </TableRow>
                ) : !data || data.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No subscriptions match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.items.map((item) => {
                    const udid = item.iphone_id ?? item.android_id;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.id}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant[item.status]} className="capitalize">
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{item.game ?? '—'}</span>
                            <span className="text-xs text-muted-foreground">{item.game_uid ?? '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{buildDeviceLabel(item)}</TableCell>
                        <TableCell>{formatExpiry(item.expires_at)}</TableCell>
                        <TableCell>{formatDate(item.created_at)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.generated_by ?? '—'}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel>Manage</DropdownMenuLabel>
                              {item.status !== 'disabled' ? (
                                <DropdownMenuItem
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    handleAction(item.id, 'disable', 'Subscription disabled');
                                  }}
                                >
                                  Disable
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    handleAction(item.id, 'enable', 'Subscription enabled');
                                  }}
                                >
                                  Enable
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  handleAction(item.id, 'reset', 'Subscription reset');
                                }}
                              >
                                Reset
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  handleAction(item.id, 'delete', 'Subscription archived');
                                }}
                              >
                                Remove
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={!udid}
                                onSelect={(event) => {
                                  event.preventDefault();
                                  if (udid) {
                                    handleDeviceAction(udid, 'disable');
                                  }
                                }}
                              >
                                Disable device
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!udid}
                                onSelect={(event) => {
                                  event.preventDefault();
                                  if (udid) {
                                    handleDeviceAction(udid, 'enable');
                                  }
                                }}
                              >
                                Enable device
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {data && (
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(data.page - 1) * data.pageSize + 1}–
                {Math.min(data.page * data.pageSize, data.total)} of {data.total} subscriptions
              </div>
              <div className="flex items-center gap-4">
                <Select value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => setPage((prev) => prev - 1)} disabled={!hasPrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {data.page} of {data.totalPages}
                  </span>
                  <Button type="button" variant="outline" size="icon" onClick={() => setPage((prev) => prev + 1)} disabled={!hasNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
