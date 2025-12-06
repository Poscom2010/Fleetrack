/**
 * Offload Event Service
 * Handles CRUD operations for fuel delivery/offload events
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
import { calculateReconciliation } from './reconciliationService';
import { completeLoadEvent } from './loadEventService';

/**
 * Get running tank balance for a load event
 * Shows loaded, offloaded, and remaining fuel
 * @param {string} loadEventId - Load event ID
 * @returns {Promise<Object>} Running balance data
 */
export const getRunningTankBalance = async (loadEventId) => {
  try {
    // Get load event
    const loadEventRef = doc(db, 'loadEvents', loadEventId);
    const loadEventSnap = await getDoc(loadEventRef);
    
    if (!loadEventSnap.exists()) {
      return null;
    }
    
    const loadEvent = { id: loadEventSnap.id, ...loadEventSnap.data() };
    
    // Get all offloads
    const offloadsQuery = query(
      collection(db, 'offloadEvents'),
      where('loadEventId', '==', loadEventId),
      orderBy('sequenceNumber', 'asc')
    );
    const offloadsSnap = await getDocs(offloadsQuery);
    
    const offloads = offloadsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Calculate totals
    const loaded = loadEvent.loadQuantity || 0;
    const totalOffloaded = offloads.reduce((sum, o) => sum + (o.offloadQuantity || 0), 0);
    const remaining = offloads.length > 0 
      ? offloads[offloads.length - 1].tankReadingAfter 
      : loaded;
    
    return {
      loaded,
      totalOffloaded,
      remaining,
      offloadCount: offloads.length,
      status: loadEvent.status,
      percentageOffloaded: loaded > 0 ? (totalOffloaded / loaded) * 100 : 0
    };
  } catch (error) {
    console.error('❌ Error getting running tank balance:', error);
    return null;
  }
};

/**
 * Create a new offload event
 * @param {string} userId - ID of user creating the event
 * @param {string} companyId - Company ID
 * @param {Object} offloadData - Offload event data
 * @returns {Promise<string>} Document ID of created offload event
 */
