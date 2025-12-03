import { 
  collection, 
  doc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Soft Delete Service - Marks documents as deleted instead of removing them
 * Allows System Admins to recover deleted data
 */

// Collections that support soft delete
const RECOVERABLE_COLLECTIONS = [
  'vehicles',
  'dailyEntries',
  'expenses',
  'invoices',
  'tripExpenses',
  'loadEvents',
  'offloadEvents',
  'payments'
];

/**
 * Soft delete a document - marks it as deleted
 * @param {string} collectionName - Collection name
 * @param {string} documentId - Document ID
 * @param {string} userId - User who deleted it
 */
export const softDelete = async (collectionName, documentId, userId) => {
  try {
    if (!RECOVERABLE_COLLECTIONS.includes(collectionName)) {
      throw new Error(`Collection ${collectionName} does not support soft delete`);
    }

    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      deleted: true,
      deletedAt: Timestamp.now(),
      deletedBy: userId,
      updatedAt: Timestamp.now()
    });

    return { success: true, message: 'Item marked as deleted' };
  } catch (error) {
    console.error('Error soft deleting document:', error);
    throw error;
  }
};

/**
 * Soft delete multiple documents in a batch
 * @param {string} collectionName - Collection name
 * @param {string[]} documentIds - Array of document IDs
 * @param {string} userId - User who deleted them
 */
export const softDeleteBatch = async (collectionName, documentIds, userId) => {
  try {
    if (!RECOVERABLE_COLLECTIONS.includes(collectionName)) {
      throw new Error(`Collection ${collectionName} does not support soft delete`);
    }

    const batch = writeBatch(db);
    const now = Timestamp.now();

    documentIds.forEach(docId => {
      const docRef = doc(db, collectionName, docId);
      batch.update(docRef, {
        deleted: true,
        deletedAt: now,
        deletedBy: userId,
        updatedAt: now
      });
    });

    await batch.commit();
    return { success: true, message: `${documentIds.length} items marked as deleted` };
  } catch (error) {
    console.error('Error batch soft deleting:', error);
    throw error;
  }
};

/**
 * Restore a soft-deleted document
 * @param {string} collectionName - Collection name
 * @param {string} documentId - Document ID
 * @param {string} userId - User who restored it
 */
export const restoreDocument = async (collectionName, documentId, userId) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    await updateDoc(docRef, {
      deleted: false,
      deletedAt: null,
      deletedBy: null,
      restoredAt: Timestamp.now(),
      restoredBy: userId,
      updatedAt: Timestamp.now()
    });

    return { success: true, message: 'Item restored successfully' };
  } catch (error) {
    console.error('Error restoring document:', error);
    throw error;
  }
};

/**
 * Restore multiple documents in a batch
 * @param {string} collectionName - Collection name
 * @param {string[]} documentIds - Array of document IDs
 * @param {string} userId - User who restored them
 */
export const restoreBatch = async (collectionName, documentIds, userId) => {
  try {
    const batch = writeBatch(db);
    const now = Timestamp.now();

    documentIds.forEach(docId => {
      const docRef = doc(db, collectionName, docId);
      batch.update(docRef, {
        deleted: false,
        deletedAt: null,
        deletedBy: null,
        restoredAt: now,
        restoredBy: userId,
        updatedAt: now
      });
    });

    await batch.commit();
    return { success: true, message: `${documentIds.length} items restored successfully` };
  } catch (error) {
    console.error('Error batch restoring:', error);
    throw error;
  }
};

/**
 * Get all deleted documents for a company
 * @param {string} companyId - Company ID
 * @param {string} collectionName - Optional: specific collection to search
 */
export const getDeletedDocuments = async (companyId, collectionName = null) => {
  try {
    const deletedData = {};

    const collectionsToSearch = collectionName 
      ? [collectionName] 
      : RECOVERABLE_COLLECTIONS;

    for (const col of collectionsToSearch) {
      const colRef = collection(db, col);
      const q = query(
        colRef,
        where('companyId', '==', companyId),
        where('deleted', '==', true)
      );

      const snapshot = await getDocs(q);
      deletedData[col] = snapshot.docs.map(doc => ({
        id: doc.id,
        collection: col,
        ...doc.data(),
        deletedAt: doc.data().deletedAt?.toDate(),
        restoredAt: doc.data().restoredAt?.toDate()
      }));
    }

    return deletedData;
  } catch (error) {
    console.error('Error getting deleted documents:', error);
    throw error;
  }
};

/**
 * Get all deleted documents across all companies (System Admin only)
 */
export const getAllDeletedDocuments = async () => {
  try {
    const deletedData = {};

    for (const col of RECOVERABLE_COLLECTIONS) {
      const colRef = collection(db, col);
      const q = query(colRef, where('deleted', '==', true));

      const snapshot = await getDocs(q);
      deletedData[col] = snapshot.docs.map(doc => ({
        id: doc.id,
        collection: col,
        ...doc.data(),
        deletedAt: doc.data().deletedAt?.toDate(),
        restoredAt: doc.data().restoredAt?.toDate()
      }));
    }

    return deletedData;
  } catch (error) {
    console.error('Error getting all deleted documents:', error);
    throw error;
  }
};

/**
 * Permanently delete a document (cannot be recovered)
 * @param {string} collectionName - Collection name
 * @param {string} documentId - Document ID
 */
export const permanentDelete = async (collectionName, documentId) => {
  try {
    const docRef = doc(db, collectionName, documentId);
    // For permanent delete, we still soft delete but mark it as permanent
    await updateDoc(docRef, {
      deleted: true,
      permanentlyDeleted: true,
      permanentDeletedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    return { success: true, message: 'Item permanently deleted' };
  } catch (error) {
    console.error('Error permanently deleting document:', error);
    throw error;
  }
};

/**
 * Get statistics about deleted data for a company
 * @param {string} companyId - Company ID
 */
export const getDeletedDataStats = async (companyId) => {
  try {
    const deletedData = await getDeletedDocuments(companyId);
    
    const stats = {
      totalDeleted: 0,
      byCollection: {}
    };

    Object.entries(deletedData).forEach(([col, items]) => {
      stats.byCollection[col] = items.length;
      stats.totalDeleted += items.length;
    });

    return stats;
  } catch (error) {
    console.error('Error getting deleted data stats:', error);
    throw error;
  }
};

// Export RECOVERABLE_COLLECTIONS as named export
export { RECOVERABLE_COLLECTIONS };

export default {
  softDelete,
  softDeleteBatch,
  restoreDocument,
  restoreBatch,
  getDeletedDocuments,
  getAllDeletedDocuments,
  permanentDelete,
  getDeletedDataStats,
  RECOVERABLE_COLLECTIONS
};
