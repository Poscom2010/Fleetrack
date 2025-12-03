import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { generateAIInsights } from '../services/aiInsightsService';
import { getCurrencySymbol } from '../utils/calculations';
import AIChipAnimation from '../components/common/AIChipAnimation';
import { Sparkles, Brain, TrendingUp, TrendingDown, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const CommodityInsightsPage = ({ embedded = false }) => {
  usePageTitle('Insights');
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [predictions, setPredictions] = useState(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (company?.id) {
      loadInsights();
    }
  }, [company]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const result = await generateAIInsights(company.id, 30);
      
      if (!result.enabled) {
        setEnabled(false);
        // Don't show error toast - the Coming Soon banner is more elegant
        return;
      }

      setEnabled(true);
      setInsights(result.insights || []);
      setSummary(result.summary || null);
      setRecommendations(result.recommendations || []);
      setPredictions(result.predictions || null);
    } catch (error) {
      console.error('Error loading insights:', error);
      toast.error('Failed to load AI insights');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'danger':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className={embedded ? "flex items-center justify-center py-20" : "flex items-center justify-center min-h-screen"}>
        <div className="text-center">
          <AIChipAnimation size={120} />
          <p className="mt-4 text-gray-600 font-medium">Analyzing your data with AI...</p>
          <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
        </div>
      </div>
    );
  }

  // Show "Not Enabled" message if AI insights are not enabled for this company
  if (!enabled) {
    return (
      <div className={embedded ? "" : "min-h-screen p-4 md:p-6 bg-gradient-to-br from-baltic-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"}>
        <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto space-y-6"}>
          <div className="bg-gradient-to-br from-baltic-600 via-blue-600 to-indigo-600 rounded-2xl p-8 text-center text-white shadow-2xl">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                <Brain className="relative w-16 h-16 animate-pulse drop-shadow-lg" />
              </div>
              <h2 className="text-3xl font-bold">AI Insights Not Enabled</h2>
            </div>
            <p className="text-white/90 text-lg max-w-2xl mx-auto mb-6">
              Contact your system administrator to enable AI-powered insights for your account.
            </p>
            <p className="text-sm text-blue-100">
              AI insights provide intelligent analysis, recommendations, and predictions based on your commodity operations data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Display Rule-Based Insights with AI Coming Soon Banner
  return (
    <div className={embedded ? "" : "min-h-screen p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"}>
      <div className={embedded ? "space-y-6" : "max-w-7xl mx-auto space-y-6"}>
        
        {/* AI Coming Soon Banner */}
        {!embedded && (
          <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-6 text-white shadow-2xl border border-white/10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                <Brain className="relative w-12 h-12 animate-pulse drop-shadow-lg" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold">AI-Enhanced Insights</h3>
                  <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full">COMING SOON</span>
                </div>
                <p className="text-white/90 text-sm">
                  External AI integration is in development. Currently showing rule-based intelligent analysis.
                </p>
              </div>
              <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
            </div>
          </div>
        )}

        {/* Header */}
        {!embedded && (
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <AIChipAnimation size={80} />
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Intelligent Insights</h1>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
              Smart analysis and recommendations for your commodity operations
            </p>
            <button
              onClick={loadInsights}
              className="inline-flex items-center gap-2 px-4 py-2 bg-baltic-600 hover:bg-baltic-700 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Insights
            </button>
          </div>
        )}

        {/* Executive Summary */}
        {summary && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Brain className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Executive Summary</h2>
              <span className="ml-auto text-sm bg-white/20 px-3 py-1 rounded-full">{summary.period}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-purple-200 text-sm mb-1">Total Revenue</p>
                <p className="text-2xl font-bold">{getCurrencySymbol(company?.currency)} {summary.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-purple-200 text-sm mb-1">Net Profit</p>
                <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {getCurrencySymbol(company?.currency)} {summary.totalProfit.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-purple-200 text-sm mb-1">Profit Margin</p>
                <p className="text-2xl font-bold">{summary.profitMargin.toFixed(1)}%</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-purple-200 text-sm mb-1">Accuracy Rate</p>
                <p className="text-2xl font-bold">{summary.accuracyRate.toFixed(0)}%</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm text-purple-100">
                📊 Total Trips: <span className="font-semibold">{summary.totalTrips}</span>
                {' • '}
                💰 Avg Revenue per Trip: <span className="font-semibold">{getCurrencySymbol(company?.currency)} {summary.totalTrips > 0 ? (summary.totalRevenue / summary.totalTrips).toLocaleString() : 0}</span>
              </p>
            </div>
          </div>
        )}

        {/* AI Insights */}
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            AI-Generated Insights
          </h2>
          
          {insights.length === 0 ? (
            <div className="text-center py-12">
              <AIChipAnimation size={80} />
              <p className="text-gray-600 mt-4">
                No insights available yet. Add more trip data to generate insights.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${getSeverityStyles(insight.severity)} transition-all hover:shadow-md`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{insight.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{insight.title}</h3>
                      <p className="text-sm leading-relaxed">{insight.message}</p>
                      {insight.metric !== null && insight.metric !== undefined && (
                        <div className="mt-2 inline-block px-3 py-1 bg-white/50 rounded-full text-xs font-semibold">
                          Metric: {typeof insight.metric === 'number' ? insight.metric.toLocaleString() : insight.metric}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-600" />
              Smart Recommendations
            </h2>
            
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className={`border-l-4 p-5 rounded-r-lg transition-all hover:shadow-md ${
                    rec.priority === 'high' ? 'border-red-500 bg-red-50' :
                    rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {rec.priority.toUpperCase()} PRIORITY
                      </span>
                      <span className="ml-2 text-xs text-gray-500 font-medium">{rec.category}</span>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-gray-900">{rec.title}</h3>
                  <p className="text-sm text-gray-700 mb-4">{rec.description}</p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Recommended Actions:</p>
                    <ul className="space-y-2">
                      {rec.actions.map((action, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {(rec.potentialImpact || rec.potentialSavings) && (
                    <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
                      <p className="text-sm font-semibold text-green-800">
                        💡 {rec.potentialImpact || rec.potentialSavings}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Predictive Analytics */}
        {predictions && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Predictive Analytics
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Revenue Forecast */}
              <div className="bg-white rounded-lg p-5 shadow-sm border border-green-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  🔮 Revenue Forecast (Next 30 Days)
                </h3>
                <p className="text-3xl font-bold text-green-700 mb-3">
                  {getCurrencySymbol(company?.currency)} {predictions.revenue.predicted.toLocaleString()}
                </p>
                <div className="flex items-center gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-500 text-xs">Low Estimate</p>
                    <p className="font-semibold text-gray-700">{getCurrencySymbol(company?.currency)} {predictions.revenue.range.low.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">High Estimate</p>
                    <p className="font-semibold text-gray-700">{getCurrencySymbol(company?.currency)} {predictions.revenue.range.high.toLocaleString()}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Confidence Level:</span>
                    <span className="font-semibold text-green-700">{(predictions.revenue.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Trend:</span>
                    <span className={`font-semibold flex items-center gap-1 ${
                      predictions.revenue.trend === 'increasing' ? 'text-green-600' :
                      predictions.revenue.trend === 'decreasing' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {predictions.revenue.trend === 'increasing' ? <TrendingUp className="w-3 h-3" /> : 
                       predictions.revenue.trend === 'decreasing' ? <TrendingDown className="w-3 h-3" /> : 
                       '→'}
                      {predictions.revenue.trendPercentage.toFixed(1)}% {predictions.revenue.trend}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expense Forecast */}
              <div className="bg-white rounded-lg p-5 shadow-sm border border-orange-100">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  💸 Expense Forecast (Next 30 Days)
                </h3>
                <p className="text-3xl font-bold text-orange-700 mb-3">
                  R {predictions.expenses.predicted.toLocaleString()}
                </p>
                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Confidence Level:</span>
                    <span className="font-semibold text-orange-700">{(predictions.expenses.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Based on historical average daily expenses and current trends
                  </p>
                </div>
              </div>
            </div>

            {/* Profit Projection */}
            <div className="mt-6 bg-white rounded-lg p-5 shadow-sm border border-purple-100">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                📈 Projected Net Profit (Next 30 Days)
              </h3>
              <p className={`text-3xl font-bold mb-2 ${
                (predictions.revenue.predicted - predictions.expenses.predicted) >= 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                R {(predictions.revenue.predicted - predictions.expenses.predicted).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                Projected Margin: <span className="font-semibold">
                  {((predictions.revenue.predicted - predictions.expenses.predicted) / predictions.revenue.predicted * 100).toFixed(1)}%
                </span>
              </p>
            </div>
          </div>
        )}

        {/* AI Info Footer */}
        <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">AI-Powered Analysis:</span> These insights are generated using advanced algorithms that analyze your historical data, identify patterns, and provide actionable recommendations. Predictions are based on statistical models and may vary based on market conditions.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CommodityInsightsPage;
