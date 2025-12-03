/**
 * Reconciliation Service
 * Handles variance calculation and reconciliation logic for commodity tracking
 */

/**
 * Calculate reconciliation between load and offload events
 * 
 * CORRECT LOGIC - Uses ONLY tank readings as source of truth:
 * 
 * Example scenario:
 * - Tank Before Offload: 19,000 L
 * - Offload Quantity: 17,000 L  
 * - Tank After Offload: 2,000 L
 * 
 * Calculation:
 *   Expected Tank After = Tank Before - Offload Quantity
 *                       = 19,000 - 17,000 = 2,000 L
 *   Actual Tank After = 2,000 L
 *   Variance = Expected (2,000) - Actual (2,000) = 0 L ✅ PERFECT!
 * 
 * NEW RULES (per user requirement):
 * - Account for EVERY litre/kg with proper categorization
 * - Variance = 0 → Perfect Match (no notes required)
 * - Variance ≤ 3 → Very Minor/Allowable (flagged but acceptable, notes optional)
 * - Variance > 3 and < 50 → Minor Variance (requires notes and review)
 * - Variance ≥ 50 → Major Discrepancy (requires investigation and approval)
 * - System continuously tracks remaining fuel in tank (never loses track)
 * 
 * @param {Object} loadEvent - Load event data (provides unit info)
 * @param {Object} offloadData - Offload event data with tank readings
 * @returns {Object} Reconciliation result
 */
export const calculateReconciliation = (loadEvent, offloadData) => {
  // Determine unit from load event (kg for LP Gas, L for Diesel)
  const unit = loadEvent?.unit === 'kgs' ? 'kg' : 'L';
  // Validate input data
  if (!offloadData) {
    throw new Error('Offload data is required for reconciliation');
  }

  // PRIMARY CALCULATION: Based ONLY on tank readings
  // Convert to numbers and provide defaults
  const tankBefore = Number(offloadData.tankReadingBefore) || 0;
  const offloadQty = Number(offloadData.offloadQuantity) || 0;
  const tankAfter = Number(offloadData.tankReadingAfter) || 0;
  
  // Validate that we have meaningful values
  if (tankBefore === 0 && offloadQty === 0 && tankAfter === 0) {
    console.warn('Warning: All tank readings are zero or missing');
  }
  
  // Additional validation: Expected tank after should match actual
  // If tankBefore = 2200, offloadQty = 2000, tankAfter = 200
  // Expected = 2200 - 2000 = 200 ✓ Perfect match!
  
  // Expected tank after offload
  const expectedTankAfter = tankBefore - offloadQty;
  
  // The REAL variance - difference between expected and actual tank after
  const variance = expectedTankAfter - tankAfter;
  const varianceAbs = Math.abs(variance);
  
  // Variance percentage (based on what was offloaded)
  const variancePercentage = offloadQty > 0 ? (varianceAbs / offloadQty) * 100 : 0;
  
  // Actual tank decrease
  const actualTankDecrease = tankBefore - tankAfter;
  
  // Quantity variance (difference between stated offload and actual tank decrease)
  const quantityVariance = actualTankDecrease - offloadQty;
  const quantityVarianceAbs = Math.abs(quantityVariance);
  const quantityVariancePercent = offloadQty > 0 ? (quantityVarianceAbs / offloadQty) * 100 : 0;
  
  // Determine reconciliation status with new 3L allowable threshold
  let reconciliationStatus;
  let autoApproved = false;
  let primaryIssue = null;
  let requiresNotes = false;
  
  if (varianceAbs === 0 && quantityVarianceAbs === 0) {
    // PERFECT MATCH - No variance at all
    reconciliationStatus = 'matched';
    autoApproved = true;
    requiresNotes = false;
  } else if (varianceAbs <= 3 && quantityVarianceAbs <= 3) {
    // VERY MINOR / ALLOWABLE - 3L or less difference (evaporation, measurement tolerance)
    // Still flagged and accounted for, but acceptable
    reconciliationStatus = 'very_minor';
    autoApproved = true; // Auto-approve but still track
    requiresNotes = false; // Notes optional for very minor
    primaryIssue = varianceAbs > quantityVarianceAbs ? 'MEASUREMENT_TOLERANCE' : 'MINOR_EVAPORATION';
  } else if (varianceAbs < 50 && quantityVarianceAbs < 50) {
    // MINOR VARIANCE - More than 3L but less than 50L, MUST have notes
    reconciliationStatus = 'minor_variance';
    autoApproved = false;
    requiresNotes = true;
    primaryIssue = varianceAbs > quantityVarianceAbs ? 'TANK_READING_VARIANCE' : 'QUANTITY_MISMATCH';
  } else {
    // MAJOR DISCREPANCY - 50L or more difference, requires investigation
    reconciliationStatus = 'major_variance';
    autoApproved = false;
    requiresNotes = true;
    primaryIssue = varianceAbs > quantityVarianceAbs ? 'TANK_READING_VARIANCE' : 'QUANTITY_MISMATCH';
  }
  
  // Check for impossible scenarios
  if (tankAfter > tankBefore) {
    reconciliationStatus = 'major_variance';
    autoApproved = false;
    requiresNotes = true;
    primaryIssue = 'IMPOSSIBLE_INCREASE';
  }

  return {
    // Main variance (based on tank readings - the TRUE variance)
    variance: Number(variance.toFixed(2)),
    varianceAbs: Number(varianceAbs.toFixed(2)),
    variancePercentage: Number(variancePercentage.toFixed(2)),
    
    // Tank reading details
    tankBefore: Number(tankBefore.toFixed(2)),
    tankAfter: Number(tankAfter.toFixed(2)),
    expectedTankAfter: Number(expectedTankAfter.toFixed(2)),
    actualTankDecrease: Number(actualTankDecrease.toFixed(2)),
    
    // Quantity variance (offload qty vs actual tank decrease)
    quantityVariance: Number(quantityVariance.toFixed(2)),
    quantityVarianceAbs: Number(quantityVarianceAbs.toFixed(2)),
    quantityVariancePercent: Number(quantityVariancePercent.toFixed(2)),
    
    // Status
    reconciliationStatus,
    autoApproved,
    requiresNotes,
    primaryIssue,
    
    // User-friendly message
    message: varianceAbs === 0 && quantityVarianceAbs === 0
      ? 'Perfect match! Tank readings are exactly as expected.'
      : varianceAbs <= 3
      ? `Very minor variance: ${varianceAbs.toFixed(2)}${unit} (within 3${unit} allowable tolerance). Flagged and accounted for.`
      : varianceAbs < 50
      ? `Minor variance detected: ${varianceAbs.toFixed(2)}${unit} difference. Notes required.`
      : `Major discrepancy: ${varianceAbs.toFixed(2)}${unit} difference. Investigation required.`,
    
    // Calculation breakdown for display
    calculation: {
      description: 'Tank Before - Offload Quantity = Expected After',
      formula: `${tankBefore}${unit} - ${offloadQty}${unit} = ${expectedTankAfter}${unit} (expected)`,
      actual: `Actual tank after: ${tankAfter}${unit}`,
      result: `Variance: ${variance > 0 ? '+' : ''}${variance.toFixed(2)}${unit} ${variance > 0 ? '(left in tank)' : variance < 0 ? '(missing fuel)' : '(perfect match)'}`
    }
  };
};

