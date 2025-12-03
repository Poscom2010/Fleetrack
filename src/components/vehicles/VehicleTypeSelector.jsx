import PropTypes from 'prop-types';

const VEHICLE_TYPES = [
  { 
    value: 'taxi', 
    label: 'Taxi', 
    icon: 'taxi', 
    category: 'traditional',
    description: 'Passenger taxi service'
  },
  { 
    value: 'courier', 
    label: 'Courier', 
    icon: 'truck', 
    category: 'traditional',
    description: 'Delivery and courier service'
  },
  { 
    value: 'parcel', 
    label: 'Parcel Delivery', 
    icon: 'package', 
    category: 'traditional',
    description: 'Parcel and package delivery'
  },
  { 
    value: 'fuelTruck', 
    label: 'Fuel Truck (Diesel)', 
    icon: 'fuel', 
    category: 'commodity',
    description: 'Diesel fuel transportation'
  },
  { 
    value: 'lpGasTruck', 
    label: 'LP Gas Truck', 
    icon: 'flame', 
    category: 'commodity',
    description: 'LP gas transportation'
  },
  { 
    value: 'generalTruck', 
    label: 'General Truck', 
    icon: 'truck-moving', 
    category: 'hybrid',
    description: 'General cargo transportation'
  },
];

const getIconEmoji = (iconName) => {
  const icons = {
    'taxi': '🚕',
    'truck': '🚚',
    'package': '📦',
    'fuel': '⛽',
    'flame': '🔥',
    'truck-moving': '🚛'
  };
  return icons[iconName] || '🚗';
};

const VehicleTypeSelector = ({ value, onChange, disabled = false }) => {
  return (
    <div className="space-y-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border-2 border-gray-200 dark:border-gray-700">
      <label className="block text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white mb-3">
        🚗 Vehicle Type *
      </label>
      
      <div className="space-y-3">
        {VEHICLE_TYPES.map(type => (
          <label
            key={type.value}
            className={`
              flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer
              transition-all duration-200
              ${value === type.value
                ? 'border-baltic-500 bg-baltic-100 dark:bg-baltic-900/40 shadow-lg scale-[1.02]'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 hover:border-baltic-400 dark:hover:border-baltic-500 hover:shadow-md'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="radio"
              name="vehicleType"
              value={type.value}
              checked={value === type.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className="sr-only"
            />
            
            <span className="text-2xl" role="img" aria-label={type.label}>
              {getIconEmoji(type.icon)}
            </span>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 dark:text-white text-base">
                  {type.label}
                </span>
                
                {type.category === 'commodity' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-baltic-500 to-baltic-600 text-white font-bold shadow-md">
                    COMMODITY
                  </span>
                )}
                
                {type.category === 'hybrid' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 text-white font-bold shadow-md">
                    HYBRID
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-medium">
                {type.description}
              </p>
            </div>
            
            {value === type.value && (
              <div className="w-5 h-5 rounded-full bg-baltic-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </label>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
          💡 <strong>Note:</strong> Selecting <strong>Fuel Truck</strong> or <strong>LP Gas Truck</strong> enables commodity tracking features including load events, deliveries, and reconciliation.
        </p>
      </div>
    </div>
  );
};

VehicleTypeSelector.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default VehicleTypeSelector;

export { VEHICLE_TYPES };

export const isCommodityVehicle = (vehicleType) => {
  const type = VEHICLE_TYPES.find(t => t.value === vehicleType);
  return type?.category === 'commodity';
};

export const getVehicleTypeLabel = (vehicleType) => {
  const type = VEHICLE_TYPES.find(t => t.value === vehicleType);
  return type?.label || vehicleType;
};

export const getVehicleTypeIcon = (vehicleType) => {
  const type = VEHICLE_TYPES.find(t => t.value === vehicleType);
  return type ? getIconEmoji(type.icon) : '🚗';
};
