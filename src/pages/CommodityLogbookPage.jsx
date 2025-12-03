import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Search, Filter, Download, ChevronDown, ChevronRight, FileText, DollarSign, AlertTriangle, Trash2 } from 'lucide-react';
import Modal from '../components/common/Modal';
import ReconciliationBadge from '../components/commodity/ReconciliationBadge';
import RunningTankBalance from '../components/commodity/RunningTankBalance';
import InvoiceForm from '../components/commodity/InvoiceForm';
import PaymentForm from '../components/commodity/PaymentForm';
import InvoiceCard from '../components/commodity/InvoiceCard';
import PaymentCard from '../components/commodity/PaymentCard';
import TripExpenseForm from '../components/commodity/TripExpenseForm';
import ReturnTripForm from '../components/commodity/ReturnTripForm';
import { fetchDriverNames } from '../utils/driverUtils';
import { createInvoiceFromOffload, getInvoices } from '../services/invoiceService';
import { recordPayment, getPaymentsByInvoice } from '../services/paymentService';
import { createTripExpense, getExpensesByLoadEvent } from '../services/tripExpenseService';
import { generateInvoicePDF, shareInvoice, viewInvoicePreview } from '../utils/invoicePDFGenerator';
import { deleteTrip, canDeleteTrip, getDeletionImpact } from '../services/tripDeletionService';
import { getCurrencySymbol } from '../utils/calculations';
import toast from 'react-hot-toast';

