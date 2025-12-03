import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Commodity Financial Analytics Service
 * Calculates revenue, collection rates, and financial KPIs
 */

/**
 * Get date range for period
 */
const getDateRange = (period) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  
  switch (period) {
    case 'today':
      return {
        start: Timestamp.fromDate(startOfDay),
        end: Timestamp.fromDate(endOfDay)
      };
    
    case 'yesterday':
      const yesterday = new Date(startOfDay);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayEnd = new Date(yesterday);
      yesterdayEnd.setHours(23, 59, 59);
      return {
        start: Timestamp.fromDate(yesterday),
        end: Timestamp.fromDate(yesterdayEnd)
      };
    
    case 'thisWeek':
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay()); // Sunday
      return {
        start: Timestamp.fromDate(startOfWeek),
        end: Timestamp.fromDate(endOfDay)
      };
    
    case 'lastWeek':
      const lastWeekStart = new Date(startOfDay);
      lastWeekStart.setDate(startOfDay.getDate() - startOfDay.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
      lastWeekEnd.setHours(23, 59, 59);
      return {
        start: Timestamp.fromDate(lastWeekStart),
        end: Timestamp.fromDate(lastWeekEnd)
      };
    
    case 'thisMonth':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        start: Timestamp.fromDate(startOfMonth),
        end: Timestamp.fromDate(endOfDay)
      };
    
    case 'lastMonth':
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return {
        start: Timestamp.fromDate(lastMonthStart),
        end: Timestamp.fromDate(lastMonthEnd)
      };
    
    case 'last7Days':
      const last7Start = new Date(startOfDay);
      last7Start.setDate(last7Start.getDate() - 7);
      return {
        start: Timestamp.fromDate(last7Start),
        end: Timestamp.fromDate(endOfDay)
      };
    
    case 'last30Days':
      const last30Start = new Date(startOfDay);
      last30Start.setDate(last30Start.getDate() - 30);
      return {
        start: Timestamp.fromDate(last30Start),
        end: Timestamp.fromDate(endOfDay)
      };
    
    case 'last90Days':
      const last90Start = new Date(startOfDay);
      last90Start.setDate(last90Start.getDate() - 90);
      return {
        start: Timestamp.fromDate(last90Start),
        end: Timestamp.fromDate(endOfDay)
      };
    
    case 'allTime':
      // For all time, start from a very early date (e.g., 10 years ago)
      const allTimeStart = new Date(now.getFullYear() - 10, 0, 1);
      return {
        start: Timestamp.fromDate(allTimeStart),
        end: Timestamp.fromDate(endOfDay)
      };
    
    default:
      return {
        start: Timestamp.fromDate(startOfDay),
        end: Timestamp.fromDate(endOfDay)
      };
  }
};

/**
 * Get financial KPIs for a specific period
 */
export const getFinancialKPIs = async (companyId, period = 'today') => {
  try {
    const { start, end } = getDateRange(period);

    // Fetch invoices for the period
    const invoicesRef = collection(db, 'invoices');
    const invoicesQuery = query(
      invoicesRef,
      where('companyId', '==', companyId),
      where('invoiceDate', '>=', start),
      where('invoiceDate', '<=', end)
    );
    const invoicesSnapshot = await getDocs(invoicesQuery);
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Calculate metrics
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.outstandingBalance || 0), 0);
    
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');
    const partialInvoices = invoices.filter(inv => inv.status === 'partial');
    const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid');
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');

    // Collection rate
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    // Average invoice value
    const avgInvoiceValue = invoices.length > 0 ? totalInvoiced / invoices.length : 0;

    // Average days to payment (for paid invoices)
    let avgDaysToPayment = 0;
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        if (inv.paidAt && inv.invoiceDate) {
          const invoiceDate = inv.invoiceDate.toDate ? inv.invoiceDate.toDate() : new Date(inv.invoiceDate);
          const paidDate = inv.paidAt.toDate ? inv.paidAt.toDate() : new Date(inv.paidAt);
          const days = Math.floor((paidDate - invoiceDate) / (1000 * 60 * 60 * 24));
          return sum + days;
        }
        return sum;
      }, 0);
      avgDaysToPayment = totalDays / paidInvoices.length;
    }

    return {
      period,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      collectionRate,
      avgInvoiceValue,
      avgDaysToPayment,
      invoiceCount: invoices.length,
      paidCount: paidInvoices.length,
      partialCount: partialInvoices.length,
      unpaidCount: unpaidInvoices.length,
      overdueCount: overdueInvoices.length,
      invoices
    };
  } catch (error) {
    console.error('Error getting financial KPIs:', error);
    throw error;
  }
};

