import { createContext, useContext, useState, useEffect } from 'react';

/**
 * ThemeContext - Manages dark/bright theme switching with localStorage persistence
 * Dark theme: Current dark navy/slate palette
 * Bright theme: Baltic Blue palette
 */
const ThemeContext = createContext();

export const THEMES = {
  dark: 'dark',
  bright: 'bright',
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('fleettrack-theme');
    if (saved && Object.values(THEMES).includes(saved)) {
      return saved;
    }
    // Default to dark theme
    return THEMES.dark;
  });

  useEffect(() => {
    // Persist to localStorage
    localStorage.setItem('fleettrack-theme', theme);
    
    // Update document class for Tailwind dark mode
    const root = document.documentElement;
    if (theme === THEMES.dark) {
      root.classList.add('dark');
      root.classList.remove('bright');
    } else {
      root.classList.remove('dark');
      root.classList.add('bright');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === THEMES.dark ? THEMES.bright : THEMES.dark);
  };

  const setDarkTheme = () => setTheme(THEMES.dark);
  const setBrightTheme = () => setTheme(THEMES.bright);

  const value = {
    theme,
    isDark: theme === THEMES.dark,
    isBright: theme === THEMES.bright,
    toggleTheme,
    setDarkTheme,
    setBrightTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
