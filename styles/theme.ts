import { createTheme } from '@mui/material/styles';

const baseTypography = {
  fontFamily: "'Google Sans', 'Roboto', 'Helvetica Neue', Arial, sans-serif",
  button: {
    textTransform: 'none',
    fontWeight: 600
  }
} as const;

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a73e8',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#34a853',
      contrastText: '#ffffff'
    },
    background: {
      default: '#f8f9fa',
      paper: '#ffffff'
    },
    success: {
      main: '#188038'
    },
    warning: {
      main: '#fbbc04'
    }
  },
  typography: baseTypography,
  shape: {
    borderRadius: 16
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingLeft: 24,
          paddingRight: 24,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none'
          }
        }
      }
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(60,64,67,0.08)'
        }
      }
    },
    MuiCard: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(60,64,67,0.08)'
        }
      }
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#1a73e8',
          fontWeight: 600
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18
        }
      }
    }
  }
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8ab4f8'
    },
    secondary: {
      main: '#57d38c'
    },
    background: {
      default: '#202124',
      paper: '#1f1f1f'
    },
    success: {
      main: '#81c995'
    },
    warning: {
      main: '#fdd663'
    }
  },
  typography: baseTypography,
  shape: {
    borderRadius: 16
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingLeft: 24,
          paddingRight: 24,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none'
          }
        }
      }
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          backgroundImage: 'none'
        }
      }
    },
    MuiCard: {
      defaultProps: {
        elevation: 0
      },
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          backgroundImage: 'none'
        }
      }
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#8ab4f8',
          fontWeight: 600
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18
        }
      }
    }
  }
});
