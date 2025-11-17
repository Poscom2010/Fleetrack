import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  MapPin, 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Shield, 
  Zap,
  Car,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import logo from '../assets/FleetTrack-logo.png';

const LandingPage = () => {
  const navigate = useNavigate();
  const { loginWithGoogle, login } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for invitation token and redirect to login page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    
    if (inviteToken) {
      // Redirect to login page with the invite parameter
      navigate(`/login?invite=${encodeURIComponent(inviteToken)}`, { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
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
      setShowAuthModal(false);
      navigate('/dashboard');
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
      navigate('/dashboard');
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
      {/* 3D Background Scene with Dashboard Visualization */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid Floor */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(14,165,233,0.05)_2px,transparent_2px)] bg-[size:80px_80px] opacity-40" style={{ perspective: '1000px', transform: 'rotateX(60deg) translateY(20%)' }}></div>
        
        {/* Glowing Dashboard Elements */}
        <div className="absolute top-1/2 right-1/4 w-96 h-64 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-3xl blur-2xl animate-pulse"></div>
        
        {/* Floating Data Visualization */}
        <div className="absolute bottom-20 right-20 w-64 h-48 border border-cyan-500/30 rounded-2xl bg-slate-900/30 backdrop-blur-sm p-4 animate-float">
          <div className="space-y-2">
            <div className="h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full w-3/4"></div>
            <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-1/2"></div>
            <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full w-2/3"></div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="flex-1 h-16 bg-gradient-to-t from-cyan-500/50 to-transparent rounded"></div>
            <div className="flex-1 h-20 bg-gradient-to-t from-blue-500/50 to-transparent rounded"></div>
            <div className="flex-1 h-12 bg-gradient-to-t from-purple-500/50 to-transparent rounded"></div>
          </div>
        </div>

        {/* Circular Chart */}
        <div className="absolute bottom-32 left-1/3 w-32 h-32 animate-float-delayed">
          <div className="relative w-full h-full">
            <svg className="w-full h-full -rotate-90">
              <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(14,165,233,0.2)" strokeWidth="8"/>
              <circle cx="64" cy="64" r="56" fill="none" stroke="url(#gradient)" strokeWidth="8" strokeDasharray="352" strokeDashoffset="88" className="animate-spin-slow"/>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4"/>
                  <stop offset="100%" stopColor="#3b82f6"/>
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-cyan-400 font-bold text-xl">75%</div>
          </div>
        </div>

        {/* Floating Particles */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
        <div className="absolute top-40 right-20 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-500"></div>
        <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping delay-1000"></div>
        
        {/* World Map Silhouette */}
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 opacity-10">
          <svg viewBox="0 0 800 400" className="w-full h-full">
            <path d="M100,200 Q200,150 300,200 T500,200 Q600,250 700,200" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-500"/>
            <circle cx="150" cy="180" r="3" fill="currentColor" className="text-cyan-400 animate-pulse"/>
            <circle cx="350" cy="210" r="3" fill="currentColor" className="text-blue-400 animate-pulse delay-500"/>
            <circle cx="550" cy="190" r="3" fill="currentColor" className="text-purple-400 animate-pulse delay-1000"/>
          </svg>
        </div>
      </div>

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

            <p className="text-slate-400 mb-8 leading-relaxed">
              Track vehicles, monitor performance, and maximize profits
              <br />with our comprehensive fleet management solution.
            </p>

            {/* Features */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Real-time Tracking</h3>
                  <p className="text-slate-400 text-sm">Monitor your fleet in real-time</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Advanced Analytics</h3>
                  <p className="text-slate-400 text-sm">Detailed insights and reports</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="text-white font-semibold mb-1">Profit Optimization</h3>
                  <p className="text-slate-400 text-sm">Maximize your revenue</p>
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
                  onClick={() => openAuthModal(true)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 text-sm"
                >
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </button>

                {/* Create Account Button */}
                <button
                  onClick={() => openAuthModal(false)}
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
                onClick={() => openAuthModal(true)}
                className="w-full py-2.5 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-medium rounded-lg transition flex items-center justify-center gap-2 text-sm"
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
