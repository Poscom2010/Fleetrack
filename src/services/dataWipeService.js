import { collection, query, where, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

/**
 * Wipe selected captured data for a specific company
 * This includes daily entries, expenses, and trips based on selections
 * Keeps vehicles, users, and company profile intact
 * @param {string} companyId - The company ID
 * @param {Object} selections - Object with boolean flags for what to delete
 * @returns {Promise<Object>} - Statistics of deleted data
 */
export const wipeCompanyData = async (companyId, selections = { dailyEntries: true, expenses: true, trips: true }) => {
  if (!companyId) {
    throw new Error('Company ID is required');
  }

  // Verify current user is system admin
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User not authenticated');
  }

  console.log('🔍 Verifying user permissions for data wipe...');
  console.log('User ID:', currentUser.uid);

  // Force token refresh to ensure latest permissions
  try {
    await currentUser.getIdToken(true);
    console.log('✅ Token refreshed');
  } catch (tokenError) {
    console.error('Error refreshing token:', tokenError);
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }

    const userData = userDoc.data();
    const userRole = userData.role;
    console.log('User role:', userRole);
    console.log('User data:', userData);

    if (userRole !== 'system_admin' && userRole !== 'admin') {
      throw new Error('Insufficient permissions. Only system administrators can wipe company data.');
    }

    console.log('✅ User verified as system admin');
  } catch (error) {
    console.error('Error verifying user permissions:', error);
    throw new Error(`Permission verification failed: ${error.message}`);
  }

  const stats = {
    dailyEntries: 0,
    expenses: 0,
    trips: 0,
    drivers: 0,
    total: 0
  };

  try {
    console.log('🗑️ Starting data wipe for company:', companyId);
    console.log('Selections:', selections);

    // Wipe Daily Entries (if selected)
    if (selections.dailyEntries) {
      console.log('📋 Fetching daily entries...');
      const entriesQuery = query(
        collection(db, 'dailyEntries'),
        where('companyId', '==', companyId)
      );
      const entriesSnapshot = await getDocs(entriesQuery);
      console.log(`Found ${entriesSnapshot.size} daily entries`);
    
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
      console.log(`Committing ${batches.length} batch(es) for daily entries...`);
      await Promise.all(batches.map(b => b.commit()));
      console.log(`✅ Deleted ${stats.dailyEntries} daily entries`);
    }
    }

    // Wipe Expenses (if selected)
    if (selections.expenses) {
      console.log('💰 Fetching expenses...');
      try {
        const expensesQuery = query(
          collection(db, 'expenses'),
          where('companyId', '==', companyId)
        );
        const expensesSnapshot = await getDocs(expensesQuery);
        console.log(`Found ${expensesSnapshot.size} expenses`);

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

      console.log(`Committing ${batches.length} batch(es) for expenses...`);
      await Promise.all(batches.map(b => b.commit()));
      console.log(`✅ Deleted ${stats.expenses} expenses`);
    }
      } catch (expenseError) {
        console.error('❌ Error fetching/deleting expenses:', expenseError);
        throw expenseError;
      }
    }

    // Wipe Trips (if selected)
    if (selections.trips) {
      console.log('🚗 Fetching trips...');
      try {
        const tripsQuery = query(
          collection(db, 'trips'),
          where('companyId', '==', companyId)
        );
        const tripsSnapshot = await getDocs(tripsQuery);
        console.log(`Found ${tripsSnapshot.size} trips`);

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

      console.log(`Committing ${batches.length} batch(es) for trips...`);
      await Promise.all(batches.map(b => b.commit()));
      console.log(`✅ Deleted ${stats.trips} trips`);
    }
      } catch (tripError) {
        console.error('❌ Error fetching/deleting trips:', tripError);
        throw tripError;
      }
    }

    // Wipe Drivers (if selected)
    if (selections.drivers) {
      console.log('👥 Fetching drivers...');
      try {
        const driversQuery = query(
          collection(db, 'driverProfiles'),
          where('companyId', '==', companyId)
        );
        const driversSnapshot = await getDocs(driversQuery);
        console.log(`Found ${driversSnapshot.size} driver profiles`);

    if (!driversSnapshot.empty) {
      const batches = [];
      let batch = writeBatch(db);
      let operationCount = 0;

        driversSnapshot.docs.forEach((document) => {
          batch.delete(doc(db, 'driverProfiles', document.id));
        operationCount++;
        stats.drivers++;

        if (operationCount === 500) {
          batches.push(batch);
          batch = writeBatch(db);
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(batch);
      }

      console.log(`Committing ${batches.length} batch(es) for driver profiles...`);
      await Promise.all(batches.map(b => b.commit()));
      console.log(`✅ Deleted ${stats.drivers} driver profiles`);
    }
      } catch (driverError) {
        console.error('❌ Error fetching/deleting driver profiles:', driverError);
        throw driverError;
      }
    }

    console.log(`✅ Data wipe complete! Total deleted: ${stats.dailyEntries + stats.expenses + stats.trips + stats.drivers}`);
    stats.total = stats.dailyEntries + stats.expenses + stats.trips + stats.drivers;

    return stats;
  } catch (error) {
    console.error('Error wiping company data:', error);
    throw new Error(`Failed to wipe company data: ${error.message}`);
  }
};
