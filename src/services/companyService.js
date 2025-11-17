import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Subscription status constants
const SubscriptionStatus = {
  TRIAL: "trial",
  ACTIVE: "active",
  EXPIRED: "expired",
  CANCELLED: "cancelled"
};

const COMPANIES_COLLECTION = "companies";

/**
 * Create a new company with trial subscription
 * @param {string} ownerId - User ID of the company owner
 * @param {Object} companyData - Company data
 * @returns {Promise<string>} Company ID
 */
export const createCompany = async (ownerId, companyData) => {
  try {
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 2); // 2-month trial for testing

    const company = {
      name: companyData.name,
      logo: companyData.logo || null,
      ownerId,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialEndsAt: Timestamp.fromDate(trialEndsAt),
      subscriptionEndsAt: null,
      isActive: true,
      settings: {
        timezone: companyData.timezone || "UTC",
        currency: companyData.currency || "USD",
        dateFormat: companyData.dateFormat || "MM/DD/YYYY",
        serviceInterval: companyData.serviceInterval || 5000,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, COMPANIES_COLLECTION), company);
    return docRef.id;
  } catch (error) {
    console.error("Error creating company:", error);
    throw error;
  }
};

/**
 * Get a company by ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object|null>} Company data or null
 */
export const getCompany = async (companyId) => {
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, companyId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      trialEndsAt: docSnap.data().trialEndsAt?.toDate(),
      subscriptionEndsAt: docSnap.data().subscriptionEndsAt?.toDate(),
      createdAt: docSnap.data().createdAt?.toDate(),
      updatedAt: docSnap.data().updatedAt?.toDate(),
    };
  } catch (error) {
    console.error("Error getting company:", error);
    throw error;
  }
};

/**
 * Get all companies (admin only)
 * @returns {Promise<Array>} Array of companies
 */
export const getAllCompanies = async () => {
  try {
    const q = query(
      collection(db, COMPANIES_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      trialEndsAt: doc.data().trialEndsAt?.toDate(),
      subscriptionEndsAt: doc.data().subscriptionEndsAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));
  } catch (error) {
    console.error("Error getting all companies:", error);
    throw error;
  }
};

/**
 * Get company by owner ID
 * @param {string} ownerId - Owner user ID
 * @returns {Promise<Object|null>} Company data or null
 */
export const getCompanyByOwner = async (ownerId) => {
  try {
    const q = query(
      collection(db, COMPANIES_COLLECTION),
      where("ownerId", "==", ownerId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      trialEndsAt: doc.data().trialEndsAt?.toDate(),
      subscriptionEndsAt: doc.data().subscriptionEndsAt?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    };
  } catch (error) {
    console.error("Error getting company by owner:", error);
    throw error;
  }
};

/**
 * Update company profile
 * @param {string} companyId - Company ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateCompany = async (companyId, updates) => {
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, companyId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating company:", error);
    throw error;
  }
};

/**
 * Update company subscription status
 * @param {string} companyId - Company ID
 * @param {string} status - New subscription status
 * @param {Date|null} endsAt - Subscription end date
 * @returns {Promise<void>}
 */
export const updateSubscriptionStatus = async (companyId, status, endsAt = null) => {
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, companyId);
    const updates = {
      subscriptionStatus: status,
      updatedAt: serverTimestamp(),
    };

    if (endsAt) {
      updates.subscriptionEndsAt = Timestamp.fromDate(endsAt);
    }

    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Error updating subscription status:", error);
    throw error;
  }
};

/**
 * Check if company subscription is valid
 * @param {Object} company - Company object
 * @returns {boolean} True if subscription is valid
 */
export const isSubscriptionValid = (company) => {
  if (!company || !company.isActive) {
    return false;
  }

  const now = new Date();

  switch (company.subscriptionStatus) {
    case SubscriptionStatus.TRIAL:
      return company.trialEndsAt && now < company.trialEndsAt;
    case SubscriptionStatus.ACTIVE:
      return !company.subscriptionEndsAt || now < company.subscriptionEndsAt;
    case SubscriptionStatus.EXPIRED:
    case SubscriptionStatus.CANCELLED:
      return false;
    default:
      return false;
  }
};

/**
 * Get days remaining in trial or subscription
 * @param {Object} company - Company object
 * @returns {number} Days remaining (negative if expired)
 */
export const getDaysRemaining = (company) => {
  if (!company) return 0;

  const now = new Date();
  let endDate;

  if (company.subscriptionStatus === SubscriptionStatus.TRIAL) {
    endDate = company.trialEndsAt;
  } else if (company.subscriptionStatus === SubscriptionStatus.ACTIVE) {
    endDate = company.subscriptionEndsAt;
  } else {
    return 0;
  }

  if (!endDate) return 0;

  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Deactivate a company (admin only)
 * @param {string} companyId - Company ID
 * @returns {Promise<void>}
 */
export const deactivateCompany = async (companyId) => {
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, companyId);
    await updateDoc(docRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error deactivating company:", error);
    throw error;
  }
};

/**
 * Activate a company (admin only)
 * @param {string} companyId - Company ID
 * @returns {Promise<void>}
 */
export const activateCompany = async (companyId) => {
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, companyId);
    await updateDoc(docRef, {
      isActive: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error activating company:", error);
    throw error;
  }
};

/**
 * Delete a company (admin only)
 * @param {string} companyId - Company ID
 * @returns {Promise<void>}
 */
export const deleteCompany = async (companyId) => {
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, companyId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting company:", error);
    throw error;
  }
};

// ============================================================================
// BILLING SYSTEM (COMMENTED OUT FOR NOW - TO BE ENABLED LATER)
// ============================================================================

