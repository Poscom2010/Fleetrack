import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase";
import {
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "../services/vehicleService";

/**
 * Custom hook to manage vehicles with real-time updates
 * @param {string} userId - The user ID
 * @param {string} companyId - The company ID (for admins/managers)
 * @param {string} userRole - The user's role
 * @returns {Object} Vehicles state and CRUD operations
 */
export const useVehicles = (userId, companyId = null, userRole = null) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    Promise.resolve().then(() => {
      setLoading(true);
      setError(null);
    });

    // Admins and managers see all company vehicles, drivers see only their assigned vehicles
    const isAdminOrManager = userRole === 'company_admin' || userRole === 'company_manager';
    
    // Set up real-time listener for vehicles collection
    const q = isAdminOrManager && companyId
      ? query(collection(db, "vehicles"), where("companyId", "==", companyId))
      : query(collection(db, "vehicles"), where("userId", "==", userId));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const vehiclesData = [];
        querySnapshot.forEach((doc) => {
          vehiclesData.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        vehiclesData.sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.getTime ? a.createdAt.getTime() : 0);
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.getTime ? b.createdAt.getTime() : 0);
          return bTime - aTime;
        });
        setVehicles(vehiclesData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching vehicles:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [userId, companyId, userRole]);

  useEffect(() => {
    if (userId) {
      return;
    }
    Promise.resolve().then(() => {
      setVehicles([]);
      setLoading(false);
    });
  }, [userId]);

  /**
   * Add a new vehicle
   * @param {Object} vehicleData - Vehicle data
   * @param {string} companyId - Optional company ID for multi-tenant
   * @returns {Promise<string>} The created vehicle's ID
   */
  const addVehicle = async (vehicleData, companyId = null) => {
    try {
      const vehicleId = await createVehicle(userId, companyId, vehicleData);
      return vehicleId;
    } catch (err) {
      console.error("Error adding vehicle:", err);
      throw err;
    }
  };

  /**
   * Update an existing vehicle
   * @param {string} vehicleId - The vehicle's ID
   * @param {Object} vehicleData - Updated vehicle data
   * @returns {Promise<void>}
   */
  const editVehicle = async (vehicleId, vehicleData) => {
    try {
      await updateVehicle(userId, vehicleId, vehicleData);
    } catch (err) {
      console.error("Error updating vehicle:", err);
      throw err;
    }
  };

  /**
   * Delete a vehicle
   * @param {string} vehicleId - The vehicle's ID
   * @returns {Promise<void>}
   */
  const removeVehicle = async (vehicleId) => {
    try {
      await deleteVehicle(vehicleId);
    } catch (err) {
      console.error("Error deleting vehicle:", err);
      throw err;
    }
  };

  return {
    vehicles,
    loading,
    error,
    addVehicle,
    editVehicle,
    removeVehicle,
  };
};
