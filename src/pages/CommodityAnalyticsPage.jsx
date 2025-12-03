import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Droplets, AlertTriangle, CheckCircle, Calendar, Download } from 'lucide-react';
import { getCurrencySymbol } from '../utils/calculations';
import toast from 'react-hot-toast';

const CommodityAnalyticsPage = ({ embedded = false, externalDateRange = null }) => {
  usePageTitle('Analytics');
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [internalDateRange, setInternalDateRange] = useState('999999'); // All Time by default
  
  // Use external date range if provided (from dashboard), otherwise use internal
  const dateRange = embedded && externalDateRange ? externalDateRange : internalDateRange;
  const [commodityFilter, setCommodityFilter] = useState('all'); // all, diesel, lpGas
  
  // Get period label for display
  const getPeriodLabel = () => {
    // Handle string period values from dashboard
    if (typeof dateRange === 'string' && isNaN(parseInt(dateRange))) {
      const periodLabels = {
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
      return periodLabels[dateRange] || dateRange;
    }
    
    // Handle numeric day values
    const days = parseInt(dateRange);
    if (days === 1) return 'Today';
    if (days === 7) return 'Last 7 Days';
    if (days === 30) return 'Last 30 Days';
    if (days === 90) return 'Last 90 Days';
    if (days === 180) return 'Last 6 Months';
    if (days === 999999) return 'All Time';
    return `Last ${days} Days`;
  };
  
  const [metrics, setMetrics] = useState({
    totalLoaded: 0,
    totalOffloaded: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    averageVariance: 0,
    perfectDeliveries: 0,
    totalTrips: 0,
    // Separate metrics by commodity
    dieselLoaded: 0,
    dieselOffloaded: 0,
    dieselTrips: 0,
    dieselExpenses: 0,
    lpGasLoaded: 0,
    lpGasOffloaded: 0,
    lpGasTrips: 0,
    lpGasExpenses: 0
  });
  const [volumeData, setVolumeData] = useState([]);
  const [reconciliationData, setReconciliationData] = useState([]);
  const [vehiclePerformance, setVehiclePerformance] = useState([]);
  const [varianceTrend, setVarianceTrend] = useState([]);
  const [expensesByMonth, setExpensesByMonth] = useState([]);

  useEffect(() => {
    if (company?.id) {
      fetchAnalytics();
    }
  }, [company, dateRange, commodityFilter, externalDateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Calculate date range for charts (filtered view)
      const endDate = new Date();
      const startDate = new Date();
      const daysToSubtract = parseInt(dateRange);
      
      // Validate to prevent invalid timestamps
      if (daysToSubtract > 365000) {
        // For "All Time" (999999 days), use a reasonable start date (10 years ago)
        startDate.setFullYear(startDate.getFullYear() - 10);
      } else {
        startDate.setDate(startDate.getDate() - daysToSubtract);
      }

      // Fetch ALL load events (cumulative - no date filter)
      const loadQuery = query(
        collection(db, 'loadEvents'),
        where('companyId', '==', company.id)
      );
      const loadSnapshot = await getDocs(loadQuery);
      const allLoads = loadSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        loadDate: doc.data().loadDate?.toDate()
      }));

      // Fetch ALL offload events (cumulative - no date filter)
      const offloadQuery = query(
        collection(db, 'offloadEvents'),
        where('companyId', '==', company.id)
      );
      const offloadSnapshot = await getDocs(offloadQuery);
      const allOffloads = offloadSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        offloadDate: doc.data().offloadDate?.toDate()
      }));
      
      // Filter by date range for charts only
      const loads = allLoads.filter(l => {
        const date = l.loadDate;
        return date && date >= startDate && date <= endDate;
      });
      
      const offloads = allOffloads.filter(o => {
        const date = o.offloadDate;
        return date && date >= startDate && date <= endDate;
      });

      // Fetch vehicles for names
      const vehiclesQuery = query(
        collection(db, 'vehicles'),
        where('companyId', '==', company.id)
      );
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const vehiclesMap = {};
      vehiclesSnapshot.docs.forEach(doc => {
        const vData = doc.data();
        vehiclesMap[doc.id] = {
          name: vData.name || vData.registrationNumber || 'Unknown',
          registrationNumber: vData.registrationNumber || ''
        };
      });

      // Fetch invoices for revenue
      const invoiceQuery = query(
        collection(db, 'invoices'),
        where('companyId', '==', company.id),
        where('invoiceDate', '>=', Timestamp.fromDate(startDate)),
        where('invoiceDate', '<=', Timestamp.fromDate(endDate))
      );
      const invoiceSnapshot = await getDocs(invoiceQuery);
      const invoices = invoiceSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch expenses (filter by date in memory to avoid index requirement)
      let expenses = [];
      try {
        const expensesQuery = query(
          collection(db, 'tripExpenses'),
          where('companyId', '==', company.id)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        const allExpenses = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          expenseDate: doc.data().date?.toDate() || doc.data().expenseDate?.toDate()
        }));
        
        // Filter by date range in memory
        expenses = allExpenses.filter(exp => {
          const expDate = exp.expenseDate;
          return expDate && expDate >= startDate && expDate <= endDate;
        });
        
        console.log(`✅ Fetched ${expenses.length} expenses for date range`);
      } catch (expenseError) {
        console.error('❌ Error fetching expenses:', expenseError);
        expenses = [];
      }

      // Filter by commodity type - case insensitive
      const filteredLoads = commodityFilter === 'all' 
        ? loads 
        : loads.filter(l => (l.commodityType || '').toLowerCase() === commodityFilter.toLowerCase());
      const filteredOffloads = commodityFilter === 'all'
        ? offloads
        : offloads.filter(o => {
            // Check offload's own commodityType first, then fall back to related load
            const oType = (o.commodityType || '').toLowerCase();
            if (oType === commodityFilter.toLowerCase()) return true;
            const relatedLoad = loads.find(l => l.id === o.loadEventId);
            const lType = (relatedLoad?.commodityType || '').toLowerCase();
            return lType === commodityFilter.toLowerCase();
          });

      // Calculate expenses by commodity type FIRST (before using them)
      // Use DATE-FILTERED loads - case-insensitive
      const dieselLoads = loads.filter(l => (l.commodityType || '').toLowerCase() === 'diesel');
      const lpGasLoads = loads.filter(l => {
        const type = (l.commodityType || '').toLowerCase();
        return type === 'lpgas' || type === 'lpGas';
      });
      const dieselLoadIds = dieselLoads.map(l => l.id);
      const lpGasLoadIds = lpGasLoads.map(l => l.id);
      const dieselExpenses = expenses.filter(exp => dieselLoadIds.includes(exp.loadEventId));
      const lpGasExpenses = expenses.filter(exp => lpGasLoadIds.includes(exp.loadEventId));
      const dieselTotalExpenses = dieselExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      const lpGasTotalExpenses = lpGasExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

      // Filter expenses based on commodity filter
      const filteredLoadIds = filteredLoads.map(l => l.id);
      const filteredExpenses = expenses.filter(exp => filteredLoadIds.includes(exp.loadEventId));

      // Calculate metrics based on current tab
      // Overview: Show ALL commodities (diesel + LP gas) with date filter
      // Diesel tab: Show ONLY diesel with date filter
      // LP Gas tab: Show ONLY LP gas with date filter
      const metricsLoads = filteredLoads;
      const metricsOffloads = filteredOffloads;
      
      const totalLoaded = metricsLoads.reduce((sum, load) => sum + (Number(load.loadQuantity) || 0), 0);
      const totalOffloaded = metricsOffloads.reduce((sum, offload) => sum + (Number(offload.offloadQuantity) || 0), 0);
      
      // CRITICAL FIX: Filter invoices by commodity type based on related offload event
      const filteredOffloadIds = metricsOffloads.map(o => o.id);
      const filteredInvoices = invoices.filter(inv => filteredOffloadIds.includes(inv.offloadEventId));
      const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.total) || Number(inv.totalAmount) || 0), 0);
      const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
      const totalProfit = totalRevenue - totalExpenses;
      const perfectDeliveries = metricsOffloads.filter(o => o.reconciliationStatus === 'matched').length;
      const averageVariance = metricsOffloads.length > 0
        ? metricsOffloads.reduce((sum, o) => sum + (Number(o.variance) || 0), 0) / metricsOffloads.length
        : 0;

      // Calculate offloads by commodity type for overview - USE DATE-FILTERED DATA
      // Check offload's own commodityType field first, then fall back to related load
      // Handle case-insensitive matching for diesel/lpGas
      const dieselOffloads = offloads.filter(o => {
        const type = (o.commodityType || '').toLowerCase();
        if (type === 'diesel') return true;
        const relatedLoad = loads.find(l => l.id === o.loadEventId);
        const loadType = (relatedLoad?.commodityType || '').toLowerCase();
        return loadType === 'diesel';
      });
      const lpGasOffloads = offloads.filter(o => {
        const type = (o.commodityType || '').toLowerCase();
        if (type === 'lpgas' || type === 'lpGas') return true;
        const relatedLoad = loads.find(l => l.id === o.loadEventId);
        const loadType = (relatedLoad?.commodityType || '').toLowerCase();
        return loadType === 'lpgas' || loadType === 'lpGas';
      });

      const dieselLoaded = dieselLoads.reduce((sum, load) => sum + (Number(load.loadQuantity) || 0), 0);
      const dieselOffloaded = dieselOffloads.reduce((sum, o) => sum + (Number(o.offloadQuantity) || 0), 0);
      const lpGasLoaded = lpGasLoads.reduce((sum, load) => sum + (Number(load.loadQuantity) || 0), 0);
      const lpGasOffloaded = lpGasOffloads.reduce((sum, o) => sum + (Number(o.offloadQuantity) || 0), 0);
      
      // Calculate revenue by commodity type
      const dieselOffloadIds = dieselOffloads.map(o => o.id);
      const lpGasOffloadIds = lpGasOffloads.map(o => o.id);
      const dieselInvoices = invoices.filter(inv => dieselOffloadIds.includes(inv.offloadEventId));
      const lpGasInvoices = invoices.filter(inv => lpGasOffloadIds.includes(inv.offloadEventId));
      const dieselRevenue = dieselInvoices.reduce((sum, inv) => sum + (Number(inv.total) || Number(inv.totalAmount) || 0), 0);
      const lpGasRevenue = lpGasInvoices.reduce((sum, inv) => sum + (Number(inv.total) || Number(inv.totalAmount) || 0), 0);
      
      const metricsData = {
        totalLoaded,
        totalOffloaded,
        totalRevenue,
        totalExpenses,
        totalProfit,
        averageVariance,
        perfectDeliveries,
        totalTrips: filteredLoads.length,
        totalDeliveries: filteredOffloads.length, // NEW: Count of deliveries (offloads)
        // Separate metrics by commodity - use offloads for trip count since loads might be missing
        dieselLoaded,
        dieselOffloaded,
        dieselTrips: Math.max(dieselLoads.length, dieselOffloads.length), // Use whichever is higher
        dieselDeliveries: dieselOffloads.length, // NEW: Diesel delivery count
        dieselExpenses: dieselTotalExpenses,
        dieselRevenue, // NEW: Commodity-specific revenue
        lpGasLoaded,
        lpGasOffloaded,
        lpGasTrips: Math.max(lpGasLoads.length, lpGasOffloads.length), // Use whichever is higher
        lpGasDeliveries: lpGasOffloads.length, // NEW: LP Gas delivery count
        lpGasExpenses: lpGasTotalExpenses,
        lpGasRevenue // NEW: Commodity-specific revenue
      };
      
      setMetrics(metricsData);

      // Prepare volume data (daily aggregation) - using filtered data
      const volumeMap = new Map();
      filteredLoads.forEach(load => {
        const dateKey = load.loadDate?.toLocaleDateString('en-ZA') || 'Unknown';
        if (!volumeMap.has(dateKey)) {
          volumeMap.set(dateKey, { date: dateKey, loaded: 0, offloaded: 0 });
        }
        volumeMap.get(dateKey).loaded += Number(load.loadQuantity) || 0;
      });
      filteredOffloads.forEach(offload => {
        const dateKey = offload.offloadDate?.toLocaleDateString('en-ZA') || 'Unknown';
        if (!volumeMap.has(dateKey)) {
          volumeMap.set(dateKey, { date: dateKey, loaded: 0, offloaded: 0 });
        }
        volumeMap.get(dateKey).offloaded += Number(offload.offloadQuantity) || 0;
      });
      setVolumeData(Array.from(volumeMap.values()).slice(-14)); // Last 14 days

      // Reconciliation breakdown - using filtered data
      const reconciliationMap = {
        matched: 0,
        very_minor: 0,
        minor_variance: 0,
        major_variance: 0,
        pending: 0
      };
      filteredOffloads.forEach(offload => {
        const status = offload.reconciliationStatus || 'pending';
        reconciliationMap[status] = (reconciliationMap[status] || 0) + 1;
      });
      setReconciliationData([
        { name: 'Perfect Match', value: reconciliationMap.matched, color: '#10B981' },
        { name: 'Very Minor ≤3L', value: reconciliationMap.very_minor, color: '#3b86c4' },
        { name: 'Minor <50L', value: reconciliationMap.minor_variance, color: '#F59E0B' },
        { name: 'Major ≥50L', value: reconciliationMap.major_variance, color: '#EF4444' },
        { name: 'Pending', value: reconciliationMap.pending, color: '#6B7280' }
      ].filter(item => item.value > 0));

      // Prepare expenses by month data - USE FILTERED EXPENSES
      const expensesMonthMap = new Map();
      filteredExpenses.forEach(expense => {
        if (expense.expenseDate) {
          const monthKey = expense.expenseDate.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short' });
          if (!expensesMonthMap.has(monthKey)) {
            expensesMonthMap.set(monthKey, { month: monthKey, totalExpenses: 0, count: 0 });
          }
          const monthData = expensesMonthMap.get(monthKey);
          monthData.totalExpenses += Number(expense.amount) || 0;
          monthData.count += 1;
        }
      });
      let expensesArray = Array.from(expensesMonthMap.values()).sort((a, b) => {
        // Sort by date
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA - dateB;
      });
      
      // Add blank spacing after data (no dates)
      if (expensesArray.length > 0) {
        const paddedExpenses = [...expensesArray];
        
        // Add 3 blank spaces after for chart spacing
        for (let i = 1; i <= 3; i++) {
          paddedExpenses.push({
            month: '',
            totalExpenses: null,
            count: 0
          });
        }
        
        expensesArray = paddedExpenses;
      }
      
      setExpensesByMonth(expensesArray);

      // Vehicle performance - using filtered data
      const vehicleMap = new Map();
      filteredOffloads.forEach(offload => {
        const vId = offload.vehicleId;
        if (!vehicleMap.has(vId)) {
          const vehicleInfo = vehiclesMap[vId] || { name: 'Unknown', registrationNumber: '' };
          vehicleMap.set(vId, {
            vehicleId: vId,
            vehicleName: vehicleInfo.name,
            registrationNumber: vehicleInfo.registrationNumber,
            trips: 0,
            totalOffloaded: 0,
            perfectDeliveries: 0,
            totalVariance: 0
          });
        }
        const vData = vehicleMap.get(vId);
        vData.trips += 1;
        vData.totalOffloaded += Number(offload.offloadQuantity) || 0;
        if (offload.reconciliationStatus === 'matched') vData.perfectDeliveries += 1;
        vData.totalVariance += Math.abs(offload.variance || 0);
      });
      setVehiclePerformance(
        Array.from(vehicleMap.values())
          .map(v => ({
            ...v,
            avgVariance: v.trips > 0 ? v.totalVariance / v.trips : 0,
            accuracyRate: v.trips > 0 ? (v.perfectDeliveries / v.trips) * 100 : 0
          }))
          .sort((a, b) => b.accuracyRate - a.accuracyRate)
          .slice(0, 10)
      );

      // Variance trend (weekly) - using filtered data
      const varianceMap = new Map();
      filteredOffloads.forEach(offload => {
        const weekKey = getWeekKey(offload.offloadDate);
        if (!varianceMap.has(weekKey)) {
          varianceMap.set(weekKey, { week: weekKey, avgVariance: 0, count: 0, total: 0 });
        }
        const wData = varianceMap.get(weekKey);
        wData.total += Math.abs(offload.variance || 0);
        wData.count += 1;
      });
      varianceMap.forEach((value, key) => {
        value.avgVariance = value.count > 0 ? value.total / value.count : 0;
      });
      let varianceArray = Array.from(varianceMap.values()).slice(-8);
      
      // Add blank spacing after data (no week numbers)
      if (varianceArray.length > 0) {
        const paddedVariance = [...varianceArray];
        
        // Add 3 blank spaces after for chart spacing
        for (let i = 1; i <= 3; i++) {
          paddedVariance.push({
            week: '',
            avgVariance: null,
            count: 0,
            total: 0
          });
        }
        
        varianceArray = paddedVariance;
      }
      
      setVarianceTrend(varianceArray);

    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getWeekKey = (date) => {
    if (!date) return 'Unknown';
    const d = new Date(date);
    const weekNum = Math.ceil((d.getDate() - d.getDay() + 1) / 7);
    return `Week ${weekNum}`;
  };

  const exportData = () => {
    toast.success('Export feature coming soon!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-baltic-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "min-h-screen p-4 md:p-6"}>
      <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto space-y-6"}>
      {/* Header */}
      {!embedded && (
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Commodity Analytics</h1>
          <div className="flex items-center gap-3">
            <select
              value={internalDateRange}
              onChange={(e) => setInternalDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-baltic-500"
            >
              <option value="1">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="999999">All Time</option>
            </select>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-baltic-500 hover:bg-baltic-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      )}
      
      {/* No date filter in embedded mode - uses parent's filter */}

      {/* Commodity Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setCommodityFilter('all')}
          className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
            commodityFilter === 'all'
              ? 'bg-baltic-500 text-white border-baltic-500'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setCommodityFilter('diesel')}
          className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
            commodityFilter === 'diesel'
              ? 'bg-baltic-500 text-white border-baltic-500'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          ⛽ Diesel
        </button>
        <button
          onClick={() => setCommodityFilter('lpGas')}
          className={`px-4 py-2 text-sm font-medium transition-colors rounded-t-lg ${
            commodityFilter === 'lpGas'
              ? 'bg-baltic-500 text-white border-baltic-500'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          🔥 LP Gas
        </button>
      </div>

      {/* KPI Cards */}
      {commodityFilter === 'all' ? (
        // Overview mode - show both Diesel and LP Gas (2 rows of 5 cards)
        <>
          {/* Row 1: Volume Metrics (5 cards) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-blue-900 font-bold">⛽ Diesel Loaded</p>
                <Droplets className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{metrics.dieselLoaded.toLocaleString()}</p>
              <p className="text-[10px] text-blue-700 mt-1">{metrics.dieselTrips} trips · Litres{getPeriodLabel() && ` · ${getPeriodLabel()}`}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-orange-900 font-bold">🔥 LP Gas Loaded</p>
                <Droplets className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-900">{metrics.lpGasLoaded.toLocaleString()}</p>
              <p className="text-[10px] text-orange-700 mt-1">{metrics.lpGasTrips} trips · Kilograms{getPeriodLabel() && ` · ${getPeriodLabel()}`}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-green-900 font-bold">⛽ Diesel Delivered</p>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">{metrics.dieselOffloaded.toLocaleString()}</p>
              <p className="text-[10px] text-green-700 mt-1">Litres offloaded{getPeriodLabel() && ` · ${getPeriodLabel()}`}</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-amber-900 font-bold">🔥 LP Gas Delivered</p>
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-900">{metrics.lpGasOffloaded.toLocaleString()}</p>
              <p className="text-[10px] text-amber-700 mt-1">Kilograms offloaded{getPeriodLabel() && ` · ${getPeriodLabel()}`}</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-green-900 font-bold">💰 Total Revenue</p>
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">{getCurrencySymbol(company?.currency)} {metrics.totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-green-700 mt-1">{metrics.totalDeliveries} deliveries{getPeriodLabel() && ` · ${getPeriodLabel()}`}</p>
            </div>
          </div>

          {/* Row 2: Financial & Performance Metrics (5 cards) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-blue-900 font-bold">⛽ Diesel Expenses</p>
                <TrendingDown className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{getCurrencySymbol(company?.currency)} {metrics.dieselExpenses.toLocaleString()}</p>
              <p className="text-[10px] text-blue-700 mt-1">{metrics.dieselTrips} trips{getPeriodLabel() && ` · ${getPeriodLabel()}`}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-orange-900 font-bold">🔥 LP Gas Expenses</p>
                <TrendingDown className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-900">{getCurrencySymbol(company?.currency)} {metrics.lpGasExpenses.toLocaleString()}</p>
              <p className="text-[10px] text-orange-700 mt-1">{metrics.lpGasTrips} trips{getPeriodLabel() && ` · ${getPeriodLabel()}`}</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-red-900 font-bold">💸 Total Expenses</p>
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-900">{getCurrencySymbol(company?.currency)} {metrics.totalExpenses.toLocaleString()}</p>
              <p className="text-[10px] text-red-700 mt-1">Trip costs{getPeriodLabel() && ` · ${getPeriodLabel()}`}</p>
            </div>

            <div className={`bg-gradient-to-br rounded-lg p-4 border shadow-sm ${
              metrics.totalProfit >= 0 
                ? 'from-emerald-50 to-emerald-100 border-emerald-200' 
                : 'from-red-50 to-red-100 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-bold ${metrics.totalProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                  📈 Net Profit
                </p>
                <TrendingUp className={`w-4 h-4 ${metrics.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${metrics.totalProfit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                R {metrics.totalProfit.toLocaleString()}
              </p>
              <p className={`text-[10px] mt-1 ${metrics.totalProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {metrics.totalRevenue > 0 ? ((metrics.totalProfit / metrics.totalRevenue) * 100).toFixed(1) : 0}% margin{getPeriodLabel() && ` · ${getPeriodLabel()}`}
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-600 font-medium">Perfect Rate</p>
                <CheckCircle className="w-4 h-4 text-success" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.totalTrips > 0 ? ((metrics.perfectDeliveries / metrics.totalTrips) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-[10px] text-gray-500 mt-1">{metrics.perfectDeliveries} perfect{getPeriodLabel() && ` · ${getPeriodLabel()}`}</p>
            </div>
          </div>
        </>
      ) : (
        // Single commodity view
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Total Loaded</p>
              <Droplets className="w-4 h-4 text-baltic-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.totalLoaded.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {commodityFilter === 'diesel' ? 'Litres loaded' : 'Kilograms loaded'} · <span className="font-semibold">{getPeriodLabel()}</span>
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Total Offloaded</p>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{metrics.totalOffloaded.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {commodityFilter === 'diesel' ? 'Litres delivered' : 'Kilograms delivered'} · <span className="font-semibold">{getPeriodLabel()}</span>
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Total Revenue</p>
              <DollarSign className="w-4 h-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              R {(commodityFilter === 'diesel' ? metrics.dieselRevenue : commodityFilter === 'lpGas' ? metrics.lpGasRevenue : metrics.totalRevenue).toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              {commodityFilter === 'diesel' ? metrics.dieselDeliveries : commodityFilter === 'lpGas' ? metrics.lpGasDeliveries : metrics.totalDeliveries} deliveries · <span className="font-semibold">{getPeriodLabel()}</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-red-900 font-bold">💸 Total Expenses</p>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-900">{getCurrencySymbol(company?.currency)} {metrics.totalExpenses.toLocaleString()}</p>
            <p className="text-[10px] text-red-700 mt-1">{commodityFilter === 'diesel' ? 'Diesel costs' : 'LP Gas costs'} · <span className="font-semibold">{getPeriodLabel()}</span></p>
          </div>

          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-medium">Perfect Rate</p>
              <CheckCircle className="w-4 h-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {metrics.totalTrips > 0 ? ((metrics.perfectDeliveries / metrics.totalTrips) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-[10px] text-gray-500 mt-1">{metrics.perfectDeliveries} perfect · <span className="font-semibold">{getPeriodLabel()}</span></p>
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Trend */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Volume Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="loaded" fill="#3b86c4" name="Loaded (L)" />
              <Bar dataKey="offloaded" fill="#10B981" name="Offloaded (L)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expenses by Month */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Expenses by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={expensesByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748b' }}
                stroke="#cbd5e1"
                tickFormatter={(value) => `${getCurrencySymbol(company?.currency)}${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value) => [`${getCurrencySymbol(company?.currency)}${value.toLocaleString()}`, 'Expenses']}
                labelFormatter={(label) => `Month: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#10B981'
                }}
                labelStyle={{ color: '#10B981', fontWeight: 'bold' }}
                itemStyle={{ color: '#10B981' }}
              />
              <Legend wrapperStyle={{ fontSize: '13px', fontWeight: '600' }} />
              <Line 
                type="monotone" 
                dataKey="totalExpenses" 
                stroke="#EF4444" 
                strokeWidth={3}
                name="Total Expenses"
                dot={{ r: 5, fill: '#EF4444', strokeWidth: 2, stroke: '#7f1d1d' }}
                activeDot={{ r: 7, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
          {expensesByMonth.length > 0 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Total: <span className="font-bold text-danger">{getCurrencySymbol(company?.currency)} {expensesByMonth.reduce((sum, month) => sum + (Number(month.totalExpenses) || 0), 0).toLocaleString()}</span>
                {' '}across {expensesByMonth.length} month(s)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Variance Trend */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Variance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={varianceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="week" 
                tick={{ fontSize: 12, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <Tooltip 
                formatter={(value) => [`${value.toFixed(2)}L`, 'Avg Variance']}
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#10B981'
                }}
                labelStyle={{ color: '#10B981', fontWeight: 'bold' }}
                itemStyle={{ color: '#10B981' }}
              />
              <Legend wrapperStyle={{ fontSize: '13px', fontWeight: '600' }} />
              <Line 
                type="monotone" 
                dataKey="avgVariance" 
                stroke="#F59E0B" 
                strokeWidth={3}
                name="Avg Variance (L)"
                dot={{ r: 5, fill: '#F59E0B', strokeWidth: 2, stroke: '#92400e' }}
                activeDot={{ r: 7, fill: '#F59E0B', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Performing Vehicles */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performing Vehicles</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {vehiclePerformance.length > 0 ? (
              vehiclePerformance.map((vehicle, index) => (
                <div key={vehicle.vehicleId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-baltic-100 flex items-center justify-center text-baltic-700 font-bold text-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{vehicle.vehicleName}</p>
                      <p className="text-xs text-gray-600">{vehicle.registrationNumber || vehicle.vehicleId.slice(-8)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success text-sm">{vehicle.accuracyRate.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500">accuracy</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-br from-baltic-50 to-baltic-100 rounded-lg p-6 border border-baltic-200">
        <h3 className="text-lg font-bold text-baltic-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Key Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 mb-1">Avg Variance</p>
            <p className="text-2xl font-bold text-warning">{metrics.averageVariance.toFixed(2)} L</p>
            <p className="text-xs text-gray-600 mt-1">Per delivery</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 mb-1">Efficiency Rate</p>
            <p className="text-2xl font-bold text-success">
              {metrics.totalLoaded > 0 ? ((metrics.totalOffloaded / metrics.totalLoaded) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-gray-600 mt-1">Offloaded vs Loaded</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-900 mb-1">Avg Revenue/Trip</p>
            <p className="text-2xl font-bold text-baltic-700">
              R {metrics.totalTrips > 0 ? (metrics.totalRevenue / metrics.totalTrips).toFixed(2) : 0}
            </p>
            <p className="text-xs text-gray-600 mt-1">Per trip</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default CommodityAnalyticsPage;
