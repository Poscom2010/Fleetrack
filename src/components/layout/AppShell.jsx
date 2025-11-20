import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Onboarding from "../onboarding/Onboarding";
import { useAuth } from "../../hooks/useAuth";
// import SubscriptionBanner from "../subscription/SubscriptionBanner";

// Temporary placeholder to avoid cache issues
const SubscriptionBanner = () => null;

/**
 * AppShell provides the authenticated application chrome with
 * background gradients, navbar placement, and shared padding.
 */
const AppShell = ({ children }) => {
  const { user, company, userProfile, refreshUserData } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  // Check if user needs onboarding (only show once per session)
  useEffect(() => {
    if (userProfile && !userProfile.onboardingCompleted && !onboardingDismissed) {
      setShowOnboarding(true);
    }
  }, [userProfile, onboardingDismissed]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboardingDismissed(true); // Prevent re-showing in this session
    // Refresh user data after a short delay to ensure modal closes first
    setTimeout(() => {
      refreshUserData();
    }, 100);
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-slate-50">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <Onboarding 
          user={user} 
          userProfile={userProfile} 
          onComplete={handleOnboardingComplete} 
        />
      )}

      {/* Vibrant ambient gradient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {/* Top right - Cyan glow */}
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-20 blur-4xl animate-pulse" />
        
        {/* Bottom left - Purple glow */}
        <div className="absolute -bottom-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 opacity-15 blur-4xl" />
        
        {/* Center - Blue accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-10 blur-4xl" />
        
        {/* Top left - Teal glow */}
        <div className="absolute top-20 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 opacity-15 blur-4xl" />
        
        {/* Bottom right - Indigo glow */}
        <div className="absolute bottom-32 right-1/4 h-96 w-96 rounded-full bg-gradient-to-tl from-indigo-500 to-blue-600 opacity-20 blur-4xl" />
      </div>

      {/* Sticky Header with glass effect */}
      <header className="sticky top-0 z-50 w-full border-b border-white/20 bg-slate-900/70 shadow-xl backdrop-blur-2xl">
        <Navbar />
      </header>

      {/* Subscription Banner */}
      <SubscriptionBanner />

      {/* Main layout with sidebar and content */}
      <div className="relative z-10 flex">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content */}
        <main className="flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;

