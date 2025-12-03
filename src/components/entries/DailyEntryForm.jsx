import { useMemo, useState, useEffect } from "react";
import {
  validateCashIn,
  validateMileage,
  validateMileageComparison,
} from "../../utils/validators";
import { getLastRecordedMileage, validateMileage as validateMileageAgainstLast } from "../../services/mileageValidationService";
import { validateForMileageGap } from "../../services/mileageGapDetectionService";
import { getLastDriverForVehicle, getLastVehicleForDriver } from "../../services/lastUsedService";

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

  // Handle Firestore timestamp or Date object
  let entryDate;
  if (entry.date?.toDate) {
    // Firestore timestamp
    entryDate = entry.date.toDate();
  } else if (entry.date instanceof Date) {
    // Already a Date object
    entryDate = entry.date;
  } else {
    // String or other format
    entryDate = new Date(entry.date);
  }

  return {
    vehicleId: entry.vehicleId || "",
    driverId: entry.driverId || entry.userId || "", // Use userId if driverId not present
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
 * @param {Function} props.onAddNewVehicle - Callback function when "Add New Vehicle" is selected
 * @param {string} props.pendingVehicleId - ID of newly created vehicle to auto-select
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
  onAddNewVehicle,
  pendingVehicleId,
  companyId,
}) => {
  const [formData, setFormData] = useState(() => createDefaultFormState(entry));
  const [errors, setErrors] = useState({});
  const [lastMileageInfo, setLastMileageInfo] = useState(null);
  const [mileageWarning, setMileageWarning] = useState("");
  const [mileageGapWarning, setMileageGapWarning] = useState(null);

  // Auto-select newly created vehicle
  useEffect(() => {
    if (pendingVehicleId && vehicles.some(v => v.id === pendingVehicleId)) {
      console.log('🎯 Auto-selecting newly created vehicle:', pendingVehicleId);
      setFormData((prev) => ({
        ...prev,
        vehicleId: pendingVehicleId,
      }));
      // Note: Parent component should clear pendingVehicleId after vehicle is in dropdown
    }
  }, [pendingVehicleId, vehicles]);

  // Fetch previous entry's mileage
  useEffect(() => {
    const fetchLastMileage = async () => {
      if (formData.vehicleId) {
        let lastMileage;
        
        if (entry?.id) {
          // EDITING: Get the last entry BEFORE this date (for chronological validation)
          const entryDate = new Date(formData.date);
          lastMileage = await getLastRecordedMileage(formData.vehicleId, entryDate, entry.id);
        } else {
          // NEW ENTRY: Get the absolute latest mileage (no date filter)
          lastMileage = await getLastRecordedMileage(formData.vehicleId, null, null);
        }
        
        setLastMileageInfo(lastMileage);
        setMileageWarning(""); // Clear any previous warnings
        
        if (lastMileage) {
          console.log(`🚗 ${entry?.id ? 'Previous' : 'Latest'} entry's end mileage: ${lastMileage.lastMileage.toLocaleString()} km (${lastMileage.date.toLocaleDateString()})`);
        } else {
          console.log(`🚗 No previous entries found`);
        }
      }
    };

    fetchLastMileage();
  }, [formData.vehicleId, formData.date, entry?.id]);

  // Check for mileage gaps when start mileage is entered
  useEffect(() => {
    const checkMileageGap = async () => {
      if (formData.vehicleId && formData.startMileage && formData.date && companyId) {
        const gapCheck = await validateForMileageGap(
          formData.vehicleId,
          formData.startMileage,
          formData.date,
          companyId
        );
        
        if (gapCheck.hasGap) {
          setMileageGapWarning(gapCheck);
          console.log(`⚠️ Mileage gap detected: ${gapCheck.unaccountedKm} km unaccounted`);
        } else {
          setMileageGapWarning(null);
        }
      }
    };

    checkMileageGap();
  }, [formData.vehicleId, formData.startMileage, formData.date, companyId]);

  const distanceTraveled = useMemo(() => {
    const start = parseFloat(formData.startMileage);
    const end = parseFloat(formData.endMileage);

    if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
      return end - start;
    }
    return 0;
  }, [formData.endMileage, formData.startMileage]);

  const handleChange = async (e) => {
    const { name, value } = e.target;
    
    // Handle "Add New Vehicle" selection
    if (name === 'vehicleId' && value === 'ADD_NEW_VEHICLE') {
      console.log('➕ User selected "Add New Vehicle"');
      if (onAddNewVehicle) {
        onAddNewVehicle();
      }
      return; // Don't update form data
    }
    
    // Auto-populate driver when vehicle is selected (always update to last driver for this vehicle)
    if (name === 'vehicleId' && value && value !== 'ADD_NEW_VEHICLE' && isAdminOrManager) {
      const lastDriver = await getLastDriverForVehicle(value);
      if (lastDriver) {
        console.log(`🚗 Auto-populating driver for vehicle: ${lastDriver}`);
        setFormData((prev) => ({
          ...prev,
          vehicleId: value,
          driverId: lastDriver,
        }));
        if (errors[name]) {
          setErrors((prev) => ({
            ...prev,
            [name]: "",
            driverId: "",
          }));
        }
        return;
      }
    }

    // Auto-populate vehicle when driver is selected
    if (name === 'driverId' && value && value !== 'NEW_DRIVER' && !formData.vehicleId) {
      const lastVehicle = await getLastVehicleForDriver(value);
      if (lastVehicle) {
        setFormData((prev) => ({
          ...prev,
          driverId: value,
          vehicleId: lastVehicle,
        }));
        if (errors[name]) {
          setErrors((prev) => ({
            ...prev,
            [name]: "",
            vehicleId: "",
          }));
        }
        return;
      }
    }
    
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
    <form onSubmit={handleSubmit} className="space-y-4 text-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {isAdminOrManager && (
          <div>
            <label
              htmlFor="driverId"
              className="mb-1 block text-sm font-medium text-baltic-900 dark:text-gray-100"
            >
              Driver *
            </label>
            <select
              id="driverId"
              name="driverId"
              value={formData.driverId}
              onChange={handleChange}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors
                focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                ${errors.driverId
                  ? "border-danger bg-danger/10"
                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                } text-baltic-900 dark:text-gray-100`}
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
              <p className="mt-1 text-xs font-medium text-danger">
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
              className="mb-1 block text-sm font-medium text-baltic-900 dark:text-gray-100"
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
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors
                focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                ${errors.newDriverName
                  ? "border-danger bg-danger/10"
                  : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                } text-baltic-900 dark:text-gray-100`}
              disabled={isSubmitting}
            />
            {errors.newDriverName && (
              <p className="mt-1 text-xs font-medium text-danger">
                {errors.newDriverName}
              </p>
            )}
            <p className="mt-1 text-xs text-baltic-600 dark:text-baltic-400">
              💡 A driver profile will be created automatically for this driver
            </p>
          </div>
        )}
        <div>
          <label
            htmlFor="vehicleId"
            className="mb-1 block text-sm font-medium text-baltic-900 dark:text-gray-100"
          >
            Vehicle *
          </label>
          <select
            id="vehicleId"
            name="vehicleId"
            value={formData.vehicleId}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              ${errors.vehicleId
                ? "border-danger bg-danger/10"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              } text-baltic-900 dark:text-gray-100`}
            disabled={isSubmitting}
          >
            <option value="">Select a vehicle</option>
            {!entry && (
              <option value="ADD_NEW_VEHICLE" className="text-baltic-600 dark:text-baltic-400 font-semibold">
                ➕ Add New Vehicle
              </option>
            )}
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.name} - {vehicle.registrationNumber}
              </option>
            ))}
          </select>
          {errors.vehicleId && (
            <p className="mt-1 text-xs font-medium text-danger">
              {errors.vehicleId}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="date"
            className="mb-1 block text-sm font-medium text-baltic-900 dark:text-gray-100"
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
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              ${errors.date
                ? "border-danger bg-danger/10"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              } text-baltic-900 dark:text-gray-100`}
            disabled={isSubmitting}
          />
          {errors.date && (
            <p className="mt-1 text-xs font-medium text-danger">
              {errors.date}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="startLocation"
            className="mb-1 block text-sm font-medium text-baltic-900 dark:text-gray-100"
          >
            From (Start Location) *
          </label>
          <input
            type="text"
            id="startLocation"
            name="startLocation"
            value={formData.startLocation}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              ${errors.startLocation
                ? "border-danger bg-danger/10"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              } text-baltic-900 dark:text-gray-100`}
            placeholder="e.g., Johannesburg"
            disabled={isSubmitting}
          />
          {errors.startLocation && (
            <p className="mt-1 text-xs font-medium text-danger">
              {errors.startLocation}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="endLocation"
            className="mb-1 block text-sm font-medium text-baltic-900 dark:text-gray-100"
          >
            To (End Location) *
          </label>
          <input
            type="text"
            id="endLocation"
            name="endLocation"
            value={formData.endLocation}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              ${errors.endLocation
                ? "border-danger bg-danger/10"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              } text-baltic-900 dark:text-gray-100`}
            placeholder="e.g., Pretoria"
            disabled={isSubmitting}
          />
          {errors.endLocation && (
            <p className="mt-1 text-xs font-medium text-danger">
              {errors.endLocation}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="cashIn"
            className="mb-1 block text-sm font-medium text-baltic-900 dark:text-gray-100"
          >
            Cash-In *
          </label>
          <div
            className={`flex items-center rounded-lg border px-3 py-2 ${
              errors.cashIn
                ? "border-danger bg-danger/10"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            }`}
          >
            <span className="mr-2 text-gray-500 dark:text-gray-400">$</span>
            <input
              type="number"
              id="cashIn"
              name="cashIn"
              value={formData.cashIn}
              onChange={handleChange}
              step="0.01"
              min="0"
              className="w-full bg-transparent text-baltic-900 dark:text-gray-100 outline-none"
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </div>
          {errors.cashIn && (
            <p className="mt-1 text-xs font-medium text-danger">
              {errors.cashIn}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="startMileage"
            className="mb-1 block text-sm font-medium text-baltic-900 dark:text-gray-100"
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
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              ${errors.startMileage
                ? "border-danger bg-danger/10"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              } text-baltic-900 dark:text-gray-100`}
            placeholder="e.g., 10000"
            disabled={isSubmitting}
          />
          {lastMileageInfo && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Last mileage: {lastMileageInfo.lastMileage.toLocaleString()} km
            </p>
          )}
          {errors.startMileage && (
            <p className="mt-1 text-xs font-medium text-danger">
              {errors.startMileage}
            </p>
          )}
          {mileageWarning && !errors.startMileage && (
            <p className="mt-1 text-xs font-medium text-warning flex items-start gap-1">
              <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {mileageWarning}
            </p>
          )}
          {mileageGapWarning && !errors.startMileage && (
            <div className={`mt-2 rounded-lg border p-3 ${
              mileageGapWarning.severity === 'high' 
                ? 'border-danger/30 bg-danger/10' 
                : mileageGapWarning.severity === 'medium'
                ? 'border-warning/30 bg-warning/10'
                : 'border-yellow-500/30 bg-yellow-500/10'
            }`}>
              <div className="flex items-start gap-2">
                <svg className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  mileageGapWarning.severity === 'high' 
                    ? 'text-danger' 
                    : mileageGapWarning.severity === 'medium'
                    ? 'text-warning'
                    : 'text-yellow-500'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <p className={`text-xs font-semibold ${
                    mileageGapWarning.severity === 'high' 
                      ? 'text-danger' 
                      : mileageGapWarning.severity === 'medium'
                      ? 'text-warning'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    Mileage Mismatch: {mileageGapWarning.unaccountedKm.toLocaleString()} km gap detected
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="endMileage"
            className="mb-1 block text-sm font-medium text-baltic-900 dark:text-gray-100"
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
            className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              ${errors.endMileage
                ? "border-danger bg-danger/10"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              } text-baltic-900 dark:text-gray-100`}
            placeholder="e.g., 10150"
            disabled={isSubmitting}
          />
          {errors.endMileage && (
            <p className="mt-1 text-xs font-medium text-danger">
              {errors.endMileage}
            </p>
          )}
        </div>
      </div>

      {distanceTraveled > 0 && (
        <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
          Distance traveled: {distanceTraveled.toFixed(1)} km
        </div>
      )}

      <div>
        <label
          htmlFor="notes"
          className="mb-1 block text-sm font-medium text-baltic-900 dark:text-gray-100"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-baltic-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-baltic-500 focus:border-transparent transition-colors"
          placeholder="Any additional notes..."
          disabled={isSubmitting}
        />
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-baltic-500 hover:bg-baltic-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : entry ? "Update Entry" : "Add Entry"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-2.5 text-sm font-semibold text-baltic-900 dark:text-gray-100 transition hover:bg-gray-50 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default DailyEntryForm;
