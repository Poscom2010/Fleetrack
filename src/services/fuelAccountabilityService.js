/**
 * Fuel Accountability Service
 * 
 * MISSION-CRITICAL: Track every litre/kg of fuel with 100% accuracy
 * 
 * This service ensures:
 * 1. No fuel goes missing between load cycles
 * 2. Tank readings are validated against previous offload
 * 3. Discrepancies are flagged immediately
 * 4. Complete audit trail for all fuel movements
 * 
 * BUSINESS RULES:
 * - Last offload's tankReadingAfter MUST match next load's tankReadingBefore
 * - If they don't match → Flag as CRITICAL DISCREPANCY
 * - Track cumulative fuel loaded, offloaded, and remaining
 * - Prevent fuel theft by detecting unexplained losses
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  doc,
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get the last offload event for a vehicle
 * This tells us what fuel should be in the tank NOW
 * 
 * @param {string} vehicleId - Vehicle ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object|null>} Last offload event or null
 */
export const getLastOffloadForVehicle = async (vehicleId, companyId) => {
  try {
    if (!vehicleId || !companyId) {
      console.warn('⚠️ vehicleId and companyId required');
      return null;
    }

    // Get the most recent offload for this vehicle
    const offloadsQuery = query(
      collection(db, 'offloadEvents'),
      where('companyId', '==', companyId),
      where('vehicleId', '==', vehicleId),
      orderBy('offloadDate', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(offloadsQuery);
    
    if (snapshot.empty) {
      return null;
    }

    const lastOffload = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
      offloadDate: snapshot.docs[0].data().offloadDate?.toDate()
    };

    return lastOffload;
  } catch (error) {
    console.error('❌ Error getting last offload:', error);
    return null;
  }
};

/**
 * Get expected tank reading before new load
 * This is the fuel that SHOULD be in the tank based on last offload
 * 
 * @param {string} vehicleId - Vehicle ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Expected tank status
 */
export const getExpectedTankReading = async (vehicleId, companyId) => {
  try {
    const lastOffload = await getLastOffloadForVehicle(vehicleId, companyId);

    if (!lastOffload) {
      return {
        hasHistory: false,
        expectedReading: 0,
        lastOffloadDate: null,
        lastCustomer: null,
        message: 'No previous offload history. This is the first load for this vehicle.',
        status: 'new_vehicle'
      };
    }

    // The fuel left in tank after last offload
    const expectedReading = lastOffload.tankReadingAfter || 0;
    const unit = lastOffload.unit || 'L';

    return {
      hasHistory: true,
      expectedReading,
      unit,
      lastOffloadDate: lastOffload.offloadDate,
      lastCustomer: lastOffload.customer,
      lastOffloadId: lastOffload.id,
      loadEventId: lastOffload.loadEventId,
      message: `Expected ${expectedReading.toLocaleString()} ${unit} in tank (from last delivery on ${lastOffload.offloadDate?.toLocaleDateString('en-ZA')})`,
      status: 'has_history'
    };
  } catch (error) {
    console.error('❌ Error getting expected tank reading:', error);
    return {
      hasHistory: false,
      expectedReading: 0,
      message: 'Error retrieving tank history',
      status: 'error'
    };
  }
};

/**
 * Validate tank reading before new load
 * CRITICAL: Detects fuel theft, leaks, or data entry errors
 * 
 * @param {string} vehicleId - Vehicle ID
 * @param {string} companyId - Company ID
 * @param {number} actualTankReading - What user entered as tank reading before load
 * @returns {Promise<Object>} Validation result with discrepancy details
 */
export const validateTankReadingBeforeLoad = async (vehicleId, companyId, actualTankReading) => {
  try {
    const expected = await getExpectedTankReading(vehicleId, companyId);

    if (!expected.hasHistory) {
      // First load for this vehicle - no validation needed
      return {
        isValid: true,
        hasDiscrepancy: false,
        severity: 'none',
        message: 'First load for this vehicle - no previous data to validate against.',
        expectedReading: 0,
        actualReading: actualTankReading,
        difference: 0
      };
    }

    const expectedReading = expected.expectedReading;
    const difference = actualTankReading - expectedReading;
    const differenceAbs = Math.abs(difference);
    const unit = expected.unit || 'L';

    // Determine severity based on difference
    let severity = 'none';
    let isValid = true;
    let hasDiscrepancy = false;
    let message = '';
    let requiresNotes = false;
    let requiresInvestigation = false;

    if (differenceAbs === 0) {
      // PERFECT MATCH
      severity = 'none';
      isValid = true;
      hasDiscrepancy = false;
      message = `✅ Perfect match! Tank reading matches expected ${expectedReading.toLocaleString()} ${unit} from last delivery.`;
    } else if (differenceAbs <= 3) {
      // VERY MINOR - Acceptable (evaporation, measurement tolerance)
      severity = 'very_minor';
      isValid = true;
      hasDiscrepancy = true;
      requiresNotes = false;
      message = `ℹ️ Very minor difference: ${differenceAbs.toFixed(2)} ${unit}. Within acceptable tolerance (≤3${unit}).`;
    } else if (differenceAbs <= 50) {
      // MINOR DISCREPANCY - Requires explanation
      severity = 'minor';
      isValid = false;
      hasDiscrepancy = true;
      requiresNotes = true;
      message = `⚠️ Minor discrepancy detected: ${differenceAbs.toFixed(2)} ${unit} ${difference > 0 ? 'MORE' : 'LESS'} than expected. Please explain.`;
    } else {
      // MAJOR DISCREPANCY - Requires investigation
      severity = 'major';
      isValid = false;
      hasDiscrepancy = true;
      requiresNotes = true;
      requiresInvestigation = true;
      message = `🔴 MAJOR DISCREPANCY: ${differenceAbs.toFixed(2)} ${unit} ${difference > 0 ? 'MORE' : 'LESS'} than expected! Investigation required.`;
    }

    // Additional context
    let explanation = '';
    if (difference > 0) {
      explanation = `Tank has ${difference.toFixed(2)} ${unit} MORE fuel than expected. Possible causes: Fuel added without recording, measurement error, or data entry mistake.`;
    } else if (difference < 0) {
      explanation = `Tank has ${Math.abs(difference).toFixed(2)} ${unit} LESS fuel than expected. Possible causes: Fuel theft, leak, evaporation, or incorrect last offload reading.`;
    }

    return {
      isValid,
      hasDiscrepancy,
      severity,
      message,
      explanation,
      requiresNotes,
      requiresInvestigation,
      expectedReading,
      actualReading: actualTankReading,
      difference,
      differenceAbs,
      unit,
      lastOffloadDate: expected.lastOffloadDate,
      lastCustomer: expected.lastCustomer,
      percentageDifference: expectedReading > 0 ? (differenceAbs / expectedReading) * 100 : 0
    };
  } catch (error) {
    console.error('❌ Error validating tank reading:', error);
    return {
      isValid: false,
      hasDiscrepancy: false,
      severity: 'error',
      message: 'Error validating tank reading. Please try again.',
      expectedReading: 0,
      actualReading: actualTankReading,
      difference: 0
    };
  }
};

/**
 * Get vehicle fuel history summary
 * Shows complete accountability for all fuel movements
 * 
 * @param {string} vehicleId - Vehicle ID
 * @param {string} companyId - Company ID
 * @param {number} days - Number of days to look back (default 30)
 * @returns {Promise<Object>} Fuel history summary
 */
export const getVehicleFuelHistory = async (vehicleId, companyId, days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all load events for this vehicle
    const loadsQuery = query(
      collection(db, 'loadEvents'),
      where('companyId', '==', companyId),
      where('vehicleId', '==', vehicleId),
      where('loadDate', '>=', Timestamp.fromDate(startDate)),
      orderBy('loadDate', 'desc')
    );

    const loadsSnapshot = await getDocs(loadsQuery);
    const loads = loadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      loadDate: doc.data().loadDate?.toDate()
    }));

    // Get all offload events for this vehicle
    const offloadsQuery = query(
      collection(db, 'offloadEvents'),
      where('companyId', '==', companyId),
      where('vehicleId', '==', vehicleId),
      where('offloadDate', '>=', Timestamp.fromDate(startDate)),
      orderBy('offloadDate', 'desc')
    );

    const offloadsSnapshot = await getDocs(offloadsQuery);
    const offloads = offloadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      offloadDate: doc.data().offloadDate?.toDate()
    }));

    // Calculate totals
    const totalLoaded = loads.reduce((sum, load) => sum + (load.loadQuantity || 0), 0);
    const totalOffloaded = offloads.reduce((sum, offload) => sum + (offload.offloadQuantity || 0), 0);
    const totalVariance = offloads.reduce((sum, offload) => sum + Math.abs(offload.variance || 0), 0);

    // Get current tank status
    const currentStatus = await getExpectedTankReading(vehicleId, companyId);

    return {
      vehicleId,
      period: {
        days,
        startDate,
        endDate: new Date()
      },
      loads: {
        count: loads.length,
        totalQuantity: totalLoaded,
        events: loads
      },
      offloads: {
        count: offloads.length,
        totalQuantity: totalOffloaded,
        events: offloads
      },
      variance: {
        total: totalVariance,
        average: offloads.length > 0 ? totalVariance / offloads.length : 0
      },
      currentTankStatus: currentStatus,
      accountability: {
        loaded: totalLoaded,
        offloaded: totalOffloaded,
        variance: totalVariance,
        currentInTank: currentStatus.expectedReading,
        accountedFor: totalOffloaded + currentStatus.expectedReading,
        unaccountedFor: totalLoaded - (totalOffloaded + currentStatus.expectedReading + totalVariance),
        percentageAccountedFor: totalLoaded > 0 
          ? ((totalOffloaded + currentStatus.expectedReading) / totalLoaded) * 100 
          : 0
      }
    };
  } catch (error) {
    console.error('❌ Error getting vehicle fuel history:', error);
    return null;
  }
};

