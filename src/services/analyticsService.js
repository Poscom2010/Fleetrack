import { getDailyEntries, getExpenses, getCompanyDailyEntries, getCompanyExpenses } from "./entryService";
import { getVehicles, updateVehicle, getCompanyVehicles } from "./vehicleService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  calculateProfit,
  calculateTotal,
  calculateProfitMargin,
  aggregateByVehicle,
  aggregateExpensesByVehicle,
  aggregateExpensesByCategory,
  groupByDate,
  calculateDailyTotals,
  findTopPerformer,
  findLowPerformer,
} from "../utils/calculations";

/**
 * Get comprehensive analytics data for a user or company
 * @param {string} userId - The user ID
 * @param {Object} filters - Optional filters (startDate, endDate)
 * @param {Object} userProfile - Optional user profile to determine if admin/manager
 * @returns {Promise<Object>} Analytics data
 */
export const getAnalyticsData = async (userId, filters = {}, userProfile = null) => {
  try {
    // Determine if user is admin/manager who should see all company data
    const isAdminOrManager = userProfile && (
      userProfile.role === 'company_admin' || 
      userProfile.role === 'company_manager'
    );
    
    const companyId = userProfile?.companyId;

    // Fetch all required data - use company-wide functions for admins/managers
    let vehicles, dailyEntries, expenses;
    
    if (isAdminOrManager && companyId) {
      // Admins and managers see ALL company data
      [vehicles, dailyEntries, expenses] = await Promise.all([
        getCompanyVehicles(companyId),
        getCompanyDailyEntries(companyId, filters),
        getCompanyExpenses(companyId, filters),
      ]);
    } else {
      // Drivers see only their own data
      [vehicles, dailyEntries, expenses] = await Promise.all([
        getVehicles(userId),
        getDailyEntries(userId, filters),
        getExpenses(userId, filters),
      ]);
    }

    // Calculate totals
    const totalCashIn = calculateTotal(dailyEntries.map((e) => e.cashIn));
    const totalExpenses = calculateTotal(expenses.map((e) => e.amount));
    const totalProfit = calculateProfit(totalCashIn, totalExpenses);
    const totalMileage = calculateTotal(
      dailyEntries.map((e) => e.distanceTraveled)
    );

    // Calculate averages
    const avgDailyCashIn =
      dailyEntries.length > 0 ? totalCashIn / dailyEntries.length : 0;
    const avgDailyExpenses =
      expenses.length > 0 ? totalExpenses / expenses.length : 0;
    const profitMargin = calculateProfitMargin(totalProfit, totalCashIn);

    // Aggregate by vehicle
    const entriesByVehicle = aggregateByVehicle(dailyEntries);
    const expensesByVehicle = aggregateExpensesByVehicle(expenses);

    // Calculate profit per vehicle
    const vehicleMetrics = {};
    vehicles.forEach((vehicle) => {
      const vehicleId = vehicle.id;
      const entryData = entriesByVehicle[vehicleId] || {
        totalCashIn: 0,
        totalDistance: 0,
        entryCount: 0,
      };
      const expenseData = expensesByVehicle[vehicleId] || {
        totalExpenses: 0,
        expenseCount: 0,
      };

      vehicleMetrics[vehicleId] = {
        vehicle,
        totalCashIn: entryData.totalCashIn,
        totalExpenses: expenseData.totalExpenses,
        profit: calculateProfit(
          entryData.totalCashIn,
          expenseData.totalExpenses
        ),
        totalMileage: entryData.totalDistance,
        entryCount: entryData.entryCount,
        expenseCount: expenseData.expenseCount,
      };
    });

    // Find top and low performers
    const topPerformer = findTopPerformer(vehicleMetrics, "profit");
    const lowPerformer = findLowPerformer(vehicleMetrics, "profit");

    // Group by date for trends
    const entriesByDate = groupByDate(dailyEntries);
    const expensesByDate = groupByDate(expenses);

    // Calculate daily totals
    const dailyCashInTrend = calculateDailyTotals(entriesByDate, "cashIn");
    const dailyExpenseTrend = calculateDailyTotals(expensesByDate, "amount");

    // Convert to cumulative trends
    let cumulativeCashIn = 0;
    const cumulativeCashInTrend = dailyCashInTrend.map(item => {
      cumulativeCashIn += item.total;
      return {
        date: item.date,
        total: cumulativeCashIn
      };
    });

    let cumulativeExpenses = 0;
    const cumulativeExpenseTrend = dailyExpenseTrend.map(item => {
      cumulativeExpenses += item.total;
      return {
        date: item.date,
        total: cumulativeExpenses
      };
    });

    // Calculate cumulative profit trend
    const profitTrend = cumulativeCashInTrend.map((cashInData) => {
      const expenseData = cumulativeExpenseTrend.find(
        (e) => e.date === cashInData.date
      );
      return {
        date: cashInData.date,
        profit: calculateProfit(
          cashInData.total,
          expenseData ? expenseData.total : 0
        ),
        cashIn: cashInData.total,
        expenses: expenseData ? expenseData.total : 0,
      };
    });

    // Aggregate expenses by category
    const expensesByCategory = aggregateExpensesByCategory(expenses);

    return {
      summary: {
        totalCashIn,
        totalExpenses,
        totalProfit,
        totalMileage,
        avgDailyCashIn,
        avgDailyExpenses,
        profitMargin,
      },
      vehicleMetrics,
      topPerformer,
      lowPerformer,
      trends: {
        profit: profitTrend,
        cashIn: cumulativeCashInTrend,
        expenses: cumulativeExpenseTrend,
      },
      expensesByCategory,
      vehicles,
      dailyEntries,
      expenses,
    };
  } catch (error) {
    console.error("Error getting analytics data:", error);
    throw error;
  }
};

