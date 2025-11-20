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
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";

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
  const [userProfile, setUserProfile] = useState(null);
  // No mock data - production ready

  /**
   * Calculate date filters based on time range
   */
  const getDateFilters = useCallback(() => {
    const now = new Date();
    let startDate = null;
    let endDate = null;

    switch (timeRange) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
        
      case "yesterday":
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
        endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
        break;
        
      case "thisWeek":
        // Start of this week (Monday)
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDate = new Date(now);
        startDate.setDate(now.getDate() + diffToMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case "lastWeek":
        // Last week (Monday to Sunday)
        const lastWeekEnd = new Date(now);
        const daysToLastSunday = now.getDay() === 0 ? 0 : now.getDay();
        lastWeekEnd.setDate(now.getDate() - daysToLastSunday - 1);
        lastWeekEnd.setHours(23, 59, 59, 999);
        
        startDate = new Date(lastWeekEnd);
        startDate.setDate(lastWeekEnd.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = lastWeekEnd;
        break;
        
      case "thisMonth":
        // Start of this calendar month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case "lastMonth":
        // Last calendar month
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
        
      case "last7Days":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case "last30Days":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case "thisYear":
        // Start of this calendar year
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
        
      case "all":
      default:
        startDate = null;
        endDate = null;
        break;
    }

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    return filters;
  }, [timeRange]);

  /**
   * Fetch analytics data
   */
  const fetchAnalytics = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user profile first
      const userDoc = await getDoc(doc(db, "users", userId));
      const profile = userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
      setUserProfile(profile);

      const filters = getDateFilters();

      // Fetch analytics data with userProfile
      const [analytics, mileage, alerts, licenseAlerts] = await Promise.all([
        getAnalyticsData(userId, filters, profile),
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
