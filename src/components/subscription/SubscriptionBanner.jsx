import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { getDaysRemaining, isSubscriptionValid, SubscriptionStatus } from "../../services/companyService";
import { AlertTriangle, Clock, XCircle } from "lucide-react";

/**
 * SubscriptionBanner component to show trial/subscription warnings
 * @returns {JSX.Element|null} Banner or null if no warning needed
 */
const SubscriptionBanner = () => {
  const { company } = useAuth();

  if (!company) return null;

  const daysRemaining = getDaysRemaining(company);
  const isValid = isSubscriptionValid(company);

  // Don't show banner if subscription is active with no end date
  if (company.subscriptionStatus === SubscriptionStatus.ACTIVE && !company.subscriptionEndsAt) {
    return null;
  }

  // Expired subscription
  if (!isValid) {
    return (
      <div className="border-b border-red-500/30 bg-gradient-to-r from-red-500/20 to-red-600/10 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-400" />
            <div>
              <p className="font-semibold text-red-400">Subscription Expired</p>
              <p className="text-sm text-red-300">
                Your subscription has expired. Please contact support to renew.
              </p>
            </div>
          </div>
          <button className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600">
            Renew Now
          </button>
        </div>
      </div>
    );
  }

  // Trial ending soon (less than 3 days)
  if (company.subscriptionStatus === SubscriptionStatus.TRIAL && daysRemaining <= 3) {
    return (
      <div className="border-b border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-amber-600/10 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-400">Trial Ending Soon</p>
              <p className="text-sm text-amber-300">
                Your free trial ends in {daysRemaining} {daysRemaining === 1 ? "day" : "days"}.
                Subscribe to continue using FleetTrack.
              </p>
            </div>
          </div>
          <button className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600">
            Subscribe
          </button>
        </div>
      </div>
    );
  }

  // Trial active (more than 3 days remaining)
  if (company.subscriptionStatus === SubscriptionStatus.TRIAL) {
    return (
      <div className="border-b border-blue-500/30 bg-gradient-to-r from-blue-500/20 to-blue-600/10 px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-400" />
            <div>
              <p className="font-semibold text-blue-400">Free Trial Active</p>
              <p className="text-sm text-blue-300">
                {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining in your free trial.
              </p>
            </div>
          </div>
          <button className="rounded-lg border border-blue-400/50 px-4 py-2 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20">
            Upgrade
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default SubscriptionBanner;
