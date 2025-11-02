import type { ReactNode } from 'react';
import { DashboardProvider } from '@/components/dashboard/dashboard-provider';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { HeaderBar } from '@/components/dashboard/header-bar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <div className="flex min-h-screen bg-background">
        <SidebarNav />
        <div className="flex flex-1 flex-col">
          <HeaderBar />
          <main className="flex-1 overflow-y-auto bg-muted/20 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </DashboardProvider>
  );
}
