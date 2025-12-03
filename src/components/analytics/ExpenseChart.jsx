import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../utils/calculations";
import { useTheme } from "../../contexts/ThemeContext";

/**
 * ExpenseChart component to display expense distribution and trends
 * @param {Object} props
 * @param {Object} props.expensesByCategory - Expenses grouped by category {category: amount}
 * @param {Array} props.expenseTrend - Expense trends over time [{date, total}]
 */
const COLORS = [
  "#38bdf8",
  "#34d399",
  "#f59e0b",
  "#f87171",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const ExpensePieTooltip = ({ active, payload, total }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const percentage = total ? ((data.value / total) * 100).toFixed(1) : 0;

    return (
      <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs shadow-md">
        <p className="font-semibold text-gray-800">{data.name}</p>
        <p className="text-gray-600">
          {formatCurrency(data.value)} ({percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

const ExpenseTrendTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs shadow-md">
        <p className="font-semibold text-gray-800 mb-1">{label}</p>
        <p className="text-gray-600">
          Expenses: {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="#0f172a"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const ExpenseChart = ({ expensesByCategory = {}, expenseTrend = [] }) => {
  const { isDark } = useTheme();
  const categoryData = Object.entries(expensesByCategory).map(
    ([category, amount]) => ({
      name: category,
      value: amount,
    })
  );

  const totalCategorySpend = categoryData.reduce(
    (sum, item) => sum + item.value,
    0
  );

  const trendData = expenseTrend.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    expenses: item.total,
  }));

  return (
    <>
      <div className={`rounded-lg border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <div className="mb-3 flex items-center gap-2">
          <div className={`rounded-lg p-1.5 ${isDark ? 'bg-rose-500/20' : 'bg-rose-100'}`}>
            <span className="text-base">💸</span>
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
            Expense Distribution by Category
          </h3>
        </div>
        {categoryData.length > 0 ? (
          <div className="mt-3 flex flex-col items-center gap-4 lg:flex-row">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={110}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={
                    <ExpensePieTooltip total={totalCategorySpend} />
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex w-full max-w-xs flex-col gap-2">
              {categoryData.map((entry, index) => (
                <div
                  key={entry.name}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition ${isDark ? 'border-white/10 bg-slate-900/60 hover:bg-slate-800/60' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shadow-lg"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{entry.name}</span>
                  </div>
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={`mt-3 rounded-2xl border border-dashed py-12 text-center text-xs ${isDark ? 'border-slate-700 bg-slate-900/50 text-slate-400' : 'border-gray-300 bg-gray-50 text-gray-500'}`}>
            No expense data available
          </div>
        )}
      </div>

      <div className={`rounded-2xl border p-4 shadow-xl ${isDark ? 'border-amber-400/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900' : 'border-amber-200 bg-white'}`}>
        <div className="mb-3 flex items-center gap-2">
          <div className={`rounded-lg p-1.5 ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
            <span className="text-base">📉</span>
          </div>
          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
            Cumulative Expenses Over Time
          </h3>
        </div>
        {trendData.length > 0 ? (
          <>
            {trendData.length === 1 && (
              <div className={`mb-2 rounded-lg border p-2 text-xs ${isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                💡 <span className="font-semibold">Tip:</span> Add expenses on different dates to see the trend grow over time!
              </div>
            )}
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
                <YAxis
                  tick={{ fontSize: 12, fill: isDark ? "#94a3b8" : "#64748b" }}
                  stroke={isDark ? "#475569" : "#cbd5e1"}
                  axisLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
                  tickLine={{ stroke: isDark ? "#475569" : "#cbd5e1" }}
                />
                <Tooltip content={<ExpenseTrendTooltip />} cursor={{ stroke: isDark ? "#475569" : "#94a3b8", strokeWidth: 1 }} />
                <Legend
                  wrapperStyle={{ color: isDark ? "#cbd5e1" : "#334155", fontSize: "13px", fontWeight: "600" }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  name="Expenses"
                  dot={{ r: 5, fill: "#f59e0b", strokeWidth: 2, stroke: isDark ? "#78350f" : "#ffffff" }}
                  activeDot={{ r: 7, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </>
        ) : (
          <div className={`mt-3 rounded-2xl border border-dashed py-12 text-center text-xs ${isDark ? 'border-slate-700 bg-slate-900/50 text-slate-400' : 'border-gray-300 bg-gray-50 text-gray-500'}`}>
            No expense trend data available
          </div>
        )}
      </div>
    </>
  );
};

export default ExpenseChart;
