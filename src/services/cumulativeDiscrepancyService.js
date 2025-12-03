import { collection, query, where, getDocs, Timestamp, addDoc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Cumulative Discrepancy Service
 * Tracks small fuel losses that individually are acceptable (<50L) but add up over time
 * This helps identify systematic losses, theft, or measurement issues
 */

/**
 * Get cumulative discrepancy stats for a vehicle
 * @param {string} companyId - Company ID
 * @param {string} vehicleId - Vehicle ID (optional, null for company-wide)
 * @param {number} daysBack - Number of days to look back
 * @returns {Promise<Object>} Cumulative stats
 */
export const getCumulativeDiscrepancyStats = async (companyId, vehicleId = null, daysBack = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    // Fetch all offload events in the time period
    const offloadsRef = collection(db, 'offloadEvents');
    let q = query(
      offloadsRef,
      where('companyId', '==', companyId),
      where('offloadDate', '>=', Timestamp.fromDate(startDate))
    );
    
    if (vehicleId) {
      q = query(q, where('vehicleId', '==', vehicleId));
    }
    
    const snapshot = await getDocs(q);
    const offloads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Analyze discrepancies
    let totalSmallDiscrepancies = 0; // Count of small discrepancies (<50L)
    let cumulativeSmallLoss = 0; // Total liters lost from small discrepancies
    let smallDiscrepancyEvents = [];
    let vehicleDiscrepancies = {}; // Track by vehicle
    
    offloads.forEach(offload => {
      // Check if there's tank discrepancy details
      if (offload.hasTankDiscrepancy && offload.tankDiscrepancyDetails) {
        // Parse discrepancy to extract variance amount
        const details = offload.tankDiscrepancyDetails;
        const varianceMatch = details.match(/(\d+\.?\d*)\s*L/);
        
        if (varianceMatch) {
          const variance = parseFloat(varianceMatch[1]);
          
          // Track small discrepancies (under 50L threshold)
          if (variance > 0 && variance < 50) {
            totalSmallDiscrepancies++;
            cumulativeSmallLoss += variance;
            
            smallDiscrepancyEvents.push({
              offloadId: offload.id,
              vehicleId: offload.vehicleId,
              date: offload.offloadDate?.toDate?.() || new Date(),
              variance: variance,
              customer: offload.customer
            });
            
            // Track by vehicle
            if (!vehicleDiscrepancies[offload.vehicleId]) {
              vehicleDiscrepancies[offload.vehicleId] = {
                count: 0,
                totalLoss: 0,
                events: []
              };
            }
            vehicleDiscrepancies[offload.vehicleId].count++;
            vehicleDiscrepancies[offload.vehicleId].totalLoss += variance;
            vehicleDiscrepancies[offload.vehicleId].events.push({
              offloadId: offload.id,
              date: offload.offloadDate?.toDate?.() || new Date(),
              variance: variance
            });
          }
        }
      }
    });
    
    // Calculate risk level
    const avgLossPerEvent = totalSmallDiscrepancies > 0 
      ? cumulativeSmallLoss / totalSmallDiscrepancies 
      : 0;
    
    let riskLevel = 'low';
    let needsInvestigation = false;
    let alertMessage = '';
    
    // Alert thresholds
    if (cumulativeSmallLoss > 500) { // More than 500L lost in period
      riskLevel = 'critical';
      needsInvestigation = true;
      alertMessage = `Critical: Lost ${cumulativeSmallLoss.toFixed(1)}L from ${totalSmallDiscrepancies} small discrepancies in ${daysBack} days. This adds up to significant losses!`;
    } else if (cumulativeSmallLoss > 200) { // More than 200L lost
      riskLevel = 'high';
      needsInvestigation = true;
      alertMessage = `Warning: Lost ${cumulativeSmallLoss.toFixed(1)}L from ${totalSmallDiscrepancies} small discrepancies in ${daysBack} days. Small losses are adding up.`;
    } else if (cumulativeSmallLoss > 100) { // More than 100L lost
      riskLevel = 'medium';
      needsInvestigation = true;
      alertMessage = `Notice: Lost ${cumulativeSmallLoss.toFixed(1)}L from ${totalSmallDiscrepancies} small discrepancies in ${daysBack} days. Monitor this trend.`;
    } else if (totalSmallDiscrepancies > 10) { // Many small discrepancies even if total is low
      riskLevel = 'medium';
      needsInvestigation = true;
      alertMessage = `Pattern detected: ${totalSmallDiscrepancies} small discrepancies in ${daysBack} days. Frequent small losses suggest systematic issue.`;
    }
    
    return {
      period: `Last ${daysBack} days`,
      totalSmallDiscrepancies,
      cumulativeSmallLoss: parseFloat(cumulativeSmallLoss.toFixed(2)),
      avgLossPerEvent: parseFloat(avgLossPerEvent.toFixed(2)),
      riskLevel,
      needsInvestigation,
      alertMessage,
      vehicleBreakdown: Object.entries(vehicleDiscrepancies).map(([vehicleId, data]) => ({
        vehicleId,
        ...data,
        avgLoss: data.count > 0 ? data.totalLoss / data.count : 0
      })),
      recentEvents: smallDiscrepancyEvents
        .sort((a, b) => b.date - a.date)
        .slice(0, 10) // Last 10 events
    };
  } catch (error) {
    console.error('Error calculating cumulative discrepancy stats:', error);
    throw error;
  }
};

