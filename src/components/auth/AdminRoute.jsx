import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isSystemAdmin } from "../../services/userService";
import LoadingSpinner from "../common/LoadingSpinner";

/**
 * AdminRoute component to guard routes that require SYSTEM ADMIN role
 * Only the app owner (system admin) can access these routes
 * @param {Object} props - Component props
 * @param {JSX.Element} props.children - Child components to render if system admin
 * @returns {JSX.Element} Protected content or redirect
 */
const AdminRoute = ({ children }) => {
  const { user, userProfile, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to dashboard if not system admin
  if (!isSystemAdmin(userProfile)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render protected content if system admin
  return children;
};

export default AdminRoute;
