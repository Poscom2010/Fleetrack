import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { isSystemAdmin, isCompanyAdmin, isCompanyManager, canViewAnalytics, canManageCompanySettings } from "../../services/userService";
import { getCompanyVehicles } from "../../services/vehicleService";
import toast from "react-hot-toast";
import logo from "../../assets/FleetTrack-logo.png";
import ThemeToggle from "../common/ThemeToggle.jsx";

/**
 * Navbar component with navigation links and user profile
 */
const Navbar = () => {
  const { user, userProfile, company, logout } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [hasTraditionalVehicles, setHasTraditionalVehicles] = useState(false);
  const [hasCommodityVehicles, setHasCommodityVehicles] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState('fleet'); // 'fleet' or 'commodity'
  const profileDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileMenuButtonRef = useRef(null);

  // Detect vehicle types - same logic as Sidebar
  useEffect(() => {
    const detectVehicleTypes = async () => {
      if (!company?.id) return;
      
      const businessType = company?.businessType || userProfile?.businessType;
      
      try {
        const vehicles = await getCompanyVehicles(company.id);
        
        const detectedTraditional = vehicles.some(v => ['taxi', 'courier', 'parcel', 'generalTruck'].includes(v.vehicleType || 'taxi'));
        const detectedCommodity = vehicles.some(v => ['fuelTruck', 'lpGasTruck'].includes(v.vehicleType));
        
        if (vehicles.length === 0 || businessType === 'hybrid') {
          if (businessType === 'traditional') {
            setHasTraditionalVehicles(true);
            setHasCommodityVehicles(false);
          } else if (businessType === 'commodity') {
            setHasTraditionalVehicles(false);
            setHasCommodityVehicles(true);
          } else if (businessType === 'hybrid') {
            setHasTraditionalVehicles(true);
            setHasCommodityVehicles(true);
          } else {
            setHasTraditionalVehicles(detectedTraditional || vehicles.length === 0);
            setHasCommodityVehicles(detectedCommodity);
          }
        } else {
          setHasTraditionalVehicles(detectedTraditional);
          setHasCommodityVehicles(detectedCommodity);
        }
      } catch (error) {
        console.error('Error detecting vehicle types:', error);
        if (businessType === 'commodity') {
          setHasTraditionalVehicles(false);
          setHasCommodityVehicles(true);
        } else if (businessType === 'hybrid') {
          setHasTraditionalVehicles(true);
          setHasCommodityVehicles(true);
        } else {
          setHasTraditionalVehicles(true);
          setHasCommodityVehicles(false);
        }
      }
    };
    detectVehicleTypes();
  }, [company, company?.businessType, userProfile?.businessType]);

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

  // Get navigation links for hybrid mobile switcher
  const getFleetLinks = () => {
    return [
      { path: "/dashboard", label: "Dashboard", icon: "📊" },
      { path: "/vehicles", label: "Vehicles", icon: "🚗" },
      { path: "/entries", label: "Capturing", icon: "✍️" }
    ];
  };

  const getCommodityLinks = () => {
    if (!isCompanyAdmin(userProfile) && !isCompanyManager(userProfile)) {
      return [];
    }
    return [
      { path: "/commodity/dashboard", label: "Dashboard", icon: "📈" },
      { path: "/commodity/logbook", label: "Trip Log", icon: "📖" },
      { path: "/commodity/loads", label: "Load Events", icon: "⬆️" },
      { path: "/commodity/offloads", label: "Deliveries", icon: "⬇️" },
      { path: "/commodity/reconciliation", label: "Reconciliation", icon: "⚖️" }
    ];
  };

  const getCommonLinks = () => {
    const links = [];
    if (canViewAnalytics(userProfile)) {
      links.push({ path: "/analytics", label: "Analytics", icon: "📉" });
    }
    if (isCompanyAdmin(userProfile) || isCompanyManager(userProfile)) {
      links.push({ path: "/team", label: "Team", icon: "👥" });
    }
    return links;
  };

  // Simplified mobile navigation - show only essential links
  const getNavLinks = () => {
    if (isSystemAdmin(userProfile)) {
      return [
        { path: "/admin?tab=dashboard", label: "Dashboard" },
        { path: "/admin?tab=companies", label: "Companies" },
        { path: "/admin?tab=users", label: "Users" },
        { path: "/support-tickets", label: "Support Tickets" },
        { path: "/admin/business", label: "FleetTrack Business" },
        { path: "/admin/analytics", label: "Analytics" },
        { path: "/admin/ai-insights", label: "AI Insights" },
        { path: "/admin/data-recovery", label: "Data Recovery" }
      ];
    }
    
    const links = [];
    
    // For commodity-only companies, show ONLY commodity pages
    if (hasCommodityVehicles && !hasTraditionalVehicles && (isCompanyAdmin(userProfile) || isCompanyManager(userProfile))) {
      links.push(
        { path: "/commodity/dashboard", label: "Dashboard" },
        { path: "/commodity/logbook", label: "Trip Log" },
        { path: "/commodity/loads", label: "Load Events" },
        { path: "/commodity/offloads", label: "Deliveries" },
        { path: "/commodity/reconciliation", label: "Reconciliation" },
        { path: "/commodity/analytics", label: "Analytics" },
        { path: "/team", label: "Team" }
      );
      return links; // Return early to avoid adding duplicate analytics/team
    }
    // For traditional-only companies, show ONLY fleet pages
    else if (hasTraditionalVehicles && !hasCommodityVehicles) {
      links.push(
        { path: "/dashboard", label: "Dashboard" },
        { path: "/vehicles", label: "Vehicles" },
        { path: "/entries", label: "Capturing" }
      );
    }
    // For hybrid companies, show both
    else if (hasTraditionalVehicles && hasCommodityVehicles) {
      links.push(
        { path: "/dashboard", label: "Dashboard" },
        { path: "/vehicles", label: "Vehicles" },
        { path: "/entries", label: "Capturing" }
      );
      if (isCompanyAdmin(userProfile) || isCompanyManager(userProfile)) {
        links.push(
          { path: "/commodity/dashboard", label: "Commodity" },
          { path: "/commodity/reconciliation", label: "Reconciliation" }
        );
      }
    }
    // Default fallback
    else {
      links.push(
        { path: "/dashboard", label: "Dashboard" },
        { path: "/vehicles", label: "Vehicles" },
        { path: "/entries", label: "Capturing" }
      );
    }
    
    // Add analytics for admins and managers only
    if (canViewAnalytics(userProfile)) {
      links.push({ path: "/analytics", label: "Analytics" });
    }
    
    // Add Team for admins and managers
    if (isCompanyAdmin(userProfile) || isCompanyManager(userProfile)) {
      links.push({ path: "/team", label: "Team" });
    }
    
    return links;
  };
  
  const navLinks = getNavLinks();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="relative">
      <div className="w-full">
        <div className="flex items-center justify-between px-3 py-1.5">
          {/* User Info - Mobile Only (Left Side) */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 shadow-md">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
                {userProfile?.fullName?.split(' ')[0]
                  || userProfile?.displayName?.split(' ')[0]
                  || user?.displayName?.split(' ')[0]
                  || 'User'}
              </span>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-baltic-600'}`}>
                {userProfile?.role === 'company_admin' ? 'Admin' :
                 userProfile?.role === 'company_manager' ? 'Manager' :
                 userProfile?.role === 'company_user' ? 'Driver' :
                 userProfile?.role === 'system_admin' ? 'System Admin' : 'User'}
              </span>
              {/* Company Name - Mobile */}
              {!isSystemAdmin(userProfile) && company?.name && (
                <span className={`text-[10px] font-medium mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  🏢 {company.name}
                </span>
              )}
            </div>
          </div>
          
          {/* Logo - Desktop Only (Left Side) */}
          <div className="hidden lg:flex items-center">
            <Link
              to="/dashboard"
              className="group flex items-center gap-2 transition"
            >
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient shadow-brand transition-all duration-300 group-hover:scale-110">
                {/* Logo container */}
                <div className="relative z-10 flex items-center justify-center">
                  <img 
                    src={logo} 
                    alt="FleetTrack" 
                    className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 drop-shadow-lg" 
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className={`text-base font-bold transition ${isDark ? 'text-slate-100 group-hover:text-white' : 'text-baltic-800 group-hover:text-baltic-900'}`}>
                  FleetTrack
                </span>
                {!isSystemAdmin(userProfile) && company?.name && (
                  <span className={`text-[10px] font-medium ${isDark ? 'text-slate-300/80 group-hover:text-white/80' : 'text-baltic-600 group-hover:text-baltic-700'}`}>
                    {company.name}
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* Company logo + User Profile (desktop) */}
          <div className="hidden items-center gap-3 md:flex">
            {/* Company logo/avatar on the right, only for company users */}
            {!isSystemAdmin(userProfile) && company && (
              <Link
                to="/dashboard"
                className="group flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 transition hover:bg-white/10"
              >
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient shadow-md transition-all duration-300 group-hover:scale-110">
                  {/* Logo container */}
                  <div className="relative z-10 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-900">
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={company.name}
                        className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-white">
                        {company.name?.[0]?.toUpperCase() || "C"}
                      </span>
                    )}
                  </div>
                </div>
                <span className="hidden rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-2 py-1 text-sm font-bold text-white shadow-md transition group-hover:shadow-lg lg:block">
                  {company.name}
                </span>
              </Link>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 ${isDark ? 'bg-white/10 text-slate-100 hover:bg-white/20 focus:ring-brand-500/70 focus:ring-offset-surface-100' : 'bg-baltic-100 text-baltic-800 hover:bg-baltic-200 focus:ring-baltic-500/70 focus:ring-offset-white'}`}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 shadow-md">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex flex-col items-start">
                  <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
                    {userProfile?.fullName?.split(' ')[0]
                      || userProfile?.displayName?.split(' ')[0]
                      || user?.displayName?.split(' ')[0]
                      || 'User'}
                  </span>
                  <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-baltic-600'}`}>
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
                <div className={`absolute right-0 mt-3 w-56 rounded-2xl border p-4 text-sm shadow-lg backdrop-blur-xl ${isDark ? 'border-white/10 bg-surface-200/95 text-slate-200' : 'border-baltic-200 bg-white/95 text-baltic-700'}`}>
                  <div className={`border-b pb-3 ${isDark ? 'border-white/10' : 'border-baltic-200'}`}>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
                      {userProfile?.fullName
                        || userProfile?.displayName
                        || user?.displayName
                        || "User"}
                    </p>
                    <p className={`mt-1 truncate text-xs ${isDark ? 'text-slate-400' : 'text-baltic-500'}`}>
                      {user?.email}
                    </p>
                  </div>

                  {/* Profile Settings - Available to all users */}
                  <Link
                    to="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className={`mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium transition ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white' : 'bg-baltic-50 text-baltic-700 hover:bg-baltic-100 hover:text-baltic-900'}`}
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

                  {/* Company Settings shortcut for company admins and managers */}
                  {canManageCompanySettings(userProfile) && (
                    <Link
                      to="/company/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className={`mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium transition ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white' : 'bg-baltic-50 text-baltic-700 hover:bg-baltic-100 hover:text-baltic-900'}`}
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
                    className={`mt-3 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-medium transition ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white' : 'bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-900'}`}
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
              className={`inline-flex items-center justify-center rounded-full p-2 transition focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:ring-offset-2 ${isDark ? 'bg-white/10 text-slate-200 hover:bg-white/20 focus:ring-offset-surface-100' : 'bg-baltic-100 text-baltic-900 hover:bg-baltic-200 focus:ring-offset-white'}`}
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
        <div ref={mobileMenuRef} className={`mx-2 sm:mx-4 mt-3 space-y-3 rounded-2xl sm:rounded-3xl border p-3 sm:p-5 shadow-soft backdrop-blur-xl lg:hidden ${isDark ? 'border-white/10 bg-surface-200/95 text-slate-200' : 'border-baltic-200 bg-white/95 text-baltic-900'}`}>

          {/* Hybrid Company Switcher */}
          {hasTraditionalVehicles && hasCommodityVehicles ? (
            <>
              {/* Fleet Type Switcher */}
              <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <button
                  onClick={() => setMobileViewMode('fleet')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    mobileViewMode === 'fleet'
                      ? 'bg-baltic-600 text-white shadow-md'
                      : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  <span>🚗</span>
                  <span>Fleet</span>
                </button>
                <button
                  onClick={() => setMobileViewMode('commodity')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    mobileViewMode === 'commodity'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  <span>🛢️</span>
                  <span>Commodity</span>
                </button>
              </div>

              {/* Fleet Links */}
              {mobileViewMode === 'fleet' && (
                <div className="space-y-1.5">
                  {getFleetLinks().map((link) => {
                    const active = isActive(link.path);
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block rounded-2xl px-4 py-3 text-base font-medium transition ${
                          active
                            ? "bg-brand-gradient text-white shadow-brand"
                            : isDark ? "bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" : "bg-baltic-50 text-baltic-700 hover:bg-baltic-100 hover:text-baltic-900"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Commodity Links */}
              {mobileViewMode === 'commodity' && (
                <div className="space-y-1.5">
                  {getCommodityLinks().map((link) => {
                    const active = isActive(link.path);
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block rounded-2xl px-4 py-3 text-base font-medium transition ${
                          active
                            ? "bg-brand-gradient text-white shadow-brand"
                            : isDark ? "bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" : "bg-baltic-50 text-baltic-700 hover:bg-baltic-100 hover:text-baltic-900"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Common Links */}
              {getCommonLinks().length > 0 && (
                <div className="space-y-1.5">
                  {getCommonLinks().map((link) => {
                    const active = isActive(link.path);
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => setIsMenuOpen(false)}
                        className={`block rounded-2xl px-4 py-3 text-base font-medium transition ${
                          active
                            ? "bg-brand-gradient text-white shadow-brand"
                            : isDark ? "bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" : "bg-baltic-50 text-baltic-700 hover:bg-baltic-100 hover:text-baltic-900"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          ) : isSystemAdmin(userProfile) ? (
            /* System Admin - Baltic Blue Theme Menu */
            <div className="space-y-1.5">
              {/* System Admin Header */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 ${isDark ? 'bg-baltic-500/10 border border-baltic-500/30' : 'bg-baltic-50 border border-baltic-200'}`}>
                <span className="text-lg">🛡️</span>
                <span className={`text-sm font-bold ${isDark ? 'text-baltic-300' : 'text-baltic-700'}`}>System Admin Panel</span>
              </div>
              
              {navLinks.map((link, index) => {
                const active = isActive(link.path);
                // All links use consistent Baltic Blue theme
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-gradient-to-r from-baltic-600 to-baltic-700 text-white shadow-lg"
                        : isDark 
                          ? 'bg-baltic-500/10 text-baltic-300 hover:bg-baltic-500/20 border border-baltic-500/20' 
                          : 'bg-baltic-50 text-baltic-700 hover:bg-baltic-100 border border-baltic-200'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Non-Hybrid Companies - Standard Menu */
            <div className="space-y-1.5">
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
                        : isDark ? "bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white" : "bg-baltic-50 text-baltic-700 hover:bg-baltic-100 hover:text-baltic-900"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
            
          {/* Divider */}
          <div className={`border-t pt-3 mt-1.5 space-y-1.5 ${isDark ? 'border-white/10' : 'border-baltic-200'}`}>
            {/* Theme Toggle - Mobile */}
            <div className="px-4 py-2">
              <ThemeToggle />
            </div>
            
            {/* Onboarding Guide - Available to all users */}
            <Link
              to="/onboarding"
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition ${isDark ? 'bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20 hover:text-yellow-200' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800'}`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Getting Started
            </Link>
            
            {/* Profile Settings - Available to all users */}
            <Link
              to="/profile"
              onClick={() => setIsMenuOpen(false)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white' : 'bg-baltic-50 text-baltic-700 hover:bg-baltic-100 hover:text-baltic-900'}`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile Settings
            </Link>

            {/* Company Settings - For company admins and managers only */}
            {canManageCompanySettings(userProfile) && (
              <Link
                to="/company/settings"
                onClick={() => setIsMenuOpen(false)}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium transition ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white' : 'bg-baltic-50 text-baltic-700 hover:bg-baltic-100 hover:text-baltic-900'}`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>

          <button
            onClick={() => {
              handleLogout();
              setIsMenuOpen(false);
            }}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-base font-medium transition ${isDark ? 'bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white' : 'bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-900'}`}
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