const CommodityLogbookPage = () => {
  usePageTitle('Trip Log');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, company, userProfile } = useAuth();
  const [events, setEvents] = useState([]);
  const [vehicles, setVehicles] = useState({});
  const [drivers, setDrivers] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [offloadData, setOffloadData] = useState({});
  const [returnTripData, setReturnTripData] = useState({});
  const [invoiceData, setInvoiceData] = useState({});
  const [paymentData, setPaymentData] = useState({});
  const [expenseData, setExpenseData] = useState({});
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showReturnTripForm, setShowReturnTripForm] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [selectedOffload, setSelectedOffload] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [selectedLoadEvent, setSelectedLoadEvent] = useState(null);
  const [selectedReturnTrip, setSelectedReturnTrip] = useState(null);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tripToDelete, setTripToDelete] = useState(null);
  const [deletionImpact, setDeletionImpact] = useState(null);
  const [showAllTrips, setShowAllTrips] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vehicleId: '',
    tripStatus: '', // 'delivered', 'in_transit'
    paymentStatus: '', // 'paid', 'unpaid', 'outstanding'
    commodityType: '' // 'diesel' or 'lpGas'
  });
  // Stats removed - moved to dashboard

  useEffect(() => {
    loadEvents();
  }, [company]);

  // Handle incoming return trip state from navigation
  useEffect(() => {
    if (location.state?.openReturnTrip && location.state?.offloadEvent) {
      // Find the corresponding load event for this offload
      const offload = location.state.offloadEvent;
      const loadEvent = events.find(e => e.id === offload.loadEventId);
      
      if (loadEvent || offload.loadEventId) {
        setSelectedReturnTrip({ 
          offload, 
          loadEvent: loadEvent || { id: offload.loadEventId } 
        });
        setShowReturnTripForm(true);
        
        // Clear the state to prevent re-opening on refresh
        navigate(location.pathname, { replace: true });
      }
    }
  }, [location.state, events]);

  const loadEvents = async () => {
    if (!company?.id) return;

    try {
      setLoading(true);

      // Fetch load events
      const loadEventsRef = collection(db, 'loadEvents');
      const loadQuery = query(
        loadEventsRef,
        where('companyId', '==', company.id),
        orderBy('loadDate', 'desc')
      );
      const loadSnapshot = await getDocs(loadQuery);
      const rawLoadEvents = loadSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        eventType: 'load',
        date: doc.data().loadDate?.toDate() || new Date(doc.data().loadDate),
        quantity: doc.data().loadQuantity
      }));

      // Fetch offload events and map them to their load events
      // CRITICAL: Support MULTIPLE offloads per load (multi-customer deliveries)
      const offloadEventsRef = collection(db, 'offloadEvents');
      const offloadQuery = query(
        offloadEventsRef,
        where('companyId', '==', company.id),
        orderBy('offloadDate', 'asc')
      );
      const offloadSnapshot = await getDocs(offloadQuery);
      const offloadMap = {};
      offloadSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const offload = {
          id: doc.id,
          ...data,
          date: data.offloadDate?.toDate() || new Date(data.offloadDate),
          resolvedAt: data.resolvedAt?.toDate ? data.resolvedAt.toDate() : data.resolvedAt
        };
        
        // For consolidated loads, map offload to ALL load IDs in the consolidated group
        // This ensures trip log shows "Delivered" for all loads in a consolidated offload
        const loadIdsToMap = data.consolidatedLoadIds && data.consolidatedLoadIds.length > 0
          ? data.consolidatedLoadIds
          : [data.loadEventId];
        
        loadIdsToMap.forEach(loadId => {
          if (!offloadMap[loadId]) {
            offloadMap[loadId] = [];
          }
          // Avoid duplicates - check if this offload is already added
          if (!offloadMap[loadId].some(o => o.id === offload.id)) {
            offloadMap[loadId].push(offload);
          }
        });
      });
      setOffloadData(offloadMap);

      // Fetch invoices
      const invoices = await getInvoices(company.id);
      const invoiceMap = {};
      invoices.forEach(invoice => {
        if (invoice.offloadEventId) {
          invoiceMap[invoice.offloadEventId] = invoice;
        }
      });
      setInvoiceData(invoiceMap);

      // Fetch payments for each invoice
      const paymentsMap = {};
      for (const invoice of invoices) {
        const payments = await getPaymentsByInvoice(invoice.id);
        paymentsMap[invoice.id] = payments;
      }
      setPaymentData(paymentsMap);

      // Fetch expenses for each load event (use rawLoadEvents here)
      const expensesMap = {};
      for (const loadEvent of rawLoadEvents) {
        const expenses = await getExpensesByLoadEvent(loadEvent.id, company.id);
        expensesMap[loadEvent.id] = expenses;
      }
      setExpenseData(expensesMap);

      // Fetch return trips and map them to their offload events
      const returnTripsRef = collection(db, 'returnTrips');
      const returnQuery = query(
        returnTripsRef,
        where('companyId', '==', company.id)
      );
      const returnSnapshot = await getDocs(returnQuery);
      const returnMap = {};
      returnSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.offloadEventId) {
          returnMap[data.offloadEventId] = {
            id: doc.id,
            ...data,
            returnStartDate: data.returnStartDate?.toDate(),
            returnEndDate: data.returnEndDate?.toDate(),
            date: data.returnEndDate?.toDate() || data.createdAt?.toDate() || new Date(),
            mileageAtCustomer: data.mileageAtCustomer,
            mileageAtDepot: data.mileageAtDepot,
            returnDistance: data.returnDistance,
            fuelUsed: data.fuelUsed
          };
        }
      });
      setReturnTripData(returnMap);

      // Calculate consolidated fuel totals for vehicles with multiple active loads
      const { getConsolidatedVehicleLoads } = await import('../services/offloadEventService');
      const vehicleConsolidatedTotals = {};
      
      // Group active loads by vehicle
      const activeLoadsByVehicle = {};
      for (const load of rawLoadEvents) {
        if (load.status === 'active') {
          if (!activeLoadsByVehicle[load.vehicleId]) {
            activeLoadsByVehicle[load.vehicleId] = [];
          }
          activeLoadsByVehicle[load.vehicleId].push(load);
        }
      }
      
      // Get consolidated totals for vehicles with multiple active loads
      for (const vehicleId in activeLoadsByVehicle) {
        if (activeLoadsByVehicle[vehicleId].length > 1) {
          try {
            const consolidated = await getConsolidatedVehicleLoads(vehicleId, company.id);
            vehicleConsolidatedTotals[vehicleId] = consolidated.totalRemaining;
          } catch (error) {
            console.error(`Error getting consolidated total for vehicle ${vehicleId}:`, error);
          }
        }
      }
      
      // Update load events with consolidated totals for in-transit trips
      const loadEvents = rawLoadEvents.map(load => {
        // Only update quantity for active loads with multiple loads on same vehicle
        if (load.status === 'active' && vehicleConsolidatedTotals[load.vehicleId]) {
          return {
            ...load,
            quantity: vehicleConsolidatedTotals[load.vehicleId],
            isConsolidated: true,
            consolidatedFrom: activeLoadsByVehicle[load.vehicleId].length
          };
        }
        return load;
      });

      // Fetch drivers
      setEvents(loadEvents);

      // Stats calculation removed - moved to dashboard

      // Fetch vehicle details - store full object for odometer access
      if (loadEvents.length > 0) {
        const vehicleIds = [...new Set(loadEvents.map(e => e.vehicleId).filter(Boolean))];
        const vehiclesData = {};
        
        for (const vehicleId of vehicleIds) {
          try {
            const vehicleDoc = await getDoc(doc(db, 'vehicles', vehicleId));
            if (vehicleDoc.exists()) {
              const vehicleData = vehicleDoc.data();
              const name = vehicleData.name || 'Vehicle';
              const regNumber = vehicleData.registrationNumber || '';
              vehiclesData[vehicleId] = {
                name: regNumber ? `${name} (${regNumber})` : name,
                currentOdometer: vehicleData.currentOdometer || vehicleData.odometer || 0,
                fullData: vehicleData
              };
            } else {
              vehiclesData[vehicleId] = { name: 'Unknown Vehicle', currentOdometer: 0 };
            }
          } catch (error) {
            console.error(`Error fetching vehicle ${vehicleId}:`, error);
            vehiclesData[vehicleId] = { name: 'Unknown Vehicle', currentOdometer: 0 };
          }
        }
        setVehicles(vehiclesData);
      }

      // Fetch driver names - handle both driverId (new records) and createdBy (old records)
      if (loadEvents.length > 0) {
        // Get all possible IDs: driverId for new records, createdBy as fallback for old records
        const allUserIds = [...new Set([
          ...loadEvents.map(e => e.driverId).filter(Boolean),
          ...loadEvents.map(e => e.createdBy).filter(Boolean)
        ])];
        const driversData = await fetchDriverNames(allUserIds, company?.id);
        setDrivers(driversData);
      }

    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Failed to load trip log');
    } finally {
      setLoading(false);
    }
  };

  // Invoice handlers
  const handleGenerateInvoice = (offload, loadEvent) => {
    setSelectedOffload({ offload, loadEvent });
    setShowInvoiceForm(true);
  };

  const handleInvoiceSubmit = async (invoiceFormData) => {
    if (!selectedOffload || !user?.uid) return;

    try {
      setSubmitting(true);
      const { offload, loadEvent } = selectedOffload;

      const invoiceId = await createInvoiceFromOffload(
        user.uid,
        company.id,
        offload.id,
        invoiceFormData
      );

      toast.success('Invoice generated successfully!');
      setShowInvoiceForm(false);
      
      // Store created invoice for payment prompt
      setCreatedInvoice({
        id: invoiceId,
        customer: invoiceFormData.customer,
        totalAmount: invoiceFormData.total || (invoiceFormData.unitPrice * offload.offloadQuantity * (1 + invoiceFormData.vatRate / 100)),
        offloadId: offload.id
      });
      
      await loadEvents(); // Reload to get new invoice
      
      // Show payment prompt
      setShowPaymentPrompt(true);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'Failed to generate invoice');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleRecordPaymentNow = () => {
    setShowPaymentPrompt(false);
    setSelectedInvoice(createdInvoice);
    setShowPaymentForm(true);
  };
  
  const handleSkipPayment = () => {
    setShowPaymentPrompt(false);
    setCreatedInvoice(null);
    setSelectedOffload(null);
    toast.success('You can record payment later from the logbook');
  };

  // Payment handlers
  const handleRecordPayment = (invoice) => {
    setSelectedInvoice(invoice);
    setShowPaymentForm(true);
  };

  const handlePaymentSubmit = async (paymentFormData) => {
    if (!selectedInvoice || !user?.uid) return;

    try {
      setSubmitting(true);

      await recordPayment(
        user.uid,
        company.id,
        selectedInvoice.id,
        paymentFormData
      );

      toast.success('Payment recorded successfully!');
      setShowPaymentForm(false);
      setSelectedInvoice(null);
      await loadEvents(); // Reload to get updated invoice/payment data
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Invoice PDF handlers
  const handleDownloadPDF = (invoice) => {
    // Flatten offloadData arrays to find matching offload
    const allOffloads = Object.values(offloadData).flat();
    const offload = allOffloads.find(o => invoiceData[o.id]?.id === invoice.id);
    generateInvoicePDF(invoice, company, offload);
    toast.success('Generating PDF...');
  };

  const handleShareInvoice = (invoice) => {
    shareInvoice(invoice);
    toast.success('Opening email client...');
  };

  const handleViewInvoice = (invoice) => {
    // On mobile, show in modal. On desktop, open new tab
    const isMobile = window.innerWidth < 1024;
    
    if (isMobile) {
      setViewingInvoice(invoice);
      setShowInvoiceView(true);
    } else {
      // Flatten offloadData arrays to find matching offload
      const allOffloads = Object.values(offloadData).flat();
      const offload = allOffloads.find(o => invoiceData[o.id]?.id === invoice.id);
      viewInvoicePreview(invoice, company, offload);
    }
  };

  // Expense handlers
  const handleAddExpense = (loadEvent) => {
    setSelectedLoadEvent(loadEvent);
    setShowExpenseForm(true);
  };

  const handleExpenseSubmit = async (expenseFormDataArray) => {
    if (!selectedLoadEvent || !user?.uid) return;

    try {
      setSubmitting(true);

      // Create all expenses
      const promises = expenseFormDataArray.map(expenseData =>
        createTripExpense(user.uid, company.id, expenseData)
      );

      await Promise.all(promises);

      const count = expenseFormDataArray.length;
      toast.success(`${count} expense${count > 1 ? 's' : ''} added successfully!`);
      setShowExpenseForm(false);
      setSelectedLoadEvent(null);
      await loadEvents(); // Reload to get updated expense data
    } catch (error) {
      console.error('Error adding expenses:', error);
      toast.error(error.message || 'Failed to add expenses');
    } finally {
      setSubmitting(false);
    }
  };

  // Return trip handler
  const handleReturnTripSubmit = async () => {
    // Toast already shown in ReturnTripForm, no need to duplicate
    setShowReturnTripForm(false);
    setSelectedReturnTrip(null);
    await loadEvents(); // Reload to get updated return trip data
  };

  // Delete trip handlers
  const handleDeleteTrip = async (loadEvent) => {
    if (!canDeleteTrip(userProfile)) {
      toast.error('You do not have permission to delete trips');
      return;
    }

    try {
      setLoading(true);
      const impact = await getDeletionImpact(loadEvent.id, company.id);
      setDeletionImpact(impact);
      setTripToDelete(loadEvent);
      setShowDeleteConfirm(true);
    } catch (error) {
      console.error('Error getting deletion impact:', error);
      toast.error('Failed to analyze trip deletion impact');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;

    try {
      setSubmitting(true);
      const summary = await deleteTrip(tripToDelete.id, company.id, user.uid);
      
      toast.success(
        `Trip deleted successfully! Removed ${summary.offloadEvents} deliveries, ${summary.invoices} invoices, ${summary.payments} payments, and ${summary.returnTrips} return trips.`,
        { duration: 5000 }
      );
      
      setShowDeleteConfirm(false);
      setTripToDelete(null);
      setDeletionImpact(null);
      await loadEvents(); // Reload data
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast.error(error.message || 'Failed to delete trip');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelDeleteTrip = () => {
    setShowDeleteConfirm(false);
    setTripToDelete(null);
    setDeletionImpact(null);
  };

  const getFilteredEvents = () => {
    return events.filter(event => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        vehicles[event.vehicleId]?.name?.toLowerCase().includes(searchLower) ||
        drivers[event.driverId]?.toLowerCase().includes(searchLower) ||
        drivers[event.createdBy]?.toLowerCase().includes(searchLower) ||
        event.supplier?.toLowerCase().includes(searchLower) ||
        event.customer?.toLowerCase().includes(searchLower);

      // Date filters
      const eventDate = event.date;
      const matchesStartDate = !filters.startDate || eventDate >= new Date(filters.startDate);
      const matchesEndDate = !filters.endDate || eventDate <= new Date(filters.endDate);

      // Vehicle filter
      const matchesVehicle = !filters.vehicleId || event.vehicleId === filters.vehicleId;
      
      // Commodity filter
      const matchesCommodityType = !filters.commodityType || event.commodityType === filters.commodityType;

      // Trip status filter (delivered vs in transit)
      const offloads = offloadData[event.id] || [];
      const hasDelivery = offloads.length > 0;
      let matchesTripStatus = true;
      if (filters.tripStatus === 'delivered') {
        matchesTripStatus = hasDelivery;
      } else if (filters.tripStatus === 'in_transit') {
        matchesTripStatus = !hasDelivery;
      }

      // Payment status filter
      let matchesPaymentStatus = true;
      if (filters.paymentStatus) {
        // Calculate payment status for this trip
        let totalInvoiced = 0;
        let totalPaid = 0;
        let hasInvoice = false;
        
        offloads.forEach(offload => {
          const invoice = invoiceData[offload.id];
          if (invoice) {
            hasInvoice = true;
            const invoiceAmount = parseFloat(invoice.totalAmount) || parseFloat(invoice.total) || 0;
            totalInvoiced += invoiceAmount;
            
            const payments = paymentData[invoice.id] || [];
            const paidAmount = payments.reduce((sum, payment) => {
              const amount = parseFloat(payment.amountPaid) ||
                             parseFloat(payment.amount) ||
                             parseFloat(payment.paymentAmount) ||
                             parseFloat(payment.total) || 0;
              return sum + amount;
            }, 0);
            totalPaid += paidAmount;
          }
        });
        
        const outstanding = Math.max(0, totalInvoiced - totalPaid);
        const isPaid = hasInvoice && outstanding <= 0.01;
        const isUnpaid = !hasInvoice && hasDelivery; // Delivered but no invoice
        const hasOutstanding = hasInvoice && outstanding > 0.01; // Has invoice with balance due
        
        if (filters.paymentStatus === 'paid') {
          matchesPaymentStatus = isPaid;
        } else if (filters.paymentStatus === 'unpaid') {
          matchesPaymentStatus = isUnpaid; // No invoice yet
        } else if (filters.paymentStatus === 'outstanding') {
          matchesPaymentStatus = hasOutstanding; // Has invoice but not fully paid
        }
      }

      return matchesSearch && matchesStartDate && matchesEndDate && 
             matchesVehicle && matchesCommodityType && matchesTripStatus && matchesPaymentStatus;
    });
  };

  const toggleRow = (loadId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(loadId)) {
      newExpanded.delete(loadId);
    } else {
      newExpanded.add(loadId);
    }
    setExpandedRows(newExpanded);
  };

  const exportToCSV = () => {
    const filteredEvents = getFilteredEvents();
    const headers = ['Date', 'Vehicle', 'Driver', 'Commodity', 'Quantity', 'Route', 'Cumulative Mileage', 'Trip Status', 'Payment Status', 'Revenue', 'Expenses'];
    const rows = filteredEvents.map(event => {
      const offloads = offloadData[event.id] || [];
      const hasDelivery = offloads.length > 0;
      const offload = offloads.length > 0 ? offloads[0] : null;
      const route = offload ? `${event.supplier || 'N/A'} → ${offload.customer || 'N/A'}` : `${event.supplier || 'N/A'} → Pending`;
      const cumulativeMileage = vehicles[event.vehicleId]?.currentOdometer || 'N/A';
      
      // Calculate trip status
      const tripStatus = hasDelivery ? 'Delivered' : 'In Transit';
      
      // Calculate payment status
      let totalInvoiced = 0;
      let totalPaid = 0;
      let hasInvoice = false;
      
      offloads.forEach(off => {
        const invoice = invoiceData[off.id];
        if (invoice) {
          hasInvoice = true;
          const invoiceAmount = parseFloat(invoice.totalAmount) || parseFloat(invoice.total) || 0;
          totalInvoiced += invoiceAmount;
          
          const payments = paymentData[invoice.id] || [];
          const paidAmount = payments.reduce((sum, payment) => {
            const amount = parseFloat(payment.amountPaid) ||
                           parseFloat(payment.amount) ||
                           parseFloat(payment.paymentAmount) ||
                           parseFloat(payment.total) || 0;
            return sum + amount;
          }, 0);
          totalPaid += paidAmount;
        }
      });
      
      const outstanding = Math.max(0, totalInvoiced - totalPaid);
      const currencySymbol = getCurrencySymbol(company?.currency);
      let paymentStatus = 'N/A';
      if (!hasDelivery) {
        paymentStatus = 'Pending Delivery';
      } else if (!hasInvoice) {
        paymentStatus = 'No Invoice';
      } else if (outstanding <= 0.01) {
        paymentStatus = 'Paid';
      } else {
        paymentStatus = `Outstanding ${currencySymbol}${outstanding.toFixed(2)}`;
      }
      
      // Calculate expenses
      const tripExpenses = expenseData[event.id] || [];
      const totalExpenses = tripExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
      
      return [
        event.date.toLocaleDateString(),
        vehicles[event.vehicleId]?.name || 'N/A',
        drivers[event.driverId] || drivers[event.createdBy] || 'Unknown Driver',
        event.commodityType === 'diesel' ? 'Diesel' : 'LP Gas',
        `${event.quantity} ${event.commodityType === 'lpGas' ? 'kg' : 'L'}`,
        route,
        cumulativeMileage,
        tripStatus,
        paymentStatus,
        totalInvoiced > 0 ? `${currencySymbol}${totalInvoiced.toFixed(2)}` : '-',
        totalExpenses > 0 ? `${currencySymbol}${totalExpenses.toFixed(2)}` : '-'
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `commodity-logbook-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Logbook exported successfully');
  };

  const filteredEvents = getFilteredEvents();
  
  // Smart trip prioritization: Show critical trips first, then recent
  const TRIPS_LIMIT = 5;
  
  // Helper to determine if a trip has critical issues
  const getTripPriority = (event) => {
    const offloads = offloadData[event.id] || [];
    const hasDelivery = offloads.length > 0;
    const lastOffload = offloads.length > 0 ? offloads[offloads.length - 1] : null;
    const returnTrip = lastOffload ? returnTripData[lastOffload.id] : null;
    
    // Check for discrepancy alerts
    const hasDiscrepancy = offloads.some(o => 
      o.tankDiscrepancy && Math.abs(o.tankDiscrepancy) > 0
    );
    
    // Check for outstanding payments
    let hasOutstandingPayment = false;
    offloads.forEach(offload => {
      const invoice = invoiceData[offload.id];
      if (invoice) {
        const invoiceAmount = parseFloat(invoice.totalAmount) || parseFloat(invoice.total) || 0;
        const payments = paymentData[invoice.id] || [];
        const paidAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
        if (invoiceAmount - paidAmount > 0.01) {
          hasOutstandingPayment = true;
        }
      }
    });
    
    // Check for missing invoice (delivered but no invoice)
    const needsInvoice = hasDelivery && offloads.some(o => !invoiceData[o.id]);
    
    // Check for pending return trip
    const needsReturnTrip = hasDelivery && !returnTrip;
    
    // Check if in transit (no delivery yet)
    const inTransit = !hasDelivery;
    
    // Priority scoring (lower = higher priority)
    if (hasDiscrepancy) return 1; // Highest priority - needs investigation
    if (inTransit) return 2; // In transit - active trip
    if (hasOutstandingPayment) return 3; // Money owed
    if (needsReturnTrip) return 4; // Pending return
    if (needsInvoice) return 5; // Needs invoicing
    return 10; // Normal completed trip
  };
  
  // Sort events: critical issues first, then by date (most recent)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const priorityA = getTripPriority(a);
    const priorityB = getTripPriority(b);
    
    // If same priority, sort by date (most recent first)
    if (priorityA === priorityB) {
      return (b.date?.getTime() || 0) - (a.date?.getTime() || 0);
    }
    return priorityA - priorityB;
  });
  
  const displayedEvents = showAllTrips ? sortedEvents : sortedEvents.slice(0, TRIPS_LIMIT);
  const hasMoreTrips = sortedEvents.length > TRIPS_LIMIT;
  
  // Count critical trips that would be hidden
  const criticalTripsCount = sortedEvents.slice(TRIPS_LIMIT).filter(e => getTripPriority(e) < 10).length;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-baltic-500 to-baltic-600 
                        flex items-center justify-center text-white text-2xl shadow-lg">
            📋
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-baltic-900 dark:text-white">
              Trip Log
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Complete history of all load and delivery events
            </p>
          </div>
        </div>

        <button
          onClick={exportToCSV}
          className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-white border-2 border-baltic-500 text-baltic-600 
                   hover:bg-baltic-50 font-semibold rounded-xl shadow-lg
                   transition-all duration-300 transform hover:scale-105
                   flex items-center justify-center gap-2"
        >
          <Download size={20} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Stats Cards removed - moved to dashboard */}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by vehicle, driver, supplier, or customer..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setExpandedRows(new Set()); // Close all expanded rows when searching
              }}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-baltic-500 focus:border-baltic-500"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors
                     ${showFilters 
                       ? 'bg-baltic-500 text-white' 
                       : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            <Filter size={20} />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters({ ...filters, startDate: e.target.value });
                  setExpandedRows(new Set());
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-baltic-500 focus:border-baltic-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters({ ...filters, endDate: e.target.value });
                  setExpandedRows(new Set());
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-baltic-500 focus:border-baltic-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Trip Status</label>
              <select
                value={filters.tripStatus}
                onChange={(e) => {
                  setFilters({ ...filters, tripStatus: e.target.value });
                  setExpandedRows(new Set());
                  setShowAllTrips(false);
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-baltic-500 focus:border-baltic-500"
              >
                <option value="">All Trips</option>
                <option value="delivered">✓ Delivered</option>
                <option value="in_transit">🚛 In Transit</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => {
                  setFilters({ ...filters, paymentStatus: e.target.value });
                  setExpandedRows(new Set());
                  setShowAllTrips(false);
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-baltic-500 focus:border-baltic-500"
              >
                <option value="">All Payments</option>
                <option value="paid">✓ Paid</option>
                <option value="outstanding">⚠️ Outstanding Balance</option>
                <option value="unpaid">❌ No Invoice</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Commodity</label>
              <select
                value={filters.commodityType}
                onChange={(e) => {
                  setFilters({ ...filters, commodityType: e.target.value });
                  setExpandedRows(new Set());
                  setShowAllTrips(false);
                }}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-baltic-500 focus:border-baltic-500"
              >
                <option value="">All Commodities</option>
                <option value="diesel">⛽ Diesel</option>
                <option value="lpGas">🔥 LP Gas</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-baltic-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No events found</p>
          </div>
        ) : (
        <>
        {/* Mobile Card View */}
        <div className="block lg:hidden space-y-3">
          {displayedEvents.map((loadEvent) => {
            const isExpanded = expandedRows.has(loadEvent.id);
            const offloads = offloadData[loadEvent.id] || [];
            const hasDelivery = offloads.length > 0;
            const lastOffload = offloads.length > 0 ? offloads[offloads.length - 1] : null;
            const returnTrip = lastOffload ? returnTripData[lastOffload.id] : null;
            const tripExpenses = expenseData[loadEvent.id] || [];
            const totalExpenses = tripExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
            
            let totalInvoiced = 0;
            let totalPaid = 0;
            let allPaid = true;
            
            offloads.forEach(offload => {
              const invoice = invoiceData[offload.id];
              if (invoice) {
                const invoiceAmount = parseFloat(invoice.totalAmount) || parseFloat(invoice.total) || 0;
                totalInvoiced += invoiceAmount;
                const payments = paymentData[invoice.id] || [];
                const paidAmount = payments.reduce((sum, payment) => sum + (parseFloat(payment.amountPaid) || 0), 0);
                totalPaid += paidAmount;
                if (!(invoice.status === 'paid' || paidAmount >= invoiceAmount - 0.01)) {
                  allPaid = false;
                }
              }
            });
            
            const outstanding = Math.max(0, totalInvoiced - totalPaid);
            const hasUnresolvedIssues = offloads.some(offload => 
              !offload.resolvedAt && (offload.reconciliationStatus === 'minor_variance' || offload.reconciliationStatus === 'major_variance')
            );
            
            const vehicle = vehicles[loadEvent.vehicleId];
            const driver = drivers[loadEvent.driverId];
            
            return (
              <div key={loadEvent.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                {/* Header */}
                <div className="flex items-start justify-between mb-2 pb-2 border-b border-gray-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-baltic-900">
                        {vehicle?.name || loadEvent.vehicleId}
                      </p>
                      <span className="text-xs text-gray-500">
                        {new Date(loadEvent.loadDate.toDate ? loadEvent.loadDate.toDate() : loadEvent.loadDate).toLocaleDateString('en-ZA')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{driver?.fullName || loadEvent.driverId}</p>
                  </div>
                  
                  {/* Status badges */}
                  <div className="flex flex-col gap-1 items-end">
                    {hasDelivery ? (
                      <span className="px-2 py-0.5 bg-success/20 text-success text-xs font-semibold rounded">
                        ✓ Delivered
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-warning/20 text-warning text-xs font-semibold rounded">
                        ⏳ In Transit
                      </span>
                    )}
                    {hasUnresolvedIssues && (
                      <span className="px-2 py-0.5 bg-danger/20 text-danger text-xs font-semibold rounded">
                        ⚠ Issue
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Key Info Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <p className="text-gray-500">Commodity</p>
                    <p className="font-semibold text-gray-900">
                      {loadEvent.commodityType === 'diesel' ? '⛽ Diesel' : '🔥 LP Gas'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Loaded</p>
                    <p className="font-semibold text-gray-900">
                      {(loadEvent.quantityLoaded || 0).toLocaleString()} {loadEvent.commodityType === 'diesel' ? 'L' : 'kg'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Supplier</p>
                    <p className="font-semibold text-gray-900 truncate">{loadEvent.supplier || 'N/A'}</p>
                  </div>
                  {hasDelivery && (
                    <div>
                      <p className="text-gray-500">Customers</p>
                      <p className="font-semibold text-gray-900">{offloads.length}</p>
                    </div>
                  )}
                </div>
                
                {/* Financial Summary */}
                {totalInvoiced > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-xs bg-gray-50 rounded p-2 mb-2">
                    <div>
                      <p className="text-gray-500">Revenue</p>
                      <p className="font-bold text-success">{getCurrencySymbol(company?.currency)} {totalInvoiced.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Paid</p>
                      <p className="font-bold text-gray-900">{getCurrencySymbol(company?.currency)} {totalPaid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Due</p>
                      <p className="font-bold text-warning">{getCurrencySymbol(company?.currency)} {outstanding.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                {/* Expand button if has details */}
                {(hasDelivery || returnTrip) && (
                  <button
                    onClick={() => toggleRow(loadEvent.id)}
                    className="w-full py-2 text-xs font-medium text-baltic-600 hover:text-baltic-700 hover:bg-baltic-50 rounded transition flex items-center justify-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronDown size={16} />
                        Hide Details
                      </>
                    ) : (
                      <>
                        <ChevronRight size={16} />
                        View {offloads.length} Delivery Details
                      </>
                    )}
                  </button>
                )}
                
                {/* Expanded Details with ALL Actions */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-gray-200 space-y-3">
                    {/* Deliveries Section */}
                    {offloads.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-700 mb-2">📦 Deliveries ({offloads.length})</p>
                        <div className="space-y-2">
                          {offloads.map((offload) => {
                            const invoice = invoiceData[offload.id];
                            const payments = invoice ? (paymentData[invoice.id] || []) : [];
                            const paidAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
                            const invoiceAmount = invoice ? (parseFloat(invoice.totalAmount) || parseFloat(invoice.total) || 0) : 0;
                            const isInvoicePaid = invoice && (invoice.status === 'paid' || paidAmount >= invoiceAmount - 0.01);
                            
                            return (
                              <div key={offload.id} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                                {/* Customer & Status */}
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-semibold text-gray-900 text-sm">{offload.customerName}</p>
                                  <ReconciliationBadge status={offload.reconciliationStatus} />
                                </div>
                                
                                {/* Delivery Info */}
                                <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                                  <div>
                                    <span className="text-gray-500">Delivered:</span>
                                    <span className="ml-1 font-medium text-gray-900">{(offload.quantityOffloaded || 0).toLocaleString()} {loadEvent.commodityType === 'diesel' ? 'L' : 'kg'}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Variance:</span>
                                    <span className={`ml-1 font-medium ${Math.abs(offload.variancePercentage || 0) > 3 ? 'text-danger' : 'text-success'}`}>
                                      {(offload.variancePercentage || 0).toFixed(2)}%
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Invoice Status & Actions */}
                                <div className="border-t border-gray-200 pt-2">
                                  {invoice ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600">Invoice #{invoice.invoiceNumber}</span>
                                        <span className={`text-xs font-semibold ${isInvoicePaid ? 'text-success' : 'text-warning'}`}>
                                          {isInvoicePaid ? '✓ Paid' : `${getCurrencySymbol(company?.currency)} ${(invoiceAmount - paidAmount).toFixed(0)} due`}
                                        </span>
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleViewInvoice(invoice)}
                                          className="flex-1 px-2 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium"
                                        >
                                          👁 View
                                        </button>
                                        <button
                                          onClick={() => handleDownloadPDF(invoice)}
                                          className="flex-1 px-2 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-xs font-medium"
                                        >
                                          📄 PDF
                                        </button>
                                        {!isInvoicePaid && (
                                          <button
                                            onClick={() => {
                                              setSelectedInvoice(invoice);
                                              setShowPaymentForm(true);
                                            }}
                                            className="flex-1 px-2 py-1.5 bg-success hover:bg-success/90 text-white rounded text-xs font-medium"
                                          >
                                            💰 Pay
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setSelectedOffload(offload);
                                        setShowInvoiceForm(true);
                                      }}
                                      className="w-full px-3 py-2 bg-baltic-500 hover:bg-baltic-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                                    >
                                      📝 Create Invoice
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Return Trip Section */}
                    {lastOffload && (
                      <div className="border-t border-gray-200 pt-3">
                        <p className="text-xs font-bold text-gray-700 mb-2">🔄 Return Trip</p>
                        {returnTrip ? (
                          <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-500">Return Date:</span>
                                <p className="font-medium text-gray-900">
                                  {new Date(returnTrip.returnDate?.toDate ? returnTrip.returnDate.toDate() : returnTrip.returnDate).toLocaleDateString('en-ZA')}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-500">Odometer:</span>
                                <p className="font-medium text-gray-900">{(returnTrip.endOdometer || 0).toLocaleString()} km</p>
                              </div>
                              {returnTrip.returnQuantity > 0 && (
                                <div className="col-span-2">
                                  <span className="text-gray-500">Returned:</span>
                                  <p className="font-medium text-warning">{returnTrip.returnQuantity} {loadEvent.commodityType === 'diesel' ? 'L' : 'kg'}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedReturnTrip({ offload: lastOffload, loadEvent });
                              setShowReturnTripForm(true);
                            }}
                            className="w-full px-3 py-2 bg-gradient-to-r from-baltic-500 to-blue-500 hover:from-baltic-600 hover:to-blue-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                          >
                            🔄 Capture Return Trip
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Trip Expenses Section */}
                    {tripExpenses.length > 0 && (
                      <div className="border-t border-gray-200 pt-3">
                        <p className="text-xs font-bold text-gray-700 mb-2">💸 Expenses ({tripExpenses.length})</p>
                        <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">Total Expenses:</span>
                            <span className="text-sm font-bold text-danger">{getCurrencySymbol(company?.currency)} {totalExpenses.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Delete Action */}
                    {canDeleteTrip(userProfile) && (
                      <div className="border-t border-gray-200 pt-3">
                        <button
                          onClick={() => handleDeleteTrip(loadEvent)}
                          className="w-full px-3 py-2 bg-danger/10 hover:bg-danger/20 text-danger rounded-lg text-xs font-medium flex items-center justify-center gap-1 border border-danger/30"
                        >
                          🗑️ Delete Trip
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-baltic-50 border-b-2 border-baltic-200">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-bold text-baltic-900"></th>
                <th className="px-3 py-3 text-left text-sm font-bold text-baltic-900">Date & Vehicle</th>
                <th className="px-3 py-3 text-left text-sm font-bold text-baltic-900">Load Details</th>
                <th className="px-3 py-3 text-left text-sm font-bold text-baltic-900">Route</th>
                <th className="px-3 py-3 text-right text-sm font-bold text-baltic-900">Quantity</th>
                <th className="px-3 py-3 text-right text-sm font-bold text-baltic-900">Cumulative Mileage</th>
                <th className="px-3 py-3 text-right text-sm font-bold text-baltic-900">Financial</th>
                <th className="px-3 py-3 text-left text-sm font-bold text-baltic-900">Status</th>
                <th className="px-3 py-3 text-center text-sm font-bold text-baltic-900">Return Trip</th>
                <th className="px-3 py-3 text-center text-sm font-bold text-baltic-900">Alerts</th>
                {canDeleteTrip(userProfile) && (
                  <th className="px-3 py-3 text-center text-sm font-bold text-baltic-900">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayedEvents.map((loadEvent) => {
                const isExpanded = expandedRows.has(loadEvent.id);
                // CRITICAL: offloadData now stores ARRAY of offloads per load
                const offloads = offloadData[loadEvent.id] || [];
                const hasDelivery = offloads.length > 0;
                
                // Get return trip from the LAST offload
                const lastOffload = offloads.length > 0 ? offloads[offloads.length - 1] : null;
                const returnTrip = lastOffload ? returnTripData[lastOffload.id] : null;
                
                // Calculate total expenses for this trip
                const tripExpenses = expenseData[loadEvent.id] || [];
                const totalExpenses = tripExpenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
                
                // Calculate revenue from ALL deliveries/invoices for this load
                let totalInvoiced = 0;
                let totalPaid = 0;
                let allPaid = true;
                
                offloads.forEach(offload => {
                  const invoice = invoiceData[offload.id];
                  if (invoice) {
                    const invoiceAmount = parseFloat(invoice.totalAmount) || parseFloat(invoice.total) || 0;
                    totalInvoiced += invoiceAmount;
                    
                    const payments = paymentData[invoice.id] || [];
                    const paidAmount = payments.reduce((sum, payment) => {
                      const amount = parseFloat(payment.amountPaid) ||
                                     parseFloat(payment.amount) ||
                                     parseFloat(payment.paymentAmount) ||
                                     parseFloat(payment.total) || 0;
                      return sum + amount;
                    }, 0);
                    totalPaid += paidAmount;
                    
                    const invoiceStatus = invoice.status || 'unpaid';
                    const isInvoicePaid = invoiceStatus === 'paid' ||
                                          invoiceStatus === 'completed' ||
                                          paidAmount >= invoiceAmount - 0.01;
                    if (!isInvoicePaid) {
                      allPaid = false;
                    }
                  }
                });
                
                const outstanding = Math.max(0, totalInvoiced - totalPaid);
                const isPaid = allPaid && outstanding <= 0.01;
                
                // Check if there are any flagged issues (check ALL offloads)
                const hasUnresolvedIssues = offloads.some(offload => 
                  !offload.resolvedAt && (
                    (offload.reconciliationStatus === 'minor_variance' || offload.reconciliationStatus === 'major_variance') ||
                    (Math.abs(offload.variancePercentage || 0) > 1) ||
                    (offload.tankVariance && offload.tankVariance > 0) ||
                    (offload.quantityVariance && offload.quantityVariance > 0)
                  )
                );
                
                // Check if issue was resolved
                const isResolved = offloads.some(offload => offload.resolvedAt && offload.resolution);
                
                return (
                  <React.Fragment key={loadEvent.id}>
                    {/* Main Load Row */}
                    <tr className="hover:bg-gray-50 transition-colors cursor-pointer">
                      {/* Expand/Collapse Icon */}
                      <td className="px-2 py-4" onClick={() => toggleRow(loadEvent.id)}>
                        {hasDelivery || returnTrip ? (
                          isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-baltic-500" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400" />
                            )
                          ) : (
                            <span className="w-5 h-5 inline-block"></span>
                          )}
                        </td>
                        
                        {/* Date & Vehicle Combined */}
                        <td className="px-3 py-3" onClick={() => toggleRow(loadEvent.id)}>
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold text-gray-900">
                              {loadEvent.date.toLocaleString('en-ZA', { 
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="text-xs text-gray-600">
                              {vehicles[loadEvent.vehicleId]?.name || 'N/A'}
                            </div>
                          </div>
                        </td>
                        
                        {/* Driver & Commodity Combined */}
                        <td className="px-3 py-3" onClick={() => toggleRow(loadEvent.id)}>
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-gray-900">
                              {drivers[loadEvent.driverId] || drivers[loadEvent.createdBy] || 'Unknown'}
                            </div>
                            <div className="text-xs text-gray-600">
                              {loadEvent.commodityType === 'diesel' ? '⛽ Diesel' : '🔥 LP Gas'}
                            </div>
                          </div>
                        </td>
                        
                        {/* Route (Supplier → Customer) */}
                        <td className="px-3 py-3" onClick={() => toggleRow(loadEvent.id)}>
                          <div className="text-sm text-gray-900">
                            {offloads.length > 0 ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">{loadEvent.supplier || 'N/A'}</span>
                                <span className="text-xs text-gray-400">→</span>
                                <span className="text-xs font-medium text-baltic-700">
                                  {offloads.length === 1 ? offloads[0].customer : `${offloads.length} customers`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">
                                {loadEvent.supplier || 'N/A'} → Pending
                              </span>
                            )}
                          </div>
                        </td>
                        
                        {/* Quantity & Supplier Combined */}
                        <td className="px-3 py-3" onClick={() => toggleRow(loadEvent.id)}>
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold text-gray-900 text-right flex items-center justify-end gap-1">
                              <span>{parseFloat(loadEvent.quantity).toLocaleString()} {loadEvent.commodityType === 'lpGas' ? 'kg' : 'L'}</span>
                              {loadEvent.isConsolidated && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-warning/20 text-warning border border-warning/30" title={`Combined from ${loadEvent.consolidatedFrom} loads`}>
                                  {loadEvent.consolidatedFrom}x
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 text-right">
                              {loadEvent.supplier || 'N/A'}
                            </div>
                          </div>
                        </td>
                        
                        {/* Cumulative Mileage */}
                        <td className="px-3 py-3" onClick={() => toggleRow(loadEvent.id)}>
                          <div className="text-right">
                            <div className="text-sm font-bold text-baltic-700">
                              {vehicles[loadEvent.vehicleId]?.currentOdometer 
                                ? `${vehicles[loadEvent.vehicleId].currentOdometer.toLocaleString()} km`
                                : '-'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Total mileage
                            </div>
                          </div>
                        </td>
                        
                        {/* Financial (Expenses & Revenue Combined) */}
                        <td className="px-3 py-3" onClick={() => toggleRow(loadEvent.id)}>
                          <div className="space-y-1">
                            {/* Revenue */}
                            {totalInvoiced > 0 ? (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-gray-500">Rev:</span>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-success">
                                    {getCurrencySymbol(company?.currency)} {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                  </div>
                                  {isPaid ? (
                                    <div className="text-xs text-success font-semibold">✓ Paid</div>
                                  ) : outstanding > 0.01 ? (
                                    <div className="text-xs text-danger font-medium">
                                      Due: {getCurrencySymbol(company?.currency)} {outstanding.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs text-gray-500">Rev:</span>
                                <span className="text-xs text-gray-400">-</span>
                              </div>
                            )}
                            {/* Expenses */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-gray-500">Exp:</span>
                              {totalExpenses > 0 ? (
                                <span className="text-sm font-semibold text-warning">
                                  {getCurrencySymbol(company?.currency)} {totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">{getCurrencySymbol(company?.currency)} 0</span>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* Trip Status */}
                        <td className="px-3 py-3" onClick={() => toggleRow(loadEvent.id)}>
                          {hasDelivery ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-success/20 text-success">
                              ✓ Delivered
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                              🚛 In Transit
                            </span>
                          )}
                        </td>
                        
                        {/* Return Trip Column */}
                        <td className="px-3 py-3 text-center" onClick={() => toggleRow(loadEvent.id)}>
                          {hasDelivery && !returnTrip ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-warning/20 text-warning">
                              ⚠️ Pending
                            </span>
                          ) : returnTrip ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-success/20 text-success">
                              ✓ Done
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </td>
                        
                        {/* Alerts Column */}
                        <td className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {hasUnresolvedIssues && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Find the offload with the issue to navigate to reconciliation
                                  const offloadWithIssue = offloads.find(offload => 
                                    !offload.resolvedAt && (
                                      (offload.reconciliationStatus === 'minor_variance' || offload.reconciliationStatus === 'major_variance') ||
                                      (Math.abs(offload.variancePercentage || 0) > 1) ||
                                      (offload.tankVariance && offload.tankVariance > 0) ||
                                      (offload.quantityVariance && offload.quantityVariance > 0)
                                    )
                                  );
                                  if (offloadWithIssue) {
                                    navigate(`/commodity/reconciliation?offloadId=${offloadWithIssue.id}&investigate=true`);
                                  }
                                }}
                                className="relative group cursor-pointer hover:scale-110 transition-transform"
                                title="Click to investigate discrepancy"
                              >
                                <AlertTriangle className="w-5 h-5 text-danger animate-pulse" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                  <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                    Click to investigate
                                  </div>
                                </div>
                              </button>
                            )}
                            {isResolved && (
                              <div className="relative group" onClick={() => toggleRow(loadEvent.id)}>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/20 text-success">
                                  ✓
                                </span>
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                  <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                                    Resolved
                                  </div>
                                </div>
                              </div>
                            )}
                            {!hasUnresolvedIssues && !isResolved && (
                              <span className="text-gray-300" onClick={() => toggleRow(loadEvent.id)}>-</span>
                            )}
                          </div>
                        </td>
                        
                        {/* Delete Button - Only for admins/managers */}
                        {canDeleteTrip(userProfile) && (
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTrip(loadEvent);
                              }}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                              title="Delete Trip"
                            >
                              <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400" />
                            </button>
                          </td>
                        )}
                      </tr>
                      
                      {/* Expanded Details Row */}
                      {isExpanded && (hasDelivery || returnTrip) && (
                        <tr key={`${loadEvent.id}-details`} className="bg-gray-50">
                          <td colSpan={canDeleteTrip(userProfile) ? "9" : "8"} className="px-4 py-3">
                            <div className="ml-8 space-y-3">
                              {/* Running Tank Balance */}
                              {hasDelivery && (
                                <RunningTankBalance 
                                  loadEvent={loadEvent}
                                  offloads={offloads}
                                  unit={loadEvent.commodityType === 'lpGas' ? 'kg' : 'L'}
                                />
                              )}
                              
                              {/* Delivery Details - Now shown in Financial section below */}
                              {false && (
                                <div className="bg-white rounded-lg p-2 border border-gray-200">
                                  <div className="flex items-center gap-4 text-xs">
                                    <div className="font-bold text-success flex items-center gap-1">
                                      <span>⬇️</span> Delivery:
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-gray-600">Date:</span>
                                      <span className="text-gray-900 font-medium">
                                        {offload.date.toLocaleString('en-ZA', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-gray-600">Customer:</span>
                                      <span className="text-gray-900 font-medium">{offload.customer || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-gray-600">Offloaded:</span>
                                      <span className="text-gray-900 font-semibold">
                                        {parseFloat(offload.offloadQuantity).toLocaleString()} {loadEvent.commodityType === 'lpGas' ? 'kg' : 'L'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-gray-600">Status:</span>
                                      <div className="flex items-center gap-1.5">
                                        {offload.reconciliationStatus ? (
                                          <ReconciliationBadge status={offload.reconciliationStatus} size="sm" />
                                        ) : (
                                          <span className="text-gray-500">-</span>
                                        )}
                                        {isResolved && (
                                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-success text-white">
                                            ✓ Resolved
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Variance Details - Compact */}
                                  {(offload.variance !== undefined || offload.tankVariance !== undefined || offload.quantityVariance !== undefined) && (
                                    <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                                      <div className="flex items-center gap-3 text-[10px]">
                                        {/* Load vs Offload Variance */}
                                        {offload.variance !== undefined && (
                                          <div key="load-offload-variance" className="flex items-center gap-1.5">
                                            <span className="text-gray-600 font-medium">📊</span>
                                            <span className={`font-semibold ${
                                              Math.abs(offload.variancePercentage || 0) > 3 ? 'text-danger' : 
                                              Math.abs(offload.variancePercentage || 0) > 1 ? 'text-warning' : 
                                              'text-success'
                                            }`}>
                                              {offload.variance >= 0 ? '+' : ''}{offload.variance} {loadEvent.commodityType === 'lpGas' ? 'kg' : 'L'}
                                              <span className="text-[9px] ml-0.5">({offload.variancePercentage >= 0 ? '+' : ''}{offload.variancePercentage?.toFixed(1)}%)</span>
                                            </span>
                                          </div>
                                        )}

                                        {/* Tank Reading Variance */}
                                        {offload.tankVariance !== undefined && offload.tankVariance > 0 && (
                                          <div key="tank-variance" className="flex items-center gap-1.5">
                                            <span className="text-gray-600 font-medium">⛽</span>
                                            <span className={`font-semibold ${
                                              (offload.tankVariancePercent || 0) > 3 ? 'text-danger' : 
                                              (offload.tankVariancePercent || 0) > 1 ? 'text-warning' : 
                                              'text-success'
                                            }`}>
                                              {offload.tankVariance > 0 ? '+' : ''}{offload.tankVariance} {loadEvent.commodityType === 'lpGas' ? 'kg' : 'L'}
                                              <span className="text-[9px] ml-0.5">Tank</span>
                                            </span>
                                          </div>
                                        )}

                                        {/* Quantity Mismatch */}
                                        {offload.quantityVariance !== undefined && offload.quantityVariance > 0 && (
                                          <div key="quantity-variance" className="flex items-center gap-1.5">
                                            <span className="text-gray-600 font-medium">📏</span>
                                            <span className={`font-semibold ${
                                              (offload.quantityVariancePercent || 0) > 3 ? 'text-danger' : 
                                              (offload.quantityVariancePercent || 0) > 1 ? 'text-warning' : 
                                              'text-success'
                                            }`}>
                                              {offload.quantityVariance > 0 ? '+' : ''}{offload.quantityVariance} {loadEvent.commodityType === 'lpGas' ? 'kg' : 'L'}
                                              <span className="text-[9px] ml-0.5">Qty</span>
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      {/* Discrepancy Notes */}
                                      {offload.discrepancyNotes && (
                                        <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                                          <p className="text-xs font-semibold text-gray-700 mb-1">📝 Notes:</p>
                                          <p className="text-xs text-gray-600">{offload.discrepancyNotes}</p>
                                        </div>
                                      )}
                                      
                                      {/* Resolution Details */}
                                      {isResolved && offload.resolution && (
                                        <div className="mt-3 p-3 bg-success/10 rounded-lg border-2 border-success/30">
                                          <div className="flex items-center gap-2 mb-2">
                                            <span className="text-success text-lg">✓</span>
                                            <p className="text-xs font-bold text-success">Issue Resolved</p>
                                          </div>
                                          <div className="space-y-2">
                                            {offload.rootCause && (
                                              <div>
                                                <p className="text-xs font-semibold text-gray-700">Root Cause:</p>
                                                <p className="text-xs text-gray-600">{offload.rootCause}</p>
                                              </div>
                                            )}
                                            <div>
                                              <p className="text-xs font-semibold text-gray-700">Resolution:</p>
                                              <p className="text-xs text-gray-600">{offload.resolution}</p>
                                            </div>
                                            {offload.resolvedAt && (
                                              <p className="text-xs text-gray-500 mt-2">
                                                Resolved on {offload.resolvedAt instanceof Date ? offload.resolvedAt.toLocaleString('en-ZA') : new Date(offload.resolvedAt).toLocaleString('en-ZA')}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Discrepancy Type */}
                                      {offload.discrepancyType && offload.discrepancyType !== 'none' && (
                                        <div className="mt-2">
                                          <p className="text-xs text-gray-600">
                                            <span className="font-semibold">Type:</span> {offload.discrepancyType.replace(/([A-Z])/g, ' $1').trim()}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Trip Expenses, Financial, and Return Trip - Three Column Layout */}
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                              {/* Trip Expenses */}
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-xs font-bold text-warning flex items-center gap-1">
                                    <span>💰</span> Trip Expenses
                                  </h4>
                                  <button
                                    onClick={() => handleAddExpense(loadEvent)}
                                    className="px-2 py-1 bg-warning hover:bg-warning/90 text-white rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                                  >
                                    <span>+</span> Add
                                  </button>
                                </div>
                                
                                {expenseData[loadEvent.id] && expenseData[loadEvent.id].length > 0 ? (
                                  <div className="space-y-1.5">
                                    {expenseData[loadEvent.id].map(expense => (
                                      <div key={expense.id} className="flex items-center justify-between p-1.5 bg-gray-50 rounded border border-gray-200">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-sm">
                                            {expense.expenseType === 'fuel' ? '⛽' : 
                                             expense.expenseType === 'toll' ? '🛣️' : 
                                             expense.expenseType === 'maintenance' ? '🔧' : 
                                             expense.expenseType === 'parking' ? '🅿️' : '📝'}
                                          </span>
                                          <div>
                                            <p className="text-xs font-semibold text-gray-900">
                                              {expense.expenseType.charAt(0).toUpperCase() + expense.expenseType.slice(1)}
                                            </p>
                                            {expense.description && (
                                              <p className="text-[10px] text-gray-600">{expense.description}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs font-bold text-gray-900">{getCurrencySymbol(company?.currency)} {expense.amount.toFixed(2)}</p>
                                          <p className="text-[10px] text-gray-500">
                                            {expense.date?.toDate ? expense.date.toDate().toLocaleDateString('en-ZA') : new Date(expense.date).toLocaleDateString('en-ZA')}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                    <div className="pt-1.5 border-t border-gray-200 flex justify-between items-center">
                                      <span className="text-xs font-semibold text-gray-700">Total</span>
                                      <span className="text-xs font-bold text-warning">
                                        {getCurrencySymbol(company?.currency)} {expenseData[loadEvent.id].reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500 text-center py-2">No expenses</p>
                                )}
                              </div>
                              
                              {/* Financial Details - Multi-Delivery Support */}
                              {offloads.length > 0 && (
                                <div className="bg-white rounded-lg p-3 border border-gray-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-success flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" />
                                      Financial ({offloads.length} {offloads.length === 1 ? 'Delivery' : 'Deliveries'})
                                    </h4>
                                    {totalInvoiced > 0 && (
                                      <span className="text-xs font-bold text-success">
                                        Total: {getCurrencySymbol(company?.currency)} {totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* List ALL deliveries/invoices */}
                                  <div className="space-y-2">
                                    {offloads.map((offload, index) => {
                                      const invoice = invoiceData[offload.id];
                                      const payments = invoice ? (paymentData[invoice.id] || []) : [];
                                      const invoiceAmount = invoice ? (parseFloat(invoice.totalAmount) || parseFloat(invoice.total) || 0) : 0;
                                      const paidAmount = payments.reduce((sum, payment) => {
                                        return sum + (parseFloat(payment.amountPaid) || parseFloat(payment.amount) || 0);
                                      }, 0);
                                      const isInvoicePaid = invoice?.status === 'paid' || paidAmount >= invoiceAmount - 0.01;
                                      
                                      return (
                                        <div key={offload.id} className="p-2 bg-gray-50 rounded border border-gray-200">
                                          <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="flex-1">
                                              <p className="text-xs font-semibold text-gray-900">
                                                #{index + 1} {offload.customer}
                                              </p>
                                              <p className="text-[10px] text-gray-600">
                                                {offload.offloadQuantity?.toLocaleString()} {loadEvent.unit || (loadEvent.commodityType === 'lpGas' ? 'kg' : 'L')}
                                              </p>
                                            </div>
                                            {invoice && (
                                              <div className="text-right">
                                                <p className="text-xs font-bold text-success">
                                                  {getCurrencySymbol(company?.currency)} {invoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </p>
                                                <p className={`text-[10px] font-semibold ${isInvoicePaid ? 'text-success' : 'text-warning'}`}>
                                                  {isInvoicePaid ? '✓ Paid' : paidAmount > 0 ? `${getCurrencySymbol(company?.currency)} ${(invoiceAmount - paidAmount).toFixed(0)} due` : 'Unpaid'}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Invoice Actions */}
                                          {invoice ? (
                                            <div className="space-y-1 mt-1">
                                              <div className="flex flex-col sm:flex-row gap-1">
                                                <button
                                                  onClick={() => handleViewInvoice(invoice)}
                                                  className="flex-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-[10px] font-medium transition-colors"
                                                  title="View Invoice"
                                                >
                                                  👁️ View
                                                </button>
                                                <button
                                                  onClick={() => handleDownloadPDF(invoice)}
                                                  className="flex-1 px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded text-[10px] font-medium transition-colors"
                                                  title="Download PDF"
                                                >
                                                  📄 PDF
                                                </button>
                                                <button
                                                  onClick={() => handleShareInvoice(invoice)}
                                                  className="flex-1 px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded text-[10px] font-medium transition-colors"
                                                  title="Share Invoice"
                                                >
                                                  📧 Share
                                                </button>
                                              </div>
                                              {!isInvoicePaid && (
                                                <button
                                                  onClick={() => handleRecordPayment(invoice)}
                                                  className="w-full px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-[10px] font-medium transition-colors"
                                                >
                                                  💳 Record Payment
                                                </button>
                                              )}
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => handleGenerateInvoice(offload, loadEvent)}
                                              className="w-full px-2 py-1 bg-success hover:bg-success/90 text-white rounded text-[10px] font-medium transition-colors mt-1"
                                            >
                                              Generate Invoice
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {/* Return Trip Section - Third Column */}
                              {lastOffload && (
                                <div className={`rounded-lg p-3 border ${
                                  returnTrip 
                                    ? 'bg-white border-gray-200' 
                                    : 'bg-warning/5 border-warning/30'
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-baltic-600 flex items-center gap-1">
                                      <span>🔄</span> Return Trip
                                    </h4>
                                    {!returnTrip && (
                                      <button
                                        onClick={() => {
                                          setSelectedReturnTrip({ offload: lastOffload, loadEvent });
                                          setShowReturnTripForm(true);
                                        }}
                                        className="px-2 py-1 bg-gradient-to-r from-baltic-600 to-blue-600 hover:from-blue-600 hover:to-baltic-600 text-white rounded text-[10px] font-medium transition-colors flex items-center gap-1"
                                      >
                                        <span>🔄</span> Capture
                                      </button>
                                    )}
                                  </div>
                                  
                                  {returnTrip ? (
                                    <>
                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Return Date:</span>
                                      <span className="text-gray-900 font-medium">
                                        {returnTrip.returnEndDate ? returnTrip.returnEndDate.toLocaleDateString('en-ZA', {
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        }) : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Distance:</span>
                                      <span className="text-gray-900 font-medium">{returnTrip.returnDistance ? `${returnTrip.returnDistance.toLocaleString()} km` : 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Mileage:</span>
                                      <span className="text-gray-900 font-medium">
                                        {returnTrip.mileageAtCustomer && returnTrip.mileageAtDepot 
                                          ? `${returnTrip.mileageAtCustomer.toLocaleString()} → ${returnTrip.mileageAtDepot.toLocaleString()} km`
                                          : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Fuel Used:</span>
                                      <span className="text-gray-900 font-medium">{returnTrip.fuelUsed ? `${returnTrip.fuelUsed} L` : 'N/A'}</span>
                                    </div>
                                    {returnTrip.notes && (
                                      <div className="pt-1.5 border-t border-gray-200">
                                        <p className="text-gray-600 text-[10px] mb-1">Notes:</p>
                                        <p className="text-gray-900 text-[10px] bg-gray-50 p-1.5 rounded">{returnTrip.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                  </>
                                  ) : (
                                    <div className="text-center py-3">
                                      <div className="inline-flex items-center gap-2 px-3 py-2 bg-warning/10 rounded-lg border border-warning/30 mb-3">
                                        <AlertTriangle className="w-4 h-4 text-warning" />
                                        <p className="text-xs font-semibold text-warning">Return trip not recorded</p>
                                      </div>
                                      <p className="text-xs text-gray-600 mb-3">
                                        Record when vehicle returns to depot
                                      </p>
                                      <button
                                        onClick={() => {
                                          setSelectedReturnTrip({ offload: lastOffload, loadEvent });
                                          setShowReturnTripForm(true);
                                        }}
                                        className="px-3 py-1.5 bg-gradient-to-r from-baltic-600 to-blue-600 hover:from-blue-600 hover:to-baltic-600 text-white rounded-lg font-medium text-xs transition-all duration-200 shadow-sm flex items-center justify-center gap-1.5 mx-auto"
                                      >
                                        <span>🔄</span>
                                        <span>Capture Return Trip</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
        )}
      </div>

      {/* Show All / Show Less Button */}
      {!loading && hasMoreTrips && (
        <div className="mt-4 text-center space-y-2">
          {/* Warning about hidden critical trips */}
          {!showAllTrips && criticalTripsCount > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-amber-800 dark:text-amber-200">
                <strong>{criticalTripsCount}</strong> trip{criticalTripsCount > 1 ? 's' : ''} with pending actions hidden
              </span>
            </div>
          )}
          
          <button
            onClick={() => setShowAllTrips(!showAllTrips)}
            className={`px-6 py-2.5 font-medium rounded-lg transition-colors inline-flex items-center gap-2 ${
              !showAllTrips && criticalTripsCount > 0
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-baltic-100 hover:bg-baltic-200 text-baltic-700'
            }`}
          >
            {showAllTrips ? (
              <>
                <ChevronDown className="w-4 h-4 rotate-180" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show All ({sortedEvents.length - TRIPS_LIMIT} more)
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Results Count */}
      {!loading && (
        <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {displayedEvents.length} of {sortedEvents.length} trips
          {!showAllTrips && <span className="text-baltic-600 dark:text-baltic-400"> • Sorted by priority</span>}
        </div>
      )}

      {/* Invoice Form Modal */}
      {showInvoiceForm && selectedOffload && (
        <InvoiceForm
          offloadEvent={selectedOffload.offload}
          loadEvent={selectedOffload.loadEvent}
          onSubmit={handleInvoiceSubmit}
          onCancel={() => {
            setShowInvoiceForm(false);
            setSelectedOffload(null);
          }}
          isSubmitting={submitting}
          companyCurrency={company?.currency || 'USD'}
        />
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedInvoice && (
        <PaymentForm
          invoice={selectedInvoice}
          onSubmit={handlePaymentSubmit}
          onCancel={() => {
            setShowPaymentForm(false);
            setSelectedInvoice(null);
          }}
          isSubmitting={submitting}
          companyCurrency={company?.currency || 'USD'}
        />
      )}

      {/* Trip Expense Form Modal */}
      {showExpenseForm && selectedLoadEvent && (
        <TripExpenseForm
          loadEvent={selectedLoadEvent}
          onSubmit={handleExpenseSubmit}
          onCancel={() => {
            setShowExpenseForm(false);
            setSelectedLoadEvent(null);
          }}
          isSubmitting={submitting}
        />
      )}

      {/* Return Trip Form Modal */}
      {showReturnTripForm && selectedReturnTrip && (
        <Modal
          isOpen={showReturnTripForm}
          onClose={() => {
            setShowReturnTripForm(false);
            setSelectedReturnTrip(null);
          }}
          title="Record Return Trip 🔄"
        >
          <ReturnTripForm
            offloadEvent={selectedReturnTrip.offload}
            loadEvent={selectedReturnTrip.loadEvent}
            onSuccess={handleReturnTripSubmit}
            onCancel={() => {
              setShowReturnTripForm(false);
              setSelectedReturnTrip(null);
            }}
          />
        </Modal>
      )}
      
      {/* Payment Prompt Modal */}
      {showPaymentPrompt && createdInvoice && (
        <Modal
          isOpen={showPaymentPrompt}
          onClose={handleSkipPayment}
          title="Invoice Generated! 💰"
        >
          <div className="space-y-6">
            <div className="bg-success/10 border-2 border-success/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">✅</div>
                <div className="flex-1">
                  <h3 className="font-bold text-success text-lg mb-2">
                    Invoice Created Successfully!
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p><span className="font-medium">Customer:</span> {createdInvoice.customer}</p>
                    <p><span className="font-medium">Amount:</span> R {parseFloat(createdInvoice.totalAmount).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💳</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Record Payment Now?
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Would you like to record a payment for this invoice right now? 
                    You can also do this later from the logbook.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleSkipPayment}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 
                         dark:bg-gray-700 dark:hover:bg-gray-600
                         text-baltic-900 dark:text-gray-100 font-medium rounded-lg
                         transition-colors duration-200"
              >
                Skip for Now
              </button>
              <button
                onClick={handleRecordPaymentNow}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-success to-emerald-600 
                         hover:from-emerald-600 hover:to-success
                         text-white font-bold rounded-lg shadow-lg
                         transition-all duration-300 transform hover:scale-105
                         flex items-center justify-center gap-2"
              >
                <span>💳</span>
                <span>Record Payment</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invoice View Modal (Mobile) */}
      {showInvoiceView && viewingInvoice && (
        <Modal
          isOpen={showInvoiceView}
          onClose={() => {
            setShowInvoiceView(false);
            setViewingInvoice(null);
          }}
          title={`Invoice #${viewingInvoice.invoiceNumber}`}
        >
          <div className="space-y-4">
            {/* Invoice Status */}
            <div className={`p-3 rounded-lg ${
              viewingInvoice.status === 'paid' 
                ? 'bg-success/10 border border-success/30' 
                : 'bg-warning/10 border border-warning/30'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${
                  viewingInvoice.status === 'paid' ? 'text-success' : 'text-warning'
                }`}>
                  {viewingInvoice.status === 'paid' ? '✓ PAID' : '⏳ UNPAID'}
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {getCurrencySymbol(company?.currency)} {(viewingInvoice.total || viewingInvoice.totalAmount || 0).toLocaleString()}
                </span>
              </div>
            </div>
            
            {/* Customer & Dates */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div>
                <span className="text-xs text-gray-500">Customer</span>
                <p className="font-semibold text-gray-900">{viewingInvoice.customer || viewingInvoice.customerName}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Invoice Date</span>
                  <p className="font-medium text-gray-900">
                    {new Date(viewingInvoice.invoiceDate?.toDate ? viewingInvoice.invoiceDate.toDate() : viewingInvoice.invoiceDate).toLocaleDateString('en-ZA')}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Due Date</span>
                  <p className="font-medium text-gray-900">
                    {new Date(viewingInvoice.dueDate?.toDate ? viewingInvoice.dueDate.toDate() : viewingInvoice.dueDate).toLocaleDateString('en-ZA')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Line Items */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">Line Items</p>
              <div className="space-y-2">
                {viewingInvoice.lineItems?.map((item, idx) => (
                  <div key={idx} className="bg-white border border-gray-200 rounded p-2 text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-gray-900">{item.description}</span>
                      <span className="font-bold text-gray-900">
                        {getCurrencySymbol(company?.currency)} {(item.subtotal || item.amount || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      {item.quantity?.toLocaleString()} {item.unit} × {getCurrencySymbol(company?.currency)}{item.unitPrice?.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Totals */}
            <div className="border-t border-gray-200 pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{getCurrencySymbol(company?.currency)} {(viewingInvoice.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">VAT ({viewingInvoice.vatRate || 15}%)</span>
                <span className="font-medium">{getCurrencySymbol(company?.currency)} {(viewingInvoice.vatAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span className="text-gray-900">Total</span>
                <span className="text-baltic-600">{getCurrencySymbol(company?.currency)} {(viewingInvoice.total || viewingInvoice.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  handleDownloadPDF(viewingInvoice);
                  setShowInvoiceView(false);
                  setViewingInvoice(null);
                }}
                className="flex-1 px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium"
              >
                📄 Download PDF
              </button>
              {viewingInvoice.status !== 'paid' && (
                <button
                  onClick={() => {
                    setShowInvoiceView(false);
                    setViewingInvoice(null);
                    setSelectedInvoice(viewingInvoice);
                    setShowPaymentForm(true);
                  }}
                  className="flex-1 px-3 py-2 bg-success hover:bg-success/90 text-white rounded-lg text-sm font-medium"
                >
                  💰 Record Payment
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && tripToDelete && deletionImpact && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={cancelDeleteTrip}
          title="⚠️ Delete Trip - Confirm Action"
        >
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-900 dark:text-red-100 font-semibold mb-2">
                This action cannot be undone!
              </p>
              <p className="text-sm text-red-800 dark:text-red-200">
                You are about to permanently delete this trip and all related data.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                The following will be deleted:
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Deliveries:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{deletionImpact.offloadEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Invoices:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{deletionImpact.invoices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Payments:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{deletionImpact.payments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Return Trips:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{deletionImpact.returnTrips}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Expenses:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{deletionImpact.expenses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Alerts:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{deletionImpact.alerts}</span>
                </div>
              </div>

              {deletionImpact.totalRevenue > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-gray-700 dark:text-gray-300">Total Revenue Impact:</span>
                    <span className="text-red-600 dark:text-red-400">
                      R {deletionImpact.totalRevenue.toLocaleString()}
                    </span>
                  </div>
                  {deletionImpact.outstandingAmount > 0 && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600 dark:text-gray-400">Outstanding Amount:</span>
                      <span className="text-warning">
                        R {deletionImpact.outstandingAmount.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={cancelDeleteTrip}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTrip}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CommodityLogbookPage;
