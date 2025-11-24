import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, ChevronLeft, Check, Users, Car, FileText, BarChart3, UserPlus, Shield } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';

/**
 * Onboarding component - Role-based guided tour for new users
 */
const Onboarding = ({ user, userProfile, company, onComplete }) => {
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
      const companyName = company?.name || 'your company';
      const roleTitle = role === 'company_admin' ? 'Admin' : 'Manager';
      const isInvited = role === 'company_admin'; // Admins are invited, Managers create the company
      
      return [
        {
          icon: Users,
          title: `Welcome ${firstName}! 👋`,
          description: isInvited 
            ? `You have been invited to ${companyName}. You're now an ${roleTitle} with full access to manage the fleet!`
            : `You are ${roleTitle} for ${companyName}. Let's set up your fleet management system.`,
          points: isInvited ? [
            `🎉 You're now part of ${companyName}'s team`,
            `👔 Your manager invited you as an ${roleTitle}`,
            `🔓 You have full access to all ${companyName} data`,
            `🚗 Manage ${companyName}'s vehicles, drivers, and operations`,
            `📊 View ${companyName}'s analytics and track performance`,
            `🤝 Collaborate with your ${companyName} team effectively`,
          ] : [
            'Manage your company\'s fleet',
            'Track all vehicle operations',
            'Monitor expenses and revenue',
            'Invite and manage your team',
          ],
          color: 'blue',
        },
        {
          icon: Car,
          title: isInvited ? 'Manage Vehicles 🚗' : 'Step 1: Add Your Vehicles 🚗',
          description: isInvited 
            ? 'View and manage the company\'s fleet of vehicles.'
            : 'Start by adding the vehicles in your fleet.',
          points: isInvited ? [
            'Go to "Vehicle Monitoring" page to see existing vehicles',
            'You can add new vehicles if needed',
            'Update vehicle details and maintenance info',
            'Monitor service and license renewal dates',
            'View real-time alerts for maintenance',
          ] : [
            'Go to "Vehicle Monitoring" page',
            'Click "Add Vehicle" button',
            'Enter vehicle details (name, registration, etc.)',
            'Set service and license dates for automatic alerts',
          ],
          color: 'emerald',
        },
        {
          icon: UserPlus,
          title: isInvited ? 'Team Management 👥' : 'Step 2: Invite Your Team 👥',
          description: isInvited 
            ? 'Manage the team and invite new members if needed.'
            : role === 'company_manager' 
              ? '⚠️ IMPORTANT: You can invite both Admins and Drivers to join your company!'
              : '⚠️ IMPORTANT: You must invite drivers to join your company!',
          points: isInvited ? [
            'Go to "Team Management / Invitations" to see all team members',
            'View drivers and their activity',
            'You can invite new team members (admins or drivers)',
            'Monitor driver performance and stats',
            'Collaborate with your manager on team decisions',
          ] : role === 'company_manager' ? [
            'Go to "Team Management / Invitations" page',
            'Click "Invite Admin" or "Invite Driver" button',
            'Admins: Share management responsibilities with you',
            'Drivers: Capture their own trips and data',
            'Enter their details (name, email, phone)',
            'Share the generated invitation link with them',
            '✅ When they register with that link, their data belongs to your company',
          ] : [
            'Go to "Team Management / Invitations" page',
            'Click "Invite Driver" button',
            'Enter their details (name, email, phone)',
            'Share the generated invitation link with them',
            '✅ When they register with that link, their data belongs to your company',
          ],
          color: 'orange',
          highlight: !isInvited,
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
            'Check "Analytics" for fleet insights and AI recommendations',
            'View "Trip Logbook" for detailed trip history',
            'Track revenue vs expenses in real-time',
            'Monitor vehicle performance and alerts',
            'Export reports for accounting and analysis',
            'Get instant help from "Contact Support" page',
          ],
          color: 'purple',
        },
        {
          icon: Check,
          title: 'You\'re Ready to Go! 🚀',
          description: isInvited 
            ? 'You\'re all set! Here\'s how to get started:'
            : 'Everything is set up. Here\'s your quick action plan:',
          points: isInvited ? [
            '1️⃣ Explore existing vehicles and drivers',
            '2️⃣ Review current operations and data',
            '3️⃣ Start capturing data or add new entries',
            '4️⃣ Monitor analytics and set up alerts',
            '5️⃣ Use "Contact Support" if you need help',
            '💡 Tip: Coordinate with your manager on team responsibilities!',  
          ] : role === 'company_manager' ? [
            '1️⃣ Add your vehicles',
            '2️⃣ Invite your team (admins to help manage, drivers to capture data)',
            '3️⃣ Start capturing daily trips and expenses',
            '4️⃣ Monitor analytics and vehicle alerts',
            '5️⃣ Use "Contact Support" for any questions',
            '💡 Tip: Invite team members FIRST so their data is under your company!',
          ] : [
            '1️⃣ Add your vehicles',
            '2️⃣ Invite your drivers',
            '3️⃣ Start capturing daily trips and expenses',
            '4️⃣ Monitor analytics and vehicle alerts',
            '5️⃣ Use "Contact Support" for any questions',
            '💡 Tip: Invite drivers FIRST so their data is under your company!',
          ],
          color: 'green',
        },
      ];
    }

    // Driver (company_user)
    const driverName = userProfile?.fullName || user?.displayName || 'Driver';
    const firstName = driverName.split(' ')[0];
    const companyName = company?.name || 'your company';
    
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
        title: 'Vehicle Monitoring 🚗',
        description: 'View and update vehicle information.',
        points: [
          'Go to "Vehicle Monitoring" to see all company vehicles',
          'Update vehicle details if needed',
          'Check real-time service and license alerts',
          'Monitor vehicle health and maintenance status',
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
          '1️⃣ Check your assigned vehicle in "Vehicle Monitoring"',
          '2️⃣ Start capturing trips in "Capturing"',
          '3️⃣ Record all expenses for each trip',
          '4️⃣ Monitor your performance in "Analytics"',
          '5️⃣ Use "Contact Support" if you need help',
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
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/90 backdrop-blur-sm p-2 pt-20 pb-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-2.5 border-b border-slate-700 bg-slate-900">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-md ${colorClasses.bg} border ${colorClasses.border}`}>
              <Icon className={`w-3.5 h-3.5 ${colorClasses.text}`} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Getting Started</h2>
              <p className="text-xs text-slate-400">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="p-1 hover:bg-slate-800 rounded-md transition text-slate-400 hover:text-white"
            title="Skip onboarding"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-0.5 bg-slate-800">
          <div
            className={`h-full ${colorClasses.progress} transition-all duration-300`}
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Content - Scrollable */}
        <div className="p-3 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Highlight Badge for Important Steps */}
          {currentStepData.highlight && (
            <div className="mb-2 px-2.5 py-1 bg-orange-500/10 border border-orange-500/30 rounded-md">
              <p className="text-orange-400 text-xs font-semibold text-center">
                ⚠️ Important - Please Read
              </p>
            </div>
          )}

          {/* Title */}
          <h3 className="text-lg font-bold text-white mb-1.5">
            {currentStepData.title}
          </h3>

          {/* Description */}
          <p className="text-slate-300 text-xs mb-3">
            {currentStepData.description}
          </p>

          {/* Points */}
          <div className="space-y-1.5">
            {currentStepData.points.map((point, index) => (
              <div key={index} className="flex items-start gap-1.5">
                <div className={`mt-0.5 p-0.5 rounded-full ${colorClasses.bg} flex-shrink-0`}>
                  <Check className={`w-2.5 h-2.5 ${colorClasses.text}`} />
                </div>
                <p className="text-slate-200 text-xs flex-1 leading-relaxed">{point}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-2.5 border-t border-slate-700 bg-slate-900">
          {/* Previous Button */}
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="px-2.5 py-1.5 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Step Indicators */}
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition ${
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
            className={`px-2.5 py-1.5 ${colorClasses.button} text-white rounded-md font-semibold transition text-xs flex items-center gap-1`}
          >
            {currentStep === totalSteps - 1 ? (
              <>
                <span>Start</span>
                <Check className="w-3 h-3" />
              </>
            ) : (
              <>
                <span>Next</span>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
