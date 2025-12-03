/**
 * Commodity Analytics Service
 * Handles analytics and reporting for commodity tracking
 */

import { 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get commodity analytics for a company
 * @param {string} companyId - Company ID
 * @param {Object} filters - Date range and other filters
 * @returns {Promise<Object>} Analytics data
 */
export const getCommodityAnalytics = async (companyId, filters = {}) => {
  try {
    const { startDate, endDate, vehicleIds, commodityType } = filters;

    // Set default date range (last 30 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch load events
    let loadsQuery = query(
      collection(db, 'loadEvents'),
      where('companyId', '==', companyId),
      where('loadDate', '>=', Timestamp.fromDate(start)),
      where('loadDate', '<=', Timestamp.fromDate(end))
    );

    // Fetch offload events
    let offloadsQuery = query(
      collection(db, 'offloadEvents'),
      where('companyId', '==', companyId),
      where('offloadDate', '>=', Timestamp.fromDate(start)),
      where('offloadDate', '<=', Timestamp.fromDate(end))
    );

    const [loadsSnapshot, offloadsSnapshot] = await Promise.all([
      getDocs(loadsQuery),
      getDocs(offloadsQuery)
    ]);

    let loads = loadsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      loadDate: doc.data().loadDate?.toDate()
    }));
    
    let offloads = offloadsSnapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      offloadDate: doc.data().offloadDate?.toDate()
    }));

    // Apply filters
    if (vehicleIds && vehicleIds.length > 0) {
      loads = loads.filter(l => vehicleIds.includes(l.vehicleId));
      offloads = offloads.filter(o => vehicleIds.includes(o.vehicleId));
    }

    if (commodityType) {
      loads = loads.filter(l => l.commodityType === commodityType);
    }

    // Calculate metrics
    const totalVolume = offloads.reduce((sum, o) => sum + (o.offloadQuantity || 0), 0);
    const totalTrips = offloads.length;
    const avgVariance = totalTrips > 0 
      ? offloads.reduce((sum, o) => sum + Math.abs(o.variancePercentage || 0), 0) / totalTrips 
      : 0;

    const reconciliationStats = {
      matched: offloads.filter(o => o.reconciliationStatus === 'matched').length,
      minorVariance: offloads.filter(o => o.reconciliationStatus === 'minor_variance').length,
      majorVariance: offloads.filter(o => o.reconciliationStatus === 'major_variance').length,
      pending: offloads.filter(o => o.reconciliationStatus === 'pending').length
    };

    const autoReconciledPercentage = totalTrips > 0 
      ? (reconciliationStats.matched / totalTrips) * 100 
      : 0;

    return {
      totalVolume: Number(totalVolume.toFixed(2)),
      totalTrips,
      avgVariance: Number(avgVariance.toFixed(2)),
      reconciliationStats,
      autoReconciledPercentage: Number(autoReconciledPercentage.toFixed(2)),
      loads,
      offloads,
      dateRange: { start, end }
    };
  } catch (error) {
    console.error('Error getting commodity analytics:', error);
    throw error;
  }
};

/**
 * Get vehicle performance analytics
 * @param {string} companyId - Company ID
 * @param {Object} filters - Date range filters
 * @returns {Promise<Array>} Vehicle performance data
 */
export const getVehiclePerformance = async (companyId, filters = {}) => {
  try {
    const analytics = await getCommodityAnalytics(companyId, filters);
    const { offloads } = analytics;

    // Group by vehicle
    const vehicleMap = new Map();

    offloads.forEach(offload => {
      const vehicleId = offload.vehicleId;
      
      if (!vehicleMap.has(vehicleId)) {
        vehicleMap.set(vehicleId, {
          vehicleId,
          trips: 0,
          totalVolume: 0,
          variances: [],
          reconciliationStats: {
            matched: 0,
            minorVariance: 0,
            majorVariance: 0
          }
        });
      }

      const vehicle = vehicleMap.get(vehicleId);
      vehicle.trips++;
      vehicle.totalVolume += offload.offloadQuantity || 0;
      vehicle.variances.push(Math.abs(offload.variancePercentage || 0));
      
      if (offload.reconciliationStatus === 'matched') {
        vehicle.reconciliationStats.matched++;
      } else if (offload.reconciliationStatus === 'minor_variance') {
        vehicle.reconciliationStats.minorVariance++;
      } else if (offload.reconciliationStatus === 'major_variance') {
        vehicle.reconciliationStats.majorVariance++;
      }
    });

    // Calculate averages and format
    const vehiclePerformance = Array.from(vehicleMap.values()).map(vehicle => ({
      ...vehicle,
      avgVariance: vehicle.variances.length > 0
        ? vehicle.variances.reduce((sum, v) => sum + v, 0) / vehicle.variances.length
        : 0,
      totalVolume: Number(vehicle.totalVolume.toFixed(2))
    }));

    // Sort by trips descending
    vehiclePerformance.sort((a, b) => b.trips - a.trips);

    return vehiclePerformance;
  } catch (error) {
    console.error('Error getting vehicle performance:', error);
    throw error;
  }
};

