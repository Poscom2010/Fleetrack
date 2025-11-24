import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, Car, Calendar } from 'lucide-react';
import { getCompanyMileageGaps, getMileageGapStats } from '../../services/mileageGapDetectionService';
import LoadingSpinner from '../common/LoadingSpinner';

/**
 * UnaccountedMileageInsights component for displaying mileage gap analytics
 * Shows all unaccounted mileage across the fleet
 */
const UnaccountedMileageInsights = ({ companyId }) => {
  const [gaps, setGaps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, high, medium, low

  useEffect(() => {
    loadGaps();
  }, [companyId]);

  const loadGaps = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const [gapsData, statsData] = await Promise.all([
        getCompanyMileageGaps(companyId),
        getMileageGapStats(companyId)
      ]);
      
      setGaps(gapsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading mileage gaps:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGaps = filter === 'all' 
    ? gaps 
    : gaps.filter(gap => gap.severity === filter);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'medium': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'low': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'low': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!stats || gaps.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-green-500/20 p-3">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          No Unaccounted Mileage Detected
        </h3>
        <p className="text-slate-400 text-sm">
          All vehicle odometer readings are properly accounted for. Great job maintaining accurate records!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Unaccounted KM */}
        <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-red-400" />
            <span className="text-xs font-semibold text-red-300 uppercase tracking-wide">
              Critical
            </span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {stats.totalUnaccountedKm.toLocaleString()} km
          </p>
          <p className="text-xs text-red-200/80">
            Total Unaccounted Mileage
          </p>
        </div>

        {/* Total Gaps */}
        <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            <span className="text-xs font-semibold text-orange-300 uppercase tracking-wide">
              Gaps
            </span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {stats.totalGaps}
          </p>
          <p className="text-xs text-orange-200/80">
            Mileage Gaps Detected
          </p>
        </div>

        {/* Affected Vehicles */}
        <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <Car className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
              Vehicles
            </span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {stats.affectedVehicles}
          </p>
          <p className="text-xs text-blue-200/80">
            Vehicles Affected
          </p>
        </div>

        {/* Average Gap */}
        <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide">
              Average
            </span>
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {stats.averageGapSize.toFixed(0)} km
          </p>
          <p className="text-xs text-purple-200/80">
            Average Gap Size
          </p>
        </div>
      </div>

      {/* Severity Breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Severity Breakdown</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{stats.highSeverityCount}</p>
            <p className="text-xs text-slate-400 mt-1">High (&gt;500 km)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">{stats.mediumSeverityCount}</p>
            <p className="text-xs text-slate-400 mt-1">Medium (100-500 km)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{stats.lowSeverityCount}</p>
            <p className="text-xs text-slate-400 mt-1">Low (&lt;100 km)</p>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-400 font-medium">Filter by severity:</span>
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'all'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All ({gaps.length})
        </button>
        <button
          onClick={() => setFilter('high')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'high'
              ? 'bg-red-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          High ({stats.highSeverityCount})
        </button>
        <button
          onClick={() => setFilter('medium')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'medium'
              ? 'bg-orange-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Medium ({stats.mediumSeverityCount})
        </button>
        <button
          onClick={() => setFilter('low')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            filter === 'low'
              ? 'bg-yellow-500 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Low ({stats.lowSeverityCount})
        </button>
      </div>

      {/* Gaps List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">
          Detected Gaps ({filteredGaps.length})
        </h3>
        
        {filteredGaps.map((gap) => (
          <div
            key={gap.id}
            className={`rounded-xl border p-4 ${getSeverityColor(gap.severity)}`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-white text-sm">
                    {gap.vehicleName}
                  </h4>
                  <span className="text-xs text-slate-400">
                    ({gap.vehicleRegistration})
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getSeverityBadge(gap.severity)}`}>
                    {gap.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {gap.previousDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })} → {gap.currentDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  <span className="text-slate-500 mx-2">•</span>
                  {gap.daysBetween} {gap.daysBetween === 1 ? 'day' : 'days'} apart
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {gap.unaccountedKm.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">km unaccounted</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Previous end:</span>
                <span className="font-semibold text-white">
                  {gap.previousEndMileage.toLocaleString()} km
                </span>
              </div>
              <span className="text-slate-600">→</span>
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Current start:</span>
                <span className="font-semibold text-white">
                  {gap.currentStartMileage.toLocaleString()} km
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-current/20">
              <p className="text-xs text-slate-300">
                <strong>Possible causes:</strong> Unreported trips, personal use, odometer reset, or data entry error
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnaccountedMileageInsights;