/**
 * Identify which variance is the primary issue
 * @private
 */
function identifyPrimaryIssue(loadOffloadVar, tankVar, quantityVar) {
  const max = Math.max(loadOffloadVar, tankVar, quantityVar);
  
  if (max === tankVar) {
    return 'TANK_READING_MISMATCH';
  } else if (max === quantityVar) {
    return 'QUANTITY_MISMATCH';
  } else {
    return 'LOAD_OFFLOAD_VARIANCE';
  }
}

/**
 * Determine if variance is acceptable
 * NEW RULE: ZERO variance is the only acceptable scenario
 * Any variance > 0L requires notes and review
 * @param {number} varianceLitres - Variance in litres (absolute)
 * @returns {boolean} True if acceptable (only 0L is acceptable)
 */
export const isVarianceAcceptable = (varianceLitres) => {
  return Math.abs(varianceLitres) === 0;
};

/**
 * Get reconciliation status color
 * @param {string} status - Reconciliation status
 * @returns {string} Color class
 */
export const getReconciliationColor = (status) => {
  const colors = {
    matched: 'success',
    very_minor: 'info',
    minor_variance: 'warning',
    major_variance: 'danger',
    pending: 'info'
  };
  return colors[status] || 'info';
};

/**
 * Get reconciliation status label
 * @param {string} status - Reconciliation status
 * @returns {string} Human-readable label
 */
export const getReconciliationLabel = (status) => {
  const labels = {
    matched: 'Matched',
    very_minor: 'Very Minor (≤3L)',
    minor_variance: 'Minor Variance',
    major_variance: 'Major Discrepancy',
    pending: 'Pending Review'
  };
  return labels[status] || 'Unknown';
};

