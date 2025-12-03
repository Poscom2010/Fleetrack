/**
 * ConsolidatedLoadEventCard Component
 * Displays consolidated view of multiple active loads for a single vehicle
 * Shows combined fuel totals and allows offloading from the combined amount
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getVehicleTypeIcon } from '../vehicles/VehicleTypeSelector.jsx';

export const ConsolidatedLoadEventCard = ({ 
  consolidatedLoad, 
  vehicleData, 
  onRecordOffload, 
  onViewDetails 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatQuantity = (quantity) => {
    if (!quantity && quantity !== 0) return '0';
    return `${quantity.toLocaleString()} ${consolidatedLoad.unit === 'kgs' ? 'kg' : 'L'}`;
  };
  
  const hasMultipleLoads = consolidatedLoad.loads.length > 1;

  return (
    <div className="p-5 rounded-xl border-2 border-baltic-200 dark:border-gray-700
                    bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-success animate-pulse" 
               aria-label="Active load" />
          <span className="font-bold text-baltic-900 dark:text-gray-100 text-lg">
            Active Load
          </span>
          {hasMultipleLoads && (
            <span className="px-3 py-1 bg-warning/20 text-warning text-xs font-bold rounded-full border border-warning/30">
              {consolidatedLoad.loads.length} LOADS
            </span>
          )}
        </div>
      </div>
      
      {/* Vehicle Info */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl" role="img" aria-label="Vehicle">
          {getVehicleTypeIcon(vehicleData?.vehicleType || 'fuelTruck')}
        </span>
        <div>
          <p className="text-sm font-bold text-baltic-700 dark:text-gray-200">
            {vehicleData?.registrationNumber || consolidatedLoad.vehicleId}
          </p>
          {vehicleData?.name && (
            <p className="text-xs text-baltic-500 dark:text-gray-400">
              {vehicleData.name}
            </p>
          )}
        </div>
      </div>
      
      {/* Fuel Inventory Box */}
      <div className="bg-gradient-to-br from-baltic-50 to-blue-50 dark:from-gray-700/50 dark:to-gray-600/50 
                      rounded-xl p-4 mb-4 border border-baltic-200 dark:border-gray-600">
        <p className="text-xs font-bold text-baltic-600 dark:text-gray-300 uppercase tracking-wide mb-3">
          📦 Fuel Inventory
        </p>
        
        {/* Show breakdown for each load */}
        {consolidatedLoad.loads.length > 0 && (
          <div className="space-y-2 mb-3">
            {consolidatedLoad.loads.map((load, index) => {
              const hasOffloads = load.offloadCount > 0;
              return (
                <div key={load.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-baltic-600 dark:text-gray-400">
                      Load {index + 1} ({formatDate(load.loadDate)}):
                    </span>
                    <span className="font-semibold text-baltic-900 dark:text-gray-100">
                      {formatQuantity(load.loadQuantity)}
                    </span>
                  </div>
                  {hasOffloads && (
                    <>
                      <div className="flex justify-between text-xs pl-3">
                        <span className="text-warning">
                          - Offloaded ({load.offloadCount}x):
                        </span>
                        <span className="font-semibold text-warning">
                          -{formatQuantity(load.totalOffloaded)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs pl-3 font-bold">
                        <span className="text-success">
                          Remaining:
                        </span>
                        <span className="text-success">
                          {formatQuantity(load.remaining)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {consolidatedLoad.loads.length > 1 && (
              <div className="border-t-2 border-baltic-300 dark:border-gray-500 pt-2 mt-2"></div>
            )}
          </div>
        )}
        
        {/* Total Available */}
        <div className="flex justify-between items-baseline mt-2">
          <span className="text-sm font-bold text-baltic-800 dark:text-gray-200 uppercase">
            Total Available:
          </span>
          <span className="text-2xl font-black text-baltic-900 dark:text-gray-100">
            {formatQuantity(consolidatedLoad.totalRemaining)}
          </span>
        </div>
        
        <p className="text-xs text-baltic-600 dark:text-gray-400 mt-2">
          {consolidatedLoad.commodityType === 'diesel' ? '⛽ Diesel' : '🔥 LP Gas'}
        </p>
      </div>
      
      {/* Load History - Expandable if multiple */}
      {hasMultipleLoads && (
        <div className="mb-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-3 rounded-lg
                       bg-baltic-50 dark:bg-gray-700/50 hover:bg-baltic-100 dark:hover:bg-gray-700
                       transition-colors"
          >
            <span className="text-sm font-semibold text-baltic-700 dark:text-gray-200">
              📋 Load History ({consolidatedLoad.loads.length} loads)
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-baltic-600 dark:text-gray-300" />
            ) : (
              <ChevronDown className="w-4 h-4 text-baltic-600 dark:text-gray-300" />
            )}
          </button>
          
          {isExpanded && (
            <div className="mt-2 space-y-2 pl-3 border-l-2 border-baltic-200 dark:border-gray-600">
              {consolidatedLoad.loads.map((load, index) => (
                <div key={load.id} className="text-xs">
                  <div className="flex items-baseline justify-between">
                    <span className="text-baltic-600 dark:text-gray-400">
                      • {formatDate(load.loadDate)} - {formatQuantity(load.remaining)}
                    </span>
                    {index === consolidatedLoad.loads.length - 1 && (
                      <span className="px-2 py-0.5 bg-success/20 text-success text-xs font-bold rounded">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="text-baltic-500 dark:text-gray-500 ml-3">
                    From: {load.supplier || 'N/A'} • Docket: {load.docketNumber || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Single load info */}
      {!hasMultipleLoads && (
        <div className="mb-4 text-sm space-y-1">
          <p className="text-baltic-600 dark:text-gray-400">
            <span className="font-medium">From:</span> {consolidatedLoad.supplier || 'Not specified'}
          </p>
          {consolidatedLoad.oldestLoad?.docketNumber && (
            <p className="text-xs text-baltic-500 dark:text-gray-500">
              Docket: {consolidatedLoad.oldestLoad.docketNumber}
            </p>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button 
          onClick={() => onViewDetails(consolidatedLoad)}
          className="flex-1 px-4 py-2.5 text-sm rounded-lg
                     border-2 border-baltic-300 dark:border-gray-600
                     text-baltic-700 dark:text-gray-300 font-medium
                     hover:bg-baltic-50 dark:hover:bg-gray-700
                     transition-colors"
        >
          📍 View Details
        </button>
        <button
          onClick={() => onRecordOffload(consolidatedLoad)}
          className="flex-1 px-4 py-2.5 text-sm rounded-lg
                     bg-gradient-to-r from-baltic-500 to-baltic-600 text-white font-bold
                     hover:from-baltic-600 hover:to-baltic-700
                     dark:from-baltic-600 dark:to-baltic-700
                     dark:hover:from-baltic-700 dark:hover:to-baltic-800
                     transition-all shadow-md hover:shadow-lg transform hover:scale-105"
        >
          ✅ Record Offload
        </button>
      </div>
    </div>
  );
};

ConsolidatedLoadEventCard.propTypes = {
  consolidatedLoad: PropTypes.shape({
    vehicleId: PropTypes.string.isRequired,
    loads: PropTypes.array.isRequired,
    totalLoads: PropTypes.number.isRequired,
    totalRemaining: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
    commodityType: PropTypes.string.isRequired,
    supplier: PropTypes.string,
    oldestLoad: PropTypes.object,
    newestLoad: PropTypes.object,
  }).isRequired,
  vehicleData: PropTypes.shape({
    registrationNumber: PropTypes.string,
    name: PropTypes.string,
    vehicleType: PropTypes.string,
  }),
  onRecordOffload: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default ConsolidatedLoadEventCard;
