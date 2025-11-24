import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get the last driver who used a specific vehicle
 * @param {string} vehicleId - The vehicle ID
 * @returns {Promise<string|null>} - Driver ID or null
 */
export const getLastDriverForVehicle = async (vehicleId) => {
  if (!vehicleId) return null;

  try {
    const entriesQuery = query(
      collection(db, 'dailyEntries'),
      where('vehicleId', '==', vehicleId)
    );

    const snapshot = await getDocs(entriesQuery);

    if (snapshot.empty) {
      return null;
    }

    // Sort by date to get most recent
    const entries = [];
    snapshot.docs.forEach(doc => {
      const entry = doc.data();
      const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
      entries.push({
        userId: entry.userId,
        driverId: entry.driverId,
        date: entryDate
      });
    });

    entries.sort((a, b) => b.date - a.date);

    // Return the driver ID (or userId if driverId not set)
    const lastEntry = entries[0];
    return lastEntry.driverId || lastEntry.userId;
  } catch (error) {
    console.error('Error fetching last driver for vehicle:', error);
    return null;
  }
};

/**
 * Get the last vehicle used by a specific driver
 * @param {string} driverId - The driver/user ID
 * @returns {Promise<string|null>} - Vehicle ID or null
 */
export const getLastVehicleForDriver = async (driverId) => {
  if (!driverId) return null;

  try {
    // Query by both userId and driverId to cover all cases
    const entriesQuery1 = query(
      collection(db, 'dailyEntries'),
      where('userId', '==', driverId)
    );

    const entriesQuery2 = query(
      collection(db, 'dailyEntries'),
      where('driverId', '==', driverId)
    );

    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(entriesQuery1),
      getDocs(entriesQuery2)
    ]);

    const entries = [];

    // Combine results from both queries
    snapshot1.docs.forEach(doc => {
      const entry = doc.data();
      const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
      entries.push({
        vehicleId: entry.vehicleId,
        date: entryDate
      });
    });

    snapshot2.docs.forEach(doc => {
      const entry = doc.data();
      const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
      // Avoid duplicates
      if (!entries.some(e => e.vehicleId === entry.vehicleId && e.date.getTime() === entryDate.getTime())) {
        entries.push({
          vehicleId: entry.vehicleId,
          date: entryDate
        });
      }
    });

    if (entries.length === 0) {
      return null;
    }

    // Sort by date to get most recent
    entries.sort((a, b) => b.date - a.date);

    return entries[0].vehicleId;
  } catch (error) {
    console.error('Error fetching last vehicle for driver:', error);
    return null;
  }
};
