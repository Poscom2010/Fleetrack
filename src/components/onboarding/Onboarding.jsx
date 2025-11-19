import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, Check, Users, Car, FileText, BarChart3, UserPlus, Shield } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';

/**
 * Onboarding component - Role-based guided tour for new users
 */
const Onboarding = ({ user, userProfile, onComplete }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Determine onboarding content based on role
  const getOnboardingSteps = () => {
    const role = userProfile?.role;

    if (role === 'system_admin') {
      const adminName = userProfile?.fullName || user?.displayName || 'Admin';
      const firstName = adminName.split(' ')[0];
      
      return [
        {
          icon: Shield,
          title: `Welcome ${firstName}! 🎉`,
          description: 'You are a System Admin with full control over the FleetTrack platform.',
          points: [
            'Manage all companies and their data',
            'View platform-wide analytics',
            'Oversee users across all companies',
            'Configure system-wide settings',
          ],
          color: 'purple',
        },
        {
          icon: BarChart3,
          title: 'Your Dashboard',
          description: 'Access everything from your admin dashboard.',
          points: [
            'Monitor all companies in one place',
            'View system-wide statistics',
            'Manage user permissions',
            'Track platform activity',
          ],
          color: 'blue',
        },
        {
          icon: Check,
          title: 'You\'re All Set! ✨',
          description: 'Start managing the platform with confidence.',
          points: [
            'Navigate using the sidebar',
            'All features are available to you',
            'Help is always available in Support',
          ],
          color: 'green',
        },
      ];
    }

    if (role === 'company_admin' || role === 'company_manager') {
      const adminName = userProfile?.fullName || user?.displayName || 'Admin';
      const firstName = adminName.split(' ')[0];
      const companyName = userProfile?.companyName || 'your company';
      const roleTitle = role === 'company_admin' ? 'Admin' : 'Manager';
      
      return [
        {
          icon: Users,
          title: `Welcome ${firstName}! 👋`,
          description: `You are ${roleTitle} for ${companyName}. Let's set up your fleet management system.`,
          points: [
            'Manage your company\'s fleet',
            'Track all vehicle operations',
            'Monitor expenses and revenue',
            'Invite and manage your team',
          ],
          color: 'blue',
        },
        {
          icon: Car,
          title: 'Step 1: Add Your Vehicles 🚗',
          description: 'Start by adding the vehicles in your fleet.',
          points: [
            'Go to "Vehicles" page',
            'Click "Add Vehicle" button',
            'Enter vehicle details (name, registration, etc.)',
            'Set service and license dates for alerts',
          ],
          color: 'emerald',
        },
        {
          icon: UserPlus,
          title: 'Step 2: Invite Your Drivers 👥',
          description: '⚠️ IMPORTANT: You must invite drivers to join your company!',
          points: [
            'Go to "Team Management" page',
            'Click "Invite Driver" button',
            'Enter their details (name, email, phone)',
            'Share the generated invitation link with them',
            '✅ When they register with that link, their data belongs to your company',
          ],
          color: 'orange',
          highlight: true,
        },
        {
          icon: FileText,
          title: 'Step 3: Capture Data 📝',
          description: 'You can capture data yourself OR drivers can do it.',
          points: [
            'Go to "Capturing" page to add entries',
            'Record daily trips, mileage, and cash-in',
            'Track expenses (fuel, repairs, etc.)',
            'You can capture on behalf of any driver',
            'Invited drivers can also capture their own data',
          ],
          color: 'blue',
        },
        {
          icon: BarChart3,
          title: 'View Analytics & Reports 📊',
          description: 'Monitor your fleet\'s performance in real-time.',
          points: [
            'Check "Analytics" for fleet insights',
            'View "Trip Logbook" for all trips',
            'Track revenue vs expenses',
            'Monitor vehicle performance',
            'Get AI-powered recommendations',
          ],
          color: 'purple',
        },
        {
          icon: Check,
          title: 'You\'re Ready to Go! 🚀',
          description: 'Everything is set up. Here\'s your quick action plan:',
          points: [
            '1️⃣ Add your vehicles',
            '2️⃣ Invite your drivers',
            '3️⃣ Start capturing data',
            '4️⃣ Monitor analytics',
            '💡 Tip: Invite drivers FIRST so their data is under your company!',
          ],
          color: 'green',
        },
      ];
    }

    // Driver (company_user)
    const driverName = userProfile?.fullName || user?.displayName || 'Driver';
    const firstName = driverName.split(' ')[0];
    const companyName = userProfile?.companyName || 'your company';
    
    return [
      {
        icon: Users,
        title: `Welcome ${firstName}! 🎉`,
        description: `You are a Driver for ${companyName}.`,
        points: [
          'You\'re part of your company\'s team',
          'Your admin/manager invited you',
          'All your data belongs to your company',
          'You can view and update vehicles',
        ],
        color: 'blue',
      },
      {
        icon: FileText,
        title: 'Capture Your Daily Trips 📝',
        description: 'Record your operations every day.',
        points: [
          'Go to "Capturing" page',
          'Select your assigned vehicle',
          'Enter trip details (start/end mileage, cash-in)',
          'Record expenses (fuel, repairs, etc.)',
          'Your admin can see all your entries',
        ],
        color: 'emerald',
      },
      {
        icon: Car,
        title: 'Manage Vehicles 🚗',
        description: 'View and update vehicle information.',
        points: [
          'See all company vehicles',
          'Update vehicle details if needed',
          'Check service and license alerts',
          '⚠️ Note: You cannot delete vehicles',
        ],
        color: 'orange',
      },
      {
        icon: BarChart3,
        title: 'View Your Performance 📊',
        description: 'Track your trips and statistics.',
        points: [
          'Check "Trip Logbook" for your history',
          'View "Analytics" for your performance',
          'See your total distance and revenue',
          'Monitor your daily activities',
        ],
        color: 'purple',
      },
      {
        icon: Check,
        title: 'You\'re All Set! ✨',
        description: 'Start capturing your daily operations.',
        points: [
          '1️⃣ Check your assigned vehicle',
          '2️⃣ Start capturing trips',
          '3️⃣ Record all expenses',
          '4️⃣ Monitor your performance',
          '💡 Tip: Capture data daily for accurate tracking!',
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
      purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
        button: 'bg-purple-600 hover:bg-purple-700',
        progress: 'bg-purple-500',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 lg:p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 lg:p-3 rounded-xl ${colorClasses.bg} border ${colorClasses.border}`}>
              <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${colorClasses.text}`} />
            </div>
            <div>
              <h2 className="text-lg lg:text-xl font-bold text-white">Getting Started</h2>
              <p className="text-xs lg:text-sm text-slate-400">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
            title="Skip onboarding"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-800">
          <div
            className={`h-full ${colorClasses.progress} transition-all duration-300`}
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 lg:p-8">
          {/* Highlight Badge for Important Steps */}
          {currentStepData.highlight && (
            <div className="mb-4 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-orange-400 text-sm font-semibold text-center">
                ⚠️ Important Information - Please Read Carefully
              </p>
            </div>
          )}

          {/* Title */}
          <h3 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            {currentStepData.title}
          </h3>

          {/* Description */}
          <p className="text-slate-300 text-sm lg:text-base mb-6">
            {currentStepData.description}
          </p>

          {/* Points */}
          <div className="space-y-3 mb-8">
            {currentStepData.points.map((point, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className={`mt-1 p-1 rounded-full ${colorClasses.bg}`}>
                  <Check className={`w-4 h-4 ${colorClasses.text}`} />
                </div>
                <p className="text-slate-200 text-sm lg:text-base flex-1">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 lg:p-6 border-t border-slate-700 bg-slate-900/50">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Step Indicators */}
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition ${
                  index === currentStep
                    ? colorClasses.progress
                    : index < currentStep
                    ? 'bg-slate-600'
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {/* Next/Finish Button */}
          <button
            onClick={handleNext}
            className={`px-4 lg:px-6 py-2 ${colorClasses.button} text-white rounded-lg font-semibold transition text-sm lg:text-base flex items-center gap-2`}
          >
            {currentStep === totalSteps - 1 ? (
              <>
                <span>Get Started</span>
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
