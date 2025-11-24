import { collection, query, where, orderBy, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Detect unaccounted mileage gaps for a vehicle
 * @param {string} vehicleId - The vehicle ID
 * @param {string} companyId - The company ID
 * @returns {Promise<Array>} - Array of mileage gap objects
 */
export const detectMileageGaps = async (vehicleId, companyId) => {
  if (!vehicleId) return [];

  try {
    // Get all entries for this vehicle
    const entriesQuery = query(
      collection(db, 'dailyEntries'),
      where('vehicleId', '==', vehicleId),
      where('companyId', '==', companyId)
    );

    const snapshot = await getDocs(entriesQuery);

    if (snapshot.empty || snapshot.docs.length < 2) {
      return []; // Need at least 2 entries to detect gaps
    }

    // Sort entries by date manually
    const allEntries = [];
    snapshot.docs.forEach((doc) => {
      const entry = doc.data();
      const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
      allEntries.push({
        id: doc.id,
        date: entryDate,
        startMileage: entry.startMileage || 0,
        endMileage: entry.endMileage || 0,
        vehicleId: entry.vehicleId,
      });
    });

    // Sort by date ascending
    allEntries.sort((a, b) => a.date - b.date);

    const gaps = [];
    let previousEntry = null;

    allEntries.forEach((currentEntry) => {
      if (previousEntry) {
        // Check if current start mileage matches previous end mileage
        const gap = currentEntry.startMileage - previousEntry.endMileage;

        if (gap > 0) {
          // There's unaccounted mileage!
          gaps.push({
            id: `${previousEntry.id}-${currentEntry.id}`,
            vehicleId: vehicleId,
            previousEntryId: previousEntry.id,
            currentEntryId: currentEntry.id,
            previousDate: previousEntry.date,
            currentDate: currentEntry.date,
            previousEndMileage: previousEntry.endMileage,
            currentStartMileage: currentEntry.startMileage,
            unaccountedKm: gap,
            daysBetween: Math.ceil((currentEntry.date - previousEntry.date) / (1000 * 60 * 60 * 24)),
            severity: gap > 500 ? 'high' : gap > 100 ? 'medium' : 'low',
            detectedAt: new Date(),
          });
        }
      }

      previousEntry = currentEntry;
    });

    return gaps;
  } catch (error) {
    console.error('Error detecting mileage gaps:', error);
    return [];
  }
};

/**
 * Get all mileage gaps for a company (all vehicles)
 * @param {string} companyId - The company ID
 * @returns {Promise<Array>} - Array of mileage gap objects with vehicle info
 */
export const getCompanyMileageGaps = async (companyId) => {
  if (!companyId) return [];

  try {
    // Get all vehicles for this company
    const vehiclesQuery = query(
      collection(db, 'vehicles'),
      where('companyId', '==', companyId)
    );

    const vehiclesSnapshot = await getDocs(vehiclesQuery);

    if (vehiclesSnapshot.empty) {
      return [];
    }

    // Get gaps for each vehicle
    const allGaps = [];
    
    for (const vehicleDoc of vehiclesSnapshot.docs) {
      const vehicle = vehicleDoc.data();
      const gaps = await detectMileageGaps(vehicleDoc.id, companyId);
      
      // Add vehicle info to each gap
      gaps.forEach(gap => {
        allGaps.push({
          ...gap,
          vehicleName: vehicle.name,
          vehicleRegistration: vehicle.registrationNumber,
        });
      });
    }

    // Sort by severity and unaccounted km (descending)
    allGaps.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.unaccountedKm - a.unaccountedKm;
    });

    return allGaps;
  } catch (error) {
    console.error('Error getting company mileage gaps:', error);
    return [];
  }
};

/**
 * Get mileage gap statistics for a company
 * @param {string} companyId - The company ID
 * @returns {Promise<Object>} - Statistics object
 */
export const getMileageGapStats = async (companyId) => {
  // Only count unacknowledged gaps for stats
  const gaps = await getCompanyMileageGapsFiltered(companyId, false);

  const stats = {
    totalGaps: gaps.length,
    totalUnaccountedKm: gaps.reduce((sum, gap) => sum + gap.unaccountedKm, 0),
    highSeverityCount: gaps.filter(g => g.severity === 'high').length,
    mediumSeverityCount: gaps.filter(g => g.severity === 'medium').length,
    lowSeverityCount: gaps.filter(g => g.severity === 'low').length,
    affectedVehicles: [...new Set(gaps.map(g => g.vehicleId))].length,
    averageGapSize: gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap.unaccountedKm, 0) / gaps.length : 0,
  };

  return stats;
};

