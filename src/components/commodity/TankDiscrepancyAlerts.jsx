import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getUnacknowledgedAlerts } from '../../services/tankDiscrepancyAlertService';
import { AlertTriangle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const TankDiscrepancyAlerts = () => {
  const { company } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Memoize loadAlerts to prevent infinite loops
  const loadAlerts = useCallback(async () => {
    if (!company?.id) return;
    
    try {
      // Only show loading on initial load, not on auto-refresh
      if (alerts.length === 0) {
        setLoading(true);
      }
      const data = await getUnacknowledgedAlerts(company.id);
      setAlerts(data);
    } catch (error) {
      console.error('Error loading alerts:', error);
      // Only show error toast on initial load, not on auto-refresh
      if (alerts.length === 0) {
        toast.error('Failed to load tank discrepancy alerts');
      }
    } finally {
      setLoading(false);
    }
  }, [company?.id, alerts.length]);

  useEffect(() => {
    loadAlerts();
    
    // Set up auto-refresh when user returns to page
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refresh alerts
        loadAlerts();
      }
    };
    
    // Set up focus event listener (more reliable than visibility change)
    const handleFocus = () => {
      loadAlerts();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Set up periodic refresh every 60 seconds (1 minute) - less aggressive to prevent flickering
    const intervalId = setInterval(() => {
      loadAlerts();
    }, 60000); // 60 seconds
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [company?.id, loadAlerts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-baltic-500"></div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return null; // Don't show anything if no alerts
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-l-4 border-danger rounded-lg shadow-sm p-2 sm:p-3 mb-3 mt-0">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
              {alerts.length} Tank {alerts.length === 1 ? 'Discrepancy' : 'Discrepancies'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-danger/10 text-danger">
              Action
            </span>
          </div>
          <button
            onClick={() => {
              if (alerts.length > 0) {
                navigate(`/commodity/reconciliation?offloadId=${alerts[0].offloadEventId}&investigate=true`);
              } else {
                navigate('/commodity/reconciliation');
              }
            }}
            className="flex items-center gap-1 px-2 py-1 bg-baltic-600 hover:bg-baltic-700 text-white rounded text-[10px] font-medium"
          >
            <Eye className="w-3 h-3" />
            View
          </button>
        </div>
        
        {/* Compact alert chips */}
        <div className="flex flex-wrap gap-1">
          {alerts.slice(0, 3).map((alert) => (
            <button
              key={alert.id}
              onClick={() => navigate(`/commodity/reconciliation?offloadId=${alert.offloadEventId}&investigate=true`)}
              className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-[10px] font-medium text-gray-700 dark:text-gray-300"
            >
              {alert.createdAt?.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
            </button>
          ))}
          {alerts.length > 3 && (
            <span className="px-2 py-0.5 text-[10px] text-gray-500">+{alerts.length - 3}</span>
          )}
        </div>
      </div>
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-danger" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {alerts.length} Tank {alerts.length === 1 ? 'Discrepancy' : 'Discrepancies'}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-danger/10 text-danger">
                Action Required
              </span>
            </div>
            
            <button
              onClick={() => {
                if (alerts.length > 0) {
                  navigate(`/commodity/reconciliation?offloadId=${alerts[0].offloadEventId}&investigate=true`);
                } else {
                  navigate('/commodity/reconciliation');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-baltic-600 hover:bg-baltic-700 text-white rounded-md font-medium text-xs transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Investigate
            </button>
          </div>
          
          {/* Compact alert list */}
          <div className="flex flex-wrap gap-2 mt-2">
            {alerts.slice(0, 2).map((alert) => (
              <button
                key={alert.id}
                onClick={() => navigate(`/commodity/reconciliation?offloadId=${alert.offloadEventId}&investigate=true`)}
                className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-xs transition-colors"
              >
                <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
                  {alert.title?.replace('Tank Reading Discrepancy Detected', 'Tank Discrepancy') || 'Discrepancy'}
                </span>
                <span className="text-gray-400 dark:text-gray-500">
                  {alert.createdAt?.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                </span>
              </button>
            ))}
            {alerts.length > 2 && (
              <span className="inline-flex items-center px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
                +{alerts.length - 2} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TankDiscrepancyAlerts;
