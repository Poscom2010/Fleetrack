import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { getAllAlerts } from '../services/tankDiscrepancyAlertService';
import { getLoadEvent } from '../services/loadEventService';
import { getOffloadEvent } from '../services/offloadEventService';
import { AlertTriangle, CheckCircle, Eye, ArrowLeft } from 'lucide-react';
import ReconciliationBadge from '../components/commodity/ReconciliationBadge';
import toast from 'react-hot-toast';

const TankDiscrepancyListPage = () => {
  usePageTitle('Tank Discrepancies');
  const navigate = useNavigate();
  const { company } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [enrichedAlerts, setEnrichedAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unacknowledged'); // 'all', 'unacknowledged', 'acknowledged'

  useEffect(() => {
    loadAlerts();
  }, [company?.id]);

  const loadAlerts = async () => {
    if (!company?.id) return;
    
    try {
      setLoading(true);
      const data = await getAllAlerts(company.id);
      setAlerts(data);
      
      // Enrich alerts with load and offload details
      const enriched = await Promise.all(
        data.map(async (alert) => {
          try {
            const loadEvent = await getLoadEvent(alert.loadEventId);
            const offloadEvent = await getOffloadEvent(alert.offloadEventId);
            
            return {
              ...alert,
              loadEvent,
              offloadEvent
            };
          } catch (error) {
            console.error('Error enriching alert:', error);
            return alert;
          }
        })
      );
      
      setEnrichedAlerts(enriched);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast.error('Failed to load tank discrepancy alerts');
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = enrichedAlerts.filter(alert => {
    if (filter === 'unacknowledged') return !alert.acknowledged;
    if (filter === 'acknowledged') return alert.acknowledged;
    return true; // 'all'
  });

  const navigateToTrip = (alert) => {
    // Navigate directly to reconciliation page with the specific offload expanded
    navigate(`/commodity/reconciliation?offloadId=${alert.offloadEventId}&investigate=true`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-baltic-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/commodity/dashboard')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-baltic-900 dark:text-gray-100">
              Tank Discrepancy Alerts
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Review and manage tank reading discrepancies
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('unacknowledged')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === 'unacknowledged'
                ? 'bg-danger text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Unacknowledged ({alerts.filter(a => !a.acknowledged).length})
          </button>
          <button
            onClick={() => setFilter('acknowledged')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === 'acknowledged'
                ? 'bg-success text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Acknowledged ({alerts.filter(a => a.acknowledged).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === 'all'
                ? 'bg-baltic-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All ({alerts.length})
          </button>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {filter === 'unacknowledged' ? 'No Pending Discrepancies' : 'No Discrepancies Found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'unacknowledged' 
              ? 'All tank discrepancies have been acknowledged.'
              : 'There are no tank discrepancy alerts to display.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-l-4 p-6 ${
                alert.acknowledged 
                  ? 'border-success' 
                  : 'border-danger'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Alert Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`rounded-full p-2 ${
                      alert.acknowledged ? 'bg-success/10' : 'bg-danger/10'
                    }`}>
                      {alert.acknowledged ? (
                        <CheckCircle className="w-5 h-5 text-success" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-danger" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">
                          {alert.title}
                        </h3>
                        {alert.acknowledged && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-success/10 text-success">
                            Acknowledged
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {alert.createdAt?.toLocaleString('en-ZA', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Discrepancy Details */}
                  {alert.details && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Tank Before</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {alert.details.tankBefore}L
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Offloaded</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {alert.details.offloadQuantity}L
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Expected After</p>
                        <p className="font-semibold text-warning">
                          {alert.details.expectedAfter}L
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Actual After</p>
                        <p className="font-semibold text-danger">
                          {alert.details.tankAfter}L
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Acknowledgment Info */}
                  {alert.acknowledged && alert.acknowledgedAt && (
                    <div className="mt-4 p-3 bg-success/5 border border-success/20 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Acknowledged:</span>{' '}
                        {alert.acknowledgedAt?.toLocaleString('en-ZA', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                      {alert.acknowledgeNotes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <span className="font-medium">Notes:</span> {alert.acknowledgeNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => navigateToTrip(alert)}
                  className="flex items-center gap-2 px-4 py-2 bg-baltic-600 hover:bg-baltic-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm whitespace-nowrap"
                >
                  <Eye className="w-4 h-4" />
                  Investigate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {filteredAlerts.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredAlerts.length} of {alerts.length} total discrepancies
        </div>
      )}
    </div>
  );
};

export default TankDiscrepancyListPage;