export const createOffloadEvent = async (userId, companyId, offloadData) => {
  try {
    // ===== VALIDATION PHASE 1: Required Fields =====
    if (!userId) throw new Error('User ID is required');
    if (!companyId) throw new Error('Company ID is required');
    if (!offloadData) throw new Error('Offload data is required');
    if (!offloadData.loadEventId) throw new Error('Load event ID is required');
    
    // Check if this is a consolidated load offload
    const isConsolidatedOffload = !!offloadData.consolidatedLoad;
    
    // Validate numeric fields
    if (!offloadData.offloadQuantity || offloadData.offloadQuantity <= 0) {
      throw new Error('Offload quantity must be greater than 0');
    }
    if (offloadData.tankReadingBefore === undefined || offloadData.tankReadingBefore === null) {
      throw new Error('Tank reading before offload is required');
    }
    if (offloadData.tankReadingAfter === undefined || offloadData.tankReadingAfter === null) {
      throw new Error('Tank reading after offload is required');
    }
    if (!offloadData.offloadDate) {
      throw new Error('Offload date is required');
    }

    // ===== VALIDATION PHASE 2: Load Event Verification =====
    const loadEventRef = doc(db, 'loadEvents', offloadData.loadEventId);
    const loadEventSnap = await getDoc(loadEventRef);

    if (!loadEventSnap.exists()) {
      throw new Error('Load event not found');
    }

    const loadEvent = { id: loadEventSnap.id, ...loadEventSnap.data() };

    // Check if load event is already completed
    if (loadEvent.status === 'completed') {
      throw new Error('This load event has already been offloaded');
    }

    // Verify load event belongs to same company
    if (loadEvent.companyId !== companyId) {
      throw new Error('Load event does not belong to your company');
    }

    // ===== VALIDATION PHASE 3: Quantity Checks =====
    const offloadQty = Number(offloadData.offloadQuantity);
    const loadQty = Number(loadEvent.loadQuantity);

    if (isNaN(offloadQty)) {
      throw new Error('Invalid offload quantity');
    }

    // For consolidated loads, validate against total remaining, not individual load quantity
    if (isConsolidatedOffload) {
      const totalRemaining = offloadData.consolidatedLoad.totalRemaining;
      if (offloadQty > totalRemaining) {
        throw new Error(`Offload quantity (${offloadQty}L) cannot exceed total remaining fuel (${totalRemaining}L)`);
      }
    } else {
      // For single loads, validate against load quantity
      if (isNaN(loadQty)) {
        throw new Error('Invalid load quantity');
      }
      if (offloadQty > loadQty) {
        throw new Error(`Offload quantity (${offloadQty}L) cannot exceed load quantity (${loadQty}L)`);
      }
    }

    // ===== MULTI-CUSTOMER OFFLOAD: Check for existing offloads =====
    const existingOffloadsQuery = query(
      collection(db, 'offloadEvents'),
      where('loadEventId', '==', offloadData.loadEventId),
      orderBy('sequenceNumber', 'asc')
    );
    const existingOffloadsSnap = await getDocs(existingOffloadsQuery);
    
    // Calculate sequence number
    const existingOffloads = existingOffloadsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    const sequenceNumber = existingOffloads.length + 1;
    
    // Validate total offloaded doesn't exceed load (with 3L tolerance)
    // Skip this check for consolidated loads as we're validating against total remaining instead
    if (!isConsolidatedOffload) {
      const totalOffloaded = existingOffloads.reduce((sum, doc) => {
        return sum + (Number(doc.offloadQuantity) || 0);
      }, 0);
      
      if (totalOffloaded + offloadQty > loadQty + 3) {
        throw new Error(
          `Total offload (${(totalOffloaded + offloadQty).toFixed(2)}L) would exceed load quantity (${loadQty}L)`
        );
      }
    }
    
    // ===== TANK READING CHAIN VALIDATION (REMOVED) =====
    // NOTE: We don't enforce strict tank reading chain validation here because:
    // 1. Fuel might be used between deliveries (driving to depot, etc.)
    // 2. There might be legitimate discrepancies (evaporation, theft, etc.)
    // 3. The Load form already handles discrepancy tracking with accountability system
    // 4. Reconciliation service calculates and flags variances appropriately
    // 5. Users must explain discrepancies, but shouldn't be blocked from proceeding
    //
    // The reconciliation calculation will still detect and flag any discrepancies
    // for manager review, but won't prevent the offload from being recorded.

    // ===== VALIDATION PHASE 4: Tank Reading Logic =====
    const tankBefore = Number(offloadData.tankReadingBefore);
    const tankAfter = Number(offloadData.tankReadingAfter);

    if (isNaN(tankBefore) || isNaN(tankAfter)) {
      throw new Error('Invalid tank reading values');
    }

    if (tankBefore < 0 || tankAfter < 0) {
      throw new Error('Tank readings cannot be negative');
    }

    if (tankAfter > tankBefore) {
      throw new Error('Tank reading after offload cannot be greater than before');
    }

    const calculatedOffload = tankBefore - tankAfter;
    const variance = Math.abs(calculatedOffload - offloadQty);
    const variancePercentage = (variance / offloadQty) * 100;

    // Warn if variance is too high (but don't block)
    if (variancePercentage > 10) {
      console.warn(`High variance detected: ${variancePercentage.toFixed(2)}% difference between tank readings and offload quantity`);
    }

    // ===== VALIDATION PHASE 5: Date Validation =====
    const offloadDate = offloadData.offloadDate instanceof Date 
      ? offloadData.offloadDate 
      : new Date(offloadData.offloadDate);
    
    if (isNaN(offloadDate.getTime())) {
      throw new Error('Invalid offload date');
    }

    const loadDate = loadEvent.loadDate?.toDate ? loadEvent.loadDate.toDate() : new Date(loadEvent.loadDate);

    if (offloadDate < loadDate) {
      throw new Error('Offload date cannot be before load date');
    }

    // Check if offload date is not in the future
    const now = new Date();
    if (offloadDate > now) {
      throw new Error('Offload date cannot be in the future');
    }

    // ===== VALIDATION PHASE 6: Tank Reading Validation =====
    // For consolidated loads with multiple offloads, pass the previous offload
    // so validation compares against the last offload's tankReadingAfter, not the load's
    const previousOffload = existingOffloads.length > 0 
      ? existingOffloads[existingOffloads.length - 1] 
      : null;
    const { validateTankReadings } = await import('./reconciliationService');
    const tankValidation = validateTankReadings(loadEvent, offloadData, previousOffload);
    
    // Store tank validation results but DON'T block - allow capture with notes
    // Manager will be alerted about ALL variances > 3L (minor and major)
    // Only very_minor (≤3L) and matched (0L) are excluded from alerts
    const alertableErrors = tankValidation.errors.filter(error => {
      // Alert on ALL significant discrepancies:
      // 1. Impossible increases - ALWAYS alert
      // 2. Tank reading mismatch > 3L - alert (minor and major)
      // 3. Tank calculation error > 3L - alert (minor and major)
      // 4. Quantity mismatch > 3L - alert
      if (error.type === 'IMPOSSIBLE_INCREASE') return true;
      if (error.type === 'TANK_READING_MISMATCH' && error.difference > 3) return true;
      if (error.type === 'TANK_CALCULATION_ERROR' && error.difference > 3) return true;
      if (error.type === 'QUANTITY_TANK_MISMATCH' && error.difference > 3) return true;
      return false;
    });
    
    // Calculate reconciliation FIRST (needed for alert check)
    const reconciliation = calculateReconciliation(loadEvent, offloadData);
    
    // Also check reconciliation status - if minor_variance or major_variance, create alert
    const reconciliationNeedsAlert = reconciliation.reconciliationStatus === 'minor_variance' || 
                                      reconciliation.reconciliationStatus === 'major_variance';
    
    const hasTankDiscrepancy = alertableErrors.length > 0 || reconciliationNeedsAlert;
    const tankDiscrepancyDetails = alertableErrors.length > 0 
      ? alertableErrors.map(e => e.message).join('; ')
      : reconciliationNeedsAlert 
        ? `Variance detected: ${reconciliation.varianceAbs}L (${reconciliation.variancePercentage.toFixed(2)}%) - ${reconciliation.message}`
        : null;

    // Determine if this is the last offload (tank empty or explicitly marked)
    const isLastOffload = offloadData.isLastOffload || Number(offloadData.tankReadingAfter) === 0;
    
    // Fetch driver name to store with offload event (for easy display)
    let driverName = 'Driver';
    const driverId = loadEvent.driverId || userId;
    if (driverId) {
      try {
        const driverDoc = await getDoc(doc(db, 'users', driverId));
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          driverName = `${driverData.firstName || ''} ${driverData.lastName || ''}`.trim() || 'Driver';
        }
      } catch (error) {
        // If we can't fetch driver name, use default
        console.warn('Could not fetch driver name for offload:', error.message);
      }
    }
    
    // For consolidated loads, store all load IDs so trip log can show delivery for all
    const consolidatedLoadIds = isConsolidatedOffload && offloadData.consolidatedLoad?.loads
      ? offloadData.consolidatedLoad.loads.map(load => load.id)
      : [offloadData.loadEventId];
    
    // Prepare document data
    const docData = {
      loadEventId: offloadData.loadEventId,
      consolidatedLoadIds, // Array of all load IDs this offload applies to
      isConsolidatedOffload,
      companyId,
      vehicleId: loadEvent.vehicleId,
      driverId, // Copy driver ID from load event
      driverName, // Store driver name for easy display
      
      // Multi-customer offload tracking
      sequenceNumber,
      isLastOffload,
      
      offloadDate: Timestamp.fromDate(offloadDate),
      customer: offloadData.customer || '',
      customerLocation: offloadData.customerLocation || {},
      // Store odometer as mileageAtOffload for getLastRecordedMileage compatibility
      mileageAtOffload: offloadData.odometerReading ? Number(offloadData.odometerReading) : (offloadData.mileageAtOffload ? Number(offloadData.mileageAtOffload) : null),
      odometerReading: offloadData.odometerReading ? Number(offloadData.odometerReading) : null,
      // Calculate distance to customer for analytics
      // Uses mileageAtLoad (at supplier) if available, else startingMileage
      distanceToCustomer: (() => {
        const odometerAtCustomer = offloadData.odometerReading ? Number(offloadData.odometerReading) : null;
        const previousMileage = loadEvent.mileageAtLoad || loadEvent.startingMileage || null;
        if (odometerAtCustomer && previousMileage) {
          return odometerAtCustomer - previousMileage;
        }
        return null;
      })(),
      tankReadingBefore: Number(offloadData.tankReadingBefore),
      offloadQuantity: Number(offloadData.offloadQuantity),
      tankReadingAfter: Number(offloadData.tankReadingAfter),
      docketNumber: offloadData.docketNumber || '',
      customerSignature: offloadData.customerSignature || '',
      customerSignatureUrl: offloadData.customerSignatureUrl || null,
      deliveryPhotoUrls: offloadData.deliveryPhotoUrls || [],
      discrepancyType: offloadData.discrepancyType || 'none',
      discrepancyNotes: offloadData.discrepancyNotes || '',
      
      // Reconciliation data
      variance: reconciliation.variance,
      variancePercentage: reconciliation.variancePercentage,
      reconciliationStatus: reconciliation.reconciliationStatus,
      autoApproved: reconciliation.autoApproved,
      
      // Tank discrepancy tracking
      hasTankDiscrepancy,
      tankDiscrepancyDetails,
      tankDiscrepancyAcknowledged: false, // Manager needs to acknowledge
      
      // Return trip tracking
      hasReturnTrip: false, // Will be updated when return trip is captured
      returnTripId: null,
      
      // Delivery status
      deliveryStatus: offloadData.deliveryStatus || 'delivered', // delivered, in_transit, pending
      
      // Investigation fields (initially null)
      investigatedBy: null,
      investigationNotes: '',
      resolution: '',
      rootCause: '',
      resolvedAt: null,
      
      notes: offloadData.notes || '',
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'offloadEvents'), docData);

    // CRITICAL: Update vehicle's current odometer if mileage was recorded
    if (offloadData.odometerReading && offloadData.odometerReading > 0) {
      try {
        const vehicleRef = doc(db, 'vehicles', loadEvent.vehicleId);
        await updateDoc(vehicleRef, {
          currentOdometer: Number(offloadData.odometerReading),
          currentMileage: Number(offloadData.odometerReading),  // Also update currentMileage for UI compatibility
          lastOdometerUpdate: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        console.log(`✅ Vehicle odometer updated to ${offloadData.odometerReading} km`);
      } catch (error) {
        console.error('Error updating vehicle odometer:', error);
        // Don't fail the entire offload if odometer update fails
      }
    }

    // Mark load event(s) as completed ONLY if this is the last offload
    if (isLastOffload) {
      // For consolidated loads, mark ALL loads as completed
      if (isConsolidatedOffload && offloadData.consolidatedLoad?.loads) {
        console.log(`🔄 Completing all ${offloadData.consolidatedLoad.loads.length} consolidated loads...`);
        for (const load of offloadData.consolidatedLoad.loads) {
          try {
            await completeLoadEvent(load.id);
            console.log(`✅ Load event ${load.id} marked as completed (consolidated offload)`);
          } catch (loadError) {
            console.error(`Error completing load ${load.id}:`, loadError);
          }
        }
      } else {
        // Single load - complete just this one
        await completeLoadEvent(offloadData.loadEventId);
        console.log(`✅ Load event ${offloadData.loadEventId} marked as completed (final offload)`);
      }
    } else {
      console.log(`ℹ️ Offload #${sequenceNumber} recorded. Load still active (${Number(offloadData.tankReadingAfter)}L remaining)`);
    }

    // If there's a tank discrepancy, create an alert for the manager
    if (hasTankDiscrepancy) {
      try {
        // Determine severity based on reconciliation status
        const alertSeverity = reconciliation.reconciliationStatus === 'major_variance' ? 'critical' : 
                              reconciliation.reconciliationStatus === 'minor_variance' ? 'high' : 'medium';
        
        // Create descriptive title based on variance
        const varianceAmount = Math.abs(reconciliation.variance || 0);
        const alertTitle = varianceAmount >= 50 
          ? `Major Discrepancy: ${varianceAmount.toFixed(0)}L variance detected`
          : `Minor Variance: ${varianceAmount.toFixed(0)}L difference detected`;
        
        const alertData = {
          companyId,
          vehicleId: loadEvent.vehicleId,
          driverId: loadEvent.driverId || userId,
          offloadEventId: docRef.id,
          loadEventId: offloadData.loadEventId,
          alertType: 'tank_discrepancy',
          severity: alertSeverity,
          reconciliationStatus: reconciliation.reconciliationStatus,
          title: alertTitle,
          message: tankDiscrepancyDetails,
          details: {
            loadQuantity: loadEvent.loadQuantity,
            offloadQuantity: offloadData.offloadQuantity,
            tankBefore: offloadData.tankReadingBefore,
            tankAfter: offloadData.tankReadingAfter,
            expectedAfter: offloadData.tankReadingBefore - offloadData.offloadQuantity,
            variance: reconciliation.variance,
            variancePercentage: reconciliation.variancePercentage,
            customer: offloadData.customer || 'Unknown'
          },
          acknowledged: false,
          acknowledgedBy: null,
          acknowledgedAt: null,
          createdAt: Timestamp.now()
        };
        
        await addDoc(collection(db, 'tankDiscrepancyAlerts'), alertData);
        console.log(`⚠️ Tank discrepancy alert created: ${alertTitle}`);
      } catch (alertError) {
        console.error('Error creating tank discrepancy alert:', alertError);
        // Don't fail the offload if alert creation fails
      }
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating offload event:', error);
    throw error;
  }
};

/**
 * Get a single offload event by ID
 * @param {string} offloadEventId - Offload event document ID
 * @returns {Promise<Object|null>} Offload event data or null
 */
export const getOffloadEvent = async (offloadEventId) => {
  try {
    const docRef = doc(db, 'offloadEvents', offloadEventId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        offloadDate: docSnap.data().offloadDate?.toDate(),
        createdAt: docSnap.data().createdAt?.toDate(),
        updatedAt: docSnap.data().updatedAt?.toDate(),
        resolvedAt: docSnap.data().resolvedAt?.toDate()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting offload event:', error);
    throw error;
  }
};

/**
 * Get all offload events for a company (with optional filters)
 * @param {string} companyId - Company ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of offload events
 */
export const getOffloadEvents = async (companyId, filters = {}) => {
  try {
    let q = query(
      collection(db, 'offloadEvents'),
      where('companyId', '==', companyId)
    );

    // Apply filters
    if (filters.vehicleId) {
      q = query(q, where('vehicleId', '==', filters.vehicleId));
    }
    if (filters.reconciliationStatus) {
      q = query(q, where('reconciliationStatus', '==', filters.reconciliationStatus));
    }

    // Order by date
    q = query(q, orderBy('offloadDate', 'desc'));

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      offloadDate: doc.data().offloadDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      resolvedAt: doc.data().resolvedAt?.toDate()
    }));

    // Client-side date filtering
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      results = results.filter(event => event.offloadDate >= startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      results = results.filter(event => event.offloadDate <= endDate);
    }

    return results;
  } catch (error) {
    console.error('Error getting offload events:', error);
    throw error;
  }
};

