import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useEffect, useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import LoginForm from "../components/auth/LoginForm";
import LandingBackground from "../components/common/LandingBackground";
import logo from "../assets/FleetTrack-logo.png";

/**
 * LoginPage component that displays the login form and handles authentication
 * @returns {JSX.Element} LoginPage component
 */
const LoginPage = () => {
  usePageTitle('Login');
  const navigate = useNavigate();
  const { user, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  // Check for invitation token in URL and store it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    
    if (inviteToken) {
      try {
        // Store the invitation token in sessionStorage
        sessionStorage.setItem('invitationToken', inviteToken);
        console.log('💾 Stored invitation token from URL');
        
        // Decode token to get email and pre-fill
        const decodedData = JSON.parse(atob(inviteToken));
        console.log('✅ Decoded invitation:', decodedData);
        
        // Store email for pre-filling
        sessionStorage.setItem('invitationEmail', decodedData.email);
        sessionStorage.setItem('invitationName', decodedData.fullName);
        
        // Switch to registration mode
        setIsRegistering(true);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error('❌ Error processing invitation:', err);
      }
    }
  }, []);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  /**
   * Handle successful login or registration
   */
  const handleLoginSuccess = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Same animated background as Landing Page */}
      <LandingBackground />

      {/* Content Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Branding */}
            <div className="text-white space-y-8 hidden lg:block">
              {/* Logo */}
              <div className="flex flex-col gap-4 mb-4">
                <img
                  src={logo}
                  alt="FleetTrack"
                  className="drop-shadow-2xl object-contain"
                  style={{ height: "80px", width: "auto", maxWidth: "300px" }}
                />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-300 to-pink-300 font-bold text-xl max-w-md">
                  The power in You. Drive Smart, Earn More
                </span>
              </div>

              {/* Heading */}
              <div>
                <h1 className="text-6xl font-bold mb-4 leading-tight">
                  Manage Your Fleet
                  <br />
                  <span className="text-blue-200">With Confidence</span>
                </h1>
                <p className="text-xl text-blue-100 leading-relaxed">
                  Track vehicles, monitor performance, and maximize profits with
                  our comprehensive fleet management solution.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6"
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
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      Real-time Tracking
                    </h3>
                    <p className="text-blue-200 text-sm">
                      Monitor your fleet in real-time
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      Advanced Analytics
                    </h3>
                    <p className="text-blue-200 text-sm">
                      Detailed insights and reports
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      Profit Optimization
                    </h3>
                    <p className="text-blue-200 text-sm">
                      Maximize your revenue
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20">
                <div>
                  <div className="text-4xl font-bold mb-1">500+</div>
                  <div className="text-blue-200 text-sm">Active Fleets</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-1">99.9%</div>
                  <div className="text-blue-200 text-sm">Uptime</div>
                </div>
                <div>
                  <div className="text-4xl font-bold mb-1">24/7</div>
                  <div className="text-blue-200 text-sm">Support</div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full">
              {/* Mobile Logo */}
              <div className="lg:hidden text-center mb-8">
                <img
                  src={logo}
                  alt="FleetTrack"
                  className="mx-auto mb-4"
                  style={{ height: "40px", width: "auto" }}
                />
                <h1 className="text-3xl font-bold text-white mb-2">
                  FleetTrack
                </h1>
                <p className="text-blue-100">Fleet Management System</p>
              </div>

              {/* Login Card */}
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 relative">
                {/* Gradient Top Border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-3xl"></div>

                <div className="mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                    {isRegistering ? "Create Account" : "Welcome Back"}
                  </h2>
                  <p className="text-gray-600">
                    {isRegistering 
                      ? "Sign up to start managing your fleet" 
                      : "Sign in to access your fleet dashboard"}
                  </p>
                </div>

                <LoginForm onSuccess={handleLoginSuccess} isRegistering={isRegistering} />

                {/* Toggle between Login and Register */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                      onClick={() => setIsRegistering(!isRegistering)}
                      className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                    >
                      {isRegistering ? "Sign In" : "Create Account"}
                    </button>
                  </p>
                </div>

                {/* Trust Badges */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-4 h-4 text-green-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Secure</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-4 h-4 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      <span>Encrypted</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-4 h-4 text-purple-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Verified</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <p className="text-center text-white/70 text-sm mt-6">
                © 2025 FleetTrack. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
