import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// User role constants - Hierarchical structure
const UserRole = {
  SYSTEM_ADMIN: "system_admin",      // Level 4: App owner - manages all companies
  COMPANY_ADMIN: "company_admin",    // Level 3: Company owner - full company access, settings, analytics
  COMPANY_MANAGER: "company_manager", // Level 2: Department manager - manage vehicles, users, view analytics
  COMPANY_USER: "company_user"       // Level 1: Driver/Operator - data capture only, minimal views
};

const USERS_COLLECTION = "users";

/**
 * Create or update user profile
 * @param {string} userId - User ID (from Firebase Auth)
 * @param {Object} userData - User data
 * @returns {Promise<void>}
 */
export const createUserProfile = async (userId, userData) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      // Update existing user
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new user with extended profile fields
      await setDoc(userRef, {
        email: userData.email,
        displayName: userData.displayName || userData.fullName || null,
        fullName: userData.fullName || userData.displayName || null,
        photoURL: userData.photoURL || null,
        phoneNumber: userData.phoneNumber || null,
        location: userData.location || null,
        role: userData.role || UserRole.COMPANY_USER,
        companyId: userData.companyId || null,
        lastLoginAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

/**
 * Get user profile
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User profile or null
 */
export const getUserProfile = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    return {
      id: userDoc.id,
      ...userDoc.data(),
      createdAt: userDoc.data().createdAt?.toDate(),
      updatedAt: userDoc.data().updatedAt?.toDate(),
    };
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

/**
 * Update user role
 * @param {string} userId - User ID
 * @param {string} role - New role
 * @returns {Promise<void>}
 */
export const updateUserRole = async (userId, role) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    throw error;
  }
};

/**
 * Assign user to company
 * @param {string} userId - User ID
 * @param {string} companyId - Company ID
 * @param {string} role - User role in company
 * @returns {Promise<void>}
 */
export const assignUserToCompany = async (userId, companyId, role = UserRole.COMPANY_USER) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      companyId,
      role,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error assigning user to company:", error);
    throw error;
  }
};

/**
 * Get all users in a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of users
 */
export const getCompanyUsers = async (companyId) => {
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where("companyId", "==", companyId)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));
  } catch (error) {
    console.error("Error getting company users:", error);
    throw error;
  }
};

/**
 * Check if user is system admin (app owner)
 * @param {Object} user - User object
 * @returns {boolean} True if user is system admin
 */
export const isSystemAdmin = (user) => {
  return user?.role === UserRole.SYSTEM_ADMIN;
};

/**
 * Check if user is company admin
 * @param {Object} user - User object
 * @returns {boolean} True if user is company admin
 */
export const isCompanyAdmin = (userProfile) => {
  return userProfile?.role === UserRole.COMPANY_ADMIN;
};

/**
 * Check if user is company manager
 * @param {Object} user - User object
 * @returns {boolean} True if user is company manager
 */
export const isCompanyManager = (userProfile) => {
  return userProfile?.role === UserRole.COMPANY_MANAGER;
};

/**
 * Check if user is company user (driver)
 * @param {Object} user - User object
 * @returns {boolean} True if user is company user
 */
export const isCompanyUser = (userProfile) => {
  return userProfile?.role === UserRole.COMPANY_USER;
};

/**
 * Check if user has admin privileges (system admin, company admin, or company manager)
 * @param {Object} user - User object
 * @returns {boolean} True if user has admin privileges
 */
export const isAdmin = (user) => {
  return isSystemAdmin(user) || isCompanyAdmin(user) || isCompanyManager(user);
};

/**
 * Check if user can manage company settings (system admin or company admin)
 * @param {Object} user - User object
 * @returns {boolean} True if user can manage company settings
 */
export const canManageCompanySettings = (user) => {
  return isSystemAdmin(user) || isCompanyAdmin(user);
};

/**
 * Check if user can manage users and vehicles (admin or manager)
 * @param {Object} user - User object
 * @returns {boolean} True if user can manage
 */
export const canManageCompany = (user) => {
  return isSystemAdmin(user) || isCompanyAdmin(user) || isCompanyManager(user);
};

/**
 * Check if user can view analytics (admin or manager)
 * @param {Object} user - User object
 * @returns {boolean} True if user can view analytics
 */
export const canViewAnalytics = (user) => {
  return isSystemAdmin(user) || isCompanyAdmin(user) || isCompanyManager(user);
};

/**
 * Check if user is driver (company user with limited access)
 * @param {Object} user - User object
 * @returns {boolean} True if user is driver
 */
export const isDriver = (user) => {
  return isCompanyUser(user);
};


/**
 * Check if user has company access
 * @param {Object} user - User object
 * @param {string} companyId - Company ID to check
 * @returns {boolean} True if user has access
 */
export const hasCompanyAccess = (user, companyId) => {
  if (isSystemAdmin(user)) return true; // System admin has access to all companies
  return user?.companyId === companyId;
};

/**
 * Remove user from company
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const removeUserFromCompany = async (userId) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      companyId: null,
      role: UserRole.COMPANY_USER,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error removing user from company:", error);
    throw error;
  }
};

// Export UserRole for use in other files
export { UserRole };
