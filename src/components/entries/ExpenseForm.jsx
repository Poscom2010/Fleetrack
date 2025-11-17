import { useMemo, useState } from "react";
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

const createDefaultFormState = (expense) => {
  if (!expense) {
    return {
      vehicleId: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: "",
      category: "Other",
    };
  }

  const expenseDate =
    expense.date instanceof Date ? expense.date : new Date(expense.date);

  return {
    vehicleId: expense.vehicleId || "",
    date: expenseDate.toISOString().split("T")[0],
    description: expense.description || "",
    amount: expense.amount?.toString() || "",
    category: expense.category || "Other",
  };
};

/**
 * ExpenseForm component for adding or editing expense entries
 * @param {Object} props
 * @param {Array} props.vehicles - List of available vehicles
 * @param {Object} props.expense - Existing expense data for editing (optional)
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {Function} props.onCancel - Callback function when form is cancelled
 * @param {boolean} props.isSubmitting - Whether the form is currently submitting
 */
const ExpenseForm = ({
  vehicles = [],
  expense,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState(() => createDefaultFormState(expense));
  const [errors, setErrors] = useState({});

  const sortedCategories = useMemo(() => categories, []);

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

    if (!formData.date) {
      newErrors.date = "Date is required";
    }

    const descriptionValidation = validateExpenseDescription(formData.description);
    if (!descriptionValidation.isValid) {
      newErrors.description = descriptionValidation.error;
    }

    const amountValidation = validateExpenseAmount(formData.amount);
    if (!amountValidation.isValid) {
      newErrors.amount = amountValidation.error;
    }

    if (!formData.category) {
      newErrors.category = "Please select a category";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        ...formData,
        amount: parseFloat(formData.amount),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm text-slate-200">
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
            Date *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
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

      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          Description *
        </label>
        <input
          type="text"
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
            errors.description
              ? "border-rose-400/60 bg-rose-500/10"
              : "border-white/10 bg-surface-200/60"
          }`}
          placeholder="e.g., Oil change, Fuel refill"
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="mt-1 text-xs font-medium text-rose-300">
            {errors.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="amount"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Amount *
          </label>
          <div
            className={`flex items-center rounded-2xl border px-3 py-2 ${
              errors.amount
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
          >
            <span className="mr-2 text-slate-400">$</span>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full bg-transparent text-white outline-none"
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.amount}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="category"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.category
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            disabled={isSubmitting}
          >
            {sortedCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.category}
            </p>
          )}
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