/**
 * Get offload events by load event ID
 * @param {string} loadEventId - Load event ID
 * @returns {Promise<Array>} Array of offload events
 */
export const getOffloadEventsByLoad = async (loadEventId) => {
  try {
    const q = query(
      collection(db, 'offloadEvents'),
      where('loadEventId', '==', loadEventId),
      orderBy('offloadDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      offloadDate: doc.data().offloadDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      resolvedAt: doc.data().resolvedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting offload events by load:', error);
    throw error;
  }
};

/**
 * Get flagged offload events (requiring review)
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of flagged offload events
 */
export const getFlaggedOffloadEvents = async (companyId) => {
  try {
    // Get minor and major variances
    const minorQuery = query(
      collection(db, 'offloadEvents'),
      where('companyId', '==', companyId),
      where('reconciliationStatus', '==', 'minor_variance'),
      orderBy('offloadDate', 'desc')
    );

    const majorQuery = query(
      collection(db, 'offloadEvents'),
      where('companyId', '==', companyId),
      where('reconciliationStatus', '==', 'major_variance'),
      orderBy('offloadDate', 'desc')
    );

    const [minorSnap, majorSnap] = await Promise.all([
      getDocs(minorQuery),
      getDocs(majorQuery)
    ]);

    const results = [
      ...majorSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        offloadDate: doc.data().offloadDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        resolvedAt: doc.data().resolvedAt?.toDate()
      })),
      ...minorSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        offloadDate: doc.data().offloadDate?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        resolvedAt: doc.data().resolvedAt?.toDate()
      }))
    ];

    // Sort by date descending
    return results.sort((a, b) => b.offloadDate - a.offloadDate);
  } catch (error) {
    console.error('Error getting flagged offload events:', error);
    throw error;
  }
};