/**
 * Get revenue analytics
 * @param {string} companyId - Company ID
 * @param {Object} filters - Date range filters
 * @returns {Promise<Object>} Revenue analytics
 */
export const getRevenueAnalytics = async (companyId, filters = {}) => {
  try {
    const { startDate, endDate } = filters;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Fetch invoices
    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('companyId', '==', companyId),
      where('invoiceDate', '>=', Timestamp.fromDate(start)),
      where('invoiceDate', '<=', Timestamp.fromDate(end))
    );

    // Fetch payments
    const paymentsQuery = query(
      collection(db, 'payments'),
      where('companyId', '==', companyId),
      where('paymentDate', '>=', Timestamp.fromDate(start)),
      where('paymentDate', '<=', Timestamp.fromDate(end))
    );

    const [invoicesSnapshot, paymentsSnapshot] = await Promise.all([
      getDocs(invoicesQuery),
      getDocs(paymentsQuery)
    ]);

    const invoices = invoicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      invoiceDate: doc.data().invoiceDate?.toDate()
    }));

    const payments = paymentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      paymentDate: doc.data().paymentDate?.toDate()
    }));

    // Calculate metrics
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + (pay.amountPaid || 0), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.outstandingBalance || 0), 0);

    const invoicesByStatus = {
      unpaid: invoices.filter(inv => inv.status === 'unpaid').length,
      partial: invoices.filter(inv => inv.status === 'partial').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      overdue: invoices.filter(inv => inv.status === 'overdue' || (inv.dueDate?.toDate() < new Date() && inv.status !== 'paid')).length
    };

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      totalOutstanding: Number(totalOutstanding.toFixed(2)),
      invoiceCount: invoices.length,
      paymentCount: payments.length,
      invoicesByStatus,
      averageInvoiceValue: invoices.length > 0 ? totalRevenue / invoices.length : 0,
      collectionRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
      dateRange: { start, end }
    };
  } catch (error) {
    console.error('Error getting revenue analytics:', error);
    throw error;
  }
};

/**
 * Get volume trends over time
 * @param {string} companyId - Company ID
 * @param {Object} filters - Filters
 * @returns {Promise<Array>} Volume trend data
 */
