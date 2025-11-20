import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Fetch driver names from both users and driverProfiles collections
 * This utility handles the case where drivers can be:
 * 1. Registered users (in users collection)
 * 2. Driver profiles created by admins (in driverProfiles collection)
 * 3. Driver profiles that have been linked to users
 * 
 * @param {Array<string>} userIds - Array of user/driver IDs
 * @param {string} companyId - Company ID for filtering driver profiles
 * @returns {Promise<Object>} - Map of userId to driver name
 */
export const fetchDriverNames = async (userIds, companyId) => {
  if (!userIds || userIds.length === 0) {
    return {};
  }

  const driverNames = {};

  try {
    // First, get all driver profiles for the company
    if (companyId) {
      const driverProfilesRef = collection(db, 'driverProfiles');
      const driverProfilesQuery = query(
        driverProfilesRef,
        where('companyId', '==', companyId)
      );
      const driverProfilesSnapshot = await getDocs(driverProfilesQuery);
      
      // Create a map of driver profiles
      const driverProfilesMap = {};
      driverProfilesSnapshot.docs.forEach(doc => {
        const profile = doc.data();
        // Map by profile ID
        driverProfilesMap[doc.id] = profile.fullName;
        // Also map by linkedUserId if exists
        if (profile.linkedUserId) {
          driverProfilesMap[profile.linkedUserId] = profile.fullName;
        }
      });

      // Now fetch user details, checking both users and driverProfiles
      for (const userId of userIds) {
        try {
          // First check if this is a driver profile ID
          if (driverProfilesMap[userId]) {
            driverNames[userId] = driverProfilesMap[userId];
            continue;
          }

          // Then check users collection
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            driverNames[userId] = userData.fullName || userData.displayName || userData.email || 'Unknown Driver';
          } else {
            // Last resort: check if it's a driver profile ID we missed
            const driverProfileDoc = await getDoc(doc(db, 'driverProfiles', userId));
            if (driverProfileDoc.exists()) {
              driverNames[userId] = driverProfileDoc.data().fullName || 'Unknown Driver';
            } else {
              driverNames[userId] = 'Unknown Driver';
            }
          }
        } catch (error) {
          console.error(`Error fetching driver name for ${userId}:`, error);
          driverNames[userId] = 'Unknown Driver';
        }
      }
    } else {
      // If no companyId, just check users collection
      for (const userId of userIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            driverNames[userId] = userData.fullName || userData.displayName || userData.email || 'Unknown Driver';
          } else {
            driverNames[userId] = 'Unknown Driver';
          }
        } catch (error) {
          console.error(`Error fetching user ${userId}:`, error);
          driverNames[userId] = 'Unknown Driver';
        }
      }
    }
  } catch (error) {
    console.error('Error in fetchDriverNames:', error);
  }

  return driverNames;
};

/**
 * Fetch a single driver name
 * @param {string} userId - User/driver ID
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} - Driver name
 */
export const fetchDriverName = async (userId, companyId) => {
  const names = await fetchDriverNames([userId], companyId);
  return names[userId] || 'Unknown Driver';
};

/**
 * Get all drivers (both users and profiles) for a company
 * Useful for dropdowns and selection lists
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} - Array of driver objects with id, name, type
 */
export const getAllDrivers = async (companyId) => {
  const drivers = [];

  try {
    // Get registered users
    const usersRef = collection(db, 'users');
    const usersQuery = query(
      usersRef,
      where('companyId', '==', companyId),
      where('role', '==', 'company_user')
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      drivers.push({
        id: doc.id,
        name: userData.fullName || userData.displayName || userData.email || 'Unknown',
        type: 'user',
        email: userData.email,
        isRegistered: true
      });
    });

    // Get driver profiles
    const driverProfilesRef = collection(db, 'driverProfiles');
    const driverProfilesQuery = query(
      driverProfilesRef,
      where('companyId', '==', companyId)
    );
    const driverProfilesSnapshot = await getDocs(driverProfilesQuery);
    
    driverProfilesSnapshot.docs.forEach(doc => {
      const profile = doc.data();
      // Only add if not already linked to a user (to avoid duplicates)
      if (!profile.linkedUserId) {
        drivers.push({
          id: doc.id,
          name: profile.fullName,
          type: 'profile',
          email: profile.email,
          isRegistered: false
        });
      }
    });
  } catch (error) {
    console.error('Error getting all drivers:', error);
  }

  return drivers;
};
