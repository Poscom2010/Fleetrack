import { Toaster } from "react-hot-toast";

/**
 * Toast component wrapper for react-hot-toast
 * Provides consistent toast notifications across the app
 */
const Toast = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: "#363636",
          color: "#fff",
          padding: "16px",
          borderRadius: "8px",
        },
        // Success toast style
        success: {
          duration: 3000,
          iconTheme: {
            primary: "#10b981",
            secondary: "#fff",
          },
          style: {
            background: "#10b981",
            color: "#fff",
          },
        },
        // Error toast style
        error: {
          duration: 5000,
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
          style: {
            background: "#ef4444",
            color: "#fff",
          },
        },
        // Loading toast style
        loading: {
          iconTheme: {
            primary: "#3b82f6",
            secondary: "#fff",
          },
        },
      }}
    />
  );
};

export default Toast;
