import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import LandingBackground from '../components/common/LandingBackground';
import { 
  MapPin, 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Shield, 
  Zap,
  Car,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  Users,
  FileText,
  Calendar,
  Gauge
} from 'lucide-react';
import logo from '../assets/FleetTrack-logo.png';

const LandingPage = () => {
  usePageTitle('Welcome');
  const navigate = useNavigate();
  const { loginWithGoogle, login, user, userProfile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for invitation token and handle registration
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
        
        // Open auth modal in registration mode
        setIsLogin(false);
        setShowAuthModal(true);
        setEmail(decodedData.email || '');
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error('❌ Error processing invitation:', err);
      }
    }
  }, [navigate]);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (user && userProfile) {
      // User is authenticated, redirect to appropriate dashboard
      if (userProfile.role === 'system_admin') {
        navigate('/admin', { replace: true });
      } else if (userProfile.companyId) {
        // User has a company, go to dashboard
        navigate('/dashboard', { replace: true });
      } else if (userProfile.role === 'company_admin') {
        // New company admin without company, go to setup
        navigate('/company-setup', { replace: true });
      } else {
        // Invited user without company (shouldn't happen, but handle it)
        navigate('/company-setup', { replace: true });
      }
    }
  }, [user, userProfile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        setShowAuthModal(false);
        // useEffect will handle redirect after user/userProfile are set
      } else {
        // Registration logic
        if (password !== confirmPassword) {
          alert('Passwords do not match!');
          setLoading(false);
          return;
        }
        // For now, just show message - you can implement registration later
        alert('Registration feature coming soon! Please use Google Sign In or contact admin.');
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      setShowAuthModal(false);
      // useEffect will handle redirect after user/userProfile are set
    } catch (error) {
      console.error('Google sign-in error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const openAuthModal = (loginMode = true) => {
    setIsLogin(loginMode);
    setShowAuthModal(true);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden flex">
      {/* Shared animated background */}
      <LandingBackground />

      <div className="relative z-10 flex w-full h-full">
        {/* Left Side - Hero Section */}
        <div className="w-1/3 flex flex-col justify-between p-8">
          {/* Top Section - Logo and Tagline */}
          <div className="flex items-center gap-4">
            <img src={logo} alt="FleetTrack" className="h-20 w-20 object-contain" />
            <span className="inline-block px-3 py-1.5 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 rounded-full text-sm font-medium" style={{color: '#fbbf24'}}>
              The power in You. Drive Smart, Earn More
            </span>
          </div>

          {/* Middle Section - Hero Content */}
          <div>
            <h1 className="text-5xl font-bold text-white mb-4 leading-tight">
              Manage Your Fleet
              <br />
              With Confidence
            </h1>

            <p className="text-slate-400 mb-6 leading-relaxed text-lg">
              Track vehicles, monitor performance, and maximize profits with our comprehensive fleet management solution.
            </p>
            
            {/* Key Benefits */}
            <div className="flex flex-wrap gap-3 mb-8">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Free Access
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Real-time Updates
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Unlimited Vehicles
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Auto Alerts
              </span>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-lg border border-slate-800/50 hover:border-blue-500/30 transition-all">
                <Car className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-1 text-sm">Vehicle Management</h3>
                  <p className="text-slate-400 text-xs">Track all vehicles in one place</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-lg border border-slate-800/50 hover:border-green-500/30 transition-all">
                <DollarSign className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-1 text-sm">Daily Cash-In Tracking</h3>
                  <p className="text-slate-400 text-xs">Monitor revenue per vehicle</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-lg border border-slate-800/50 hover:border-purple-500/30 transition-all">
                <BarChart3 className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-1 text-sm">Advanced Analytics</h3>
                  <p className="text-slate-400 text-xs">Profit trends & insights</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-lg border border-slate-800/50 hover:border-amber-500/30 transition-all">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-1 text-sm">Service Alerts</h3>
                  <p className="text-slate-400 text-xs">Auto maintenance reminders</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-lg border border-slate-800/50 hover:border-cyan-500/30 transition-all">
                <FileText className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-1 text-sm">Trip Logbook</h3>
                  <p className="text-slate-400 text-xs">Complete journey records</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-lg border border-slate-800/50 hover:border-rose-500/30 transition-all">
                <TrendingUp className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-1 text-sm">Expense Tracking</h3>
                  <p className="text-slate-400 text-xs">Fuel, maintenance & more</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-lg border border-slate-800/50 hover:border-indigo-500/30 transition-all">
                <Users className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-1 text-sm">Team Management</h3>
                  <p className="text-slate-400 text-xs">Invite & manage drivers</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-900/30 p-3 rounded-lg border border-slate-800/50 hover:border-emerald-500/30 transition-all">
                <Gauge className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-1 text-sm">Mileage Tracking</h3>
                  <p className="text-slate-400 text-xs">Odometer & distance logs</p>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Section - Stats */}
          <div className="flex gap-12">
            <div>
              <div className="text-4xl font-bold text-white">500+</div>
              <div className="text-slate-400 text-sm">Active Fleets</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">99.9%</div>
              <div className="text-slate-400 text-sm">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">24/7</div>
              <div className="text-slate-400 text-sm">Support</div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Card */}
        <div className="flex-1 flex flex-col justify-start items-center p-12 pt-8 pb-20">
          <div className="w-full max-w-lg space-y-6">
            {/* Stats Cards at Top */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">Total Vehicles</p>
                <p className="text-4xl font-bold text-white">245</p>
              </div>
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
                <p className="text-slate-400 text-xs mb-1">Active</p>
                <p className="text-4xl font-bold text-green-400">198</p>
              </div>
            </div>

            {/* Login Card */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-slate-200">
              <div className="mb-5">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Get Started</h2>
                <p className="text-slate-600 text-sm">Access your fleet management dashboard</p>
              </div>

              <div className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 transition text-sm"
                    placeholder="your@example.com"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 transition text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>

                {/* Sign In Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    openAuthModal(true);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 text-sm"
                >
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Create Account Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    openAuthModal(false);
                  }}
                  className="w-full py-2.5 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold rounded-lg transition flex items-center justify-center gap-2 text-sm"
                >
                  Create Account
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-300"></div>
                <span className="text-xs text-slate-500">or</span>
                <div className="flex-1 h-px bg-slate-300"></div>
              </div>

              {/* Google Sign In */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleGoogleSignIn();
                }}
                disabled={loading}
                className="w-full py-2.5 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-medium rounded-lg transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                Continue with Google
              </button>

              {/* Trust Badges */}
              <div className="mb-4 flex items-center justify-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span>Encrypted</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  <span>Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Centered at Bottom */}
      <div className="absolute bottom-8 left-0 right-0 text-center z-10">
        <p className="text-slate-500 text-sm">
          © 2025 FleetTrack. All rights reserved.
        </p>
      </div>

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative my-8">
            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-slate-600">
                {isLogin ? 'Sign in to access your dashboard' : 'Join FleetTrack to manage your fleet'}
              </p>
            </div>

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  placeholder="your@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  placeholder="••••••••"
                  required
                />
              </div>

              {/* Confirm Password (only for registration) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 transition"
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-300"></div>
              <span className="text-sm text-slate-500">or</span>
              <div className="flex-1 h-px bg-slate-300"></div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-medium rounded-lg transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              Continue with Google
            </button>

            {/* Toggle Login/Register */}
            <div className="mt-6 text-center">
              <p className="text-slate-600 text-sm">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  {isLogin ? 'Create Account' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Animation Keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotateZ(0deg);
          }
          50% {
            transform: translateY(-15px) rotateZ(2deg);
          }
        }
        
        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0px) rotateZ(0deg);
          }
          50% {
            transform: translateY(-20px) rotateZ(-2deg);
          }
        }
        
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 20s linear infinite;
        }
        
        .delay-500 {
          animation-delay: 0.5s;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
