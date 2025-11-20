import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Building2, 
  Target,
  Activity,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Zap
} from 'lucide-react';

const FleetTrackBusinessPage = () => {
  usePageTitle('FleetTrack Business Analytics');
  const [loading, setLoading] = useState(true);
  const [businessMetrics, setBusinessMetrics] = useState({
    // Revenue Metrics
    mrr: 0, // Monthly Recurring Revenue
    arr: 0, // Annual Recurring Revenue
    totalRevenue: 0,
    revenueGrowth: 0,
    
    // Customer Metrics
    totalCustomers: 0,
    activeCustomers: 0,
    trialCustomers: 0,
    paidCustomers: 0,
    customerGrowth: 0,
    churnRate: 0,
    
    // Financial Metrics
    averageRevenuePerCustomer: 0,
    customerLifetimeValue: 0,
    customerAcquisitionCost: 0,
    
    // Growth Metrics
    newCustomersThisMonth: 0,
    newCustomersLastMonth: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0,
    
    // Platform Usage
    totalVehicles: 0,
    totalTrips: 0,
    totalUsers: 0,
    avgVehiclesPerCompany: 0,
    avgUsersPerCompany: 0,
    
    // Engagement Metrics
    activeUsageRate: 0,
    dailyActiveCompanies: 0,
    weeklyActiveCompanies: 0,
    monthlyActiveCompanies: 0,
  });

  const [insights, setInsights] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [growthHistory, setGrowthHistory] = useState([]);

  useEffect(() => {
    fetchBusinessMetrics();
  }, []);

  const fetchBusinessMetrics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Fetch all companies
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      const companies = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate()
      }));

      // Fetch all vehicles
      const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
      const totalVehicles = vehiclesSnapshot.size;

      // Fetch all daily entries (for trip counting)
      const entriesSnapshot = await getDocs(collection(db, 'dailyEntries'));
      const totalTrips = entriesSnapshot.size;

      // Calculate customer metrics
      const totalCustomers = companies.length;
      const activeCustomers = companies.filter(c => {
        const createdAt = c.createdAt || new Date(0);
        return createdAt < now;
      }).length;

      // Subscription status breakdown
      const trialCustomers = companies.filter(c => c.subscriptionStatus === 'trial').length;
      const paidCustomers = companies.filter(c => c.subscriptionStatus === 'active' || c.subscriptionStatus === 'paid').length;

      // New customers this month vs last month
      const newCustomersThisMonth = companies.filter(c => {
        const createdAt = c.createdAt || new Date(0);
        return createdAt >= startOfThisMonth;
      }).length;

      const newCustomersLastMonth = companies.filter(c => {
        const createdAt = c.createdAt || new Date(0);
        return createdAt >= startOfLastMonth && createdAt <= endOfLastMonth;
      }).length;

      // Calculate customer growth rate
      const customerGrowth = newCustomersLastMonth > 0 
        ? ((newCustomersThisMonth - newCustomersLastMonth) / newCustomersLastMonth * 100).toFixed(1)
        : 100;

      // Revenue calculations (simplified - assuming subscription pricing)
      const subscriptionPrice = 499; // R499 per month per company
      const mrr = paidCustomers * subscriptionPrice;
      const arr = mrr * 12;
      const totalRevenue = arr; // Simplified total revenue

      // Revenue growth
      const companiesLastMonth = companies.filter(c => {
        const createdAt = c.createdAt || new Date(0);
        return createdAt < startOfThisMonth;
      }).length;
      const revenueLastMonth = companiesLastMonth * subscriptionPrice;
      const revenueThisMonth = mrr;
      const revenueGrowth = revenueLastMonth > 0
        ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1)
        : 0;

      // Customer metrics
      const averageRevenuePerCustomer = paidCustomers > 0 ? (mrr / paidCustomers).toFixed(0) : 0;
      const customerLifetimeValue = (averageRevenuePerCustomer * 24).toFixed(0); // Assuming 24-month lifetime
      const customerAcquisitionCost = 150; // Placeholder - would need actual marketing spend data

      // Churn rate (simplified)
      const churnRate = totalCustomers > 0 ? (2 / totalCustomers * 100).toFixed(1) : 0; // Placeholder

      // Engagement metrics
      const usersWithRecentLogin = allUsers.filter(u => {
        const lastLogin = u.lastLogin || new Date(0);
        return lastLogin >= thirtyDaysAgo;
      }).length;

      const activeUsageRate = allUsers.length > 0 
        ? (usersWithRecentLogin / allUsers.length * 100).toFixed(1)
        : 0;

      // Active companies (companies with recent entries)
      const recentEntriesSnapshot = await getDocs(
        query(collection(db, 'dailyEntries'), where('date', '>=', Timestamp.fromDate(thirtyDaysAgo)))
      );
      const companiesWithRecentActivity = new Set(
        recentEntriesSnapshot.docs.map(doc => doc.data().companyId)
      ).size;

      // Calculate averages
      const avgVehiclesPerCompany = totalCustomers > 0 ? (totalVehicles / totalCustomers).toFixed(1) : 0;
      const avgUsersPerCompany = totalCustomers > 0 ? (allUsers.length / totalCustomers).toFixed(1) : 0;

      // Generate insights
      const generatedInsights = generateBusinessInsights({
        customerGrowth,
        revenueGrowth,
        churnRate,
        trialCustomers,
        paidCustomers,
        activeUsageRate,
        companiesWithRecentActivity,
        totalCustomers
      });

      // Top performing companies (by number of trips)
      const companyTrips = {};
      entriesSnapshot.docs.forEach(doc => {
        const companyId = doc.data().companyId;
        companyTrips[companyId] = (companyTrips[companyId] || 0) + 1;
      });

      const topCompanies = companies
        .map(c => ({
          ...c,
          tripCount: companyTrips[c.id] || 0
        }))
        .sort((a, b) => b.tripCount - a.tripCount)
        .slice(0, 5);

      setBusinessMetrics({
        mrr,
        arr,
        totalRevenue,
        revenueGrowth: parseFloat(revenueGrowth),
        totalCustomers,
        activeCustomers,
        trialCustomers,
        paidCustomers,
        customerGrowth: parseFloat(customerGrowth),
        churnRate: parseFloat(churnRate),
        averageRevenuePerCustomer: parseFloat(averageRevenuePerCustomer),
        customerLifetimeValue: parseFloat(customerLifetimeValue),
        customerAcquisitionCost,
        newCustomersThisMonth,
        newCustomersLastMonth,
        revenueThisMonth,
        revenueLastMonth,
        totalVehicles,
        totalTrips,
        totalUsers: allUsers.length,
        avgVehiclesPerCompany: parseFloat(avgVehiclesPerCompany),
        avgUsersPerCompany: parseFloat(avgUsersPerCompany),
        activeUsageRate: parseFloat(activeUsageRate),
        monthlyActiveCompanies: companiesWithRecentActivity,
      });

      setInsights(generatedInsights);
      setTopPerformers(topCompanies);

      // Generate growth history for chart (last 6 months)
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        const monthCompanies = companies.filter(c => {
          const createdAt = c.createdAt || new Date(0);
          return createdAt <= monthEnd;
        }).length;
        
        const monthRevenue = monthCompanies * subscriptionPrice;
        
        monthlyData.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          customers: monthCompanies,
          revenue: monthRevenue,
          mrr: monthRevenue
        });
      }
      setGrowthHistory(monthlyData);
    } catch (error) {
      console.error('Error fetching business metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBusinessInsights = (metrics) => {
    const insights = [];

    // Customer growth insight
    if (metrics.customerGrowth > 20) {
      insights.push({
        type: 'success',
        title: '🚀 Excellent Customer Growth!',
        message: `You're growing ${metrics.customerGrowth}% month-over-month. Keep up the momentum with targeted marketing campaigns.`
      });
    } else if (metrics.customerGrowth > 0) {
      insights.push({
        type: 'info',
        title: '📈 Steady Growth',
        message: `Growing ${metrics.customerGrowth}% this month. Consider increasing marketing efforts to accelerate growth.`
      });
    } else {
      insights.push({
        type: 'warning',
        title: '⚠️ Growth Opportunity',
        message: 'Customer acquisition has slowed. Focus on marketing and customer success initiatives.'
      });
    }

    // Conversion rate insight
    const conversionRate = metrics.paidCustomers > 0 
      ? (metrics.paidCustomers / (metrics.paidCustomers + metrics.trialCustomers) * 100).toFixed(1)
      : 0;
    
    if (conversionRate < 30) {
      insights.push({
        type: 'warning',
        title: '💡 Trial Conversion Opportunity',
        message: `Only ${conversionRate}% of trials convert to paid. Consider onboarding improvements and follow-up campaigns.`
      });
    } else if (conversionRate > 50) {
      insights.push({
        type: 'success',
        title: '✨ Great Conversion Rate!',
        message: `${conversionRate}% trial-to-paid conversion is excellent. Your onboarding is working well!`
      });
    }

    // Churn insight
    if (metrics.churnRate > 5) {
      insights.push({
        type: 'danger',
        title: '🚨 High Churn Alert',
        message: `${metrics.churnRate}% monthly churn is concerning. Reach out to at-risk customers and improve retention strategies.`
      });
    }

    // Engagement insight
    if (metrics.activeUsageRate < 50) {
      insights.push({
        type: 'warning',
        title: '📊 Low User Engagement',
        message: `Only ${metrics.activeUsageRate}% of users are active. Focus on user engagement and training programs.`
      });
    } else if (metrics.activeUsageRate > 80) {
      insights.push({
        type: 'success',
        title: '🎯 Excellent Engagement!',
        message: `${metrics.activeUsageRate}% user engagement shows strong product-market fit. Great job!`
      });
    }

    // Active companies insight
    const activeRate = (metrics.companiesWithRecentActivity / metrics.totalCustomers * 100).toFixed(1);
    if (activeRate < 60) {
      insights.push({
        type: 'warning',
        title: '🔔 Customer Activation Needed',
        message: `Only ${activeRate}% of companies are actively using the platform. Consider re-engagement campaigns.`
      });
    }

    return insights;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading business metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              FleetTrack Business Analytics
            </h1>
            <p className="text-slate-400 text-sm">
              Track FleetTrack's growth, revenue, and business performance
            </p>
          </div>
          <button
            onClick={fetchBusinessMetrics}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-lg"
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh Data</span>
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>

        {/* Revenue Metrics */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Revenue & Financial Metrics
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-900/40 to-slate-900 border border-green-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-green-300 font-semibold uppercase tracking-wide">MRR</p>
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                R{businessMetrics.mrr.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 text-xs">
                {businessMetrics.revenueGrowth >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-400" />
                )}
                <span className={businessMetrics.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {Math.abs(businessMetrics.revenueGrowth)}% this month
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-900/40 to-slate-900 border border-blue-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-blue-300 font-semibold uppercase tracking-wide">ARR</p>
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                R{businessMetrics.arr.toLocaleString()}
              </p>
              <p className="text-xs text-blue-300">Annual recurring revenue</p>
            </div>

            <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-purple-300 font-semibold uppercase tracking-wide">ARPC</p>
                <PieChart className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                R{businessMetrics.averageRevenuePerCustomer}
              </p>
              <p className="text-xs text-purple-300">Avg revenue per customer</p>
            </div>

            <div className="bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-500/30 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">LTV</p>
                <Target className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                R{businessMetrics.customerLifetimeValue}
              </p>
              <p className="text-xs text-amber-300">Customer lifetime value</p>
            </div>
          </div>
        </div>

        {/* Customer Metrics */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Customer Growth & Acquisition
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Total Customers</p>
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {businessMetrics.totalCustomers}
              </p>
              <div className="flex items-center gap-1 text-xs">
                {businessMetrics.customerGrowth >= 0 ? (
                  <ArrowUpRight className="w-3 h-3 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-3 h-3 text-red-400" />
                )}
                <span className={businessMetrics.customerGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {Math.abs(businessMetrics.customerGrowth)}% growth
                </span>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Paid Customers</p>
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {businessMetrics.paidCustomers}
              </p>
              <p className="text-xs text-slate-400">
                {businessMetrics.totalCustomers > 0 
                  ? ((businessMetrics.paidCustomers / businessMetrics.totalCustomers * 100).toFixed(0))
                  : 0}% conversion rate
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Trial Customers</p>
                <Calendar className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {businessMetrics.trialCustomers}
              </p>
              <p className="text-xs text-slate-400">Potential conversions</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">New This Month</p>
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                +{businessMetrics.newCustomersThisMonth}
              </p>
              <p className="text-xs text-slate-400">
                vs {businessMetrics.newCustomersLastMonth} last month
              </p>
            </div>
          </div>
        </div>

        {/* Platform Usage Metrics */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Platform Usage & Engagement
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Total Users</p>
              <p className="text-3xl font-bold text-white mb-1">
                {businessMetrics.totalUsers}
              </p>
              <p className="text-xs text-slate-400">
                Avg {businessMetrics.avgUsersPerCompany} per company
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Total Vehicles</p>
              <p className="text-3xl font-bold text-white mb-1">
                {businessMetrics.totalVehicles}
              </p>
              <p className="text-xs text-slate-400">
                Avg {businessMetrics.avgVehiclesPerCompany} per company
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Total Trips</p>
              <p className="text-3xl font-bold text-white mb-1">
                {businessMetrics.totalTrips.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">All-time entries captured</p>
            </div>

            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Active Rate</p>
              <p className="text-3xl font-bold text-white mb-1">
                {businessMetrics.activeUsageRate}%
              </p>
              <p className="text-xs text-slate-400">
                {businessMetrics.monthlyActiveCompanies} companies active
              </p>
            </div>
          </div>
        </div>

        {/* Growth Chart */}
        {growthHistory.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Revenue & Customer Growth Trend
            </h2>
            <div className="space-y-4">
              {/* Chart */}
              <div className="relative h-64">
                <div className="absolute inset-0 flex items-end justify-between gap-2 px-2">
                  {growthHistory.map((data, index) => {
                    const maxRevenue = Math.max(...growthHistory.map(d => d.revenue), 1);
                    const heightPercent = (data.revenue / maxRevenue) * 100;
                    const isLast = index === growthHistory.length - 1;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        {/* Value label */}
                        <div className="text-xs font-semibold text-green-400 mb-1">
                          R{(data.revenue / 1000).toFixed(1)}k
                        </div>
                        {/* Bar */}
                        <div 
                          className={`w-full rounded-t-lg transition-all duration-500 ${
                            isLast 
                              ? 'bg-gradient-to-t from-green-600 to-green-400' 
                              : 'bg-gradient-to-t from-blue-900/60 to-blue-700/60'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        >
                          <div className="relative w-full h-full">
                            {/* Customer count overlay */}
                            <div className="absolute top-2 left-0 right-0 text-center">
                              <span className="text-xs font-medium text-white/90">
                                {data.customers}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Month label */}
                        <div className="text-xs text-slate-400 mt-2 -rotate-45 origin-center whitespace-nowrap">
                          {data.month}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-t from-blue-900/60 to-blue-700/60"></div>
                  <span className="text-xs text-slate-400">Historical Months</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-gradient-to-t from-green-600 to-green-400"></div>
                  <span className="text-xs text-slate-400">Current Month</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-white/90 font-semibold">Numbers</div>
                  <span className="text-xs text-slate-400">= Customer Count</span>
                </div>
              </div>

              {/* Key Metrics Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-700">
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">Revenue Growth Rate</p>
                  <p className={`text-2xl font-bold ${businessMetrics.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {businessMetrics.revenueGrowth >= 0 ? '+' : ''}{businessMetrics.revenueGrowth}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">Customer Growth Rate</p>
                  <p className={`text-2xl font-bold ${businessMetrics.customerGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {businessMetrics.customerGrowth >= 0 ? '+' : ''}{businessMetrics.customerGrowth}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">LTV:CAC Ratio</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {(businessMetrics.customerLifetimeValue / businessMetrics.customerAcquisitionCost).toFixed(1)}:1
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Business Insights */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Business Insights & Opportunities
            </h2>
            {insights.map((insight, index) => {
              const colorClass = insight.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                                 insight.type === 'warning' ? 'bg-orange-500/10 border-orange-500/30' :
                                 insight.type === 'danger' ? 'bg-red-500/10 border-red-500/30' :
                                 'bg-blue-500/10 border-blue-500/30';
              return (
                <div key={index} className={`${colorClass} border rounded-xl p-4`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-sm mb-1">{insight.title}</h3>
                      <p className="text-slate-300 text-sm">{insight.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Top Performing Companies */}
        {topPerformers.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-yellow-400" />
              Top Performing Companies
            </h2>
            <div className="space-y-3">
              {topPerformers.map((company, index) => (
                <div key={company.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                      ${index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        index === 1 ? 'bg-slate-400/20 text-slate-300' :
                        index === 2 ? 'bg-amber-700/20 text-amber-400' :
                        'bg-slate-700 text-slate-400'}`}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{company.name}</p>
                      <p className="text-xs text-slate-400">{company.tripCount} trips recorded</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">
                      {company.subscriptionStatus === 'active' || company.subscriptionStatus === 'paid' ? 'Paid' : 'Trial'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Growth Metrics Summary */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">📊 Growth Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400 mb-1">Customer Acquisition</p>
              <p className="text-xl font-bold text-white">
                {businessMetrics.newCustomersThisMonth} / month
              </p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">Monthly Churn</p>
              <p className="text-xl font-bold text-white">
                {businessMetrics.churnRate}%
              </p>
            </div>
            <div>
              <p className="text-slate-400 mb-1">LTV:CAC Ratio</p>
              <p className="text-xl font-bold text-white">
                {(businessMetrics.customerLifetimeValue / businessMetrics.customerAcquisitionCost).toFixed(1)}:1
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetTrackBusinessPage;
