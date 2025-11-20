import { useState } from "react";

const createDefaultFormState = (vehicle) => ({
  name: vehicle?.name || "",
  registrationNumber: vehicle?.registrationNumber || "",
  model: vehicle?.model || "",
  year: vehicle?.year || "",
  serviceInterval: vehicle?.serviceInterval || 5000,
  licenseExpiryDate: vehicle?.licenseExpiryDate || "",
});

/**
 * VehicleForm component for adding or editing vehicles
 * @param {Object} props
 * @param {Object} props.vehicle - Existing vehicle data for editing (optional)
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {Function} props.onCancel - Callback function when form is cancelled
 * @param {boolean} props.isSubmitting - Whether the form is currently submitting
 */
const VehicleForm = ({ vehicle, onSubmit, onCancel, isSubmitting = false }) => {
  const [formData, setFormData] = useState(() => createDefaultFormState(vehicle));
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "year" || name === "serviceInterval"
          ? parseInt(value, 10) || ""
          : value,
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

    if (!formData.name.trim()) {
      newErrors.name = "Vehicle name is required";
    }

    if (!formData.registrationNumber.trim()) {
      newErrors.registrationNumber = "Registration number is required";
    }

    if (!formData.model.trim()) {
      newErrors.model = "Model is required";
    }

    // Year is optional, but if provided, must be valid
    if (
      formData.year && 
      (formData.year < 1900 || formData.year > new Date().getFullYear() + 1)
    ) {
      newErrors.year = `Year must be between 1900 and ${
        new Date().getFullYear() + 1
      }`;
    }

    // Service interval is required
    if (!formData.serviceInterval || formData.serviceInterval <= 0) {
      newErrors.serviceInterval = "Service interval must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm text-slate-200">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Vehicle Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.name
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            placeholder="e.g., Taxi 1"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-xs font-medium text-rose-300">{errors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="registrationNumber"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Registration Number *
          </label>
          <input
            type="text"
            id="registrationNumber"
            name="registrationNumber"
            value={formData.registrationNumber}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.registrationNumber
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            placeholder="e.g., ABC-1234"
            disabled={isSubmitting}
          />
          {errors.registrationNumber && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.registrationNumber}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="model"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Model *
          </label>
          <input
            type="text"
            id="model"
            name="model"
            value={formData.model}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.model
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            placeholder="e.g., Toyota Corolla"
            disabled={isSubmitting}
          />
          {errors.model && (
            <p className="mt-1 text-xs font-medium text-rose-300">{errors.model}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="year"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Year (Optional)
          </label>
          <input
            type="number"
            id="year"
            name="year"
            value={formData.year}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.year
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            placeholder="e.g., 2020"
            disabled={isSubmitting}
          />
          {errors.year && (
            <p className="mt-1 text-xs font-medium text-rose-300">{errors.year}</p>
          )}
          {!errors.year && (
            <p className="mt-1 text-xs text-slate-400">
              Year the vehicle was made (optional)
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="serviceInterval"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            SERVICE INTERVAL (KM) *
          </label>
          <input
            type="number"
            id="serviceInterval"
            name="serviceInterval"
            value={formData.serviceInterval}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.serviceInterval
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            placeholder="e.g., 5000"
            disabled={isSubmitting}
          />
          {errors.serviceInterval && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.serviceInterval}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Example: Service every 5,000 km, enter 5000
          </p>
        </div>

        <div>
          <label
            htmlFor="licenseExpiryDate"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            License Expiry Date
          </label>
          <input
            type="date"
            id="licenseExpiryDate"
            name="licenseExpiryDate"
            value={formData.licenseExpiryDate}
            onChange={handleChange}
            className="w-full rounded-2xl border border-white/10 bg-surface-200/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60"
            disabled={isSubmitting}
          />
          <p className="mt-2 text-xs text-slate-400">
            Alert when vehicle license is about to expire.
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
            : vehicle
            ? "Update Vehicle"
            : "Add Vehicle"}
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

export default VehicleForm;
