/**
 * RunningTankBalance Component
 * Displays running fuel balance for multi-customer offload tracking
 * Shows loaded, offloaded, and remaining fuel with visual progress bar
 */

import PropTypes from 'prop-types';

export const RunningTankBalance = ({ loadEvent, offloads = [], unit = 'L' }) => {
  // Calculate totals
  const loaded = loadEvent?.loadQuantity || 0;
  const totalOffloaded = offloads.reduce((sum, o) => sum + (o.offloadQuantity || 0), 0);
  const remaining = offloads.length > 0 
    ? offloads[offloads.length - 1].tankReadingAfter 
    : loaded;
  
  // Calculate percentages for progress bar
  const offloadedPercentage = loaded > 0 ? (totalOffloaded / loaded) * 100 : 0;
  const remainingPercentage = loaded > 0 ? (remaining / loaded) * 100 : 100;
  
  // Detect discrepancy (loaded should equal offloaded + remaining)
  const expectedRemaining = loaded - totalOffloaded;
  const variance = Math.abs(remaining - expectedRemaining);
  const hasDiscrepancy = variance > 3;
  
  return (
    <div className="p-3 bg-gradient-to-br from-info/10 to-baltic-100/20 border-2 border-info/30 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-baltic-900 dark:text-gray-100 flex items-center gap-2">
          <span className="text-lg">🔢</span>
          Running Tank Balance
        </h4>
        {offloads.length > 0 && (
          <span className="text-xs bg-baltic-500 text-white px-2 py-0.5 rounded-full font-medium">
            {offloads.length} {offloads.length === 1 ? 'delivery' : 'deliveries'}
          </span>
        )}
      </div>
      
      {/* Fuel Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded border border-gray-200 dark:border-gray-700">
          <p className="text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-0.5">
            Loaded
          </p>
          <p className="text-lg font-bold text-baltic-900 dark:text-gray-100">
            {loaded.toLocaleString()} {unit}
          </p>
        </div>
        
        <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded border border-gray-200 dark:border-gray-700">
          <p className="text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-0.5">
            Offloaded
          </p>
          <p className="text-lg font-bold text-warning">
            {totalOffloaded.toLocaleString()} {unit}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {offloadedPercentage.toFixed(1)}%
          </p>
        </div>
        
        <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded border border-gray-200 dark:border-gray-700">
          <p className="text-[10px] uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-0.5">
            Remaining
          </p>
          <p className={`text-lg font-bold ${
            remaining === 0 
              ? 'text-gray-400' 
              : hasDiscrepancy 
              ? 'text-danger' 
              : 'text-success'
          }`}>
            {remaining.toLocaleString()} {unit}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">
            {remainingPercentage.toFixed(1)}%
          </p>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mb-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
          {/* Offloaded portion */}
          <div 
            className="h-full bg-gradient-to-r from-warning to-warning/80 transition-all duration-500"
            style={{ width: `${offloadedPercentage}%` }}
          />
          {/* Remaining portion */}
          <div 
            className={`absolute top-0 right-0 h-full transition-all duration-500 ${
              remaining === 0 
                ? 'bg-gray-300 dark:bg-gray-600'
                : hasDiscrepancy
                ? 'bg-gradient-to-r from-danger/80 to-danger'
                : 'bg-gradient-to-r from-success/80 to-success'
            }`}
            style={{ width: `${remainingPercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-gray-500 dark:text-gray-400">
          <span>0 {unit}</span>
          <span>{loaded.toLocaleString()} {unit}</span>
        </div>
      </div>
      
      {/* Validation Check */}
      {hasDiscrepancy && (
        <div className="mt-2 p-2 bg-danger/10 border border-danger/30 rounded text-xs">
          <p className="font-semibold text-danger mb-1">⚠️ Discrepancy Detected</p>
          <p className="text-gray-700 dark:text-gray-300">
            Expected: {expectedRemaining.toFixed(2)} {unit} remaining<br />
            Actual: {remaining} {unit} in tank<br />
            <span className="font-bold">Variance: {variance.toFixed(2)} {unit}</span>
          </p>
        </div>
      )}
      
      {/* Perfect Match */}
      {!hasDiscrepancy && remaining === expectedRemaining && offloads.length > 0 && (
        <div className="mt-2 p-2 bg-success/10 border border-success/30 rounded text-xs">
          <p className="font-semibold text-success flex items-center gap-1">
            ✓ Perfect Balance
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            All fuel accounted for. Tank balance matches offload records.
          </p>
        </div>
      )}
      
      {/* Empty Tank */}
      {remaining === 0 && (
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-xs">
          <p className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
            ⚫ Tank Empty
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            All fuel has been offloaded. Load event can be completed.
          </p>
        </div>
      )}
    </div>
  );
};

RunningTankBalance.propTypes = {
  loadEvent: PropTypes.shape({
    loadQuantity: PropTypes.number.isRequired,
  }).isRequired,
  offloads: PropTypes.arrayOf(PropTypes.shape({
    offloadQuantity: PropTypes.number.isRequired,
    tankReadingAfter: PropTypes.number.isRequired,
  })),
  unit: PropTypes.string,
};

export default RunningTankBalance;
