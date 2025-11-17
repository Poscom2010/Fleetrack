import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createCompany } from "../services/companyService";
import { updateUserRole } from "../services/userService";
import toast from "react-hot-toast";
import { Building2, Upload, Globe, DollarSign, Calendar } from "lucide-react";

// User role constants
const UserRole = {
  COMPANY_MANAGER: "company_manager",
};

const CompanySetupPage = () => {
  const { user, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    logo: "",
    timezone: "Africa/Johannesburg",
    currency: "ZAR",
    dateFormat: "DD/MM/YYYY",
    serviceInterval: 5000,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Company name is required");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Creating your company...");

    try {
      // Create company with 2-month trial
      const companyId = await createCompany(user.uid, formData);

      // Update user role to company admin
      await updateUserRole(user.uid, UserRole.COMPANY_ADMIN);

      // Refresh user data to load new company
      await refreshUserData();

      toast.success("Company created successfully! Your 2-month trial has started.", {
        id: toastId,
        duration: 5000,
      });

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Error creating company:", error);
      toast.error("Failed to create company. Please try again.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 shadow-lg">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Set Up Your Company</h1>
          <p className="mt-2 text-slate-400">
            Start your <span className="font-semibold text-emerald-400">2-month free trial</span> today
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-8 shadow-xl backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                Company Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                placeholder="Enter your company name"
              />
            </div>

            {/* Logo URL */}
            <div>
              <label htmlFor="logo" className="block text-sm font-medium text-slate-300">
                <Upload className="mr-2 inline h-4 w-4" />
                Logo URL (Optional)
              </label>
              <input
                type="url"
                id="logo"
                name="logo"
                value={formData.logo}
                onChange={handleChange}
                className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-1 text-xs text-slate-500">
                You can upload your logo later from company settings
              </p>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Timezone */}
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-slate-300">
                  <Globe className="mr-2 inline h-4 w-4" />
                  Timezone
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Africa/Johannesburg">Johannesburg</option>
                </select>
              </div>

              {/* Currency */}
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-slate-300">
                  <DollarSign className="mr-2 inline h-4 w-4" />
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="ZAR">ZAR (R)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>

              {/* Date Format */}
              <div>
                <label htmlFor="dateFormat" className="block text-sm font-medium text-slate-300">
                  <Calendar className="mr-2 inline h-4 w-4" />
                  Date Format
                </label>
                <select
                  id="dateFormat"
                  name="dateFormat"
                  value={formData.dateFormat}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              {/* Service Interval */}
              <div>
                <label htmlFor="serviceInterval" className="block text-sm font-medium text-slate-300">
                  Service Interval (km)
                </label>
                <input
                  type="number"
                  id="serviceInterval"
                  name="serviceInterval"
                  value={formData.serviceInterval}
                  onChange={handleChange}
                  min="1000"
                  step="1000"
                  className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-900/50 px-4 py-3 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
            </div>

            {/* Trial Info */}
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <h3 className="font-semibold text-emerald-400">✨ 2-Month Free Trial</h3>
              <ul className="mt-2 space-y-1 text-sm text-emerald-200">
                <li>• Full access to all features</li>
                <li>• Add unlimited vehicles during trial</li>
                <li>• No credit card required</li>
              </ul>
              
              <div className="mt-3 space-y-1 text-xs text-emerald-300/90">
                <p className="font-semibold text-emerald-200">After trial - Simple tiered pricing:</p>
                <p>• 1-2 vehicles: <span className="font-semibold">R150/month</span></p>
                <p>• 3-5 vehicles: <span className="font-semibold">R350/month</span></p>
                <p>• 6-10 vehicles: <span className="font-semibold">R600/month</span></p>
                <p>• 11+ vehicles: <span className="font-semibold">R50 per vehicle/month</span></p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-brand-500 to-indigo-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:from-brand-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Creating Company..." : "Create Company & Start Trial"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanySetupPage;
