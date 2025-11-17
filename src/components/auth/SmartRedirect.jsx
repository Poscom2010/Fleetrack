import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isSystemAdmin } from "../../services/userService";
import LoadingSpinner from "../common/LoadingSpinner";

/**
 * SmartRedirect - Redirects users to the appropriate page based on their role and company status
 */
const SmartRedirect = () => {
  const { user, userProfile, company, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // System admin goes to admin dashboard
  if (isSystemAdmin(userProfile)) {
    return <Navigate to="/admin" replace />;
  }

  // User without company goes to company setup
  if (!company) {
    return <Navigate to="/company/setup" replace />;
  }

  // User with company goes to dashboard
  return <Navigate to="/dashboard" replace />;
};

export default SmartRedirect;
