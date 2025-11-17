import { useState, useEffect, useCallback } from "react";
import {
  getAnalyticsData,
  getMileageTrends,
  getServiceAlerts,
  getLicenseExpiryAlerts,
  acknowledgeServiceAlert,
  calculateWeeklyTotals,
  calculateMonthlyTotals,
} from "../services/analyticsService";

/**
 * Custom hook for managing analytics data
 * @param {string} userId - The user ID
 * @param {string} timeRange - Time range filter ('daily', 'weekly', 'monthly', 'all')
 * @returns {Object} Analytics data and methods
 */
export const useAnalytics = (userId, timeRange = "all") => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [mileageTrends, setMileageTrends] = useState(null);
  const [serviceAlerts, setServiceAlerts] = useState([]);
  const [licenseExpiryAlerts, setLicenseExpiryAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // No mock data - production ready

  /**
   * Calculate date filters based on time range
   */
  const getDateFilters = useCallback(() => {
    const now = new Date();
    let startDate = null;

    switch (timeRange) {
      case "daily":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "weekly":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "monthly":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        startDate = null;
        break;
    }

    return startDate ? { startDate } : {};
  }, [timeRange]);

  /**
   * Fetch analytics data
   */
  const fetchAnalytics = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const filters = getDateFilters();

      const [analytics, mileage, alerts, licenseAlerts] = await Promise.all([
        getAnalyticsData(userId, filters),
        getMileageTrends(userId, filters),
        getServiceAlerts(userId),
        getLicenseExpiryAlerts(userId),
      ]);

      // Calculate time-based totals
      let timePeriodTotals = analytics.summary;

      if (timeRange === "weekly") {
        timePeriodTotals = {
          ...analytics.summary,
          ...calculateWeeklyTotals(analytics.dailyEntries, analytics.expenses),
        };
      } else if (timeRange === "monthly") {
        timePeriodTotals = {
          ...analytics.summary,
          ...calculateMonthlyTotals(analytics.dailyEntries, analytics.expenses),
        };
      }

      const hydrated = { ...analytics, summary: timePeriodTotals };

      // Set real data only - no mock data
      setAnalyticsData(hydrated);
      setMileageTrends(mileage);
      setServiceAlerts(alerts);
      setLicenseExpiryAlerts(licenseAlerts);
    } catch (err) {
      console.error("Error fetching analytics:", err);
      setError(err.message);
      // Set empty data on error
      setAnalyticsData(null);
      setMileageTrends(null);
      setServiceAlerts([]);
      setLicenseExpiryAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [userId, timeRange, getDateFilters]);

  /**
   * Acknowledge a service alert
   */
  const handleAcknowledgeAlert = useCallback(
    async (vehicleId, currentMileage) => {
      try {
        await acknowledgeServiceAlert(userId, vehicleId, currentMileage);
        // Refresh alerts after acknowledgment
        const alerts = await getServiceAlerts(userId);
        setServiceAlerts(alerts);
      } catch (err) {
        console.error("Error acknowledging alert:", err);
        throw err;
      }
    },
    [userId]
  );

  /**
   * Refresh analytics data
   */
  const refresh = useCallback(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analyticsData,
    mileageTrends,
    serviceAlerts,
    licenseExpiryAlerts,
    loading,
    error,
    acknowledgeAlert: handleAcknowledgeAlert,
    refresh,
  };
};
