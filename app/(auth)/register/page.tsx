'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
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
    <Container maxWidth="sm">
      <Box sx={{ display: 'flex', alignItems: 'center', minHeight: '100vh' }}>
        <Box
          component="form"
          onSubmit={handleSubmit}
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
                Create account
              </Typography>
              <Typography color="text.secondary">
                Set up your reseller workspace. Password must include at least 10 characters with letters and numbers.
              </Typography>
            </Box>
            {error?.error && <Alert severity="error">{error.error}</Alert>}
            {success && (
              <Alert icon={<CheckCircleIcon fontSize="inherit" />} severity="success">
                Account created! Redirecting to sign in...
              </Alert>
            )}
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              helperText={error?.fieldErrors?.username?.[0] ?? 'Use lowercase letters, numbers, dots or dashes.'}
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
              helperText={error?.fieldErrors?.password?.[0] ?? 'Minimum 10 characters with letters and numbers.'}
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
            <Button type="submit" variant="contained" size="large" disabled={loading || !csrfToken}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
            <Typography variant="body2" textAlign="center">
              Already have an account? <Link href="/login">Sign in</Link>
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}
