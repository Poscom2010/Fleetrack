import { useMemo, useState, useEffect } from "react";
import {
  validateCashIn,
  validateMileage,
  validateMileageComparison,
} from "../../utils/validators";
import { getLastRecordedMileage, validateMileage as validateMileageAgainstLast } from "../../services/mileageValidationService";

const createDefaultFormState = (entry) => {
  if (!entry) {
    return {
      vehicleId: "",
      driverId: "",
      newDriverName: "",
      date: new Date().toISOString().split("T")[0],
      startLocation: "",
      endLocation: "",
      cashIn: "",
      startMileage: "",
      endMileage: "",
      notes: "",
    };
  }

  const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);

  return {
    vehicleId: entry.vehicleId || "",
    driverId: entry.driverId || "",
    date: entryDate.toISOString().split("T")[0],
    startLocation: entry.startLocation || "",
    endLocation: entry.endLocation || "",
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
 * @param {Array} props.drivers - List of available drivers (for admin/manager)
 * @param {boolean} props.isAdminOrManager - Whether current user is admin or manager
 * @param {string} props.currentUserId - Current user's ID
 * @param {Object} props.entry - Existing entry data for editing (optional)
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {Function} props.onCancel - Callback function when form is cancelled
 * @param {boolean} props.isSubmitting - Whether the form is currently submitting
 */
const DailyEntryForm = ({
  vehicles = [],
  drivers = [],
  isAdminOrManager = false,
  currentUserId = "",
  entry,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState(() => createDefaultFormState(entry));
  const [errors, setErrors] = useState({});
  const [lastMileageInfo, setLastMileageInfo] = useState(null);
  const [mileageWarning, setMileageWarning] = useState("");

  // Fetch last recorded mileage when vehicle changes
  useEffect(() => {
    const fetchLastMileage = async () => {
      if (formData.vehicleId && !entry) { // Only check for new entries
        const lastMileage = await getLastRecordedMileage(formData.vehicleId);
        setLastMileageInfo(lastMileage);
        setMileageWarning(""); // Clear any previous warnings
      }
    };

    fetchLastMileage();
  }, [formData.vehicleId, entry]);

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

    if (!formData.startLocation || formData.startLocation.trim() === "") {
      newErrors.startLocation = "Start location is required";
    }

    if (!formData.endLocation || formData.endLocation.trim() === "") {
      newErrors.endLocation = "End location is required";
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

    const mileageComparisonValidation = validateMileageComparison(
      formData.startMileage,
      formData.endMileage
    );
    if (!mileageComparisonValidation.isValid) {
      newErrors.endMileage = mileageComparisonValidation.error;
    }

    // Validate against last recorded mileage
    if (lastMileageInfo && lastMileageInfo.lastMileage) {
      const mileageValidation = validateMileageAgainstLast(
        formData.startMileage,
        formData.endMileage,
        lastMileageInfo.lastMileage
      );

      if (!mileageValidation.isValid) {
        newErrors.startMileage = mileageValidation.message;
      } else if (mileageValidation.warning) {
        setMileageWarning(mileageValidation.warning);
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
        driverId: isAdminOrManager ? formData.driverId : currentUserId,
        cashIn: parseFloat(formData.cashIn),
        startMileage: parseFloat(formData.startMileage),
        endMileage: parseFloat(formData.endMileage),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-sm text-slate-200">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="startLocation"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            From (Start Location) *
          </label>
          <input
            type="text"
            id="startLocation"
            name="startLocation"
            value={formData.startLocation}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.startLocation
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            placeholder="e.g., Johannesburg"
            disabled={isSubmitting}
          />
          {errors.startLocation && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.startLocation}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="endLocation"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            To (End Location) *
          </label>
          <input
            type="text"
            id="endLocation"
            name="endLocation"
            value={formData.endLocation}
            onChange={handleChange}
            className={`w-full rounded-2xl border px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-brand-500/60 ${
              errors.endLocation
                ? "border-rose-400/60 bg-rose-500/10"
                : "border-white/10 bg-surface-200/60"
            }`}
            placeholder="e.g., Pretoria"
            disabled={isSubmitting}
          />
          {errors.endLocation && (
            <p className="mt-1 text-xs font-medium text-rose-300">
              {errors.endLocation}
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
          {lastMileageInfo && (
            <div className="mb-2 bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
              <p className="text-xs text-blue-300">
                📊 Last recorded: <strong>{lastMileageInfo.lastMileage.toLocaleString()} km</strong>
                {lastMileageInfo.date && (
                  <span className="text-slate-400"> on {lastMileageInfo.date.toLocaleDateString()}</span>
                )}
              </p>
            </div>
          )}
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
          {mileageWarning && !errors.startMileage && (
            <p className="mt-1 text-xs font-medium text-amber-300 flex items-start gap-1">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {mileageWarning}
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
