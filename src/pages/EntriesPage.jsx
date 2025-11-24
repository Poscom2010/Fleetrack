import { useState, useEffect, useRef } from "react";
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import { useVehicles } from "../hooks/useVehicles";
import DailyEntryForm from "../components/entries/DailyEntryForm";
import ExpenseForm from "../components/entries/ExpenseForm";
import VehicleForm from "../components/vehicles/VehicleForm";
import Modal from "../components/common/Modal";
import toast from "react-hot-toast";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Car, DollarSign, FileText, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import {
  createDailyEntry,
  createExpense,
} from "../services/entryService";
import { getDriverProfiles } from "../services/driverProfileService";
import { createVehicle } from "../services/vehicleService";
import { formatCurrency } from "../utils/calculations";

/**
 * EntriesPage component for managing daily entries and expenses
 */
const EntriesPage = () => {
  usePageTitle('Capturing');
  const navigate = useNavigate();
  const { user, company, userProfile } = useAuth();
  const isAdminOrManager = userProfile?.role === 'company_admin' || userProfile?.role === 'company_manager';
  const { vehicles, loading: vehiclesLoading } = useVehicles(user?.uid, company?.id, userProfile?.role);

  const [drivers, setDrivers] = useState([]);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [lastAddedEntry, setLastAddedEntry] = useState(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [pendingVehicleSelection, setPendingVehicleSelection] = useState(null);
  const [recentEntries, setRecentEntries] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [selectedVehicleForEdit, setSelectedVehicleForEdit] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const recentCapturesRef = useRef(null);

  // Load drivers for admin/manager
  useEffect(() => {
    const loadDrivers = async () => {
      if (!isAdminOrManager || !company?.id) return;

      try {
        // Get registered users
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('companyId', '==', company.id));
        const snapshot = await getDocs(q);
        const registeredDrivers = snapshot.docs.map(doc => ({
          id: doc.id,
          type: 'user',
          ...doc.data()
        }));

        // Get driver profiles (not yet invited)
        const driverProfiles = await getDriverProfiles(company.id);
        const profileDrivers = driverProfiles.map(profile => ({
          id: profile.id,
          type: 'profile',
          fullName: profile.fullName,
          email: profile.email,
          isProfile: true
        }));

        // Combine both lists
        setDrivers([...registeredDrivers, ...profileDrivers]);
      } catch (err) {
        console.error("Error loading drivers:", err);
      }
    };

    loadDrivers();
  }, [isAdminOrManager, company?.id]);

  // Clear pending vehicle selection after it's available in the vehicles list
  useEffect(() => {
    if (pendingVehicleSelection && vehicles.some(v => v.id === pendingVehicleSelection)) {
      // Give the form a moment to auto-select, then clear
      const timer = setTimeout(() => {
        console.log('🧹 Clearing pending vehicle selection');
        setPendingVehicleSelection(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pendingVehicleSelection, vehicles]);

  // Load recent entries and expenses
  useEffect(() => {
    loadRecentData();
  }, [user, company]);

  // Click outside handler to reset vehicle selector
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (recentCapturesRef.current && !recentCapturesRef.current.contains(event.target)) {
        // Only reset if not clicking on a modal
        if (!isEntryModalOpen && !isExpenseModalOpen && !deleteConfirm) {
          setSelectedVehicleForEdit('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEntryModalOpen, isExpenseModalOpen, deleteConfirm]);

  const loadRecentData = async () => {
    if (!user?.uid) return;

    try {
      const { getDailyEntries, getExpenses, getCompanyDailyEntries, getCompanyExpenses } = await import('../services/entryService');
      
      // Load entries
      let entriesData;
      if (isAdminOrManager && company?.id) {
        entriesData = await getCompanyDailyEntries(company.id);
      } else {
        entriesData = await getDailyEntries(user.uid);
      }

      // Group by vehicle and get last 2 per vehicle
      const entriesByVehicle = {};
      entriesData.forEach(entry => {
        if (!entriesByVehicle[entry.vehicleId]) {
          entriesByVehicle[entry.vehicleId] = [];
        }
        entriesByVehicle[entry.vehicleId].push(entry);
      });

      // Sort and take last 2 per vehicle
      const recentByVehicle = {};
      Object.keys(entriesByVehicle).forEach(vehicleId => {
        recentByVehicle[vehicleId] = entriesByVehicle[vehicleId]
          .sort((a, b) => b.date?.toDate?.() - a.date?.toDate?.())
          .slice(0, 2);
      });

      setRecentEntries(recentByVehicle);

      // Load expenses
      let expensesData;
      if (isAdminOrManager && company?.id) {
        expensesData = await getCompanyExpenses(company.id);
      } else {
        expensesData = await getExpenses(user.uid);
      }

      // Group by vehicle and get last 2 per vehicle
      const expensesByVehicle = {};
      expensesData.forEach(expense => {
        if (!expensesByVehicle[expense.vehicleId]) {
          expensesByVehicle[expense.vehicleId] = [];
        }
        expensesByVehicle[expense.vehicleId].push(expense);
      });

      // Sort and take last 2 per vehicle
      const recentExpensesByVehicle = {};
      Object.keys(expensesByVehicle).forEach(vehicleId => {
        recentExpensesByVehicle[vehicleId] = expensesByVehicle[vehicleId]
          .sort((a, b) => b.date?.toDate?.() - a.date?.toDate?.())
          .slice(0, 2);
      });

      setRecentExpenses(recentExpensesByVehicle);
    } catch (error) {
      console.error('Error loading recent data:', error);
    }
  };

  // Daily Entry Handlers
  const handleAddEntry = () => {
    setIsEntryModalOpen(true);
  };

  const handleSubmitEntry = async (entryData) => {
    const toastId = toast.loading("Saving entry...");
    try {
      setIsSubmitting(true);

      // Check if creating a new driver profile
      if (entryData.driverId === 'NEW_DRIVER' && entryData.newDriverName) {
        const { createDriverProfile } = await import('../services/driverProfileService');
        const driverProfileId = await createDriverProfile(company.id, {
          fullName: entryData.newDriverName.trim(),
          email: null,
          phone: null,
          licenseNumber: null
        });
        entryData.driverId = driverProfileId;
      }

      if (editingEntry) {
        const { updateDailyEntry } = await import('../services/entryService');
        await updateDailyEntry(editingEntry.id, entryData);
        toast.success("Daily entry updated successfully! 🎉", { id: toastId });
        setEditingEntry(null);
        setSelectedVehicleForEdit(''); // Reset vehicle selector after edit
        
        // Save entry details for expense linking (same as new entry)
        // Ensure date is a string in YYYY-MM-DD format
        let dateString = entryData.date;
        if (typeof dateString !== 'string') {
          // Convert to string if it's a Date or Timestamp
          if (dateString?.toDate) {
            dateString = dateString.toDate().toISOString().split('T')[0];
          } else if (dateString instanceof Date) {
            dateString = dateString.toISOString().split('T')[0];
          } else {
            dateString = new Date(dateString).toISOString().split('T')[0];
          }
        }
        
        const savedEntry = {
          vehicleId: entryData.vehicleId,
          date: dateString,
          driverId: entryData.driverId,
          timestamp: Date.now() // Force re-render
        };
        setLastAddedEntry(savedEntry);
        
        // Show success modal with expense option
        setSuccessMessage('Daily entry updated successfully!');
        setShowSuccessModal(true);
      } else {
        await createDailyEntry(user.uid, company?.id, entryData);
        toast.success("Daily entry captured successfully! 🎉", { id: toastId });
        
        // Save entry details for expense linking
        // Ensure date is a string in YYYY-MM-DD format
        let dateString = entryData.date;
        if (typeof dateString !== 'string') {
          // Convert to string if it's a Date or Timestamp
          if (dateString?.toDate) {
            dateString = dateString.toDate().toISOString().split('T')[0];
          } else if (dateString instanceof Date) {
            dateString = dateString.toISOString().split('T')[0];
          } else {
            dateString = new Date(dateString).toISOString().split('T')[0];
          }
        }
        
        const savedEntry = {
          vehicleId: entryData.vehicleId,
          date: dateString,
          driverId: entryData.driverId,
          timestamp: Date.now() // Force re-render
        };
        setLastAddedEntry(savedEntry);
        
        // Show success modal
        setSuccessMessage('Daily entry captured successfully!');
        setShowSuccessModal(true);
      }
      
      setIsEntryModalOpen(false);
      loadRecentData(); // Reload recent data
    } catch (err) {
      toast.error(err.message || "Failed to save entry", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Expense Handlers
  const handleAddExpense = () => {
    setIsExpenseModalOpen(true);
  };

  const handleAddExpenseFromSuccess = () => {
    setShowSuccessModal(false);
    setIsExpenseModalOpen(true);
  };

  const handleSubmitExpense = async (expenseData) => {
    const toastId = toast.loading("Saving expenses...");
    try {
      setIsSubmitting(true);

      // Check if creating a new driver profile
      let driverId = expenseData.driverId;
      if (expenseData.driverId === 'NEW_DRIVER' && expenseData.newDriverName) {
        const { createDriverProfile } = await import('../services/driverProfileService');
        driverId = await createDriverProfile(company.id, {
          fullName: expenseData.newDriverName.trim(),
          email: null,
          phone: null,
          licenseNumber: null
        });
      }

      if (editingExpense) {
        // Editing mode - update single expense
        const { updateExpense } = await import('../services/entryService');
        const singleExpense = expenseData.expenseItems[0];
        await updateExpense(editingExpense.id, {
          vehicleId: expenseData.vehicleId,
          driverId: driverId,
          date: expenseData.date,
          description: singleExpense.description,
          amount: singleExpense.amount,
          category: singleExpense.category,
        });
        toast.success("Expense updated successfully! 🎉", { id: toastId });
        setEditingExpense(null);
        setSelectedVehicleForEdit('');
        
        // Save entry details for adding more expenses
        // Ensure date is a string in YYYY-MM-DD format
        let dateString = expenseData.date;
        if (typeof dateString !== 'string') {
          // Convert to string if it's a Date or Timestamp
          if (dateString?.toDate) {
            dateString = dateString.toDate().toISOString().split('T')[0];
          } else if (dateString instanceof Date) {
            dateString = dateString.toISOString().split('T')[0];
          } else {
            dateString = new Date(dateString).toISOString().split('T')[0];
          }
        }
        
        const savedEntry = {
          vehicleId: expenseData.vehicleId,
          date: dateString,
          driverId: driverId,
          timestamp: Date.now() // Force re-render
        };
        setLastAddedEntry(savedEntry);
        
        // Show success modal with option to add more expenses
        setSuccessMessage('Expense updated successfully!');
        setShowSuccessModal(true);
      } else {
        // Creating mode - create multiple expenses
        const expenseCount = expenseData.expenseItems.length;
        
        // Create all expenses
        for (const item of expenseData.expenseItems) {
          await createExpense(user.uid, company?.id, {
            vehicleId: expenseData.vehicleId,
            driverId: driverId,
            date: expenseData.date,
            description: item.description,
            amount: item.amount,
            category: item.category,
          });
        }
        
        toast.success(`${expenseCount} expense${expenseCount > 1 ? 's' : ''} captured successfully! 🎉`, { id: toastId });
        
        // Show success modal
        setSuccessMessage(`${expenseCount} expense${expenseCount > 1 ? 's' : ''} captured successfully!`);
        setShowSuccessModal(true);
      }
      
      setIsExpenseModalOpen(false);
      setLastAddedEntry(null);
      loadRecentData(); // Reload recent data
    } catch (err) {
      toast.error(err.message || "Failed to save expenses", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEntry = () => {
    setIsEntryModalOpen(false);
    setEditingEntry(null);
    setSelectedVehicleForEdit(''); // Reset vehicle selector
  };

  const handleCancelExpense = () => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
    setLastAddedEntry(null);
    setSelectedVehicleForEdit(''); // Reset vehicle selector
  };

  const handleViewLogbook = () => {
    navigate('/logbook');
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    setLastAddedEntry(null);
  };

  // Edit handlers
  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setIsEntryModalOpen(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  // Delete handlers
  const handleDeleteEntry = (entry) => {
    setDeleteConfirm({ type: 'entry', item: entry });
  };

  const handleDeleteExpense = (expense) => {
    setDeleteConfirm({ type: 'expense', item: expense });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    const toastId = toast.loading(`Deleting ${deleteConfirm.type}...`);
    try {
      setIsSubmitting(true);
      
      if (deleteConfirm.type === 'entry') {
        const { deleteDailyEntry } = await import('../services/entryService');
        await deleteDailyEntry(deleteConfirm.item.id);
        toast.success("Entry deleted successfully!", { id: toastId });
      } else {
        const { deleteExpense } = await import('../services/entryService');
        await deleteExpense(deleteConfirm.item.id);
        toast.success("Expense deleted successfully!", { id: toastId });
      }
      
      setDeleteConfirm(null);
      setSelectedVehicleForEdit(''); // Reset vehicle selector after delete
      loadRecentData();
    } catch (err) {
      toast.error(err.message || "Failed to delete", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Vehicle Handlers
  const handleAddNewVehicle = () => {
    setIsVehicleModalOpen(true);
  };

  const handleSubmitVehicle = async (vehicleData) => {
    setIsSubmitting(true);
    const toastId = toast.loading("Creating vehicle...");
    
    try {
      const vehicleId = await createVehicle(user.uid, company?.id, vehicleData);
      toast.success("Vehicle added successfully!", { id: toastId });
      setIsVehicleModalOpen(false);
      setPendingVehicleSelection(vehicleId);
    } catch (err) {
      toast.error(err.message || "Failed to create vehicle", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelVehicle = () => {
    setIsVehicleModalOpen(false);
  };


  return (
    <div className="flex flex-col gap-6">
      {/* Simple Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          Capture Data
        </h1>
        <p className="text-slate-400 text-sm">
          Record daily trips and expenses quickly
        </p>
      </div>

      {/* No Vehicles Warning */}
      {vehicles.length === 0 && !vehiclesLoading && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-center">
          <p className="text-amber-100 text-sm font-medium mb-2">⚠️ No Vehicles Available</p>
          <p className="text-amber-200/80 text-xs">
            Add at least one vehicle before capturing data.
          </p>
        </div>
      )}

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
        {/* Daily Entry Card */}
        <button
          onClick={handleAddEntry}
          disabled={vehiclesLoading || vehicles.length === 0}
          className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-8 text-left transition-all hover:border-blue-500/30 hover:from-blue-500/20 hover:to-indigo-500/20 hover:shadow-lg hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:from-blue-500/10 disabled:hover:to-indigo-500/10 disabled:hover:shadow-none"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-blue-500/20 p-3 group-hover:bg-blue-500/30 transition-colors">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                Daily Entry
              </h3>
              <p className="text-slate-400 text-sm">
                Record trip details, mileage, and cash-in
              </p>
            </div>
          </div>
        </button>

        {/* Expense Card */}
        <button
          onClick={handleAddExpense}
          disabled={vehiclesLoading || vehicles.length === 0}
          className="group relative rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-green-500/10 p-8 text-left transition-all hover:border-emerald-500/30 hover:from-emerald-500/20 hover:to-green-500/20 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:from-emerald-500/10 disabled:hover:to-green-500/10 disabled:hover:shadow-none"
        >
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-emerald-500/20 p-3 group-hover:bg-emerald-500/30 transition-colors">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">
                Expense
              </h3>
              <p className="text-slate-400 text-sm">
                Track fuel, maintenance, and other costs
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Quick Info */}
      <div className="max-w-4xl mx-auto w-full">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-blue-200 text-sm font-medium mb-1">
                💡 Quick Tip
              </p>
              <p className="text-blue-300/80 text-xs">
                After capturing data, view all your records in the <button onClick={handleViewLogbook} className="underline hover:text-blue-200 font-medium">Trip Logbook</button> page.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Captures Section */}
      {(Object.keys(recentEntries).length > 0 || Object.keys(recentExpenses).length > 0) && (
        <div ref={recentCapturesRef} className="max-w-4xl mx-auto w-full">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">📋 Recent Captures</h2>
            <button
              onClick={handleViewLogbook}
              className="text-xs text-blue-400 hover:text-blue-300 transition underline"
            >
              View All in Logbook
            </button>
          </div>

          {/* Vehicle Selector */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 mb-3">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Select Vehicle to Edit Data
            </label>
            <select
              value={selectedVehicleForEdit}
              onChange={(e) => setSelectedVehicleForEdit(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition"
            >
              <option value="">Choose a vehicle...</option>
              {vehicles
                .filter(vehicle => {
                  const hasEntries = (recentEntries[vehicle.id] || []).length > 0;
                  const hasExpenses = (recentExpenses[vehicle.id] || []).length > 0;
                  return hasEntries || hasExpenses;
                })
                .map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} ({vehicle.registrationNumber})
                  </option>
                ))}
            </select>
          </div>

          {/* Selected Vehicle Data */}
          {selectedVehicleForEdit && (() => {
            const vehicleEntries = recentEntries[selectedVehicleForEdit] || [];
            const vehicleExpenses = recentExpenses[selectedVehicleForEdit] || [];
            
            return (
              <div className="bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 space-y-3">
                  {/* Daily Entries */}
                  {vehicleEntries.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 mb-2">Daily Entries</h4>
                          <div className="space-y-2">
                            {vehicleEntries.map(entry => (
                              <div key={entry.id} className="bg-slate-800/50 rounded-lg p-3 flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-blue-400">
                                      📅 {(() => {
                                        if (!entry.date) return 'No date';
                                        if (entry.date.toDate) return entry.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        if (entry.date instanceof Date) return entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        return new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-white font-medium truncate">
                                      {entry.startLocation} → {entry.endLocation}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-slate-400">{entry.distanceTraveled?.toFixed(1)} km</span>
                                    <span className="text-blue-400 font-semibold">{formatCurrency(entry.cashIn || 0, company?.currency || 'USD')}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditEntry(entry)}
                                    className="p-1.5 hover:bg-slate-700 rounded-lg transition text-blue-400 hover:text-blue-300"
                                    title="Edit entry"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEntry(entry)}
                                    className="p-1.5 hover:bg-slate-700 rounded-lg transition text-red-400 hover:text-red-300"
                                    title="Delete entry"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expenses */}
                      {vehicleExpenses.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 mb-2">Expenses</h4>
                          <div className="space-y-2">
                            {vehicleExpenses.map(expense => (
                              <div key={expense.id} className="bg-slate-800/50 rounded-lg p-3 flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-red-400">
                                      📅 {(() => {
                                        if (!expense.date) return 'No date';
                                        if (expense.date.toDate) return expense.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        if (expense.date instanceof Date) return expense.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        return new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-white font-medium truncate">
                                      {expense.description}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-slate-400">{expense.category}</span>
                                    <span className="text-red-400 font-semibold">{formatCurrency(expense.amount || 0, company?.currency || 'USD')}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditExpense(expense)}
                                    className="p-1.5 hover:bg-slate-700 rounded-lg transition text-blue-400 hover:text-blue-300"
                                    title="Edit expense"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(expense)}
                                    className="p-1.5 hover:bg-slate-700 rounded-lg transition text-red-400 hover:text-red-300"
                                    title="Delete expense"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Expenses */}
                      {vehicleExpenses.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 mb-2">Expenses</h4>
                          <div className="space-y-2">
                            {vehicleExpenses.map(expense => (
                              <div key={expense.id} className="bg-slate-800/50 rounded-lg p-3 flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-red-400">
                                      📅 {(() => {
                                        if (!expense.date) return 'No date';
                                        if (expense.date.toDate) return expense.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        if (expense.date instanceof Date) return expense.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        return new Date(expense.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                      })()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-white font-medium truncate">
                                      {expense.description}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs">
                                    <span className="text-slate-400">{expense.category}</span>
                                    <span className="text-red-400 font-semibold">{formatCurrency(expense.amount || 0, company?.currency || 'USD')}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditExpense(expense)}
                                    className="p-1.5 hover:bg-slate-700 rounded-lg transition text-blue-400 hover:text-blue-300"
                                    title="Edit expense"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteExpense(expense)}
                                    className="p-1.5 hover:bg-slate-700 rounded-lg transition text-red-400 hover:text-red-300"
                                    title="Delete expense"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

      <Modal
        isOpen={isEntryModalOpen}
        onClose={handleCancelEntry}
        title={editingEntry ? "Edit Daily Entry" : "Add Daily Entry"}
      >
        <DailyEntryForm
          key={editingEntry?.id || "new-entry"}
          vehicles={vehicles}
          drivers={drivers}
          isAdminOrManager={isAdminOrManager}
          currentUserId={user?.uid}
          entry={editingEntry}
          onSubmit={handleSubmitEntry}
          onCancel={handleCancelEntry}
          isSubmitting={isSubmitting}
          onAddNewVehicle={handleAddNewVehicle}
          pendingVehicleId={pendingVehicleSelection}
          companyId={company?.id}
        />
      </Modal>

      <Modal
        isOpen={isExpenseModalOpen}
        onClose={handleCancelExpense}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
      >
        <ExpenseForm
          key={editingExpense?.id || lastAddedEntry?.timestamp || "new-expense"}
          vehicles={vehicles}
          drivers={drivers}
          isAdminOrManager={isAdminOrManager}
          expense={editingExpense}
          initialValues={!editingExpense ? lastAddedEntry : null}
          onSubmit={handleSubmitExpense}
          onCancel={handleCancelExpense}
          isSubmitting={isSubmitting}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-red-500/30 max-w-md w-full p-6">
            {/* Warning Icon */}
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-500/20 p-3">
                <Trash2 className="w-12 h-12 text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white text-center mb-2">
              Delete {deleteConfirm.type === 'entry' ? 'Entry' : 'Expense'}?
            </h3>

            {/* Description */}
            <p className="text-slate-300 text-sm text-center mb-6">
              This action cannot be undone. The {deleteConfirm.type} will be permanently removed.
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-6 py-3 text-sm font-semibold text-white transition hover:from-red-700 hover:to-red-800 shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-green-500/30 max-w-md w-full p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Success Icon */}
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-500/20 p-3">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white text-center mb-2">
              {successMessage}
            </h3>

            {/* Description */}
            {lastAddedEntry && (
              <>
                <p className="text-slate-300 text-sm text-center mb-2">
                  {successMessage.includes('Expense') ? 'Expense saved!' : 'Trip saved successfully!'}
                </p>
                <p className="text-slate-400 text-sm text-center mb-6 font-semibold">
                  📝 Would you like to add {successMessage.includes('Expense') ? 'more expenses' : 'expenses'} for this trip?<br/>
                  <span className="text-xs text-slate-500">(Fuel, Toll, Parking, etc.)</span>
                </p>
              </>
            )}
            
            {!lastAddedEntry && (
              <p className="text-slate-300 text-sm text-center mb-6">
                Your data has been saved successfully!
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {lastAddedEntry && (
                <button
                  onClick={handleAddExpenseFromSuccess}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-emerald-700 hover:to-green-700 flex items-center justify-center gap-2 shadow-lg"
                >
                  <DollarSign className="w-4 h-4" />
                  {successMessage.includes('Expense') ? 'Yes, Add More Expenses' : 'Yes, Add Expenses'}
                </button>
              )}
              
              <button
                onClick={handleViewLogbook}
                className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-6 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View Trip Logbook
              </button>

              <button
                onClick={handleCloseSuccess}
                className="w-full rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
              >
                {lastAddedEntry ? 'No, Skip for Now' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Vehicle Modal */}
      <Modal
        isOpen={isVehicleModalOpen}
        onClose={handleCancelVehicle}
        title="Add New Vehicle"
      >
        <VehicleForm
          onSubmit={handleSubmitVehicle}
          onCancel={handleCancelVehicle}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </div>
  );
};

export default EntriesPage;
