import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import { getLoadEvents } from '../../services/loadEventService';
import { getOffloadEvents } from '../../services/offloadEventService';
import { getCompanyVehicles } from '../../services/vehicleService';
import ReconciliationBadge from './ReconciliationBadge.jsx';

const RecentActivityList = ({ limit = 10, onViewDetails }) => {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [vehicles, setVehicles] = useState({});

  useEffect(() => {
    loadActivities();
  }, [company]);

  const loadActivities = async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      // Load vehicles
      const vehiclesList = await getCompanyVehicles(company.id);
      const vehiclesMap = {};
      vehiclesList.forEach(v => {
        vehiclesMap[v.id] = v;
      });
      setVehicles(vehiclesMap);

      // Load loads and offloads
      const [loads, offloads] = await Promise.all([
        getLoadEvents(company.id),
        getOffloadEvents(company.id)
      ]);

      // Combine and sort by date
      const combined = [
        ...loads.map(l => ({ ...l, type: 'load', date: l.loadDate })),
        ...offloads.map(o => ({ ...o, type: 'offload', date: o.offloadDate }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date))
       .slice(0, limit);

      setActivities(combined);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRelativeTime = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return then.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
  };

  const formatQuantity = (quantity, unit) => {
    return `${quantity.toLocaleString()} ${unit === 'kgs' ? 'kg' : 'L'}`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex gap-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-4xl mb-2">📋</div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No recent activity
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => {
        const vehicle = vehicles[activity.vehicleId];
        const isLoad = activity.type === 'load';
        
        return (
          <div
            key={`${activity.type}-${activity.id}-${index}`}
            onClick={() => onViewDetails && onViewDetails(activity)}
            className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700
                     hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
              isLoad 
                ? 'bg-baltic-100 dark:bg-baltic-900/30' 
                : activity.reconciliationStatus === 'matched'
                ? 'bg-success/20'
                : activity.reconciliationStatus === 'minor_variance'
                ? 'bg-warning/20'
                : 'bg-danger/20'
            }`}>
              {isLoad ? '⛽' : '✅'}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1">
                  <h4 className="font-medium text-baltic-900 dark:text-gray-100">
                    {isLoad ? 'Load Event' : 'Offload Event'}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {vehicle?.registrationNumber || 'Unknown Vehicle'}
                    {isLoad && activity.supplier && ` • ${activity.supplier}`}
                    {!isLoad && activity.customer && ` • ${activity.customer}`}
                  </p>
                </div>
                
                {!isLoad && activity.reconciliationStatus && (
                  <ReconciliationBadge status={activity.reconciliationStatus} size="sm" />
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-baltic-700 dark:text-gray-300">
                  {formatQuantity(
                    isLoad ? activity.loadQuantity : activity.offloadQuantity,
                    activity.unit
                  )}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getRelativeTime(activity.date)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

RecentActivityList.propTypes = {
  limit: PropTypes.number,
  onViewDetails: PropTypes.func,
};

export default RecentActivityList;
