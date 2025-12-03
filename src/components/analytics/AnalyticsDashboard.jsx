import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
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
 * @param {boolean} hideAlerts - If true, hides the vehicle alerts banner (used in hybrid dashboard)
 */
const AnalyticsDashboard = ({ hideAlerts = false }) => {
  const { user, company } = useAuth();
  const { isDark } = useTheme();
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

      {/* Vehicle Alerts Banner - Matches Commodity Dashboard Style */}
      {!hideAlerts && totalAlerts > 0 && (
        <div 
          onClick={() => navigate('/vehicles')}
          className={`relative overflow-hidden rounded-xl border-l-4 p-2.5 shadow-sm cursor-pointer transition-all hover:shadow-md ${
            isDark 
              ? 'border-l-orange-500 bg-gradient-to-r from-orange-900/30 via-amber-900/20 to-yellow-900/10' 
              : 'border-l-orange-400 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <div className="rounded-full bg-gradient-to-br from-orange-500 to-red-500 p-1.5 shadow-md animate-pulse">
                  <span className="text-lg">🚨</span>
                </div>
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-sm">
                    {totalAlerts}
                  </span>
                </span>
              </div>
              <div className="min-w-0">
                <h3 className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {totalAlerts} Vehicle {totalAlerts === 1 ? 'Alert' : 'Alerts'} Require Attention
                </h3>
                <p className={`text-xs hidden sm:block ${isDark ? 'text-orange-200' : 'text-gray-700'}`}>
                  Service due, license expiry, or maintenance required
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-md transition-colors">
              <span className="text-white font-semibold text-xs hidden sm:inline">View</span>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Simple Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
            Fleet Performance
          </h1>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Track cash flow, expenses, and profitability trends
          </p>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-center">
        <div className="relative inline-block">
          <label className={`block text-xs font-semibold mb-2 text-center ${isDark ? 'text-slate-400' : 'text-baltic-600'}`}>
            Date Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className={`appearance-none rounded-xl border px-5 py-2 pr-10 text-sm font-semibold shadow-lg backdrop-blur-sm transition-all cursor-pointer focus:outline-none focus:ring-2 ${isDark ? 'border-white/20 bg-gradient-to-br from-slate-900 to-slate-800 text-white hover:border-brand-500/50 focus:border-brand-500 focus:ring-brand-500/50' : 'border-baltic-200 bg-white text-baltic-900 hover:border-baltic-500 focus:border-baltic-500 focus:ring-baltic-500/50'}`}
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

      {/* KPI Cards Grid - Clean simple style like FinancialKPICard */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Cash-In */}
        <div className={`rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Cash-In
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm">💰</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(summary.totalCashIn, companyCurrency)}
            </p>
          </div>
          <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            Avg: {formatCurrency(summary.avgDailyCashIn || 0, companyCurrency)}/day
          </p>
        </div>

        {/* Total Expenses */}
        <div className={`rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Expenses
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm">💸</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(summary.totalExpenses, companyCurrency)}
            </p>
          </div>
          <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            Avg: {formatCurrency(summary.avgDailyExpenses || 0, companyCurrency)}/day
          </p>
        </div>

        {/* Total Profit */}
        <div className={`rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Profit
              </p>
            </div>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
              summary.totalProfit >= 0 
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600' 
                : 'bg-gradient-to-br from-amber-500 to-orange-600'
            }`}>
              <span className="text-white text-sm">{summary.totalProfit >= 0 ? '📈' : '📉'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatCurrency(summary.totalProfit, companyCurrency)}
            </p>
          </div>
          <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            {(summary.profitMargin * 100 || 0).toFixed(1)}% margin
          </p>
        </div>

        {/* Total Mileage */}
        <div className={`rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Mileage
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-baltic-500 to-baltic-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm">🚗</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatNumber(summary.totalMileage || 0)} km
            </p>
          </div>
          <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            {Object.keys(vehicleMetrics).length} vehicles
          </p>
        </div>
      </div>

      {/* Charts Section - 2 Column Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={`h-0.5 w-6 rounded-full ${isDark ? 'bg-gradient-to-r from-brand-500 to-purple-500' : 'bg-gradient-to-r from-baltic-500 to-baltic-600'}`} />
          <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-baltic-900'}`}>Performance Analytics</h2>
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
