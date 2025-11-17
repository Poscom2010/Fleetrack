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
      <div className="rounded-2xl border border-white/10 bg-surface-200/80 px-4 py-3 text-sm text-slate-100 shadow-soft">
        <p className="font-semibold text-white">{data.name}</p>
        <p className="text-xs text-slate-300">
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
      <div className="rounded-2xl border border-white/10 bg-surface-200/80 px-4 py-3 text-sm text-slate-100 shadow-soft">
        <p className="font-semibold text-white">{label}</p>
        <p className="text-xs text-slate-300">
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
      <div className="rounded-2xl border border-rose-400/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-rose-500/20 p-1.5">
            <span className="text-base">💸</span>
          </div>
          <h3 className="text-base font-bold text-white">
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
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-xs backdrop-blur-sm transition hover:bg-slate-800/60"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full shadow-lg"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-slate-200">{entry.name}</span>
                  </div>
                  <span className="font-bold text-white">
                    {formatCurrency(entry.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 py-12 text-center text-xs text-slate-400">
            No expense data available
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 shadow-xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-lg bg-amber-500/20 p-1.5">
            <span className="text-base">📉</span>
          </div>
          <h3 className="text-base font-bold text-white">
            Expense Trends Over Time
          </h3>
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
                <YAxis
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  stroke="#475569"
                  axisLine={{ stroke: "#475569" }}
                  tickLine={{ stroke: "#475569" }}
                />
                <Tooltip content={<ExpenseTrendTooltip />} cursor={{ stroke: "#475569", strokeWidth: 1 }} />
                <Legend
                  wrapperStyle={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "600" }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  name="Expenses"
                  dot={{ r: 5, fill: "#f59e0b", strokeWidth: 2, stroke: "#78350f" }}
                  activeDot={{ r: 7, fill: "#f59e0b", stroke: "#fff", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 py-12 text-center text-xs text-slate-400">
            No expense trend data available
          </div>
        )}
      </div>
    </>
  );
};

export default ExpenseChart;