/**
 * Get revenue trend data (last 7 days, 30 days, etc.)
 */
export const getRevenueTrend = async (companyId, days = 7) => {
  try {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const invoicesRef = collection(db, 'invoices');
    const invoicesQuery = query(
      invoicesRef,
      where('companyId', '==', companyId),
      where('invoiceDate', '>=', Timestamp.fromDate(startDate))
    );
    const invoicesSnapshot = await getDocs(invoicesQuery);
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Group by date
    const trendData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      trendData[dateKey] = {
        date: dateKey,
        invoiced: 0,
        paid: 0,
        count: 0
      };
    }

    invoices.forEach(invoice => {
      const invoiceDate = invoice.invoiceDate.toDate ? invoice.invoiceDate.toDate() : new Date(invoice.invoiceDate);
      const dateKey = invoiceDate.toISOString().split('T')[0];
      
      if (trendData[dateKey]) {
        trendData[dateKey].invoiced += invoice.total || 0;
        trendData[dateKey].paid += invoice.amountPaid || 0;
        trendData[dateKey].count++;
      }
    });

    return Object.values(trendData);
  } catch (error) {
    console.error('Error getting revenue trend:', error);
    throw error;
  }
};

/**
 * Get payment method distribution
 */
export const getPaymentMethodStats = async (companyId) => {
  try {
    const paymentsRef = collection(db, 'payments');
    const paymentsQuery = query(
      paymentsRef,
      where('companyId', '==', companyId)
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);
    const payments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const methodStats = {};
    payments.forEach(payment => {
      const method = payment.paymentMethod || 'unknown';
      if (!methodStats[method]) {
        methodStats[method] = {
          count: 0,
          total: 0
        };
      }
      methodStats[method].count++;
      methodStats[method].total += payment.amountPaid || 0;
    });

    return methodStats;
  } catch (error) {
    console.error('Error getting payment method stats:', error);
    throw error;
  }
};

/**
 * Get top customers by revenue
 */
export const getTopCustomers = async (companyId, limit = 5) => {
  try {
    const invoicesRef = collection(db, 'invoices');
    const invoicesQuery = query(
      invoicesRef,
      where('companyId', '==', companyId)
    );
    const invoicesSnapshot = await getDocs(invoicesQuery);
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Group by customer
    const customerStats = {};
    invoices.forEach(invoice => {
      const customer = invoice.customer || 'Unknown';
      if (!customerStats[customer]) {
        customerStats[customer] = {
          name: customer,
          totalInvoiced: 0,
          totalPaid: 0,
          invoiceCount: 0
        };
      }
      customerStats[customer].totalInvoiced += invoice.total || 0;
      customerStats[customer].totalPaid += invoice.amountPaid || 0;
      customerStats[customer].invoiceCount++;
    });

    // Sort by total invoiced and return top N
    return Object.values(customerStats)
      .sort((a, b) => b.totalInvoiced - a.totalInvoiced)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting top customers:', error);
    throw error;
  }
};

/**
 * Get overdue invoices summary
 */
export const getOverdueInvoices = async (companyId) => {
  try {
    const now = new Date();
    const invoicesRef = collection(db, 'invoices');
    const invoicesQuery = query(
      invoicesRef,
      where('companyId', '==', companyId),
      where('status', 'in', ['unpaid', 'partial', 'overdue'])
    );
    const invoicesSnapshot = await getDocs(invoicesQuery);
    const invoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filter overdue
    const overdueInvoices = invoices.filter(invoice => {
      const dueDate = invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate);
      return dueDate < now && invoice.status !== 'paid';
    });

    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.outstandingBalance || 0), 0);

    return {
      count: overdueInvoices.length,
      totalAmount: totalOverdue,
      invoices: overdueInvoices.sort((a, b) => {
        const aDate = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
        const bDate = b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate);
        return aDate - bDate; // Oldest first
      })
    };
  } catch (error) {
    console.error('Error getting overdue invoices:', error);
    throw error;
  }
};

/**
 * Compare periods (e.g., this week vs last week)
 */
export const comparePeriods = async (companyId, currentPeriod, previousPeriod) => {
  try {
    const current = await getFinancialKPIs(companyId, currentPeriod);
    const previous = await getFinancialKPIs(companyId, previousPeriod);

    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      current,
      previous,
      changes: {
        revenue: calculateChange(current.totalInvoiced, previous.totalInvoiced),
        paid: calculateChange(current.totalPaid, previous.totalPaid),
        collectionRate: current.collectionRate - previous.collectionRate,
        invoiceCount: calculateChange(current.invoiceCount, previous.invoiceCount)
      }
    };
  } catch (error) {
    console.error('Error comparing periods:', error);
    throw error;
  }
};
