'use client';

import { IconButton, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { useTheme } from 'next-themes';
import { useCallback } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleToggle = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  return (
    <Tooltip title="Toggle theme">
      <IconButton aria-label="Toggle theme" color="inherit" onClick={handleToggle} size="large">
        {theme === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
      </IconButton>
    </Tooltip>
  );
}
