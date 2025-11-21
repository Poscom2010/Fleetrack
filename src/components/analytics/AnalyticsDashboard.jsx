import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useAnalytics } from "../../hooks/useAnalytics";
import KPICard from "./KPICard";
import ProfitChart from "./ProfitChart";
import MileageChart from "./MileageChart";
import ExpenseChart from "./ExpenseChart";
import { formatCurrency, formatNumber } from "../../utils/calculations";
import toast from "react-hot-toast";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorMessage from "../common/ErrorMessage";
import Tabs from "../common/Tabs";

const timeRangeOptions = [
  { value: "today", label: "Today", icon: "📅" },
  { value: "yesterday", label: "Yesterday", icon: "📆" },
  { value: "thisWeek", label: "This Week", icon: "📊" },
  { value: "lastWeek", label: "Last Week", icon: "📉" },
  { value: "thisMonth", label: "This Month", icon: "📈" },
  { value: "lastMonth", label: "Last Month", icon: "📋" },
  { value: "last7Days", label: "Last 7 Days", icon: "🗓️" },
  { value: "last30Days", label: "Last 30 Days", icon: "📅" },
  { value: "thisYear", label: "This Year", icon: "🗓️" },
  { value: "all", label: "All Time", icon: "♾️" },
];

/**
 * AnalyticsDashboard component - Main analytics dashboard
 */
