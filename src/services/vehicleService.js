import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

const VEHICLES_COLLECTION = "vehicles";

/**
 * Create a new vehicle
 * @param {string} userId - The authenticated user's ID
 * @param {string} companyId - The company ID (optional for backward compatibility)
 * @param {Object} vehicleData - Vehicle data
 * @param {string} vehicleData.name - Vehicle name
 * @param {string} vehicleData.registrationNumber - Registration number
 * @param {string} vehicleData.model - Vehicle model
 * @param {number} vehicleData.year - Vehicle year
 * @param {number} vehicleData.serviceAlertThreshold - Service alert threshold in km
 * @returns {Promise<string>} The created vehicle's ID
 */
export const createVehicle = async (userId, companyId, vehicleData) => {
  try {
    const vehicleRef = await addDoc(collection(db, VEHICLES_COLLECTION), {
      userId,
      companyId: companyId || null,
      name: vehicleData.name,
      registrationNumber: vehicleData.registrationNumber,
      model: vehicleData.model,
      year: vehicleData.year,
      serviceAlertThreshold: vehicleData.serviceAlertThreshold || 5000,
      lastServiceMileage: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return vehicleRef.id;
  } catch (error) {
    console.error("Error creating vehicle:", error);
    throw error;
  }
};

/**
 * Get all vehicles for a user (assigned vehicles for drivers)
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of vehicle objects with IDs
 */
export const getVehicles = async (userId) => {
  try {
    const q = query(
      collection(db, VEHICLES_COLLECTION),
      where("userId", "==", userId)
    );
    const querySnapshot = await getDocs(q);
    const vehicles = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      vehicles.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      });
    });
    // Sort client-side by createdAt descending
    vehicles.sort((a, b) => {
      const aTime = a.createdAt?.getTime ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt?.getTime ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });
    return vehicles;
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    throw error;
  }
};

/**
 * Get all vehicles for a company (for admins/managers)
 * @param {string} companyId - The company ID
 * @returns {Promise<Array>} Array of vehicle objects with IDs
 */
export const getCompanyVehicles = async (companyId) => {
  try {
    const q = query(
      collection(db, VEHICLES_COLLECTION),
      where("companyId", "==", companyId)
    );
    const querySnapshot = await getDocs(q);
    const vehicles = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      vehicles.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
      });
    });
    // Sort client-side by createdAt descending
    vehicles.sort((a, b) => {
      const aTime = a.createdAt?.getTime ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt?.getTime ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });
    return vehicles;
  } catch (error) {
    console.error("Error fetching company vehicles:", error);
    throw error;
  }
};

/**
 * Get a single vehicle by ID
 * @param {string} vehicleId - The vehicle's ID
 * @returns {Promise<Object|null>} Vehicle object or null if not found
 */
export const getVehicle = async (vehicleId) => {
  try {
    const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);
    const vehicleSnap = await getDoc(vehicleRef);

    if (vehicleSnap.exists()) {
      return {
        id: vehicleSnap.id,
        ...vehicleSnap.data(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    throw error;
  }
};

/**
 * Update a vehicle
 * @param {string} userId - The user's ID (for permission validation)
 * @param {string} vehicleId - The vehicle's ID
 * @param {Object} vehicleData - Updated vehicle data
 * @returns {Promise<void>}
 */
export const updateVehicle = async (userId, vehicleId, vehicleData) => {
  try {
    const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);
    
    // Update directly with userId - Firestore rules will verify ownership
    const updatePayload = {
      ...vehicleData,
      userId: userId, // Include userId to satisfy Firestore rules
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(vehicleRef, updatePayload);
  } catch (error) {
    console.error("Error updating vehicle:", error);
    throw error;
  }
};

/**
 * Delete a vehicle
 * @param {string} vehicleId - The vehicle's ID
 * @returns {Promise<void>}
 */
export const deleteVehicle = async (vehicleId) => {
  try {
    const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);
    await deleteDoc(vehicleRef);
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    throw error;
  }
};
