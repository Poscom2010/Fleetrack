import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";
import Modal from "../components/common/Modal";

/**
 * AnalyticsPage - AI-powered insights dashboard for fleet performance
 */
const AnalyticsPage = () => {
  usePageTitle('Analytics');
  const { company, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState([]);
  const [vehicleMetrics, setVehicleMetrics] = useState([]);
  const [fleetSummary, setFleetSummary] = useState(null);
  const [showAiInsightsModal, setShowAiInsightsModal] = useState(false);

  // Get currency symbol based on company currency
  const getCurrencySymbol = () => {
    const currencyMap = {
      'USD': '$',
      'ZAR': 'R',
      'EUR': '€',
      'GBP': '£',
      'NGN': '₦',
      'KES': 'KSh',
      'GHS': '₵',
      'TZS': 'TSh',
      'UGX': 'USh',
      'ZMW': 'ZK'
    };
    return currencyMap[company?.currency || 'USD'] || '$';
  };

  const currencySymbol = getCurrencySymbol();

  useEffect(() => {
    if (company) {
      loadAnalytics();
    }
  }, [company]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // Load vehicles
      const vehiclesQuery = query(
        collection(db, 'vehicles'),
        where('companyId', '==', company.id)
      );
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const vehicles = vehiclesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Load daily entries
      const entriesQuery = query(
        collection(db, 'dailyEntries'),
        where('companyId', '==', company.id)
      );
      const entriesSnapshot = await getDocs(entriesQuery);
      const entries = entriesSnapshot.docs.map(doc => doc.data());

      // Load expenses
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('companyId', '==', company.id)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      const expenses = expensesSnapshot.docs.map(doc => doc.data());

      // Calculate metrics per vehicle
      const metrics = vehicles.map(vehicle => {
        const vehicleEntries = entries.filter(e => e.vehicleId === vehicle.id);
        const vehicleExpenses = expenses.filter(e => e.vehicleId === vehicle.id);

        const totalDistance = vehicleEntries.reduce((sum, entry) => {
          return sum + (entry.distanceTraveled || 0);
        }, 0);

        const totalExpenses = vehicleExpenses.reduce((sum, exp) => {
          return sum + (exp.amount || 0);
        }, 0);

        const totalRevenue = vehicleEntries.reduce((sum, entry) => {
          return sum + (entry.cashIn || 0);
        }, 0);

        const profit = totalRevenue - totalExpenses;
        const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
        const costPerKm = totalDistance > 0 ? totalExpenses / totalDistance : 0;
        const revenuePerKm = totalDistance > 0 ? totalRevenue / totalDistance : 0;
        const tripCount = vehicleEntries.length;

        return {
          vehicle,
          totalDistance,
          totalExpenses,
          totalRevenue,
          profit,
          profitMargin,
          costPerKm,
          revenuePerKm,
          tripCount
        };
      });

      setVehicleMetrics(metrics);

      // Generate AI insights
      const generatedInsights = generateInsights(metrics);
      setInsights(generatedInsights);

      // Calculate fleet summary
      const summary = {
        totalVehicles: vehicles.length,
        totalDistance: metrics.reduce((sum, m) => sum + m.totalDistance, 0),
        totalRevenue: metrics.reduce((sum, m) => sum + m.totalRevenue, 0),
        totalExpenses: metrics.reduce((sum, m) => sum + m.totalExpenses, 0),
        totalProfit: metrics.reduce((sum, m) => sum + m.profit, 0),
        totalTrips: metrics.reduce((sum, m) => sum + m.tripCount, 0)
      };
      setFleetSummary(summary);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (metrics) => {
    const insights = [];

    if (metrics.length === 0) return insights;

    // Sort by different criteria
    const byDistance = [...metrics].sort((a, b) => b.totalDistance - a.totalDistance);
    const byProfit = [...metrics].sort((a, b) => b.profit - a.profit);
    const byCostPerKm = [...metrics].sort((a, b) => b.costPerKm - a.costPerKm);
    const byProfitMargin = [...metrics].sort((a, b) => b.profitMargin - a.profitMargin);

    // Insight 1: Highest mileage vehicle
    if (byDistance[0] && byDistance[0].totalDistance > 0) {
      const vehicle = byDistance[0];
      const profitStatus = vehicle.profit > 0 ? 'generating profit' : 'operating at a loss';
      insights.push({
        type: 'mileage',
        severity: vehicle.profit < 0 ? 'warning' : 'info',
        title: 'Highest Mileage Vehicle',
        message: `${vehicle.vehicle.name} (${vehicle.vehicle.registrationNumber}) has the highest mileage with ${vehicle.totalDistance.toFixed(0)} km traveled, ${profitStatus} of ${currencySymbol}${Math.abs(vehicle.profit).toFixed(2)}.`
      });
    }

    // Insight 2: Most profitable vehicle
    if (byProfit[0] && byProfit[0].profit > 0) {
      const vehicle = byProfit[0];
      insights.push({
        type: 'profit',
        severity: 'success',
        title: 'Top Performer',
        message: `${vehicle.vehicle.name} (${vehicle.vehicle.registrationNumber}) is your most profitable vehicle with ${currencySymbol}${vehicle.profit.toFixed(2)} profit and ${vehicle.profitMargin.toFixed(1)}% profit margin.`
      });
    }

    // Insight 3: Least profitable vehicle
    if (byProfit[byProfit.length - 1] && byProfit[byProfit.length - 1].profit < 0) {
      const vehicle = byProfit[byProfit.length - 1];
      insights.push({
        type: 'loss',
        severity: 'danger',
        title: 'Underperforming Vehicle',
        message: `${vehicle.vehicle.name} (${vehicle.vehicle.registrationNumber}) is operating at a loss of ${currencySymbol}${Math.abs(vehicle.profit).toFixed(2)}. Consider reviewing its expenses or increasing revenue.`
      });
    }

    // Insight 4: Highest cost per km
    if (byCostPerKm[0] && byCostPerKm[0].costPerKm > 0) {
      const vehicle = byCostPerKm[0];
      const avgCost = metrics.reduce((sum, m) => sum + m.costPerKm, 0) / metrics.length;
      if (vehicle.costPerKm > avgCost * 1.3) {
        insights.push({
          type: 'cost',
          severity: 'warning',
          title: 'High Operating Cost',
          message: `${vehicle.vehicle.name} (${vehicle.vehicle.registrationNumber}) has the highest cost per km at ${currencySymbol}${vehicle.costPerKm.toFixed(2)}/km, which is ${((vehicle.costPerKm / avgCost - 1) * 100).toFixed(0)}% above fleet average.`
        });
      }
    }

    // Insight 5: Best profit margin
    if (byProfitMargin[0] && byProfitMargin[0].profitMargin > 0) {
      const vehicle = byProfitMargin[0];
      insights.push({
        type: 'efficiency',
        severity: 'success',
        title: 'Most Efficient Vehicle',
        message: `${vehicle.vehicle.name} (${vehicle.vehicle.registrationNumber}) has the best profit margin at ${vehicle.profitMargin.toFixed(1)}%, earning ${currencySymbol}${vehicle.revenuePerKm.toFixed(2)}/km.`
      });
    }

    // Insight 6: Underutilized vehicles
    const avgTrips = metrics.reduce((sum, m) => sum + m.tripCount, 0) / metrics.length;
    const underutilized = metrics.filter(m => m.tripCount < avgTrips * 0.5 && m.tripCount > 0);
    if (underutilized.length > 0) {
      const vehicle = underutilized[0];
      insights.push({
        type: 'utilization',
        severity: 'info',
        title: 'Low Utilization',
        message: `${vehicle.vehicle.name} (${vehicle.vehicle.registrationNumber}) has only ${vehicle.tripCount} trips, which is ${((1 - vehicle.tripCount / avgTrips) * 100).toFixed(0)}% below fleet average. Consider optimizing its usage.`
      });
    }

    return insights;
  };

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'success':
        return 'bg-green-500/10 border-green-500/30 text-green-400';
      case 'warning':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
      case 'danger':
        return 'bg-red-500/10 border-red-500/30 text-red-400';
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'success':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        );
      case 'warning':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        );
      case 'danger':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        );
      default:
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Fleet Analytics & Insights</h1>
            <p className="text-xs sm:text-sm text-slate-400">AI-powered analysis of your fleet performance</p>
          </div>
          <button
            onClick={() => setShowAiInsightsModal(true)}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl hover:from-purple-700 hover:to-pink-700 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Full AI Insights</span>
          </button>
        </div>

        {/* Fleet Summary Cards */}
        {fleetSummary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Total Distance</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{fleetSummary.totalDistance.toFixed(0)}</p>
              <p className="text-xs text-slate-500 mt-1">kilometers</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Total Revenue</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400">{currencySymbol}{fleetSummary.totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-slate-500 mt-1">{fleetSummary.totalTrips} trips</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Total Expenses</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-400">{currencySymbol}{fleetSummary.totalExpenses.toFixed(0)}</p>
              <p className="text-xs text-slate-500 mt-1">operating costs</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Net Profit</p>
              <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${fleetSummary.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {currencySymbol}{fleetSummary.totalProfit.toFixed(0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {fleetSummary.totalRevenue > 0 ? ((fleetSummary.totalProfit / fleetSummary.totalRevenue) * 100).toFixed(1) : 0}% margin
              </p>
            </div>
          </div>
        )}

        {/* AI Insights */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI-Powered Insights
          </h2>
          
          {insights.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No insights available yet. Add more trip data to generate insights.</p>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getSeverityStyles(insight.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {getSeverityIcon(insight.severity)}
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{insight.title}</h3>
                      <p className="text-sm opacity-90">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vehicle Performance Table */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="text-base sm:text-lg font-semibold text-white mb-4">Vehicle Performance Breakdown</h2>
          
          {vehicleMetrics.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No vehicle data available</p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {vehicleMetrics.map((metric) => (
                  <div key={metric.vehicle.id} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                    <div className="mb-2">
                      <p className="font-medium text-white text-sm">{metric.vehicle.name}</p>
                      <p className="text-xs text-slate-400">{metric.vehicle.registrationNumber}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-slate-500">Trips:</span>
                        <p className="text-slate-200 font-semibold">{metric.tripCount}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Distance:</span>
                        <p className="text-slate-200 font-semibold">{metric.totalDistance.toFixed(0)} km</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Revenue:</span>
                        <p className="text-green-400 font-semibold">{currencySymbol}{metric.totalRevenue.toFixed(0)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Expenses:</span>
                        <p className="text-orange-400 font-semibold">{currencySymbol}{metric.totalExpenses.toFixed(0)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Profit:</span>
                        <p className={`font-semibold ${metric.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {currencySymbol}{metric.profit.toFixed(0)}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Margin:</span>
                        <p className={`font-semibold ${metric.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {metric.profitMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      Cost/km: <span className="text-orange-400 font-semibold">{currencySymbol}{metric.costPerKm.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700 text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase">
                    <th className="px-4 py-3 text-left">Vehicle</th>
                    <th className="px-4 py-3 text-right">Trips</th>
                    <th className="px-4 py-3 text-right">Distance</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Expenses</th>
                    <th className="px-4 py-3 text-right">Profit</th>
                    <th className="px-4 py-3 text-right">Margin</th>
                    <th className="px-4 py-3 text-right">Cost/km</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {vehicleMetrics.map((metric) => (
                    <tr key={metric.vehicle.id} className="hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{metric.vehicle.name}</p>
                          <p className="text-xs text-slate-400">{metric.vehicle.registrationNumber}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-200">{metric.tripCount}</td>
                      <td className="px-4 py-3 text-right text-slate-200">{metric.totalDistance.toFixed(0)} km</td>
                      <td className="px-4 py-3 text-right text-green-400">{currencySymbol}{metric.totalRevenue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-orange-400">{currencySymbol}{metric.totalExpenses.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${metric.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {currencySymbol}{metric.profit.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right ${metric.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {metric.profitMargin.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right text-slate-200">{currencySymbol}{metric.costPerKm.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </div>

      {/* Full AI Insights Coming Soon Modal */}
      <Modal
        isOpen={showAiInsightsModal}
        onClose={() => setShowAiInsightsModal(false)}
        title="Full AI Insights"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30">
                <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Full AI Insights Coming Soon! 🚀</h3>
                <p className="text-slate-300 text-sm max-w-md mx-auto">
                  Advanced AI-powered insights and recommendations for your fleet will be available soon. Get ready for next-level intelligent analytics that help you maximize efficiency and profitability!
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                <div className="bg-slate-800/50 rounded-lg p-3 border border-purple-500/20">
                  <p className="text-xs text-purple-400 font-semibold mb-1">🔮 Predictive Analytics</p>
                  <p className="text-xs text-slate-400">Forecast maintenance needs & costs</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-pink-500/20">
                  <p className="text-xs text-pink-400 font-semibold mb-1">💡 Smart Recommendations</p>
                  <p className="text-xs text-slate-400">AI-driven optimization tips</p>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 border border-blue-500/20">
                  <p className="text-xs text-blue-400 font-semibold mb-1">📊 Deep Insights</p>
                  <p className="text-xs text-slate-400">Advanced pattern detection</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-slate-700">
            <button
              onClick={() => setShowAiInsightsModal(false)}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition"
            >
              Got it!
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AnalyticsPage;
