import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
// import SubscriptionBanner from "../subscription/SubscriptionBanner";

// Temporary placeholder to avoid cache issues
const SubscriptionBanner = () => null;

/**
 * AppShell provides the authenticated application chrome with
 * background gradients, navbar placement, and shared padding.
 */
const AppShell = ({ children }) => {
  const { company, userProfile } = useAuth();

  return (
    <div className="relative min-h-screen bg-surface-100 text-slate-100">
      {/* Ambient gradient background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 right-1/4 h-72 w-72 rounded-full bg-brand-gradient opacity-25 blur-4xl" />
        <div className="absolute -bottom-48 left-1/3 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(14,165,233,0.35)_0%,_transparent_60%)] opacity-40 blur-4xl" />
        <div className="absolute top-1/2 left-[-20%] h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.28)_0%,_transparent_65%)] opacity-30 blur-4xl" />
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-surface-100/90 shadow-lg backdrop-blur-xl">
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

