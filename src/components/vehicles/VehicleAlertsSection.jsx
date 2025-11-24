import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAnalytics } from '../../hooks/useAnalytics';
import { getMileageGapStats, getCompanyMileageGapsFiltered } from '../../services/mileageGapDetectionService';
import MileageGapsModal from '../analytics/MileageGapsModal';
import toast from 'react-hot-toast';

const VehicleAlertsSection = ({ vehicles }) => {
  const { user, company } = useAuth();
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
    ? "grid grid-cols-1 lg:grid-cols-2 gap-3" 
    : "grid grid-cols-1 gap-3";

  if (!hasAlerts) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
        <span className="text-2xl">🚨</span>
        Vehicle Alerts
      </h2>

      {/* Alerts Grid - Dynamic Layout */}
      <div className={gridClass}>
        {/* Service Alerts */}
        {serviceAlerts && serviceAlerts.length > 0 && (
        <div className="rounded-2xl border border-red-500/50 bg-gradient-to-br from-red-600/25 via-rose-600/20 to-pink-600/15 p-3 shadow-2xl shadow-red-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative rounded-lg bg-red-500/40 p-1.5 shadow-lg shadow-red-500/50">
              <span className="text-base">🔧</span>
            </div>
            <h2 className="text-sm font-bold text-white">Service Due</h2>
            <span className="ml-auto text-xs text-red-200 bg-red-500/30 px-2 py-0.5 rounded-full">
              {serviceAlerts.length} {serviceAlerts.length === 1 ? 'alert' : 'alerts'}
            </span>
          </div>
          
          {/* Alert Cards Grid */}
          <div className={`grid gap-2 ${serviceAlerts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {serviceAlerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => handleAcknowledgeAlert(alert.vehicleId, alert.currentMileage)}
                className={`group cursor-pointer rounded-lg border p-3 transition-all hover:scale-[1.02] hover:shadow-lg ${
                  alert.severity === "high"
                    ? "border-red-400/50 bg-red-900/40 hover:border-red-400 hover:shadow-red-500/50"
                    : "border-orange-400/50 bg-orange-900/40 hover:border-orange-400 hover:shadow-orange-500/50"
                }`}
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`text-lg flex-shrink-0 ${alert.severity === "high" ? "animate-pulse" : ""}`}>
                      {alert.severity === "high" ? "⚠️" : "🔔"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{alert.vehicleName}</p>
                      <p className="text-xs text-red-200 truncate">{alert.registrationNumber}</p>
                    </div>
                  </div>
                  {alert.severity === "high" && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white flex-shrink-0">
                      URGENT
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-red-200">
                    Current: <span className="font-semibold text-white">{alert.currentMileage.toLocaleString()} km</span>
                  </p>
                  <p className="text-xs text-red-300 font-semibold">
                    Service due: {alert.threshold.toLocaleString()} km
                  </p>
                </div>
                <button className="mt-2 w-full rounded-lg border border-red-400/50 bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition">
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* License Expiry Alerts */}
      {licenseExpiryAlerts && licenseExpiryAlerts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-br from-amber-600/25 via-yellow-600/20 to-orange-600/15 p-3 shadow-2xl shadow-amber-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative rounded-lg bg-amber-500/40 p-1.5 shadow-lg shadow-amber-500/50">
              <span className="text-base">📄</span>
            </div>
            <h2 className="text-sm font-bold text-white">License Expiry</h2>
            <span className="ml-auto text-xs text-amber-200 bg-amber-500/30 px-2 py-0.5 rounded-full">
              {licenseExpiryAlerts.length} {licenseExpiryAlerts.length === 1 ? 'alert' : 'alerts'}
            </span>
          </div>
          
          {/* Alert Cards Grid */}
          <div className={`grid gap-2 ${licenseExpiryAlerts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {licenseExpiryAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-3 transition-all hover:scale-[1.02] hover:shadow-lg ${
                  alert.expired || alert.severity === "high"
                    ? "border-red-400/50 bg-red-900/40 hover:border-red-400 hover:shadow-red-500/50"
                    : "border-amber-400/50 bg-amber-900/40 hover:border-amber-400 hover:shadow-amber-500/50"
                }`}
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`text-lg flex-shrink-0 ${
                      alert.expired || alert.severity === "high" ? "animate-pulse" : ""
                    }`}>
                      {alert.expired ? "🚫" : alert.severity === "high" ? "⏰" : "📅"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{alert.vehicleName}</p>
                      <p className="text-xs text-yellow-200 truncate">{alert.registrationNumber}</p>
                    </div>
                  </div>
                  {alert.expired && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white flex-shrink-0">
                      EXPIRED
                    </span>
                  )}
                  {!alert.expired && alert.severity === "high" && (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white flex-shrink-0">
                      URGENT
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-yellow-200">
                    Expiry: <span className="font-semibold text-white">{new Date(alert.licenseExpiryDate).toLocaleDateString()}</span>
                  </p>
                  <p className={`text-xs font-semibold ${
                    alert.expired ? 'text-red-300' : alert.severity === 'high' ? 'text-orange-300' : 'text-yellow-300'
                  }`}>
                    {alert.expired 
                      ? `Expired ${Math.abs(alert.daysUntilExpiry)} days ago`
                      : `Expires in ${alert.daysUntilExpiry} days`
                    }
                  </p>
                </div>
                <button className="mt-2 w-full rounded-lg border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition">
                  Renew License
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unaccounted Mileage Alert */}
      {mileageGapStats && mileageGapStats.totalGaps > 0 && (
        <div 
          onClick={() => setShowGapsModal(true)}
          className="space-y-2 rounded-2xl border border-yellow-500/50 bg-gradient-to-br from-yellow-600/25 via-amber-600/20 to-orange-600/15 p-2 shadow-2xl shadow-yellow-500/20 backdrop-blur-sm cursor-pointer transition-all hover:border-yellow-400 hover:shadow-yellow-500/30 hover:scale-[1.01]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="relative rounded-lg bg-yellow-500/40 p-1 shadow-lg shadow-yellow-500/50">
                <span className="animate-bounce text-base">⚠️</span>
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-yellow-500"></span>
                </span>
              </div>
              <h2 className="text-sm font-bold text-white">🔍 Unaccounted Mileage Detected</h2>
            </div>
            <button className="rounded-lg bg-yellow-500 px-3 py-1 text-xs font-bold text-slate-900 transition-colors hover:bg-yellow-400">
              View Details →
            </button>
          </div>
          <div className="rounded-xl border border-yellow-400/30 bg-gradient-to-r from-slate-900/80 to-slate-800/80 px-2.5 py-2 shadow-lg backdrop-blur-sm">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">
                    {mileageGapStats.totalUnaccountedKm.toLocaleString()} km Unaccounted
                  </p>
                  <p className="text-[11px] text-yellow-200">
                    {mileageGapStats.totalGaps} {mileageGapStats.totalGaps === 1 ? 'gap' : 'gaps'} detected across {mileageGapStats.affectedVehicles} {mileageGapStats.affectedVehicles === 1 ? 'vehicle' : 'vehicles'}
                  </p>
                </div>
                <div className="flex gap-1">
                  {mileageGapStats.highSeverityCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                      {mileageGapStats.highSeverityCount} High
                    </span>
                  )}
                  {mileageGapStats.mediumSeverityCount > 0 && (
                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                      {mileageGapStats.mediumSeverityCount} Med
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-300">
                💡 Click to review detailed gap analysis.
              </p>
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
