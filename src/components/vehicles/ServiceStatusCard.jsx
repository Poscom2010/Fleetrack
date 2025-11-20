import { calculateServiceStatus } from "../../services/serviceTrackingService";

/**
 * ServiceStatusCard component - Displays service status with visual indicators
 * @param {Object} props
 * @param {Object} props.vehicle - Vehicle object
 * @param {Function} props.onRecordService - Callback when user wants to record service
 */
const ServiceStatusCard = ({ vehicle, onRecordService }) => {
  const currentMileage = vehicle?.currentMileage || 0;
  const lastServiceMileage = vehicle?.lastServiceMileage || 0;
  const serviceInterval = vehicle?.serviceInterval || 5000;

  const status = calculateServiceStatus(currentMileage, lastServiceMileage, serviceInterval);

  // Color schemes based on status
  const colorSchemes = {
    ok: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      icon: '✅',
      progressBg: 'bg-green-500/20',
      progressBar: 'bg-green-500'
    },
    approaching: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      icon: '⚠️',
      progressBg: 'bg-yellow-500/20',
      progressBar: 'bg-yellow-500'
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      icon: '⚠️',
      progressBg: 'bg-amber-500/20',
      progressBar: 'bg-amber-500'
    },
    critical: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      icon: '🚨',
      progressBg: 'bg-red-500/20',
      progressBar: 'bg-red-500'
    }
  };

  const colors = colorSchemes[status.status] || colorSchemes.ok;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{colors.icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Service Status
            </p>
            <p className={`text-sm font-bold ${colors.text}`}>
              {status.message}
            </p>
          </div>
        </div>
        {status.isDue && onRecordService && (
          <button
            onClick={() => onRecordService(vehicle)}
            className="rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-green-700 hover:to-emerald-700"
          >
            Record Service
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className={`h-2 rounded-full overflow-hidden ${colors.progressBg}`}>
          <div
            className={`h-full ${colors.progressBar} transition-all duration-500`}
            style={{ width: `${Math.min(100, status.percentageUsed)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">
            Current: {currentMileage.toLocaleString()} km
          </span>
          <span className="text-xs text-slate-400">
            {status.percentageUsed}%
          </span>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-800/50 rounded-lg p-2">
          <p className="text-slate-400 mb-1">Service Counter</p>
          <p className="text-white font-semibold">
            {status.mileageSinceService.toLocaleString()} km
          </p>
          <p className="text-xs text-slate-500 mt-0.5">since last service</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <p className="text-slate-400 mb-1">Service Interval</p>
          <p className="text-white font-semibold">
            Every {serviceInterval.toLocaleString()} km
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <p className="text-slate-400 mb-1">
            {status.isOverdue ? 'Overdue By' : 'Remaining'}
          </p>
          <p className={`font-semibold ${status.isOverdue ? 'text-red-400' : 'text-white'}`}>
            {Math.abs(status.mileageUntilService).toLocaleString()} km
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <p className="text-slate-400 mb-1">Cumulative</p>
          <p className="text-white font-semibold">
            {currentMileage.toLocaleString()} km
          </p>
          <p className="text-xs text-slate-500 mt-0.5">total mileage</p>
        </div>
      </div>

      {/* Alert Messages */}
      {status.isCritical && (
        <div className="mt-3 bg-red-500/20 border border-red-500/40 rounded-lg p-2">
          <p className="text-xs text-red-300 font-medium">
            🚨 URGENT: Service required immediately to prevent damage
          </p>
        </div>
      )}

      {status.isDue && !status.isCritical && (
        <div className="mt-3 bg-amber-500/20 border border-amber-500/40 rounded-lg p-2">
          <p className="text-xs text-amber-300 font-medium">
            ⚠️ Service due soon - Please schedule an appointment
          </p>
        </div>
      )}
    </div>
  );
};

export default ServiceStatusCard;
