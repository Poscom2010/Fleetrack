import { doc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Delete a complete trip (load event) and all related data
 * This includes: offload events, invoices, payments, return trips, expenses, and alerts
 * @param {string} loadEventId - Load event ID to delete
 * @param {string} companyId - Company ID for verification
 * @param {string} userId - User ID performing the deletion
 * @returns {Promise<Object>} Deletion summary
 */
export const deleteTrip = async (loadEventId, companyId, userId) => {
  try {
    const deletionSummary = {
      loadEvent: false,
      offloadEvents: 0,
      invoices: 0,
      payments: 0,
      returnTrips: 0,
      expenses: 0,
      alerts: 0
    };

    // Get the load event first to verify it exists and belongs to the company
    const loadEventRef = doc(db, 'loadEvents', loadEventId);
    const loadEventDoc = await getDocs(query(collection(db, 'loadEvents'), where('__name__', '==', loadEventId)));
    
    if (loadEventDoc.empty) {
      throw new Error('Load event not found');
    }

    const loadEventData = loadEventDoc.docs[0].data();
    if (loadEventData.companyId !== companyId) {
      throw new Error('Unauthorized: Load event does not belong to your company');
    }

    // Use batch for atomic operations
    const batch = writeBatch(db);

    // 1. Find and delete all offload events for this load
    const offloadQuery = query(
      collection(db, 'offloadEvents'),
      where('loadEventId', '==', loadEventId)
    );
    const offloadSnapshot = await getDocs(offloadQuery);
    
    const offloadIds = [];
    offloadSnapshot.forEach(doc => {
      offloadIds.push(doc.id);
      batch.delete(doc.ref);
      deletionSummary.offloadEvents++;
    });

    // 2. Find and delete all invoices for these offloads
    for (const offloadId of offloadIds) {
      const invoiceQuery = query(
        collection(db, 'invoices'),
        where('offloadEventId', '==', offloadId)
      );
      const invoiceSnapshot = await getDocs(invoiceQuery);
      
      const invoiceIds = [];
      invoiceSnapshot.forEach(doc => {
        invoiceIds.push(doc.id);
        batch.delete(doc.ref);
        deletionSummary.invoices++;
      });

      // 3. Find and delete all payments for these invoices
      for (const invoiceId of invoiceIds) {
        const paymentQuery = query(
          collection(db, 'payments'),
          where('invoiceId', '==', invoiceId)
        );
        const paymentSnapshot = await getDocs(paymentQuery);
        
        paymentSnapshot.forEach(doc => {
          batch.delete(doc.ref);
          deletionSummary.payments++;
        });
      }

      // 4. Find and delete return trips for these offloads
      const returnTripQuery = query(
        collection(db, 'returnTrips'),
        where('offloadEventId', '==', offloadId)
      );
      const returnTripSnapshot = await getDocs(returnTripQuery);
      
      returnTripSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        deletionSummary.returnTrips++;
      });

      // 5. Find and delete tank discrepancy alerts for these offloads
      const alertQuery = query(
        collection(db, 'tankDiscrepancyAlerts'),
        where('offloadEventId', '==', offloadId)
      );
      const alertSnapshot = await getDocs(alertQuery);
      
      alertSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        deletionSummary.alerts++;
      });
    }

    // 6. Find and delete trip expenses for this load
    const expenseQuery = query(
      collection(db, 'tripExpenses'),
      where('loadEventId', '==', loadEventId)
    );
    const expenseSnapshot = await getDocs(expenseQuery);
    
    expenseSnapshot.forEach(doc => {
      batch.delete(doc.ref);
      deletionSummary.expenses++;
    });

    // 7. Delete the load event itself
    batch.delete(loadEventRef);
    deletionSummary.loadEvent = true;

    // Commit all deletions atomically
    await batch.commit();

    console.log('Trip deletion summary:', deletionSummary);
    return deletionSummary;
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
};

/**
 * Check if user has permission to delete a trip
 * @param {Object} userProfile - User profile object
 * @returns {boolean} True if user can delete trips
 */
export const canDeleteTrip = (userProfile) => {
  if (!userProfile) return false;
  
  const allowedRoles = ['company_admin', 'company_manager', 'system_admin'];
  return allowedRoles.includes(userProfile.role);
};

/**
 * Get deletion impact summary before actually deleting
 * @param {string} loadEventId - Load event ID
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Impact summary
 */
export const getDeletionImpact = async (loadEventId, companyId) => {
  try {
    const impact = {
      offloadEvents: 0,
      invoices: 0,
      payments: 0,
      returnTrips: 0,
      expenses: 0,
      alerts: 0,
      totalRevenue: 0,
      paidAmount: 0,
      outstandingAmount: 0
    };

    // Count offload events
    const offloadQuery = query(
      collection(db, 'offloadEvents'),
      where('loadEventId', '==', loadEventId)
    );
    const offloadSnapshot = await getDocs(offloadQuery);
    impact.offloadEvents = offloadSnapshot.size;

    const offloadIds = offloadSnapshot.docs.map(doc => doc.id);

    // Count invoices and calculate financial impact
    for (const offloadId of offloadIds) {
      const invoiceQuery = query(
        collection(db, 'invoices'),
        where('offloadEventId', '==', offloadId)
      );
      const invoiceSnapshot = await getDocs(invoiceQuery);
      impact.invoices += invoiceSnapshot.size;

      invoiceSnapshot.forEach(doc => {
        const invoice = doc.data();
        impact.totalRevenue += invoice.totalAmount || 0;
        impact.paidAmount += invoice.paidAmount || 0;
      });

      // Count payments
      for (const invoiceDoc of invoiceSnapshot.docs) {
        const paymentQuery = query(
          collection(db, 'payments'),
          where('invoiceId', '==', invoiceDoc.id)
        );
        const paymentSnapshot = await getDocs(paymentQuery);
        impact.payments += paymentSnapshot.size;
      }

      // Count return trips
      const returnTripQuery = query(
        collection(db, 'returnTrips'),
        where('offloadEventId', '==', offloadId)
      );
      const returnTripSnapshot = await getDocs(returnTripQuery);
      impact.returnTrips += returnTripSnapshot.size;

      // Count alerts
      const alertQuery = query(
        collection(db, 'tankDiscrepancyAlerts'),
        where('offloadEventId', '==', offloadId)
      );
      const alertSnapshot = await getDocs(alertQuery);
      impact.alerts += alertSnapshot.size;
    }

    // Count expenses
    const expenseQuery = query(
      collection(db, 'tripExpenses'),
      where('loadEventId', '==', loadEventId)
    );
    const expenseSnapshot = await getDocs(expenseQuery);
    impact.expenses = expenseSnapshot.size;

    impact.outstandingAmount = impact.totalRevenue - impact.paidAmount;

    return impact;
  } catch (error) {
    console.error('Error getting deletion impact:', error);
    throw error;
  }
};
