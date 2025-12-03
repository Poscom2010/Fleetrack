import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Onboarding from "../onboarding/Onboarding";
import FloatingSupportChat from "../support/FloatingSupportChat";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
// import SubscriptionBanner from "../subscription/SubscriptionBanner";

// Temporary placeholder to avoid cache issues
const SubscriptionBanner = () => null;

/**
 * AppShell provides the authenticated application chrome with
 * background gradients, navbar placement, and shared padding.
 * Supports Dark (slate) and Bright (Baltic Blue) themes.
 */
const AppShell = ({ children }) => {
  const { user, company, userProfile, refreshUserData } = useAuth();
  const { isDark } = useTheme();
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
    <div className={`relative min-h-screen transition-colors duration-300 ${
      isDark 
        ? 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-slate-50' 
        : 'bg-gradient-to-br from-baltic-50 via-baltic-100 to-white text-baltic-900'
    }`}>
      {/* Onboarding Modal */}
      {showOnboarding && (
        <Onboarding 
          user={user} 
          userProfile={userProfile}
          company={company}
          onComplete={handleOnboardingComplete} 
        />
      )}

      {/* Ambient gradient background - theme aware */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {isDark ? (
          <>
            {/* Dark theme gradients */}
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 opacity-20 blur-[96px] animate-pulse" />
            <div className="absolute -bottom-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 opacity-15 blur-[96px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-10 blur-[96px]" />
            <div className="absolute top-20 left-1/4 h-80 w-80 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 opacity-15 blur-[96px]" />
            <div className="absolute bottom-32 right-1/4 h-96 w-96 rounded-full bg-gradient-to-tl from-indigo-500 to-blue-600 opacity-20 blur-[96px]" />
          </>
        ) : (
          <>
            {/* Bright theme gradients - Baltic Blue palette */}
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-baltic-200 to-baltic-400 opacity-40 blur-[96px]" />
            <div className="absolute -bottom-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-gradient-to-tr from-baltic-300 to-baltic-500 opacity-30 blur-[96px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40rem] w-[40rem] rounded-full bg-gradient-to-r from-baltic-100 via-baltic-200 to-baltic-300 opacity-50 blur-[96px]" />
          </>
        )}
      </div>

      {/* Sticky Header with glass effect - theme aware */}
      <header className={`sticky top-0 z-50 w-full border-b shadow-xl backdrop-blur-2xl transition-colors duration-300 ${
        isDark 
          ? 'border-white/20 bg-slate-900/70' 
          : 'border-baltic-200 bg-white/80'
      }`}>
        <Navbar />
      </header>

      {/* Subscription Banner */}
      <SubscriptionBanner />

      {/* Main layout with sidebar and content */}
      <div className="relative z-10">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Main content - add left padding on desktop to account for fixed sidebar */}
        <main className="flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pl-56">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Support Chat */}
      <FloatingSupportChat />
    </div>
  );
};

export default AppShell;

