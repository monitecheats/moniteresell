import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0052cc'
    },
    secondary: {
      main: '#00695c'
    },
    background: {
      default: '#f4f6fb',
      paper: '#ffffff'
    }
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif"
  },
  shape: {
    borderRadius: 12
  }
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4dabf5'
    },
    secondary: {
      main: '#80cbc4'
    },
    background: {
      default: '#0b1024',
      paper: '#13193a'
    }
  },
  typography: {
    fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif"
  },
  shape: {
    borderRadius: 12
  }
});
