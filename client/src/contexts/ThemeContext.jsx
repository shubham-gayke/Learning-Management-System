import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

function getInitialMode() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem('theme-mode') || localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);

  // Apply Glacier theme attributes to <html> root
  const applyTheme = useCallback((currentMode) => {
    const root = document.documentElement;
    const isDark = currentMode === 'dark';

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    // Always Glacier theme
    root.setAttribute('data-theme', 'glacier');

    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.content = isDark ? 'dark' : 'light';
    }
  }, []);

  useEffect(() => {
    applyTheme(mode);
    try {
      localStorage.setItem('theme-mode', mode);
      localStorage.setItem('theme', mode);
      localStorage.setItem('theme-preset', 'glacier');
    } catch {}
  }, [mode, applyTheme]);

  // Sync across tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (
        (e.key === 'theme-mode' || e.key === 'theme') &&
        (e.newValue === 'dark' || e.newValue === 'light')
      ) {
        setMode(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark: mode === 'dark',
        setMode,
        toggleMode,
        // Backward-compatible aliases:
        theme: mode,
        toggleTheme: toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
