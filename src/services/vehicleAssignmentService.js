import { 
  collection, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where,
  orderBy,
  limit,
  Timestamp,
  doc
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Vehicle Assignment Service
 * Manages vehicle assignments to drivers with history tracking
 */

/**
 * Assign a vehicle to a driver
 * @param {string} companyId - Company ID
 * @param {string} vehicleId - Vehicle ID
 * @param {string} driverId - Driver/User ID
 * @param {string} assignedBy - Admin/Manager who made the assignment
 * @returns {Promise<string>} - Assignment ID
 */
export const assignVehicleToDriver = async (companyId, vehicleId, driverId, assignedBy) => {
  try {
    // End any current assignment for this driver
    await endCurrentAssignment(driverId);
    
    // End any current assignment for this vehicle
    await endVehicleCurrentAssignment(vehicleId);
    
    // Create new assignment
    const docRef = await addDoc(collection(db, 'vehicleAssignments'), {
      companyId,
      vehicleId,
      driverId,
      assignedBy,
      startDate: Timestamp.now(),
      endDate: null,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log('✅ Vehicle assigned:', { vehicleId, driverId, assignmentId: docRef.id });
    return docRef.id;
  } catch (error) {
    console.error('Error assigning vehicle:', error);
    throw error;
  }
};

/**
 * Unassign a vehicle from a driver
 * @param {string} driverId - Driver/User ID
 * @returns {Promise<void>}
 */
export const unassignVehicleFromDriver = async (driverId) => {
  try {
    await endCurrentAssignment(driverId);
    console.log('✅ Vehicle unassigned from driver:', driverId);
  } catch (error) {
    console.error('Error unassigning vehicle:', error);
    throw error;
  }
};

/**
 * End current assignment for a driver
 * @param {string} driverId - Driver/User ID
 * @returns {Promise<void>}
 */
const endCurrentAssignment = async (driverId) => {
  try {
    const q = query(
      collection(db, 'vehicleAssignments'),
      where('driverId', '==', driverId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    for (const docSnapshot of snapshot.docs) {
      await updateDoc(doc(db, 'vehicleAssignments', docSnapshot.id), {
        endDate: Timestamp.now(),
        isActive: false,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Error ending current assignment:', error);
    throw error;
  }
};

/**
 * End current assignment for a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @returns {Promise<void>}
 */
const endVehicleCurrentAssignment = async (vehicleId) => {
  try {
    const q = query(
      collection(db, 'vehicleAssignments'),
      where('vehicleId', '==', vehicleId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    for (const docSnapshot of snapshot.docs) {
      await updateDoc(doc(db, 'vehicleAssignments', docSnapshot.id), {
        endDate: Timestamp.now(),
        isActive: false,
        updatedAt: Timestamp.now(),
      });
    }
  } catch (error) {
    console.error('Error ending vehicle current assignment:', error);
    throw error;
  }
};

/**
 * Get current vehicle assignment for a driver
 * @param {string} driverId - Driver/User ID
 * @returns {Promise<Object|null>} - Current assignment or null
 */
export const getCurrentAssignment = async (driverId) => {
  try {
    const q = query(
      collection(db, 'vehicleAssignments'),
      where('driverId', '==', driverId),
      where('isActive', '==', true),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error getting current assignment:', error);
    throw error;
  }
};

/**
 * Get assignment history for a driver
 * @param {string} driverId - Driver/User ID
 * @returns {Promise<Array>} - Array of assignments
 */
export const getDriverAssignmentHistory = async (driverId) => {
  try {
    const q = query(
      collection(db, 'vehicleAssignments'),
      where('driverId', '==', driverId),
      orderBy('startDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting driver assignment history:', error);
    throw error;
  }
};

/**
 * Get all active assignments for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} - Array of active assignments
 */
export const getActiveAssignments = async (companyId) => {
  try {
    const q = query(
      collection(db, 'vehicleAssignments'),
      where('companyId', '==', companyId),
      where('isActive', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting active assignments:', error);
    throw error;
  }
};

/**
 * Get current driver for a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @returns {Promise<Object|null>} - Current assignment or null
 */
export const getVehicleCurrentDriver = async (vehicleId) => {
  try {
    const q = query(
      collection(db, 'vehicleAssignments'),
      where('vehicleId', '==', vehicleId),
      where('isActive', '==', true),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error getting vehicle current driver:', error);
    throw error;
  }
};
