'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Plus, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useDashboard } from '@/components/dashboard/dashboard-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const titles: Record<string, string> = {
  '/dashboard/analytics': 'Analytics overview',
  '/dashboard/subscriptions': 'Subscription management'
};

function resolveTitle(pathname: string): string {
  const entry = Object.keys(titles).find((key) => pathname.startsWith(key));
  return entry ? titles[entry] : 'Dashboard';
}

export function HeaderBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, globalSearch, setGlobalSearch, triggerCreate, csrfToken, refreshCsrf } = useDashboard();
  const title = resolveTitle(pathname);
  const [pendingLogout, setPendingLogout] = React.useState(false);

  const initials = React.useMemo(() => {
    if (!user?.name) return 'M';
    const segments = user.name.split(' ');
    return segments.slice(0, 2).map((segment) => segment.charAt(0)).join('').toUpperCase();
  }, [user?.name]);

  const handleLogout = React.useCallback(async () => {
    if (pendingLogout) return;
    setPendingLogout(true);
    try {
      let token = csrfToken;
      if (!token) {
        token = await refreshCsrf();
      }
      if (!token) {
        throw new Error('Missing CSRF token');
      }
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': token
        },
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Logout failed', description: 'We could not sign you out right now.' });
    } finally {
      setPendingLogout(false);
    }
  }, [pendingLogout, csrfToken, refreshCsrf, router, toast]);

  const handleCreate = React.useCallback(() => {
    if (pathname.startsWith('/dashboard/subscriptions')) {
      triggerCreate();
    } else {
      router.push('/dashboard/subscriptions?create=1');
    }
  }, [pathname, router, triggerCreate]);

  React.useEffect(() => {
    setGlobalSearch('');
  }, [pathname, setGlobalSearch]);

  return (
    <header className="flex w-full items-center justify-between border-b bg-background/80 px-6 py-4 backdrop-blur">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Monite</span>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden w-64 items-center md:flex">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
            placeholder="Search subscriptions"
            className="pl-9"
          />
        </div>
        <Button type="button" onClick={handleCreate} className="hidden md:inline-flex">
          <Plus className="mr-2 h-4 w-4" /> Create subscription
        </Button>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border bg-card text-sm font-semibold uppercase text-foreground">
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{user?.name ?? 'Unknown'}</span>
                <span className="text-xs text-muted-foreground">{user?.email ?? 'No email'}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="flex flex-col items-start gap-1 text-sm">
              <span className="text-xs uppercase text-muted-foreground">Credits</span>
              <span className="text-base font-semibold text-foreground">{user ? user.credits : '—'}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                handleCreate();
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Create subscription
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                handleLogout();
              }}
              className={cn('text-destructive', pendingLogout && 'opacity-70')}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
