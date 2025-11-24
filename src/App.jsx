import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { AuthProvider } from "./hooks/useAuth";
import { usePageTitle } from "./hooks/usePageTitle";
import { updateCompany } from "./services/companyService";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import CompanyRoute from "./components/auth/CompanyRoute";
import CompanyOnlyRoute from "./components/auth/CompanyOnlyRoute";
import SmartRedirect from "./components/auth/SmartRedirect";
import LandingPage from "./pages/LandingPage";
import VehiclesPage from "./pages/VehiclesPage";
import EntriesPage from "./pages/EntriesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SupportPage from "./pages/SupportPage";
import SystemAdminDashboard from "./pages/SystemAdminDashboard";
import SystemAnalyticsPage from "./pages/SystemAnalyticsPage";
import FleetTrackBusinessPage from "./pages/FleetTrackBusinessPage";
import AnalyticsDashboard from "./components/analytics/AnalyticsDashboard";
import TripLogbookPage from "./pages/TripLogbookPage";
import ProfileSettingsPage from "./pages/ProfileSettingsPage";
import TeamPage from "./pages/TeamPage";
import OnboardingPage from "./pages/OnboardingPage";
import SuccessModal from "./components/common/SuccessModal";
// Full Company Setup Page Component
const CompanySetupPage = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState(null);
  const [formData, setFormData] = React.useState({
    name: "",
    fullName: user?.displayName || "", // Admin's full name
    timezone: "Africa/Johannesburg",
    currency: "ZAR",
    dateFormat: "DD/MM/YYYY",
    logoUrl: "",
    country: "South Africa",
    addressLine1: "",
    addressLine2: "",
    city: "",
    contactEmail: user?.email || "",
    contactPhone: "",
  });

  // Redirect system admin to admin dashboard
  React.useEffect(() => {
    if (userProfile?.role === 'system_admin') {
      navigate('/admin');
    }
  }, [userProfile, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Company name is required');
      return;
    }

    setLoading(true);

    try {
      const { doc, setDoc, serverTimestamp, Timestamp } = await import('firebase/firestore');
      const { db } = await import('./services/firebase');
      
      // Convert logo file to base64 if provided
      let logoUrlToSave = formData.logoUrl || null;
      if (logoFile) {
        const reader = new FileReader();
        logoUrlToSave = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
      }
      
      // Create company
      const companyRef = doc(db, 'companies', crypto.randomUUID());
      const trialEndsAt = new Date();
      trialEndsAt.setMonth(trialEndsAt.getMonth() + 2); // 2 months trial
      
      await setDoc(companyRef, {
        name: formData.name,
        ownerId: user.uid,
        logoUrl: logoUrlToSave,
        country: formData.country || 'Unknown',
        address: {
          line1: formData.addressLine1 || null,
          line2: formData.addressLine2 || null,
          city: formData.city || null,
        },
        contact: {
          email: formData.contactEmail || user.email,
          phone: formData.contactPhone || null,
        },
        currency: formData.currency, // Primary currency field (matches update behavior)
        settings: {
          timezone: formData.timezone,
          currency: formData.currency, // Keep in settings for backward compatibility
          dateFormat: formData.dateFormat,
          serviceInterval: 5000,
        },
        subscriptionStatus: 'trial',
        trialEndsAt: Timestamp.fromDate(trialEndsAt),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Update user profile - creator becomes company admin
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        companyId: companyRef.id,
        role: 'company_admin',
        fullName: formData.fullName || user.displayName,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      // Show success modal and redirect after a delay
      setLoading(false);
      
      // Create and show custom success modal
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 9999;">
          <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 24px; padding: 48px; max-width: 500px; width: 90%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);">
            <div style="text-align: center;">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 0 40px rgba(16, 185, 129, 0.4);">
                <svg style="width: 48px; height: 48px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 style="font-size: 32px; font-weight: 700; color: white; margin-bottom: 16px;">Welcome to FleetTrack!</h2>
              <p style="font-size: 18px; color: #94a3b8; margin-bottom: 32px;">Your company <strong style="color: #e2e8f0;">"${formData.name}"</strong> has been created successfully.</p>
              <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 16px; padding: 24px; margin-bottom: 32px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <svg style="width: 24px; height: 24px; color: #10b981; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span style="color: #d1fae5; font-size: 16px;">Full access activated</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                  <svg style="width: 24px; height: 24px; color: #10b981; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span style="color: #d1fae5; font-size: 16px;">All features unlocked</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <svg style="width: 24px; height: 24px; color: #10b981; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span style="color: #d1fae5; font-size: 16px;">Free</span>
                </div>
              </div>
              <p style="color: #64748b; font-size: 14px;">Redirecting to your dashboard...</p>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 3000);
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Failed to create company: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-slate-800 rounded-lg p-8 border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Your Company</h1>
          <p className="text-slate-400">Set up your fleet management account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Admin Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Your Full Name *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
              placeholder="John Doe"
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              This will be displayed on your profile as Company Manager
            </p>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
              placeholder="Enter your company name"
              required
            />
          </div>

          {/* Branding & contact details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Company Logo (optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                  }
                }}
                className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-600"
              />
              <p className="mt-1 text-xs text-slate-400">
                Upload a square logo (recommended 256x256px)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
                placeholder="company@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Country <span className="text-red-400">*</span>
            </label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
              required
            >
              <option value="South Africa">South Africa</option>
              <option value="Zimbabwe">Zimbabwe</option>
              <option value="Botswana">Botswana</option>
              <option value="Namibia">Namibia</option>
              <option value="Zambia">Zambia</option>
              <option value="Mozambique">Mozambique</option>
              <option value="Kenya">Kenya</option>
              <option value="Nigeria">Nigeria</option>
              <option value="Ghana">Ghana</option>
              <option value="Tanzania">Tanzania</option>
              <option value="Uganda">Uganda</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Address Line 1
              </label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
                placeholder="Street and number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Address Line 2
              </label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
                placeholder="Complex, suburb (optional)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                City / Town
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
                placeholder="Johannesburg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contact Phone (optional)
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
                placeholder="+27 82 123 4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600"
              >
                <optgroup label="Africa">
                  <option value="Africa/Johannesburg">South Africa (SAST)</option>
                  <option value="Africa/Harare">Zimbabwe (CAT)</option>
                  <option value="Africa/Nairobi">Kenya (EAT)</option>
                  <option value="Africa/Lagos">Nigeria (WAT)</option>
                  <option value="Africa/Cairo">Egypt (EET)</option>
                  <option value="Africa/Casablanca">Morocco (WET)</option>
                </optgroup>
                <optgroup label="Americas">
                  <option value="America/New_York">New York (EST)</option>
                  <option value="America/Chicago">Chicago (CST)</option>
                  <option value="America/Denver">Denver (MST)</option>
                  <option value="America/Los_Angeles">Los Angeles (PST)</option>
                  <option value="America/Toronto">Toronto (EST)</option>
                  <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Europe/Berlin">Berlin (CET)</option>
                  <option value="Europe/Moscow">Moscow (MSK)</option>
                </optgroup>
                <optgroup label="Asia">
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Asia/Singapore">Singapore (SGT)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Shanghai">Shanghai (CST)</option>
                </optgroup>
                <optgroup label="Australia & Pacific">
                  <option value="Australia/Sydney">Sydney (AEDT)</option>
                  <option value="Australia/Perth">Perth (AWST)</option>
                  <option value="Pacific/Auckland">Auckland (NZDT)</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="UTC">UTC (Universal)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-3 rounded-lg border border-slate-600"
              >
                <optgroup label="Africa">
                  <option value="ZAR">South African Rand (R)</option>
                  <option value="BWP">Botswana Pula (P)</option>
                  <option value="KES">Kenyan Shilling (KSh)</option>
                  <option value="NGN">Nigerian Naira (₦)</option>
                  <option value="GHS">Ghanaian Cedi (₵)</option>
                  <option value="TZS">Tanzanian Shilling (TSh)</option>
                  <option value="UGX">Ugandan Shilling (USh)</option>
                  <option value="EGP">Egyptian Pound (E£)</option>
                  <option value="MAD">Moroccan Dirham (DH)</option>
                </optgroup>
                <optgroup label="Americas">
                  <option value="USD">US Dollar ($)</option>
                  <option value="CAD">Canadian Dollar (C$)</option>
                  <option value="BRL">Brazilian Real (R$)</option>
                  <option value="MXN">Mexican Peso (MX$)</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                  <option value="CHF">Swiss Franc (CHF)</option>
                  <option value="RUB">Russian Ruble (₽)</option>
                </optgroup>
                <optgroup label="Asia">
                  <option value="AED">UAE Dirham (د.إ)</option>
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="SGD">Singapore Dollar (S$)</option>
                  <option value="JPY">Japanese Yen (¥)</option>
                  <option value="CNY">Chinese Yuan (¥)</option>
                </optgroup>
                <optgroup label="Australia & Pacific">
                  <option value="AUD">Australian Dollar (A$)</option>
                  <option value="NZD">New Zealand Dollar (NZ$)</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Trial Information */}
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <h3 className="font-semibold text-emerald-400">✨ Free Access</h3>
            <ul className="mt-2 space-y-1 text-sm text-emerald-200">
              <li>• Full access to all features</li>
              <li>• Add unlimited vehicles</li>
              <li>• No credit card required</li>
            </ul>
            {/* 
            <div className="mt-3 space-y-1 text-xs text-emerald-300/90">
              <p className="font-semibold text-emerald-200">After trial - Simple tiered pricing:</p>
              <p>• 1-2 vehicles: <span className="font-semibold">R150/month</span></p>
              <p>• 3-5 vehicles: <span className="font-semibold">R350/month</span></p>
              <p>• 6-10 vehicles: <span className="font-semibold">R600/month</span></p>
              <p>• 11+ vehicles: <span className="font-semibold">R50 per vehicle/month</span></p>
            </div>
            */}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-brand-500 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-brand-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating Company..." : "Create Company"}
          </button>
        </form>
      </div>
    </div>
  );
};

