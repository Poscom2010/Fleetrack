import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isSystemAdmin } from "../../services/userService";
import LoadingSpinner from "../common/LoadingSpinner";

/**
 * CompanyOnlyRoute - Guards company-specific routes
 * - Blocks system admins (they should only see /admin)
 * - Forces non-system users without a company to /company/setup
 */
const CompanyOnlyRoute = ({ children }) => {
  const { user, userProfile, company, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect system admin to admin dashboard
  if (isSystemAdmin(userProfile)) {
    return <Navigate to="/admin" replace />;
  }

  // If user has no company yet, show appropriate message
  if (!company) {
    // Check if user has a companyId in their profile but company data isn't loaded
    if (userProfile?.companyId) {
      // User has a company assigned but it's not loaded - show loading or error
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Loading Company...</h1>
            <p className="text-slate-300 mb-6">
              Please wait while we load your company information.
            </p>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      );
    }
    
    // User has no company assigned - show options
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-lg p-8 border border-slate-700 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No Company Access</h1>
          <p className="text-slate-300 mb-6">
            You don't have access to any company yet. Please contact your company manager to be added to a company.
          </p>
          <p className="text-sm text-slate-400 mb-4">
            Or, if you want to create your own company:
          </p>
          <a
            href="/company/setup"
            className="inline-block px-6 py-3 bg-brand-gradient text-white font-semibold rounded-lg hover:shadow-brand-lg transition"
          >
            Create New Company
          </a>
        </div>
      </div>
    );
  }

  // Render protected content for company users
  return children;
};

export default CompanyOnlyRoute;
