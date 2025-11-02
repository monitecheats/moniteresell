'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';

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
    if (loading) return;
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/40">
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-16">
        <div className="grid w-full gap-12 rounded-3xl border bg-card/60 p-8 shadow-sm backdrop-blur sm:grid-cols-2 sm:p-12">
          <div className="hidden flex-col justify-between sm:flex">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Monite</p>
              <h1 className="mt-6 text-3xl font-semibold leading-tight">Create your reseller space</h1>
              <p className="mt-4 text-sm text-muted-foreground">
                Join the dashboard to manage subscriptions with responsive shadcn/ui components tuned for clarity.
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-muted p-6">
              <p className="text-sm font-medium text-muted-foreground">Already registered?</p>
              <p className="mt-2 text-sm text-muted-foreground">Return to the sign-in page to access your console.</p>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 text-center sm:text-left">
                <h2 className="text-2xl font-semibold">Create account</h2>
                <p className="text-sm text-muted-foreground">
                  Usernames are lowercase and unique. Passwords must be at least 10 characters.
                </p>
              </div>
              {error?.error && <Alert>{error.error}</Alert>}
              {success && (
                <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600">
                  Account created! Redirecting…
                </Alert>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {error?.fieldErrors?.username?.[0] ?? 'Use lowercase letters, numbers, dots, or dashes.'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                  {error?.fieldErrors?.email?.[0] && (
                    <p className="text-xs text-destructive">{error.fieldErrors.email[0]}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {error?.fieldErrors?.password?.[0] ?? 'Minimum 10 characters with letters and numbers.'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repeatPassword">Repeat password</Label>
                  <Input
                    id="repeatPassword"
                    type="password"
                    value={repeatPassword}
                    onChange={(event) => setRepeatPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  {error?.fieldErrors?.repeatPassword?.[0] && (
                    <p className="text-xs text-destructive">{error.fieldErrors.repeatPassword[0]}</p>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !csrfToken}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link className="font-medium text-primary" href="/login">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
