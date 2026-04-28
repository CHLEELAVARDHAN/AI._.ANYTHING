import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = {
  primary: string;
  isDark: boolean;
  cursorSize: number;
  displayMode: 'mobile' | 'desktop';
};

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Partial<Theme>) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>({
    primary: '#eab308',
    isDark: typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true,
    cursorSize: 20,
    displayMode: 'mobile',
  });

  const setTheme = (newTheme: Partial<Theme>) => {
    setThemeState(prev => ({ ...prev, ...newTheme }));
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme({ isDark: e.matches });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    
    // Convert hex to rgb for glow effects
    const hex = theme.primary.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (!isNaN(r)) {
      document.documentElement.style.setProperty('--primary-rgb', `${r}, ${g}, ${b}`);
    }

    // Set text primary color variable
    document.documentElement.style.setProperty('--text-primary', theme.primary);

    if (theme.isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
