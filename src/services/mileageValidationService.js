import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get the last recorded mileage for a specific vehicle BEFORE a given date
 * This checks entries chronologically to ensure cumulative mileage progression
 * @param {string} vehicleId - The vehicle ID
 * @param {Date|string} beforeDate - The date to check before
 * @param {string} excludeEntryId - Optional entry ID to exclude (when editing)
 * @returns {Promise<Object|null>} - Object with lastMileage and date, or null if no entries found
 */
export const getLastRecordedMileage = async (vehicleId, beforeDate = null, excludeEntryId = null) => {
  if (!vehicleId) return null;

  try {
    // Query ALL daily entries for this vehicle
    const entriesQuery = query(
      collection(db, 'dailyEntries'),
      where('vehicleId', '==', vehicleId)
    );

    const snapshot = await getDocs(entriesQuery);

    if (snapshot.empty) {
      return null;
    }

    // Sort entries by date manually (client-side) to avoid index requirements
    const entries = [];
    snapshot.docs.forEach(doc => {
      const entry = doc.data();
      const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
      entries.push({
        id: doc.id,
        data: entry,
        date: entryDate
      });
    });

    // Sort by date descending (most recent first)
    entries.sort((a, b) => b.date - a.date);

    // Convert beforeDate to Date object for comparison
    const checkDate = beforeDate ? (beforeDate instanceof Date ? beforeDate : new Date(beforeDate)) : null;

    // Find the most recent entry BEFORE the given date
    let lastEntry = null;
    
    for (const entryObj of entries) {
      // Skip the entry being edited
      if (excludeEntryId && entryObj.id === excludeEntryId) {
        continue;
      }

      const entry = entryObj.data;
      const entryDate = entryObj.date;
      
      // If checking before a specific date, only consider entries before that date
      if (checkDate) {
        if (entryDate < checkDate) {
          lastEntry = { ...entry, id: entryObj.id, date: entryDate };
          break; // Found the most recent entry before the date
        }
      } else {
        // No date filter, just get the most recent entry
        lastEntry = { ...entry, id: entryObj.id, date: entryDate };
        break;
      }
    }

    if (!lastEntry) {
      return null;
    }
    
    const mileage = lastEntry.endMileage || lastEntry.startMileage || 0;
    
    return {
      lastMileage: mileage,
      date: lastEntry.date,
      entryId: lastEntry.id
    };
  } catch (error) {
    console.error('Error fetching last mileage:', error);
    return null;
  }
};

/**
 * Validate mileage chronologically - today's start must be >= previous day's end
 * @param {number} startMileage - The start mileage to validate
 * @param {number} endMileage - The end mileage to validate
 * @param {number} previousEndMileage - The end mileage from the previous chronological entry
 * @returns {Object} - Validation result with isValid and message
 */
export const validateMileage = (startMileage, endMileage, previousEndMileage) => {
  const start = parseFloat(startMileage);
  const end = parseFloat(endMileage);
  const prevEnd = parseFloat(previousEndMileage);

  // Check if values are valid numbers
  if (isNaN(start) || isNaN(end)) {
    return {
      isValid: false,
      message: 'Please enter valid mileage values'
    };
  }

  // Check if end mileage is greater than start mileage
  if (end <= start) {
    return {
      isValid: false,
      message: 'End mileage must be greater than start mileage'
    };
  }

  // CUMULATIVE CHECK: Start mileage must be >= previous entry's end mileage (chronologically)
  if (prevEnd && !isNaN(prevEnd)) {
    if (start < prevEnd) {
      return {
        isValid: false,
        message: `❌ Invalid: Start mileage (${start.toLocaleString()} km) cannot be less than previous entry's end mileage (${prevEnd.toLocaleString()} km). Odometer must progress forward chronologically!`
      };
    }

    // Warning if start mileage is significantly higher than previous end (more than 5000 km jump)
    const mileageJump = start - prevEnd;
    if (mileageJump > 5000) {
      return {
        isValid: true,
        warning: `⚠️ Large mileage jump: ${mileageJump.toLocaleString()} km since previous entry. Please verify this is correct.`
      };
    }
  }

  return {
    isValid: true,
    message: 'Mileage is valid'
  };
};

