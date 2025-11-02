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
  Paper,
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
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        py: { xs: 6, md: 8 }
      }}
    >
      <Container maxWidth="md">
        <Paper
          variant="outlined"
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            borderRadius: 4,
            overflow: 'hidden',
            minHeight: { md: 520 }
          }}
        >
          <Box
            sx={{
              flexBasis: { xs: '100%', md: '40%' },
              display: { xs: 'none', md: 'flex' },
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 3,
              p: 5,
              background: 'linear-gradient(135deg, #1a73e8, #174ea6)',
              color: '#fff'
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: 'rgba(255,255,255,0.12)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontSize: 24,
                letterSpacing: 1.5
              }}
            >
              M
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Monite Reseller
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Sign in to a Google-inspired console with calm surfaces and confident
                typography.
              </Typography>
            </Box>
          </Box>

          <Box
            component="form"
            onSubmit={handleLogin}
            sx={{
              flex: 1,
              p: { xs: 4, sm: 6 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 3
            }}
          >
            <Box>
              <Typography component="h1" variant="h4" fontWeight={700} gutterBottom>
                Sign in
              </Typography>
              <Typography color="text.secondary">
                Access your reseller dashboard securely with username and password.
              </Typography>
            </Box>
            {error && <Alert severity="error">{error}</Alert>}
            <Stack spacing={2.5}>
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
            </Stack>
            <Stack spacing={2}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading || !csrfToken}
                sx={{ py: 1.2 }}
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
              <Typography variant="body2" textAlign="center" color="text.secondary">
                Don&apos;t have an account?{' '}
                <Link href="/register" sx={{ fontWeight: 600 }}>
                  Create one
                </Link>
              </Typography>
            </Stack>
          </Box>
        </Paper>
      </Container>

      <Dialog
        open={totpStep}
        onClose={() => {
          setTotpStep(false);
          setTotp('');
          setTotpError(null);
        }}
        aria-labelledby="totp-dialog-title"
      >
        <DialogTitle id="totp-dialog-title">Two-step verification</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Enter the 6-digit code from your authenticator app to continue.
            </Typography>
            <TextField
              label="Verification code"
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/[^0-9]/g, ''))}
              inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
              autoFocus
              error={Boolean(totpError)}
              helperText={totpError ?? ''}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
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
    </Box>
  );
}
