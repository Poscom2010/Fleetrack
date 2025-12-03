import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, Check, Users, Car, FileText, BarChart3, UserPlus, Shield, Fuel, Package, Scale, Receipt } from 'lucide-react';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import BusinessTypeSelector from './BusinessTypeSelector';

/**
 * Onboarding component - Fleet-type aware guided tour
 * Supports: Traditional Fleet, Commodity, and Hybrid companies
 */
const Onboarding = ({ user, userProfile, company, onComplete }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [businessType, setBusinessType] = useState(userProfile?.businessType || null);
  const [fleetType, setFleetType] = useState('traditional'); // 'traditional', 'commodity', 'hybrid'
  const [showBusinessTypeSelector, setShowBusinessTypeSelector] = useState(
    !userProfile?.businessType && userProfile?.role === 'company_manager' && !userProfile?.companyId
  );

  // Detect fleet type from company business type or vehicles
  useEffect(() => {
    const detectFleetType = async () => {
      if (!company?.id) return;
      
      const companyBusinessType = company?.businessType || userProfile?.businessType;
      
      // Check business type first
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

  // Get onboarding steps based on role AND fleet type
  const getOnboardingSteps = () => {
    const role = userProfile?.role;
    const firstName = (userProfile?.fullName || user?.displayName || 'User').split(' ')[0];
    const companyName = company?.name || 'your company';
    const isAdmin = role === 'company_admin' || role === 'company_manager';

    // System Admin - unchanged
    if (role === 'system_admin') {
      return [
        {
          icon: Shield,
          title: `Welcome ${firstName}!`,
          description: 'System Admin with full platform control.',
          points: ['Manage all companies', 'View platform analytics', 'Oversee all users'],
          color: 'blue',
        },
        {
          icon: Check,
          title: 'Ready to Go!',
          description: 'Navigate using the sidebar to access all features.',
          points: ['Companies tab for management', 'Analytics for insights', 'Support tickets for help'],
          color: 'green',
        },
      ];
    }

    // COMMODITY-ONLY Companies
    if (fleetType === 'commodity' && isAdmin) {
      return [
        {
          icon: Fuel,
          title: `Welcome ${firstName}!`,
          description: `You're managing commodity operations for ${companyName}.`,
          points: [
            'Track fuel/gas loads and deliveries',
            'Monitor tank levels and variances',
            'Generate invoices and track payments',
            'Reconcile discrepancies automatically',
          ],
          color: 'emerald',
        },
        {
          icon: Car,
          title: 'Add Your Tankers',
          description: 'Start by adding your commodity vehicles.',
          points: [
            'Go to Vehicles page',
            'Add tanker trucks with capacity info',
            'Set up tank compartments if needed',
          ],
          color: 'blue',
        },
        {
          icon: UserPlus,
          title: 'Invite Your Team',
          description: 'Add drivers and admins to help manage operations.',
          points: [
            'Go to Team page',
            'Invite drivers to log their trips',
            'Admins can help manage loads/deliveries',
          ],
          color: 'orange',
          highlight: true,
        },
        {
          icon: Package,
          title: 'Record Load Events',
          description: 'Track when product is loaded onto vehicles.',
          points: [
            'Go to Load Events page',
            'Record depot, quantity, and docket number',
            'System tracks running tank balance',
          ],
          color: 'blue',
        },
        {
          icon: Receipt,
          title: 'Record Deliveries',
          description: 'Log customer deliveries and generate invoices.',
          points: [
            'Go to Deliveries page',
            'Record customer, quantity delivered',
            'Generate invoices automatically',
            'Track payments and outstanding balances',
          ],
          color: 'blue',
        },
        {
          icon: Scale,
          title: 'Reconciliation',
          description: 'Monitor variances and resolve discrepancies.',
          points: [
            'View tank discrepancy alerts',
            'Investigate variances',
            'Mark issues as resolved',
            'Track accountability',
          ],
          color: 'orange',
        },
        {
          icon: Check,
          title: 'Ready to Go!',
          description: 'Your commodity tracking system is set up.',
          points: [
            '1. Add your tanker vehicles',
            '2. Invite your drivers',
            '3. Start recording loads and deliveries',
            '4. Monitor analytics for insights',
          ],
          color: 'green',
        },
      ];
    }

    // HYBRID Companies (both traditional + commodity)
    if (fleetType === 'hybrid' && isAdmin) {
      return [
        {
          icon: Car,
          title: `Welcome ${firstName}!`,
          description: `You're managing a hybrid fleet for ${companyName}.`,
          points: [
            'Traditional fleet: taxis, couriers, delivery',
            'Commodity operations: fuel/gas trucking',
            'Unified dashboard for both',
            'Switch between views easily',
          ],
          color: 'blue',
        },
        {
          icon: Car,
          title: 'Fleet Operations',
          description: 'Manage your traditional vehicles.',
          points: [
            'Add vehicles (cars, vans, bikes)',
            'Track daily trips and mileage',
            'Record cash-in and expenses',
            'View trip logbook history',
          ],
          color: 'emerald',
        },
        {
          icon: Fuel,
          title: 'Commodity Tracking',
          description: 'Manage fuel/gas trucking operations.',
          points: [
            'Add tanker vehicles',
            'Record load events from depots',
            'Log customer deliveries',
            'Track tank balances and variances',
          ],
          color: 'orange',
        },
        {
          icon: UserPlus,
          title: 'Team Management',
          description: 'Invite drivers for both fleet types.',
          points: [
            'Go to Team page',
            'Invite traditional fleet drivers',
            'Invite commodity truck drivers',
            'Assign vehicles to drivers',
          ],
          color: 'blue',
          highlight: true,
        },
        {
          icon: BarChart3,
          title: 'Unified Analytics',
          description: 'View insights across all operations.',
          points: [
            'Fleet analytics for traditional vehicles',
            'Commodity insights for trucking',
            'Combined revenue and expense tracking',
            'Performance comparisons',
          ],
          color: 'blue',
        },
        {
          icon: Check,
          title: 'Ready to Go!',
          description: 'Your hybrid fleet system is ready.',
          points: [
            '1. Add vehicles for both fleet types',
            '2. Invite your team members',
            '3. Use mobile menu to switch views',
            '4. Monitor both dashboards',
          ],
          color: 'green',
        },
      ];
    }

    // TRADITIONAL Fleet (default for admins)
    if (isAdmin) {
      return [
        {
          icon: Car,
          title: `Welcome ${firstName}!`,
          description: `You're managing the fleet for ${companyName}.`,
          points: [
            'Track all vehicle operations',
            'Monitor expenses and revenue',
            'Manage your team',
            'View analytics and insights',
          ],
          color: 'blue',
        },
        {
          icon: Car,
          title: 'Add Your Vehicles',
          description: 'Start by adding your fleet vehicles.',
          points: [
            'Go to Vehicles page',
            'Click Add Vehicle',
            'Enter registration and details',
            'Set service/license dates for alerts',
          ],
          color: 'emerald',
        },
        {
          icon: UserPlus,
          title: 'Invite Your Team',
          description: 'Add drivers to capture their own data.',
          points: [
            'Go to Team page',
            'Click Invite Driver',
            'Share the invitation link',
            'Their data belongs to your company',
          ],
          color: 'orange',
          highlight: true,
        },
        {
          icon: FileText,
          title: 'Capture Trips',
          description: 'Record daily operations.',
          points: [
            'Go to Trip Capturing page',
            'Select vehicle and driver',
            'Enter mileage and cash-in',
            'Add any expenses',
          ],
          color: 'blue',
        },
        {
          icon: BarChart3,
          title: 'View Analytics',
          description: 'Monitor fleet performance.',
          points: [
            'Check Analytics page',
            'View revenue vs expenses',
            'Track vehicle performance',
            'Get AI-powered insights',
          ],
          color: 'blue',
        },
        {
          icon: Check,
          title: 'Ready to Go!',
          description: 'Your fleet management is set up.',
          points: [
            '1. Add your vehicles',
            '2. Invite your drivers',
            '3. Start capturing daily trips',
            '4. Monitor analytics regularly',
          ],
          color: 'green',
        },
      ];
    }

    // DRIVER role
    return [
      {
        icon: Users,
        title: `Welcome ${firstName}!`,
        description: `You're a driver for ${companyName}.`,
        points: [
          'Capture your daily trips',
          'Record expenses',
          'View your performance',
        ],
        color: 'blue',
      },
      {
        icon: FileText,
        title: 'Capture Trips',
        description: 'Record your daily operations.',
        points: [
          'Go to Trip Capturing',
          'Select your vehicle',
          'Enter mileage and cash-in',
          'Add any expenses',
        ],
        color: 'emerald',
      },
      {
        icon: Check,
        title: 'Ready to Go!',
        description: 'Start capturing your trips.',
        points: [
          'Capture data daily',
          'Check your performance in Analytics',
          'Contact support if needed',
        ],
        color: 'green',
      },
    ];
  };

  const steps = getOnboardingSteps();
  const totalSteps = steps.length;
  const currentStepData = steps[currentStep];

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        button: 'bg-blue-600 hover:bg-blue-700',
        progress: 'bg-blue-500',
      },
      emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        button: 'bg-emerald-600 hover:bg-emerald-700',
        progress: 'bg-emerald-500',
      },
      orange: {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        button: 'bg-orange-600 hover:bg-orange-700',
        progress: 'bg-orange-500',
      },
      baltic: {
        bg: 'bg-baltic-500/10',
        border: 'border-baltic-500/30',
        text: 'text-baltic-400',
        button: 'bg-baltic-600 hover:bg-baltic-700',
        progress: 'bg-baltic-500',
      },
      green: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
        button: 'bg-green-600 hover:bg-green-700',
        progress: 'bg-green-500',
      },
    };
    return colors[color] || colors.blue;
  };

  const colorClasses = getColorClasses(currentStepData.color);
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBusinessTypeSelect = async (type) => {
    setBusinessType(type);
    
    try {
      // Save business type to user profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        businessType: type,
      });
      
      toast.success('Business type saved!');
      setShowBusinessTypeSelector(false);
    } catch (error) {
      console.error('Error saving business type:', error);
      toast.error('Failed to save business type');
    }
  };

  const handleComplete = async () => {
    try {
      // Close modal immediately for better UX
      setIsVisible(false);
      
      // Call parent's onComplete to close the modal in parent
      if (onComplete) {
        onComplete();
      }
      
      // Mark onboarding as completed in user profile (async in background)
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date(),
        businessType: businessType || 'traditional', // Default to traditional if not set
      });
      
      toast.success('Welcome aboard! Let\'s get started! 🚀');
      
      // Navigate to appropriate dashboard based on role
      const role = userProfile?.role;
      if (role === 'system_admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Failed to save onboarding progress');
      // Still navigate even if save fails
      const role = userProfile?.role;
      if (role === 'system_admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleSkip = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to skip onboarding? You can always access help from the Support page.'
    );
    
    if (confirmed) {
      await handleComplete();
    }
  };

  if (!isVisible) return null;

  // Show business type selector first for new managers
  if (showBusinessTypeSelector) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
        <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8">
          <BusinessTypeSelector 
            onSelect={handleBusinessTypeSelect}
            selectedType={businessType}
          />
        </div>
      </div>
    );
  }

  // Fleet type badge
  const getFleetTypeBadge = () => {
    if (fleetType === 'commodity') {
      return { label: 'Commodity', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    }
    if (fleetType === 'hybrid') {
      return { label: 'Hybrid Fleet', color: 'bg-baltic-500/20 text-baltic-400 border-baltic-500/30' };
    }
    return { label: 'Fleet', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
  };
  const badge = getFleetTypeBadge();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${colorClasses.bg} border ${colorClasses.border}`}>
              <Icon className={`w-4 h-4 ${colorClasses.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Getting Started</h2>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${badge.color}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white"
            title="Skip onboarding"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-800">
          <div
            className={`h-full ${colorClasses.progress} transition-all duration-500 ease-out`}
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
          {/* Highlight Badge for Important Steps */}
          {currentStepData.highlight && (
            <div className="mb-3 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-orange-400 text-xs font-semibold text-center">
                ⚠️ Important Step
              </p>
            </div>
          )}

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold text-white mb-2">
            {currentStepData.title}
          </h3>

          {/* Description */}
          <p className="text-slate-300 text-xs sm:text-sm mb-4 leading-relaxed">
            {currentStepData.description}
          </p>

          {/* Points */}
          <div className="space-y-2">
            {currentStepData.points.map((point, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className={`mt-0.5 p-0.5 rounded-full ${colorClasses.bg} border ${colorClasses.border} flex-shrink-0`}>
                  <Check className={`w-3 h-3 ${colorClasses.text}`} />
                </div>
                <p className="text-slate-200 text-xs sm:text-sm flex-1 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-3 border-t border-slate-700 bg-slate-900/80">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-3 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          {/* Step Indicators */}
          <div className="flex gap-1.5">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentStep
                    ? `${colorClasses.progress} scale-125`
                    : index < currentStep
                    ? 'bg-slate-500 hover:bg-slate-400'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          {/* Next/Finish Button */}
          <button
            onClick={handleNext}
            className={`px-4 py-2 ${colorClasses.button} text-white rounded-lg font-semibold transition text-xs flex items-center gap-1 shadow-lg`}
          >
            {currentStep === totalSteps - 1 ? (
              <>
                <span>Let's Go!</span>
                <Check className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
