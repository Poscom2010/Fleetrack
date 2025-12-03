import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
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
      <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs shadow-md">
        <p className="font-semibold text-gray-800 mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} className="text-gray-600">
            <span style={{ color: entry.color }}>●</span> {entry.name}: {formatCurrency(entry.value)}
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
      <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs shadow-md">
        <p className="font-semibold text-gray-800 mb-1">{label}</p>
        <p className="text-gray-600">Profit: {formatCurrency(payload[0].value)}</p>
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
  const { isDark } = useTheme();
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

  // Custom bar color based on performance - professional muted colors
  const barColors = vehicleData.map((entry) => {
    if (entry.isTop) return "#10b981"; // Emerald for top
    if (entry.isLow) return "#f59e0b"; // Amber for needs attention
    return "#6b7280"; // Gray for others
  });

  return (
    <>
      {/* Profit Trend Line Chart */}
      <div className={`rounded-lg border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <div className="mb-3 flex items-center gap-2">
          <div className={`rounded-lg p-1.5 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
            <span className="text-base">📈</span>
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-baltic-900'}`}>Cumulative Profit Over Time</h3>
        </div>
        {trendData.length > 0 ? (
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} opacity={0.3} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#64748b" }}
                  stroke={isDark ? "#475569" : "#cbd5e1"}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                />
                <YAxis tick={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#64748b" }} stroke={isDark ? "#475569" : "#cbd5e1"} />
                <Tooltip content={<ProfitTrendTooltip />} cursor={{ stroke: isDark ? "#475569" : "#cbd5e1", strokeWidth: 1 }} />
                <Legend wrapperStyle={{ color: isDark ? "#cbd5e1" : "#475569", fontSize: "13px", fontWeight: "600" }} />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Profit"
                  dot={{ r: 3, fill: "#10b981" }}
                  activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="cashIn"
                  stroke="#6b7280"
                  strokeWidth={2}
                  name="Cash In"
                  dot={{ r: 3, fill: "#6b7280" }}
                  activeDot={{ r: 5, fill: "#6b7280", stroke: "#fff", strokeWidth: 1 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  name="Expenses"
                  dot={{ r: 3, fill: "#f59e0b" }}
                  activeDot={{ r: 5, fill: "#f59e0b", stroke: "#fff", strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className={`mt-3 rounded-2xl border border-dashed py-12 text-center text-xs ${isDark ? 'border-slate-700 bg-slate-900/50 text-slate-400' : 'border-baltic-200 bg-baltic-50 text-baltic-600'}`}>
            No profit data available
          </div>
        )}
      </div>

      {/* Profit Comparison Bar Chart */}
      <div className={`rounded-lg border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <div className="mb-3 flex items-center gap-2">
          <div className={`rounded-lg p-1.5 ${isDark ? 'bg-sky-500/20' : 'bg-sky-100'}`}>
            <span className="text-base">🏆</span>
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
            Profit Comparison by Vehicle
          </h3>
        </div>
        {vehicleData.length > 0 ? (
          <>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} opacity={0.3} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#64748b" }}
                    stroke={isDark ? "#475569" : "#cbd5e1"}
                    angle={-35}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#64748b" }} stroke={isDark ? "#475569" : "#cbd5e1"} />
                  <Tooltip content={<ProfitVehicleTooltip />} cursor={{ fill: isDark ? "#1e293b" : "#e2e8f0", opacity: 0.3 }} />
                  <Legend wrapperStyle={{ color: isDark ? "#cbd5e1" : "#475569", fontSize: "13px", fontWeight: "600" }} />
                  <Bar dataKey="profit" name="Profit" radius={[12, 12, 0, 0]}>
                    {barColors.map((color, index) => (
                      <Cell key={`cell-${vehicleData[index].vehicleId}`} fill={color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Indicators */}
            <div className={`mt-6 flex flex-wrap gap-4 text-sm ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              {topPerformer && vehicleMetrics[topPerformer] && (
                <div className={`flex items-center gap-3 rounded-3xl border px-4 py-3 ${isDark ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-emerald-200/80' : 'text-emerald-600'}`}>
                      Top Performer
                    </p>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
                      {vehicleMetrics[topPerformer].vehicle.name}
                    </p>
                    <p className="text-xs">
                      {formatCurrency(vehicleMetrics[topPerformer].profit)} profit
                    </p>
                  </div>
                </div>
              )}
              {lowPerformer && vehicleMetrics[lowPerformer] && (
                <div className={`flex items-center gap-3 rounded-3xl border px-4 py-3 ${isDark ? 'border-rose-400/30 bg-rose-400/10 text-rose-100' : 'border-rose-300 bg-rose-50 text-rose-800'}`}>
                  <span className="text-2xl">📉</span>
                  <div>
                    <p className={`text-xs uppercase tracking-wide ${isDark ? 'text-rose-200/80' : 'text-rose-600'}`}>
                      Needs Attention
                    </p>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
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
          <div className={`mt-3 rounded-2xl border border-dashed py-12 text-center text-xs ${isDark ? 'border-slate-700 bg-slate-900/50 text-slate-400' : 'border-baltic-200 bg-baltic-50 text-baltic-600'}`}>
            No vehicle data available
          </div>
        )}
      </div>
    </>
  );
};

export default ProfitChart;
