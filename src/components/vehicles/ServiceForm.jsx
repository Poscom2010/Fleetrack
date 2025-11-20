import { useState } from "react";

const createDefaultFormState = (vehicle) => {
  return {
    mileage: vehicle?.currentMileage || "",
    serviceType: "Regular Service",
    cost: "",
    description: "",
    performedBy: "",
    date: new Date().toISOString().split("T")[0],
  };
};

/**
 * ServiceForm component for recording service completion
 * @param {Object} props
 * @param {Object} props.vehicle - Vehicle being serviced
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {Function} props.onCancel - Callback function when form is cancelled
 * @param {boolean} props.isSubmitting - Whether the form is currently submitting
 */
const ServiceForm = ({ vehicle, onSubmit, onCancel, isSubmitting = false }) => {
  const [formData, setFormData] = useState(() => createDefaultFormState(vehicle));
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "mileage" || name === "cost" ? parseFloat(value) || "" : value,
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

    if (!formData.mileage || formData.mileage <= 0) {
      newErrors.mileage = "Service mileage is required";
    }

    // Validate mileage is not less than last service
    if (vehicle?.lastServiceMileage && formData.mileage < vehicle.lastServiceMileage) {
      newErrors.mileage = `Mileage must be greater than last service (${vehicle.lastServiceMileage.toLocaleString()} km)`;
    }

    // Validate mileage is not less than current mileage
    if (vehicle?.currentMileage && formData.mileage < vehicle.currentMileage) {
      newErrors.mileage = `Mileage cannot be less than current mileage (${vehicle.currentMileage.toLocaleString()} km)`;
    }

    if (!formData.serviceType.trim()) {
      newErrors.serviceType = "Service type is required";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🔧</div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-300 mb-1">
              Recording Service for {vehicle?.name}
            </p>
            <p className="text-xs text-slate-300">
              {vehicle?.registrationNumber}
            </p>
            {vehicle?.lastServiceMileage > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                Last serviced at: {vehicle.lastServiceMileage.toLocaleString()} km
              </p>
            )}
            {vehicle?.currentMileage > 0 && (
              <p className="text-xs text-slate-400">
                Current mileage: {vehicle.currentMileage.toLocaleString()} km
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Service Mileage */}
        <div>
          <label
            htmlFor="mileage"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Service Mileage (km) *
          </label>
          <input
            type="number"
            id="mileage"
            name="mileage"
            value={formData.mileage}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.mileage
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            placeholder="e.g., 15000"
            disabled={isSubmitting}
            autoFocus
          />
          {errors.mileage && (
            <p className="mt-1 text-xs font-medium text-rose-300">{errors.mileage}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Mileage reading when service was completed
          </p>
        </div>

        {/* Service Date */}
        <div>
          <label
            htmlFor="date"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Service Date *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.date
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            disabled={isSubmitting}
          />
          {errors.date && (
            <p className="mt-1 text-xs font-medium text-rose-300">{errors.date}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Service Type */}
        <div>
          <label
            htmlFor="serviceType"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Service Type *
          </label>
          <select
            id="serviceType"
            name="serviceType"
            value={formData.serviceType}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.serviceType
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            disabled={isSubmitting}
          >
            <option value="Regular Service">Regular Service</option>
            <option value="Oil Change">Oil Change</option>
            <option value="Major Service">Major Service</option>
            <option value="Brake Service">Brake Service</option>
            <option value="Tire Rotation">Tire Rotation</option>
            <option value="Engine Service">Engine Service</option>
            <option value="Transmission Service">Transmission Service</option>
            <option value="Other">Other</option>
          </select>
          {errors.serviceType && (
            <p className="mt-1 text-xs font-medium text-rose-300">{errors.serviceType}</p>
          )}
        </div>

        {/* Service Cost */}
        <div>
          <label
            htmlFor="cost"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            Service Cost (Optional)
          </label>
          <input
            type="number"
            id="cost"
            name="cost"
            value={formData.cost}
            onChange={handleChange}
            className="w-full rounded-2xl border border-white/10 bg-surface-200/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60"
            placeholder="e.g., 500"
            disabled={isSubmitting}
            step="0.01"
          />
          <p className="mt-1 text-xs text-slate-400">
            Total cost of service (if applicable)
          </p>
        </div>
      </div>

      {/* Performed By */}
      <div>
        <label
          htmlFor="performedBy"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          Serviced By (Optional)
        </label>
        <input
          type="text"
          id="performedBy"
          name="performedBy"
          value={formData.performedBy}
          onChange={handleChange}
          className="w-full rounded-2xl border border-white/10 bg-surface-200/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60"
          placeholder="e.g., ABC Auto Service Center"
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-slate-400">
          Name of service center or mechanic
        </p>
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
        >
          Service Notes (Optional)
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-2xl border border-white/10 bg-surface-200/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60"
          placeholder="Additional details about the service..."
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-slate-400">
          Any additional notes or parts replaced
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-2xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-green-700 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Recording Service..." : "Record Service"}
        </button>
      </div>
    </form>
  );
};

export default ServiceForm;
