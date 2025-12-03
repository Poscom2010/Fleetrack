/**
 * ThemeToggle Component
 * Switches between Bright (Baltic Blue) and Dark themes
 * Uses ThemeContext for state management
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                 bg-baltic-100 dark:bg-slate-800 
                 text-baltic-700 dark:text-gray-200
                 hover:bg-baltic-200 dark:hover:bg-slate-700
                 transition-all duration-200
                 border border-baltic-300 dark:border-gray-600
                 shadow-sm hover:shadow-md
                 font-semibold text-sm w-full"
      aria-label={`Switch to ${isDark ? 'bright' : 'dark'} theme`}
      title={`Click to switch to ${isDark ? 'bright' : 'dark'} mode`}
    >
      {isDark ? (
        <>
          <Sun size={18} className="text-yellow-400" />
          <span>Switch to Bright Theme</span>
        </>
      ) : (
        <>
          <Moon size={18} className="text-baltic-600" />
          <span>Switch to Dark Theme</span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;