/**
 * Get mileage trends per vehicle
 * @param {string} userId - The user ID
 * @param {Object} filters - Optional filters (startDate, endDate)
 * @param {Object} userProfile - Optional user profile to determine if admin/manager
 * @returns {Promise<Object>} Mileage trends by vehicle
 */
export const getMileageTrends = async (userId, filters = {}, userProfile = null) => {
  try {
    // Determine if user is admin/manager who should see all company data
    const isAdminOrManager = userProfile && (
      userProfile.role === 'company_admin' || 
      userProfile.role === 'company_manager'
    );
    
    const companyId = userProfile?.companyId;

    // Fetch daily entries - use company-wide function for admins/managers
    let dailyEntries;
    if (isAdminOrManager && companyId) {
      dailyEntries = await getCompanyDailyEntries(companyId, filters);
    } else {
      dailyEntries = await getDailyEntries(userId, filters);
    }

    // Group entries by vehicle and date
    const mileageByVehicle = {};

    dailyEntries.forEach((entry) => {
      const vehicleId = entry.vehicleId;
      const dateStr =
        entry.date instanceof Date
          ? entry.date.toISOString().split("T")[0]
          : new Date(entry.date.seconds * 1000).toISOString().split("T")[0];

      if (!mileageByVehicle[vehicleId]) {
        mileageByVehicle[vehicleId] = {};
      }

      if (!mileageByVehicle[vehicleId][dateStr]) {
        mileageByVehicle[vehicleId][dateStr] = 0;
      }

      mileageByVehicle[vehicleId][dateStr] += entry.distanceTraveled || 0;
    });

    // Convert to array format for charts with cumulative mileage per vehicle
    const mileageTrends = {};
    Object.entries(mileageByVehicle).forEach(([vehicleId, dateData]) => {
      const sortedEntries = Object.entries(dateData)
        .map(([date, mileage]) => ({
          date,
          mileage,
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Calculate cumulative mileage for this vehicle
      let vehicleRunningTotal = 0;
      mileageTrends[vehicleId] = sortedEntries.map(entry => {
        vehicleRunningTotal += entry.mileage;
        return {
          date: entry.date,
          mileage: vehicleRunningTotal,
        };
      });
    });

    // Calculate cumulative mileage
    const allDates = new Set();
    dailyEntries.forEach((entry) => {
      const dateStr =
        entry.date instanceof Date
          ? entry.date.toISOString().split("T")[0]
          : new Date(entry.date.seconds * 1000).toISOString().split("T")[0];
      allDates.add(dateStr);
    });

    const sortedDates = Array.from(allDates).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    // Calculate cumulative mileage (running total)
    let runningTotal = 0;
    const cumulativeMileage = sortedDates.map((date) => {
      const totalForDate = dailyEntries
        .filter((entry) => {
          const entryDate =
            entry.date instanceof Date
              ? entry.date.toISOString().split("T")[0]
              : new Date(entry.date.seconds * 1000).toISOString().split("T")[0];
          return entryDate === date;
        })
        .reduce((sum, entry) => sum + (entry.distanceTraveled || 0), 0);

      runningTotal += totalForDate;

      return {
        date,
        totalMileage: runningTotal,
      };
    });

    return {
      mileageByVehicle: mileageTrends,
      cumulativeMileage,
    };
  } catch (error) {
    console.error("Error getting mileage trends:", error);
    throw error;
  }
};

/**
 * Get service alerts for vehicles that need maintenance
 * @param {string} userId - The user ID
 * @param {Object} userProfile - The user profile with role and companyId
 * @returns {Promise<Array>} Array of service alerts
 */
export const getServiceAlerts = async (userId, userProfile = null) => {
  try {
    // Get vehicles based on user role
    let vehicles;
    if (userProfile && (userProfile.role === 'company_admin' || userProfile.role === 'company_manager') && userProfile.companyId) {
      // Admins and managers see all company vehicles
      const { getCompanyVehicles } = await import('./vehicleService');
      vehicles = await getCompanyVehicles(userProfile.companyId);
    } else {
      // Regular users see only their vehicles
      vehicles = await getVehicles(userId);
    }

    const dailyEntries = await getDailyEntries(userId);

    const alerts = [];

    vehicles.forEach((vehicle) => {
      // Calculate total mileage since last service
      const vehicleEntries = dailyEntries.filter(
        (entry) => entry.vehicleId === vehicle.id
      );

      const totalMileage = calculateTotal(
        vehicleEntries.map((e) => e.distanceTraveled)
      );

      const mileageSinceService =
        totalMileage - (vehicle.lastServiceMileage || 0);

      // Check if alert threshold is reached
      if (
        vehicle.serviceAlertThreshold &&
        mileageSinceService >= vehicle.serviceAlertThreshold
      ) {
        alerts.push({
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          registrationNumber: vehicle.registrationNumber,
          currentMileage: totalMileage,
          mileageSinceService,
          threshold: vehicle.serviceAlertThreshold,
          severity:
            mileageSinceService >= vehicle.serviceAlertThreshold * 1.2
              ? "high"
              : "medium",
        });
      }
    });

    return alerts;
  } catch (error) {
    console.error("Error getting service alerts:", error);
    throw error;
  }
};

/**
 * Acknowledge service alert and reset mileage counter
 * @param {string} userId - The user ID
 * @param {string} vehicleId - The vehicle ID
 * @param {number} currentMileage - Current total mileage
 * @returns {Promise<void>}
 */
export const acknowledgeServiceAlert = async (userId, vehicleId, currentMileage) => {
  try {
    await updateVehicle(userId, vehicleId, {
      lastServiceMileage: currentMileage,
    });
  } catch (error) {
    console.error("Error acknowledging service alert:", error);
    throw error;
  }
};

/**
 * Get license expiry alerts for vehicles
 * @param {string} userId - The user ID
 * @param {Object} userProfile - The user profile with role and companyId
 * @returns {Promise<Array>} Array of license expiry alerts
 */
export const getLicenseExpiryAlerts = async (userId, userProfile = null) => {
  try {
    // Get vehicles based on user role
    let vehicles;
    if (userProfile && (userProfile.role === 'company_admin' || userProfile.role === 'company_manager') && userProfile.companyId) {
      // Admins and managers see all company vehicles
      const { getCompanyVehicles } = await import('./vehicleService');
      vehicles = await getCompanyVehicles(userProfile.companyId);
    } else {
      // Regular users see only their vehicles
      vehicles = await getVehicles(userId);
    }
    const alerts = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    vehicles.forEach((vehicle) => {
      if (vehicle.licenseExpiryDate) {
        const expiryDate = new Date(vehicle.licenseExpiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        // Alert if expired or expiring within 60 days
        if (daysUntilExpiry <= 60) {
          let severity = "low";
          if (daysUntilExpiry < 0) {
            severity = "critical"; // Expired
          } else if (daysUntilExpiry <= 7) {
            severity = "high"; // Expiring within a week
          } else if (daysUntilExpiry <= 30) {
            severity = "medium"; // Expiring within a month
          }

          alerts.push({
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            registrationNumber: vehicle.registrationNumber,
            licenseExpiryDate: vehicle.licenseExpiryDate,
            daysUntilExpiry,
            severity,
            expired: daysUntilExpiry < 0,
          });
        }
      }
    });

    // Sort by urgency (expired first, then by days until expiry)
    alerts.sort((a, b) => {
      if (a.expired && !b.expired) return -1;
      if (!a.expired && b.expired) return 1;
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });

    return alerts;
  } catch (error) {
    console.error("Error getting license expiry alerts:", error);
    throw error;
  }
};

/**
 * Calculate weekly totals
 * @param {Array} dailyEntries - Daily entries
 * @param {Array} expenses - Expenses
 * @returns {Object} Weekly totals
 */
export const calculateWeeklyTotals = (dailyEntries, expenses) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const weeklyEntries = dailyEntries.filter((entry) => {
    const entryDate =
      entry.date instanceof Date
        ? entry.date
        : new Date(entry.date.seconds * 1000);
    return entryDate >= weekAgo;
  });

  const weeklyExpenses = expenses.filter((expense) => {
    const expenseDate =
      expense.date instanceof Date
        ? expense.date
        : new Date(expense.date.seconds * 1000);
    return expenseDate >= weekAgo;
  });

  const totalCashIn = calculateTotal(weeklyEntries.map((e) => e.cashIn));
  const totalExpenses = calculateTotal(weeklyExpenses.map((e) => e.amount));
  const totalProfit = calculateProfit(totalCashIn, totalExpenses);

  return {
    totalCashIn,
    totalExpenses,
    totalProfit,
  };
};

/**
 * Calculate monthly totals
 * @param {Array} dailyEntries - Daily entries
 * @param {Array} expenses - Expenses
 * @returns {Object} Monthly totals
 */
export const calculateMonthlyTotals = (dailyEntries, expenses) => {
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const monthlyEntries = dailyEntries.filter((entry) => {
    const entryDate =
      entry.date instanceof Date
        ? entry.date
        : new Date(entry.date.seconds * 1000);
    return entryDate >= monthAgo;
  });

  const monthlyExpenses = expenses.filter((expense) => {
    const expenseDate =
      expense.date instanceof Date
        ? expense.date
        : new Date(expense.date.seconds * 1000);
    return expenseDate >= monthAgo;
  });

  const totalCashIn = calculateTotal(monthlyEntries.map((e) => e.cashIn));
  const totalExpenses = calculateTotal(monthlyExpenses.map((e) => e.amount));
  const totalProfit = calculateProfit(totalCashIn, totalExpenses);

  return {
    totalCashIn,
    totalExpenses,
    totalProfit,
  };
};
