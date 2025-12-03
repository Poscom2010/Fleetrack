/**
 * Load Event Service
 * Handles CRUD operations for fuel loading events
 */

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Create a new load event
 * @param {string} userId - ID of user creating the event
 * @param {string} companyId - Company ID
 * @param {Object} loadData - Load event data
 * @returns {Promise<string>} Document ID of created load event
 */
export const createLoadEvent = async (userId, companyId, loadData) => {
  try {
    // Validate required fields
    if (!loadData.vehicleId) throw new Error('Vehicle ID is required');
    if (!loadData.commodityType) throw new Error('Commodity type is required');
    if (!loadData.loadQuantity || loadData.loadQuantity <= 0) {
      throw new Error('Load quantity must be greater than 0');
    }
    if (loadData.tankReadingBefore === undefined || loadData.tankReadingBefore === null) {
      throw new Error('Tank reading before is required');
    }
    if (loadData.tankReadingAfter === undefined || loadData.tankReadingAfter === null) {
      throw new Error('Tank reading after is required');
    }

    // Validate tank readings logic
    const expectedAfter = loadData.tankReadingBefore + loadData.loadQuantity;
    const tolerance = loadData.loadQuantity * 0.005; // 0.5% tolerance
    const actualDiff = Math.abs(loadData.tankReadingAfter - expectedAfter);

    if (actualDiff > tolerance) {
      console.warn(`Tank reading variance detected: Expected ${expectedAfter}, got ${loadData.tankReadingAfter}`);
    }

    // Validate tank reading after >= before (must increase after loading)
    if (loadData.tankReadingAfter < loadData.tankReadingBefore) {
      throw new Error('Tank reading after loading must be greater than or equal to reading before');
    }

    // Prepare document data
    const docData = {
      companyId,
      vehicleId: loadData.vehicleId,
      driverId: loadData.driverId || userId, // Actual driver assigned to this load
      commodityType: loadData.commodityType,
      unit: loadData.unit || (loadData.commodityType === 'lpGas' ? 'kgs' : 'litres'),
      loadDate: loadData.loadDate instanceof Date 
        ? Timestamp.fromDate(loadData.loadDate)
        : Timestamp.fromDate(new Date(loadData.loadDate)),
      supplier: loadData.supplier || '',
      location: loadData.location || {},
      tankReadingBefore: Number(loadData.tankReadingBefore),
      loadQuantity: Number(loadData.loadQuantity),
      tankReadingAfter: Number(loadData.tankReadingAfter),
      startingMileage: loadData.startingMileage ? Number(loadData.startingMileage) : null,
      mileageAtLoad: loadData.mileageAtLoad ? Number(loadData.mileageAtLoad) : null,
      // Calculate distance to supplier for analytics
      distanceToSupplier: (loadData.mileageAtLoad && loadData.startingMileage) 
        ? Number(loadData.mileageAtLoad) - Number(loadData.startingMileage) 
        : null,
      docketNumber: loadData.docketNumber || '',
      temperature: loadData.temperature || null,
      density: loadData.density || null,
      sealNumber: loadData.sealNumber || '',
      status: 'active',
      notes: loadData.notes || '',
      createdBy: userId, // Admin/manager who created this record
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'loadEvents'), docData);

    // Update vehicle's current odometer with mileage at load
    if (loadData.mileageAtLoad && loadData.mileageAtLoad > 0) {
      try {
        const vehicleRef = doc(db, 'vehicles', loadData.vehicleId);
        await updateDoc(vehicleRef, {
          currentOdometer: Number(loadData.mileageAtLoad),
          currentMileage: Number(loadData.mileageAtLoad),
          lastOdometerUpdate: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        console.log(`✅ Vehicle odometer updated to ${loadData.mileageAtLoad} km after loading`);
      } catch (error) {
        console.error('Error updating vehicle odometer:', error);
        // Don't fail the load event if odometer update fails
      }
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating load event:', error);
    throw error;
  }
};

/**
 * Get a single load event by ID
 * @param {string} loadEventId - Load event document ID
 * @returns {Promise<Object|null>} Load event data or null
 */
export const getLoadEvent = async (loadEventId) => {
  try {
    const docRef = doc(db, 'loadEvents', loadEventId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        status: docSnap.data().status || 'active', // Default to 'active' if missing
        loadDate: docSnap.data().loadDate?.toDate(),
        createdAt: docSnap.data().createdAt?.toDate(),
        updatedAt: docSnap.data().updatedAt?.toDate()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting load event:', error);
    throw error;
  }
};

/**
 * Get all active loads for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of active load events
 */
export const getActiveLoads = async (companyId) => {
  try {
    const q = query(
      collection(db, 'loadEvents'),
      where('companyId', '==', companyId),
      where('status', '==', 'active'),
      orderBy('loadDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      status: doc.data().status || 'active', // Default to 'active' if missing
      loadDate: doc.data().loadDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting active loads:', error);
    throw error;
  }
};

/**
 * Get all load events for a company (with optional filters)
 * @param {string} companyId - Company ID
 * @param {Object} filters - Optional filters (vehicleId, status, startDate, endDate)
 * @returns {Promise<Array>} Array of load events
 */
export const getLoadEvents = async (companyId, filters = {}) => {
  try {
    let q = query(
      collection(db, 'loadEvents'),
      where('companyId', '==', companyId)
    );

    // Apply filters
    if (filters.vehicleId) {
      q = query(q, where('vehicleId', '==', filters.vehicleId));
    }
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }

    // Order by date
    q = query(q, orderBy('loadDate', 'desc'));

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      status: doc.data().status || 'active', // Default to 'active' if missing
      loadDate: doc.data().loadDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Client-side date filtering (Firestore doesn't support range queries with other where clauses easily)
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      results = results.filter(event => event.loadDate >= startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      results = results.filter(event => event.loadDate <= endDate);
    }

    return results;
  } catch (error) {
    console.error('Error getting load events:', error);
    throw error;
  }
};

/**
 * Get load events for a specific vehicle
 * @param {string} vehicleId - Vehicle ID
 * @param {string} status - Optional status filter
 * @returns {Promise<Array>} Array of load events
 */
export const getLoadEventsByVehicle = async (vehicleId, status = null) => {
  try {
    let q = query(
      collection(db, 'loadEvents'),
      where('vehicleId', '==', vehicleId)
    );

    if (status) {
      q = query(q, where('status', '==', status));
    }

    q = query(q, orderBy('loadDate', 'desc'));

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      loadDate: doc.data().loadDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting load events by vehicle:', error);
    throw error;
  }
};

/**
 * Update a load event
 * @param {string} loadEventId - Load event document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateLoadEvent = async (loadEventId, updates) => {
  try {
    const docRef = doc(db, 'loadEvents', loadEventId);
    
    // Convert date if present
    if (updates.loadDate && !(updates.loadDate instanceof Timestamp)) {
      updates.loadDate = updates.loadDate instanceof Date
        ? Timestamp.fromDate(updates.loadDate)
        : Timestamp.fromDate(new Date(updates.loadDate));
    }

    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating load event:', error);
    throw error;
  }
};

/**
 * Mark a load event as completed
 * @param {string} loadEventId - Load event document ID
 * @returns {Promise<void>}
 */
export const completeLoadEvent = async (loadEventId) => {
  try {
    const docRef = doc(db, 'loadEvents', loadEventId);
    await updateDoc(docRef, {
      status: 'completed',
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error completing load event:', error);
    throw error;
  }
};

/**
 * Cancel a load event
 * @param {string} loadEventId - Load event document ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<void>}
 */
export const cancelLoadEvent = async (loadEventId, reason = '') => {
  try {
    const docRef = doc(db, 'loadEvents', loadEventId);
    await updateDoc(docRef, {
      status: 'cancelled',
      cancellationReason: reason,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error cancelling load event:', error);
    throw error;
  }
};

/**
 * Delete a load event
 * @param {string} loadEventId - Load event document ID
 * @returns {Promise<void>}
 */
export const deleteLoadEvent = async (loadEventId) => {
  try {
    const docRef = doc(db, 'loadEvents', loadEventId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting load event:', error);
    throw error;
  }
};

/**
 * Validate tank readings
 * @param {number} before - Tank reading before loading
 * @param {number} quantity - Load quantity
 * @param {number} after - Tank reading after loading
 * @returns {Object} Validation result { valid: boolean, message: string, variance: number }
 */
export const validateTankReadings = (before, quantity, after) => {
  const expected = before + quantity;
  const variance = Math.abs(after - expected);
  const variancePercentage = (variance / quantity) * 100;
  const tolerance = quantity * 0.005; // 0.5%

  if (after < before) {
    return {
      valid: false,
      message: 'Tank reading after must be greater than or equal to reading before',
      variance,
      variancePercentage
    };
  }

  if (variance > tolerance) {
    return {
      valid: false,
      message: `Tank reading variance detected: Expected ${expected.toFixed(2)}, got ${after.toFixed(2)} (${variancePercentage.toFixed(2)}% difference)`,
      variance,
      variancePercentage
    };
  }

  return {
    valid: true,
    message: 'Tank readings are valid',
    variance,
    variancePercentage
  };
};
