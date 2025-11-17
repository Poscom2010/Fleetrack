import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, eachYearOfInterval } from "date-fns";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-surface-200/95 px-4 py-3 text-sm text-slate-100 shadow-soft backdrop-blur-xl">
        <p className="mb-2 font-semibold text-white">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} style={{ color: entry.color }} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
            {entry.name}: <span className="font-semibold">${entry.value?.toFixed(2) || 0}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * RevenuePerVehicleChart component to display revenue per vehicle over time
 * @param {Object} props
 * @param {Array} props.entries - Array of daily entries with vehicleId, date, cashIn
 * @param {Array} props.vehicles - Array of vehicles with id and name
 * @param {string} props.period - Time period: 'day', 'week', 'month', 'year'
 */
const RevenuePerVehicleChart = ({ entries = [], vehicles = [], period = "day" }) => {
  const chartData = useMemo(() => {
    if (!entries.length || !vehicles.length) return [];

    // Determine date range based on entries
    const dates = entries.map((e) => new Date(e.date)).sort((a, b) => a - b);
    if (dates.length === 0) return [];

    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    // Generate time periods based on selected period
    let timePeriods = [];
    let dateFormatter;

    switch (period) {
      case "day":
        timePeriods = eachDayOfInterval({ start: startDate, end: endDate });
        dateFormatter = (date) => format(date, "MMM dd");
        break;
      case "week":
        timePeriods = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
        dateFormatter = (date) => `Week ${format(date, "MMM dd")}`;
        break;
      case "month":
        timePeriods = eachMonthOfInterval({ start: startDate, end: endDate });
        dateFormatter = (date) => format(date, "MMM yyyy");
        break;
      case "year":
        timePeriods = eachYearOfInterval({ start: startDate, end: endDate });
        dateFormatter = (date) => format(date, "yyyy");
        break;
      default:
        timePeriods = eachDayOfInterval({ start: startDate, end: endDate });
        dateFormatter = (date) => format(date, "MMM dd");
    }

    // Group entries by time period and vehicle
    const groupedData = timePeriods.map((periodStart) => {
      const periodEnd = new Date(periodStart);
      
      // Set end of period based on type
      switch (period) {
        case "day":
          periodEnd.setHours(23, 59, 59, 999);
          break;
        case "week":
          periodEnd.setDate(periodEnd.getDate() + 6);
          periodEnd.setHours(23, 59, 59, 999);
          break;
        case "month":
          periodEnd.setMonth(periodEnd.getMonth() + 1);
          periodEnd.setDate(0);
          periodEnd.setHours(23, 59, 59, 999);
          break;
        case "year":
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          periodEnd.setMonth(0);
          periodEnd.setDate(0);
          periodEnd.setHours(23, 59, 59, 999);
          break;
      }

      const dataPoint = {
        period: dateFormatter(periodStart),
        periodStart: periodStart.getTime(),
      };

      // Calculate revenue for each vehicle in this period
      vehicles.forEach((vehicle) => {
        const vehicleEntries = entries.filter((entry) => {
          const entryDate = new Date(entry.date);
          return (
            entry.vehicleId === vehicle.id &&
            entryDate >= periodStart &&
            entryDate <= periodEnd
          );
        });

        const revenue = vehicleEntries.reduce((sum, entry) => sum + (entry.cashIn || 0), 0);
        dataPoint[vehicle.name] = revenue;
      });

      return dataPoint;
    });

    return groupedData;
  }, [entries, vehicles, period]);

  // Generate colors for each vehicle
  const vehicleColors = useMemo(() => {
    const colors = [
      "#0ea5e9", // accent-500
      "#6366f1", // brand-500
      "#a855f7", // purple
      "#10b981", // emerald
      "#f59e0b", // amber
      "#ef4444", // rose
      "#06b6d4", // cyan
      "#8b5cf6", // violet
    ];
    return vehicles.reduce((acc, vehicle, index) => {
      acc[vehicle.name] = colors[index % colors.length];
      return acc;
    }, {});
  }, [vehicles]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center rounded-3xl border border-white/10 bg-surface-200/60 p-8 text-center">
        <p className="text-slate-400">No revenue data available for the selected period</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-surface-200/60 p-6 shadow-soft">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white">Revenue per Vehicle</h3>
        <p className="mt-1 text-sm text-slate-400">Total revenue generated by each vehicle over time</p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="period"
            stroke="#94a3b8"
            style={{ fontSize: "12px" }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            stroke="#94a3b8"
            style={{ fontSize: "12px" }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="line"
            formatter={(value) => <span style={{ color: "#cbd5e1" }}>{value}</span>}
          />
          {vehicles.map((vehicle) => (
            <Line
              key={vehicle.id}
              type="monotone"
              dataKey={vehicle.name}
              stroke={vehicleColors[vehicle.name]}
              strokeWidth={2}
              dot={{ r: 4, fill: vehicleColors[vehicle.name] }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenuePerVehicleChart;

