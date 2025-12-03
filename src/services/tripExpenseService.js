import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Trip Expense Service
 * Handles CRUD operations for trip expenses
 */

/**
 * Create a new trip expense
 * @param {string} userId - User ID
 * @param {string} companyId - Company ID
 * @param {Object} expenseData - Expense data
 * @returns {Promise<string>} - Created expense ID
 */
export const createTripExpense = async (userId, companyId, expenseData) => {
  try {
    const expensesRef = collection(db, 'tripExpenses');
    
    const expense = {
      companyId,
      loadEventId: expenseData.loadEventId,
      offloadEventId: expenseData.offloadEventId || null,
      vehicleId: expenseData.vehicleId,
      expenseType: expenseData.expenseType, // 'fuel', 'toll', 'maintenance', 'other'
      amount: parseFloat(expenseData.amount),
      currency: expenseData.currency || 'ZAR',
      description: expenseData.description || '',
      date: expenseData.date ? Timestamp.fromDate(new Date(expenseData.date)) : Timestamp.now(),
      createdAt: Timestamp.now(),
      createdBy: userId
    };

    const docRef = await addDoc(expensesRef, expense);
    console.log('✅ Trip expense created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating trip expense:', error);
    throw error;
  }
};

/**
 * Get expenses for a specific load event
 * @param {string} loadEventId - Load event ID
 * @param {string} companyId - Company ID (required for permissions)
 * @returns {Promise<Array>} - Array of expenses
 */
export const getExpensesByLoadEvent = async (loadEventId, companyId) => {
  try {
    if (!companyId) {
      console.warn('⚠️ companyId required for fetching expenses');
      return [];
    }
    
    const expensesRef = collection(db, 'tripExpenses');
    const q = query(
      expensesRef,
      where('companyId', '==', companyId),
      where('loadEventId', '==', loadEventId)
      // Note: orderBy removed temporarily - will be added back after index is deployed
      // orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate ? doc.data().date.toDate() : doc.data().date
    }));
    
    // Sort in memory since we can't use orderBy without index yet
    expenses.sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date);
      const dateB = b.date instanceof Date ? b.date : new Date(b.date);
      return dateB - dateA; // desc order
    });
    
    return expenses;
  } catch (error) {
    console.error('❌ Error fetching expenses:', error);
    return [];
  }
};

/**
 * Get all expenses for a company
 * @param {string} companyId - Company ID
 * @param {Object} filters - Optional filters (startDate, endDate, vehicleId, expenseType)
 * @returns {Promise<Array>} - Array of expenses
 */
export const getCompanyExpenses = async (companyId, filters = {}) => {
  try {
    const expensesRef = collection(db, 'tripExpenses');
    let q = query(
      expensesRef,
      where('companyId', '==', companyId),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    let expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Apply client-side filters
    if (filters.startDate) {
      const startTimestamp = Timestamp.fromDate(new Date(filters.startDate));
      expenses = expenses.filter(e => e.date >= startTimestamp);
    }
    
    if (filters.endDate) {
      const endTimestamp = Timestamp.fromDate(new Date(filters.endDate));
      expenses = expenses.filter(e => e.date <= endTimestamp);
    }
    
    if (filters.vehicleId) {
      expenses = expenses.filter(e => e.vehicleId === filters.vehicleId);
    }
    
    if (filters.expenseType) {
      expenses = expenses.filter(e => e.expenseType === filters.expenseType);
    }
    
    return expenses;
  } catch (error) {
    console.error('❌ Error fetching company expenses:', error);
    return [];
  }
};

/**
 * Update a trip expense
 * @param {string} expenseId - Expense ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateTripExpense = async (expenseId, updates) => {
  try {
    const expenseRef = doc(db, 'tripExpenses', expenseId);
    
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };
    
    if (updates.amount) {
      updateData.amount = parseFloat(updates.amount);
    }
    
    if (updates.date) {
      updateData.date = Timestamp.fromDate(new Date(updates.date));
    }
    
    await updateDoc(expenseRef, updateData);
    console.log('✅ Trip expense updated:', expenseId);
  } catch (error) {
    console.error('❌ Error updating trip expense:', error);
    throw error;
  }
};

/**
 * Delete a trip expense
 * @param {string} expenseId - Expense ID
 * @returns {Promise<void>}
 */
export const deleteTripExpense = async (expenseId) => {
  try {
    const expenseRef = doc(db, 'tripExpenses', expenseId);
    await deleteDoc(expenseRef);
    console.log('✅ Trip expense deleted:', expenseId);
  } catch (error) {
    console.error('❌ Error deleting trip expense:', error);
    throw error;
  }
};

/**
 * Calculate total expenses for a load event
 * @param {string} loadEventId - Load event ID
 * @returns {Promise<number>} - Total expenses
 */
export const calculateLoadEventExpenses = async (loadEventId) => {
  try {
    const expenses = await getExpensesByLoadEvent(loadEventId);
    const total = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    return total;
  } catch (error) {
    console.error('❌ Error calculating expenses:', error);
    return 0;
  }
};

/**
 * Calculate trip profitability
 * @param {string} loadEventId - Load event ID
 * @param {number} revenue - Revenue from invoice
 * @returns {Promise<Object>} - Profitability data
 */
export const calculateTripProfitability = async (loadEventId, revenue) => {
  try {
    const totalExpenses = await calculateLoadEventExpenses(loadEventId);
    const profit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return {
      revenue,
      expenses: totalExpenses,
      profit,
      profitMargin: profitMargin.toFixed(2)
    };
  } catch (error) {
    console.error('❌ Error calculating profitability:', error);
    return {
      revenue: 0,
      expenses: 0,
      profit: 0,
      profitMargin: 0
    };
  }
};
