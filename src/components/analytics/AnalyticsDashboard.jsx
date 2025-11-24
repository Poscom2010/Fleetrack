import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useNavigate } from "react-router-dom";
import KPICard from "./KPICard";
import ProfitChart from "./ProfitChart";
import MileageChart from "./MileageChart";
import ExpenseChart from "./ExpenseChart";
import { formatCurrency, formatNumber } from "../../utils/calculations";
import { getMileageGapStats } from "../../services/mileageGapDetectionService";
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
  const { user, company } = useAuth();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("all");
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [totalAlerts, setTotalAlerts] = useState(0);

  // Get company currency for formatting
  const companyCurrency = company?.currency || 'USD';

  const {
    analyticsData,
    mileageTrends,
    serviceAlerts,
    licenseExpiryAlerts,
    loading,
    error,
  } = useAnalytics(user?.uid, timeRange);

  // Count total alerts
  useEffect(() => {
    const countAlerts = async () => {
      if (company?.id) {
        try {
          const mileageGapStats = await getMileageGapStats(company.id);
          const serviceCount = serviceAlerts?.length || 0;
          const licenseCount = licenseExpiryAlerts?.length || 0;
          const mileageCount = mileageGapStats?.totalGaps || 0;
          
          setTotalAlerts(serviceCount + licenseCount + mileageCount);
        } catch (error) {
          console.error('Error counting alerts:', error);
        }
      }
    };
    
    countAlerts();
  }, [company?.id, serviceAlerts, licenseExpiryAlerts]);

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

      {/* Vehicle Alerts Banner */}
      {totalAlerts > 0 && (
        <div 
          onClick={() => navigate('/vehicles')}
          className="relative overflow-hidden rounded-xl border border-yellow-500/50 bg-gradient-to-r from-yellow-600/20 via-amber-600/20 to-orange-600/20 p-2.5 shadow-lg shadow-yellow-500/20 cursor-pointer transition-all hover:border-yellow-400 hover:shadow-yellow-500/30 hover:scale-[1.01] animate-pulse"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <div className="rounded-full bg-yellow-500 p-1.5 shadow-md shadow-yellow-500/50">
                  <span className="text-lg">🚨</span>
                </div>
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {totalAlerts}
                  </span>
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">
                  {totalAlerts} Vehicle {totalAlerts === 1 ? 'Notification' : 'Notifications'}
                </h3>
                <p className="text-xs text-yellow-200 hidden sm:block">
                  View on Vehicle Monitoring
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-yellow-300 font-semibold text-xs hidden sm:inline">View</span>
              <svg className="w-4 h-4 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Hero Header with Gradient */}
      <section className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-2.5 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 via-transparent to-purple-500/10" />
        <div className="relative flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/20 px-2.5 py-0.5 text-xs font-semibold text-brand-300 backdrop-blur-sm">
              <span className="text-xs">📊</span>
              Analytics Overview
            </div>
            <h1 className="text-lg font-bold text-white">
              Fleet Performance
            </h1>
            <p className="max-w-2xl text-xs text-slate-400">
              Track cash flow, expenses, and profitability trends.
            </p>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 px-2 py-1.5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Avg Daily Cash-In
              </p>
              <p className="mt-0.5 text-sm font-bold text-white">
                {formatCurrency(summary.avgDailyCashIn || 0, companyCurrency)}
              </p>
            </div>
            <div className="rounded-lg border border-sky-400/30 bg-gradient-to-br from-sky-500/20 to-sky-600/10 px-2 py-1.5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                Profit Margin
              </p>
              <p className="mt-0.5 text-sm font-bold text-white">
                {(summary.profitMargin * 100 || 0).toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-purple-600/10 px-2 py-1.5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-300">
                Total Mileage
              </p>
              <p className="mt-0.5 text-sm font-bold text-white">
                {formatNumber(summary.totalMileage || 0)} km
              </p>
            </div>
            <div className="rounded-lg border border-indigo-400/30 bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 px-2 py-1.5 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                Vehicles
              </p>
              <p className="mt-0.5 text-sm font-bold text-white">
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
              <p className="mt-1.5 text-xl font-bold text-white">{formatCurrency(summary.totalCashIn, companyCurrency)}</p>
              <p className="mt-1 text-xs font-medium text-emerald-200">
                {timeRange === 'today' || timeRange === 'yesterday' ? `${formatCurrency(summary.avgDailyCashIn || 0, companyCurrency)}/entry avg` :
                 `Avg: ${formatCurrency(summary.avgDailyCashIn || 0, companyCurrency)}/day`}
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
              <p className="mt-1.5 text-xl font-bold text-white">{formatCurrency(summary.totalExpenses, companyCurrency)}</p>
              <p className="mt-1 text-xs font-medium text-rose-200">
                {timeRange === 'today' || timeRange === 'yesterday' ? `${formatCurrency(summary.avgDailyExpenses || 0, companyCurrency)}/expense avg` :
                 `Avg: ${formatCurrency(summary.avgDailyExpenses || 0, companyCurrency)}/day`}
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
              <p className="mt-1.5 text-xl font-bold text-white">{formatCurrency(summary.totalProfit, companyCurrency)}</p>
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
