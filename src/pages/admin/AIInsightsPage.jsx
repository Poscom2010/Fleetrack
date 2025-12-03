import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useTheme } from '../../contexts/ThemeContext';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import { Brain, Power, Sparkles, Building2, Check, X, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

/**
 * AI Insights Page - System Admin control panel for AI features
 */
const AIInsightsPage = () => {
  usePageTitle('AI Insights');
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({ total: 0, enabled: 0 });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, 'companies'));
      const companiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompanies(companiesData);
      
      const enabledCount = companiesData.filter(c => c.aiInsightsEnabled === true).length;
      setStats({ total: companiesData.length, enabled: enabledCount });
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const toggleCompanyAI = async (companyId, currentState) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        aiInsightsEnabled: !currentState
      });
      
      setCompanies(prev => prev.map(c => 
        c.id === companyId ? { ...c, aiInsightsEnabled: !currentState } : c
      ));
      
      setStats(prev => ({
        ...prev,
        enabled: prev.enabled + (!currentState ? 1 : -1)
      }));
      
      toast.success(`AI Insights ${!currentState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling AI:', error);
      toast.error('Failed to update');
    }
  };

  const toggleAllCompanies = async (enable) => {
    if (!confirm(`${enable ? 'Enable' : 'Disable'} AI Insights for ALL ${stats.total} companies?`)) {
      return;
    }

    try {
      setToggling(true);
      
      for (const company of companies) {
        await updateDoc(doc(db, 'companies', company.id), {
          aiInsightsEnabled: enable
        });
      }
      
      setCompanies(prev => prev.map(c => ({ ...c, aiInsightsEnabled: enable })));
      setStats(prev => ({ ...prev, enabled: enable ? prev.total : 0 }));
      
      toast.success(`AI Insights ${enable ? 'enabled' : 'disabled'} for all companies`);
    } catch (error) {
      console.error('Error toggling all:', error);
      toast.error('Failed to update all companies');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-baltic-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="p-2 rounded-lg bg-baltic-500/10 border border-baltic-500/30 w-fit">
            <Brain className="w-5 h-5 text-baltic-400" />
          </div>
          <div className="flex-1">
            <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              AI Insights Control
            </h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              Enable or disable AI-powered analytics for companies
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Total</span>
          </div>
          <p className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</p>
        </div>
        
        <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Zap className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Enabled</span>
          </div>
          <p className={`text-xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.enabled}</p>
        </div>
        
        <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <X className={`w-4 h-4 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Disabled</span>
          </div>
          <p className={`text-xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>{stats.total - stats.enabled}</p>
        </div>
        
        <div className={`rounded-xl border p-3 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className={`w-4 h-4 ${isDark ? 'text-baltic-400' : 'text-baltic-600'}`} />
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Coverage</span>
          </div>
          <p className={`text-xl font-bold ${isDark ? 'text-baltic-400' : 'text-baltic-600'}`}>
            {stats.total > 0 ? Math.round((stats.enabled / stats.total) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Global Controls */}
      <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Global Controls
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => toggleAllCompanies(true)}
            disabled={toggling || stats.enabled === stats.total}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
          >
            <Power className="w-4 h-4" />
            Enable All
          </button>
          <button
            onClick={() => toggleAllCompanies(false)}
            disabled={toggling || stats.enabled === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
          >
            <X className="w-4 h-4" />
            Disable All
          </button>
        </div>
      </div>

      {/* Companies List */}
      <div className={`rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-gray-200'}`}>
        <div className="p-3 border-b border-slate-700">
          <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Companies ({companies.length})
          </h2>
        </div>
        <div className="divide-y divide-slate-700">
          {companies.map(company => (
            <div key={company.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${company.aiInsightsEnabled ? 'bg-emerald-500/10' : 'bg-gray-500/10'}`}>
                  <Building2 className={`w-4 h-4 ${company.aiInsightsEnabled ? 'text-emerald-400' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {company.name || 'Unnamed Company'}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {company.city || 'No location'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleCompanyAI(company.id, company.aiInsightsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  company.aiInsightsEnabled ? 'bg-emerald-500' : 'bg-gray-400'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    company.aiInsightsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
          
          {companies.length === 0 && (
            <div className="p-8 text-center">
              <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                No companies found
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInsightsPage;
