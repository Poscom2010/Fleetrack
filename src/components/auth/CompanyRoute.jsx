import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { isAdmin } from "../../services/userService";
import LoadingSpinner from "../common/LoadingSpinner";

/**
 * CompanyRoute component to guard routes that require company membership
 * @param {Object} props - Component props
 * @param {JSX.Element} props.children - Child components to render if has company
 * @returns {JSX.Element} Protected content or redirect to setup
 */
const CompanyRoute = ({ children }) => {
  const { user, userProfile, company, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingSpinner fullScreen text="Loading..." />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Admins bypass company requirement
  if (isAdmin(userProfile)) {
    return children;
  }

  // Redirect to company setup if no company
  if (!company) {
    return <Navigate to="/company/setup" replace />;
  }

  // Render protected content if has company
  return children;
};

export default CompanyRoute;
