import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isSystemAdmin, isCompanyAdmin, isCompanyManager, canViewAnalytics, canManageCompanySettings } from "../../services/userService";
import toast from "react-hot-toast";
import logo from "../../assets/FleetTrack-logo.png";

/**
 * Navbar component with navigation links and user profile
 */
const Navbar = () => {
  const { user, userProfile, company, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close profile dropdown if clicking outside
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      
      // Close mobile menu if clicking outside (but not on the menu button)
      if (
        mobileMenuRef.current && 
        !mobileMenuRef.current.contains(event.target) &&
        mobileMenuButtonRef.current &&
        !mobileMenuButtonRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    };

    // Add event listener
    document.addEventListener('mousedown', handleClickOutside);
    
    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Successfully logged out");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Failed to logout. Please try again.");
    }
  };

  // Navigation links based on user role
  const getNavLinks = () => {
    if (isSystemAdmin(userProfile)) {
      return [
        { path: "/admin?tab=dashboard", label: "Dashboard" },
        { path: "/admin?tab=companies", label: "Companies" },
        { path: "/admin?tab=users", label: "Users" },
        { path: "/admin/analytics", label: "Analytics" }
      ];
    }
    
    // Base links for all company users
    const links = [
      { path: "/dashboard", label: "Dashboard" },
      { path: "/vehicles", label: "Vehicle Monitoring" },
      { path: "/entries", label: "Capturing" },
      { path: "/logbook", label: "Trip Logbook" },
    ];
    
    // Add analytics for admins and managers only
    if (canViewAnalytics(userProfile)) {
      links.push({ path: "/analytics", label: "Analytics" });
    }
    
    // Add Team Management for admins and managers
    if (isCompanyAdmin(userProfile) || isCompanyManager(userProfile)) {
      links.push({ path: "/team", label: "Team Management" });
    }
    
    // Add Onboarding for all users
    links.push({ path: "/onboarding", label: "Onboarding Guide" });
    
    // Add Contact Support for all users
    links.push({ path: "/support", label: "Support" });
    
    return links;
  };
  
  const navLinks = getNavLinks();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="relative">
      <div className="w-full">
        <div className="flex items-center justify-between px-4 py-2">
          {/* User Info - Mobile Only (Left Side) */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">
                {userProfile?.fullName?.split(' ')[0]
                  || userProfile?.displayName?.split(' ')[0]
                  || user?.displayName?.split(' ')[0]
                  || 'User'}
              </span>
              <span className="text-xs text-slate-400">
                {userProfile?.role === 'company_admin' ? 'Admin' :
                 userProfile?.role === 'company_manager' ? 'Manager' :
                 userProfile?.role === 'company_user' ? 'Driver' :
                 userProfile?.role === 'system_admin' ? 'System Admin' : 'User'}
              </span>
            </div>
          </div>
          
          {/* Logo - Desktop Only (Left Side) */}
          <div className="hidden lg:flex items-center">
            <Link
              to="/dashboard"
              className="group flex items-center gap-3 transition"
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient shadow-brand transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.6)]">
                {/* Animated glow ring */}
                <div className="absolute inset-0 rounded-full bg-brand-gradient opacity-75 blur-xl animate-pulse"></div>
                {/* Logo container */}
                <div className="relative z-10 flex items-center justify-center">
                  <img 
                    src={logo} 
                    alt="FleetTrack" 
                    className="h-6 w-6 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg" 
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-slate-100 transition group-hover:text-white">
                  FleetTrack
                </span>
                {!isSystemAdmin(userProfile) && company?.name && (
                  <span className="text-xs font-medium text-slate-300/80 group-hover:text-white/80">
                    {company.name}
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* Company logo + User Profile (desktop) */}
          <div className="hidden items-center gap-4 md:flex">
            {/* Company logo/avatar on the right, only for company users */}
            {!isSystemAdmin(userProfile) && company && (
              <Link
                to="/dashboard"
                className="group flex items-center gap-3 rounded-full bg-white/5 px-4 py-2 transition hover:bg-white/10"
              >
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient shadow-brand transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.6)]">
                  {/* Animated glow ring */}
                  <div className="absolute inset-0 rounded-full bg-brand-gradient opacity-75 blur-xl animate-pulse"></div>
                  {/* Logo container */}
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-900">
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={company.name}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-lg"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-white">
                        {company.name?.[0]?.toUpperCase() || "C"}
                      </span>
                    )}
                  </div>
                </div>
                <span className="hidden rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-lg font-bold text-white shadow-lg transition group-hover:shadow-xl lg:block">
                  {company.name}
                </span>
              </Link>
            )}

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:ring-offset-2 focus:ring-offset-surface-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 shadow-lg">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-semibold text-white">
                    {userProfile?.fullName?.split(' ')[0]
                      || userProfile?.displayName?.split(' ')[0]
                      || user?.displayName?.split(' ')[0]
                      || 'User'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {userProfile?.role === 'company_admin' ? 'Admin' :
                     userProfile?.role === 'company_manager' ? 'Manager' :
                     userProfile?.role === 'company_user' ? 'Driver' :
                     userProfile?.role === 'system_admin' ? 'System Admin' : 'User'}
                  </span>
                </div>
                <svg
                  className={`h-4 w-4 transition-transform ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-surface-200/95 p-4 text-sm text-slate-200 shadow-soft backdrop-blur-xl">
                  <div className="border-b border-white/10 pb-3">
                    <p className="font-semibold text-white">
                      {userProfile?.fullName
                        || userProfile?.displayName
                        || user?.displayName
                        || "User"}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {user?.email}
                    </p>
                  </div>

                  {/* Profile Settings - Available to all users */}
                  <Link
                    to="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="mt-3 flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-left font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Profile Settings
                  </Link>

                  {/* Company Settings shortcut for company admins only */}
                  {canManageCompanySettings(userProfile) && (
                    <Link
                      to="/company/settings"
                      className="mt-3 flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-left font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6V4m0 16v-2m8-6h-2M6 12H4m13.657-5.657l-1.414 1.414M8.757 15.243l-1.414 1.414m0-11.314l1.414 1.414m7.486 7.486l1.414 1.414"
                        />
                      </svg>
                      Company Settings
                    </Link>
                  )}

                  {/* Sign Out Button */}
                  <button
                    onClick={handleLogout}
                    className="mt-3 flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-left font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-9V5"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center lg:hidden">
            <button
              ref={mobileMenuButtonRef}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
              className="inline-flex items-center justify-center rounded-full bg-white/10 p-2 text-slate-200 transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:ring-offset-2 focus:ring-offset-surface-100"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div ref={mobileMenuRef} className="mx-4 mt-3 space-y-4 rounded-3xl border border-white/10 bg-surface-200/95 p-5 text-slate-200 shadow-soft backdrop-blur-xl lg:hidden">

          <div className="space-y-2">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block rounded-2xl px-4 py-3 text-base font-medium transition ${
                    active
                      ? "bg-brand-gradient text-white shadow-brand"
                      : "bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <button
            onClick={() => {
              handleLogout();
              setIsMenuOpen(false);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-base font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-9V5"
              />
            </svg>
            Logout
          </button>
        </div>
      )}

    </nav>
  );
};

export default Navbar;
