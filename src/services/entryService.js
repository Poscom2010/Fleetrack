import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Daily Entries CRUD Operations

/**
 * Create a new daily entry
 * @param {string} userId - The user ID
 * @param {string} companyId - The company ID (optional for backward compatibility)
 * @param {Object} entryData - The entry data
 * @returns {Promise<string>} The created entry's ID
 */
export const createDailyEntry = async (userId, companyId, entryData) => {
  try {
    const { vehicleId, driverId, date, startLocation, endLocation, cashIn, startMileage, endMileage, notes } =
      entryData;

    // Use driverId if provided (admin creating for driver), otherwise use userId
    const actualDriverId = driverId || userId;

    // NOTE: Removed duplicate check - vehicles can have multiple trips per day
    // Each trip is a separate journey (e.g., morning delivery, afternoon pickup)

    // Calculate distance traveled
    const distanceTraveled = endMileage - startMileage;

    const docRef = await addDoc(collection(db, "dailyEntries"), {
      userId: actualDriverId, // The driver who drove
      createdBy: userId, // The user who created the entry (admin or driver)
      companyId: companyId || null,
      vehicleId,
      date: Timestamp.fromDate(new Date(date)),
      startLocation: startLocation || "",
      endLocation: endLocation || "",
      cashIn: Number(cashIn),
      startMileage: Number(startMileage),
      endMileage: Number(endMileage),
      distanceTraveled,
      notes: notes || "",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating daily entry:", error);
    throw error;
  }
};

/**
 * Check if a daily entry already exists for a user, vehicle, and date
 * @param {string} userId - The user ID
 * @param {string} vehicleId - The vehicle ID
 * @param {Date|string} date - The date to check
 * @param {string} excludeEntryId - Optional entry ID to exclude from check (for updates)
 * @returns {Promise<boolean>} - True if duplicate exists
 */
export const checkDuplicateDailyEntry = async (
  userId,
  vehicleId,
  date,
  excludeEntryId = null
) => {
  try {
    const dateObj = new Date(date);
    const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
    const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));

    const q = query(
      collection(db, "dailyEntries"),
      where("userId", "==", userId),
      where("vehicleId", "==", vehicleId),
      where("date", ">=", Timestamp.fromDate(startOfDay)),
      where("date", "<=", Timestamp.fromDate(endOfDay))
    );

    const querySnapshot = await getDocs(q);

    if (excludeEntryId) {
      // Filter out the entry being updated
      return querySnapshot.docs.some((doc) => doc.id !== excludeEntryId);
    }

    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error checking duplicate entry:", error);
    // If there's a permission error, allow the operation to proceed
    // The actual create/update will be validated by security rules
    if (error.code === 'permission-denied') {
      console.warn("Permission denied when checking duplicates - allowing operation to proceed");
      return false; // Return false to allow the operation
    }
    throw error;
  }
};

/**
 * Get all daily entries for a user
 * @param {string} userId - The user ID
 * @param {Object} filters - Optional filters (vehicleId, startDate, endDate)
 * @returns {Promise<Array>} - Array of daily entries
 */
export const getDailyEntries = async (userId, filters = {}) => {
  try {
    // Only query by userId to avoid composite index requirements
    const q = query(
      collection(db, "dailyEntries"),
      where("userId", "==", userId)
    );

    const querySnapshot = await getDocs(q);
    let entries = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      };
    });

    // Apply filters client-side
    if (filters.vehicleId) {
      entries = entries.filter((entry) => entry.vehicleId === filters.vehicleId);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      entries = entries.filter((entry) => entry.date >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      entries = entries.filter((entry) => entry.date <= endDate);
    }

    // Sort by date descending
    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

    return entries;
  } catch (error) {
    console.error("Error getting daily entries:", error);
    throw error;
  }
};

/**
 * Get all daily entries for a company (for admins/managers)
 * @param {string} companyId - The company ID
 * @param {Object} filters - Optional filters (vehicleId, startDate, endDate)
 * @returns {Promise<Array>} - Array of daily entries
 */
export const getCompanyDailyEntries = async (companyId, filters = {}) => {
  try {
    const q = query(
      collection(db, "dailyEntries"),
      where("companyId", "==", companyId)
    );

    const querySnapshot = await getDocs(q);
    let entries = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      };
    });

    // Apply filters client-side
    if (filters.vehicleId) {
      entries = entries.filter((entry) => entry.vehicleId === filters.vehicleId);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      entries = entries.filter((entry) => entry.date >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      entries = entries.filter((entry) => entry.date <= endDate);
    }

    // Sort by date descending
    entries.sort((a, b) => b.date.getTime() - a.date.getTime());

    return entries;
  } catch (error) {
    console.error("Error getting company daily entries:", error);
    throw error;
  }
};

/**
 * Get a single daily entry by ID
 * @param {string} entryId - The entry ID
 * @returns {Promise<Object>} - The daily entry
 */
export const getDailyEntry = async (entryId) => {
  try {
    const docRef = doc(db, "dailyEntries", entryId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        date: docSnap.data().date.toDate(),
        createdAt: docSnap.data().createdAt.toDate(),
        updatedAt: docSnap.data().updatedAt.toDate(),
      };
    } else {
      throw new Error("Daily entry not found");
    }
  } catch (error) {
    console.error("Error getting daily entry:", error);
    throw error;
  }
};

/**
 * Update a daily entry
 * @param {string} entryId - The entry ID
 * @param {Object} updates - The fields to update
 * @returns {Promise<void>}
 */
