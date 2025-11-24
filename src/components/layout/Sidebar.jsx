import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isSystemAdmin, isCompanyAdmin, isCompanyManager, canViewAnalytics } from "../../services/userService";

/**
 * Sidebar component with main navigation links
 */
const Sidebar = () => {
  const { userProfile } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    // For System Admin, check query parameters
    if (path.includes('?tab=')) {
      const [pathname, query] = path.split('?');
      const params = new URLSearchParams(query);
      const tab = params.get('tab');
      const currentParams = new URLSearchParams(location.search);
      const currentTab = currentParams.get('tab') || 'dashboard';
      return location.pathname === pathname && currentTab === tab;
    }
    return location.pathname === path;
  };

  // Navigation links based on user role
  const getNavLinks = () => {
    if (isSystemAdmin(userProfile)) {
      return [
        { path: "/admin?tab=dashboard", label: "Dashboard", icon: "home" },
        { path: "/admin?tab=companies", label: "Companies", icon: "building" },
        { path: "/admin?tab=users", label: "Users", icon: "users" },
        { path: "/admin/business", label: "FleetTrack Business", icon: "trending" },
        { path: "/admin/analytics", label: "Analytics", icon: "chart" }
      ];
    }
    
    // Base links for all company users
    const links = [
      { path: "/dashboard", label: "Dashboard", icon: "home" },
      { path: "/vehicles", label: "Vehicle Monitoring", icon: "truck" },
      { path: "/entries", label: "Capturing", icon: "document" },
      { path: "/logbook", label: "Trip Logbook", icon: "book" },
    ];
    
    // Add analytics for admins and managers only
    if (canViewAnalytics(userProfile)) {
      links.push({ path: "/analytics", label: "Analytics", icon: "chart" });
    }

    // Add Team Management/Invitations link for admins and managers
    if (isCompanyAdmin(userProfile) || isCompanyManager(userProfile)) {
      links.push({ path: "/team", label: "Team Management / Invitations", icon: "users" });
    }

    // Add Onboarding for all users
    links.push({ path: "/onboarding", label: "Onboarding Guide", icon: "lightbulb" });
    
    // Add Contact Support for all users
    links.push({ path: "/support", label: "Contact Support", icon: "headset" });
    
    return links;
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'home':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        );
      case 'truck':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        );
      case 'document':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        );
      case 'book':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        );
      case 'chart':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        );
      case 'users':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        );
      case 'building':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        );
      case 'shield':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        );
      case 'headset':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        );
      case 'lightbulb':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        );
      case 'trending':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        );
      default:
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        );
    }
  };

  const navLinks = getNavLinks();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-[73px] lg:bottom-0 lg:w-48 bg-slate-800/40 border-r border-white/10 backdrop-blur-xl overflow-y-auto z-40">
      {/* Navigation links */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navLinks.map((link) => {
          const active = isActive(link.path);
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-brand-gradient text-white shadow-brand"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {getIcon(link.icon)}
              </svg>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