// Driver Dashboard - Simplified view for company users (drivers)
const DriverDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = React.useState({
    daily: { trips: 0, distance: 0, avgExpenses: 0 },
    monthly: { trips: 0, distance: 0, avgExpenses: 0 },
    yearly: { trips: 0, distance: 0, avgExpenses: 0 },
  });
  const [tripLogs, setTripLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadDriverStats();
  }, []);

  const loadDriverStats = async () => {
    try {
      const { collection, query, where, getDocs, Timestamp } = await import('firebase/firestore');
      const { db } = await import('./services/firebase');

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // First, get vehicles assigned to this driver
      const vehiclesQuery = query(
        collection(db, 'vehicles'),
        where('userId', '==', user.uid)
      );
      const vehiclesSnapshot = await getDocs(vehiclesQuery);
      const vehicleIds = vehiclesSnapshot.docs.map(doc => doc.id);

      // If no vehicles assigned, show zeros
      if (vehicleIds.length === 0) {
        setStats({
          daily: { trips: 0, distance: 0, avgExpenses: 0 },
          monthly: { trips: 0, distance: 0, avgExpenses: 0 },
          yearly: { trips: 0, distance: 0, avgExpenses: 0 },
        });
        setTripLogs([]);
        setLoading(false);
        return;
      }

      // Get daily entries for this user's vehicles only
      const dailyEntriesQuery = query(
        collection(db, 'dailyEntries'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(startOfDay))
      );
      const dailySnapshot = await getDocs(dailyEntriesQuery);
      const dailyEntries = dailySnapshot.docs.filter(doc => vehicleIds.includes(doc.data().vehicleId));
      const dailyTrips = dailyEntries.length;
      const dailyDistance = dailyEntries.reduce((sum, doc) => {
        const data = doc.data();
        return sum + ((data.endKm || 0) - (data.startKm || 0));
      }, 0);

      // Get monthly entries for assigned vehicles
      const monthlyEntriesQuery = query(
        collection(db, 'dailyEntries'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(startOfMonth))
      );
      const monthlySnapshot = await getDocs(monthlyEntriesQuery);
      const monthlyEntries = monthlySnapshot.docs.filter(doc => vehicleIds.includes(doc.data().vehicleId));
      const monthlyTrips = monthlyEntries.length;
      const monthlyDistance = monthlyEntries.reduce((sum, doc) => {
        const data = doc.data();
        return sum + ((data.endKm || 0) - (data.startKm || 0));
      }, 0);

      // Get yearly entries for assigned vehicles
      const yearlyEntriesQuery = query(
        collection(db, 'dailyEntries'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(startOfYear))
      );
      const yearlySnapshot = await getDocs(yearlyEntriesQuery);
      const yearlyEntries = yearlySnapshot.docs.filter(doc => vehicleIds.includes(doc.data().vehicleId));
      const yearlyTrips = yearlyEntries.length;
      const yearlyDistance = yearlyEntries.reduce((sum, doc) => {
        const data = doc.data();
        return sum + ((data.endKm || 0) - (data.startKm || 0));
      }, 0);

      // Get expenses for average calculation
      const dailyExpensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(startOfDay))
      );
      const dailyExpSnapshot = await getDocs(dailyExpensesQuery);
      const dailyTotalExpenses = dailyExpSnapshot.docs
        .filter(doc => vehicleIds.includes(doc.data().vehicleId))
        .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      const dailyAvgExpenses = dailyTrips > 0 ? dailyTotalExpenses / dailyTrips : 0;

      const monthlyExpensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(startOfMonth))
      );
      const monthlyExpSnapshot = await getDocs(monthlyExpensesQuery);
      const monthlyTotalExpenses = monthlyExpSnapshot.docs
        .filter(doc => vehicleIds.includes(doc.data().vehicleId))
        .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      const monthlyAvgExpenses = monthlyTrips > 0 ? monthlyTotalExpenses / monthlyTrips : 0;

      const yearlyExpensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(startOfYear))
      );
      const yearlyExpSnapshot = await getDocs(yearlyExpensesQuery);
      const yearlyTotalExpenses = yearlyExpSnapshot.docs
        .filter(doc => vehicleIds.includes(doc.data().vehicleId))
        .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      const yearlyAvgExpenses = yearlyTrips > 0 ? yearlyTotalExpenses / yearlyTrips : 0;

      setStats({
        daily: { trips: dailyTrips, distance: dailyDistance, avgExpenses: dailyAvgExpenses },
        monthly: { trips: monthlyTrips, distance: monthlyDistance, avgExpenses: monthlyAvgExpenses },
        yearly: { trips: yearlyTrips, distance: yearlyDistance, avgExpenses: yearlyAvgExpenses },
      });

      // Get recent trip logs (last 30 days) for the table
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);
      
      const tripsQuery = query(
        collection(db, 'dailyEntries'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(last30Days))
      );
      const tripsSnapshot = await getDocs(tripsQuery);
      
      // Get expenses for these trips
      const expensesQuery = query(
        collection(db, 'expenses'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(last30Days))
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      
      // Create expense map by entry ID
      const expenseMap = {};
      expensesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const entryId = data.dailyEntryId;
        if (entryId) {
          if (!expenseMap[entryId]) {
            expenseMap[entryId] = 0;
          }
          expenseMap[entryId] += data.amount || 0;
        }
      });
      
      // Build trip logs with vehicle filter
      const trips = tripsSnapshot.docs
        .filter(doc => vehicleIds.includes(doc.data().vehicleId))
        .map(doc => {
          const data = doc.data();
          const distance = (data.endKm || 0) - (data.startKm || 0);
          return {
            id: doc.id,
            date: data.date?.toDate ? data.date.toDate() : new Date(),
            from: data.startLocation || 'N/A',
            to: data.endLocation || 'N/A',
            startKm: data.startKm || 0,
            endKm: data.endKm || 0,
            distance: distance,
            cashIn: data.cashIn || 0,
            expenses: expenseMap[doc.id] || 0,
          };
        })
        .sort((a, b) => b.date - a.date); // Most recent first
      
      setTripLogs(trips);
    } catch (error) {
      console.error('Error loading driver stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">My Performance</h1>
        <p className="text-slate-400 text-sm">Track your daily, monthly, and yearly performance</p>
      </div>

      {/* Daily Stats */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-3">Today</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5">Trips Completed</p>
            <p className="text-xl font-bold text-blue-400">{stats.daily.trips}</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5">Distance Driven</p>
            <p className="text-xl font-bold text-purple-400">{stats.daily.distance.toLocaleString()} km</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5">Avg Expenses</p>
            <p className="text-xl font-bold text-orange-400">R {stats.daily.avgExpenses.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-3">This Month</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5">Trips Completed</p>
            <p className="text-xl font-bold text-blue-400">{stats.monthly.trips}</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5">Distance Driven</p>
            <p className="text-xl font-bold text-purple-400">{stats.monthly.distance.toLocaleString()} km</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5">Avg Expenses</p>
            <p className="text-xl font-bold text-orange-400">R {stats.monthly.avgExpenses.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Yearly Stats */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-3">This Year</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5">Trips Completed</p>
            <p className="text-xl font-bold text-blue-400">{stats.yearly.trips}</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5">Distance Driven</p>
            <p className="text-xl font-bold text-purple-400">{stats.yearly.distance.toLocaleString()} km</p>
          </div>
          <div className="bg-slate-900 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-0.5">Avg Expenses</p>
            <p className="text-xl font-bold text-orange-400">R {stats.yearly.avgExpenses.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a
            href="/entries"
            className="flex items-center gap-2 bg-brand-gradient p-3 rounded-lg hover:shadow-brand-lg transition"
          >
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-white font-semibold text-sm">Add New Entry</span>
          </a>
          <a
            href="/vehicles"
            className="flex items-center gap-2 bg-white/10 p-3 rounded-lg hover:bg-white/20 transition"
          >
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-white font-semibold text-sm">View My Vehicles</span>
          </a>
        </div>
      </div>

      {/* Trip Log Table */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <h2 className="text-lg font-bold text-white mb-3">My Trip Log (Last 30 Days)</h2>
        {tripLogs.length === 0 ? (
          <p className="text-slate-400 text-center py-6 text-sm">No trips recorded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-2 text-slate-300 font-semibold">Date</th>
                  <th className="text-left py-3 px-2 text-slate-300 font-semibold">From</th>
                  <th className="text-left py-3 px-2 text-slate-300 font-semibold">To</th>
                  <th className="text-right py-3 px-2 text-slate-300 font-semibold">Start KM</th>
                  <th className="text-right py-3 px-2 text-slate-300 font-semibold">End KM</th>
                  <th className="text-right py-3 px-2 text-slate-300 font-semibold">Distance</th>
                  <th className="text-right py-3 px-2 text-slate-300 font-semibold">Cash In</th>
                  <th className="text-right py-3 px-2 text-slate-300 font-semibold">Expenses</th>
                  <th className="text-right py-3 px-2 text-slate-300 font-semibold">Net</th>
                </tr>
              </thead>
              <tbody>
                {tripLogs.map((trip) => (
                  <tr key={trip.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-2 text-white">
                      {trip.date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="py-3 px-2 text-slate-300">{trip.from}</td>
                    <td className="py-3 px-2 text-slate-300">{trip.to}</td>
                    <td className="py-3 px-2 text-right text-slate-300">{trip.startKm.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-slate-300">{trip.endKm.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-blue-400 font-semibold">{trip.distance.toLocaleString()} km</td>
                    <td className="py-3 px-2 text-right text-green-400 font-semibold">R {trip.cashIn.toFixed(2)}</td>
                    <td className="py-3 px-2 text-right text-red-400 font-semibold">R {trip.expenses.toFixed(2)}</td>
                    <td className={`py-3 px-2 text-right font-bold ${(trip.cashIn - trip.expenses) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      R {(trip.cashIn - trip.expenses).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-600">
                  <td colSpan="5" className="py-3 px-2 text-right text-white font-bold">Totals:</td>
                  <td className="py-3 px-2 text-right text-blue-400 font-bold">
                    {tripLogs.reduce((sum, trip) => sum + trip.distance, 0).toLocaleString()} km
                  </td>
                  <td className="py-3 px-2 text-right text-green-400 font-bold">
                    R {tripLogs.reduce((sum, trip) => sum + trip.cashIn, 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right text-red-400 font-bold">
                    R {tripLogs.reduce((sum, trip) => sum + trip.expenses, 0).toFixed(2)}
                  </td>
                  <td className={`py-3 px-2 text-right font-bold ${
                    (tripLogs.reduce((sum, trip) => sum + trip.cashIn, 0) - tripLogs.reduce((sum, trip) => sum + trip.expenses, 0)) >= 0 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    R {(tripLogs.reduce((sum, trip) => sum + trip.cashIn, 0) - tripLogs.reduce((sum, trip) => sum + trip.expenses, 0)).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Company Settings Page for Company Admins
const CompanySettingsPage = () => {
  const navigate = useNavigate();
  const { user, company, userProfile, refreshUserData } = useAuth();
  const [users, setUsers] = React.useState([]);
  const [invitations, setInvitations] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState(null);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [showSuccessModal, setShowSuccessModal] = React.useState(false);
  const [successInvitationData, setSuccessInvitationData] = React.useState(null);
  const [inviteForm, setInviteForm] = React.useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    location: '',
    role: 'company_user',
  });

  // Only company admins, company managers, and system admins can access this page
  const isSystemAdmin = userProfile?.role === 'system_admin';
  
  React.useEffect(() => {
    if (
      userProfile &&
      userProfile.role !== 'company_admin' &&
      userProfile.role !== 'company_manager' &&
      userProfile.role !== 'system_admin'
    ) {
      navigate('/dashboard');
    }
  }, [userProfile, navigate]);

  const [profileForm, setProfileForm] = React.useState({
    name: "",
    logoUrl: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    contactEmail: "",
    contactPhone: "",
    currency: "USD",
  });

  React.useEffect(() => {
    // Initialize profile form from current company
    if (company) {
      setProfileForm({
        name: company.name || "",
        logoUrl: company.logoUrl || "",
        addressLine1: company.address?.line1 || "",
        addressLine2: company.address?.line2 || "",
        city: company.address?.city || "",
        contactEmail: company.contact?.email || "",
        contactPhone: company.contact?.phone || "",
        currency: company.currency || "USD",
      });
    }
  }, [company]);

  React.useEffect(() => {
    if (company || isSystemAdmin) {
      loadCompanyUsers();
      loadInvitations();
    }
  }, [company, isSystemAdmin]);
  
  const loadCompanyUsers = async () => {
    try {
      setLoading(true);
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('./services/firebase');
      
      let q;
      
      if (isSystemAdmin) {
        // System admin can see all users
        q = query(collection(db, 'users'));
      } else {
        if (!company) return;
        // Company admin sees only their company users
        q = query(
          collection(db, 'users'),
          where('companyId', '==', company.id)
        );
      }
      
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : data.lastLoginAt || null,
        };
      });
      
      console.log('✅ Loaded users:', usersData.length);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('./services/firebase');
      
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      
      await loadCompanyUsers();
      alert('User role updated successfully!');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };


  const loadInvitations = async () => {
    try {
      if (isSystemAdmin) {
        // System admin sees all invitations from all companies (from company.pendingInvitations)
        const { collection, getDocs } = await import('firebase/firestore');
        const { db } = await import('./services/firebase');
        
        const companiesSnapshot = await getDocs(collection(db, 'companies'));
        const allInvitations = [];
        
        companiesSnapshot.docs.forEach(doc => {
          const companyData = doc.data();
          const companyInvites = companyData.pendingInvitations || [];
          companyInvites.forEach(inv => {
            allInvitations.push({
              ...inv,
              companyId: doc.id,
              companyName: companyData.name,
            });
          });
        });
        
        console.log('✅ Loaded invitations (system admin):', allInvitations.length);
        setInvitations(allInvitations);
      } else {
        // Company admin sees invitations for their company only
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('./services/firebase');
        if (!company) return;
        
        const companyRef = doc(db, 'companies', company.id);
        const companySnap = await getDoc(companyRef);
        if (!companySnap.exists()) {
          setInvitations([]);
          return;
        }
        
        const companyData = companySnap.data();
        const companyInvites = companyData.pendingInvitations || [];
        console.log('✅ Loaded invitations (company):', companyInvites.length);
        setInvitations(companyInvites);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const handleInviteDriver = async (e) => {
    e.preventDefault();
    try {
      const { doc, setDoc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('./services/firebase');
      
      // Store invitation in company document's metadata
      // This works because admins have write access to their company document
      const companyRef = doc(db, 'companies', company.id);
      const companyDoc = await getDoc(companyRef);
      
      if (!companyDoc.exists()) {
        alert('Company not found. Please try again.');
        return;
      }
      
      // Get existing invitations or create new array
      const existingInvitations = companyDoc.data().pendingInvitations || [];
      
      // Check if email already invited
      const alreadyInvited = existingInvitations.some(inv => 
        inv.email === inviteForm.email && inv.status === 'pending'
      );
      
      if (alreadyInvited) {
        alert('This email has already been invited. Please use a different email.');
        return;
      }
      
      // Generate unique invitation token
      const invitationToken = btoa(JSON.stringify({
        companyId: company.id,
        companyName: company.name,
        email: inviteForm.email.toLowerCase(),
        fullName: inviteForm.fullName,
        phoneNumber: inviteForm.phoneNumber || null,
        location: inviteForm.location || null,
        role: inviteForm.role,
        timestamp: Date.now()
      }));
      
      // Add new invitation to array
      const newInvitation = {
        id: Date.now().toString(),
        token: invitationToken,
        email: inviteForm.email.toLowerCase(),
        fullName: inviteForm.fullName,
        phoneNumber: inviteForm.phoneNumber || null,
        location: inviteForm.location || null,
        role: inviteForm.role,
        status: 'pending',
        invitedBy: user.uid,
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      existingInvitations.push(newInvitation);
      
      // Update company document with new invitations array
      await updateDoc(companyRef, {
        pendingInvitations: existingInvitations,
        updatedAt: serverTimestamp(),
      });
      
      // Generate registration link
      const registrationLink = `${window.location.origin}/?invite=${encodeURIComponent(invitationToken)}`;
      
      console.log('✅ Invitation created with link:', registrationLink);
      
      // Prepare success modal data
      setSuccessInvitationData({
        email: inviteForm.email,
        fullName: inviteForm.fullName,
        role: inviteForm.role === 'company_user' ? 'Driver' : 'Manager',
        companyName: company.name,
        registrationLink: registrationLink,
        invitationToken: invitationToken,
      });
      
      // Close invite modal and show success modal
      setShowInviteModal(false);
      setShowSuccessModal(true);
      setInviteForm({ email: '', fullName: '', phoneNumber: '', location: '', role: 'company_user' });
      await loadCompanyUsers();
    } catch (error) {
      console.error('Error inviting driver:', error);
      alert('Failed to create invitation: ' + error.message + '\n\nError details: ' + (error.code || 'Unknown error'));
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      const { cancelInvitation } = await import('./services/invitationService');
      await cancelInvitation(invitationId);
      await loadInvitations();
      alert('Invitation cancelled successfully');
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      alert('Failed to cancel invitation');
    }
  };

  const handleResetPassword = async (userId, userEmail) => {
    if (!window.confirm(`Reset password for ${userEmail}? A new password will be generated.`)) {
      return;
    }

    try {
      const { updatePassword } = await import('firebase/auth');
      const { auth } = await import('./services/firebase');
      
      // Generate new password
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      let newPassword = '';
      for (let i = 0; i < 10; i++) {
        newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      // Note: This requires the user to be signed in, so we'll need to use Admin SDK
      // For now, show the new password to admin to manually share
      alert(`New password generated for ${userEmail}:\n\nPassword: ${newPassword}\n\nPlease share this with the user. Note: You'll need to update this in Firebase Authentication manually or use Firebase Admin SDK.`);
      
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password: ' + error.message);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!company?.id) return;

    try {
      setSavingProfile(true);
      let logoUrlToSave = company.logoUrl || null; // Keep existing logo by default

      // If a new logo file is selected, convert to base64
      if (logoFile) {
        const reader = new FileReader();
        logoUrlToSave = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
      }

      await updateCompany(company.id, {
        name: profileForm.name,
        logoUrl: logoUrlToSave,
        address: {
          line1: profileForm.addressLine1 || null,
          line2: profileForm.addressLine2 || null,
          city: profileForm.city || null,
        },
        contact: {
          email: profileForm.contactEmail || null,
          phone: profileForm.contactPhone || null,
        },
        currency: profileForm.currency || "USD",
        'settings.currency': profileForm.currency || "USD", // Also update settings.currency for consistency
      });

      console.log('✅ [CompanyProfile] Currency updated to:', profileForm.currency);
      await refreshUserData();
      console.log('✅ [CompanyProfile] User data refreshed');
      setLogoFile(null);
      // Redirect to dashboard after successful save
      navigate('/dashboard');
    } catch (error) {
      console.error('Error updating company profile:', error);
      alert('Failed to update company profile: ' + error.message);
    } finally {
      setSavingProfile(false);
    }
  };
  
  if (!company) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-3xl mx-auto text-center text-slate-300">
          <h1 className="text-2xl font-bold text-white mb-2">Company Settings</h1>
          <p>No company found. Please create a company first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Company Settings</h1>
            <p className="text-slate-400">Manage your company profile and team members</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Close
          </button>
        </div>

        {/* Company Profile Section */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Company Profile</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Company Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Company Logo</label>
                
                {/* Current Logo Preview */}
                {(company.logoUrl || logoFile) && (
                  <div className="mb-3 flex items-center gap-3">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient shadow-brand">
                      <div className="absolute inset-0 rounded-full bg-brand-gradient opacity-75 blur-xl"></div>
                      <div className="relative z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-900">
                        <img
                          src={logoFile ? URL.createObjectURL(logoFile) : company.logoUrl}
                          alt="Company logo preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setLogoFile(file);
                    }
                  }}
                  className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-brand-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-600"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Upload a new logo to replace the current one (recommended 256x256px).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={profileForm.addressLine1}
                  onChange={(e) => setProfileForm({ ...profileForm, addressLine1: e.target.value })}
                  className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={profileForm.addressLine2}
                  onChange={(e) => setProfileForm({ ...profileForm, addressLine2: e.target.value })}
                  className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">City / Town</label>
                <input
                  type="text"
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={profileForm.contactPhone}
                  onChange={(e) => setProfileForm({ ...profileForm, contactPhone: e.target.value })}
                  className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600"
                  placeholder="+27 82 123 4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={profileForm.contactEmail}
                  onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
                  className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600"
                  placeholder="company@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Currency</label>
                <select
                  value={profileForm.currency}
                  onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                  className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600"
                >
                  <option value="USD">$ - US Dollar (USD)</option>
                  <option value="ZAR">R - South African Rand (ZAR)</option>
                  <option value="EUR">€ - Euro (EUR)</option>
                  <option value="GBP">£ - British Pound (GBP)</option>
                  <option value="NGN">₦ - Nigerian Naira (NGN)</option>
                  <option value="KES">KSh - Kenyan Shilling (KES)</option>
                  <option value="GHS">₵ - Ghanaian Cedi (GHS)</option>
                  <option value="TZS">TSh - Tanzanian Shilling (TZS)</option>
                  <option value="UGX">USh - Ugandan Shilling (UGX)</option>
                  <option value="ZMW">ZK - Zambian Kwacha (ZMW)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">This currency will be used across all financial displays for your company</p>
              </div>
              {profileForm.logoUrl && (
                <div className="flex items-end justify-end">
                  <div className="flex items-center gap-3 rounded-lg bg-slate-900/80 p-3 border border-slate-700">
                    <div className="h-10 w-10 overflow-hidden rounded-md bg-slate-800 border border-slate-700">
                      <img
                        src={profileForm.logoUrl}
                        alt="Company logo preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-xs text-slate-300">Logo preview</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Invitations Section */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Pending Invitations</h2>
          </div>

          {invitations.filter((inv) => {
            // Filter out accepted invitations
            const invitedEmail = inv.email?.toLowerCase();
            const matchedUser = users.find(
              (u) => u.email?.toLowerCase() === invitedEmail
            );
            return !matchedUser; // Only show pending invitations
          }).length === 0 ? (
            <p className="text-slate-400 text-center py-8">No pending invitations</p>
          ) : (
            <div className="space-y-3">
              {invitations.filter((inv) => {
                // Filter out accepted invitations
                const invitedEmail = inv.email?.toLowerCase();
                const matchedUser = users.find(
                  (u) => u.email?.toLowerCase() === invitedEmail
                );
                return !matchedUser; // Only show pending invitations
              }).map((inv) => {
                return (
                  <div key={inv.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {inv.fullName || inv.email}
                      </p>
                      <p className="text-sm text-slate-400">{inv.email}</p>
                      {inv.phoneNumber && (
                        <p className="text-xs text-slate-500 mt-1">
                          📱 {inv.phoneNumber}
                        </p>
                      )}
                      {inv.location && (
                        <p className="text-xs text-slate-500">
                          📍 {inv.location}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 mt-1">
                        Role: {inv.role === 'company_user' ? 'Driver' : inv.role === 'company_manager' ? 'Manager' : inv.role}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-400">
                        Pending
                      </span>
                      {inv.expiresAt && (
                        <span className="text-[11px] text-slate-500">
                          Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Invite Driver Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Invite New Driver</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleInviteDriver} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={inviteForm.fullName}
                    onChange={(e) => setInviteForm({...inviteForm, fullName: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="John Driver"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={inviteForm.phoneNumber}
                    onChange={(e) => setInviteForm({...inviteForm, phoneNumber: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={inviteForm.location || ''}
                    onChange={(e) => setInviteForm({...inviteForm, location: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="City, Country"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="company_user">Driver</option>
                    <option value="company_manager">Manager</option>
                  </select>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-300">
                    The driver will register with this email and be automatically added to your company. Share the email with them to complete registration.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Modal */}
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          invitationData={successInvitationData}
        />
        
      </div>
    </div>
  );
};

// Simple Dashboard Page for company admins/managers
const DashboardPage = () => {
  usePageTitle('Dashboard');
  return (
    <div className="min-h-screen bg-slate-950">
      <AnalyticsDashboard />
    </div>
  );
};

// Smart Dashboard Wrapper - Shows different dashboard based on role
const SmartDashboard = () => {
  const { userProfile } = useAuth();
  
  // Drivers get simplified dashboard
  if (userProfile?.role === 'company_user') {
    return <DriverDashboard />;
  }
  
  // Admins and managers get full dashboard
  return <DashboardPage />;
};

// Removed duplicate AdminDashboardPage - now imported from ./pages/AdminDashboardPage.jsx
// Old component definition deleted to fix "Identifier 'AdminDashboardPage' has already been declared" error

import ErrorBoundary from "./components/common/ErrorBoundary";
import Toast from "./components/common/Toast";
import AppShell from "./components/layout/AppShell";

/**
 * Main App component with routing configuration
 */
function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Toast />
          <Routes>
            {/* Public Routes */}
            {/* Login is handled on the landing page, no separate /login route needed */}

            {/* Company Setup (authenticated but no company yet) */}
            <Route
              path="/company/setup"
              element={
                <ProtectedRoute>
                  <CompanySetupPage />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AppShell>
                    <SystemAdminDashboard />
                  </AppShell>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <AdminRoute>
                  <AppShell>
                    <SystemAnalyticsPage />
                  </AppShell>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/business"
              element={
                <AdminRoute>
                  <AppShell>
                    <FleetTrackBusinessPage />
                  </AppShell>
                </AdminRoute>
              }
            />

            {/* Company Admin Routes */}
            <Route
              path="/company/settings"
              element={
                <CompanyOnlyRoute>
                  <AppShell>
                    <CompanySettingsPage />
                  </AppShell>
                </CompanyOnlyRoute>
              }
            />

            {/* Team Page (Admins and Managers only) */}
            <Route
              path="/team"
              element={
                <CompanyOnlyRoute>
                  <AppShell>
                    <TeamPage />
                  </AppShell>
                </CompanyOnlyRoute>
              }
            />

            {/* Company Routes - Block system admins from these pages */}
            <Route
              path="/dashboard"
              element={
                <CompanyOnlyRoute>
                  <AppShell>
                    <SmartDashboard />
                  </AppShell>
                </CompanyOnlyRoute>
              }
            />
            <Route
              path="/vehicles"
              element={
                <CompanyOnlyRoute>
                  <AppShell>
                    <VehiclesPage />
                  </AppShell>
                </CompanyOnlyRoute>
              }
            />
            <Route
              path="/entries"
              element={
                <CompanyOnlyRoute>
                  <AppShell>
                    <EntriesPage />
                  </AppShell>
                </CompanyOnlyRoute>
              }
            />
            <Route
              path="/logbook"
              element={
                <CompanyOnlyRoute>
                  <AppShell>
                    <TripLogbookPage />
                  </AppShell>
                </CompanyOnlyRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <CompanyOnlyRoute>
                  <AppShell>
                    <AnalyticsPage />
                  </AppShell>
                </CompanyOnlyRoute>
              }
            />

            {/* Onboarding Page - Available to all authenticated users */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <OnboardingPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Support Page - Available to company admins and managers only */}
            <Route
              path="/support"
              element={
                <CompanyRoute>
                  <AppShell>
                    <SupportPage />
                  </AppShell>
                </CompanyRoute>
              }
            />

            {/* Profile Settings - Available to all authenticated users */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <ProfileSettingsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Catch all - redirect to smart redirect */}
            <Route path="*" element={<SmartRedirect />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
