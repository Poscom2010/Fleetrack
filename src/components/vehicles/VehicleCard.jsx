const VehicleCard = ({ vehicle, onEdit, onDelete, serviceAlert }) => {
  const threshold = vehicle.serviceAlertThreshold || 5000;
  const severity = serviceAlert?.severity;
  const alertHighlight =
    severity === "high"
      ? "from-rose-500/70 to-rose-600/70 text-white"
      : "from-amber-400/80 to-amber-500/80 text-black";

  return (
    <div className="relative flex h-full flex-col gap-6 rounded-3xl border border-white/10 bg-surface-200/70 p-6 text-slate-200 shadow-soft transition hover:border-white/20 hover:shadow-brand/30">
      {serviceAlert && (
        <div className="rounded-2xl bg-gradient-to-r px-4 py-2 text-xs font-semibold shadow-brand">
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {severity === "high" ? "🚨" : "⚠️"}
            </span>
            <span className={alertHighlight}>
              Service due – {serviceAlert.mileageSinceService.toFixed(0)} km
              since last maintenance
            </span>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-white">{vehicle.name}</h3>
          <p className="text-sm text-slate-300">{vehicle.registrationNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(vehicle)}
            className="rounded-full bg-white/10 p-2 text-slate-200 transition hover:bg-white/20 hover:text-white"
            title="Edit vehicle"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={() => onDelete(vehicle)}
            className="rounded-full bg-white/10 p-2 text-rose-200 transition hover:bg-rose-500/20 hover:text-rose-100"
            title="Delete vehicle"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-slate-300">
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="font-medium text-slate-200">Model</p>
          <p className="mt-1 text-sm text-white">{vehicle.model}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="font-medium text-slate-200">Year</p>
          <p className="mt-1 text-sm text-white">{vehicle.year}</p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="font-medium text-slate-200">Service Threshold</p>
          <p className="mt-1 text-sm text-white">
            {threshold.toLocaleString()} km
          </p>
        </div>
        <div className="rounded-2xl bg-white/5 p-3">
          <p className="font-medium text-slate-200">Last Service Mileage</p>
          <p className="mt-1 text-sm text-white">
            {(vehicle.lastServiceMileage || 0).toLocaleString()} km
          </p>
        </div>
      </div>

      {serviceAlert ? (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-100">
          <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-900">
            Mileage since service: {serviceAlert.mileageSinceService.toFixed(0)}{" "}
            km
          </span>
          <span className="rounded-full bg-amber-400/20 px-3 py-1 text-amber-900">
            Severity: {serviceAlert.severity.toUpperCase()}
          </span>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          Service schedule is on track. Configure alert thresholds to stay ahead
          of maintenance.
        </div>
      )}
    </div>
  );
};

export default VehicleCard;
