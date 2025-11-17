/**
 * Company type definitions for multi-tenant architecture
 */

/**
 * @typedef {Object} Company
 * @property {string} id - Company ID
 * @property {string} name - Company name
 * @property {string|null} logo - Company logo URL
 * @property {string} ownerId - User ID of the company owner
 * @property {string} subscriptionStatus - Subscription status: 'trial' | 'active' | 'expired' | 'cancelled'
 * @property {Date} trialEndsAt - When the trial period ends
 * @property {Date|null} subscriptionEndsAt - When the subscription ends (null for active)
 * @property {Date} createdAt - When the company was created
 * @property {Date} updatedAt - When the company was last updated
 * @property {boolean} isActive - Whether the company account is active
 * @property {Object} settings - Company-specific settings
 */

/**
 * @typedef {Object} CompanySettings
 * @property {string} timezone - Company timezone
 * @property {string} currency - Company currency code
 * @property {string} dateFormat - Preferred date format
 * @property {number} serviceInterval - Default service interval in km
 */

/**
 * Subscription status enum
 */
export const SubscriptionStatus = {
  TRIAL: 'trial',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

/**
 * User role enum
 */
export const UserRole = {
  ADMIN: 'admin',
  COMPANY_OWNER: 'company_owner',
  COMPANY_USER: 'company_user',
};

export default {
  SubscriptionStatus,
  UserRole,
};
