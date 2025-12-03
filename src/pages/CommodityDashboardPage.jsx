import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAnalytics } from '../hooks/useAnalytics';
import { getMonthlyKPIs } from '../services/commodityAnalyticsService';
import { getMileageGapStats } from '../services/mileageGapDetectionService';
import { comparePeriods } from '../services/commodityFinancialService';
import { getCumulativeDiscrepancyStats, checkAndAlertCumulativeDiscrepancies } from '../services/cumulativeDiscrepancyService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import FinancialKPICard from '../components/commodity/FinancialKPICard.jsx';
import TankDiscrepancyAlerts from '../components/commodity/TankDiscrepancyAlerts.jsx';
import CommodityAnalyticsPage from './CommodityAnalyticsPage.jsx'; // Keep for embedded analytics
import { getCurrencySymbol } from '../utils/calculations';
import { DollarSign, TrendingUp, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CommodityDashboardPage = ({ embedded = false, hideAlerts = false }) => {
  const navigate = useNavigate();
  const { user, company, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('allTime');
  const [totalAlerts, setTotalAlerts] = useState(0);
  const [revenueData, setRevenueData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [combinedFinancialData, setCombinedFinancialData] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [activeTab, setActiveTab] = useState('financial'); // 'financial' or 'analytics'
  const [chartTimeRange, setChartTimeRange] = useState('auto'); // Auto-grouping by default
  const [cumulativeDiscrepancyStats, setCumulativeDiscrepancyStats] = useState(null);
  
  const {
    serviceAlerts,
    licenseExpiryAlerts,
  } = useAnalytics(user?.uid, 'all');

  useEffect(() => {
    loadKPIs();
    loadFinancialData();
    loadCumulativeDiscrepancyStats();
    
    // When KPI period changes, set chart to auto-grouping
    setChartTimeRange('auto');
    loadChartData(selectedPeriod);
  }, [company, selectedPeriod]);
  
  // Separate effect for chart data when chart filter is changed independently
  useEffect(() => {
    // Only load if chartTimeRange was changed by user (not by selectedPeriod sync)
    if (chartTimeRange !== selectedPeriod) {
      loadChartData(chartTimeRange);
    }
  }, [chartTimeRange]);
  
  const loadCumulativeDiscrepancyStats = async () => {
    if (!company?.id) return;
    
    try {
      const stats = await getCumulativeDiscrepancyStats(company.id, null, 30);
      setCumulativeDiscrepancyStats(stats);
      
      // Auto-create alert if threshold exceeded
      if (stats.needsInvestigation) {
        await checkAndAlertCumulativeDiscrepancies(company.id);
      }
    } catch (error) {
      console.error('Error loading cumulative discrepancy stats:', error);
    }
  };
  
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

  const loadKPIs = async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      
      const data = await getMonthlyKPIs(company.id, year, month);
      setKpis(data);
    } catch (error) {
      console.error('Error loading KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFinancialData = async () => {
    if (!company?.id) return;

    try {
      // Determine comparison period
      const comparisonMap = {
        'today': 'yesterday',
        'thisWeek': 'lastWeek',
        'thisMonth': 'lastMonth'
      };
      
      const previousPeriod = comparisonMap[selectedPeriod] || 'yesterday';
      const data = await comparePeriods(company.id, selectedPeriod, previousPeriod);
      setFinancialData(data);
    } catch (error) {
      console.error('Error loading financial data:', error);
    }
  };

  const loadChartData = async (timeRange = 'daily') => {
    if (!company?.id) return;

    try {
      // Calculate date range based on timeRange parameter
      const now = new Date();
      let startDate = new Date();
      
      switch(timeRange) {
        case 'daily':
          startDate.setDate(startDate.getDate() - 7); // Last 7 days for daily view
          break;
        case 'weekly':
          startDate.setDate(startDate.getDate() - 56); // Last 8 weeks for weekly view
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 12); // Last 12 months for monthly view
          break;
        // Keep old options for backward compatibility with main filter
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate.setDate(startDate.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'last7Days':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'last30Days':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case 'last90Days':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case 'thisWeek':
          const dayOfWeek = now.getDay();
          startDate.setDate(startDate.getDate() - dayOfWeek);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'lastWeek':
          const lastWeekStart = new Date(now);
          lastWeekStart.setDate(lastWeekStart.getDate() - now.getDay() - 7);
          lastWeekStart.setHours(0, 0, 0, 0);
          startDate = lastWeekStart;
          break;
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'lastMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          break;
        default:
          startDate = new Date(0); // All time
      }
      
      // Fetch invoices for revenue trend
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('companyId', '==', company.id)
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoices = invoicesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          invoiceDate: doc.data().invoiceDate?.toDate()
        }))
        .filter(inv => inv.invoiceDate && inv.invoiceDate >= startDate); // Filter by date range

      // Smart grouping based on data span
      const getDateSpanInDays = (dates) => {
        if (dates.length === 0) return 0;
        const sortedDates = dates.sort((a, b) => a - b);
        const span = (sortedDates[sortedDates.length - 1] - sortedDates[0]) / (1000 * 60 * 60 * 24);
        return span;
      };

      // Smart auto-grouping based on data density
      const invoiceDates = invoices.map(inv => inv.invoiceDate).filter(d => d);
      const spanDays = getDateSpanInDays(invoiceDates);
      const dataPointCount = invoices.length;
      
      let groupBy = 'day';
      let displayCount = 7;
      
      if (timeRange === 'auto' || !['daily', 'weekly', 'monthly'].includes(timeRange)) {
        // AUTO-GROUPING LOGIC:
        // Start with daily, upgrade to weekly if too many points, then monthly
        
        // Rule 1: If data spans <= 14 days OR has <= 14 data points → Daily
        if (spanDays <= 14 || dataPointCount <= 14) {
          groupBy = 'day';
          displayCount = Math.max(7, Math.ceil(spanDays));
        }
        // Rule 2: If data spans <= 90 days OR has <= 60 data points → Weekly
        else if (spanDays <= 90 || dataPointCount <= 60) {
          groupBy = 'week';
          displayCount = Math.max(8, Math.ceil(spanDays / 7));
        }
        // Rule 3: Otherwise → Monthly
        else {
          groupBy = 'month';
          displayCount = Math.min(12, Math.ceil(spanDays / 30));
        }
      } else {
        // Manual override from dropdown
        if (timeRange === 'daily') {
          groupBy = 'day';
          displayCount = 7;
        } else if (timeRange === 'weekly') {
          groupBy = 'week';
          displayCount = 8;
        } else if (timeRange === 'monthly') {
          groupBy = 'month';
          displayCount = 12;
        }
      }

      const revenueGrouped = {};
      invoices.forEach(inv => {
        if (inv.invoiceDate) {
          let key;
          if (groupBy === 'day') {
            key = inv.invoiceDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else if (groupBy === 'week') {
            const weekStart = new Date(inv.invoiceDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else if (groupBy === 'month') {
            key = inv.invoiceDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          } else {
            key = inv.invoiceDate.getFullYear().toString();
          }
          if (!revenueGrouped[key]) {
            revenueGrouped[key] = { period: key, revenue: 0, count: 0 };
          }
          revenueGrouped[key].revenue += inv.total || 0;
          revenueGrouped[key].count += 1;
        }
      });

      const revenueArray = Object.values(revenueGrouped)
        .sort((a, b) => new Date(a.period) - new Date(b.period))
        .slice(-displayCount);
      setRevenueData(revenueArray);

      // Fetch expenses for expense trend
      const expensesRef = collection(db, 'tripExpenses');
      const expensesQuery = query(
        expensesRef,
        where('companyId', '==', company.id)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expenses = expensesSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          expenseDate: doc.data().date?.toDate() || doc.data().expenseDate?.toDate()
        }))
        .filter(exp => exp.expenseDate && exp.expenseDate >= startDate); // Filter by date range

      // Use same grouping as revenue (based on chart filter)
      let expenseGroupBy = groupBy;
      let expenseDisplayCount = displayCount;

      const expensesGrouped = {};
      expenses.forEach(exp => {
        if (exp.expenseDate) {
          let key;
          if (expenseGroupBy === 'day') {
            key = exp.expenseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else if (expenseGroupBy === 'week') {
            const weekStart = new Date(exp.expenseDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay());
            key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else if (expenseGroupBy === 'month') {
            key = exp.expenseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
          } else {
            key = exp.expenseDate.getFullYear().toString();
          }
          if (!expensesGrouped[key]) {
            expensesGrouped[key] = { period: key, expenses: 0, count: 0 };
          }
          expensesGrouped[key].expenses += parseFloat(exp.amount) || 0;
          expensesGrouped[key].count += 1;
        }
      });

      const expenseArray = Object.values(expensesGrouped)
        .sort((a, b) => new Date(a.period) - new Date(b.period))
        .slice(-expenseDisplayCount);
      setExpenseData(expenseArray);

      // Fetch payments for payment methods distribution
      const paymentsRef = collection(db, 'payments');
      const paymentsQuery = query(
        paymentsRef,
        where('companyId', '==', company.id)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Group payments by method
      const methodCounts = {};
      payments.forEach(payment => {
        const method = payment.paymentMethod || 'unknown';
        methodCounts[method] = (methodCounts[method] || 0) + 1;
      });

      const paymentMethodArray = Object.entries(methodCounts).map(([method, count]) => ({
        name: method.charAt(0).toUpperCase() + method.slice(1),
        value: count,
        percentage: ((count / payments.length) * 100).toFixed(1)
      }));
      setPaymentMethodData(paymentMethodArray);

      // Debug logging
      console.log('📊 CHART DATA DEBUG:');
      console.log('Revenue Array:', revenueArray);
      console.log('Expense Array:', expenseArray);
      
      // Combine revenue and expense data for single chart
      const allPeriods = new Set([
        ...revenueArray.map(r => r.period),
        ...expenseArray.map(e => e.period)
      ]);

      const combined = Array.from(allPeriods).map(period => {
        const revenueItem = revenueArray.find(r => r.period === period);
        const expenseItem = expenseArray.find(e => e.period === period);
        return {
          period,
          revenue: revenueItem?.revenue || 0,
          expenses: expenseItem?.expenses || 0
        };
      }).sort((a, b) => new Date(a.period) - new Date(b.period));

      console.log('Combined Financial Data:', combined);
      console.log('Combined Data Length:', combined.length);
      
      // Add padding: 2 days before first data, 3 blank spaces after last data
      let finalData = combined;
      
      if (combined.length > 0) {
        const paddedData = [...combined];
        
        // Add 3 blank spaces after last data (no dates, just empty for spacing)
        for (let i = 1; i <= 3; i++) {
          paddedData.push({
            period: '', // Empty period for spacing
            revenue: null,
            expenses: null
          });
        }
        
        finalData = paddedData;
        console.log('📊 Padded data (3 blank after):', finalData);
      }
      
      setCombinedFinancialData(finalData);

    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const getPeriodLabel = (period) => {
    const labels = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'thisWeek': 'This Week',
      'lastWeek': 'Last Week',
      'thisMonth': 'This Month',
      'lastMonth': 'Last Month',
      'last7Days': 'Last 7 Days',
      'last30Days': 'Last 30 Days',
      'last90Days': 'Last 90 Days',
      'allTime': 'All Time'
    };
    return labels[period] || 'Today';
  };

  const convertPeriodToDays = (period) => {
    const periodToDays = {
      'today': '1',
      'yesterday': '1',
      'thisWeek': '7',
      'lastWeek': '7',
      'thisMonth': '30',
      'lastMonth': '30',
      'last7Days': '7',
      'last30Days': '30',
      'last90Days': '90',
      'allTime': '999999'
    };
    return periodToDays[period] || '30';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "container mx-auto px-2 sm:px-4 max-w-7xl pt-2"}>
      {/* Vehicle Alerts Banner - Fixed to navbar */}
      {!hideAlerts && totalAlerts > 0 && (
        <div 
          onClick={() => navigate('/vehicles')}
          className="fixed top-[52px] left-0 right-0 z-40 overflow-hidden border-b-2 border-orange-400 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 p-2 shadow-md cursor-pointer transition-all hover:border-orange-500 hover:shadow-lg lg:left-[208px]"
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
                <h3 className="text-sm font-bold text-gray-900 truncate">
                  {totalAlerts} Vehicle {totalAlerts === 1 ? 'Alert' : 'Alerts'} Require Attention
                </h3>
                <p className="text-xs text-gray-700 hidden sm:block">
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
      
      {/* Tank Discrepancy Alerts */}
      {!hideAlerts && <TankDiscrepancyAlerts />}
      
      {/* Cumulative Small Losses Alert */}
      {!hideAlerts && cumulativeDiscrepancyStats?.needsInvestigation && (
        <div className="bg-white dark:bg-gray-800 border-l-4 border-warning rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    ⚠️ Cumulative Small Fuel Losses Detected
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold mt-1 ${
                    cumulativeDiscrepancyStats.riskLevel === 'critical' 
                      ? 'bg-danger/10 text-danger'
                      : cumulativeDiscrepancyStats.riskLevel === 'high'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-info/10 text-info'
                  }`}>
                    {cumulativeDiscrepancyStats.riskLevel.toUpperCase()} RISK
                  </span>
                </div>
                <button
                  onClick={() => navigate('/commodity/reconciliation')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-warning hover:bg-warning/90 text-white rounded-md font-medium text-xs transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  Investigate
                </button>
              </div>
              
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {cumulativeDiscrepancyStats.alertMessage}
              </p>
              
              {/* Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Events</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {cumulativeDiscrepancyStats.totalSmallDiscrepancies}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Loss</p>
                  <p className="text-lg font-bold text-danger">
                    {cumulativeDiscrepancyStats.cumulativeSmallLoss.toLocaleString()}L
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Avg Loss/Event</p>
                  <p className="text-lg font-bold text-warning">
                    {cumulativeDiscrepancyStats.avgLossPerEvent.toFixed(1)}L
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Period</p>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {cumulativeDiscrepancyStats.period}
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                💡 <strong>Tip:</strong> Many small losses (under 50L each) can add up to significant amounts. 
                Check for systematic issues like meter calibration, driver behavior, or fuel theft patterns.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation with Filter */}
      <div className="mb-3 mt-2">
        <div className="border-b border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 -mb-px">
            {/* Tab Buttons */}
            <nav className="flex gap-2 sm:gap-4 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('financial')}
                className={`py-2 px-4 border-b-2 font-semibold text-sm transition-colors ${
                  activeTab === 'financial'
                    ? 'border-success text-success'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Financial</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-4 border-b-2 font-semibold text-sm transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-baltic-500 text-baltic-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </div>
              </button>
            </nav>

            {/* Filter Dropdown */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 bg-white hover:border-baltic-400 focus:ring-2 focus:ring-baltic-500 focus:border-transparent transition-colors dark:bg-slate-800 dark:border-slate-600 dark:text-white dark:hover:border-baltic-400"
            >
              <option value="today" className="dark:bg-slate-800">Today</option>
              <option value="yesterday" className="dark:bg-slate-800">Yesterday</option>
              <option value="thisWeek" className="dark:bg-slate-800">This Week</option>
              <option value="lastWeek" className="dark:bg-slate-800">Last Week</option>
              <option value="thisMonth" className="dark:bg-slate-800">This Month</option>
              <option value="lastMonth" className="dark:bg-slate-800">Last Month</option>
              <option value="last7Days" className="dark:bg-slate-800">Last 7 Days</option>
              <option value="last30Days" className="dark:bg-slate-800">Last 30 Days</option>
              <option value="last90Days" className="dark:bg-slate-800">Last 90 Days</option>
              <option value="allTime" className="dark:bg-slate-800">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Financial Tab Content */}
      {activeTab === 'financial' && (
        <div className="space-y-3">
          {/* Financial KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <FinancialKPICard
              title="Revenue"
              value={financialData?.current?.totalInvoiced || 0}
              subtitle={`${financialData?.current?.invoiceCount || 0} invoices`}
              icon={DollarSign}
              color="success"
              trend={financialData?.changes?.revenue > 0 ? 'up' : financialData?.changes?.revenue < 0 ? 'down' : undefined}
              trendValue={financialData?.changes?.revenue}
              format="currency"
              currency={company?.currency || 'USD'}
            />

            <FinancialKPICard
              title="Collected"
              value={financialData?.current?.totalPaid || 0}
              subtitle={`${financialData?.current?.paidCount || 0} paid`}
              icon={TrendingUp}
              color="baltic"
              trend={financialData?.changes?.paid > 0 ? 'up' : financialData?.changes?.paid < 0 ? 'down' : undefined}
              trendValue={financialData?.changes?.paid}
              format="currency"
              currency={company?.currency || 'USD'}
            />

            <FinancialKPICard
              title="Outstanding"
              value={financialData?.current?.totalOutstanding || 0}
              subtitle={`${(financialData?.current?.unpaidCount || 0) + (financialData?.current?.partialCount || 0)} pending`}
              icon={AlertCircle}
              color={(financialData?.current?.totalOutstanding || 0) > 0 ? 'warning' : 'success'}
              format="currency"
              currency={company?.currency || 'USD'}
            />

            <FinancialKPICard
              title="Collection Rate"
              value={financialData?.current?.collectionRate || 0}
              subtitle={`Avg ${(financialData?.current?.avgDaysToPayment || 0).toFixed(0)} days`}
              icon={Clock}
              color={(financialData?.current?.collectionRate || 0) >= 80 ? 'success' : (financialData?.current?.collectionRate || 0) >= 60 ? 'warning' : 'danger'}
              trend={financialData?.changes?.collectionRate > 0 ? 'up' : financialData?.changes?.collectionRate < 0 ? 'down' : undefined}
              trendValue={financialData?.changes?.collectionRate}
              format="percentage"
            />
          </div>

          {/* Financial Charts with Independent Filtering */}
          <div className="col-span-2 bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
            {/* Chart Time Range Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>📊</span>
                <span className="text-sm sm:text-base">Financial Trends</span>
              </h3>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <span className="text-xs sm:text-sm text-gray-600">Chart Period:</span>
                <select
                  value={chartTimeRange}
                  onChange={(e) => setChartTimeRange(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 bg-white hover:border-baltic-400 focus:ring-2 focus:ring-baltic-500 focus:border-transparent transition-colors"
                >
                  <option value="auto">Auto (Smart Grouping)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            {/* Two Charts Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Revenue Only Chart */}
              <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>💰</span>
                  Revenue Trend
                </h4>
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        stroke="#cbd5e1"
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        stroke="#cbd5e1"
                        tickFormatter={(value) => `${getCurrencySymbol(company?.currency)}${(value / 1000).toFixed(0)}k`} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                          border: 'none', 
                          borderRadius: '8px',
                          color: '#10B981'
                        }}
                        labelStyle={{ color: '#10B981', fontWeight: 'bold' }}
                        formatter={(value) => [`${getCurrencySymbol(company?.currency)}${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', fontWeight: '600' }} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#10B981" 
                        strokeWidth={2.5}
                        name="Revenue"
                        dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#064e3b' }}
                        activeDot={{ r: 6, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <p className="text-sm">No revenue data available</p>
                  </div>
                )}
              </div>

              {/* Expenses Only Chart (Dedicated Scale) */}
              <div className="bg-white rounded-lg p-4 shadow border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>💸</span>
                  Expenses Trend (Detailed View)
                </h4>
                {expenseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={expenseData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        stroke="#cbd5e1"
                      />
                      <YAxis 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        stroke="#cbd5e1"
                        tickFormatter={(value) => `${getCurrencySymbol(company?.currency)}${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toFixed(0)}`} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                          border: 'none', 
                          borderRadius: '8px',
                          color: '#EF4444'
                        }}
                        labelStyle={{ color: '#EF4444', fontWeight: 'bold' }}
                        formatter={(value) => `${getCurrencySymbol(company?.currency)}${value.toLocaleString()}`}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', fontWeight: '600' }} />
                      <Line 
                        type="monotone" 
                        dataKey="expenses" 
                        stroke="#EF4444" 
                        strokeWidth={3}
                        name="Expenses"
                        dot={{ r: 5, fill: '#EF4444', strokeWidth: 2, stroke: '#7f1d1d' }}
                        activeDot={{ r: 7, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    <p className="text-sm">No expense data available</p>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2 text-center">
                  📊 Dedicated scale shows expense variations clearly
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab Content */}
      {activeTab === 'analytics' && (
        <CommodityAnalyticsPage 
          embedded={true} 
          externalDateRange={convertPeriodToDays(selectedPeriod)} 
        />
      )}
    </div>
  );
};

export default CommodityDashboardPage;
