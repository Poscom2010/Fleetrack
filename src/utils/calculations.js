/**
 * Calculation utilities for analytics and metrics
 */

/**
 * Calculate distance traveled from start and end mileage
 * @param {number} startMileage - Starting mileage in km
 * @param {number} endMileage - Ending mileage in km
 * @returns {number} Distance traveled in km
 */
export const calculateDistance = (startMileage, endMileage) => {
  const start = Number(startMileage);
  const end = Number(endMileage);

  if (isNaN(start) || isNaN(end)) {
    return 0;
  }

  return Math.max(0, end - start);
};

/**
 * Calculate profit from cash-in and expenses
 * @param {number} cashIn - Total cash-in amount
 * @param {number} expenses - Total expenses amount
 * @returns {number} Profit (can be negative)
 */
export const calculateProfit = (cashIn, expenses) => {
  const cash = Number(cashIn) || 0;
  const exp = Number(expenses) || 0;
  return cash - exp;
};

/**
 * Calculate total from an array of values
 * @param {Array<number>} values - Array of numeric values
 * @returns {number} Sum of all values
 */
export const calculateTotal = (values) => {
  if (!Array.isArray(values)) {
    return 0;
  }

  return values.reduce((sum, value) => {
    const num = Number(value);
    return sum + (isNaN(num) ? 0 : num);
  }, 0);
};

/**
 * Calculate average from an array of values
 * @param {Array<number>} values - Array of numeric values
 * @returns {number} Average value
 */
export const calculateAverage = (values) => {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  const total = calculateTotal(values);
  return total / values.length;
};

/**
 * Calculate profit margin percentage
 * @param {number} profit - Profit amount
 * @param {number} cashIn - Total cash-in amount
 * @returns {number} Profit margin as percentage (0-100)
 */
export const calculateProfitMargin = (profit, cashIn) => {
  const cash = Number(cashIn);
  const prof = Number(profit);

  if (isNaN(cash) || isNaN(prof) || cash === 0) {
    return 0;
  }

  return (prof / cash) * 100;
};

/**
 * Aggregate daily entries by vehicle
 * @param {Array<Object>} entries - Array of daily entry objects
 * @returns {Object} Aggregated data by vehicleId
 */
export const aggregateByVehicle = (entries) => {
  if (!Array.isArray(entries)) {
    return {};
  }

  return entries.reduce((acc, entry) => {
    const vehicleId = entry.vehicleId;

    if (!acc[vehicleId]) {
      acc[vehicleId] = {
        totalCashIn: 0,
        totalDistance: 0,
        entryCount: 0,
      };
    }

    acc[vehicleId].totalCashIn += Number(entry.cashIn) || 0;
    acc[vehicleId].totalDistance += Number(entry.distanceTraveled) || 0;
    acc[vehicleId].entryCount += 1;

    return acc;
  }, {});
};

/**
 * Aggregate expenses by vehicle
 * @param {Array<Object>} expenses - Array of expense objects
 * @returns {Object} Aggregated expenses by vehicleId
 */
export const aggregateExpensesByVehicle = (expenses) => {
  if (!Array.isArray(expenses)) {
    return {};
  }

  return expenses.reduce((acc, expense) => {
    const vehicleId = expense.vehicleId;

    if (!acc[vehicleId]) {
      acc[vehicleId] = {
        totalExpenses: 0,
        expenseCount: 0,
      };
    }

    acc[vehicleId].totalExpenses += Number(expense.amount) || 0;
    acc[vehicleId].expenseCount += 1;

    return acc;
  }, {});
};

/**
 * Aggregate expenses by category
 * @param {Array<Object>} expenses - Array of expense objects
 * @returns {Object} Aggregated expenses by category
 */
export const aggregateExpensesByCategory = (expenses) => {
  if (!Array.isArray(expenses)) {
    return {};
  }

  return expenses.reduce((acc, expense) => {
    const category = expense.category || "Uncategorized";

    if (!acc[category]) {
      acc[category] = 0;
    }

    acc[category] += Number(expense.amount) || 0;

    return acc;
  }, {});
};

/**
 * Calculate vehicle profit (cash-in minus expenses)
 * @param {Array<Object>} entries - Daily entries for vehicle
 * @param {Array<Object>} expenses - Expenses for vehicle
 * @returns {number} Total profit for vehicle
 */
export const calculateVehicleProfit = (entries, expenses) => {
  const totalCashIn = calculateTotal(entries.map((e) => e.cashIn));
  const totalExpenses = calculateTotal(expenses.map((e) => e.amount));
  return calculateProfit(totalCashIn, totalExpenses);
};

/**
 * Group data by date
 * @param {Array<Object>} data - Array of objects with date property
 * @param {string} dateField - Name of the date field (default: 'date')
 * @returns {Object} Data grouped by date string (YYYY-MM-DD)
 */
export const groupByDate = (data, dateField = "date") => {
  if (!Array.isArray(data)) {
    return {};
  }

  return data.reduce((acc, item) => {
    const date = item[dateField];
    if (!date) return acc;

    const dateStr =
      date instanceof Date
        ? date.toISOString().split("T")[0]
        : new Date(date.seconds * 1000).toISOString().split("T")[0];

    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }

    acc[dateStr].push(item);

    return acc;
  }, {});
};

/**
 * Calculate daily totals from grouped data
 * @param {Object} groupedData - Data grouped by date
 * @param {string} field - Field to sum (e.g., 'cashIn', 'amount')
 * @returns {Array<Object>} Array of {date, total} objects
 */
export const calculateDailyTotals = (groupedData, field) => {
  return Object.entries(groupedData)
    .map(([date, items]) => ({
      date,
      total: calculateTotal(items.map((item) => item[field])),
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * Find top performer from vehicle data
 * @param {Object} vehicleData - Object with vehicleId as keys and metrics as values
 * @param {string} metric - Metric to compare (e.g., 'profit', 'totalCashIn')
 * @returns {string|null} VehicleId of top performer
 */
export const findTopPerformer = (vehicleData, metric = "profit") => {
  if (!vehicleData || Object.keys(vehicleData).length === 0) {
    return null;
  }

  return Object.entries(vehicleData).reduce((top, [vehicleId, data]) => {
    if (!top || (data[metric] || 0) > (vehicleData[top][metric] || 0)) {
      return vehicleId;
    }
    return top;
  }, null);
};

/**
 * Find low performer from vehicle data
 * @param {Object} vehicleData - Object with vehicleId as keys and metrics as values
 * @param {string} metric - Metric to compare (e.g., 'profit', 'totalCashIn')
 * @returns {string|null} VehicleId of low performer
 */
export const findLowPerformer = (vehicleData, metric = "profit") => {
  if (!vehicleData || Object.keys(vehicleData).length === 0) {
    return null;
  }

  return Object.entries(vehicleData).reduce((low, [vehicleId, data]) => {
    if (!low || (data[metric] || 0) < (vehicleData[low][metric] || 0)) {
      return vehicleId;
    }
    return low;
  }, null);
};

/**
 * Format currency value
 * @param {number} value - Numeric value
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = "USD") => {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(num);
};

/**
 * Format number with commas
 * @param {number} value - Numeric value
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 0) => {
  const num = Number(value) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};
