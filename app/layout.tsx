import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import AppThemeProvider from '@/components/AppThemeProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Monite Resell Dashboard',
  description: 'Manage reseller subscriptions securely'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AppRouterCacheProvider>
          <NextThemesProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="monite-theme"
          >
            <AppThemeProvider>{children}</AppThemeProvider>
          </NextThemesProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
