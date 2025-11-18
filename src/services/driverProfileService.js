import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Driver Profile Service
 * Manages driver profiles for drivers who haven't been invited yet
 * but have data captured on their behalf by admins/managers
 */

/**
 * Create a new driver profile
 * @param {string} companyId - Company ID
 * @param {Object} profileData - Driver profile data
 * @returns {Promise<string>} - Created profile ID
 */
export const createDriverProfile = async (companyId, profileData) => {
  try {
    const { fullName, email, phone, licenseNumber } = profileData;

    // Check if driver profile already exists with this email
    if (email) {
      const existing = await getDriverProfileByEmail(companyId, email);
      if (existing) {
        throw new Error('A driver profile with this email already exists');
      }
    }

    const docRef = await addDoc(collection(db, 'driverProfiles'), {
      companyId,
      fullName,
      email: email || null,
      phone: phone || null,
      licenseNumber: licenseNumber || null,
      isInvited: false,
      linkedUserId: null, // Will be set when user accepts invitation
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating driver profile:', error);
    throw error;
  }
};

/**
 * Get all driver profiles for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} - Array of driver profiles
 */
export const getDriverProfiles = async (companyId) => {
  try {
    const q = query(
      collection(db, 'driverProfiles'),
      where('companyId', '==', companyId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting driver profiles:', error);
    throw error;
  }
};

/**
 * Get driver profile by email
 * @param {string} companyId - Company ID
 * @param {string} email - Driver email
 * @returns {Promise<Object|null>} - Driver profile or null
 */
export const getDriverProfileByEmail = async (companyId, email) => {
  try {
    const q = query(
      collection(db, 'driverProfiles'),
      where('companyId', '==', companyId),
      where('email', '==', email)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error getting driver profile by email:', error);
    throw error;
  }
};

/**
 * Update driver profile
 * @param {string} profileId - Profile ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateDriverProfile = async (profileId, updates) => {
  try {
    const docRef = doc(db, 'driverProfiles', profileId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating driver profile:', error);
    throw error;
  }
};

/**
 * Link driver profile to user account
 * @param {string} profileId - Profile ID
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const linkDriverProfileToUser = async (profileId, userId) => {
  try {
    await updateDriverProfile(profileId, {
      linkedUserId: userId,
      isInvited: true
    });
  } catch (error) {
    console.error('Error linking driver profile to user:', error);
    throw error;
  }
};

/**
 * Delete driver profile
 * @param {string} profileId - Profile ID
 * @returns {Promise<void>}
 */
export const deleteDriverProfile = async (profileId) => {
  try {
    await deleteDoc(doc(db, 'driverProfiles', profileId));
  } catch (error) {
    console.error('Error deleting driver profile:', error);
    throw error;
  }
};

/**
 * Get uninvited driver profiles (for invitation dropdown)
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} - Array of uninvited driver profiles
 */
export const getUninvitedDriverProfiles = async (companyId) => {
  try {
    const q = query(
      collection(db, 'driverProfiles'),
      where('companyId', '==', companyId),
      where('isInvited', '==', false)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting uninvited driver profiles:', error);
    throw error;
  }
};
