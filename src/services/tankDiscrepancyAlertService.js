import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Get all unacknowledged tank discrepancy alerts for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of alert objects
 */
export const getUnacknowledgedAlerts = async (companyId) => {
  try {
    const alertsRef = collection(db, 'tankDiscrepancyAlerts');
    const q = query(
      alertsRef,
      where('companyId', '==', companyId),
      where('acknowledged', '==', false)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
  } catch (error) {
    console.error('Error fetching unacknowledged alerts:', error);
    throw error;
  }
};

/**
 * Get all tank discrepancy alerts for a company (acknowledged and unacknowledged)
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of alert objects
 */
export const getAllAlerts = async (companyId) => {
  try {
    const alertsRef = collection(db, 'tankDiscrepancyAlerts');
    const q = query(
      alertsRef,
      where('companyId', '==', companyId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      acknowledgedAt: doc.data().acknowledgedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error fetching all alerts:', error);
    throw error;
  }
};

/**
 * Acknowledge a tank discrepancy alert
 * @param {string} alertId - Alert document ID
 * @param {string} userId - User ID acknowledging the alert
 * @param {string} notes - Optional notes from manager
 * @returns {Promise<void>}
 */
export const acknowledgeAlert = async (alertId, userId, notes = '') => {
  try {
    const alertRef = doc(db, 'tankDiscrepancyAlerts', alertId);
    await updateDoc(alertRef, {
      acknowledged: true,
      acknowledgedBy: userId,
      acknowledgedAt: Timestamp.now(),
      acknowledgeNotes: notes,
      updatedAt: Timestamp.now()
    });
    
    // Also update the offload event to mark discrepancy as acknowledged
    const alertDoc = await getDocs(query(collection(db, 'tankDiscrepancyAlerts'), where('__name__', '==', alertId)));
    if (!alertDoc.empty) {
      const alertData = alertDoc.docs[0].data();
      if (alertData.offloadEventId) {
        const offloadRef = doc(db, 'offloadEvents', alertData.offloadEventId);
        await updateDoc(offloadRef, {
          tankDiscrepancyAcknowledged: true,
          tankDiscrepancyAcknowledgedBy: userId,
          tankDiscrepancyAcknowledgedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
    }
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    throw error;
  }
};

/**
 * Count unacknowledged alerts for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<number>} Count of unacknowledged alerts
 */
export const countUnacknowledgedAlerts = async (companyId) => {
  try {
    const alerts = await getUnacknowledgedAlerts(companyId);
    return alerts.length;
  } catch (error) {
    console.error('Error counting unacknowledged alerts:', error);
    return 0;
  }
};
