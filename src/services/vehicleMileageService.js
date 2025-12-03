import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get the last recorded mileage for a vehicle
 * Checks both loadEvents and returnTrips to find the most recent mileage
 * @param {string} vehicleId - Vehicle ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} { mileage: number, source: string, timestamp: Date }
 */
export const getLastRecordedMileage = async (vehicleId, companyId) => {
  try {
    const results = [];

    // Check load events for BOTH starting mileage AND mileage at load (supplier)
    const loadEventsRef = collection(db, 'loadEvents');
    const loadQuery = query(
      loadEventsRef,
      where('vehicleId', '==', vehicleId),
      where('companyId', '==', companyId),
      orderBy('loadDate', 'desc'),
      limit(5) // Get last 5 to check both startingMileage and mileageAtLoad
    );
    const loadSnapshot = await getDocs(loadQuery);
    
    loadSnapshot.docs.forEach(loadDoc => {
      const loadData = loadDoc.data();
      const loadDate = loadData.loadDate?.toDate();
      
      // Add mileageAtLoad (odometer at supplier) - this is the MOST RECENT during load
      if (loadData.mileageAtLoad) {
        results.push({
          mileage: loadData.mileageAtLoad,
          source: 'load',
          timestamp: loadDate,
          eventId: loadDoc.id,
          detail: 'at supplier'
        });
      }
      
      // Add startingMileage (odometer leaving depot) - slightly older
      if (loadData.startingMileage) {
        results.push({
          mileage: loadData.startingMileage,
          source: 'load',
          timestamp: loadDate,
          eventId: loadDoc.id,
          detail: 'leaving depot'
        });
      }
    });

    // Check offload events for odometer readings at customer
    const offloadEventsRef = collection(db, 'offloadEvents');
    const offloadQuery = query(
      offloadEventsRef,
      where('vehicleId', '==', vehicleId),
      where('companyId', '==', companyId),
      orderBy('offloadDate', 'desc'),
      limit(5)
    );
    const offloadSnapshot = await getDocs(offloadQuery);
    
    offloadSnapshot.docs.forEach(offloadDoc => {
      const offloadData = offloadDoc.data();
      const offloadDate = offloadData.offloadDate?.toDate();
      
      if (offloadData.odometerReading || offloadData.mileageAtOffload) {
        results.push({
          mileage: offloadData.odometerReading || offloadData.mileageAtOffload,
          source: 'offload',
          timestamp: offloadDate,
          eventId: offloadDoc.id,
          detail: 'at customer'
        });
      }
    });

    // Check return trips for ending mileage at depot
    const returnTripsRef = collection(db, 'returnTrips');
    const returnQuery = query(
      returnTripsRef,
      where('vehicleId', '==', vehicleId),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const returnSnapshot = await getDocs(returnQuery);
    
    returnSnapshot.docs.forEach(returnDoc => {
      const returnData = returnDoc.data();
      const returnDate = returnData.createdAt?.toDate();
      
      if (returnData.mileageAtDepot) {
        results.push({
          mileage: returnData.mileageAtDepot,
          source: 'return',
          timestamp: returnDate,
          eventId: returnDoc.id,
          detail: 'back at depot'
        });
      }
    });

    // Return the HIGHEST mileage across ALL events (not just most recent by time)
    // This handles multiple offloads per trip where mileage increases progressively
    if (results.length === 0) {
      console.log('No mileage records found for vehicle:', vehicleId);
      return { mileage: null, source: null, timestamp: null };
    }

    // Sort by MILEAGE (highest first), then by timestamp if mileage is equal
    results.sort((a, b) => {
      // Primary sort: by mileage (descending)
      if (b.mileage !== a.mileage) {
        return b.mileage - a.mileage;
      }
      // Secondary sort: by timestamp (most recent first)
      const timeA = a.timestamp ? a.timestamp.getTime() : 0;
      const timeB = b.timestamp ? b.timestamp.getTime() : 0;
      return timeB - timeA;
    });

    console.log(`✅ HIGHEST mileage for vehicle ${vehicleId}: ${results[0].mileage} km from ${results[0].source} (${results[0].detail})`);
    return results[0];
  } catch (error) {
    console.error('Error getting last recorded mileage:', error);
    throw error;
  }
};

/**
 * Check if a vehicle has any incomplete return trips
 * @param {string} vehicleId - Vehicle ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object|null>} Incomplete load event or null
 */
export const getIncompleteReturnTrip = async (vehicleId, companyId) => {
  try {
    // Find ALL loads for this vehicle (active OR completed) that might need return trips
    // We check both statuses because loads remain 'active' until fully offloaded
    const loadEventsRef = collection(db, 'loadEvents');
    
    // Get active loads
    const activeQuery = query(
      loadEventsRef,
      where('vehicleId', '==', vehicleId),
      where('companyId', '==', companyId),
      where('status', '==', 'active'),
      orderBy('loadDate', 'desc')
    );
    const activeSnapshot = await getDocs(activeQuery);
    
    // Get completed loads
    const completedQuery = query(
      loadEventsRef,
      where('vehicleId', '==', vehicleId),
      where('companyId', '==', companyId),
      where('status', '==', 'completed'),
      orderBy('loadDate', 'desc')
    );
    const completedSnapshot = await getDocs(completedQuery);
    
    // Combine all loads
    const allLoadDocs = [...activeSnapshot.docs, ...completedSnapshot.docs];
    const loadSnapshot = { docs: allLoadDocs };
    
    // Check each completed load to see if it has a return trip
    for (const loadDoc of loadSnapshot.docs) {
      const loadData = loadDoc.data();
      const loadId = loadDoc.id;
      
      // Check if there are offloads for this load
      const offloadEventsRef = collection(db, 'offloadEvents');
      const offloadQuery = query(
        offloadEventsRef,
        where('loadEventId', '==', loadId)
      );
      const offloadSnapshot = await getDocs(offloadQuery);
      
      if (offloadSnapshot.empty) {
        continue; // No offloads, skip
      }
      
      // Check if any offload has a return trip
      let hasReturnTrip = false;
      for (const offloadDoc of offloadSnapshot.docs) {
        const offloadId = offloadDoc.id;
        
        // Check for return trip
        const returnTripsRef = collection(db, 'returnTrips');
        const returnQuery = query(
          returnTripsRef,
          where('offloadEventId', '==', offloadId)
        );
        const returnSnapshot = await getDocs(returnQuery);
        
        if (!returnSnapshot.empty) {
          hasReturnTrip = true;
          break;
        }
      }
      
      // If this load has offloads but no return trip, it's incomplete
      if (!hasReturnTrip) {
        return {
          id: loadId,
          ...loadData,
          loadDate: loadData.loadDate?.toDate(),
          offloadCount: offloadSnapshot.size
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking incomplete return trips:', error);
    throw error;
  }
};

/**
 * Validate mileage reading
 * @param {number} newMileage - New mileage reading
 * @param {number} lastMileage - Last recorded mileage
 * @param {number} maxReasonableDistance - Maximum reasonable distance (km) for validation
 * @returns {Object} { valid: boolean, message: string }
 */
export const validateMileageReading = (newMileage, lastMileage, maxReasonableDistance = 5000) => {
  if (!newMileage) {
    return { valid: false, message: 'Mileage reading is required' };
  }

  if (newMileage < 0) {
    return { valid: false, message: 'Mileage cannot be negative' };
  }

  if (lastMileage && newMileage < lastMileage) {
    return { 
      valid: false, 
      message: `New mileage (${newMileage} km) cannot be less than last recorded mileage (${lastMileage} km)` 
    };
  }

  if (lastMileage && (newMileage - lastMileage) > maxReasonableDistance) {
    return { 
      valid: false, 
      message: `Distance traveled (${newMileage - lastMileage} km) seems unusually high. Please verify the reading.` 
    };
  }

  return { valid: true, message: '' };
};
