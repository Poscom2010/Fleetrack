import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const CombinedEntryForm = ({ vehicles, onSubmit, onCancel, isSubmitting, drivers, isAdminOrManager, userId }) => {
  const [formData, setFormData] = useState({
    // Daily Entry fields
    vehicleId: '',
    driverId: userId,
    date: new Date().toISOString().split('T')[0],
    startLocation: '',
    endLocation: '',
    cashIn: '',
    startMileage: '',
    endMileage: '',
    notes: '',
    // Expense fields
    includeExpense: false,
    expenseAmount: '',
    expenseDescription: '',
    expenseCategory: 'fuel',
  });

  const [errors, setErrors] = useState({});

  const expenseCategories = [
    { value: 'fuel', label: 'Fuel' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'repairs', label: 'Repairs' },
    { value: 'toll', label: 'Toll Fees' },
    { value: 'parking', label: 'Parking' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newErrors = {};

    if (!formData.vehicleId) newErrors.vehicleId = 'Vehicle is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.cashIn || parseFloat(formData.cashIn) < 0) {
      newErrors.cashIn = 'Valid cash-in amount is required';
    }
    if (!formData.startMileage || parseFloat(formData.startMileage) < 0) {
      newErrors.startMileage = 'Valid start mileage is required';
    }
    if (!formData.endMileage || parseFloat(formData.endMileage) < 0) {
      newErrors.endMileage = 'Valid end mileage is required';
    }
    if (parseFloat(formData.endMileage) < parseFloat(formData.startMileage)) {
      newErrors.endMileage = 'End mileage must be greater than start mileage';
    }
    
    if (formData.includeExpense) {
      if (!formData.expenseAmount || parseFloat(formData.expenseAmount) <= 0) {
        newErrors.expenseAmount = 'Valid expense amount is required';
      }
      if (!formData.expenseDescription) {
        newErrors.expenseDescription = 'Expense description is required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-300">
          <strong>Quick Capture:</strong> Add both daily entry and expenses for the same vehicle in one go
        </p>
      </div>

      {/* Vehicle Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Vehicle <span className="text-red-400">*</span>
        </label>
        <select
          value={formData.vehicleId}
          onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
          className={`w-full bg-slate-800 border ${
            errors.vehicleId ? 'border-red-500' : 'border-slate-600'
          } rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500`}
        >
          <option value="">Select a vehicle</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.name} ({vehicle.registrationNumber})
            </option>
          ))}
        </select>
        {errors.vehicleId && <p className="text-xs text-red-400 mt-1">{errors.vehicleId}</p>}
      </div>

      {/* Driver Selection (Admin/Manager only) */}
      {isAdminOrManager && drivers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Driver <span className="text-red-400">*</span>
          </label>
          <select
            value={formData.driverId}
            onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
          >
            <option value="">Select a driver</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.fullName || driver.displayName || driver.email}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Date <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className={`w-full bg-slate-800 border ${
            errors.date ? 'border-red-500' : 'border-slate-600'
          } rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500`}
        />
        {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
      </div>

      {/* Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Start Location
          </label>
          <input
            type="text"
            value={formData.startLocation}
            onChange={(e) => setFormData({ ...formData, startLocation: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
            placeholder="e.g., Depot"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            End Location
          </label>
          <input
            type="text"
            value={formData.endLocation}
            onChange={(e) => setFormData({ ...formData, endLocation: e.target.value })}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
            placeholder="e.g., Client Site"
          />
        </div>
      </div>

      {/* Cash In and Mileage */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Cash-In (R) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.cashIn}
            onChange={(e) => setFormData({ ...formData, cashIn: e.target.value })}
            className={`w-full bg-slate-800 border ${
              errors.cashIn ? 'border-red-500' : 'border-slate-600'
            } rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500`}
            placeholder="0.00"
          />
          {errors.cashIn && <p className="text-xs text-red-400 mt-1">{errors.cashIn}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Start Mileage (km) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={formData.startMileage}
            onChange={(e) => setFormData({ ...formData, startMileage: e.target.value })}
            className={`w-full bg-slate-800 border ${
              errors.startMileage ? 'border-red-500' : 'border-slate-600'
            } rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500`}
            placeholder="0"
          />
          {errors.startMileage && <p className="text-xs text-red-400 mt-1">{errors.startMileage}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            End Mileage (km) <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            value={formData.endMileage}
            onChange={(e) => setFormData({ ...formData, endMileage: e.target.value })}
            className={`w-full bg-slate-800 border ${
              errors.endMileage ? 'border-red-500' : 'border-slate-600'
            } rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500`}
            placeholder="0"
          />
          {errors.endMileage && <p className="text-xs text-red-400 mt-1">{errors.endMileage}</p>}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
          rows="2"
          placeholder="Additional notes..."
        />
      </div>

      {/* Expense Section */}
      <div className="border-t border-slate-700 pt-4 mt-4">
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={formData.includeExpense}
            onChange={(e) => setFormData({ ...formData, includeExpense: e.target.checked })}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm font-medium text-slate-300">Add expense for this trip</span>
        </label>

        {formData.includeExpense && (
          <div className="space-y-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Amount (R) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.expenseAmount}
                  onChange={(e) => setFormData({ ...formData, expenseAmount: e.target.value })}
                  className={`w-full bg-slate-800 border ${
                    errors.expenseAmount ? 'border-red-500' : 'border-slate-600'
                  } rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500`}
                  placeholder="0.00"
                />
                {errors.expenseAmount && <p className="text-xs text-red-400 mt-1">{errors.expenseAmount}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.expenseCategory}
                  onChange={(e) => setFormData({ ...formData, expenseCategory: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500"
                >
                  {expenseCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.expenseDescription}
                onChange={(e) => setFormData({ ...formData, expenseDescription: e.target.value })}
                className={`w-full bg-slate-800 border ${
                  errors.expenseDescription ? 'border-red-500' : 'border-slate-600'
                } rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500`}
                placeholder="e.g., Fuel for delivery"
              />
              {errors.expenseDescription && <p className="text-xs text-red-400 mt-1">{errors.expenseDescription}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-brand-gradient text-white px-6 py-2.5 rounded-lg font-medium hover:shadow-brand transition disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2.5 border border-slate-600 text-slate-300 rounded-lg font-medium hover:border-slate-500 transition disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

CombinedEntryForm.propTypes = {
  vehicles: PropTypes.array.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool,
  drivers: PropTypes.array,
  isAdminOrManager: PropTypes.bool,
  userId: PropTypes.string,
};

export default CombinedEntryForm;
