import { useState, useEffect, useCallback } from "react";
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useVehicles } from "../hooks/useVehicles";
import DailyEntryForm from "../components/entries/DailyEntryForm";
import ExpenseForm from "../components/entries/ExpenseForm";
import EntryList from "../components/entries/EntryList";
import VehicleForm from "../components/vehicles/VehicleForm";
import Modal from "../components/common/Modal";
import toast from "react-hot-toast";
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  createDailyEntry,
  updateDailyEntry,
  deleteDailyEntry,
  getDailyEntries,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenses,
} from "../services/entryService";
import { getDriverProfiles } from "../services/driverProfileService";
import { createVehicle } from "../services/vehicleService";

/**
 * EntriesPage component for managing daily entries and expenses
 */
const EntriesPage = () => {
  usePageTitle('Capturing');
  const { user, company, userProfile } = useAuth();
  const { vehicles, loading: vehiclesLoading } = useVehicles(user?.uid);
  const isAdminOrManager = userProfile?.role === 'company_admin' || userProfile?.role === 'company_manager';

  const [dailyEntries, setDailyEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteEntryConfirm, setDeleteEntryConfirm] = useState(null);
  const [deleteExpenseConfirm, setDeleteExpenseConfirm] = useState(null);
  const [showExpensePrompt, setShowExpensePrompt] = useState(false);
  const [lastAddedEntry, setLastAddedEntry] = useState(null);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [pendingVehicleSelection, setPendingVehicleSelection] = useState(null);

  const loadData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      
      // Fetch data based on role
      let entriesPromise, expensesPromise;
      if (isAdminOrManager && company?.id) {
        // Admins and managers see all company data
        entriesPromise = import('../services/entryService').then(module => 
          module.getCompanyDailyEntries(company.id)
        );
        expensesPromise = import('../services/entryService').then(module =>
          module.getCompanyExpenses(company.id)
        );
      } else {
        // Drivers see only their own data
        entriesPromise = getDailyEntries(user.uid);
        expensesPromise = getExpenses(user.uid);
      }
      
      const promises = [entriesPromise, expensesPromise];

      // Load drivers if admin or manager (both registered users and driver profiles)
      if (isAdminOrManager && company?.id) {
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
      }

      const [entriesData, expensesData] = await Promise.all(promises);
      setDailyEntries(entriesData);
      setExpenses(expensesData);
    } catch (err) {
      console.error("Error loading data:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [user?.uid, isAdminOrManager, company?.id]);

  // Load entries and expenses
  useEffect(() => {
    loadData();
  }, [loadData]);

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

  // Daily Entry Handlers
  const handleAddEntry = () => {
    setEditingEntry(null);
    setIsEntryModalOpen(true);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setIsEntryModalOpen(true);
  };

  const handleDeleteEntry = (entryId) => {
    const entry = dailyEntries.find((e) => e.id === entryId);
    setDeleteEntryConfirm(entry);
  };

  const confirmDeleteEntry = async () => {
    if (!deleteEntryConfirm) return;

    const toastId = toast.loading("Deleting entry...");
    try {
      setIsSubmitting(true);
      await deleteDailyEntry(deleteEntryConfirm.id);
      await loadData();
      toast.success("Daily entry deleted successfully", { id: toastId });
      setDeleteEntryConfirm(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete entry", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitEntry = async (entryData) => {
    const toastId = toast.loading(
      editingEntry ? "Updating entry..." : "Adding entry..."
    );
    try {
      setIsSubmitting(true);

      // Check if creating a new driver profile
      if (entryData.driverId === 'NEW_DRIVER' && entryData.newDriverName) {
        // Create driver profile first
        const { createDriverProfile } = await import('../services/driverProfileService');
        const driverProfileId = await createDriverProfile(company.id, {
          fullName: entryData.newDriverName.trim(),
          email: null,
          phone: null,
          licenseNumber: null
        });
        
        // Replace NEW_DRIVER with the actual driver profile ID
        entryData.driverId = driverProfileId;
        toast.success(`Driver profile created for ${entryData.newDriverName}`, { id: toastId });
      }

      if (editingEntry) {
        await updateDailyEntry(editingEntry.id, entryData);
        toast.success("Daily entry updated successfully", { id: toastId });
        setIsEntryModalOpen(false);
        setEditingEntry(null);
        await loadData();
      } else {
        console.log('✅ Creating daily entry...');
        await createDailyEntry(user.uid, company?.id, entryData);
        
        // Save entry details for expense linking BEFORE closing modal
        const savedEntry = {
          vehicleId: entryData.vehicleId,
          date: entryData.date,
          driverId: entryData.driverId
        };
        console.log('💾 Saved entry details:', savedEntry);
        
        toast.success("Daily entry added successfully", { id: toastId });
        
        // Close entry modal immediately
        console.log('🚪 Closing entry modal...');
        setIsEntryModalOpen(false);
        setEditingEntry(null);
        
        // Reload data in background
        console.log('🔄 Reloading data...');
        loadData();
        
        // Wait for modal close animation (300ms) + buffer
        console.log('⏳ Waiting for modal transition...');
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Set entry details and show expense prompt
        console.log('💰 Setting up expense prompt...');
        setLastAddedEntry(savedEntry);
        
        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
          console.log('📢 Showing expense prompt!');
          setShowExpensePrompt(true);
        });
      }
    } catch (err) {
      toast.error(err.message || "Failed to save entry", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Expense Handlers
  const handleAddExpense = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleExpensePromptYes = async () => {
    console.log('👍 User clicked YES - Opening expense form...');
    
    // Close prompt modal
    setShowExpensePrompt(false);
    console.log('🚪 Closing expense prompt...');
    
    // Wait for modal close animation
    console.log('⏳ Waiting for prompt transition...');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Open expense modal with smooth rendering
    requestAnimationFrame(() => {
      console.log('📝 Opening expense modal!');
      setIsExpenseModalOpen(true);
    });
  };

  const handleExpensePromptNo = () => {
    console.log('👎 User clicked NO - Skipping expenses');
    setShowExpensePrompt(false);
    setLastAddedEntry(null);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpense = (expenseId) => {
    const expense = expenses.find((e) => e.id === expenseId);
    setDeleteExpenseConfirm(expense);
  };

  const confirmDeleteExpense = async () => {
    if (!deleteExpenseConfirm) return;

    const toastId = toast.loading("Deleting expense...");
    try {
      setIsSubmitting(true);
      await deleteExpense(deleteExpenseConfirm.id);
      await loadData();
      toast.success("Expense deleted successfully", { id: toastId });
      setDeleteExpenseConfirm(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete expense", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitExpense = async (expenseData) => {
    const toastId = toast.loading(
      editingExpense ? "Updating expense..." : "Adding expense..."
    );
    try {
      setIsSubmitting(true);

      // Check if creating a new driver profile
      if (expenseData.driverId === 'NEW_DRIVER' && expenseData.newDriverName) {
        // Create driver profile first
        const { createDriverProfile } = await import('../services/driverProfileService');
        const driverProfileId = await createDriverProfile(company.id, {
          fullName: expenseData.newDriverName.trim(),
          email: null,
          phone: null,
          licenseNumber: null
        });
        
        // Replace NEW_DRIVER with the actual driver profile ID
        expenseData.driverId = driverProfileId;
        toast.success(`Driver profile created for ${expenseData.newDriverName}`, { id: toastId });
      }

      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData);
        toast.success("Expense updated successfully", { id: toastId });
      } else {
        await createExpense(user.uid, company?.id, expenseData);
        toast.success("Expense added successfully", { id: toastId });
      }

      await loadData();
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      setLastAddedEntry(null);
    } catch (err) {
      toast.error(err.message || "Failed to save expense", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEntry = () => {
    setIsEntryModalOpen(false);
    setEditingEntry(null);
  };

  const handleCancelExpense = () => {
    setIsExpenseModalOpen(false);
    setEditingExpense(null);
    setLastAddedEntry(null);
  };

  // Vehicle Handlers
  const handleAddNewVehicle = () => {
    console.log('🚗 Opening vehicle creation modal...');
    setIsVehicleModalOpen(true);
  };

  const handleSubmitVehicle = async (vehicleData) => {
    setIsSubmitting(true);
    const toastId = toast.loading("Creating vehicle...");
    
    try {
      console.log('🚗 Creating new vehicle:', vehicleData);
      const vehicleId = await createVehicle(user.uid, company?.id, vehicleData);
      
      toast.success("Vehicle added successfully! You can now select it.", { id: toastId });
      
      // Close vehicle modal
      setIsVehicleModalOpen(false);
      
      // Store the new vehicle ID to auto-select it
      setPendingVehicleSelection(vehicleId);
      console.log('✅ Vehicle created with ID:', vehicleId);
      
      // Force reload vehicles (the useVehicles hook should update automatically)
      // But we'll give it a moment to sync
      setTimeout(() => {
        console.log('🔄 Vehicles should be refreshed now');
      }, 500);
      
    } catch (err) {
      console.error('❌ Error creating vehicle:', err);
      toast.error(err.message || "Failed to create vehicle", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelVehicle = () => {
    setIsVehicleModalOpen(false);
  };


  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-soft">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Daily Operations
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              Log performance and keep expenses in check
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Capture cash-in totals, mileage, and cost drivers for every ride.
              Filter by vehicle or date range to monitor trends in seconds.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleAddEntry}
              disabled={vehiclesLoading || vehicles.length === 0}
              className="rounded-2xl bg-brand-gradient px-6 py-3 text-sm font-semibold text-white shadow-brand transition hover:shadow-brand/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Daily Entry
            </button>
            <button
              onClick={handleAddExpense}
              disabled={vehiclesLoading || vehicles.length === 0}
              className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Expense
            </button>
          </div>
        </div>
      </section>

      {vehicles.length === 0 && !vehiclesLoading && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100 shadow-soft">
          Add at least one vehicle before recording entries or expenses.
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-soft">
        <EntryList
          dailyEntries={dailyEntries}
          expenses={expenses}
          vehicles={vehicles}
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
          onEditExpense={handleEditExpense}
          onDeleteExpense={handleDeleteExpense}
          isLoading={loading}
          userRole={userProfile?.role}
        />
      </div>

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
        />
      </Modal>

      <Modal
        isOpen={isExpenseModalOpen}
        onClose={handleCancelExpense}
        title={editingExpense ? "Edit Expense" : "Add Expense"}
      >
        <ExpenseForm
          key={editingExpense?.id || lastAddedEntry?.vehicleId || "new-expense"}
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

      {/* Expense Prompt Modal */}
      <Modal
        isOpen={showExpensePrompt}
        onClose={handleExpensePromptNo}
        title="Add Expenses?"
      >
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-sm text-slate-200 mb-2">
              <strong className="text-blue-400">Daily entry saved! 🎉</strong>
            </p>
            <p className="text-sm text-slate-300">
              Would you like to add expenses for this trip now? This will save you time linking expenses to the same vehicle and date.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExpensePromptYes}
              className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-green-700 hover:to-emerald-700 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Yes, Add Expenses
            </button>
            <button
              onClick={handleExpensePromptNo}
              className="flex-1 rounded-xl border border-slate-600 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-800"
            >
              No, Maybe Later
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteEntryConfirm}
        onClose={() => setDeleteEntryConfirm(null)}
        title="Delete Daily Entry"
      >
        <div className="space-y-4 text-sm text-slate-200">
          <p>
            Are you sure you want to delete this daily entry? This action cannot
            be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={confirmDeleteEntry}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Deleting..." : "Delete entry"}
            </button>
            <button
              onClick={() => setDeleteEntryConfirm(null)}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteExpenseConfirm}
        onClose={() => setDeleteExpenseConfirm(null)}
        title="Delete Expense"
      >
        <div className="space-y-4 text-sm text-slate-200">
          <p>
            Are you sure you want to delete this expense? This action cannot be
            undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={confirmDeleteExpense}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Deleting..." : "Delete expense"}
            </button>
            <button
              onClick={() => setDeleteExpenseConfirm(null)}
              disabled={isSubmitting}
              className="flex-1 rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

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
