import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { getMileageGapStats, getCompanyMileageGapsFiltered } from '../../services/mileageGapDetectionService';
import MileageGapsModal from '../analytics/MileageGapsModal';
import toast from 'react-hot-toast';

const VehicleAlertsSection = ({ vehicles }) => {
  const { user, company } = useAuth();
  const { isDark } = useTheme();
  const [mileageGapStats, setMileageGapStats] = useState(null);
  const [mileageGaps, setMileageGaps] = useState([]);
  const [showGapsModal, setShowGapsModal] = useState(false);

  const {
    serviceAlerts,
    licenseExpiryAlerts,
    acknowledgeAlert,
  } = useAnalytics(user?.uid, 'all');

  // Load mileage gap stats and detailed gaps
  const loadGapStats = async () => {
    if (company?.id) {
      try {
        const [stats, gaps] = await Promise.all([
          getMileageGapStats(company.id),
          getCompanyMileageGapsFiltered(company.id, false) // Only unacknowledged gaps
        ]);
        setMileageGapStats(stats);
        setMileageGaps(gaps);
      } catch (error) {
        console.error('Error loading mileage gap stats:', error);
      }
    }
  };

  useEffect(() => {
    loadGapStats();
  }, [company?.id]);

  const handleAcknowledgeAlert = async (vehicleId, currentMileage) => {
    const toastId = toast.loading("Acknowledging service alert...");
    try {
      await acknowledgeAlert(vehicleId, currentMileage);
      toast.success("Service alert acknowledged", { id: toastId });
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
      toast.error("Failed to acknowledge alert", { id: toastId });
    }
  };

  const hasAlerts = (serviceAlerts && serviceAlerts.length > 0) || 
                    (licenseExpiryAlerts && licenseExpiryAlerts.length > 0) ||
                    (mileageGapStats && mileageGapStats.totalGaps > 0);

  // Count total alert types
  const alertCount = [
    serviceAlerts && serviceAlerts.length > 0,
    licenseExpiryAlerts && licenseExpiryAlerts.length > 0,
    mileageGapStats && mileageGapStats.totalGaps > 0
  ].filter(Boolean).length;

  // Use 2 columns only if there are 2 or more alert types
  const gridClass = alertCount > 1 
    ? "grid grid-cols-1 lg:grid-cols-2 gap-2" 
    : "grid grid-cols-1 gap-2";

  if (!hasAlerts) {
    return null;
  }

  return (
    <div className="mb-4">
      <h2 className={`text-sm font-bold flex items-center gap-1.5 mb-2 ${isDark ? 'text-white' : 'text-baltic-900'}`}>
        <span className="text-base">🚨</span>
        Vehicle Alerts
      </h2>

      {/* Alerts Grid - Dynamic Layout */}
      <div className={gridClass}>
        {/* Service Alerts */}
        {serviceAlerts && serviceAlerts.length > 0 && (
        <div className={`rounded-lg border-l-4 p-2 shadow-sm ${
          isDark 
            ? 'border-l-red-500 bg-gradient-to-r from-red-900/30 via-rose-900/20 to-pink-900/10' 
            : 'border-l-red-400 bg-gradient-to-r from-red-50 via-rose-50 to-pink-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`rounded p-1 ${isDark ? 'bg-red-500/40' : 'bg-red-100'}`}>
              <span className="text-sm">🔧</span>
            </div>
            <h2 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-red-800'}`}>Service Due</h2>
            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
              isDark ? 'text-red-200 bg-red-500/30' : 'text-red-700 bg-red-200'
            }`}>
              {serviceAlerts.length} {serviceAlerts.length === 1 ? 'alert' : 'alerts'}
            </span>
          </div>
          
          {/* Alert Cards Grid - Compact */}
          <div className={`grid gap-1.5 ${serviceAlerts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {serviceAlerts.map((alert, index) => (
              <div
                key={alert.id || `service-alert-${alert.vehicleId}-${index}`}
                onClick={() => handleAcknowledgeAlert(alert.vehicleId, alert.currentMileage)}
                className={`group cursor-pointer rounded border p-2 transition-all hover:scale-[1.01] ${
                  alert.severity === "high"
                    ? isDark ? "border-red-400/50 bg-red-900/40" : "border-red-300 bg-red-100"
                    : isDark ? "border-orange-400/50 bg-orange-900/40" : "border-orange-300 bg-orange-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className={`text-sm flex-shrink-0 ${alert.severity === "high" ? "animate-pulse" : ""}`}>
                      {alert.severity === "high" ? "⚠️" : "🔔"}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{alert.vehicleName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-semibold ${isDark ? 'text-red-300' : 'text-red-600'}`}>
                      {alert.threshold.toLocaleString()} km
                    </span>
                    {alert.severity === "high" && (
                      <span className="rounded bg-red-500 px-1 py-0.5 text-[9px] font-bold text-white">
                        URGENT
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* License Expiry Alerts */}
      {licenseExpiryAlerts && licenseExpiryAlerts.length > 0 && (
        <div className={`rounded-lg border-l-4 p-2 shadow-sm ${
          isDark 
            ? 'border-l-amber-500 bg-gradient-to-r from-amber-900/30 via-yellow-900/20 to-orange-900/10' 
            : 'border-l-amber-400 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`rounded p-1 ${isDark ? 'bg-amber-500/40' : 'bg-amber-100'}`}>
              <span className="text-sm">📄</span>
            </div>
            <h2 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-amber-800'}`}>Disc Expiry</h2>
            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
              isDark ? 'text-amber-200 bg-amber-500/30' : 'text-amber-700 bg-amber-200'
            }`}>
              {licenseExpiryAlerts.length} {licenseExpiryAlerts.length === 1 ? 'alert' : 'alerts'}
            </span>
          </div>
          
          {/* Alert Cards Grid - Compact */}
          <div className={`grid gap-1.5 ${licenseExpiryAlerts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {licenseExpiryAlerts.map((alert, index) => (
              <div
                key={alert.id || `license-alert-${alert.vehicleId}-${index}`}
                className={`rounded border p-2 transition-all hover:scale-[1.01] ${
                  alert.expired || alert.severity === "high"
                    ? isDark ? "border-red-400/50 bg-red-900/40" : "border-red-300 bg-red-100"
                    : isDark ? "border-amber-400/50 bg-amber-900/40" : "border-amber-300 bg-amber-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className={`text-sm flex-shrink-0 ${
                      alert.expired || alert.severity === "high" ? "animate-pulse" : ""
                    }`}>
                      {alert.expired ? "🚫" : alert.severity === "high" ? "⏰" : "📅"}
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{alert.vehicleName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-semibold ${
                      alert.expired 
                        ? isDark ? 'text-red-300' : 'text-red-600'
                        : alert.severity === 'high' 
                        ? isDark ? 'text-orange-300' : 'text-orange-600'
                        : isDark ? 'text-yellow-300' : 'text-amber-600'
                    }`}>
                      {alert.expired 
                        ? `${Math.abs(alert.daysUntilExpiry)}d ago`
                        : `${alert.daysUntilExpiry}d left`
                      }
                    </span>
                    {alert.expired && (
                      <span className="rounded bg-red-500 px-1 py-0.5 text-[9px] font-bold text-white">
                        EXPIRED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unaccounted Mileage Alert */}
      {mileageGapStats && mileageGapStats.totalGaps > 0 && (
        <div 
          onClick={() => setShowGapsModal(true)}
          className={`rounded-lg border-l-4 p-2 cursor-pointer transition-all hover:scale-[1.01] shadow-sm ${
            isDark 
              ? 'border-l-yellow-500 bg-gradient-to-r from-yellow-900/30 via-amber-900/20 to-orange-900/10 hover:bg-yellow-900/40' 
              : 'border-l-yellow-400 bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 hover:bg-yellow-100'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className={`rounded p-1 ${isDark ? 'bg-yellow-500/40' : 'bg-yellow-200'}`}>
                <span className="text-sm">⚠️</span>
              </div>
              <div>
                <h2 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-yellow-800'}`}>Unaccounted Mileage</h2>
                <p className={`text-[10px] ${isDark ? 'text-yellow-200' : 'text-yellow-700'}`}>
                  {mileageGapStats.totalUnaccountedKm.toLocaleString()} km • {mileageGapStats.totalGaps} gaps
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {mileageGapStats.highSeverityCount > 0 && (
                <span className="rounded bg-red-500 px-1 py-0.5 text-[9px] font-bold text-white">
                  {mileageGapStats.highSeverityCount} High
                </span>
              )}
              <button className="rounded bg-yellow-500 px-2 py-0.5 text-[10px] font-bold text-slate-900 hover:bg-yellow-400">
                View →
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Mileage Gaps Modal */}
      <MileageGapsModal
        isOpen={showGapsModal}
        onClose={() => setShowGapsModal(false)}
        gaps={mileageGaps}
        vehicles={vehicles}
        user={user}
        onGapAcknowledged={loadGapStats}
      />
    </div>
  );
};

export default VehicleAlertsSection;