/**
 * Calculate cumulative total mileage for a vehicle from ALL daily entries
 * @param {string} vehicleId - The vehicle ID
 * @returns {Promise<number>} - Total cumulative mileage in km
 */
export const getCumulativeMileage = async (vehicleId) => {
  if (!vehicleId) return 0;

  try {
    // Get ALL daily entries for this vehicle
    const entriesQuery = query(
      collection(db, 'dailyEntries'),
      where('vehicleId', '==', vehicleId),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(entriesQuery);

    if (snapshot.empty) {
      return 0;
    }

    // Calculate total distance traveled from all entries
    let totalMileage = 0;
    snapshot.docs.forEach(doc => {
      const entry = doc.data();
      const distanceTraveled = entry.distanceTraveled || 0;
      totalMileage += distanceTraveled;
    });

    return totalMileage;
  } catch (error) {
    console.error('Error calculating cumulative mileage:', error);
    return 0;
  }
};

/**
 * Validate new entry mileage with comprehensive checks
 * @param {number} startMileage - Start mileage for new entry
 * @param {number} endMileage - End mileage for new entry
 * @param {string} vehicleId - Vehicle ID
 * @param {Date} entryDate - Date of the entry
 * @returns {Promise<Object>} - Validation result
 */
export const validateNewEntryMileage = async (startMileage, endMileage, vehicleId, entryDate) => {
  const start = parseFloat(startMileage);
  const end = parseFloat(endMileage);

  // Basic validation
  if (isNaN(start) || isNaN(end)) {
    return {
      isValid: false,
      message: 'Please enter valid mileage values'
    };
  }

  if (start < 0 || end < 0) {
    return {
      isValid: false,
      message: 'Mileage cannot be negative'
    };
  }

  if (end <= start) {
    return {
      isValid: false,
      message: 'End mileage must be greater than start mileage'
    };
  }

  const distanceTraveled = end - start;

  // Check for unrealistic distance in one trip (more than 2000 km)
  if (distanceTraveled > 2000) {
    return {
      isValid: false,
      message: `Distance traveled (${distanceTraveled.toLocaleString()} km) seems unrealistic for one trip. Please verify.`
    };
  }

  // Get last recorded mileage
  const lastMileageInfo = await getLastRecordedMileage(vehicleId);

  if (lastMileageInfo) {
    const lastMileage = lastMileageInfo.lastMileage;

    // Start mileage must be >= last recorded end mileage
    if (start < lastMileage) {
      return {
        isValid: false,
        message: `Start mileage (${start.toLocaleString()} km) cannot be less than last recorded mileage (${lastMileage.toLocaleString()} km)`
      };
    }

    // Check for backward date entry
    const lastDate = lastMileageInfo.date;
    const newDate = entryDate instanceof Date ? entryDate : new Date(entryDate);
    
    if (newDate < lastDate) {
      return {
        isValid: false,
        message: 'Cannot enter mileage for a date before the last recorded entry'
      };
    }

    // Warning for large mileage jump
    const mileageJump = start - lastMileage;
    if (mileageJump > 5000) {
      return {
        isValid: true,
        warning: `Large mileage jump: ${mileageJump.toLocaleString()} km since last entry. Please verify this is correct.`
      };
    }

    // Warning for very small distance (less than 1 km)
    if (distanceTraveled < 1) {
      return {
        isValid: true,
        warning: `Very small distance traveled (${distanceTraveled} km). Please verify this is correct.`
      };
    }
  }

  return {
    isValid: true,
    message: 'Mileage is valid'
  };
};
