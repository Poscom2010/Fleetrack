import { useMemo, useState } from "react";
import {
  validateCashIn,
  validateMileage,
  validateMileageComparison,
} from "../../utils/validators";

const createDefaultFormState = (entry) => {
  if (!entry) {
    return {
      vehicleId: "",
      date: new Date().toISOString().split("T")[0],
      cashIn: "",
      startMileage: "",
      endMileage: "",
      notes: "",
    };
  }

  const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);

  return {
    vehicleId: entry.vehicleId || "",
    date: entryDate.toISOString().split("T")[0],
    cashIn: entry.cashIn?.toString() || "",
    startMileage: entry.startMileage?.toString() || "",
    endMileage: entry.endMileage?.toString() || "",
    notes: entry.notes || "",
  };
};

/**
 * DailyEntryForm component for adding or editing daily entries
 * @param {Object} props
 * @param {Array} props.vehicles - List of available vehicles
 * @param {Object} props.entry - Existing entry data for editing (optional)
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {Function} props.onCancel - Callback function when form is cancelled
 * @param {boolean} props.isSubmitting - Whether the form is currently submitting
 */
const DailyEntryForm = ({
  vehicles = [],
  entry,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState(() => createDefaultFormState(entry));
  const [errors, setErrors] = useState({});

  const distanceTraveled = useMemo(() => {
    const start = parseFloat(formData.startMileage);
    const end = parseFloat(formData.endMileage);

    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return end - start;
    }
    return 0;
  }, [formData.endMileage, formData.startMileage]);

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

    const cashInValidation = validateCashIn(formData.cashIn);
    if (!cashInValidation.isValid) {
      newErrors.cashIn = cashInValidation.error;
    }

    const startMileageValidation = validateMileage(formData.startMileage);
    if (!startMileageValidation.isValid) {
      newErrors.startMileage = startMileageValidation.error;
    }

    const endMileageValidation = validateMileage(formData.endMileage);
    if (!endMileageValidation.isValid) {
      newErrors.endMileage = endMileageValidation.error;
    }

    if (startMileageValidation.isValid && endMileageValidation.isValid) {
      const comparisonValidation = validateMileageComparison(
        formData.startMileage,
        formData.endMileage
      );
      if (!comparisonValidation.isValid) {
        newErrors.endMileage = comparisonValidation.error;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        ...formData,
        cashIn: parseFloat(formData.cashIn),
        startMileage: parseFloat(formData.startMileage),
        endMileage: parseFloat(formData.endMileage),
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
            disabled={isSubmitting || Boolean(entry)}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="cashIn"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Cash-In *
          </label>
          <div
            className={`flex items-center rounded-2xl border px-3 py-2 ${
              errors.cashIn
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
          >
            <span className="mr-2 text-slate-400">$</span>
            <input
              type="number"
              id="cashIn"
              name="cashIn"
              value={formData.cashIn}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full bg-transparent text-white outline-none"
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>
          {errors.cashIn && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.cashIn}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="startMileage"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Start Mileage (km) *
          </label>
          <input
            type="number"
            id="startMileage"
            name="startMileage"
            value={formData.startMileage}
            onChange={handleChange}
            step="0.1"
            min="0"
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.startMileage
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            placeholder="e.g., 10000"
            disabled={isSubmitting}
          />
          {errors.startMileage && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.startMileage}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="endMileage"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            End Mileage (km) *
          </label>
          <input
            type="number"
            id="endMileage"
            name="endMileage"
            value={formData.endMileage}
            onChange={handleChange}
            step="0.1"
            min="0"
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.endMileage
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            placeholder="e.g., 10150"
            disabled={isSubmitting}
          />
          {errors.endMileage && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.endMileage}
            </p>
          )}
        </div>
      </div>

      {distanceTraveled > 0 && (
        <div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          Distance traveled: {distanceTraveled.toFixed(1)} km
        </div>
      )}

      <div>
        <label
          htmlFor="notes"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          className="w-full rounded-2xl border border-white/10 bg-surface-200/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60"
          placeholder="Any additional notes..."
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-2xl bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition hover:shadow-brand/70 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : entry ? "Update Entry" : "Add Entry"}
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

export default DailyEntryForm;