/**
 * Check if load event is fully offloaded
 * 
 * @param {string} loadEventId - Load event ID
 * @returns {Promise<Object>} Offload status
 */
export const checkLoadOffloadStatus = async (loadEventId) => {
  try {
    // Get load event
    const loadRef = doc(db, 'loadEvents', loadEventId);
    const loadSnap = await getDoc(loadRef);

    if (!loadSnap.exists()) {
      return null;
    }

    const loadEvent = { id: loadSnap.id, ...loadSnap.data() };
    const loadedQuantity = loadEvent.loadQuantity || 0;

    // Get all offloads for this load
    const offloadsQuery = query(
      collection(db, 'offloadEvents'),
      where('loadEventId', '==', loadEventId),
      orderBy('sequenceNumber', 'asc')
    );

    const offloadsSnapshot = await getDocs(offloadsQuery);
    const offloads = offloadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const totalOffloaded = offloads.reduce((sum, o) => sum + (o.offloadQuantity || 0), 0);
    const remaining = offloads.length > 0 
      ? offloads[offloads.length - 1].tankReadingAfter 
      : loadedQuantity;

    const isFullyOffloaded = remaining <= 3; // Within 3L/kg tolerance
    const percentageOffloaded = loadedQuantity > 0 ? (totalOffloaded / loadedQuantity) * 100 : 0;

    return {
      loadEventId,
      loadedQuantity,
      totalOffloaded,
      remaining,
      isFullyOffloaded,
      percentageOffloaded,
      offloadCount: offloads.length,
      status: loadEvent.status,
      unit: loadEvent.unit || 'L'
    };
  } catch (error) {
    console.error('❌ Error checking load offload status:', error);
    return null;
  }
};

