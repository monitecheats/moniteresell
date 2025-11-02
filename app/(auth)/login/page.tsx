'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';

interface LoginResponse {
  error?: string;
  totpRequired?: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [totpStep, setTotpStep] = useState(false);
  const [totpError, setTotpError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCsrf() {
      try {
        const res = await fetch('/api/auth/csrf', { credentials: 'include' });
        const data = await res.json();
        setCsrfToken(data.csrfToken);
      } catch (err) {
        console.error('Failed to load CSRF token', err);
        setError('Unable to start authentication flow');
      }
    }
    fetchCsrf();
  }, []);

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    setTotpError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ username, password, totp: totpStep ? totp : undefined })
      });

      const data = (await response.json()) as LoginResponse;
      if (response.ok && data && !data.error) {
        setTotpStep(false);
        setTotp('');
        setTotpError(null);
        const redirectTo = searchParams.get('from') ?? '/';
        router.replace(redirectTo);
        router.refresh();
        return;
      }

      if (data?.totpRequired) {
        setTotpStep(true);
        setTotpError(null);
        return;
      }

      if (totpStep) {
        setTotpError(data.error ?? 'Invalid code');
      } else {
        setError(data.error ?? 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login failed', err);
      if (totpStep) {
        setTotpError('Unexpected error');
      } else {
        setError('Unexpected error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async () => {
    if (totp.length !== 6) {
      setError('TOTP code must be 6 digits');
      return;
    }
    await handleLogin();
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
        <Box
          component="form"
          onSubmit={handleLogin}
          sx={{
            width: '100%',
            p: 4,
            borderRadius: 3,
            boxShadow: (theme) => theme.shadows[4],
            backgroundColor: (theme) => theme.palette.background.paper
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography component="h1" variant="h4" fontWeight={700} gutterBottom>
                Sign in
              </Typography>
              <Typography color="text.secondary">Access your reseller dashboard securely.</Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              fullWidth
              required
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              fullWidth
              required
            />
            <Button type="submit" variant="contained" size="large" disabled={loading || !csrfToken}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <Typography variant="body2" textAlign="center">
              Don&apos;t have an account? <Link href="/register">Create one</Link>
            </Typography>
          </Stack>
        </Box>
      </Box>

      <Dialog
        open={totpStep}
        onClose={() => {
          setTotpStep(false);
          setTotp('');
          setTotpError(null);
        }}
        aria-labelledby="totp-dialog-title"
      >
        <DialogTitle id="totp-dialog-title">Enter 6-digit code</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Two-factor authentication is enabled. Enter the code from your authenticator app.
            </Typography>
            <TextField
              label="TOTP code"
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/[^0-9]/g, ''))}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
              autoFocus
              error={Boolean(totpError)}
              helperText={totpError ?? ''}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setTotpStep(false);
              setTotp('');
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleTotpSubmit} variant="contained" disabled={loading}>
            Verify
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
