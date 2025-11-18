import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";

/**
 * LoginForm component for email/password and Google authentication
 * @param {Object} props - Component props
 * @param {Function} props.onSuccess - Callback function called on successful login
 * @param {boolean} props.isRegistering - Whether the form is in registration mode
 * @returns {JSX.Element} LoginForm component
 */
const LoginForm = ({ onSuccess, isRegistering = false }) => {
  const { login, register, loginWithGoogle, loading } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState("");
  const [invitationName, setInvitationName] = useState("");

  // Check for invitation data and pre-fill email, or load saved credentials
  useEffect(() => {
    const invitationEmail = sessionStorage.getItem('invitationEmail');
    const invitationNameStored = sessionStorage.getItem('invitationName');
    
    if (invitationEmail) {
      setEmail(invitationEmail);
      console.log('📧 Pre-filled email from invitation:', invitationEmail);
    } else if (!isRegistering) {
      // Load saved credentials if "Remember Me" was checked
      const savedEmail = localStorage.getItem('fleettrack_saved_email');
      const savedPassword = localStorage.getItem('fleettrack_saved_password');
      const wasRemembered = localStorage.getItem('fleettrack_remember_me') === 'true';
      
      if (savedEmail && wasRemembered) {
        setEmail(savedEmail);
        setRememberMe(true);
        console.log('📧 Pre-filled email from saved credentials');
      }
      
      if (savedPassword && wasRemembered) {
        setPassword(savedPassword);
      }
    }
    
    if (invitationNameStored) {
      setInvitationName(invitationNameStored);
    }
  }, [isRegistering]);

  /**
   * Validate form inputs
   * @returns {boolean} True if form is valid
   */
  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Invalid email address";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    // Confirm password validation (only for registration)
    if (isRegistering) {
      if (!confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle email/password login or registration
   * @param {Event} e - Form submit event
   */
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setAuthError("");

    if (!validateForm()) {
      return;
    }

    try {
      if (isRegistering) {
        await register(email, password);
        
        // Clear invitation data after successful registration
        sessionStorage.removeItem('invitationEmail');
        sessionStorage.removeItem('invitationName');
        
        toast.success("Account created successfully!");
      } else {
        await login(email, password);
        
        // Save credentials if "Remember Me" is checked
        if (rememberMe) {
          localStorage.setItem('fleettrack_saved_email', email);
          localStorage.setItem('fleettrack_saved_password', password);
          localStorage.setItem('fleettrack_remember_me', 'true');
          console.log('💾 Saved login credentials');
        } else {
          // Clear saved credentials if "Remember Me" is unchecked
          localStorage.removeItem('fleettrack_saved_email');
          localStorage.removeItem('fleettrack_saved_password');
          localStorage.removeItem('fleettrack_remember_me');
        }
        
        toast.success("Successfully signed in!");
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error.message || (isRegistering ? "Failed to create account" : "Invalid email or password");
      setAuthError(errorMessage);
      toast.error(errorMessage);
    }
  };

  /**
   * Handle Google sign-in
   */
  const handleGoogleLogin = async () => {
    setAuthError("");
    setErrors({});

    try {
      await loginWithGoogle();
      toast.success("Successfully signed in with Google!");
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error.message || "Failed to sign in with Google";
      setAuthError(errorMessage);
      toast.error(errorMessage);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleEmailLogin} className="space-y-5">
        {/* Invitation Welcome Message */}
        {isRegistering && invitationName && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <span className="text-sm font-medium">Welcome, {invitationName}!</span>
                <p className="text-xs mt-0.5">Complete your registration to join your company.</p>
              </div>
            </div>
          </div>
        )}

        {/* Auth Error Display */}
        {authError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm">{authError}</span>
            </div>
          </div>
        )}

        {/* Email Input */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) {
                setErrors({ ...errors, email: "" });
              }
            }}
            className={`w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white text-gray-900 ${
              errors.email
                ? "border-red-300 focus:ring-red-500"
                : invitationName ? "border-blue-300 bg-blue-50" : "border-gray-300 focus:border-blue-500"
            }`}
            placeholder="you@example.com"
            disabled={loading}
            readOnly={!!invitationName}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-600">{errors.email}</p>
          )}
          {invitationName && !errors.email && (
            <p className="mt-1.5 text-xs text-blue-600">
              ✓ Email from invitation (cannot be changed)
            </p>
          )}
        </div>

        {/* Password Input */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                setErrors({ ...errors, password: "" });
              }
            }}
            className={`w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white text-gray-900 ${
              errors.password
                ? "border-red-300 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500"
            }`}
            placeholder="••••••••"
            disabled={loading}
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Confirm Password Input (only for registration) */}
        {isRegistering && (
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: "" });
                }
              }}
              className={`w-full px-3.5 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors bg-white text-gray-900 ${
                errors.confirmPassword
                  ? "border-red-300 focus:ring-red-500"
                  : "border-gray-300 focus:border-blue-500"
              }`}
              placeholder="••••••••"
              disabled={loading}
            />
            {errors.confirmPassword && (
              <p className="mt-1.5 text-xs text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
        )}

        {/* Remember Me Checkbox (only for login) */}
        {!isRegistering && (
          <div className="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              disabled={loading}
            />
            <label
              htmlFor="rememberMe"
              className="ml-2 block text-sm text-gray-700 cursor-pointer select-none"
            >
              Remember me
            </label>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {isRegistering ? "Creating account..." : "Signing in..."}
            </span>
          ) : (
            isRegistering ? "Create Account" : "Sign In"
          )}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-500">Or</span>
          </div>
        </div>

        {/* Google Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              minWidth: "20px",
              minHeight: "20px",
              maxWidth: "20px",
              maxHeight: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              style={{ display: "block" }}
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          <span>Continue with Google</span>
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