/**
 * Get discrepancy reasons for dropdown
 * Categorized by scenario
 */
export const getDiscrepancyReasons = () => {
  return {
    normal: [
      { value: 'leftInTank', label: 'Left in Tank (Fuel Remaining)', icon: '📦' },
      { value: 'evaporation', label: 'Evaporation (Natural Loss)', icon: '💨' },
      { value: 'temperatureVariation', label: 'Temperature Variation', icon: '🌡️' }
    ],
    operational: [
      { value: 'spillage', label: 'Spillage During Transfer', icon: '💧' },
      { value: 'meterError', label: 'Meter Reading Error', icon: '📊' },
      { value: 'customerMeterError', label: 'Customer Meter Error', icon: '🏢' }
    ],
    critical: [
      { value: 'theft', label: 'Theft/Pilferage', icon: '🚨' },
      { value: 'leak', label: 'Tank Leak', icon: '⚠️' },
      { value: 'unauthorized', label: 'Unauthorized Removal', icon: '🔒' }
    ],
    other: [
      { value: 'other', label: 'Other (Specify in Notes)', icon: '📝' }
    ]
  };
};

export default {
  getLastOffloadForVehicle,
  getExpectedTankReading,
  validateTankReadingBeforeLoad,
  getVehicleFuelHistory,
  checkLoadOffloadStatus,
  getDiscrepancyReasons
};