export const updateDailyEntry = async (entryId, updates) => {
  try {
    const docRef = doc(db, "dailyEntries", entryId);

    // If mileage values are being updated, recalculate distance
    if (
      updates.startMileage !== undefined ||
      updates.endMileage !== undefined
    ) {
      const currentEntry = await getDailyEntry(entryId);
      const startMileage =
        updates.startMileage !== undefined
          ? Number(updates.startMileage)
          : currentEntry.startMileage;
      const endMileage =
        updates.endMileage !== undefined
          ? Number(updates.endMileage)
          : currentEntry.endMileage;
      updates.distanceTraveled = endMileage - startMileage;
    }

    // Ensure startLocation and endLocation are included if provided
    if (updates.startLocation !== undefined) {
      updates.startLocation = updates.startLocation || "";
    }
    if (updates.endLocation !== undefined) {
      updates.endLocation = updates.endLocation || "";
    }

    // NOTE: Removed duplicate check - vehicles can have multiple trips per day
    // Each trip is a separate journey

    // Convert date to Timestamp if provided
    if (updates.date) {
      updates.date = Timestamp.fromDate(new Date(updates.date));
    }

    // Convert numeric fields
    if (updates.cashIn !== undefined) {
      updates.cashIn = Number(updates.cashIn);
    }
    if (updates.startMileage !== undefined) {
      updates.startMileage = Number(updates.startMileage);
    }
    if (updates.endMileage !== undefined) {
      updates.endMileage = Number(updates.endMileage);
    }

    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating daily entry:", error);
    throw error;
  }
};

/**
 * Delete a daily entry
 * @param {string} entryId - The entry ID
 * @returns {Promise<void>}
 */
export const deleteDailyEntry = async (entryId) => {
  try {
    const docRef = doc(db, "dailyEntries", entryId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting daily entry:", error);
    throw error;
  }
};

// Expense Entries CRUD Operations

/**
 * Create a new expense entry
 * @param {string} userId - The user ID
 * @param {string} companyId - The company ID (optional for backward compatibility)
 * @param {Object} expenseData - The expense data
 * @returns {Promise<string>} - The ID of the created expense
 */
export const createExpense = async (userId, companyId, expenseData) => {
  try {
    const { vehicleId, date, description, amount, category } =
      expenseData;

    const docRef = await addDoc(collection(db, "expenses"), {
      userId,
      companyId: companyId || null,
      vehicleId,
      date: Timestamp.fromDate(new Date(date)),
      description,
      amount: Number(amount),
      category: category || "Other",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating expense:", error);
    throw error;
  }
};

/**
 * Get all expenses for a user
 * @param {string} userId - The user ID
 * @param {Object} filters - Optional filters (vehicleId, startDate, endDate)
 * @returns {Promise<Array>} - Array of expenses
 */
export const getExpenses = async (userId, filters = {}) => {
  try {
    // Only query by userId to avoid composite index requirements
    const q = query(collection(db, "expenses"), where("userId", "==", userId));

    const querySnapshot = await getDocs(q);
    let expenses = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      };
    });

    // Apply filters client-side
    if (filters.vehicleId) {
      expenses = expenses.filter((expense) => expense.vehicleId === filters.vehicleId);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      expenses = expenses.filter((expense) => expense.date >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      expenses = expenses.filter((expense) => expense.date <= endDate);
    }

    // Sort by date descending
    expenses.sort((a, b) => b.date.getTime() - a.date.getTime());

    return expenses;
  } catch (error) {
    console.error("Error getting expenses:", error);
    throw error;
  }
};

/**
 * Get all expenses for a company (for admins/managers)
 * @param {string} companyId - The company ID
 * @param {Object} filters - Optional filters (vehicleId, startDate, endDate)
 * @returns {Promise<Array>} - Array of expenses
 */
export const getCompanyExpenses = async (companyId, filters = {}) => {
  try {
    const q = query(collection(db, "expenses"), where("companyId", "==", companyId));

    const querySnapshot = await getDocs(q);
    let expenses = querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
      };
    });

    // Apply filters client-side
    if (filters.vehicleId) {
      expenses = expenses.filter((expense) => expense.vehicleId === filters.vehicleId);
    }

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      expenses = expenses.filter((expense) => expense.date >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      expenses = expenses.filter((expense) => expense.date <= endDate);
    }

    // Sort by date descending
    expenses.sort((a, b) => b.date.getTime() - a.date.getTime());

    return expenses;
  } catch (error) {
    console.error("Error getting company expenses:", error);
    throw error;
  }
};

/**
 * Get a single expense by ID
 * @param {string} expenseId - The expense ID
 * @returns {Promise<Object>} - The expense
 */
export const getExpense = async (expenseId) => {
  try {
    const docRef = doc(db, "expenses", expenseId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        date: docSnap.data().date.toDate(),
        createdAt: docSnap.data().createdAt.toDate(),
        updatedAt: docSnap.data().updatedAt.toDate(),
      };
    } else {
      throw new Error("Expense not found");
    }
  } catch (error) {
    console.error("Error getting expense:", error);
    throw error;
  }
};

/**
 * Update an expense
 * @param {string} expenseId - The expense ID
 * @param {Object} updates - The fields to update
 * @returns {Promise<void>}
 */
export const updateExpense = async (expenseId, updates) => {
  try {
    const docRef = doc(db, "expenses", expenseId);

    // Convert date to Timestamp if provided
    if (updates.date) {
      updates.date = Timestamp.fromDate(new Date(updates.date));
    }

    // Convert amount to number
    if (updates.amount !== undefined) {
      updates.amount = Number(updates.amount);
    }

    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    throw error;
  }
};

/**
 * Delete an expense
 * @param {string} expenseId - The expense ID
 * @returns {Promise<void>}
 */
export const deleteExpense = async (expenseId) => {
  try {
    const docRef = doc(db, "expenses", expenseId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};
