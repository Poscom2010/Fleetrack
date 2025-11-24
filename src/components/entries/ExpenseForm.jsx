import { useMemo, useState, useEffect } from "react";
import {
  validateExpenseAmount,
  validateExpenseDescription,
} from "../../utils/validators";

const categories = [
  "Fuel",
  "Maintenance",
  "Repairs",
  "Insurance",
  "Registration",
  "Cleaning",
  "Parking",
  "Tolls",
  "Other",
];

const createDefaultFormState = (expense, initialValues = null) => {
  if (!expense) {
    return {
      vehicleId: initialValues?.vehicleId || "",
      driverId: initialValues?.driverId || "",
      newDriverName: "",
      date: initialValues?.date || new Date().toISOString().split("T")[0],
      expenseItems: [{ description: "", amount: "", category: "Fuel" }], // Array of expense items
    };
  }

  // Handle Firestore timestamp or Date object
  let expenseDate;
  if (expense.date?.toDate) {
    // Firestore timestamp
    expenseDate = expense.date.toDate();
  } else if (expense.date instanceof Date) {
    // Already a Date object
    expenseDate = expense.date;
  } else {
    // String or other format
    expenseDate = new Date(expense.date);
  }

  return {
    vehicleId: expense.vehicleId || "",
    date: expenseDate.toISOString().split("T")[0],
    expenseItems: [{ 
      description: expense.description || "",
      amount: expense.amount?.toString() || "",
      category: expense.category || "Fuel",
    }],
  };
};

/**
 * ExpenseForm component for adding or editing expense entries
 * @param {Object} props
 * @param {Array} props.vehicles - List of available vehicles
 * @param {Array} props.drivers - List of available drivers (for admin/manager)
 * @param {boolean} props.isAdminOrManager - Whether current user is admin or manager
 * @param {Object} props.expense - Existing expense data for editing (optional)
 * @param {Object} props.initialValues - Initial values for vehicle and date (optional)
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {Function} props.onCancel - Callback function when form is cancelled
 * @param {boolean} props.isSubmitting - Whether the form is currently submitting
 */
