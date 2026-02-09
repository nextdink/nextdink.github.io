import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './themeContext';
import { themeColors } from '@/config/theme';

const THEME_KEY = 'dinkup-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      return stored || 'light';
    }
    return 'light';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  const resolvedTheme = useMemo(() => {
    return theme === 'system' ? systemTheme : theme;
  }, [theme, systemTheme]);

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove previous theme classes
    root.classList.remove('light', 'dark');

    // Add new theme class
    root.classList.add(resolvedTheme);

    // Update theme-color meta tag for iOS Safari
    const themeColor = resolvedTheme === 'dark' ? themeColors.dark : themeColors.light;
    let metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
    
    // If user has manually set a theme (not system), we need to override the media-query based meta tags
    if (theme !== 'system') {
      // Remove media-based theme-color tags and use a single one
      const mediaBasedTags = document.querySelectorAll('meta[name="theme-color"][media]');
      mediaBasedTags.forEach(tag => tag.remove());
      
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', themeColor);
    }
  }, [resolvedTheme, theme]);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      setSystemTheme(getSystemTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}