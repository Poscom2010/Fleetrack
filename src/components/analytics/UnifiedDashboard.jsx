import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { TrendingUp, TrendingDown, DollarSign, Package, Truck, Activity } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const UnifiedDashboard = () => {
  const { company } = useAuth();
  const { isDark } = useTheme();
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    totalProfit: 0,
    fleetRevenue: 0,
    commodityRevenue: 0,
    fleetExpenses: 0,
    commodityExpenses: 0,
    activeVehicles: 0,
    totalTrips: 0,
    totalLoads: 0,
    vehicleData: [],
    profitTrend: [],
    expenseTrend: [],
    loading: true
  });

  useEffect(() => {
    if (company?.id) {
      loadUnifiedMetrics();
    }
  }, [company?.id]);

  const loadUnifiedMetrics = async () => {
    try {
      setMetrics(prev => ({ ...prev, loading: true }));

      // Fetch Active Vehicles FIRST to filter data
      const vehiclesRef = collection(db, 'vehicles');
      const vehiclesQuery = query(
        vehiclesRef,
        where('companyId', '==', company.id)
      );
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const vehicleIds = new Set();
      vehiclesSnapshot.forEach(doc => vehicleIds.add(doc.id));

      // Fetch Fleet Operations Data (Daily Entries) - no date filter to avoid index issues
      const entriesRef = collection(db, 'dailyEntries');
      const entriesQuery = query(
        entriesRef,
        where('companyId', '==', company.id)
      );
      const entriesSnapshot = await getDocs(entriesQuery);
      
      let fleetCashIn = 0;
      let fleetExpenses = 0;
      let tripCount = 0;
      entriesSnapshot.forEach(doc => {
        const data = doc.data();
        // Only count entries for existing vehicles
        if (!vehicleIds.has(data.vehicleId)) return;
        fleetCashIn += data.cashIn || 0;
        fleetExpenses += (data.fuelExpense || 0) + (data.repairsExpense || 0) + (data.otherExpenses || 0);
        tripCount++;
      });

      // Fetch standalone fleet expenses
      const expensesRef = collection(db, 'expenses');
      const expensesQuery = query(
        expensesRef,
        where('companyId', '==', company.id)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      expensesSnapshot.forEach(doc => {
        const data = doc.data();
        // Only count expenses for existing vehicles (or expenses without vehicleId)
        if (data.vehicleId && !vehicleIds.has(data.vehicleId)) return;
        fleetExpenses += data.amount || 0;
      });

      // Fetch Commodity Data (Invoices for revenue)
      const invoicesRef = collection(db, 'invoices');
      const invoicesQuery = query(
        invoicesRef,
        where('companyId', '==', company.id)
      );
      const invoicesSnapshot = await getDocs(invoicesQuery);
      
      let commodityRevenue = 0;
      invoicesSnapshot.forEach(doc => {
        const data = doc.data();
        commodityRevenue += data.totalAmount || 0;
      });

      // Fetch Commodity Expenses (Trip Expenses)
      const tripExpensesRef = collection(db, 'tripExpenses');
      const tripExpensesQuery = query(
        tripExpensesRef,
        where('companyId', '==', company.id)
      );
      const tripExpensesSnapshot = await getDocs(tripExpensesQuery);
      
      let commodityExpenses = 0;
      tripExpensesSnapshot.forEach(doc => {
        const data = doc.data();
        commodityExpenses += data.amount || 0;
      });

      // Use already fetched vehicles data
      const activeVehicles = vehiclesSnapshot.size;
      
      // Build vehicle data for charts
      const vehicleMap = {};
      vehiclesSnapshot.forEach(doc => {
        const data = doc.data();
        vehicleMap[doc.id] = {
          id: doc.id,
          name: data.name || data.registrationNumber || 'Unknown',
          type: data.vehicleType || 'traditional',
          revenue: 0,
          expenses: 0,
          profit: 0
        };
      });

      // Aggregate fleet data by vehicle and build trend data (only for existing vehicles)
      const dailyData = {};
      entriesSnapshot.forEach(doc => {
        const data = doc.data();
        // Only count entries for existing vehicles
        if (!vehicleIds.has(data.vehicleId)) return;
        
        if (vehicleMap[data.vehicleId]) {
          vehicleMap[data.vehicleId].revenue += data.cashIn || 0;
          vehicleMap[data.vehicleId].expenses += (data.fuelExpense || 0) + (data.repairsExpense || 0) + (data.otherExpenses || 0);
        }
        
        // Build daily trend data
        const dateKey = data.timestamp?.toDate?.()?.toISOString?.()?.split('T')[0] || 
                        data.date || 
                        new Date().toISOString().split('T')[0];
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { cashIn: 0, expenses: 0 };
        }
        dailyData[dateKey].cashIn += data.cashIn || 0;
        dailyData[dateKey].expenses += (data.fuelExpense || 0) + (data.repairsExpense || 0) + (data.otherExpenses || 0);
      });

      // Add standalone expenses to daily data (only for existing vehicles)
      expensesSnapshot.forEach(doc => {
        const data = doc.data();
        // Only count expenses for existing vehicles (or expenses without vehicleId)
        if (data.vehicleId && !vehicleIds.has(data.vehicleId)) return;
        
        const dateKey = data.timestamp?.toDate?.()?.toISOString?.()?.split('T')[0] || 
                        data.date || 
                        new Date().toISOString().split('T')[0];
        if (!dailyData[dateKey]) {
          dailyData[dateKey] = { cashIn: 0, expenses: 0 };
        }
        dailyData[dateKey].expenses += data.amount || 0;
      });

      // Convert to sorted arrays for charts
      const sortedDates = Object.keys(dailyData).sort();
      let cumulativeProfit = 0;
      let cumulativeExpenses = 0;
      
      const profitTrend = sortedDates.map(date => {
        const dayData = dailyData[date];
        const dayProfit = dayData.cashIn - dayData.expenses;
        cumulativeProfit += dayProfit;
        return {
          date,
          profit: cumulativeProfit,
          cashIn: dayData.cashIn,
          expenses: dayData.expenses
        };
      });

      const expenseTrend = sortedDates.map(date => {
        const dayData = dailyData[date];
        cumulativeExpenses += dayData.expenses;
        return {
          date,
          expenses: cumulativeExpenses
        };
      });

      // Calculate profit for each vehicle
      Object.values(vehicleMap).forEach(v => {
        v.profit = v.revenue - v.expenses;
      });

      const vehicleData = Object.values(vehicleMap).filter(v => v.revenue > 0 || v.expenses > 0);

      // Fetch Load Events Count
      const loadEventsRef = collection(db, 'loadEvents');
      const loadEventsQuery = query(
        loadEventsRef,
        where('companyId', '==', company.id)
      );
      const loadEventsSnapshot = await getDocs(loadEventsQuery);

      const totalRevenue = fleetCashIn + commodityRevenue;
      const totalExpenses = fleetExpenses + commodityExpenses;
      const totalProfit = totalRevenue - totalExpenses;

      setMetrics({
        totalRevenue,
        totalExpenses,
        totalProfit,
        fleetRevenue: fleetCashIn,
        commodityRevenue,
        fleetExpenses,
        commodityExpenses,
        activeVehicles,
        totalTrips: tripCount,
        totalLoads: loadEventsSnapshot.size,
        vehicleData,
        profitTrend,
        expenseTrend,
        loading: false
      });
    } catch (error) {
      console.error('Error loading unified metrics:', error);
      setMetrics(prev => ({ ...prev, loading: false }));
    }
  };

  const formatCurrency = (amount) => {
    const currencyCode = company?.currency || 'USD';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(amount);
    } catch (e) {
      // Fallback for unsupported currencies
      const symbols = { USD: '$', EUR: '€', GBP: '£', ZAR: 'R', BWP: 'P', NAD: 'N$' };
      const symbol = symbols[currencyCode] || currencyCode;
      return `${symbol}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
  };

  const KPICard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className={`rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow ${
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className={`text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {title}
          </p>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
          color === 'green' 
            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
            : color === 'red'
            ? 'bg-gradient-to-br from-red-500 to-rose-600'
            : color === 'blue'
            ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
            : 'bg-gradient-to-br from-baltic-500 to-baltic-600'
        }`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </p>
      </div>
      {subtitle && (
        <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          {subtitle}
        </p>
      )}
    </div>
  );

  if (metrics.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-baltic-500"></div>
      </div>
    );
  }

  const profitMargin = metrics.totalRevenue > 0 
    ? ((metrics.totalProfit / metrics.totalRevenue) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
            Business Overview
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
            Consolidated metrics • Fleet Operations + Commodity Tracking
          </p>
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          subtitle={`Fleet: ${formatCurrency(metrics.fleetRevenue)} • Commodity: ${formatCurrency(metrics.commodityRevenue)}`}
          icon={DollarSign}
          color="blue"
        />
        <KPICard
          title="Total Expenses"
          value={formatCurrency(metrics.totalExpenses)}
          subtitle="Combined operations"
          icon={Package}
          color="red"
        />
        <KPICard
          title="Net Profit"
          value={formatCurrency(metrics.totalProfit)}
          subtitle={`${profitMargin}% margin`}
          icon={TrendingUp}
          color={metrics.totalProfit >= 0 ? 'green' : 'red'}
        />
        <KPICard
          title="Active Fleet"
          value={metrics.activeVehicles}
          subtitle={`${metrics.totalTrips} trips • ${metrics.totalLoads} loads`}
          icon={Truck}
          color="gray"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by Source Pie Chart */}
        <div className={`rounded-lg border p-4 ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-baltic-900'}`}>
            Revenue by Source
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Fleet Operations', value: metrics.fleetRevenue, color: '#3b82f6' },
                    { name: 'Commodity', value: metrics.commodityRevenue, color: '#f59e0b' }
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {[
                    { name: 'Fleet Operations', value: metrics.fleetRevenue, color: '#3b82f6' },
                    { name: 'Commodity', value: metrics.commodityRevenue, color: '#f59e0b' }
                  ].filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs shadow-md">
                          <p className="font-semibold text-gray-800">{payload[0].name}</p>
                          <p className="text-gray-600">{formatCurrency(payload[0].value)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value) => <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses by Source Pie Chart */}
        <div className={`rounded-lg border p-4 ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-baltic-900'}`}>
            Expenses by Source
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Fleet Operations', value: metrics.fleetExpenses, color: '#ef4444' },
                    { name: 'Commodity', value: metrics.commodityExpenses, color: '#f97316' }
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {[
                    { name: 'Fleet Operations', value: metrics.fleetExpenses, color: '#ef4444' },
                    { name: 'Commodity', value: metrics.commodityExpenses, color: '#f97316' }
                  ].filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs shadow-md">
                          <p className="font-semibold text-gray-800">{payload[0].name}</p>
                          <p className="text-gray-600">{formatCurrency(payload[0].value)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  formatter={(value) => <span className={isDark ? 'text-slate-300' : 'text-gray-700'}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cumulative Profit Over Time Chart */}
      {metrics.profitTrend.length > 0 && (
        <div className={`rounded-lg border p-4 ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="mb-3 flex items-center gap-2">
            <div className={`rounded-lg p-1.5 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
              <span className="text-base">📈</span>
            </div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
              Cumulative Profit Over Time
            </h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.profitTrend.map(item => ({
                ...item,
                date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
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
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  name="Profit"
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 1 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cashIn" 
                  stroke="#6b7280" 
                  strokeWidth={2} 
                  name="Cash In"
                  dot={{ r: 3, fill: '#6b7280' }}
                  activeDot={{ r: 5, fill: '#6b7280', stroke: '#fff', strokeWidth: 1 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  name="Expenses"
                  dot={{ r: 3, fill: '#f59e0b' }}
                  activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 1 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cumulative Expenses Over Time Chart */}
      {metrics.expenseTrend.length > 0 && (
        <div className={`rounded-lg border p-4 ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <div className="mb-3 flex items-center gap-2">
            <div className={`rounded-lg p-1.5 ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
              <span className="text-base">📉</span>
            </div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
              Cumulative Expenses Over Time
            </h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.expenseTrend.map(item => ({
                ...item,
                date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              }))}>
                <defs>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs shadow-md">
                          <p className="font-semibold text-gray-800 mb-1">{label}</p>
                          <p className="text-gray-600">
                            <span style={{ color: '#f59e0b' }}>●</span> Expenses: {formatCurrency(payload[0].value)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  fill="url(#expenseGradient)"
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Vehicle Profit Comparison Chart */}
      {metrics.vehicleData.length > 0 && (
        <div className={`rounded-lg border p-4 ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-baltic-900'}`}>
            Profit by Vehicle (All Fleet)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.vehicleData.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                  width={80}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs shadow-md">
                          <p className="font-semibold text-gray-800 mb-1">{data.name}</p>
                          <p className="text-gray-600">Revenue: {formatCurrency(data.revenue)}</p>
                          <p className="text-gray-600">Expenses: {formatCurrency(data.expenses)}</p>
                          <p className={`font-semibold ${data.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            Profit: {formatCurrency(data.profit)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="profit" 
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                >
                  {metrics.vehicleData.slice(0, 10).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Revenue Split Summary */}
      {(metrics.fleetRevenue > 0 || metrics.commodityRevenue > 0) && (
        <div className={`rounded-lg border p-4 ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-baltic-900'}`}>
            Revenue & Expense Summary
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Revenue Split</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Fleet</span>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(metrics.fleetRevenue)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Commodity</span>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(metrics.commodityRevenue)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Expense Split</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Fleet</span>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(metrics.fleetExpenses)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Commodity</span>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatCurrency(metrics.commodityExpenses)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedDashboard;
