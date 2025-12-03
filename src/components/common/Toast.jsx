import { Toaster } from "react-hot-toast";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * Toast component wrapper for react-hot-toast
 * Provides beautiful, theme-aware toast notifications
 */
const Toast = () => {
  const { isDark } = useTheme();

  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={12}
      containerStyle={{
        top: 20,
      }}
      toastOptions={{
        // Default options - prevent duplicates
        duration: 3000,
        style: {
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f1f5f9' : '#1e293b',
          padding: '12px 16px',
          borderRadius: '12px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: isDark 
            ? '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
            : '0 4px 20px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          maxWidth: '400px',
        },
        // Success toast style - Soft green, friendly
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981',
            secondary: isDark ? '#1e293b' : '#ffffff',
          },
          style: {
            background: isDark ? '#064e3b' : '#ecfdf5',
            color: isDark ? '#6ee7b7' : '#065f46',
            border: isDark ? '1px solid #10b981' : '1px solid #a7f3d0',
          },
        },
        // Error toast style - Soft red, not scary
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#f87171',
            secondary: isDark ? '#1e293b' : '#ffffff',
          },
          style: {
            background: isDark ? '#450a0a' : '#fef2f2',
            color: isDark ? '#fca5a5' : '#991b1b',
            border: isDark ? '1px solid #f87171' : '1px solid #fecaca',
          },
        },
        // Loading toast style - Baltic Blue theme
        loading: {
          iconTheme: {
            primary: '#0ea5e9',
            secondary: isDark ? '#1e293b' : '#ffffff',
          },
          style: {
            background: isDark ? '#0c4a6e' : '#f0f9ff',
            color: isDark ? '#7dd3fc' : '#0369a1',
            border: isDark ? '1px solid #0ea5e9' : '1px solid #bae6fd',
          },
        },
      }}
    />
  );
};

export default Toast;
