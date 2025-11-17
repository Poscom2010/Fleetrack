import React from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatNumber } from "../../utils/calculations";

const MileageTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface-200/80 px-4 py-3 text-sm text-slate-100 shadow-soft">
        <p className="font-semibold text-white">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {formatNumber(entry.value)} km
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CumulativeTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface-200/80 px-4 py-3 text-sm text-slate-100 shadow-soft">
        <p className="font-semibold text-white">{label}</p>
        <p>Total mileage: {formatNumber(payload[0].value)} km</p>
      </div>
    );
  }
  return null;
};

const colors = [
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#f87171",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

/**
 * MileageChart component to display mileage trends
 * @param {Object} props
 * @param {Object} props.mileageByVehicle - Mileage data by vehicle {vehicleId: [{date, mileage}]}
 * @param {Array} props.cumulativeMileage - Cumulative mileage data [{date, totalMileage}]
 * @param {Object} props.vehicleMetrics - Vehicle metrics to get vehicle names
 */
const MileageChart = ({
  mileageByVehicle = {},
  cumulativeMileage = [],
  vehicleMetrics = {},
}) => {
  // Prepare data for line chart (mileage per vehicle over time)
  // Combine all dates and create a unified dataset
  const allDates = new Set();
  Object.values(mileageByVehicle).forEach((vehicleData) => {
    vehicleData.forEach((item) => allDates.add(item.date));
  });

  const sortedDates = Array.from(allDates).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  const mileageTrendData = sortedDates.map((date) => {
    const dataPoint = {
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    };

    Object.entries(mileageByVehicle).forEach(([vehicleId, vehicleData], index) => {
      const dayData = vehicleData.find((item) => item.date === date);
      const vehicleName =
        vehicleMetrics[vehicleId]?.vehicle?.name || `Vehicle ${vehicleId.slice(0, 6)}`;
      dataPoint[vehicleName] = dayData ? dayData.mileage : 0;
      dataPoint[`${vehicleName}Color`] = colors[index % colors.length];
    });

    return dataPoint;
  });

  // Prepare data for stacked area chart (cumulative mileage)
  const cumulativeData = cumulativeMileage.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    totalMileage: item.totalMileage,
  }));

  // Generate colors for different vehicles
  const vehicleNames = Object.entries(mileageByVehicle).map(
    ([vehicleId], index) => ({
      name:
        vehicleMetrics[vehicleId]?.vehicle?.name ||
        `Vehicle ${vehicleId.slice(0, 6)}`,
      color: colors[index % colors.length],
    })
  );

  return (
    <>
      {/* Mileage Trends Line Chart */}
      <div className="rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-indigo-500/20 p-1.5">
            <span className="text-base">📍</span>
          </div>
          <h3 className="text-base font-bold text-white">Mileage Trends per Vehicle</h3>
        </div>
        {mileageTrendData.length > 0 && vehicleNames.length > 0 ? (
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mileageTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  stroke="#475569"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} stroke="#475569" />
                <Tooltip content={<MileageTooltip />} cursor={{ stroke: "#475569", strokeWidth: 1 }} />
                <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "600" }} />
                {vehicleNames.map((vehicle) => (
                  <Line
                    key={vehicle.name}
                    type="monotone"
                    dataKey={vehicle.name}
                    stroke={vehicle.color}
                    strokeWidth={3}
                    dot={{ r: 4, fill: vehicle.color, strokeWidth: 2, stroke: "#0f172a" }}
                    activeDot={{ r: 6, fill: vehicle.color, stroke: "#fff", strokeWidth: 2 }}
                    name={vehicle.name}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 py-12 text-center text-xs text-slate-400">
            No mileage data available
          </div>
        )}
      </div>

      {/* Cumulative Mileage Stacked Area Chart */}
      <div className="rounded-2xl border border-purple-400/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-purple-500/20 p-1.5">
            <span className="text-base">📊</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Cumulative Mileage Across Fleet
          </h3>
        </div>
        {cumulativeData.length > 0 ? (
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  stroke="#475569"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} stroke="#475569" />
                <Tooltip content={<CumulativeTooltip />} cursor={{ stroke: "#475569", strokeWidth: 1 }} />
                <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "600" }} />
                <Area
                  type="monotone"
                  dataKey="totalMileage"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fill="#6d28d9"
                  fillOpacity={0.3}
                  name="Total Mileage"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 py-12 text-center text-xs text-slate-400">
            No cumulative mileage data available
          </div>
        )}
      </div>
    </>
  );
};

export default MileageChart;