/**
 * Get reconciliation status icon
 * @param {string} status - Reconciliation status
 * @returns {string} Icon emoji
 */
export const getReconciliationIcon = (status) => {
  const icons = {
    matched: '✓',
    very_minor: 'ℹ️',
    minor_variance: '⚠',
    major_variance: '🔴',
    pending: '⏳'
  };
  return icons[status] || '?';
};

/**
 * Calculate expected offload quantity with tolerance
 * @param {number} loadQuantity - Load quantity
 * @param {number} tolerancePercentage - Tolerance percentage (default 1%)
 * @returns {Object} Min and max expected values
 */
export const getExpectedOffloadRange = (loadQuantity, tolerancePercentage = 1) => {
  const tolerance = (loadQuantity * tolerancePercentage) / 100;
  return {
    min: loadQuantity - tolerance,
    max: loadQuantity + tolerance,
    tolerance
  };
};

/**
 * Validate offload data using tank readings
 * NEW RULE: Use tank readings as source of truth, not historical load quantity
 * @param {Object} offloadData - Offload data with tank readings
 * @returns {Object} Validation result
 */
export const validateOffloadQuantity = (offloadData) => {
  const tankBefore = offloadData.tankReadingBefore || 0;
  const tankAfter = offloadData.tankReadingAfter || 0;
  const offloadQty = offloadData.offloadQuantity || 0;
  
  // Check 1: Tank after cannot exceed tank before
  if (tankAfter > tankBefore) {
    return {
      valid: false,
      message: 'IMPOSSIBLE: Tank reading increased during offload! Check your readings.',
      canProceed: false,
      autoApprove: false
    };
  }
  
  // Check 2: Offload quantity cannot exceed available fuel
  if (offloadQty > tankBefore) {
    return {
      valid: false,
      message: `Cannot offload ${offloadQty}L when tank only has ${tankBefore}L`,
      canProceed: false,
      autoApprove: false
    };
  }
  
  // Calculate expected vs actual
  const expectedAfter = tankBefore - offloadQty;
  const variance = Math.abs(expectedAfter - tankAfter);
  
  if (variance === 0) {
    return {
      valid: true,
      message: 'Perfect match! Tank readings exactly as expected.',
      canProceed: true,
      autoApprove: true,
      requiresNotes: false
    };
  } else if (variance < 50) {
    return {
      valid: true,
      message: `Minor variance: ${variance.toFixed(2)}L difference. Notes required.`,
      canProceed: true,
      autoApprove: false,
      requiresNotes: true
    };
  } else {
    return {
      valid: true,
      message: `Major discrepancy: ${variance.toFixed(2)}L difference. Investigation required.`,
      canProceed: true,
      autoApprove: false,
      requiresNotes: true
    };
  }
};

/**
 * Get common discrepancy reasons
 * UPDATED: Added more realistic scenarios including partial offload
 * @returns {Array} Array of discrepancy types
 */
export const getDiscrepancyTypes = () => {
  return [
    { value: 'none', label: 'No Discrepancy - Perfect Match' },
    { value: 'partialOffload', label: 'Partial Offload - Customer Wanted Less Than Full Tank' },
    { value: 'fuelLeftInTank', label: 'Fuel Left in Tank - Intentionally Not Fully Offloaded' },
    { value: 'evaporation', label: 'Evaporation Loss' },
    { value: 'spillage', label: 'Spillage During Transfer' },
    { value: 'meterError', label: 'Meter/Gauge Malfunction' },
    { value: 'theft', label: 'Theft/Pilferage' },
    { value: 'customerMeterError', label: 'Customer Meter Discrepancy' },
    { value: 'temperatureVariation', label: 'Temperature/Density Variation' },
    { value: 'measurementError', label: 'Human Measurement Error' },
    { value: 'leakage', label: 'Tank/Hose Leakage' },
    { value: 'other', label: 'Other (Specify in Notes)' }
  ];
};

/**
 * Calculate acceptable evaporation loss
 * @param {number} quantity - Quantity in litres
 * @param {number} distance - Distance travelled in km
 * @param {number} temperature - Average temperature in Celsius
 * @returns {number} Expected evaporation loss
 */
