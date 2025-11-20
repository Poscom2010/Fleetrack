import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Wipe all captured data for a specific company
 * This includes daily entries, expenses, and trips
 * Keeps vehicles, users, and company profile intact
 * @param {string} companyId - The company ID
 * @returns {Promise<Object>} - Statistics of deleted data
 */
export const wipeCompanyData = async (companyId) => {
  if (!companyId) {
    throw new Error('Company ID is required');
  }

  const stats = {
    dailyEntries: 0,
    expenses: 0,
    trips: 0,
    total: 0
  };

  try {
    // Wipe Daily Entries
    const entriesQuery = query(
      collection(db, 'dailyEntries'),
      where('companyId', '==', companyId)
    );
    const entriesSnapshot = await getDocs(entriesQuery);
    
    if (!entriesSnapshot.empty) {
      const batches = [];
      let batch = writeBatch(db);
      let operationCount = 0;

      entriesSnapshot.docs.forEach((document) => {
        batch.delete(doc(db, 'dailyEntries', document.id));
        operationCount++;
        stats.dailyEntries++;

        // Firestore batch limit is 500 operations
        if (operationCount === 500) {
          batches.push(batch);
          batch = writeBatch(db);
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(batch);
      }

      // Commit all batches
      await Promise.all(batches.map(b => b.commit()));
    }

    // Wipe Expenses
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('companyId', '==', companyId)
    );
    const expensesSnapshot = await getDocs(expensesQuery);

    if (!expensesSnapshot.empty) {
      const batches = [];
      let batch = writeBatch(db);
      let operationCount = 0;

      expensesSnapshot.docs.forEach((document) => {
        batch.delete(doc(db, 'expenses', document.id));
        operationCount++;
        stats.expenses++;

        if (operationCount === 500) {
          batches.push(batch);
          batch = writeBatch(db);
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(batch);
      }

      await Promise.all(batches.map(b => b.commit()));
    }

    // Wipe Trips (if collection exists)
    const tripsQuery = query(
      collection(db, 'trips'),
      where('companyId', '==', companyId)
    );
    const tripsSnapshot = await getDocs(tripsQuery);

    if (!tripsSnapshot.empty) {
      const batches = [];
      let batch = writeBatch(db);
      let operationCount = 0;

      tripsSnapshot.docs.forEach((document) => {
        batch.delete(doc(db, 'trips', document.id));
        operationCount++;
        stats.trips++;

        if (operationCount === 500) {
          batches.push(batch);
          batch = writeBatch(db);
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(batch);
      }

      await Promise.all(batches.map(b => b.commit()));
    }

    stats.total = stats.dailyEntries + stats.expenses + stats.trips;

    return stats;
  } catch (error) {
    console.error('Error wiping company data:', error);
    throw new Error(`Failed to wipe company data: ${error.message}`);
  }
};