const ExpenseForm = ({
  vehicles = [],
  drivers = [],
  isAdminOrManager = false,
  expense,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState(() => createDefaultFormState(expense, initialValues));
  const [errors, setErrors] = useState({});

  const sortedCategories = useMemo(() => categories, []);

  // Reinitialize form when expense or initialValues change
  useEffect(() => {
    setFormData(createDefaultFormState(expense, initialValues));
    setErrors({});
  }, [expense, initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.vehicleId) {
      newErrors.vehicleId = "Please select a vehicle";
    }

    if (isAdminOrManager && !formData.driverId) {
      newErrors.driverId = "Please select a driver";
    }

    // If "New Driver" is selected, validate the new driver name
    if (isAdminOrManager && formData.driverId === 'NEW_DRIVER') {
      if (!formData.newDriverName || formData.newDriverName.trim() === '') {
        newErrors.newDriverName = "Please enter the new driver's name";
      } else if (formData.newDriverName.trim().length < 2) {
        newErrors.newDriverName = "Driver name must be at least 2 characters";
      }
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    // Validate all expense items
    const hasValidExpense = formData.expenseItems.some(item => 
      item.description.trim() && item.amount && parseFloat(item.amount) > 0
    );

    if (!hasValidExpense) {
      newErrors.expenseItems = "Please add at least one valid expense";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      // Submit data includes all expense items
      onSubmit({
        vehicleId: formData.vehicleId,
        driverId: formData.driverId,
        newDriverName: formData.newDriverName,
        date: formData.date,
        expenseItems: formData.expenseItems.filter(item => 
          item.description.trim() && item.amount && parseFloat(item.amount) > 0
        ).map(item => ({
          ...item,
          amount: parseFloat(item.amount),
        })),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm text-slate-200">
      {/* Info Banner - Shows when form is pre-filled */}
      {initialValues && !expense && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs text-blue-300 font-semibold">Linked to Last Entry</p>
              <p className="text-xs text-slate-300 mt-0.5">
                Vehicle and date are pre-filled from your last trip entry. You can change them if needed.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Driver Selection - Only for Admin/Manager */}
      {isAdminOrManager && (
        <div>
          <label
            htmlFor="driverId"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Driver *
          </label>
          <select
            id="driverId"
            name="driverId"
            value={formData.driverId}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.driverId
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            disabled={isSubmitting}
          >
            <option value="">Select a driver</option>
            <option value="NEW_DRIVER">➕ New Driver (Enter name below)</option>
            <optgroup label="Registered Users">
              {drivers.filter(d => d.type === 'user').map((driver) => (
                <option key={driver.id} value={driver.id}>
                  ✓ {driver.fullName || driver.email}
                </option>
              ))}
            </optgroup>
            <optgroup label="Driver Profiles (Not Invited Yet)">
              {drivers.filter(d => d.type === 'profile').map((driver) => (
                <option key={driver.id} value={driver.id}>
                  👤 {driver.fullName} {driver.email ? `(${driver.email})` : ''}
                </option>
              ))}
            </optgroup>
          </select>
          {errors.driverId && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.driverId}
            </p>
          )}
        </div>
      )}

      {/* New Driver Name Input - Shows when "New Driver" is selected */}
      {isAdminOrManager && formData.driverId === 'NEW_DRIVER' && (
        <div>
          <label
            htmlFor="newDriverName"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            New Driver Name *
          </label>
          <input
            type="text"
            id="newDriverName"
            name="newDriverName"
            value={formData.newDriverName}
            onChange={handleChange}
            placeholder="Enter driver's full name"
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.newDriverName
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            disabled={isSubmitting}
          />
          {errors.newDriverName && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.newDriverName}
            </p>
          )}
          <p className="mt-1 text-xs text-blue-300">
            💡 A driver profile will be created automatically for this driver
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="vehicleId"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Vehicle *
          </label>
          <select
            id="vehicleId"
            name="vehicleId"
            value={formData.vehicleId}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.vehicleId
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            disabled={isSubmitting || Boolean(expense)}
          >
            <option value="">Select a vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} - {vehicle.registrationNumber}
              </option>
            ))}
          </select>
          {errors.vehicleId && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.vehicleId}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="date"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Date * {initialValues && !expense && formData.date && (
              <span className="text-xs font-normal text-green-400 ml-2">
                ✓ Pre-filled
              </span>
            )}
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date || new Date().toISOString().split("T")[0]}
            onChange={handleChange}
            max={new Date().toISOString().split("T")[0]}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.date
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            disabled={isSubmitting}
          />
          {errors.date && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.date}
            </p>
          )}
        </div>
      </div>

      {/* Multiple Expense Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Expenses *
          </label>
          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                expenseItems: [...prev.expenseItems, { description: '', amount: '', category: 'Fuel' }]
              }));
            }}
            className="flex items-center gap-1 rounded-lg bg-blue-600/20 px-3 py-1.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-600/30"
            disabled={isSubmitting}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Another Expense
          </button>
        </div>

        {formData.expenseItems.map((item, index) => (
          <div key={index} className="grid grid-cols-12 gap-2 p-3 rounded-xl border border-white/10 bg-surface-200/40">
            <div className="col-span-12 sm:col-span-4">
              <input
                type="text"
                value={item.description}
                onChange={(e) => {
                  const newItems = [...formData.expenseItems];
                  newItems[index].description = e.target.value;
                  setFormData(prev => ({ ...prev, expenseItems: newItems }));
                }}
                placeholder="e.g., Fuel, Toll, Parking"
                className="w-full rounded-lg border border-white/10 bg-surface-200/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60"
                disabled={isSubmitting}
              />
            </div>
            <div className="col-span-12 sm:col-span-3">
              <select
                value={item.category}
                onChange={(e) => {
                  const newItems = [...formData.expenseItems];
                  newItems[index].category = e.target.value;
                  setFormData(prev => ({ ...prev, expenseItems: newItems }));
                }}
                className="w-full rounded-lg border border-white/10 bg-surface-200/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60"
                disabled={isSubmitting}
              >
                {sortedCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-10 sm:col-span-4">
              <div className="flex items-center rounded-lg border border-white/10 bg-surface-200/60 px-3 py-2">
                <span className="mr-2 text-slate-400">$</span>
                <input
                  type="number"
                  value={item.amount}
                  onChange={(e) => {
                    const newItems = [...formData.expenseItems];
                    newItems[index].amount = e.target.value;
                    setFormData(prev => ({ ...prev, expenseItems: newItems }));
                  }}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full bg-transparent text-white outline-none text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  const newItems = formData.expenseItems.filter((_, i) => i !== index);
                  if (newItems.length === 0) {
                    newItems.push({ description: '', amount: '', category: 'Fuel' });
                  }
                  setFormData(prev => ({ ...prev, expenseItems: newItems }));
                }}
                className="rounded-lg bg-red-600/20 p-2 text-red-400 transition hover:bg-red-600/30"
                disabled={isSubmitting}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        
        {errors.expenseItems && (
          <p className="text-xs font-medium text-rose-300">
            {errors.expenseItems}
          </p>
        )}

        <div className="flex justify-end">
          <p className="text-sm font-semibold text-slate-300">
            Total: <span className="text-red-400">
              ${formData.expenseItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-2xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition hover:shadow-brand/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Saving..."
            : expense
            ? "Update Expense"
            : "Add Expense"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-2xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ExpenseForm;
