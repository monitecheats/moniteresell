'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

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

  const renderMetricCard = (title: string, value: number | undefined, color: string) => (
    <Card sx={{ height: '100%', background: color }}>
      <CardContent>
        <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.8)' }}>
          {title}
        </Typography>
        <Typography variant="h3" sx={{ color: '#fff', mt: 1, fontWeight: 700 }}>
          {value ?? '-'}
        </Typography>
      </CardContent>
    </Card>
  );

  const dashboardReady = metrics && !initialLoading;

  return (
    <Stack spacing={4} sx={{ p: { xs: 2, md: 4 } }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 3,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Welcome back{user ? `, ${user.name}` : ''}
          </Typography>
          <Typography color="text.secondary">
            Overview of your subscription keys activity in real time.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <ThemeToggle />
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Stack>
      </Paper>

      {metricsError && <Alert severity="error">{metricsError}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          {dashboardReady ? (
            renderMetricCard('Total keys', metrics?.total, 'linear-gradient(135deg, #0052cc, #2f6eff)')
          ) : (
            <Card><CardContent><CircularProgress /></CardContent></Card>
          )}
        </Grid>
        <Grid item xs={12} md={3}>
          {dashboardReady ? (
            renderMetricCard('Active', metrics?.active, 'linear-gradient(135deg, #00796b, #26a69a)')
          ) : (
            <Card><CardContent><CircularProgress /></CardContent></Card>
          )}
        </Grid>
        <Grid item xs={12} md={3}>
          {dashboardReady ? (
            renderMetricCard('Pending', metrics?.pending, 'linear-gradient(135deg, #6a1b9a, #9c27b0)')
          ) : (
            <Card><CardContent><CircularProgress /></CardContent></Card>
          )}
        </Grid>
        <Grid item xs={12} md={3}>
          {dashboardReady ? (
            renderMetricCard('Expired', metrics?.expired, 'linear-gradient(135deg, #c62828, #ef5350)')
          ) : (
            <Card><CardContent><CircularProgress /></CardContent></Card>
          )}
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <Typography variant="h6" fontWeight={600} flexGrow={1}>
            Recent activity
          </Typography>
          <TextField
            label="Filter by game UID"
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 160 }}
          />
          <FormControl sx={{ minWidth: 160 }} size="small">
            <InputLabel id="device-select">Device</InputLabel>
            <Select
              labelId="device-select"
              value={deviceFilter}
              label="Device"
              onChange={(event) => setDeviceFilter(event.target.value)}
            >
              {deviceOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              fetchMetrics();
              fetchKeys();
            }}
          >
            Refresh
          </Button>
        </Stack>

        <Divider sx={{ my: 3 }} />

        {keysError && <Alert severity="error">{keysError}</Alert>}

        {keysLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : formattedKeys.length === 0 ? (
          <Typography color="text.secondary" textAlign="center">
            No activity to display.
          </Typography>
        ) : (
          <Table size="small" sx={{ '& th': { textTransform: 'uppercase', fontSize: 12 } }}>
            <TableHead>
              <TableRow>
                <TableCell>Key</TableCell>
                <TableCell>Device</TableCell>
                <TableCell>Game</TableCell>
                <TableCell>Game UID</TableCell>
                <TableCell>Expires</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {formattedKeys.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.id}</TableCell>
                  <TableCell>{item.device ?? '—'}</TableCell>
                  <TableCell>{item.game ?? '—'}</TableCell>
                  <TableCell>{item.game_uid ?? '—'}</TableCell>
                  <TableCell>
                    {item.expiresDate ? item.expiresDate.toLocaleString() : '—'}
                  </TableCell>
                  <TableCell>
                    {item.createdDate ? item.createdDate.toLocaleString() : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
