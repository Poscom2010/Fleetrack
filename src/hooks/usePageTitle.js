import { useEffect } from 'react';

/**
 * Custom hook to set dynamic page titles
 * @param {string} title - The page title (e.g., "Dashboard", "Vehicles")
 */
export const usePageTitle = (title) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `FleetTrack - ${title}` : 'FleetTrack - Fleet Management System';
    
    // Cleanup: restore previous title when component unmounts
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
};

export default usePageTitle;
