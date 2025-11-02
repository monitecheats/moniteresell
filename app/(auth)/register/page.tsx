'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useRouter } from 'next/navigation';

interface RegisterError {
  fieldErrors?: Record<string, string[]>;
  error?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState<RegisterError | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCsrf() {
      try {
        const res = await fetch('/api/auth/csrf', { credentials: 'include' });
        const data = await res.json();
        setCsrfToken(data.csrfToken);
      } catch (err) {
        console.error('Failed to load CSRF token', err);
        setError({ error: 'Unable to start registration flow' });
      }
    }
    fetchCsrf();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        credentials: 'include',
        body: JSON.stringify({ username, email, password, repeatPassword })
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      const data = await response.json();
      setError({
        error: data.error,
        fieldErrors: data.details?.fieldErrors
      });
    } catch (err) {
      console.error('Register failed', err);
      setError({ error: 'Unexpected error' });
    } finally {
      setLoading(false);
    }
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
            overflow: 'hidden'
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
              background: 'linear-gradient(135deg, #34a853, #0f9d58)',
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
                Create your account
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9 }}>
                Start managing subscriptions with a layout inspired by Google&apos;s productivity
                tools.
              </Typography>
            </Box>
          </Box>

          <Box
            component="form"
            onSubmit={handleSubmit}
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
                Create account
              </Typography>
              <Typography color="text.secondary">
                Use a strong password (at least 10 characters) to keep your workspace secure.
              </Typography>
            </Box>
            {error?.error && <Alert severity="error">{error.error}</Alert>}
            {success && (
              <Alert icon={<CheckCircleIcon fontSize="inherit" />} severity="success">
                Account created! Redirecting to sign in...
              </Alert>
            )}
            <Stack spacing={2.5}>
              <TextField
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                helperText={
                  error?.fieldErrors?.username?.[0] ?? 'Use lowercase letters, numbers, dots or dashes.'
                }
                error={Boolean(error?.fieldErrors?.username)}
                required
              />
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                helperText={error?.fieldErrors?.email?.[0] ?? ''}
                error={Boolean(error?.fieldErrors?.email)}
                required
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                helperText={
                  error?.fieldErrors?.password?.[0] ?? 'Minimum 10 characters with letters and numbers.'
                }
                error={Boolean(error?.fieldErrors?.password)}
                required
              />
              <TextField
                label="Repeat password"
                type="password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                autoComplete="new-password"
                helperText={error?.fieldErrors?.repeatPassword?.[0] ?? ''}
                error={Boolean(error?.fieldErrors?.repeatPassword)}
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
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
              <Typography variant="body2" textAlign="center" color="text.secondary">
                Already have an account?{' '}
                <Link href="/login" sx={{ fontWeight: 600 }}>
                  Sign in
                </Link>
              </Typography>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
