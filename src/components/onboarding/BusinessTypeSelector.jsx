import { Truck, Car, Package } from 'lucide-react';

/**
 * BusinessTypeSelector - Allows new users to select their business type
 * This determines which features/pages are shown by default
 */
const BusinessTypeSelector = ({ onSelect, selectedType }) => {
  const businessTypes = [
    {
      id: 'traditional',
      title: 'Taxi / Courier / Parcel',
      description: 'Traditional fleet operations with trip capturing, cash-in tracking, and mileage monitoring',
      icon: Car,
      color: 'blue',
      features: ['Trip Capturing', 'Cash-In Tracking', 'Mileage Monitoring', 'Driver Management']
    },
    {
      id: 'commodity',
      title: 'Fuel / LP Gas Trucks',
      description: 'Commodity tracking with load events, deliveries, reconciliation, and invoicing',
      icon: Truck,
      color: 'orange',
      features: ['Load Events', 'Delivery Tracking', 'Auto-Reconciliation', 'Invoicing']
    },
    {
      id: 'hybrid',
      title: 'Both (Hybrid Fleet)',
      description: 'Manage both traditional vehicles and commodity trucks in one platform',
      icon: Package,
      color: 'baltic',
      features: ['All Traditional Features', 'All Commodity Features', 'Unified Dashboard']
    }
  ];

  const getColorClasses = (color, isSelected) => {
    const colors = {
      blue: {
        border: isSelected ? 'border-blue-500' : 'border-slate-700 hover:border-blue-500/50',
        bg: isSelected ? 'bg-blue-500/10' : 'bg-slate-900/50 hover:bg-slate-800/50',
        icon: 'bg-blue-500/10 text-blue-400',
        text: 'text-blue-400'
      },
      orange: {
        border: isSelected ? 'border-orange-500' : 'border-slate-700 hover:border-orange-500/50',
        bg: isSelected ? 'bg-orange-500/10' : 'bg-slate-900/50 hover:bg-slate-800/50',
        icon: 'bg-orange-500/10 text-orange-400',
        text: 'text-orange-400'
      },
      baltic: {
        border: isSelected ? 'border-baltic-500' : 'border-slate-700 hover:border-baltic-500/50',
        bg: isSelected ? 'bg-baltic-500/10' : 'bg-slate-900/50 hover:bg-slate-800/50',
        icon: 'bg-baltic-500/10 text-baltic-400',
        text: 'text-baltic-400'
      }
    };
    return colors[color];
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">What type of fleet do you manage?</h2>
        <p className="text-slate-400 text-sm">This helps us show you the most relevant features</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {businessTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.id;
          const colors = getColorClasses(type.color, isSelected);

          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={`relative border-2 rounded-xl p-6 text-left transition-all ${colors.border} ${colors.bg} ${
                isSelected ? 'ring-2 ring-offset-2 ring-offset-slate-950' : ''
              }`}
            >
              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}

              {/* Icon */}
              <div className={`inline-flex p-3 rounded-lg mb-4 ${colors.icon}`}>
                <Icon className="w-6 h-6" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-white mb-2">{type.title}</h3>

              {/* Description */}
              <p className="text-slate-400 text-sm mb-4">{type.description}</p>

              {/* Features */}
              <div className="space-y-1">
                {type.features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <svg className={`w-4 h-4 flex-shrink-0 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-slate-300 text-xs">{feature}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-6">
        <p className="text-blue-200 text-sm">
          <strong>💡 Don't worry!</strong> You can always change this later or add more vehicle types as your business grows.
        </p>
      </div>
    </div>
  );
};

export default BusinessTypeSelector;
