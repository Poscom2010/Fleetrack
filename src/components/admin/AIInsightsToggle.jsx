import React, { useState, useEffect } from 'react';
import { toggleAIInsightsGlobally } from '../../services/aiInsightsService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import { Brain, Power, Sparkles } from 'lucide-react';

const AIInsightsToggle = () => {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [stats, setStats] = useState({ total: 0, enabled: 0 });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setChecking(true);
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      const companies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const enabledCount = companies.filter(c => c.aiInsightsEnabled === true).length;
      const totalCount = companies.length;
      
      setStats({ total: totalCount, enabled: enabledCount });
      setEnabled(enabledCount > 0 && enabledCount === totalCount);
    } catch (error) {
      console.error('Error checking AI insights status:', error);
      toast.error('Failed to check AI insights status');
    } finally {
      setChecking(false);
    }
  };

  const handleToggle = async () => {
    const newState = !enabled;
    const action = newState ? 'ENABLE' : 'DISABLE';
    
    if (!confirm(`⚠️ Are you sure you want to ${action} AI Insights for ALL ${stats.total} companies?\n\nThis will ${newState ? 'activate' : 'deactivate'} AI-powered analysis, recommendations, and predictions for all accounts.`)) {
      return;
    }

    try {
      setLoading(true);
      const result = await toggleAIInsightsGlobally(newState);
      
      setEnabled(newState);
      setStats(prev => ({ ...prev, enabled: newState ? prev.total : 0 }));
      
      toast.success(
        `✅ AI Insights ${newState ? 'enabled' : 'disabled'} for ${result.companiesUpdated} companies`,
        { duration: 5000 }
      );
      
      // Refresh status
      await checkStatus();
    } catch (error) {
      console.error('Error toggling AI insights:', error);
      toast.error('Failed to toggle AI insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-purple-200 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 shadow-lg border-2 border-purple-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Brain className="w-8 h-8 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              AI Insights Control
              <Sparkles className="w-5 h-5 text-purple-600" />
            </h3>
            <p className="text-sm text-gray-600">System-wide AI features management</p>
          </div>
        </div>
        
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-14 w-28 items-center rounded-full transition-all duration-300 ${
            enabled ? 'bg-green-600 shadow-lg shadow-green-200' : 'bg-gray-300'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
          title={`Click to ${enabled ? 'disable' : 'enable'} AI insights for all companies`}
        >
          <span
            className={`inline-block h-12 w-12 transform rounded-full bg-white shadow-lg transition-all duration-300 flex items-center justify-center ${
              enabled ? 'translate-x-14' : 'translate-x-1'
            }`}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            ) : (
              <Power className={`w-6 h-6 ${enabled ? 'text-green-600' : 'text-gray-400'}`} />
            )}
          </span>
        </button>
      </div>
      
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 border border-purple-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Companies</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-green-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">AI Enabled</p>
          <p className="text-2xl font-bold text-green-600">{stats.enabled}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Coverage</p>
          <p className="text-2xl font-bold text-purple-600">
            {stats.total > 0 ? ((stats.enabled / stats.total) * 100).toFixed(0) : 0}%
          </p>
        </div>
      </div>

      {/* Status Message */}
      <div className={`p-4 rounded-lg border-2 ${
        enabled 
          ? 'bg-green-50 border-green-200' 
          : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <p className="text-sm font-semibold text-gray-900">
            AI Insights are currently{' '}
            <span className={`font-bold ${enabled ? 'text-green-600' : 'text-red-600'}`}>
              {enabled ? 'ENABLED' : 'DISABLED'}
            </span>
            {' '}for {enabled ? 'all' : 'no'} companies
          </p>
        </div>
        <p className="text-xs text-gray-600 mt-2 ml-5">
          {enabled 
            ? '✅ Companies can access AI-powered insights, recommendations, and predictions'
            : '⚠️ AI features are disabled. Companies will see a "not enabled" message'
          }
        </p>
      </div>

      {/* Features List */}
      <div className="mt-4 p-4 bg-white rounded-lg border border-purple-100">
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">AI Features Included:</p>
        <ul className="space-y-1 text-sm text-gray-600">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Automatic insights generation from operational data</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Smart recommendations for cost optimization</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Predictive analytics for revenue and expenses</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Performance comparisons and trend analysis</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <span>Anomaly detection and variance alerts</span>
          </li>
        </ul>
      </div>

      {/* Refresh Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={checkStatus}
          disabled={checking}
          className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
        >
          <svg className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default AIInsightsToggle;
