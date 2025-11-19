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
  const { user, userProfile } = useAuth();
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
          onComplete={handleOnboardingComplete} 
        />
      )}

      {/* Header */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
            <Lightbulb className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              Onboarding Guide
            </h1>
            <p className="text-slate-300 text-sm lg:text-base">
              Need a refresher? Replay the guided tour to learn how to use FleetTrack effectively.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 lg:p-8">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="inline-flex p-6 bg-blue-500/10 border border-blue-500/30 rounded-full mb-6">
            <Play className="w-12 h-12 text-blue-400" />
          </div>

          {/* Title */}
          <h2 className="text-xl lg:text-2xl font-bold text-white mb-4">
            Ready to Learn?
          </h2>

          {/* Description */}
          <p className="text-slate-300 mb-8 text-sm lg:text-base">
            The onboarding guide will walk you through the key features and workflows 
            based on your role. It takes just a few minutes and will help you get the 
            most out of FleetTrack.
          </p>

          {/* Start Button */}
          <button
            onClick={handleStartOnboarding}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold text-lg shadow-lg transition transform hover:scale-105"
          >
            <Play className="w-5 h-5" />
            Start Onboarding Tour
          </button>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="text-white font-semibold mb-1 text-sm lg:text-base">Role-Based</h3>
              <p className="text-slate-400 text-xs lg:text-sm">
                Tailored content for your specific role
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="text-white font-semibold mb-1 text-sm lg:text-base">Quick & Easy</h3>
              <p className="text-slate-400 text-xs lg:text-sm">
                Takes only 2-3 minutes to complete
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <div className="text-3xl mb-2">💡</div>
              <h3 className="text-white font-semibold mb-1 text-sm lg:text-base">Step-by-Step</h3>
              <p className="text-slate-400 text-xs lg:text-sm">
                Clear instructions for each feature
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What You'll Learn */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-2xl p-6 lg:p-8">
        <h2 className="text-xl font-bold text-white mb-6">What You'll Learn</h2>
        
        {userProfile?.role === 'company_admin' || userProfile?.role === 'company_manager' ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-blue-500/10 rounded-full">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Setting Up Your Fleet</h3>
                <p className="text-slate-400 text-sm">Learn how to add vehicles and configure your fleet management system.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-orange-500/10 rounded-full">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Inviting Your Drivers (Critical!)</h3>
                <p className="text-slate-400 text-sm">Understand why and how to properly invite drivers to ensure data ownership.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-emerald-500/10 rounded-full">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Capturing Data</h3>
                <p className="text-slate-400 text-sm">Record daily trips, expenses, and manage your fleet operations.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-purple-500/10 rounded-full">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Viewing Analytics</h3>
                <p className="text-slate-400 text-sm">Access reports, insights, and AI-powered recommendations.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-blue-500/10 rounded-full">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Your Role in the Fleet</h3>
                <p className="text-slate-400 text-sm">Understand how you fit into your company's fleet management system.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-emerald-500/10 rounded-full">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Capturing Daily Trips</h3>
                <p className="text-slate-400 text-sm">Learn how to record your daily operations and expenses.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-orange-500/10 rounded-full">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Managing Vehicles</h3>
                <p className="text-slate-400 text-sm">View and update vehicle information (note: you cannot delete vehicles).</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-purple-500/10 rounded-full">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Tracking Your Performance</h3>
                <p className="text-slate-400 text-sm">View your trip history and personal statistics.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-3xl">💬</div>
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-2">Need More Help?</h3>
            <p className="text-blue-200 text-sm mb-4">
              If you have questions after completing the onboarding, visit our Support page 
              or contact your administrator.
            </p>
            <a
              href="/support"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition"
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
