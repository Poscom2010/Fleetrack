import VehicleCard from "./VehicleCard";

/**
 * VehicleList component to display all vehicles in a grid with modern styling.
 */
const VehicleList = ({
  vehicles,
  allVehicles = [],
  serviceAlerts = [],
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  loading = false,
  activeTab = "all",
}) => {
  const alertLookup = serviceAlerts.reduce((acc, alert) => {
    acc[alert.vehicleId] = alert;
    return acc;
  }, {});

  const hasVehicles = vehicles.length > 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-3xl border border-white/10 bg-white/5 p-6 shadow-soft"
          >
            <div className="h-5 w-2/3 rounded-full bg-white/10" />
            <div className="mt-4 h-4 w-1/2 rounded-full bg-white/10" />
            <div className="mt-2 h-4 w-1/3 rounded-full bg-white/10" />
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="h-12 rounded-2xl bg-white/10" />
              <div className="h-12 rounded-2xl bg-white/10" />
              <div className="h-12 rounded-2xl bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-soft md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Garage Summary</h2>
          <p className="text-sm text-slate-300">
            {activeTab === "alerts"
              ? "Vehicles requiring maintenance attention."
              : "Maintain accurate records and service thresholds for every car."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-slate-200">
          <span className="rounded-2xl bg-white/10 px-3 py-1">
            Total vehicles: {allVehicles.length}
          </span>
          <span className="rounded-2xl bg-white/10 px-3 py-1">
            Active alerts: {serviceAlerts.length}
          </span>
          <button
            onClick={onAddVehicle}
            className="rounded-2xl bg-brand-gradient px-4 py-2 text-xs font-semibold text-white shadow-brand transition hover:shadow-brand/70"
          >
            Add vehicle
          </button>
        </div>
      </div>

      {!hasVehicles ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-white/20 bg-white/5 p-12 text-center text-slate-300 shadow-soft">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-2xl">
            🚕
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">
              No vehicles registered yet
            </h3>
            <p className="text-sm text-slate-300">
              Add your first vehicle to start tracking performance and service
              mileage.
            </p>
          </div>
          <button
            onClick={onAddVehicle}
            className="rounded-2xl bg-brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-brand transition hover:shadow-brand/70"
          >
            Add your first vehicle
          </button>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-sm text-slate-300 shadow-soft">
          No vehicles match this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              serviceAlert={alertLookup[vehicle.id]}
              onEdit={onEditVehicle}
              onDelete={onDeleteVehicle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VehicleList;
