import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';

/**
 * FleetDashboardPage - Dedicated dashboard for Fleet Operations only
 * Shows traditional vehicle analytics, trips, expenses, profit metrics
 * Does NOT include commodity tracking data
 */
const FleetDashboardPage = () => {
  usePageTitle('Fleet Dashboard');

  return (
    <div className="space-y-6">
      {/* Fleet-specific Analytics Dashboard */}
      <AnalyticsDashboard hideAlerts={false} />
    </div>
  );
};

export default FleetDashboardPage;