export const calculateExpectedEvaporation = (quantity, distance = 0, temperature = 25) => {
  // Industry standard: ~0.1% per 100km for diesel, higher for petrol
  // Temperature factor: +0.05% per 5°C above 20°C
  const distanceFactor = (distance / 100) * 0.001; // 0.1% per 100km
  const tempFactor = temperature > 20 ? ((temperature - 20) / 5) * 0.0005 : 0;
  
  const evaporationRate = distanceFactor + tempFactor;
  return quantity * evaporationRate;
};

/**
 * Validate tank readings for offload event
 * CRITICAL: Catches discrepancies like:
 * - Tank had 5100L after loading 5000L (100L was already in tank)
 * - After offloading 5000L, user captures 0L
 * - Expected: 100L remaining (5100 - 5000 = 100)
 * - Actual: 0L captured
 * - Discrepancy: 100L MISSING! FLAG THIS!
 * 
 * @param {Object} loadEvent - Load event with tankReadingAfter
 * @param {Object} offloadData - Offload data with tankReadingBefore, tankReadingAfter, offloadQuantity
 * @returns {Object} Validation result with flags
 */
export const validateTankReadings = (loadEvent, offloadData, previousOffload = null) => {
  const warnings = [];
  const errors = [];
  
  // RULE 1: Tank reading before offload should match expected value
  // For FIRST offload: compare with loadEvent.tankReadingAfter
  // For SUBSEQUENT offloads (consolidated): compare with previousOffload.tankReadingAfter
  const isConsolidatedSubsequent = previousOffload && previousOffload.tankReadingAfter !== undefined;
  const expectedTankBefore = isConsolidatedSubsequent 
    ? previousOffload.tankReadingAfter 
    : loadEvent.tankReadingAfter;
  const offloadStartReading = offloadData.tankReadingBefore;
  const readingDifference = Math.abs(expectedTankBefore - offloadStartReading);
  const readingDifferencePercent = expectedTankBefore > 0 ? (readingDifference / expectedTankBefore) * 100 : 0;
  
  // For consolidated loads, only flag if there's a significant difference
  // since the previous offload's tankReadingAfter should match this offload's tankReadingBefore
  if (readingDifference > 0 && expectedTankBefore > 0) {
    const sourceLabel = isConsolidatedSubsequent ? 'previous delivery' : 'loading';
    if (readingDifferencePercent > 5) {
      errors.push({
        type: 'TANK_READING_MISMATCH',
        severity: 'critical',
        message: `Tank reading mismatch: After ${sourceLabel} showed ${expectedTankBefore}L, but before this offload shows ${offloadStartReading}L. Difference: ${readingDifference.toFixed(2)}L (${readingDifferencePercent.toFixed(2)}%)`,
        expectedValue: expectedTankBefore,
        actualValue: offloadStartReading,
        difference: readingDifference
      });
    } else if (readingDifferencePercent > 1) {
      warnings.push({
        type: 'TANK_READING_VARIANCE',
        severity: 'medium',
        message: `Minor tank reading variance: ${readingDifference.toFixed(2)}L difference from ${sourceLabel}`,
        expectedValue: expectedTankBefore,
        actualValue: offloadStartReading,
        difference: readingDifference
      });
    }
  }
  
  // RULE 2: Calculate expected tank reading after offload
  const expectedAfterOffload = offloadStartReading - offloadData.offloadQuantity;
  const actualAfterOffload = offloadData.tankReadingAfter;
  const tankVariance = Math.abs(expectedAfterOffload - actualAfterOffload);
  const tankVariancePercent = offloadStartReading > 0 ? (tankVariance / offloadStartReading) * 100 : 0;
  
  // Also check absolute variance (for small tanks where % might be misleading)
  const significantVariance = tankVariance > 50; // More than 50L is always significant
  
  if (tankVariance > 0) {
    // Lower thresholds: 2% for errors (was 5%), 0.5% for warnings (was 1%)
    // OR if absolute variance is > 50L, always flag it
    if (tankVariancePercent > 2 || significantVariance) {
      errors.push({
        type: 'TANK_CALCULATION_ERROR',
        severity: 'critical',
        message: `CRITICAL: Tank readings don't match offload quantity! Started with ${offloadStartReading}L, offloaded ${offloadData.offloadQuantity}L, should have ${expectedAfterOffload}L remaining but shows ${actualAfterOffload}L. MISSING ${tankVariance.toFixed(2)}L!`,
        expectedValue: expectedAfterOffload,
        actualValue: actualAfterOffload,
        difference: tankVariance,
        calculation: `${offloadStartReading}L - ${offloadData.offloadQuantity}L = ${expectedAfterOffload}L (expected), but ${actualAfterOffload}L captured`
      });
    } else if (tankVariancePercent > 0.5) {
      warnings.push({
        type: 'TANK_READING_VARIANCE',
        severity: 'medium',
        message: `Tank reading variance: Expected ${expectedAfterOffload}L after offload, but shows ${actualAfterOffload}L. Variance: ${tankVariance.toFixed(2)}L`,
        expectedValue: expectedAfterOffload,
        actualValue: actualAfterOffload,
        difference: tankVariance
      });
    }
  }
  
  // RULE 3: Tank reading after must be less than before (can't increase during offload)
  if (actualAfterOffload > offloadStartReading) {
    errors.push({
      type: 'IMPOSSIBLE_INCREASE',
      severity: 'critical',
      message: `IMPOSSIBLE: Tank reading INCREASED during offload! Started with ${offloadStartReading}L, ended with ${actualAfterOffload}L. Tank cannot gain fuel during offload!`,
      expectedValue: `<= ${offloadStartReading}`,
      actualValue: actualAfterOffload
    });
  }
  
  // RULE 4: Check if offload quantity matches actual tank decrease
  const actualTankDecrease = offloadStartReading - actualAfterOffload;
  const quantityVariance = Math.abs(actualTankDecrease - offloadData.offloadQuantity);
  const quantityVariancePercent = offloadData.offloadQuantity > 0 ? (quantityVariance / offloadData.offloadQuantity) * 100 : 0;
  
  if (quantityVariance > 0) {
    // More lenient thresholds for quantity variance (3% error, 1% warning)
    if (quantityVariancePercent > 3) {
      errors.push({
        type: 'QUANTITY_TANK_MISMATCH',
        severity: 'critical',
        message: `CRITICAL: Claimed to offload ${offloadData.offloadQuantity}L, but tank only decreased by ${actualTankDecrease}L. Where did the ${quantityVariance.toFixed(2)}L go? Possible theft, spillage, or measurement error!`,
        expectedValue: offloadData.offloadQuantity,
        actualValue: actualTankDecrease,
        difference: quantityVariance,
        suggestion: 'Check: Partial offload? Spillage? Theft? Meter error?'
      });
    } else if (quantityVariancePercent > 0.5) {
      warnings.push({
        type: 'MINOR_QUANTITY_VARIANCE',
        severity: 'low',
        message: `Minor variance: Offload quantity ${offloadData.offloadQuantity}L vs actual tank decrease ${actualTankDecrease}L = ${quantityVariance.toFixed(2)}L difference`,
        expectedValue: offloadData.offloadQuantity,
        actualValue: actualTankDecrease,
        difference: quantityVariance
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings,
    summary: {
      expectedTankBefore, // Tank reading expected before offload (from load or previous offload)
      offloadStartReading, // Actual tank reading before offload
      offloadQuantity: offloadData.offloadQuantity,
      expectedAfterOffload,
      actualAfterOffload,
      tankVariance,
      tankVariancePercent,
      actualTankDecrease,
      quantityVariance,
      quantityVariancePercent
    },
    recommendation: errors.length > 0 
      ? 'REJECT - Critical discrepancies detected. Investigation required before proceeding.'
      : warnings.length > 0
        ? 'REVIEW - Minor variances detected. Review before approval.'
        : 'APPROVE - Tank readings consistent with offload quantity.'
  };
};

/**
 * Generate reconciliation summary
 * @param {Object} loadEvent - Load event
 * @param {Object} offloadEvent - Offload event
 * @returns {Object} Summary object
 */
export const generateReconciliationSummary = (loadEvent, offloadEvent) => {
  const reconciliation = calculateReconciliation(loadEvent, offloadEvent);
  const tankValidation = validateTankReadings(loadEvent, offloadEvent);
  
  return {
    loadQuantity: loadEvent.loadQuantity,
    offloadQuantity: offloadEvent.offloadQuantity,
    variance: reconciliation.variance,
    variancePercentage: reconciliation.variancePercentage,
    status: reconciliation.reconciliationStatus,
    autoApproved: reconciliation.autoApproved && tankValidation.isValid,
    statusLabel: getReconciliationLabel(reconciliation.reconciliationStatus),
    statusColor: getReconciliationColor(reconciliation.reconciliationStatus),
    statusIcon: getReconciliationIcon(reconciliation.reconciliationStatus),
    requiresInvestigation: !reconciliation.autoApproved || !tankValidation.isValid,
    canInvoice: reconciliation.autoApproved && tankValidation.isValid,
    tankValidation
  };
};
