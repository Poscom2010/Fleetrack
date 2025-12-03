/**
 * Invoice Service
 * Handles CRUD operations for invoices and invoice generation
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
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Generate next invoice number for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<string>} Generated invoice number
 */
export const generateInvoiceNumber = async (companyId) => {
  try {
    // Get company settings
    const companyRef = doc(db, 'companies', companyId);
    const companySnap = await getDoc(companyRef);
    
    if (!companySnap.exists()) {
      throw new Error('Company not found');
    }

    const company = companySnap.data();
    const prefix = company.settings?.commoditySettings?.invoicePrefix || 'INV-';
    const numberingType = company.settings?.commoditySettings?.invoiceNumbering || 'sequential';

    if (numberingType === 'date-based') {
      // Format: INV-YYYYMMDD-001
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Get invoices for today
      const todayStart = new Date(today.setHours(0, 0, 0, 0));
      const todayEnd = new Date(today.setHours(23, 59, 59, 999));
      
      const q = query(
        collection(db, 'invoices'),
        where('companyId', '==', companyId),
        where('invoiceDate', '>=', Timestamp.fromDate(todayStart)),
        where('invoiceDate', '<=', Timestamp.fromDate(todayEnd)),
        orderBy('invoiceDate', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      let dailyNumber = 1;

      if (!snapshot.empty) {
        const lastInvoice = snapshot.docs[0].data();
        const lastNumber = lastInvoice.invoiceNumber.split('-').pop();
        dailyNumber = parseInt(lastNumber) + 1;
      }

      return `${prefix}${dateStr}-${String(dailyNumber).padStart(3, '0')}`;
    } else {
      // Sequential numbering: INV-000001
      const q = query(
        collection(db, 'invoices'),
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      let nextNumber = 1;

      if (!snapshot.empty) {
        const lastInvoice = snapshot.docs[0].data();
        const lastNumber = lastInvoice.invoiceNumber.replace(prefix, '').split('-')[0];
        nextNumber = parseInt(lastNumber) + 1;
      }

      return `${prefix}${String(nextNumber).padStart(6, '0')}`;
    }
  } catch (error) {
    console.error('Error generating invoice number:', error);
    throw error;
  }
};

/**
 * Create invoice from offload event
 * @param {string} userId - ID of user creating invoice
 * @param {string} companyId - Company ID
 * @param {string} offloadEventId - Offload event ID
 * @param {Object} invoiceData - Invoice data
 * @returns {Promise<string>} Document ID of created invoice
 */
export const createInvoiceFromOffload = async (userId, companyId, offloadEventId, invoiceData) => {
  try {
    // Get offload event
    const offloadRef = doc(db, 'offloadEvents', offloadEventId);
    const offloadSnap = await getDoc(offloadRef);

    if (!offloadSnap.exists()) {
      throw new Error('Offload event not found');
    }

    const offload = offloadSnap.data();

    // Check if invoice already exists for this offload
    const existingQuery = query(
      collection(db, 'invoices'),
      where('offloadEventId', '==', offloadEventId),
      limit(1)
    );
    const existingSnap = await getDocs(existingQuery);
    
    if (!existingSnap.empty) {
      throw new Error('Invoice already exists for this offload event');
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(companyId);

    // Calculate amounts
    const unitPrice = invoiceData.unitPrice || 0;
    const subtotal = offload.offloadQuantity * unitPrice;
    const vatRate = invoiceData.vatRate || 15;
    const vatAmount = subtotal * (vatRate / 100);
    const total = subtotal + vatAmount;

    // Calculate due date
    const invoiceDate = invoiceData.invoiceDate || new Date();
    const paymentTermsDays = invoiceData.paymentTermsDays || 30;
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);

    // Get commodity type from load event
    const loadRef = doc(db, 'loadEvents', offload.loadEventId);
    const loadSnap = await getDoc(loadRef);
    const commodityType = loadSnap.exists() ? loadSnap.data().commodityType : 'diesel';
    const unit = loadSnap.exists() ? loadSnap.data().unit : 'litres';

    // Prepare document data
    const docData = {
      offloadEventId,
      companyId,
      vehicleId: offload.vehicleId,
      invoiceNumber,
      invoiceDate: Timestamp.fromDate(new Date(invoiceDate)),
      dueDate: Timestamp.fromDate(dueDate),
      
      // Customer details
      customer: offload.customer || invoiceData.customer || '',
      customerEmail: invoiceData.customerEmail || '',
      customerPhone: invoiceData.customerPhone || '',
      customerAddress: invoiceData.customerAddress || '',
      
      // Line items
      lineItems: [
        {
          description: invoiceData.description || `${commodityType} delivery`,
          quantity: offload.offloadQuantity,
          unit: unit,
          unitPrice: unitPrice,
          subtotal: subtotal
        }
      ],
      
      // Amounts
      subtotal: Number(subtotal.toFixed(2)),
      vatRate: vatRate,
      vatAmount: Number(vatAmount.toFixed(2)),
      total: Number(total.toFixed(2)),
      currency: invoiceData.currency || invoiceData.invoiceCurrency || 'ZAR',
      
      // Multi-currency support
      invoiceCurrency: invoiceData.invoiceCurrency || invoiceData.currency || 'ZAR',
      baseCurrency: invoiceData.baseCurrency || 'ZAR',
      exchangeRate: invoiceData.exchangeRate || 1,
      totalInInvoiceCurrency: invoiceData.totalInInvoiceCurrency || Number(total.toFixed(2)),
      totalInBaseCurrency: invoiceData.totalInBaseCurrency || Number(total.toFixed(2)),
      exchangeRateDate: Timestamp.now(),
      
      // Payment tracking (always in base currency for accounting)
      amountPaid: 0,
      outstandingBalance: Number((invoiceData.totalInBaseCurrency || total).toFixed(2)),
      status: 'unpaid',
      
      // Payment terms
      paymentTerms: invoiceData.paymentTerms || `Net ${paymentTermsDays} days`,
      paymentMethod: '',
      
      // Documents
      pdfUrl: null,
      deliveryDocketUrl: null,
      
      // Notes
      notes: invoiceData.notes || '',
      internalNotes: invoiceData.internalNotes || '',
      
      // Audit trail
      createdBy: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      sentAt: null,
      paidAt: null
    };

    const docRef = await addDoc(collection(db, 'invoices'), docData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

/**
 * Get a single invoice by ID
 * @param {string} invoiceId - Invoice document ID
 * @returns {Promise<Object|null>} Invoice data or null
 */
export const getInvoice = async (invoiceId) => {
  try {
    const docRef = doc(db, 'invoices', invoiceId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        invoiceDate: docSnap.data().invoiceDate?.toDate(),
        dueDate: docSnap.data().dueDate?.toDate(),
        createdAt: docSnap.data().createdAt?.toDate(),
        updatedAt: docSnap.data().updatedAt?.toDate(),
        sentAt: docSnap.data().sentAt?.toDate(),
        paidAt: docSnap.data().paidAt?.toDate()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting invoice:', error);
    throw error;
  }
};

/**
 * Get all invoices for a company (with optional filters)
 * @param {string} companyId - Company ID
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of invoices
 */
export const getInvoices = async (companyId, filters = {}) => {
  try {
    let q = query(
      collection(db, 'invoices'),
      where('companyId', '==', companyId)
    );

    // Apply status filter
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }

    // Order by date
    q = query(q, orderBy('invoiceDate', 'desc'));

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      invoiceDate: doc.data().invoiceDate?.toDate(),
      dueDate: doc.data().dueDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      sentAt: doc.data().sentAt?.toDate(),
      paidAt: doc.data().paidAt?.toDate()
    }));

    // Client-side date filtering
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      results = results.filter(invoice => invoice.invoiceDate >= startDate);
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      results = results.filter(invoice => invoice.invoiceDate <= endDate);
    }

    return results;
  } catch (error) {
    console.error('Error getting invoices:', error);
    throw error;
  }
};

/**
 * Get overdue invoices for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Array>} Array of overdue invoices
 */
export const getOverdueInvoices = async (companyId) => {
  try {
    const now = Timestamp.now();
    
    const q = query(
      collection(db, 'invoices'),
      where('companyId', '==', companyId),
      where('status', 'in', ['unpaid', 'partial']),
      where('dueDate', '<', now),
      orderBy('dueDate', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      invoiceDate: doc.data().invoiceDate?.toDate(),
      dueDate: doc.data().dueDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      sentAt: doc.data().sentAt?.toDate(),
      paidAt: doc.data().paidAt?.toDate()
    }));
  } catch (error) {
    console.error('Error getting overdue invoices:', error);
    throw error;
  }
};

/**
 * Update invoice status based on payments
 * @param {string} invoiceId - Invoice document ID
 * @param {number} paymentAmount - Amount paid
 * @returns {Promise<void>}
 */
export const updateInvoiceStatus = async (invoiceId, paymentAmount) => {
  try {
    const invoiceRef = doc(db, 'invoices', invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }

    const invoice = invoiceSnap.data();
    const newAmountPaid = invoice.amountPaid + paymentAmount;
    const newOutstanding = invoice.total - newAmountPaid;

    let newStatus;
    if (newOutstanding <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    } else if (new Date() > invoice.dueDate.toDate()) {
      newStatus = 'overdue';
    } else {
      newStatus = 'unpaid';
    }

    await updateDoc(invoiceRef, {
      amountPaid: Number(newAmountPaid.toFixed(2)),
      outstandingBalance: Number(newOutstanding.toFixed(2)),
      status: newStatus,
      paidAt: newStatus === 'paid' ? Timestamp.now() : invoice.paidAt,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating invoice status:', error);
    throw error;
  }
};

/**
 * Mark invoice as sent
 * @param {string} invoiceId - Invoice document ID
 * @returns {Promise<void>}
 */
export const markInvoiceAsSent = async (invoiceId) => {
  try {
    const docRef = doc(db, 'invoices', invoiceId);
    await updateDoc(docRef, {
      sentAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error marking invoice as sent:', error);
    throw error;
  }
};

/**
 * Update an invoice
 * @param {string} invoiceId - Invoice document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateInvoice = async (invoiceId, updates) => {
  try {
    const docRef = doc(db, 'invoices', invoiceId);
    
    // Convert dates if present
    if (updates.invoiceDate && !(updates.invoiceDate instanceof Timestamp)) {
      updates.invoiceDate = Timestamp.fromDate(new Date(updates.invoiceDate));
    }
    if (updates.dueDate && !(updates.dueDate instanceof Timestamp)) {
      updates.dueDate = Timestamp.fromDate(new Date(updates.dueDate));
    }

    await updateDoc(docRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
};

/**
 * Delete an invoice
 * @param {string} invoiceId - Invoice document ID
 * @returns {Promise<void>}
 */
export const deleteInvoice = async (invoiceId) => {
  try {
    const docRef = doc(db, 'invoices', invoiceId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
};

/**
 * Calculate invoice summary for a company
 * @param {string} companyId - Company ID
 * @returns {Promise<Object>} Invoice summary
 */
export const getInvoiceSummary = async (companyId) => {
  try {
    const invoices = await getInvoices(companyId);
    
    const summary = {
      total: invoices.length,
      unpaid: invoices.filter(inv => inv.status === 'unpaid').length,
      partial: invoices.filter(inv => inv.status === 'partial').length,
      paid: invoices.filter(inv => inv.status === 'paid').length,
      overdue: invoices.filter(inv => inv.status === 'overdue' || (inv.dueDate < new Date() && inv.status !== 'paid')).length,
      totalRevenue: invoices.reduce((sum, inv) => sum + inv.total, 0),
      totalPaid: invoices.reduce((sum, inv) => sum + inv.amountPaid, 0),
      totalOutstanding: invoices.reduce((sum, inv) => sum + inv.outstandingBalance, 0)
    };

    return summary;
  } catch (error) {
    console.error('Error getting invoice summary:', error);
    throw error;
  }
};
