import { collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const SERVICE_RECORDS_COLLECTION = 'serviceRecords';
const VEHICLES_COLLECTION = 'vehicles';

/**
 * Calculate service status for a vehicle using service counter
 * @param {number} currentMileage - Current cumulative vehicle mileage
 * @param {number} lastServiceMileage - Mileage when last serviced (counter reset point)
 * @param {number} serviceInterval - Service interval in km
 * @returns {Object} Service status with details
 */
export const calculateServiceStatus = (currentMileage, lastServiceMileage = 0, serviceInterval = 5000) => {
  if (!serviceInterval || serviceInterval <= 0) {
    // If no service interval set, return not configured
    return {
      status: 'not_set',
      message: 'Service interval not set',
      color: 'gray',
      urgency: 0,
      mileageSinceService: 0,
      mileageUntilService: 0,
      serviceInterval: 0,
      percentageUsed: 0,
      isDue: false,
      isOverdue: false,
      isCritical: false
    };
  }

  // SERVICE COUNTER: Mileage since last service (resets after each service)
  const mileageSinceService = currentMileage - lastServiceMileage;
  
  // How much mileage remaining until service is due
  const mileageUntilService = serviceInterval - mileageSinceService;
  
  // Percentage of service interval used
  const percentageUsed = Math.min(100, Math.max(0, (mileageSinceService / serviceInterval) * 100));

  // Service status levels
  let status = 'ok'; // ok, warning, overdue, critical
  let message = 'Service OK';
  let color = 'green';
  let urgency = 0; // 0-100, higher is more urgent

  if (mileageUntilService <= 0) {
    // Service is overdue
    status = 'critical';
    message = `Service OVERDUE by ${Math.abs(mileageUntilService).toLocaleString()} km`;
    color = 'red';
    urgency = 100;
  } else if (mileageUntilService <= 500) {
    // Critical: Less than 500km until service
    status = 'critical';
    message = `Service DUE in ${mileageUntilService.toLocaleString()} km - Schedule NOW!`;
    color = 'red';
    urgency = 90;
  } else if (mileageUntilService <= 1000) {
    // Warning: 500-1000km until service
    status = 'warning';
    message = `Service due in ${mileageUntilService.toLocaleString()} km`;
    color = 'amber';
    urgency = 70;
  } else if (mileageUntilService <= 2000) {
    // Approaching: 1000-2000km until service
    status = 'approaching';
    message = `${mileageUntilService.toLocaleString()} km until next service`;
    color = 'yellow';
    urgency = 40;
  } else {
    // OK: More than 2000km until service
    status = 'ok';
    message = `Service OK - ${mileageUntilService.toLocaleString()} km remaining`;
    color = 'green';
    urgency = Math.max(0, percentageUsed - 50); // Starts at 50% usage
  }

  return {
    status,
    message,
    color,
    urgency,
    mileageSinceService,        // Counter: km since last service
    mileageUntilService,        // Remaining km until service
    serviceInterval,            // Service interval (e.g., 5000 km)
    percentageUsed: Math.round(percentageUsed),
    isDue: mileageUntilService <= 1000,
    isOverdue: mileageUntilService <= 0,
    isCritical: mileageUntilService <= 500
  };
};

/**
 * Record a service completion and RESET the service counter
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} serviceData - Service details
 * @returns {Promise<string>} Service record ID
 */
export const recordService = async (vehicleId, serviceData) => {
  try {
    const {
      mileage,
      serviceType = 'Regular Service',
      cost = 0,
      description = '',
      performedBy = '',
      date = new Date()
    } = serviceData;

    if (!mileage || mileage <= 0) {
      throw new Error('Service mileage is required');
    }

    // Create service record
    const serviceRecord = {
      vehicleId,
      mileage: parseFloat(mileage),
      serviceType,
      cost: parseFloat(cost) || 0,
      description,
      performedBy,
      date: date instanceof Date ? Timestamp.fromDate(date) : Timestamp.fromDate(new Date(date)),
      createdAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, SERVICE_RECORDS_COLLECTION), serviceRecord);

    // RESET SERVICE COUNTER: Update lastServiceMileage to current cumulative mileage
    // This resets the counter to 0 for tracking next service
    await updateDoc(doc(db, VEHICLES_COLLECTION, vehicleId), {
      lastServiceMileage: parseFloat(mileage),  // COUNTER RESET POINT
      lastServiceDate: serviceRecord.date,
      updatedAt: Timestamp.now()
    });

    console.log('✅ Service recorded and counter reset:', docRef.id);
    console.log(`🔄 Service counter reset at ${mileage} km`);
    return docRef.id;
  } catch (error) {
    console.error('Error recording service:', error);
    throw new Error(`Failed to record service: ${error.message}`);
  }
};

/**
 * Get service history for a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @param {number} limitCount - Maximum number of records to return
 * @returns {Promise<Array>} Service records
 */
export const getServiceHistory = async (vehicleId, limitCount = 10) => {
  try {
    const q = query(
      collection(db, SERVICE_RECORDS_COLLECTION),
      where('vehicleId', '==', vehicleId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() || new Date()
    }));
  } catch (error) {
    console.error('Error fetching service history:', error);
    return [];
  }
};

/**
 * Get last service record for a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @returns {Promise<Object|null>} Last service record or null
 */
export const getLastService = async (vehicleId) => {
  try {
    const records = await getServiceHistory(vehicleId, 1);
    return records.length > 0 ? records[0] : null;
  } catch (error) {
    console.error('Error fetching last service:', error);
    return null;
  }
};

/**
 * Get vehicles due for service
 * @param {string} companyId - Company ID
 * @param {Array} vehicles - Array of vehicle objects with mileage data
 * @returns {Array} Vehicles that need service
 */
export const getVehiclesDueForService = (vehicles) => {
  return vehicles
    .map(vehicle => {
      const currentMileage = vehicle.currentMileage || 0;
      const lastServiceMileage = vehicle.lastServiceMileage || 0;
      const serviceInterval = vehicle.serviceInterval || 5000;

      const serviceStatus = calculateServiceStatus(
        currentMileage,
        lastServiceMileage,
        serviceInterval
      );

      return {
        ...vehicle,
        serviceStatus
      };
    })
    .filter(vehicle => vehicle.serviceStatus.isDue)
    .sort((a, b) => b.serviceStatus.urgency - a.serviceStatus.urgency);
};
