/**
 * LoadEventCard Component
 * Displays active load event with action buttons
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getVehicleTypeIcon } from '../vehicles/VehicleTypeSelector.jsx';
import { getRunningTankBalance } from '../../services/offloadEventService';

export const LoadEventCard = ({ loadEvent, vehicleData, onRecordOffload, onViewDetails }) => {
  const [tankBalance, setTankBalance] = useState(null);
  
  useEffect(() => {
    const fetchBalance = async () => {
      if (loadEvent?.id) {
        const balance = await getRunningTankBalance(loadEvent.id);
        setTankBalance(balance);
      }
    };
    fetchBalance();
  }, [loadEvent]);
  
  const formatDate = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatQuantity = (quantity, unit) => {
    return `${quantity.toLocaleString()} ${unit === 'kgs' ? 'kg' : 'L'}`;
  };
  
  // Determine what quantity to display
  const displayQuantity = tankBalance ? tankBalance.remaining : loadEvent.loadQuantity;
  const hasPartialOffload = tankBalance && tankBalance.offloadCount > 0;

  return (
    <div className="p-4 rounded-lg border border-baltic-200 dark:border-gray-700
                    bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success animate-pulse" 
               aria-label="Active load" />
          <span className="font-semibold text-baltic-900 dark:text-gray-100">
            Active Load
          </span>
        </div>
        <span className="text-xs text-baltic-600 dark:text-gray-400">
          {formatDate(loadEvent.loadDate)}
        </span>
      </div>
      
      {/* Vehicle & Commodity Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="Vehicle">
            {getVehicleTypeIcon(vehicleData?.vehicleType || 'fuelTruck')}
          </span>
          <p className="text-sm text-baltic-700 dark:text-gray-300">
            <span className="font-medium">{vehicleData?.registrationNumber || loadEvent.vehicleId}</span>
            {vehicleData?.name && <span className="text-baltic-500 dark:text-gray-400"> • {vehicleData.name}</span>}
          </p>
        </div>
        
        <div className="bg-baltic-50 dark:bg-gray-700/50 rounded-lg p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-lg font-bold text-baltic-900 dark:text-gray-100">
              {formatQuantity(displayQuantity, loadEvent.unit)}
            </p>
            {hasPartialOffload && (
              <span className="text-xs font-medium text-warning">
                Remaining
              </span>
            )}
          </div>
          <p className="text-xs text-baltic-600 dark:text-gray-400 mt-1">
            {loadEvent.commodityType === 'diesel' ? 'Diesel' : 
             loadEvent.commodityType === 'lpGas' ? 'LP Gas' : 
             loadEvent.commodityType}
          </p>
          {hasPartialOffload && (
            <p className="text-xs text-baltic-500 dark:text-gray-500 mt-1">
              {tankBalance.offloadCount} {tankBalance.offloadCount === 1 ? 'delivery' : 'deliveries'} • 
              {formatQuantity(tankBalance.totalOffloaded, loadEvent.unit)} offloaded
            </p>
          )}
        </div>
        
        <p className="text-sm text-baltic-600 dark:text-gray-400">
          <span className="font-medium">From:</span> {loadEvent.supplier || 'Not specified'}
        </p>
        
        {loadEvent.docketNumber && (
          <p className="text-xs text-baltic-500 dark:text-gray-500">
            Docket: {loadEvent.docketNumber}
          </p>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button 
          onClick={onViewDetails}
          className="flex-1 px-3 py-2 text-sm rounded-lg
                     border border-baltic-300 dark:border-gray-600
                     text-baltic-700 dark:text-gray-300
                     hover:bg-baltic-50 dark:hover:bg-gray-700
                     transition-colors"
        >
          📍 View Details
        </button>
        <button
          onClick={onRecordOffload}
          className="flex-1 px-3 py-2 text-sm rounded-lg
                     bg-baltic-500 text-white
                     hover:bg-baltic-600 dark:hover:bg-baltic-400
                     transition-colors font-medium"
        >
          ✅ Record Offload
        </button>
      </div>
    </div>
  );
};

LoadEventCard.propTypes = {
  loadEvent: PropTypes.shape({
    id: PropTypes.string.isRequired,
    vehicleId: PropTypes.string.isRequired,
    loadDate: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
    loadQuantity: PropTypes.number.isRequired,
    commodityType: PropTypes.string.isRequired,
    unit: PropTypes.string.isRequired,
    supplier: PropTypes.string,
    docketNumber: PropTypes.string,
  }).isRequired,
  vehicleData: PropTypes.shape({
    registrationNumber: PropTypes.string,
    name: PropTypes.string,
    vehicleType: PropTypes.string,
  }),
  onRecordOffload: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default LoadEventCard;
