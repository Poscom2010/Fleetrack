import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { isSystemAdmin, isCompanyAdmin, isCompanyManager, canViewAnalytics } from "../../services/userService";
import { getCompanyVehicles } from "../../services/vehicleService";

/**
 * Sidebar component with main navigation links
 */
const Sidebar = () => {
  const { userProfile, company } = useAuth();
  const { isDark } = useTheme();
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState({ fleetOps: true, commodity: true });
  const [hasTraditionalVehicles, setHasTraditionalVehicles] = useState(false);
  const [hasCommodityVehicles, setHasCommodityVehicles] = useState(false);

  // Detect vehicle types in company OR use business type preference
  useEffect(() => {
    const detectVehicleTypes = async () => {
      if (!company?.id) return;
      
      // Get business type from company or userProfile
      const businessType = company?.businessType || userProfile?.businessType;
      console.log('📋 Sidebar: Business type:', businessType);
      
      try {
        const vehicles = await getCompanyVehicles(company.id);
        console.log('🚗 Sidebar: Detected vehicles:', vehicles.map(v => ({ name: v.name, type: v.vehicleType || 'taxi' })));
        
        // Check actual vehicles first
        const detectedTraditional = vehicles.some(v => ['taxi', 'courier', 'parcel', 'generalTruck'].includes(v.vehicleType || 'taxi'));
        const detectedCommodity = vehicles.some(v => ['fuelTruck', 'lpGasTruck'].includes(v.vehicleType));
        
        // If no vehicles yet OR hybrid business type, use business type preference
        if (vehicles.length === 0 || businessType === 'hybrid') {
          console.log('📋 Sidebar: Using business type preference:', businessType);
          
          if (businessType === 'traditional') {
            setHasTraditionalVehicles(true);
            setHasCommodityVehicles(false);
          } else if (businessType === 'commodity') {
            setHasTraditionalVehicles(false);
            setHasCommodityVehicles(true);
          } else if (businessType === 'hybrid') {
            // For hybrid, always show both sections
            setHasTraditionalVehicles(true);
            setHasCommodityVehicles(true);
          } else {
            // Default: show based on detected vehicles or traditional
            setHasTraditionalVehicles(detectedTraditional || vehicles.length === 0);
            setHasCommodityVehicles(detectedCommodity);
          }
        } else {
          // Use actual vehicle detection for non-hybrid
          console.log('🚗 Sidebar: Has traditional vehicles:', detectedTraditional);
          console.log('⛽ Sidebar: Has commodity vehicles:', detectedCommodity);
          setHasTraditionalVehicles(detectedTraditional);
          setHasCommodityVehicles(detectedCommodity);
        }
      } catch (error) {
        console.error('Error detecting vehicle types:', error);
        // Fallback to business type preference or default to traditional
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
    
    // Listen for vehicle changes via custom event
    const handleVehicleChange = () => {
      console.log('🔄 Sidebar: Vehicle change detected, refreshing...');
      detectVehicleTypes();
    };
    window.addEventListener('vehicleChanged', handleVehicleChange);
    
    return () => {
      window.removeEventListener('vehicleChanged', handleVehicleChange);
    };
  }, [company, company?.businessType, userProfile?.businessType]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

  // Get navigation structure based on user role and fleet type
  const getNavStructure = () => {
    if (isSystemAdmin(userProfile)) {
      return {
        main: [
          { path: "/admin?tab=dashboard", label: "Dashboard", icon: "home" },
          { path: "/admin?tab=companies", label: "Companies", icon: "building" },
          { path: "/admin?tab=users", label: "Users", icon: "users" },
          { path: "/support-tickets", label: "Support Tickets", icon: "message-circle" },
          { path: "/admin/business", label: "FleetTrack Business", icon: "trending" },
          { path: "/admin/analytics", label: "Analytics", icon: "chart" },
          { path: "/admin/data-recovery", label: "Data Recovery", icon: "database" }
        ],
        sections: []
      };
    }

    const sections = [];

    // Traditional Fleet Operations (if has traditional vehicles OR no vehicles at all)
    // Always show Fleet Operations section so users can add their first vehicle
    if (hasTraditionalVehicles || (!hasTraditionalVehicles && !hasCommodityVehicles)) {
      const fleetItems = [
        { path: "/fleet/dashboard", label: "Dashboard", icon: "chart" },
        { path: "/vehicles", label: "Vehicles", icon: "truck" },
        { path: "/entries", label: "Trip Capturing", icon: "document" },
        { path: "/logbook", label: "Trip Logbook", icon: "book" }
      ];
      
      sections.push({
        id: 'fleetOps',
        label: 'Fleet Operations',
        icon: 'truck',
        items: fleetItems
      });
    }

    // Commodity Tracking (if has commodity vehicles and user is admin/manager)
    if (hasCommodityVehicles && (isCompanyAdmin(userProfile) || isCompanyManager(userProfile))) {
      const commodityItems = [];
      
      // Only add dashboard link if this is a hybrid fleet (has both types)
      if (hasTraditionalVehicles) {
        commodityItems.push({ path: "/commodity/dashboard", label: "Dashboard", icon: "chart" });
      }
      
      // For commodity-only companies, show Vehicles here (not in Fleet Operations)
      if (!hasTraditionalVehicles) {
        commodityItems.push({ path: "/vehicles", label: "Vehicles", icon: "truck" });
      }
      
      commodityItems.push(
        { path: "/commodity/loads", label: "Load Events", icon: "upload" },
        { path: "/commodity/offloads", label: "Deliveries", icon: "download" },
        { path: "/commodity/logbook", label: "Trip Log", icon: "book" },
        { path: "/commodity/reconciliation", label: "Reconciliation", icon: "alert-triangle" },
        { path: "/commodity/analytics", label: "Insights", icon: "sparkles" }
      );
      
      sections.push({
        id: 'commodity',
        label: 'Commodity Tracking',
        icon: 'fuel',
        items: commodityItems
      });
    }

    return {
      main: [
        { path: "/dashboard", label: "Dashboard", icon: "home" },
      ],
      sections,
      secondary: [
        // Only show traditional analytics if company has NO commodity vehicles
        // (Commodity companies use /commodity/analytics which is better)
        ...(canViewAnalytics(userProfile) && !hasCommodityVehicles ? [{ path: "/analytics", label: "Analytics", icon: "chart" }] : []),
        ...((isCompanyAdmin(userProfile) || isCompanyManager(userProfile)) ? [{ path: "/team", label: "Team", icon: "users" }] : []),
      ],
      help: [
        { path: "/onboarding", label: "Onboarding", icon: "lightbulb" },
      ]
    };
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
      case 'fuel':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        );
      case 'upload':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        );
      case 'download':
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        );
      default:
        return (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        );
    }
  };

  const navStructure = getNavStructure();

  const renderLink = (link) => {
    const active = isActive(link.path);
    return (
      <Link
        key={link.path}
        to={link.path}
        className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
          active
            ? isDark 
              ? "bg-brand-gradient text-white shadow-brand"
              : "bg-gradient-to-r from-baltic-500 to-baltic-600 text-white shadow-lg"
            : isDark
              ? "text-slate-300 hover:bg-white/10 hover:text-white"
              : "text-baltic-700 hover:bg-baltic-100 hover:text-baltic-900"
        }`}
      >
        <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {getIcon(link.icon)}
        </svg>
        <span className="truncate">{link.label}</span>
      </Link>
    );
  };

  const renderSection = (section) => {
    const isExpanded = expandedSections[section.id];
    const hasActiveItem = section.items.some(item => isActive(item.path));

    return (
      <div key={section.id} className="space-y-1">
        <button
          onClick={() => toggleSection(section.id)}
          className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all duration-200 ${
            hasActiveItem
              ? isDark ? "bg-white/10 text-white" : "bg-baltic-100 text-baltic-900"
              : isDark ? "text-slate-400 hover:bg-white/5 hover:text-slate-300" : "text-baltic-600 hover:bg-baltic-50 hover:text-baltic-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {getIcon(section.icon)}
            </svg>
            <span className="truncate">{section.label}</span>
          </div>
          <svg
            className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isExpanded && (
          <div className={`ml-2 pl-4 border-l-2 space-y-1 ${isDark ? 'border-white/10' : 'border-baltic-200'}`}>
            {section.items.map(item => renderLink(item))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-[52px] lg:bottom-0 lg:w-52 backdrop-blur-xl overflow-y-auto z-40 transition-colors duration-300 ${
      isDark 
        ? 'bg-slate-800/40 border-r border-white/10' 
        : 'bg-white/60 border-r border-baltic-200'
    }`}>
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-4">
        {/* Main Links */}
        <div className="space-y-1">
          {navStructure.main.map(link => renderLink(link))}
        </div>

        {/* Sections (Collapsible) */}
        {navStructure.sections && navStructure.sections.length > 0 && (
          <div className="space-y-2">
            {navStructure.sections.map(section => renderSection(section))}
          </div>
        )}

        {/* Secondary Links */}
        {navStructure.secondary && navStructure.secondary.length > 0 && (
          <div className={`pt-4 border-t space-y-1 ${isDark ? 'border-white/10' : 'border-baltic-200'}`}>
            {navStructure.secondary.map(link => renderLink(link))}
          </div>
        )}

        {/* Help Links */}
        {navStructure.help && navStructure.help.length > 0 && (
          <div className={`pt-4 border-t space-y-1 ${isDark ? 'border-white/10' : 'border-baltic-200'}`}>
            <div className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-baltic-500'}`}>
              Help
            </div>
            {navStructure.help.map(link => renderLink(link))}
          </div>
        )}
      </nav>
    </aside>
  );
};

export default Sidebar;