/*
// Tiered pricing model - Fair and scalable
const PRICING_TIERS = {
  currency: "ZAR",
  interval: "month",
  tiers: [
    {
      name: "Starter",
      minVehicles: 1,
      maxVehicles: 2,
      price: 150.00,
      pricePerVehicle: 75.00, // R75 per vehicle
      features: [
        "Up to 2 vehicles",
        "Full analytics dashboard",
        "Daily entries & expenses",
        "Service alerts",
        "Email support"
      ]
    },
    {
      name: "Growth",
      minVehicles: 3,
      maxVehicles: 5,
      price: 350.00,
      pricePerVehicle: 70.00, // R70 per vehicle (better rate)
      features: [
        "3-5 vehicles",
        "Everything in Starter",
        "Priority support",
        "Advanced analytics"
      ]
    },
    {
      name: "Business",
      minVehicles: 6,
      maxVehicles: 10,
      price: 600.00,
      pricePerVehicle: 60.00, // R60 per vehicle (best rate)
      features: [
        "6-10 vehicles",
        "Everything in Growth",
        "Custom reports",
        "API access"
      ]
    },
    {
      name: "Enterprise",
      minVehicles: 11,
      maxVehicles: null, // Unlimited
      pricePerVehicle: 50.00, // R50 per vehicle (enterprise rate)
      calculatePrice: (vehicleCount) => vehicleCount * 50.00,
      features: [
        "11+ vehicles",
        "Everything in Business",
        "Dedicated support",
        "White-label option",
        "Custom integrations"
      ]
    }
  ],
  
  // Calculate monthly cost based on vehicle count
  calculateMonthlyCost: (vehicleCount) => {
    if (vehicleCount <= 0) return 0;
    
    // Find the appropriate tier
    for (const tier of PRICING_TIERS.tiers) {
      if (vehicleCount >= tier.minVehicles && 
          (tier.maxVehicles === null || vehicleCount <= tier.maxVehicles)) {
        if (tier.calculatePrice) {
          return tier.calculatePrice(vehicleCount);
        }
        return tier.price;
      }
    }
    
    // Default to enterprise pricing if no tier matches
    return vehicleCount * 50.00;
  },
  
  // Get tier info for a vehicle count
  getTierInfo: (vehicleCount) => {
    for (const tier of PRICING_TIERS.tiers) {
      if (vehicleCount >= tier.minVehicles && 
          (tier.maxVehicles === null || vehicleCount <= tier.maxVehicles)) {
        return {
          ...tier,
          currentCost: PRICING_TIERS.calculateMonthlyCost(vehicleCount),
          vehicleCount
        };
      }
    }
    return null;
  }
};

// Create a checkout session (Stripe integration)
export const createCheckoutSession = async (companyId, vehicleCount) => {
  try {
    const tierInfo = PRICING_TIERS.getTierInfo(vehicleCount);
    const monthlyCost = PRICING_TIERS.calculateMonthlyCost(vehicleCount);
    
    // TODO: Integrate with Stripe
    // const response = await fetch('/api/create-checkout-session', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ 
    //     companyId, 
    //     vehicleCount,
    //     tierName: tierInfo.name,
    //     amount: monthlyCost,
    //     currency: PRICING_TIERS.currency
    //   })
    // });
    // return await response.json();
    
    console.log(`Billing system not yet enabled. ${tierInfo.name} tier: R${monthlyCost}/month for ${vehicleCount} vehicles`);
    throw new Error("Billing system coming soon");
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
};

// Handle successful payment
export const handleSuccessfulPayment = async (companyId, subscriptionData) => {
  try {
    const docRef = doc(db, COMPANIES_COLLECTION, companyId);
    const subscriptionEndsAt = new Date();
    subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1);
    
    await updateDoc(docRef, {
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionEndsAt: Timestamp.fromDate(subscriptionEndsAt),
      vehicleCount: subscriptionData.vehicleCount,
      monthlyCost: subscriptionData.amount,
      stripeCustomerId: subscriptionData.customerId,
      stripeSubscriptionId: subscriptionData.subscriptionId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error handling successful payment:", error);
    throw error;
  }
};

// Cancel subscription
export const cancelSubscription = async (companyId) => {
  try {
    // TODO: Cancel in Stripe
    // await stripe.subscriptions.cancel(subscriptionId);
    
    const docRef = doc(db, COMPANIES_COLLECTION, companyId);
    await updateDoc(docRef, {
      subscriptionStatus: SubscriptionStatus.CANCELLED,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw error;
  }
};

// Get all pricing tiers
export const getPricingTiers = () => {
  return PRICING_TIERS.tiers;
};

// Calculate monthly cost for a company based on vehicle count
export const calculateMonthlyCost = (vehicleCount) => {
  return PRICING_TIERS.calculateMonthlyCost(vehicleCount);
};

// Get tier info and cost breakdown for display
export const getTierInfo = (vehicleCount) => {
  return PRICING_TIERS.getTierInfo(vehicleCount);
};

// Get cost breakdown for display
export const getCostBreakdown = (vehicleCount) => {
  const tierInfo = PRICING_TIERS.getTierInfo(vehicleCount);
  const cost = PRICING_TIERS.calculateMonthlyCost(vehicleCount);
  
  return {
    vehicleCount,
    tierName: tierInfo?.name || "Unknown",
    pricePerVehicle: tierInfo?.pricePerVehicle || 0,
    totalMonthly: cost,
    currency: PRICING_TIERS.currency,
    formattedCost: `R${cost.toFixed(2)}`,
    features: tierInfo?.features || [],
  };
};
*/

// Export SubscriptionStatus for use in other files
export { SubscriptionStatus };