export const getVolumeTrends = async (companyId, filters = {}) => {
  try {
    const analytics = await getCommodityAnalytics(companyId, filters);
    const { offloads } = analytics;

    // Group by month
    const monthMap = new Map();

    offloads.forEach(offload => {
      const date = offload.offloadDate;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthKey,
          volume: 0,
          trips: 0
        });
      }

      const monthData = monthMap.get(monthKey);
      monthData.volume += offload.offloadQuantity || 0;
      monthData.trips++;
    });

    // Convert to array and sort by month
    const trends = Array.from(monthMap.values())
      .map(data => ({
        ...data,
        volume: Number(data.volume.toFixed(2))
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return trends;
  } catch (error) {
    console.error('Error getting volume trends:', error);
    throw error;
  }
};

/**
 * Get reconciliation trends over time
 * @param {string} companyId - Company ID
 * @param {Object} filters - Filters
 * @returns {Promise<Array>} Reconciliation trend data
 */
export const getReconciliationTrends = async (companyId, filters = {}) => {
  try {
    const analytics = await getCommodityAnalytics(companyId, filters);
    const { offloads } = analytics;

    // Group by month
    const monthMap = new Map();

    offloads.forEach(offload => {
      const date = offload.offloadDate;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthKey,
          matched: 0,
          minorVariance: 0,
          majorDiscrepancy: 0,
          total: 0
        });
      }

      const monthData = monthMap.get(monthKey);
      monthData.total++;
      
      if (offload.reconciliationStatus === 'matched') {
        monthData.matched++;
      } else if (offload.reconciliationStatus === 'minor_variance') {
        monthData.minorVariance++;
      } else if (offload.reconciliationStatus === 'major_variance') {
        monthData.majorDiscrepancy++;
      }
    });

    // Convert to percentages and sort
    const trends = Array.from(monthMap.values())
      .map(data => ({
        month: data.month,
        matched: data.total > 0 ? (data.matched / data.total) * 100 : 0,
        minorVariance: data.total > 0 ? (data.minorVariance / data.total) * 100 : 0,
        majorDiscrepancy: data.total > 0 ? (data.majorDiscrepancy / data.total) * 100 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return trends;
  } catch (error) {
    console.error('Error getting reconciliation trends:', error);
    throw error;
  }
};

/**
 * Get commodity type breakdown
 * @param {string} companyId - Company ID
 * @param {Object} filters - Date range filters
 * @returns {Promise<Array>} Commodity breakdown
 */
export const getCommodityBreakdown = async (companyId, filters = {}) => {
  try {
    const analytics = await getCommodityAnalytics(companyId, filters);
    const { loads } = analytics;

    // Group by commodity type
    const commodityMap = new Map();

    loads.forEach(load => {
      const type = load.commodityType || 'unknown';
      
      if (!commodityMap.has(type)) {
        commodityMap.set(type, {
          commodityType: type,
          volume: 0,
          count: 0
        });
      }

      const commodity = commodityMap.get(type);
      commodity.volume += load.loadQuantity || 0;
      commodity.count++;
    });

    // Calculate percentages
    const totalVolume = Array.from(commodityMap.values()).reduce((sum, c) => sum + c.volume, 0);
    
    const breakdown = Array.from(commodityMap.values())
      .map(data => ({
        ...data,
        volume: Number(data.volume.toFixed(2)),
        percentage: totalVolume > 0 ? (data.volume / totalVolume) * 100 : 0
      }))
      .sort((a, b) => b.volume - a.volume);

    return breakdown;
  } catch (error) {
    console.error('Error getting commodity breakdown:', error);
    throw error;
  }
};

/**
 * Get monthly KPIs for dashboard
 * @param {string} companyId - Company ID
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {Promise<Object>} Monthly KPI data
 */
export const getMonthlyKPIs = async (companyId, year, month) => {
  try {
    // Calculate date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get analytics for current month
    const analytics = await getCommodityAnalytics(companyId, { startDate, endDate });
    const revenueAnalytics = await getRevenueAnalytics(companyId, { startDate, endDate });

    // Get active loads
    const activeLoadsQuery = query(
      collection(db, 'loadEvents'),
      where('companyId', '==', companyId),
      where('status', '==', 'active')
    );
    const activeLoadsSnapshot = await getDocs(activeLoadsQuery);
    const activeLoads = activeLoadsSnapshot.size;

    // Count flagged trips
    const flaggedTrips = analytics.offloads.filter(o => 
      o.reconciliationStatus === 'minor_variance' || 
      o.reconciliationStatus === 'major_variance'
    ).length;
    
    // Get expenses for the period
    const expensesQuery = query(
      collection(db, 'tripExpenses'),
      where('companyId', '==', companyId),
      where('expenseDate', '>=', Timestamp.fromDate(startDate)),
      where('expenseDate', '<=', Timestamp.fromDate(endDate))
    );
    const expensesSnapshot = await getDocs(expensesQuery);
    const totalExpenses = expensesSnapshot.docs.reduce((sum, doc) => {
      return sum + (parseFloat(doc.data().amount) || 0);
    }, 0);
    
    // Determine primary commodity type and unit
    const dieselVolume = analytics.offloads
      .filter(o => o.commodityType === 'diesel')
      .reduce((sum, o) => sum + (o.offloadQuantity || 0), 0);
    const lpGasVolume = analytics.offloads
      .filter(o => o.commodityType === 'lpGas')
      .reduce((sum, o) => sum + (o.offloadQuantity || 0), 0);
    
    const primaryCommodity = dieselVolume > lpGasVolume ? 'diesel' : 'lpGas';
    const volumeUnit = primaryCommodity === 'diesel' ? 'L' : 'kg';

    return {
      totalVolume: analytics.totalVolume,
      volumeUnit,
      dieselVolume: Number(dieselVolume.toFixed(2)),
      lpGasVolume: Number(lpGasVolume.toFixed(2)),
      totalTrips: analytics.totalTrips,
      avgVariancePercentage: analytics.avgVariance,
      autoReconciliationRate: analytics.autoReconciledPercentage,
      activeLoads,
      flaggedTrips,
      totalRevenue: revenueAnalytics.totalRevenue,
      totalExpenses: Number(totalExpenses.toFixed(2)),
      netProfit: Number((revenueAnalytics.totalRevenue - totalExpenses).toFixed(2)),
      // Trends (placeholder - would need previous month data for real trends)
      volumeTrend: 'neutral',
      volumeTrendValue: '0%',
      tripsTrend: 'neutral',
      tripsTrendValue: '0%',
      varianceTrend: 'neutral',
      varianceTrendValue: '0%',
      reconciliationTrend: 'neutral',
      reconciliationTrendValue: '0%'
    };
  } catch (error) {
    console.error('Error getting monthly KPIs:', error);
    throw error;
  }
};
