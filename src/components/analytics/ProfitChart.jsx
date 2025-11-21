import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatCurrency } from "../../utils/calculations";

const ProfitTrendTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface-200/80 px-4 py-3 text-sm text-slate-100 shadow-soft">
        <p className="font-semibold text-white">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const ProfitVehicleTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface-200/80 px-4 py-3 text-sm text-slate-100 shadow-soft">
        <p className="font-semibold text-white">{label}</p>
        <p>{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

/**
 * ProfitChart component to display profit trends and comparisons
 * @param {Object} props
 * @param {Array} props.profitTrend - Array of {date, profit, cashIn, expenses}
 * @param {Object} props.vehicleMetrics - Vehicle metrics by vehicleId
 * @param {string} props.topPerformer - VehicleId of top performer
 * @param {string} props.lowPerformer - VehicleId of low performer
 */
const ProfitChart = ({
  profitTrend = [],
  vehicleMetrics = {},
  topPerformer,
  lowPerformer,
}) => {
  // Prepare data for line chart (profit trends over time)
  const trendData = profitTrend.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    profit: item.profit,
    cashIn: item.cashIn,
    expenses: item.expenses,
  }));

  // Prepare data for bar chart (profit per vehicle)
  const vehicleData = Object.entries(vehicleMetrics)
    .map(([vehicleId, data]) => ({
      vehicleId,
      name: data.vehicle.name,
      profit: data.profit,
      isTop: vehicleId === topPerformer,
      isLow: vehicleId === lowPerformer,
    }))
    .sort((a, b) => b.profit - a.profit);

  // Custom bar color based on performance
  const barColors = vehicleData.map((entry) => {
    if (entry.isTop) return "#34d399";
    if (entry.isLow) return "#f87171";
    return "#6366f1";
  });

  return (
    <>
      {/* Profit Trend Line Chart */}
      <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-emerald-500/20 p-1.5">
            <span className="text-base">📈</span>
          </div>
          <h3 className="text-base font-bold text-white">Cumulative Profit Over Time</h3>
        </div>
        {trendData.length > 0 ? (
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
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
                <Tooltip content={<ProfitTrendTooltip />} cursor={{ stroke: "#475569", strokeWidth: 1 }} />
                <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "600" }} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Profit"
                  dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#064e3b" }}
                  activeDot={{ r: 7, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="cashIn"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Cash In"
                  dot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "#1e3a8a" }}
                  activeDot={{ r: 7, fill: "#3b82f6", stroke: "#fff", strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={3}
                  name="Expenses"
                  dot={{ r: 5, fill: "#ef4444", strokeWidth: 2, stroke: "#7f1d1d" }}
                  activeDot={{ r: 7, fill: "#ef4444", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 py-12 text-center text-xs text-slate-400">
            No profit data available
          </div>
        )}
      </div>

      {/* Profit Comparison Bar Chart */}
      <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-sky-500/20 p-1.5">
            <span className="text-base">🏆</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Profit Comparison by Vehicle
          </h3>
        </div>
        {vehicleData.length > 0 ? (
          <>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    stroke="#475569"
                    angle={-35}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} stroke="#475569" />
                  <Tooltip content={<ProfitVehicleTooltip />} cursor={{ fill: "#1e293b", opacity: 0.3 }} />
                  <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "600" }} />
                  <Bar dataKey="profit" name="Profit" radius={[12, 12, 0, 0]}>
                    {barColors.map((color, index) => (
                      <Cell key={`cell-${vehicleData[index].vehicleId}`} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Indicators */}
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-200">
              {topPerformer && vehicleMetrics[topPerformer] && (
                <div className="flex items-center gap-3 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-emerald-100">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-emerald-200/80">
                      Top Performer
                    </p>
                    <p className="font-semibold text-white">
                      {vehicleMetrics[topPerformer].vehicle.name}
                    </p>
                    <p className="text-xs">
                      {formatCurrency(vehicleMetrics[topPerformer].profit)} profit
                    </p>
                  </div>
                </div>
              )}
              {lowPerformer && vehicleMetrics[lowPerformer] && (
                <div className="flex items-center gap-3 rounded-3xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-rose-100">
                  <span className="text-2xl">📉</span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-rose-200/80">
                      Needs Attention
                    </p>
                    <p className="font-semibold text-white">
                      {vehicleMetrics[lowPerformer].vehicle.name}
                    </p>
                    <p className="text-xs">
                      {formatCurrency(vehicleMetrics[lowPerformer].profit)} profit
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 py-12 text-center text-xs text-slate-400">
            No vehicle data available
          </div>
        )}
      </div>
    </>
  );
};

export default ProfitChart;
