'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartBar, KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboard } from '@/components/dashboard/dashboard-provider';

const links = [
  { href: '/dashboard/analytics', label: 'Analytics', icon: ChartBar },
  { href: '/dashboard/subscriptions', label: 'Subscriptions', icon: KeyRound }
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useDashboard();

  return (
    <aside className="hidden w-64 border-r bg-card/80 backdrop-blur lg:flex lg:flex-col">
      <div className="flex items-center gap-2 border-b px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {user?.name?.slice(0, 1).toUpperCase() ?? 'M'}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Monite Resell</span>
          <span className="text-xs text-muted-foreground">{user?.role ?? 'reseller'}</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-6 py-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Credits</p>
        <p className="text-lg font-semibold text-foreground">{user ? user.credits : '—'}</p>
      </div>
    </aside>
  );
}
