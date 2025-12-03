import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { usePageTitle } from '../hooks/usePageTitle';
import Onboarding from '../components/onboarding/Onboarding';
import { Lightbulb, Play, Car, Fuel, Users, Package, Receipt, Scale, BarChart3, FileText } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * OnboardingPage - Fleet-type aware onboarding guide
 */
const OnboardingPage = () => {
  usePageTitle('Getting Started');
  const { user, userProfile, company } = useAuth();
  const { isDark } = useTheme();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [fleetType, setFleetType] = useState('traditional');

  // Detect fleet type
  useEffect(() => {
    const detectFleetType = async () => {
      if (!company?.id) return;
      
      const companyBusinessType = company?.businessType || userProfile?.businessType;
      
      if (companyBusinessType === 'commodity') {
        setFleetType('commodity');
        return;
      }
      if (companyBusinessType === 'hybrid') {
        setFleetType('hybrid');
        return;
      }
      if (companyBusinessType === 'traditional') {
        setFleetType('traditional');
        return;
      }
      
      // Fallback: detect from vehicles
      try {
        const vehiclesRef = collection(db, 'vehicles');
        const q = query(vehiclesRef, where('companyId', '==', company.id));
        const snapshot = await getDocs(q);
        
        let hasTraditional = false;
        let hasCommodity = false;
        
        snapshot.forEach(doc => {
          const vehicle = doc.data();
          const type = vehicle.vehicleType?.toLowerCase() || '';
          if (['tanker', 'fuel_truck', 'gas_truck', 'commodity'].includes(type)) {
            hasCommodity = true;
          } else {
            hasTraditional = true;
          }
        });
        
        if (hasTraditional && hasCommodity) {
          setFleetType('hybrid');
        } else if (hasCommodity) {
          setFleetType('commodity');
        } else {
          setFleetType('traditional');
        }
      } catch (error) {
        console.error('Error detecting fleet type:', error);
      }
    };
    
    detectFleetType();
  }, [company, userProfile]);

  const handleStartOnboarding = () => {
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Get fleet-specific features
  const getFeatures = () => {
    const isAdmin = userProfile?.role === 'company_admin' || userProfile?.role === 'company_manager';
    
    if (fleetType === 'commodity' && isAdmin) {
      return [
        { icon: Car, title: 'Add Tanker Vehicles', desc: 'Set up your commodity trucks with capacity info', color: 'blue' },
        { icon: Users, title: 'Invite Team', desc: 'Add drivers and admins to manage operations', color: 'orange' },
        { icon: Package, title: 'Load Events', desc: 'Track product loaded from depots', color: 'emerald' },
        { icon: Receipt, title: 'Deliveries', desc: 'Log customer deliveries and invoices', color: 'cyan' },
        { icon: Scale, title: 'Reconciliation', desc: 'Monitor variances and discrepancies', color: 'orange' },
        { icon: BarChart3, title: 'Analytics', desc: 'View insights and performance metrics', color: 'blue' },
      ];
    }
    
    if (fleetType === 'hybrid' && isAdmin) {
      return [
        { icon: Car, title: 'Fleet Vehicles', desc: 'Add cars, vans for traditional operations', color: 'blue' },
        { icon: Fuel, title: 'Tanker Trucks', desc: 'Add commodity vehicles for fuel/gas', color: 'emerald' },
        { icon: Users, title: 'Team Management', desc: 'Invite drivers for both fleet types', color: 'orange' },
        { icon: FileText, title: 'Trip Capturing', desc: 'Record trips for traditional fleet', color: 'blue' },
        { icon: Package, title: 'Load/Offload', desc: 'Track commodity operations', color: 'teal' },
        { icon: BarChart3, title: 'Unified Analytics', desc: 'View insights across all operations', color: 'emerald' },
      ];
    }
    
    if (isAdmin) {
      return [
        { icon: Car, title: 'Add Vehicles', desc: 'Set up your fleet with vehicle details', color: 'blue' },
        { icon: Users, title: 'Invite Team', desc: 'Add drivers to capture their own data', color: 'orange' },
        { icon: FileText, title: 'Capture Trips', desc: 'Record daily mileage and cash-in', color: 'emerald' },
        { icon: BarChart3, title: 'Analytics', desc: 'Monitor fleet performance and insights', color: 'cyan' },
      ];
    }
    
    // Driver
    return [
      { icon: FileText, title: 'Capture Trips', desc: 'Record your daily operations', color: 'blue' },
      { icon: Car, title: 'View Vehicles', desc: 'Check your assigned vehicle', color: 'emerald' },
      { icon: BarChart3, title: 'Performance', desc: 'Track your statistics', color: 'cyan' },
    ];
  };

  const features = getFeatures();
  const fleetLabel = fleetType === 'commodity' ? 'Commodity' : fleetType === 'hybrid' ? 'Hybrid Fleet' : 'Fleet';
  const fleetColor = fleetType === 'commodity' ? 'emerald' : fleetType === 'hybrid' ? 'baltic' : 'blue';

  return (
    <div className="space-y-4">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <Onboarding 
          user={user} 
          userProfile={userProfile} 
          company={company}
          onComplete={handleOnboardingComplete} 
        />
      )}

      {/* Header */}
      <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-gray-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className={`p-2 rounded-lg bg-${fleetColor}-500/10 border border-${fleetColor}-500/30 w-fit`}>
            <Lightbulb className={`w-5 h-5 text-${fleetColor}-400`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Getting Started
              </h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border bg-${fleetColor}-500/10 text-${fleetColor}-400 border-${fleetColor}-500/30`}>
                {fleetLabel}
              </span>
            </div>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              Learn how to use FleetTrack for your {fleetLabel.toLowerCase()} operations
            </p>
          </div>
          <button
            onClick={handleStartOnboarding}
            className={`flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-${fleetColor}-600 to-${fleetColor}-700 hover:from-${fleetColor}-700 hover:to-${fleetColor}-800 text-white rounded-lg font-semibold text-sm shadow-lg transition transform hover:scale-105`}
          >
            <Play className="w-4 h-4" />
            <span>Start Tour</span>
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-gray-200'}`}>
        <h2 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          What You'll Learn
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index} 
                className={`p-3 rounded-lg border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className={`p-1.5 rounded-md bg-${feature.color}-500/10 border border-${feature.color}-500/30 w-fit mb-2`}>
                  <Icon className={`w-4 h-4 text-${feature.color}-400`} />
                </div>
                <h3 className={`text-xs font-semibold mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {feature.title}
                </h3>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                  {feature.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Tips */}
      <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-gray-200'}`}>
        <h2 className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Quick Tips
        </h2>
        <div className="space-y-2">
          {fleetType === 'commodity' ? (
            <>
              <Tip isDark={isDark} emoji="🛢️" text="Add your tanker vehicles with capacity information first" />
              <Tip isDark={isDark} emoji="👥" text="Invite drivers so they can log their own trips" />
              <Tip isDark={isDark} emoji="📦" text="Record load events when product is loaded from depot" />
              <Tip isDark={isDark} emoji="🧾" text="Log deliveries to generate invoices automatically" />
              <Tip isDark={isDark} emoji="⚖️" text="Check reconciliation for any tank discrepancies" />
            </>
          ) : fleetType === 'hybrid' ? (
            <>
              <Tip isDark={isDark} emoji="🚗" text="Add traditional fleet vehicles (cars, vans, bikes)" />
              <Tip isDark={isDark} emoji="🛢️" text="Add commodity vehicles (tankers) separately" />
              <Tip isDark={isDark} emoji="📱" text="Use mobile menu to switch between Fleet and Commodity views" />
              <Tip isDark={isDark} emoji="👥" text="Invite drivers for both fleet types" />
              <Tip isDark={isDark} emoji="📊" text="Monitor both dashboards for complete insights" />
            </>
          ) : (
            <>
              <Tip isDark={isDark} emoji="🚗" text="Add your vehicles with registration and service dates" />
              <Tip isDark={isDark} emoji="👥" text="Invite drivers so their data belongs to your company" />
              <Tip isDark={isDark} emoji="📝" text="Capture trips daily for accurate tracking" />
              <Tip isDark={isDark} emoji="📊" text="Check analytics regularly for insights" />
            </>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className={`rounded-xl border p-4 bg-${fleetColor}-500/10 border-${fleetColor}-500/30`}>
        <div className="flex items-start gap-3">
          <span className="text-xl">💬</span>
          <div className="flex-1">
            <h3 className={`font-semibold mb-1 text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Need Help?
            </h3>
            <p className={`text-xs mb-2 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Contact support or replay the onboarding tour anytime.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleStartOnboarding}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-${fleetColor}-600 hover:bg-${fleetColor}-700 text-white rounded-lg font-medium text-xs transition`}
              >
                <Play className="w-3 h-3" />
                Replay Tour
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tip component
const Tip = ({ isDark, emoji, text }) => (
  <div className="flex items-start gap-2">
    <span className="text-sm">{emoji}</span>
    <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{text}</p>
  </div>
);

export default OnboardingPage;