/**
 * Update an offload event
 * @param {string} offloadEventId - Offload event document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateOffloadEvent = async (offloadEventId, updates) => {
  try {
    const docRef = doc(db, 'offloadEvents', offloadEventId);
    
    // Convert date if present
    if (updates.offloadDate && !(updates.offloadDate instanceof Timestamp)) {
      updates.offloadDate = updates.offloadDate instanceof Date
        ? Timestamp.fromDate(updates.offloadDate)
        : Timestamp.fromDate(new Date(updates.offloadDate));
    }

    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating offload event:', error);
    throw error;
  }
};

/**
 * Investigate and resolve a discrepancy
 * @param {string} offloadEventId - Offload event document ID
 * @param {string} userId - User ID performing investigation
 * @param {Object} investigationData - Investigation details
 * @returns {Promise<void>}
 */
export const investigateDiscrepancy = async (offloadEventId, userId, investigationData) => {
  try {
    const docRef = doc(db, 'offloadEvents', offloadEventId);
    
    await updateDoc(docRef, {
      investigatedBy: userId,
      investigationNotes: investigationData.notes || '',
      rootCause: investigationData.rootCause || '',
      resolution: investigationData.resolution || 'approved',
      resolvedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error investigating discrepancy:', error);
    throw error;
  }
};

/**
 * Delete an offload event
 * @param {string} offloadEventId - Offload event document ID
 * @returns {Promise<void>}
 */
export const deleteOffloadEvent = async (offloadEventId) => {
  try {
    const docRef = doc(db, 'offloadEvents', offloadEventId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting offload event:', error);
    throw error;
  }
};

/**
 * Validate tank readings for offload
 * @param {number} before - Tank reading before offload
 * @param {number} quantity - Offload quantity
 * @param {number} after - Tank reading after offload
 * @returns {Object} Validation result
 */
export const validateOffloadTankReadings = (before, quantity, after) => {
  const expected = before - quantity;
  const variance = Math.abs(after - expected);
  const variancePercentage = (variance / quantity) * 100;
  const tolerance = quantity * 0.005; // 0.5%

  if (after > before) {
    return {
      valid: false,
      message: 'Tank reading after offload must be less than or equal to reading before',
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

/**
 * Get all active loads for a vehicle with combined totals
 * Consolidates multiple active loads into a single view
 * @param {string} vehicleId - Vehicle ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Consolidated load data
 */
export const getConsolidatedVehicleLoads = async (vehicleId, companyId) => {
  try {
    // Get vehicle details first
    let vehicleName = 'Unknown Vehicle';
    let vehicleRegNumber = '';
    try {
      const vehicleDoc = await getDoc(doc(db, 'vehicles', vehicleId));
      if (vehicleDoc.exists()) {
        const vehicleData = vehicleDoc.data();
        vehicleName = vehicleData.name || 'Vehicle';
        vehicleRegNumber = vehicleData.registrationNumber || '';
      }
    } catch (vehicleError) {
      console.warn('Could not fetch vehicle details:', vehicleError);
    }
    
    // Get all active loads for this vehicle
    const loadEventsRef = collection(db, 'loadEvents');
    const activeLoadsQuery = query(
      loadEventsRef,
      where('vehicleId', '==', vehicleId),
      where('companyId', '==', companyId),
      where('status', '==', 'active'),
      orderBy('loadDate', 'desc')
    );
    
    const snapshot = await getDocs(activeLoadsQuery);
    const loads = [];
    let totalRemaining = 0;
    let totalLoaded = 0;
    let totalOffloaded = 0;
    
    // Process each load and get its running balance
    for (const loadDoc of snapshot.docs) {
      const loadData = { id: loadDoc.id, ...loadDoc.data() };
      
      // Get running balance for each load
      const balance = await getRunningTankBalance(loadData.id);
      
      const loadQuantity = loadData.loadQuantity || 0;
      const remaining = balance?.remaining ?? loadQuantity;
      const offloaded = balance?.totalOffloaded || 0;
      
      loads.push({
        ...loadData,
        loadDate: loadData.loadDate?.toDate ? loadData.loadDate.toDate() : new Date(loadData.loadDate),
        remaining,
        offloadCount: balance?.offloadCount || 0,
        totalOffloaded: offloaded
      });
      
      totalLoaded += loadQuantity;
      totalRemaining += remaining;
      totalOffloaded += offloaded;
    }
    
    // Sort loads by date (oldest first for FIFO logic)
    loads.sort((a, b) => a.loadDate - b.loadDate);
    
    return {
      vehicleId,
      vehicleName: vehicleRegNumber ? `${vehicleName} (${vehicleRegNumber})` : vehicleName,
      vehicleRegNumber,
      loads,
      totalLoads: loads.length,
      totalLoaded,
      totalRemaining,
      totalOffloaded,
      unit: loads[0]?.unit || 'L',
      commodityType: loads[0]?.commodityType || 'diesel',
      supplier: loads[0]?.supplier,
      oldestLoad: loads[0], // For FIFO - offload from oldest first
      newestLoad: loads[loads.length - 1]
    };
  } catch (error) {
    console.error('❌ Error getting consolidated vehicle loads:', error);
    throw error;
  }
};
