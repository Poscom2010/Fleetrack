import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-1 text-slate-400">Manage companies and subscriptions</p>
        </div>
        <button
          onClick={() => navigate("/admin/create-company")}
          className="inline-flex items-center rounded-lg bg-gradient-to-r from-brand-500 to-indigo-600 px-4 py-2 font-semibold text-white shadow-lg transition hover:from-brand-600 hover:to-indigo-700"
        >
          <Plus className="mr-2 h-5 w-5" />
          Create Company
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total Companies</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
            </div>
            <Building2 className="h-8 w-8 text-brand-500" />
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-400">Trial</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats.trial}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-emerald-400">Active</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-amber-400">Expired</p>
              <p className="mt-1 text-2xl font-bold text-white">{stats.expired}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "trial", "active", "expired"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              filter === f
                ? "bg-brand-500 text-white"
                : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Companies Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-800/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10 bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-700/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {company.logo ? (
                        <img
                          src={company.logo}
                          alt={company.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/20">
                          <Building2 className="h-5 w-5 text-brand-500" />
                        </div>
                      )}
                      <div className="ml-3">
                        <p className="font-medium text-white">{company.name}</p>
                        <p className="text-sm text-slate-400">{company.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(company)}</td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {company.createdAt?.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {company.isActive ? (
                        <button
                          onClick={() => handleDeactivate(company.id)}
                          className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/30"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivate(company.id)}
                          className="rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/30"
                        >
                          Activate
                        </button>
                      )}
                      {company.subscriptionStatus === SubscriptionStatus.TRIAL && (
                        <button
                          onClick={() =>
                            handleUpdateSubscription(company.id, SubscriptionStatus.ACTIVE)
                          }
                          className="rounded-lg bg-brand-500/20 px-3 py-1 text-xs font-medium text-brand-400 transition hover:bg-brand-500/30"
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
        <div className="rounded-xl border border-white/10 bg-slate-800/50 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-medium text-white">No companies found</h3>
          <p className="mt-1 text-sm text-slate-400">
            {filter === "all"
              ? "Create your first company to get started"
              : `No companies with ${filter} status`}
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
