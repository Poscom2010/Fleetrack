import { useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import VehicleTypeSelector from "./VehicleTypeSelector.jsx";

const createDefaultFormState = (vehicle, defaultVehicleType = "taxi") => ({
  name: vehicle?.name || "",
  registrationNumber: vehicle?.registrationNumber || "",
  model: vehicle?.model || "",
  year: vehicle?.year || "",
  vehicleType: vehicle?.vehicleType || defaultVehicleType,
  serviceInterval: vehicle?.serviceInterval || 5000,
  currentMileage: vehicle?.currentMileage || "",
  nextServiceMileage: vehicle?.nextServiceMileage || "",
  discExpiryDate: vehicle?.discExpiryDate || vehicle?.roadworthinessExpiryDate || "",
});

/**
 * VehicleForm component for adding or editing vehicles
 * @param {Object} props
 * @param {Object} props.vehicle - Existing vehicle data for editing (optional)
 * @param {string} props.defaultVehicleType - Default vehicle type (e.g., 'fuelTruck' for commodity)
 * @param {Function} props.onSubmit - Callback function when form is submitted
 * @param {Function} props.onCancel - Callback function when form is cancelled
 * @param {boolean} props.isSubmitting - Whether the form is currently submitting
 */
const VehicleForm = ({ vehicle, defaultVehicleType = "taxi", onSubmit, onCancel, isSubmitting = false }) => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState(() => createDefaultFormState(vehicle, defaultVehicleType));
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
    <form onSubmit={handleSubmit} className="space-y-4 text-sm text-gray-900">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-gray-900"
          >
            Vehicle Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full rounded-lg border-2 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-baltic-500 transition-all ${
              errors.name
                ? "border-red-400 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            placeholder="e.g., Scania R500"
            disabled={isSubmitting}
          />
          {errors.name && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="registrationNumber"
            className="mb-2 block text-sm font-semibold text-gray-900"
          >
            Registration Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="registrationNumber"
            name="registrationNumber"
            value={formData.registrationNumber}
            onChange={handleChange}
            className={`w-full rounded-lg border-2 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-baltic-500 transition-all ${
              errors.registrationNumber
                ? "border-red-400 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            placeholder="e.g., ABC-1234"
            disabled={isSubmitting}
          />
          {errors.registrationNumber && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {errors.registrationNumber}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="model"
            className="mb-2 block text-sm font-semibold text-gray-900"
          >
            Model <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="model"
            name="model"
            value={formData.model}
            onChange={handleChange}
            className={`w-full rounded-lg border-2 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-baltic-500 transition-all ${
              errors.model
                ? "border-red-400 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            placeholder="e.g., R500"
            disabled={isSubmitting}
          />
          {errors.model && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.model}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="year"
            className="mb-2 block text-sm font-semibold text-gray-900"
          >
            Year <span className="text-gray-500">(Optional)</span>
          </label>
          <input
            type="number"
            id="year"
            name="year"
            value={formData.year}
            onChange={handleChange}
            className={`w-full rounded-lg border-2 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-baltic-500 transition-all ${
              errors.year
                ? "border-red-400 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            placeholder="e.g., 2020"
            disabled={isSubmitting}
          />
          {errors.year && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.year}</p>
          )}
          {!errors.year && (
            <p className="mt-1 text-xs text-gray-600">
              Year the vehicle was made
            </p>
          )}
        </div>
      </div>

      {/* Vehicle Type Selector */}
      <div className="my-4">
        <label
          htmlFor="vehicleType"
          className="mb-2 block text-sm font-semibold text-gray-900"
        >
          Vehicle Type <span className="text-red-500">*</span>
        </label>
        <select
          id="vehicleType"
          name="vehicleType"
          value={formData.vehicleType}
          onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value }))}
          disabled={isSubmitting}
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-300
                   bg-white text-gray-900
                   focus:ring-2 focus:ring-baltic-500 focus:border-baltic-500
                   transition-all"
        >
          <optgroup label="🚛 Commodity Trucks (Fuel/Gas Tracking)">
            <option value="fuelTruck">⛽ Diesel Fuel Truck - Track fuel loads & deliveries</option>
            <option value="lpGasTruck">🔥 LP Gas Truck - Track gas loads & deliveries</option>
          </optgroup>
          <optgroup label="🚚 General Fleet Vehicles">
            <option value="generalTruck">🚛 Cargo Truck - General goods transportation</option>
            <option value="courier">📦 Delivery Van - Parcels & courier services</option>
            <option value="taxi">🚕 Passenger Vehicle - Taxi & ride services</option>
          </optgroup>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="serviceInterval"
            className="mb-2 block text-sm font-semibold text-gray-900"
          >
            Service Interval (KM) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="serviceInterval"
            name="serviceInterval"
            value={formData.serviceInterval}
            onChange={handleChange}
            className={`w-full rounded-lg border-2 px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-baltic-500 transition-all ${
              errors.serviceInterval
                ? "border-red-400 bg-red-50"
                : "border-gray-300 bg-white"
            }`}
            placeholder="e.g., 5000"
            disabled={isSubmitting}
          />
          {errors.serviceInterval && (
            <p className="mt-1 text-xs font-medium text-red-600">
              {errors.serviceInterval}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-600">
            Service every X km (e.g., 5000)
          </p>
        </div>

        <div>
          <label
            htmlFor="currentMileage"
            className="mb-2 block text-sm font-semibold text-gray-900"
          >
            Current Mileage <span className="text-gray-500">(Optional)</span>
          </label>
          <input
            type="number"
            id="currentMileage"
            name="currentMileage"
            value={formData.currentMileage}
            onChange={handleChange}
            step="1"
            min="0"
            placeholder="e.g., 45000"
            className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-baltic-500 transition-all"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-600">
            Current odometer reading (km)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="nextServiceMileage" className="mb-1 block text-xs font-semibold text-gray-900">
            Next Service Mileage <span className="text-gray-500">(Optional)</span>
          </label>
          <input
            type="number"
            id="nextServiceMileage"
            name="nextServiceMileage"
            value={formData.nextServiceMileage}
            onChange={handleChange}
            step="1"
            min="0"
            placeholder="50000"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-baltic-500 transition-all"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label htmlFor="discExpiryDate" className="mb-1 block text-xs font-semibold text-gray-900">
            Disc Expiry <span className="text-gray-500">(Optional but Important)</span>
          </label>
          <input
            type="date"
            id="discExpiryDate"
            name="discExpiryDate"
            value={formData.discExpiryDate}
            onChange={handleChange}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-baltic-500 transition-all"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-600">
            💡 Used for expiry alerts - can be added later
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-6 border-t border-gray-200 sm:flex-row">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-gradient-to-r from-baltic-500 to-baltic-600 hover:from-baltic-600 hover:to-baltic-700 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none"
        >
          {isSubmitting
            ? "Saving..."
            : vehicle
            ? "✓ Update Vehicle"
            : "✓ Add Vehicle"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border-2 border-gray-300 bg-gray-200 hover:bg-gray-300 px-6 py-3 text-sm font-semibold text-gray-900 transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default VehicleForm;
