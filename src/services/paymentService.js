/**
 * Payment Service
 * Handles CRUD operations for payments
 */

import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { updateInvoiceStatus } from './invoiceService';

/**
 * Record a payment for an invoice
 * @param {string} userId - ID of user recording payment
 * @param {string} companyId - Company ID
 * @param {string} invoiceId - Invoice ID
 * @param {Object} paymentData - Payment data
 * @returns {Promise<string>} Document ID of created payment
 */
export const recordPayment = async (userId, companyId, invoiceId, paymentData) => {
  try {
    // Validate required fields
    if (!invoiceId) throw new Error('Invoice ID is required');
    if (!paymentData.amountPaid || paymentData.amountPaid <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    // Get invoice to validate
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceSnap.data();

    // Validate payment amount doesn't exceed outstanding balance
    if (paymentData.amountPaid > invoice.outstandingBalance) {
      throw new Error('Payment amount exceeds outstanding balance');
    }

    // Prepare document data
    const docData = {
      invoiceId,
      companyId,
      paymentDate: paymentData.paymentDate instanceof Date
        ? Timestamp.fromDate(paymentData.paymentDate)
        : Timestamp.fromDate(new Date(paymentData.paymentDate || Date.now())),
      amountPaid: Number(paymentData.amountPaid),
      currency: paymentData.currency || invoice.currency || 'ZAR',
      
      // Payment method details
      paymentMethod: paymentData.paymentMethod || 'cash',
      referenceNumber: paymentData.referenceNumber || '',
      bankName: paymentData.bankName || '',
      chequeNumber: paymentData.chequeNumber || '',
      
      // Proof of payment
      proofOfPaymentUrl: paymentData.proofOfPaymentUrl || null,
      
      // Notes
      notes: paymentData.notes || '',
      
      // Audit trail
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'payments'), docData);

    // Update invoice status
    await updateInvoiceStatus(invoiceId, paymentData.amountPaid);

    return docRef.id;
  } catch (error) {
    console.error('Error recording payment:', error);
    throw error;
  }
};

/**
 * Get a single payment by ID
 * @param {string} paymentId - Payment document ID
 * @returns {Promise<Object|null>} Payment data or null
 */
export const getPayment = async (paymentId) => {
  try {
    const docRef = doc(db, 'payments', paymentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        paymentDate: docSnap.data().paymentDate?.toDate(),
        createdAt: docSnap.data().createdAt?.toDate(),
        updatedAt: docSnap.data().updatedAt?.toDate()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting payment:', error);
    throw error;
  }
};

/**
 * Get all payments for a company (with optional filters)
 * @param {string} companyId - Company ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of payments
 */
export const getPayments = async (companyId, filters = {}) => {
  try {
    let q = query(
      collection(db, 'payments'),
      where('companyId', '==', companyId)
    );

    // Apply filters
    if (filters.invoiceId) {
      q = query(q, where('invoiceId', '==', filters.invoiceId));
    }
    if (filters.paymentMethod) {
      q = query(q, where('paymentMethod', '==', filters.paymentMethod));
    }

    // Order by date
    q = query(q, orderBy('paymentDate', 'desc'));

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      paymentDate: doc.data().paymentDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));

    // Client-side date filtering
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      results = results.filter(payment => payment.paymentDate >= startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      results = results.filter(payment => payment.paymentDate <= endDate);
    }

    return results;
  } catch (error) {
    console.error('Error getting payments:', error);
    throw error;
  }
};

/**
 * Get payments for a specific invoice
 * @param {string} invoiceId - Invoice ID
 * @returns {Promise<Array>} Array of payments
 */
export const getPaymentsByInvoice = async (invoiceId) => {
  try {
    const q = query(
      collection(db, 'payments'),
      where('invoiceId', '==', invoiceId),
      orderBy('paymentDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      paymentDate: doc.data().paymentDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting payments by invoice:', error);
    throw error;
  }
};

/**
 * Update a payment
 * @param {string} paymentId - Payment document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updatePayment = async (paymentId, updates) => {
  try {
    const docRef = doc(db, 'payments', paymentId);
    
    // Convert date if present
    if (updates.paymentDate && !(updates.paymentDate instanceof Timestamp)) {
      updates.paymentDate = Timestamp.fromDate(new Date(updates.paymentDate));
    }

    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
};

/**
 * Delete a payment (and update invoice accordingly)
 * @param {string} paymentId - Payment document ID
 * @returns {Promise<void>}
 */
export const deletePayment = async (paymentId) => {
  try {
    // Get payment data first
    const payment = await getPayment(paymentId);
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Delete payment
    const docRef = doc(db, 'payments', paymentId);
    await deleteDoc(docRef);

    // Update invoice status (subtract the payment amount)
    await updateInvoiceStatus(payment.invoiceId, -payment.amountPaid);
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
};

/**
 * Get payment summary for a company
 * @param {string} companyId - Company ID
 * @param {Object} filters - Optional date filters
 * @returns {Promise<Object>} Payment summary
 */
export const getPaymentSummary = async (companyId, filters = {}) => {
  try {
    const payments = await getPayments(companyId, filters);
    
    const summary = {
      total: payments.length,
      totalAmount: payments.reduce((sum, payment) => sum + payment.amountPaid, 0),
      byMethod: {
        cash: payments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amountPaid, 0),
        eft: payments.filter(p => p.paymentMethod === 'eft').reduce((sum, p) => sum + p.amountPaid, 0),
        cheque: payments.filter(p => p.paymentMethod === 'cheque').reduce((sum, p) => sum + p.amountPaid, 0),
        creditCard: payments.filter(p => p.paymentMethod === 'creditCard').reduce((sum, p) => sum + p.amountPaid, 0)
      },
      averagePayment: payments.length > 0 
        ? payments.reduce((sum, p) => sum + p.amountPaid, 0) / payments.length 
        : 0
    };

    return summary;
  } catch (error) {
    console.error('Error getting payment summary:', error);
    throw error;
  }
};

/**
 * Get payment methods list
 * @returns {Array} Array of payment method options
 */
export const getPaymentMethods = () => {
  return [
    { value: 'cash', label: 'Cash' },
    { value: 'eft', label: 'EFT/Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'creditCard', label: 'Credit Card' },
    { value: 'debitCard', label: 'Debit Card' },
    { value: 'mobilePayment', label: 'Mobile Payment' }
  ];
};
