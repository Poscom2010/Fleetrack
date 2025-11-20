import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get the last recorded mileage for a specific vehicle
 * @param {string} vehicleId - The vehicle ID
 * @returns {Promise<Object|null>} - Object with lastMileage and date, or null if no entries found
 */
export const getLastRecordedMileage = async (vehicleId) => {
  if (!vehicleId) return null;

  try {
    // Query daily entries for this vehicle, ordered by date descending
    const entriesQuery = query(
      collection(db, 'dailyEntries'),
      where('vehicleId', '==', vehicleId),
      orderBy('date', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(entriesQuery);

    if (snapshot.empty) {
      return null;
    }

    const lastEntry = snapshot.docs[0].data();
    
    return {
      lastMileage: lastEntry.endMileage || lastEntry.startMileage || 0,
      date: lastEntry.date?.toDate ? lastEntry.date.toDate() : new Date(lastEntry.date),
      entryId: snapshot.docs[0].id
    };
  } catch (error) {
    console.error('Error fetching last mileage:', error);
    return null;
  }
};

/**
 * Validate mileage against last recorded mileage
 * @param {number} startMileage - The start mileage to validate
 * @param {number} endMileage - The end mileage to validate
 * @param {number} lastRecordedMileage - The last recorded mileage for this vehicle
 * @returns {Object} - Validation result with isValid and message
 */
export const validateMileage = (startMileage, endMileage, lastRecordedMileage) => {
  const start = parseFloat(startMileage);
  const end = parseFloat(endMileage);
  const lastMileage = parseFloat(lastRecordedMileage);

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

  // Check against last recorded mileage
  if (lastMileage && !isNaN(lastMileage)) {
    if (start < lastMileage) {
      return {
        isValid: false,
        message: `Start mileage (${start.toLocaleString()} km) cannot be less than last recorded mileage (${lastMileage.toLocaleString()} km)`
      };
    }

    // Warning if start mileage is significantly higher than last recorded (more than 5000 km jump)
    const mileageJump = start - lastMileage;
    if (mileageJump > 5000) {
      return {
        isValid: true,
        warning: `Large mileage jump detected: ${mileageJump.toLocaleString()} km since last entry. Please verify this is correct.`
      };
    }
  }

  return {
    isValid: true,
    message: 'Mileage is valid'
  };
};
