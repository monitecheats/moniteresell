'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

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
    if (loading) return;
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
    if (loading) return;
    if (totp.length !== 6) {
      setTotpError('TOTP code must be 6 digits');
      return;
    }
    await handleLogin();
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted/40">
      <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-16">
        <div className="grid w-full gap-12 rounded-3xl border bg-card/60 p-8 shadow-sm backdrop-blur sm:grid-cols-2 sm:p-12">
          <div className="hidden flex-col justify-between sm:flex">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Monite</p>
              <h1 className="mt-6 text-3xl font-semibold leading-tight">Secure reseller console</h1>
              <p className="mt-4 text-sm text-muted-foreground">
                Access live subscription metrics, recent key activity, and account controls in a calm interface inspired by
                shadcn/ui principles.
              </p>
            </div>
            <div className="rounded-2xl border border-dashed border-muted p-6">
              <p className="text-sm font-medium text-muted-foreground">Need an account?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Request access from an administrator to start managing your reseller keys.
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2 text-center sm:text-left">
                <h2 className="text-2xl font-semibold">Sign in</h2>
                <p className="text-sm text-muted-foreground">Use your reseller credentials to continue.</p>
              </div>
              {error && <Alert>{error}</Alert>}
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !csrfToken}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link className="font-medium text-primary" href="/register">
                  Register
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
      <Dialog
        open={totpStep}
        onOpenChange={(open) => {
          setTotpStep(open);
          if (!open) {
            setTotp('');
            setTotpError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Two-factor authentication</DialogTitle>
            <DialogDescription>Enter the 6-digit verification code from your authenticator app.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="totp">One-time code</Label>
            <Input
              id="totp"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={totp}
              onChange={(event) => setTotp(event.target.value.replace(/[^0-9]/g, ''))}
              autoComplete="one-time-code"
            />
            {totpError && <p className="text-sm text-destructive">{totpError}</p>}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setTotpStep(false);
                setTotp('');
                setTotpError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleTotpSubmit} disabled={loading}>
              {loading ? 'Verifying…' : 'Verify code'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