/**
 * Acknowledge a mileage gap (mark as noted by manager)
 * @param {string} gapId - The gap ID
 * @param {string} userId - The user ID acknowledging
 * @param {string} note - Optional note about the gap
 * @returns {Promise<void>}
 */
export const acknowledgeMileageGap = async (gapId, userId, note = '') => {
  try {
    await setDoc(doc(db, 'acknowledgedGaps', gapId), {
      gapId,
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
      note,
    });
  } catch (error) {
    console.error('Error acknowledging gap:', error);
    throw error;
  }
};

/**
 * Check if a gap has been acknowledged
 * @param {string} gapId - The gap ID
 * @returns {Promise<boolean>}
 */
export const isGapAcknowledged = async (gapId) => {
  try {
    const gapDoc = await getDoc(doc(db, 'acknowledgedGaps', gapId));
    return gapDoc.exists();
  } catch (error) {
    console.error('Error checking gap acknowledgment:', error);
    return false;
  }
};

/**
 * Get company mileage gaps excluding acknowledged ones
 * @param {string} companyId - The company ID
 * @param {boolean} includeAcknowledged - Whether to include acknowledged gaps
 * @returns {Promise<Array>}
 */
export const getCompanyMileageGapsFiltered = async (companyId, includeAcknowledged = false) => {
  const allGaps = await getCompanyMileageGaps(companyId);
  
  if (includeAcknowledged) {
    return allGaps;
  }
  
  // Filter out acknowledged gaps
  const unacknowledgedGaps = [];
  for (const gap of allGaps) {
    const acknowledged = await isGapAcknowledged(gap.id);
    if (!acknowledged) {
      unacknowledgedGaps.push(gap);
    }
  }
  
  return unacknowledgedGaps;
};

/**
 * Validate new entry for mileage gaps
 * @param {string} vehicleId - The vehicle ID
 * @param {number} startMileage - Start mileage of new entry
 * @param {Date} entryDate - Date of new entry
 * @param {string} companyId - The company ID
 * @returns {Promise<Object>} - Validation result with gap info
 */
export const validateForMileageGap = async (vehicleId, startMileage, entryDate, companyId) => {
  if (!vehicleId || !startMileage || !entryDate) {
    return { hasGap: false };
  }

  try {
    // Get all entries for this vehicle, ordered by date descending
    const entriesQuery = query(
      collection(db, 'dailyEntries'),
      where('vehicleId', '==', vehicleId),
      where('companyId', '==', companyId),
      orderBy('date', 'desc')
    );

    const snapshot = await getDocs(entriesQuery);

    if (snapshot.empty) {
      return { hasGap: false };
    }

    // Get the absolute latest entry (most recent)
    const latestDoc = snapshot.docs[0];
    const latestEntry = latestDoc.data();
    const latestDate = latestEntry.date?.toDate ? latestEntry.date.toDate() : new Date(latestEntry.date);
    
    const previousEntry = {
      date: latestDate,
      endMileage: latestEntry.endMileage || 0,
    };

    const gap = parseFloat(startMileage) - previousEntry.endMileage;

    if (gap > 0) {
      const newDate = entryDate instanceof Date ? entryDate : new Date(entryDate);
      const daysBetween = Math.ceil((newDate - previousEntry.date) / (1000 * 60 * 60 * 24));
      
      return {
        hasGap: true,
        unaccountedKm: gap,
        previousEndMileage: previousEntry.endMileage,
        previousDate: previousEntry.date,
        daysBetween: daysBetween,
        severity: gap > 500 ? 'high' : gap > 100 ? 'medium' : 'low',
        warning: `⚠️ Mileage Gap Detected: ${gap.toLocaleString()} km unaccounted for between ${previousEntry.date.toLocaleDateString()} (${previousEntry.endMileage.toLocaleString()} km) and ${newDate.toLocaleDateString()} (${parseFloat(startMileage).toLocaleString()} km). This may indicate unreported trips.`,
      };
    }

    return { hasGap: false };
  } catch (error) {
    console.error('Error validating for mileage gap:', error);
    return { hasGap: false };
  }
};
