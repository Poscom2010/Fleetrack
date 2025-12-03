import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  getAllCompanies,
  updateSubscriptionStatus,
  activateCompany,
  deactivateCompany,
  getDaysRemaining,
  SubscriptionStatus,
} from "../services/companyService";
import { isAdmin } from "../services/userService";
import toast from "react-hot-toast";
import {
  Building2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Brain,
  Sparkles,
} from "lucide-react";

const AdminDashboardPage = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, trial, active, expired

  useEffect(() => {
    // Check if user is admin
    if (userProfile && !isAdmin(userProfile)) {
      toast.error("Access denied. Admin only.");
      navigate("/dashboard");
      return;
    }

    if (userProfile) {
      loadCompanies();
    }
  }, [userProfile, navigate]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await getAllCompanies();
      setCompanies(data);
    } catch (error) {
      console.error("Error loading companies:", error);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (companyId) => {
    const toastId = toast.loading("Activating company...");
    try {
      await activateCompany(companyId);
      await loadCompanies();
      toast.success("Company activated", { id: toastId });
    } catch (error) {
      toast.error("Failed to activate company", { id: toastId });
    }
  };

  const handleDeactivate = async (companyId) => {
    const toastId = toast.loading("Deactivating company...");
    try {
      await deactivateCompany(companyId);
      await loadCompanies();
      toast.success("Company deactivated", { id: toastId });
    } catch (error) {
      toast.error("Failed to deactivate company", { id: toastId });
    }
  };

  const handleUpdateSubscription = async (companyId, status) => {
    const toastId = toast.loading("Updating subscription...");
    try {
      let endsAt = null;
      if (status === SubscriptionStatus.ACTIVE) {
        // Set subscription to end in 30 days
        endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + 30);
      }
      await updateSubscriptionStatus(companyId, status, endsAt);
      await loadCompanies();
      toast.success("Subscription updated", { id: toastId });
    } catch (error) {
      toast.error("Failed to update subscription", { id: toastId });
    }
  };

  const handleToggleAIInsights = async (companyId, enabled) => {
    try {
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, {
        aiInsightsEnabled: enabled
      });
      toast.success(`AI Insights ${enabled ? 'enabled' : 'disabled'} successfully`);
      await loadCompanies();
    } catch (error) {
      console.error('Error toggling AI Insights:', error);
      toast.error('Failed to update AI Insights setting');
    }
  };

  const getStatusBadge = (company) => {
    const daysRemaining = getDaysRemaining(company);
    
    if (!company.isActive) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
          <XCircle className="mr-1 h-3 w-3" />
          Inactive
        </span>
      );
    }

    switch (company.subscriptionStatus) {
      case SubscriptionStatus.TRIAL:
        return (
          <span className="inline-flex items-center rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400">
            <Clock className="mr-1 h-3 w-3" />
            Trial ({daysRemaining}d left)
          </span>
        );
      case SubscriptionStatus.ACTIVE:
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle className="mr-1 h-3 w-3" />
            Active
          </span>
        );
      case SubscriptionStatus.EXPIRED:
        return (
          <span className="inline-flex items-center rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Expired
          </span>
        );
      case SubscriptionStatus.CANCELLED:
        return (
          <span className="inline-flex items-center rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const filteredCompanies = companies.filter((company) => {
    if (filter === "all") return true;
    if (filter === "trial") return company.subscriptionStatus === SubscriptionStatus.TRIAL;
    if (filter === "active") return company.subscriptionStatus === SubscriptionStatus.ACTIVE;
    if (filter === "expired") return company.subscriptionStatus === SubscriptionStatus.EXPIRED;
    return true;
  });

  const stats = {
    total: companies.length,
    trial: companies.filter((c) => c.subscriptionStatus === SubscriptionStatus.TRIAL).length,
    active: companies.filter((c) => c.subscriptionStatus === SubscriptionStatus.ACTIVE).length,
    expired: companies.filter((c) => c.subscriptionStatus === SubscriptionStatus.EXPIRED).length,
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-baltic-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-baltic-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-baltic-50 via-blue-50 to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-baltic-900 dark:text-white">Admin Dashboard</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Manage companies and subscriptions</p>
          </div>
          <button
            onClick={() => navigate("/admin/create-company")}
            className="inline-flex items-center rounded-lg bg-gradient-to-r from-baltic-500 to-blue-600 px-4 py-2 font-semibold text-white shadow-lg transition hover:from-baltic-600 hover:to-blue-700 transform hover:scale-105"
          >
            <Plus className="mr-2 h-5 w-5" />
            Create Company
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border-2 border-baltic-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Companies</p>
                <p className="mt-1 text-2xl font-bold text-baltic-900 dark:text-white">{stats.total}</p>
              </div>
              <Building2 className="h-8 w-8 text-baltic-500" />
            </div>
          </div>

          <div className="rounded-xl border-2 border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400">Trial</p>
                <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-white">{stats.trial}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="rounded-xl border-2 border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400">Active</p>
                <p className="mt-1 text-2xl font-bold text-green-900 dark:text-white">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="rounded-xl border-2 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 dark:text-amber-400">Expired</p>
                <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-white">{stats.expired}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {["all", "trial", "active", "expired"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === f
                  ? "bg-baltic-500 text-white shadow-md"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 hover:bg-baltic-50 dark:hover:bg-gray-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Companies Table */}
        <div className="overflow-hidden rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b-2 border-baltic-200 dark:border-gray-700 bg-baltic-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-baltic-900 dark:text-gray-300">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-baltic-900 dark:text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-baltic-900 dark:text-gray-300">
                    Created
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wider text-baltic-900 dark:text-gray-300">
                    AI Insights
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-baltic-900 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-baltic-100 dark:bg-baltic-900">
                          <Building2 className="h-5 w-5 text-baltic-600 dark:text-baltic-400" />
                        </div>
                      )}
                      <div className="ml-3">
                        <p className="font-medium text-baltic-900 dark:text-white">{company.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{company.id}</p>
                      </div>
                    </div>
                  </td>
                    <td className="px-6 py-4">{getStatusBadge(company)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {company.createdAt?.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleAIInsights(company.id, !company.aiInsightsEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          company.aiInsightsEnabled
                            ? 'bg-baltic-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        title={company.aiInsightsEnabled ? 'AI Insights Enabled' : 'AI Insights Disabled'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            company.aiInsightsEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      {company.aiInsightsEnabled && (
                        <div className="mt-1 flex items-center justify-center gap-1 text-xs text-baltic-600 dark:text-baltic-400">
                          <Brain className="h-3 w-3" />
                          <span>Active</span>
                        </div>
                      )}
                    </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {company.isActive ? (
                        <button
                          onClick={() => handleDeactivate(company.id)}
                          className="rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-400 transition border border-red-300 dark:border-red-800"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(company.id)}
                          className="rounded-lg bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-400 transition border border-green-300 dark:border-green-800"
                        >
                          Activate
                        </button>
                      )}
                      {company.subscriptionStatus === SubscriptionStatus.TRIAL && (
                        <button
                          onClick={() =>
                            handleUpdateSubscription(company.id, SubscriptionStatus.ACTIVE)
                          }
                          className="rounded-lg bg-baltic-100 hover:bg-baltic-200 dark:bg-baltic-900/20 dark:hover:bg-baltic-900/30 px-3 py-1 text-xs font-medium text-baltic-700 dark:text-baltic-400 transition border border-baltic-300 dark:border-baltic-800"
                        >
                          Activate Sub
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

        {filteredCompanies.length === 0 && (
          <div className="rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center shadow-lg">
            <Building2 className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-4 text-lg font-medium text-baltic-900 dark:text-white">No companies found</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {filter === "all"
                ? "Create your first company to get started"
                : `No companies with ${filter} status`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