const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("all");
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const {
    analyticsData,
    mileageTrends,
    serviceAlerts,
    licenseExpiryAlerts,
    loading,
    error,
    acknowledgeAlert,
  } = useAnalytics(user?.uid, timeRange);

  const handleAcknowledgeAlert = async (vehicleId, currentMileage) => {
    const toastId = toast.loading("Acknowledging service alert...");
    try {
      await acknowledgeAlert(vehicleId, currentMileage);
      toast.success("Service alert acknowledged", { id: toastId });
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
      toast.error("Failed to acknowledge service alert. Please try again.", {
        id: toastId,
      });
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading analytics..." />;
  }

  if (error) {
    return (
      <ErrorMessage
        fullScreen
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!analyticsData) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-300">
        No analytics data available
      </div>
    );
  }

  const {
    summary,
    vehicleMetrics,
    topPerformer,
    lowPerformer,
    trends,
    expensesByCategory,
    vehicles,
    dailyEntries,
    expenses,
  } = analyticsData;

  // Helper function to get time range badge
  const getTimeRangeBadge = () => {
    const option = timeRangeOptions.find(opt => opt.value === timeRange);
    return option ? { text: option.label, icon: option.icon } : { text: 'All Time', icon: '♾️' };
  };

  const timeRangeBadge = getTimeRangeBadge();

  return (
    <div className="space-y-3">
      {/* Diagnostic Info Panel - Toggleable */}
      {showDiagnostic && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs relative">
          <button
            onClick={() => setShowDiagnostic(false)}
            className="absolute top-2 right-2 text-yellow-400 hover:text-yellow-200 transition"
            title="Hide diagnostic info"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="font-semibold text-yellow-400 mb-1">📊 Data Diagnostic Info (Filter: {timeRangeBadge.text}):</div>
          <div className="text-yellow-200 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5">
            <div>• Daily Entries: <span className="font-semibold">{dailyEntries?.length || 0}</span> trips</div>
            <div>• Expenses: <span className="font-semibold">{expenses?.length || 0}</span> records</div>
            <div>• Vehicles: <span className="font-semibold">{vehicles?.length || 0}</span></div>
            <div>• Mileage Points: <span className="font-semibold">{mileageTrends?.cumulativeMileage?.length || 0}</span> dates</div>
            <div>• Expense Trend: <span className="font-semibold">{trends?.expenses?.length || 0}</span> dates</div>
            <div>• Profit Trend: <span className="font-semibold">{trends?.profit?.length || 0}</span> dates</div>
          </div>
          {expenses && expenses.length > 0 && (
            <div className="mt-2 pt-2 border-t border-yellow-500/20 text-yellow-200">
              <div className="font-semibold text-yellow-300 mb-1">Expense Date Range:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>First: {expenses[expenses.length - 1]?.date?.toLocaleDateString() || 'N/A'}</div>
                <div>Last: {expenses[0]?.date?.toLocaleDateString() || 'N/A'}</div>
              </div>
              <div className="mt-1">
                Unique Dates: {new Set(expenses.map(e => e.date?.toISOString().split('T')[0])).size}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hero Header with Gradient */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-3 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-purple-500/10" />
        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-300 backdrop-blur-sm">
              <span className="text-sm">📊</span>
              Analytics Overview
            </div>
            <h1 className="text-2xl font-bold text-white">
              Fleet Performance Insights
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              Track cash flow, expenses, and profitability trends across your fleet.
            </p>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-2">
            <div className="rounded-xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Avg Daily Cash-In
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {formatCurrency(summary.avgDailyCashIn || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-sky-400/30 bg-gradient-to-br from-sky-500/20 to-sky-600/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                Profit Margin
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {(summary.profitMargin * 100 || 0).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-purple-600/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">
                Total Mileage
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {formatNumber(summary.totalMileage || 0)} km
              </p>
            </div>
            <div className="rounded-xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 px-3 py-2 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                Vehicles
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {Object.keys(vehicleMetrics).length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Time Range Selector */}
      <div className="flex items-center justify-center">
        <div className="relative inline-block">
          <label className="block text-xs font-semibold text-slate-400 mb-2 text-center">
            Date Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="appearance-none rounded-xl border border-white/20 bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-2 pr-10 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition-all hover:border-brand-500/50 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 cursor-pointer"
          >
            {timeRangeOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-800 text-white">
                {option.icon} {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 pt-6">
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Service Alerts */}
      {serviceAlerts.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-red-500/50 bg-gradient-to-br from-red-600/25 via-orange-600/20 to-yellow-600/15 p-2 shadow-2xl shadow-red-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="relative rounded-lg bg-red-500/40 p-1 shadow-lg shadow-red-500/50">
              <span className="animate-bounce text-base">⚠️</span>
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
              </span>
            </div>
            <h2 className="text-sm font-bold text-white">⚠️ Service Alerts</h2>
          </div>
          <div className="space-y-2">
            {serviceAlerts.map((alert) => (
              <div
                key={alert.vehicleId}
                className="flex flex-col gap-1.5 rounded-xl border border-red-400/30 bg-gradient-to-r from-slate-900/80 to-slate-800/80 px-2.5 py-1.5 shadow-lg backdrop-blur-sm md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-base ${
                      alert.severity === "high" ? "animate-pulse" : ""
                    }`}>
                      {alert.severity === "high" ? "🚨" : "⚠️"}
                    </span>
                    <p className="text-xs font-bold text-white">{alert.vehicleName}</p>
                    {alert.severity === "high" && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow-lg shadow-red-500/50">
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-yellow-200">
                    {alert.registrationNumber} • Threshold {formatNumber(alert.threshold)} km
                  </p>
                  <p className="text-[11px] font-semibold text-red-300">
                    Mileage since service: {formatNumber(alert.mileageSinceService)} km
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleAcknowledgeAlert(alert.vehicleId, alert.currentMileage)
                  }
                  className="inline-flex items-center justify-center rounded-lg border border-red-400/50 bg-gradient-to-r from-red-500 to-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg shadow-red-500/30 transition hover:from-red-600 hover:to-red-700 hover:shadow-red-500/50"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* License Expiry Alerts */}
      {licenseExpiryAlerts && licenseExpiryAlerts.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-orange-500/50 bg-gradient-to-br from-orange-600/25 via-amber-600/20 to-yellow-600/15 p-2 shadow-2xl shadow-orange-500/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="relative rounded-lg bg-orange-500/40 p-1 shadow-lg shadow-orange-500/50">
              <span className="animate-bounce text-base">📋</span>
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-orange-500"></span>
              </span>
            </div>
            <h2 className="text-sm font-bold text-white">📋 License Expiry Alerts</h2>
          </div>
          <div className="space-y-2">
            {licenseExpiryAlerts.map((alert) => (
              <div
                key={alert.vehicleId}
                className={`flex flex-col gap-1.5 rounded-xl border px-2.5 py-1.5 shadow-lg backdrop-blur-sm md:flex-row md:items-center md:justify-between ${
                  alert.expired 
                    ? 'border-red-400/30 bg-gradient-to-r from-red-900/80 to-red-800/80'
                    : alert.severity === 'high'
                    ? 'border-orange-400/30 bg-gradient-to-r from-orange-900/80 to-orange-800/80'
                    : 'border-yellow-400/30 bg-gradient-to-r from-slate-900/80 to-slate-800/80'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-base ${
                      alert.expired || alert.severity === "high" ? "animate-pulse" : ""
                    }`}>
                      {alert.expired ? "🚫" : alert.severity === "high" ? "⏰" : "📅"}
                    </span>
                    <p className="text-xs font-bold text-white">{alert.vehicleName}</p>
                    {alert.expired && (
                      <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow-lg shadow-red-500/50">
                        EXPIRED
                      </span>
                    )}
                    {!alert.expired && alert.severity === "high" && (
                      <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white shadow-lg shadow-orange-500/50">
                        URGENT
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-yellow-200">
                    {alert.registrationNumber} • License Expiry: {new Date(alert.licenseExpiryDate).toLocaleDateString()}
                  </p>
                  <p className={`text-[11px] font-semibold ${
                    alert.expired ? 'text-red-300' : alert.severity === 'high' ? 'text-orange-300' : 'text-yellow-300'
                  }`}>
                    {alert.expired 
                      ? `Expired ${Math.abs(alert.daysUntilExpiry)} days ago`
                      : `Expires in ${alert.daysUntilExpiry} days`
                    }
                  </p>
                </div>
                <div className="inline-flex items-center justify-center rounded-lg border border-amber-400/50 bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                  Renew License
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="group rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 bg-slate-900/40 p-2.5 shadow-lg transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-400">
                  Total Cash-In
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-400/40">
                  <span>{timeRangeBadge.icon}</span>
                  {timeRangeBadge.text}
                </span>
              </div>
              <p className="mt-1.5 text-xl font-bold text-white">{formatCurrency(summary.totalCashIn)}</p>
              <p className="mt-1 text-xs font-medium text-emerald-200">
                {timeRange === 'today' || timeRange === 'yesterday' ? `${formatCurrency(summary.avgDailyCashIn || 0)}/entry avg` :
                 `Avg: ${formatCurrency(summary.avgDailyCashIn || 0)}/day`}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-2 text-lg shadow-md">
              💰
            </div>
          </div>
        </div>

        <div className="group rounded-2xl border border-rose-400/30 bg-gradient-to-br from-rose-500/10 to-rose-600/5 bg-slate-900/40 p-2.5 shadow-lg transition-all hover:scale-105 hover:shadow-xl hover:shadow-rose-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-400">
                  Total Expenses
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-400/40">
                  <span>{timeRangeBadge.icon}</span>
                  {timeRangeBadge.text}
                </span>
              </div>
              <p className="mt-1.5 text-xl font-bold text-white">{formatCurrency(summary.totalExpenses)}</p>
              <p className="mt-1 text-xs font-medium text-rose-200">
                {timeRange === 'today' || timeRange === 'yesterday' ? `${formatCurrency(summary.avgDailyExpenses || 0)}/expense avg` :
                 `Avg: ${formatCurrency(summary.avgDailyExpenses || 0)}/day`}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 p-2 text-lg shadow-md">
              💸
            </div>
          </div>
        </div>

        <div className={`group rounded-2xl border p-2.5 shadow-lg transition-all hover:scale-105 hover:shadow-xl ${
          summary.totalProfit >= 0
            ? "border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 to-teal-600/5 bg-slate-900/40 hover:shadow-emerald-500/20"
            : "border-amber-400/30 bg-gradient-to-br from-amber-500/10 to-rose-600/5 bg-slate-900/40 hover:shadow-amber-500/20"
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`text-xs font-bold uppercase tracking-wide ${
                  summary.totalProfit >= 0 ? "text-emerald-400" : "text-amber-400"
                }`}>
                  Total Profit
                </p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                  summary.totalProfit >= 0 
                    ? "bg-emerald-500/30 text-emerald-300 border-emerald-400/40"
                    : "bg-amber-500/30 text-amber-300 border-amber-400/40"
                }`}>
                  <span>{timeRangeBadge.icon}</span>
                  {timeRangeBadge.text}
                </span>
              </div>
              <p className="mt-1.5 text-xl font-bold text-white">{formatCurrency(summary.totalProfit)}</p>
              <p className={`mt-1 text-xs font-medium ${
                summary.totalProfit >= 0 ? "text-emerald-200" : "text-amber-200"
              }`}>
                Margin: {(summary.profitMargin * 100 || 0).toFixed(1)}%
              </p>
            </div>
            <div className={`rounded-xl bg-gradient-to-br p-2 text-lg shadow-md ${
              summary.totalProfit >= 0 ? "from-emerald-500 to-teal-600" : "from-amber-500 to-rose-600"
            }`}>
              {summary.totalProfit >= 0 ? "📈" : "📉"}
            </div>
          </div>
        </div>

        <div className="group rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/10 to-purple-600/5 bg-slate-900/40 p-2.5 shadow-lg transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-indigo-300">
                  Total Mileage
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-400/40">
                  <span>{timeRangeBadge.icon}</span>
                  {timeRangeBadge.text}
                </span>
              </div>
              <p className="mt-1.5 text-xl font-bold text-white">{formatNumber(summary.totalMileage || 0)} km</p>
              <p className="mt-1 text-xs font-medium text-indigo-200">
                {timeRange === 'today' ? 'All vehicles today' : 
                 timeRange === 'yesterday' ? 'All vehicles yesterday' :
                 timeRange === 'thisWeek' ? 'This week total' :
                 timeRange === 'lastWeek' ? 'Last week total' :
                 timeRange === 'thisMonth' ? 'This month total' :
                 timeRange === 'lastMonth' ? 'Last month total' :
                 timeRange === 'last7Days' ? 'Last 7 days' :
                 timeRange === 'last30Days' ? 'Last 30 days' :
                 timeRange === 'thisYear' ? 'This year total' :
                 'Total cumulative'}
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-2 text-lg shadow-md">
              🚗
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section - 2 Column Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-6 rounded-full bg-gradient-to-r from-brand-500 to-purple-500" />
          <h2 className="text-base font-bold text-white">Performance Analytics</h2>
        </div>
        
        {/* Profit Charts Row */}
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <ProfitChart
            profitTrend={trends.profit}
            vehicleMetrics={vehicleMetrics}
            topPerformer={topPerformer}
            lowPerformer={lowPerformer}
          />
        </div>

        {/* Mileage & Expense Charts Row */}
        {mileageTrends && (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <MileageChart
              mileageByVehicle={mileageTrends.mileageByVehicle}
              cumulativeMileage={mileageTrends.cumulativeMileage}
              vehicleMetrics={vehicleMetrics}
            />
            <ExpenseChart
              expensesByCategory={expensesByCategory}
              expenseTrend={trends.expenses}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
