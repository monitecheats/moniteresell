'use client';

import { PropsWithChildren, useMemo } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { useTheme } from 'next-themes';
import { darkTheme, lightTheme } from '@/styles/theme';

export default function AppThemeProvider({ children }: PropsWithChildren) {
  const { theme } = useTheme();
  const mode = theme === 'light' ? 'light' : 'dark';
  const muiTheme = useMemo(() => (mode === 'light' ? lightTheme : darkTheme), [mode]);

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
