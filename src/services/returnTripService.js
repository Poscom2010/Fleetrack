import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Create a return trip record
 * @param {string} userId - User ID creating the return trip
 * @param {string} companyId - Company ID
 * @param {Object} returnTripData - Return trip data
 * @returns {Promise<string>} Return trip document ID
 */
export const createReturnTrip = async (userId, companyId, returnTripData) => {
  try {
    // Validate required fields
    if (!returnTripData.offloadEventId) throw new Error('Offload event ID is required');
    if (!returnTripData.vehicleId) throw new Error('Vehicle ID is required');
    if (returnTripData.mileageAtCustomer === undefined) throw new Error('Mileage at customer is required');
    if (returnTripData.mileageAtDepot === undefined) throw new Error('Mileage at depot is required');

    // Calculate return distance
    const returnDistance = returnTripData.mileageAtDepot - returnTripData.mileageAtCustomer;
    
    if (returnDistance < 0) {
      throw new Error('Mileage at depot must be greater than mileage at customer');
    }

    // Prepare document data
    const docData = {
      companyId,
      vehicleId: returnTripData.vehicleId,
      driverId: returnTripData.driverId || userId,
      offloadEventId: returnTripData.offloadEventId,
      loadEventId: returnTripData.loadEventId || null,
      
      // Return journey details
      returnStartDate: returnTripData.returnStartDate instanceof Date
        ? Timestamp.fromDate(returnTripData.returnStartDate)
        : Timestamp.fromDate(new Date(returnTripData.returnStartDate)),
      returnEndDate: returnTripData.returnEndDate instanceof Date
        ? Timestamp.fromDate(returnTripData.returnEndDate)
        : Timestamp.fromDate(new Date(returnTripData.returnEndDate)),
      
      // Mileage tracking
      mileageAtCustomer: Number(returnTripData.mileageAtCustomer),
      mileageAtDepot: Number(returnTripData.mileageAtDepot),
      returnDistance: Number(returnDistance),
      
      // Optional details
      fuelUsed: returnTripData.fuelUsed ? Number(returnTripData.fuelUsed) : null,
      notes: returnTripData.notes || '',
      delays: returnTripData.delays || [],
      
      // Status
      status: 'completed',
      
      // Audit
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'returnTrips'), docData);
    
    // Update offload event to mark return trip as captured
    await updateDoc(doc(db, 'offloadEvents', returnTripData.offloadEventId), {
      hasReturnTrip: true,
      returnTripId: docRef.id,
      updatedAt: Timestamp.now()
    });

    // CRITICAL: Update vehicle's current odometer with mileage at depot
    if (returnTripData.mileageAtDepot && returnTripData.mileageAtDepot > 0) {
      try {
        const vehicleRef = doc(db, 'vehicles', returnTripData.vehicleId);
        await updateDoc(vehicleRef, {
          currentOdometer: Number(returnTripData.mileageAtDepot),
          currentMileage: Number(returnTripData.mileageAtDepot),  // Also update currentMileage for UI compatibility
          lastOdometerUpdate: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        console.log(`✅ Vehicle odometer updated to ${returnTripData.mileageAtDepot} km after return trip`);
      } catch (error) {
        console.error('Error updating vehicle odometer after return trip:', error);
        // Don't fail the entire return trip if odometer update fails
      }
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating return trip:', error);
    throw error;
  }
};

/**
 * Get return trip by offload event ID
 * @param {string} offloadEventId - Offload event ID
 * @returns {Promise<Object|null>} Return trip data or null
 */
export const getReturnTripByOffloadId = async (offloadEventId) => {
  try {
    const q = query(
      collection(db, 'returnTrips'),
      where('offloadEventId', '==', offloadEventId)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      returnStartDate: doc.data().returnStartDate?.toDate(),
      returnEndDate: doc.data().returnEndDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    };
  } catch (error) {
    console.error('Error fetching return trip:', error);
    throw error;
  }
};

/**
 * Get all return trips for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of return trips
 */
export const getCompanyReturnTrips = async (companyId) => {
  try {
    const q = query(
      collection(db, 'returnTrips'),
      where('companyId', '==', companyId)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      returnStartDate: doc.data().returnStartDate?.toDate(),
      returnEndDate: doc.data().returnEndDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error fetching company return trips:', error);
    throw error;
  }
};

/**
 * Get pending return trips (offloads without return trips)
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of offload events without return trips
 */
export const getPendingReturnTrips = async (companyId) => {
  try {
    const q = query(
      collection(db, 'offloadEvents'),
      where('companyId', '==', companyId),
      where('hasReturnTrip', '==', false)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      offloadDate: doc.data().offloadDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate()
    }));
  } catch (error) {
    console.error('Error fetching pending return trips:', error);
    throw error;
  }
};

/**
 * Validate return trip data against outbound trip
 * @param {Object} returnTripData - Return trip data
 * @param {Object} offloadEvent - Offload event data
 * @param {Object} loadEvent - Load event data
 * @returns {Object} Validation result with warnings
 */
export const validateReturnTrip = (returnTripData, offloadEvent, loadEvent) => {
  const warnings = [];
  
  // Calculate outbound distance
  const outboundDistance = offloadEvent.mileageAtOffload - loadEvent.mileageAtLoad;
  const returnDistance = returnTripData.mileageAtDepot - returnTripData.mileageAtCustomer;
  
  // Check if return distance is reasonable (within 30% of outbound)
  const variance = Math.abs(returnDistance - outboundDistance);
  const variancePercent = (variance / outboundDistance) * 100;
  
  if (variancePercent > 30) {
    warnings.push({
      type: 'distance_variance',
      message: `Return distance (${returnDistance}km) differs significantly from outbound (${outboundDistance}km). Possible detour or error?`
    });
  }
  
  // Check return start time - only warn if return is more than 1 day before offload
  const returnStart = new Date(returnTripData.returnStartDate);
  const offloadEnd = offloadEvent.offloadDate?.toDate ? offloadEvent.offloadDate.toDate() : new Date(offloadEvent.offloadDate);
  
  // Allow same-day returns and only warn if return is significantly before offload (more than 1 day)
  const daysDifference = (returnStart - offloadEnd) / (1000 * 60 * 60 * 24);
  
  if (daysDifference < -1) {
    warnings.push({
      type: 'time_error',
      message: 'Return trip date is more than 1 day before offload date. Please verify dates.'
    });
  }
  
  // Check fuel consumption if provided
  if (returnTripData.fuelUsed) {
    const estimatedFuel = returnDistance / 3; // ~3km per litre for trucks
    if (returnTripData.fuelUsed > estimatedFuel * 1.5) {
      warnings.push({
        type: 'high_fuel_consumption',
        message: `Fuel consumption (${returnTripData.fuelUsed}L) seems high for ${returnDistance}km`
      });
    }
  }
  
  return {
    isValid: warnings.length === 0,
    warnings
  };
};
