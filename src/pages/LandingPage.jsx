import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import LandingBackground from '../components/common/LandingBackground';
import { 
  MapPin, 
  BarChart3, 
  TrendingUp, 
  CheckCircle2,
  DollarSign,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronRight,
  X
} from 'lucide-react';
import logo from '../assets/FleetTrack-logo.png';

const LandingPage = () => {
  usePageTitle('Welcome');
  const navigate = useNavigate();
  const { loginWithGoogle, login, signup, user, userProfile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      } else {
        // New user without company, go to company setup
        navigate('/company/setup', { replace: true });
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
        
        // Register the new user
        await signup(email, password);
        setShowAuthModal(false);
        // useEffect will handle redirect after user/userProfile are set
      }
    } catch (error) {
      console.error('Auth error:', error);
      alert(error.message || 'An error occurred. Please try again.');
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

  const [expandedFaq, setExpandedFaq] = useState(null);
  const [showFaqModal, setShowFaqModal] = useState(false);

  const faqs = [
    {
      question: "What types of transport businesses can use FleetTrack?",
      answer: "FleetTrack supports all transport businesses including taxi services, courier companies, parcel delivery, fuel trucks, LP gas trucks, and general haulage. Whether you manage traditional vehicles or commodity transport, FleetTrack adapts to your needs."
    },
    {
      question: "How do I track my fleet's daily revenue and expenses?",
      answer: "FleetTrack provides a comprehensive trip logbook where drivers can record daily cash-in, mileage, and expenses. For commodity trucks, you can track load events, deliveries, and automatically generate invoices. All data is displayed in easy-to-read analytics dashboards."
    },
    {
      question: "Does FleetTrack help with vehicle maintenance?",
      answer: "Yes! FleetTrack sends automatic service alerts based on your vehicle's last service date and mileage. You can track all maintenance expenses, view service history, and never miss a scheduled service again."
    },
    {
      question: "What is AI Revenue Insights for commodity trucks?",
      answer: "For fuel and LP gas trucks, our AI analyzes your load events, deliveries, variances, and expenses to provide actionable insights. It identifies profit opportunities, detects fuel wastage, tracks reconciliation accuracy, and forecasts revenue trends."
    },
    {
      question: "Can I invite my drivers to use FleetTrack?",
      answer: "Absolutely! You can invite unlimited drivers to your company. Each driver gets their own login and can record trips, cash-in, and expenses from their devices. All data automatically syncs to your company dashboard for complete visibility."
    },
    {
      question: "How long is FleetTrack free?",
      answer: "FleetTrack is currently free as we test and improve the platform with real users. We'll notify you well in advance if any pricing changes occur. There are no hidden fees or credit card requirements to get started."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Shared animated background */}
      <LandingBackground />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with Logo and Motto */}
        <header className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="FleetTrack" className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-2xl" />
              <div className="flex flex-col">
                <span className="text-white font-bold text-xl sm:text-2xl tracking-tight">FleetTrack</span>
                <span className="px-3 py-1 bg-gradient-to-r from-yellow-500/30 to-amber-500/30 border border-yellow-500/50 rounded-full text-xs sm:text-sm font-semibold shadow-lg" style={{color: '#fbbf24'}}>
                  The power in You. Drive Smart, Earn More
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFaqModal(true)}
                className="px-5 py-2.5 text-base font-semibold text-slate-200 hover:text-white hover:bg-slate-700/30 rounded-lg transition-all transform hover:scale-105"
              >
                FAQ
              </button>
              <button
                onClick={() => openAuthModal(true)}
                className="px-6 py-2.5 text-base font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 border border-blue-500 rounded-lg transition-all shadow-lg shadow-blue-500/30 transform hover:scale-105"
              >
                Sign In
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex-1">
          {/* Centered Hero Content */}
          <div className="text-center max-w-4xl mx-auto mb-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
              Manage Your Fleet With Confidence
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-4">
              Track vehicles, monitor performance, and maximize profits. Built for taxi, courier, parcel, and commodity transport businesses.
            </p>
            
            {/* CTA Button - Centered */}
            <button
              onClick={() => openAuthModal(false)}
              className="group inline-flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-500/30 transform hover:scale-105 mb-4"
            >
              Get Started for Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Trust Indicators - Inline */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Setup in minutes
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Free for now
              </span>
            </div>
          </div>

          {/* Features Grid - 5 columns on desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-w-6xl mx-auto mb-6">
            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 text-center hover:border-emerald-500/30 hover:scale-105 transition-all">
              <div className="w-10 h-10 mx-auto mb-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold text-xs mb-0.5">Cash-In Tracking</h3>
              <p className="text-slate-400 text-[10px]">Monitor daily revenue</p>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 text-center hover:border-purple-500/30 hover:scale-105 transition-all">
              <div className="w-10 h-10 mx-auto mb-2 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold text-xs mb-0.5">AI Insights</h3>
              <p className="text-slate-400 text-[10px]">Profit trends</p>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm border border-cyan-500/50 rounded-xl p-3 text-center hover:scale-105 transition-all shadow-lg shadow-cyan-500/20">
              <div className="w-10 h-10 mx-auto mb-2 bg-cyan-500/20 border border-cyan-500/40 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-white font-semibold text-xs mb-0.5">Auto Invoicing</h3>
              <p className="text-cyan-300 text-[10px]">Generate & send invoices</p>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 text-center hover:border-amber-500/30 hover:scale-105 transition-all">
              <div className="w-10 h-10 mx-auto mb-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-white font-semibold text-xs mb-0.5">Service Alerts</h3>
              <p className="text-slate-400 text-[10px]">Maintenance reminders</p>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-3 text-center hover:border-blue-500/30 hover:scale-105 transition-all">
              <div className="w-10 h-10 mx-auto mb-2 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold text-xs mb-0.5">Commodity Tracking</h3>
              <p className="text-slate-400 text-[10px]">Loads & deliveries</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-12 py-4 border-y border-slate-800/50 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-white">99.9%</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-white">24/7</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Support</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-white">∞</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Vehicles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-emerald-400">Free</div>
              <div className="text-[10px] text-slate-400 mt-0.5">For Now</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center border-t border-slate-800/50">
          <p className="text-slate-400 text-sm">
            © 2025 FleetTrack. All rights reserved.
          </p>
        </footer>
      </div>

      {/* FAQ Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative my-8">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-white">Frequently Asked Questions</h2>
              <button
                onClick={() => setShowFaqModal(false)}
                className="text-white/80 hover:text-white transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* FAQ Content - Scrollable */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition"
                  >
                    <span className="text-white font-semibold text-base pr-4">
                      {faq.question}
                    </span>
                    <ChevronRight 
                      className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${
                        expandedFaq === index ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-5 pb-4 pt-0">
                      <p className="text-slate-300 text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8 relative my-8">
            {/* Close Button */}
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Header */}
            <div className="mb-4 sm:mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                {isLogin ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 transition text-slate-900"
                  placeholder="your@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 transition text-slate-900"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (only for registration) */}
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 transition text-slate-900"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
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
