/**
 * Migration Script: Add vehicleType field to existing vehicles
 * Run this once to migrate existing vehicles to the new schema
 * 
 * Usage: node src/migrations/addVehicleType.js
 */

import { collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase.js';

/**
 * Migrate all existing vehicles to add vehicleType field
 * Defaults to 'taxi' for backward compatibility
 */
export const migrateVehicleTypes = async () => {
  try {
    console.log('Starting vehicle type migration...');
    
    const vehiclesRef = collection(db, 'vehicles');
    const snapshot = await getDocs(vehiclesRef);
    
    console.log(`Found ${snapshot.size} vehicles to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const docSnap of snapshot.docs) {
      try {
        const vehicleData = docSnap.data();
        
        // Skip if already has vehicleType
        if (vehicleData.vehicleType) {
          console.log(`Skipping ${docSnap.id} - already has vehicleType: ${vehicleData.vehicleType}`);
          continue;
        }

        const vehicleRef = doc(db, 'vehicles', docSnap.id);
        
        await updateDoc(vehicleRef, {
          vehicleType: 'taxi', // Default for existing vehicles
          updatedAt: Timestamp.now()
        });

        successCount++;
        console.log(`✓ Migrated vehicle ${docSnap.id} (${vehicleData.name || vehicleData.registrationNumber})`);
      } catch (error) {
        errorCount++;
        errors.push({ id: docSnap.id, error: error.message });
        console.error(`✗ Error migrating vehicle ${docSnap.id}:`, error.message);
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Total vehicles: ${snapshot.size}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\nErrors encountered:');
      errors.forEach(err => {
        console.log(`  - ${err.id}: ${err.error}`);
      });
    }

    return {
      total: snapshot.size,
      success: successCount,
      errors: errorCount,
      errorDetails: errors
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

/**
 * Add commoditySettings to existing companies
 */
export const migrateCompanySettings = async () => {
  try {
    console.log('Starting company settings migration...');
    
    const companiesRef = collection(db, 'companies');
    const snapshot = await getDocs(companiesRef);
    
    console.log(`Found ${snapshot.size} companies to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const docSnap of snapshot.docs) {
      try {
        const companyData = docSnap.data();
        
        // Skip if already has commoditySettings
        if (companyData.settings?.commoditySettings) {
          console.log(`Skipping ${docSnap.id} - already has commoditySettings`);
          continue;
        }

        const companyRef = doc(db, 'companies', docSnap.id);
        
        const defaultCommoditySettings = {
          enableCommodityTracking: false, // Disabled by default
          defaultVarianceThreshold: 1.0,
          autoApproveThreshold: 1.0,
          commodityTypes: ['diesel', 'lpGas'],
          defaultPaymentTerms: 'Net 30 days',
          invoicePrefix: 'INV-',
          invoiceNumbering: 'sequential'
        };

        await updateDoc(companyRef, {
          'settings.commoditySettings': defaultCommoditySettings,
          updatedAt: Timestamp.now()
        });

        successCount++;
        console.log(`✓ Migrated company ${docSnap.id} (${companyData.name})`);
      } catch (error) {
        errorCount++;
        errors.push({ id: docSnap.id, error: error.message });
        console.error(`✗ Error migrating company ${docSnap.id}:`, error.message);
      }
    }

    console.log('\n=== Migration Complete ===');
    console.log(`Total companies: ${snapshot.size}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\nErrors encountered:');
      errors.forEach(err => {
        console.log(`  - ${err.id}: ${err.error}`);
      });
    }

    return {
      total: snapshot.size,
      success: successCount,
      errors: errorCount,
      errorDetails: errors
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
};

/**
 * Run all migrations
 */
export const runAllMigrations = async () => {
  console.log('========================================');
  console.log('Running All Commodity Tracking Migrations');
  console.log('========================================\n');

  try {
    // Migrate vehicles
    const vehicleResults = await migrateVehicleTypes();
    console.log('\n');

    // Migrate companies
    const companyResults = await migrateCompanySettings();
    console.log('\n');

    console.log('========================================');
    console.log('All Migrations Complete');
    console.log('========================================');
    console.log('Vehicles:', vehicleResults);
    console.log('Companies:', companyResults);

    return {
      vehicles: vehicleResults,
      companies: companyResults
    };
  } catch (error) {
    console.error('Migration process failed:', error);
    throw error;
  }
};

// If running directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllMigrations()
    .then(() => {
      console.log('\n✓ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n✗ Migration failed:', error);
      process.exit(1);
    });
}