/**
 * Create alert for cumulative discrepancy if threshold exceeded
 * @param {string} companyId - Company ID
 * @param {Object} stats - Stats from getCumulativeDiscrepancyStats
 * @returns {Promise<string|null>} Alert ID or null if no alert created
 */
export const createCumulativeDiscrepancyAlert = async (companyId, stats) => {
  try {
    if (!stats.needsInvestigation) {
      return null; // No alert needed
    }
    
    // Check if similar alert already exists (within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const alertsRef = collection(db, 'tankDiscrepancyAlerts');
    const existingQuery = query(
      alertsRef,
      where('companyId', '==', companyId),
      where('alertType', '==', 'cumulative_discrepancy'),
      where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
      where('acknowledged', '==', false)
    );
    
    const existingSnapshot = await getDocs(existingQuery);
    if (!existingSnapshot.empty) {
      return null; // Don't create duplicate alert
    }
    
    // Create new cumulative discrepancy alert
    const alertData = {
      companyId,
      alertType: 'cumulative_discrepancy',
      severity: stats.riskLevel === 'critical' ? 'critical' : stats.riskLevel === 'high' ? 'high' : 'medium',
      title: 'Cumulative Small Fuel Losses Detected',
      message: stats.alertMessage,
      details: {
        period: stats.period,
        totalEvents: stats.totalSmallDiscrepancies,
        totalLoss: stats.cumulativeSmallLoss,
        avgLossPerEvent: stats.avgLossPerEvent,
        riskLevel: stats.riskLevel,
        vehicleBreakdown: stats.vehicleBreakdown.slice(0, 5) // Top 5 vehicles
      },
      offloadEventIds: stats.recentEvents.map(e => e.offloadId),
      acknowledged: false,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'tankDiscrepancyAlerts'), alertData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating cumulative discrepancy alert:', error);
    throw error;
  }
};

/**
 * Check all vehicles for cumulative discrepancies and create alerts as needed
 * This should be run periodically (e.g., daily via cloud function)
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Summary of alerts created
 */
export const checkAndAlertCumulativeDiscrepancies = async (companyId) => {
  try {
    // Get company-wide stats
    const companyStats = await getCumulativeDiscrepancyStats(companyId, null, 30);
    
    const alerts = [];
    
    // Create company-wide alert if needed
    if (companyStats.needsInvestigation) {
      const alertId = await createCumulativeDiscrepancyAlert(companyId, companyStats);
      if (alertId) {
        alerts.push({
          type: 'company-wide',
          alertId,
          stats: companyStats
        });
      }
    }
    
    // Check individual vehicles that have significant losses
    for (const vehicleData of companyStats.vehicleBreakdown) {
      if (vehicleData.totalLoss > 100 || vehicleData.count > 5) {
        const vehicleStats = await getCumulativeDiscrepancyStats(companyId, vehicleData.vehicleId, 30);
        
        if (vehicleStats.needsInvestigation) {
          const alertId = await createCumulativeDiscrepancyAlert(companyId, vehicleStats);
          if (alertId) {
            alerts.push({
              type: 'vehicle-specific',
              vehicleId: vehicleData.vehicleId,
              alertId,
              stats: vehicleStats
            });
          }
        }
      }
    }
    
    return {
      success: true,
      alertsCreated: alerts.length,
      alerts,
      companyStats
    };
  } catch (error) {
    console.error('Error checking cumulative discrepancies:', error);
    throw error;
  }
};
