import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import Onboarding from '../components/onboarding/Onboarding';
import { Lightbulb, Play } from 'lucide-react';

/**
 * OnboardingPage - Allows users to replay the onboarding tour anytime
 */
const OnboardingPage = () => {
  usePageTitle('Onboarding Guide');
  const { user, userProfile, company } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const handleStartOnboarding = () => {
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  return (
    <div className="space-y-6">
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
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <div className="p-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-md">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold text-white mb-0.5">
              Onboarding Guide
            </h1>
            <p className="text-slate-300 text-xs">
              Need a refresher? Replay the guided tour to learn how to use FleetTrack effectively.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
        <div className="max-w-2xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex p-2 bg-blue-500/10 border border-blue-500/30 rounded-full mb-2">
            <Play className="w-5 h-5 text-blue-400" />
          </div>

          {/* Title */}
          <h2 className="text-sm font-bold text-white mb-1.5">
            Ready to Learn?
          </h2>

          {/* Description */}
          <p className="text-slate-300 mb-3 text-xs">
            The onboarding guide will walk you through the key features and workflows 
            based on your role. It takes just a few minutes and will help you get the 
            most out of FleetTrack.
          </p>

          {/* Start Button */}
          <button
            onClick={handleStartOnboarding}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-xs shadow-lg transition transform hover:scale-105"
          >
            <Play className="w-3.5 h-3.5" />
            Start Onboarding Tour
          </button>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-md p-2">
              <div className="text-lg mb-1">🎯</div>
              <h3 className="text-white font-semibold mb-0.5 text-xs">Role-Based</h3>
              <p className="text-slate-400 text-[10px]">
                Tailored content for your specific role
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-md p-2">
              <div className="text-lg mb-1">⚡</div>
              <h3 className="text-white font-semibold mb-0.5 text-xs">Quick & Easy</h3>
              <p className="text-slate-400 text-[10px]">
                Takes only 2-3 minutes to complete
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-md p-2">
              <div className="text-lg mb-1">💡</div>
              <h3 className="text-white font-semibold mb-0.5 text-xs">Step-by-Step</h3>
              <p className="text-slate-400 text-[10px]">
                Clear instructions for each feature
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What You'll Learn */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
        <h2 className="text-sm font-bold text-white mb-2.5">What You'll Learn</h2>
        
        {userProfile?.role === 'company_admin' || userProfile?.role === 'company_manager' ? (
          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1 bg-blue-500/10 rounded-full">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-0.5 text-xs">Vehicle Monitoring Setup</h3>
                <p className="text-slate-400 text-[10px]">Learn how to add vehicles, set up alerts, and monitor your fleet in real-time.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1 bg-orange-500/10 rounded-full">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-0.5 text-xs">Inviting Your Team (Critical!)</h3>
                <p className="text-slate-400 text-[10px]">
                  {userProfile?.role === 'company_manager' 
                    ? 'Learn how to invite Admins (to help manage) and Drivers (to capture data) to ensure proper data ownership.'
                    : 'Understand why and how to properly invite drivers to ensure data ownership.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1 bg-emerald-500/10 rounded-full">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-0.5 text-xs">Capturing Trips & Expenses</h3>
                <p className="text-slate-400 text-[10px]">Record daily trips, add multiple expenses per trip, and track your operations.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1 bg-purple-500/10 rounded-full">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-0.5 text-xs">Analytics & Reports</h3>
                <p className="text-slate-400 text-[10px]">Access real-time insights, AI-powered recommendations, and export detailed reports.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1 bg-blue-500/10 rounded-full">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-0.5 text-xs">Your Role in the Fleet</h3>
                <p className="text-slate-400 text-[10px]">Understand how you fit into your company's fleet management system.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1 bg-emerald-500/10 rounded-full">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-0.5 text-xs">Capturing Daily Trips</h3>
                <p className="text-slate-400 text-[10px]">Learn how to record trips, add multiple expenses, and track your daily operations.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1 bg-orange-500/10 rounded-full">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-0.5 text-xs">Vehicle Monitoring</h3>
                <p className="text-slate-400 text-[10px]">View vehicles, check alerts, and update information (note: you cannot delete vehicles).</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1 bg-purple-500/10 rounded-full">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-0.5 text-xs">Tracking Your Performance</h3>
                <p className="text-slate-400 text-[10px]">View your trip history and personal statistics.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <div className="text-lg">💬</div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1 text-xs">Need More Help?</h3>
            <p className="text-blue-200 text-[10px] mb-2">
              If you have questions after completing the onboarding, visit our Support page 
              or contact your administrator.
            </p>
            <a
              href="/support"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition"
            >
              Go to Support
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
