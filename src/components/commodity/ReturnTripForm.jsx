import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import { createReturnTrip, validateReturnTrip } from '../../services/returnTripService';
import { getLastRecordedMileage } from '../../services/vehicleMileageService';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const ReturnTripForm = ({ offloadEvent, loadEvent, onSuccess, onCancel }) => {
  const { user, company } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lastMileage, setLastMileage] = useState(null);
  const [formData, setFormData] = useState({
    returnStartDate: new Date().toISOString().slice(0, 10),
    mileageAtCustomer: '',
    returnEndDate: new Date().toISOString().slice(0, 10),
    mileageAtDepot: '',
    fuelUsed: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState([]);
  
  // Fetch most recent mileage when component mounts
  useEffect(() => {
    const fetchMileage = async () => {
      if (offloadEvent?.vehicleId && company?.id) {
        try {
          const mileageData = await getLastRecordedMileage(offloadEvent.vehicleId, company.id);
          setLastMileage(mileageData);
          // Auto-populate mileageAtCustomer with most recent mileage
          if (mileageData?.mileage) {
            setFormData(prev => ({
              ...prev,
              mileageAtCustomer: mileageData.mileage.toString()
            }));
          }
          console.log('✅ Fetched last mileage for return trip:', mileageData);
        } catch (error) {
          console.error('Error fetching last mileage:', error);
        }
      }
    };
    fetchMileage();
  }, [offloadEvent, company]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Validate on change if we have enough data
    if (name === 'mileageAtDepot' && value && formData.mileageAtCustomer) {
      validateForm({ ...formData, [name]: value });
    }
  };

  const validateForm = (data = formData) => {
    const newErrors = {};
    
    if (!data.returnStartDate) {
      newErrors.returnStartDate = 'Return start date is required';
    }
    
    if (!data.mileageAtCustomer) {
      newErrors.mileageAtCustomer = 'Mileage at customer is required';
    }
    
    if (!data.returnEndDate) {
      newErrors.returnEndDate = 'Return end date is required';
    }
    
    if (!data.mileageAtDepot) {
      newErrors.mileageAtDepot = 'Mileage at depot is required';
    }
    
    // Validate mileage logic
    if (data.mileageAtDepot && data.mileageAtCustomer) {
      if (parseFloat(data.mileageAtDepot) <= parseFloat(data.mileageAtCustomer)) {
        newErrors.mileageAtDepot = 'Mileage at depot must be greater than mileage at customer';
      }
    }
    
    // Validate dates - allow same day returns
    if (data.returnEndDate && data.returnStartDate) {
      if (new Date(data.returnEndDate) < new Date(data.returnStartDate)) {
        newErrors.returnEndDate = 'Return end date cannot be before start date';
      }
    }
    
    setErrors(newErrors);
    
    // Check for warnings
    if (Object.keys(newErrors).length === 0 && loadEvent && offloadEvent) {
      const validation = validateReturnTrip(data, offloadEvent, loadEvent);
      setWarnings(validation.warnings);
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    setLoading(true);
    
    try {
      const returnTripData = {
        ...formData,
        offloadEventId: offloadEvent.id,
        loadEventId: loadEvent?.id,
        vehicleId: offloadEvent.vehicleId,
        driverId: offloadEvent.driverId,
        mileageAtCustomer: parseFloat(formData.mileageAtCustomer),
        mileageAtDepot: parseFloat(formData.mileageAtDepot),
        fuelUsed: formData.fuelUsed ? parseFloat(formData.fuelUsed) : null
      };
      
      await createReturnTrip(user.uid, company.id, returnTripData);
      
      toast.success('Return trip recorded successfully!');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating return trip:', error);
      toast.error(error.message || 'Failed to create return trip');
    } finally {
      setLoading(false);
    }
  };

  const returnDistance = formData.mileageAtDepot && formData.mileageAtCustomer
    ? parseFloat(formData.mileageAtDepot) - parseFloat(formData.mileageAtCustomer)
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          🔄 <strong>Return Trip:</strong> Record the empty journey back to depot.
        </p>
      </div>

      {/* Return Journey Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Left Customer On *
          </label>
          <input
            type="date"
            name="returnStartDate"
            value={formData.returnStartDate}
            onChange={handleChange}
            max={new Date().toISOString().slice(0, 10)}
            className={`w-full px-3 py-1.5 rounded-lg border ${
              errors.returnStartDate
                ? 'border-danger bg-danger/10'
                : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
            focus:ring-2 focus:ring-baltic-500 focus:border-transparent transition-colors`}
            disabled={loading}
          />
          {errors.returnStartDate && (
            <p className="mt-1 text-sm text-danger">{errors.returnStartDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Arrived at Depot On *
          </label>
          <input
            type="date"
            name="returnEndDate"
            value={formData.returnEndDate}
            onChange={handleChange}
            max={new Date().toISOString().slice(0, 10)}
            className={`w-full px-3 py-1.5 rounded-lg border ${
              errors.returnEndDate
                ? 'border-danger bg-danger/10'
                : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
            focus:ring-2 focus:ring-baltic-500 focus:border-transparent transition-colors`}
            disabled={loading}
          />
          {errors.returnEndDate && (
            <p className="mt-1 text-sm text-danger">{errors.returnEndDate}</p>
          )}
        </div>
      </div>

      {/* Mileage Readings */}
      <div className="bg-baltic-50 dark:bg-gray-700/50 p-2 rounded-lg space-y-2">
        <h3 className="text-sm font-semibold text-baltic-900 dark:text-gray-100">
          Odometer Readings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              At Customer (km) *
            </label>
            <input
              type="number"
              name="mileageAtCustomer"
              value={formData.mileageAtCustomer}
              onChange={handleChange}
              step="0.1"
              min="0"
              placeholder="12345.0"
              className={`w-full px-3 py-1.5 rounded-lg border ${
                errors.mileageAtCustomer
                  ? 'border-danger bg-danger/10'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent transition-colors`}
              disabled={loading}
            />
            {errors.mileageAtCustomer && (
              <p className="mt-1 text-sm text-danger">{errors.mileageAtCustomer}</p>
            )}
            {lastMileage && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                💡 Auto-filled from {lastMileage.detail || 'last event'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              At Depot (km) *
            </label>
            <input
              type="number"
              name="mileageAtDepot"
              value={formData.mileageAtDepot}
              onChange={handleChange}
              step="0.1"
              min="0"
              placeholder="12405.0"
              className={`w-full px-3 py-1.5 rounded-lg border ${
                errors.mileageAtDepot
                  ? 'border-danger bg-danger/10'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent transition-colors`}
              disabled={loading}
            />
            {errors.mileageAtDepot && (
              <p className="mt-1 text-sm text-danger">{errors.mileageAtDepot}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              Return Distance
            </label>
            <input
              type="text"
              value={returnDistance > 0 ? `${returnDistance.toFixed(1)} km` : '-'}
              readOnly
              className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-gray-100 dark:bg-gray-700 text-baltic-900 dark:text-gray-100
                       font-semibold cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Optional Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Fuel Used (L) - Optional
          </label>
          <input
            type="number"
            name="fuelUsed"
            value={formData.fuelUsed}
            onChange={handleChange}
            step="0.1"
            min="0"
            placeholder="15.5"
            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-baltic-500 focus:border-transparent transition-colors"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Notes - Optional
          </label>
          <input
            type="text"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any delays or issues..."
            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-baltic-500 focus:border-transparent transition-colors"
            disabled={loading}
          />
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                Warnings:
              </p>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-baltic-600 hover:bg-baltic-700 disabled:bg-gray-400 
                   text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Recording...' : 'Record Return Trip'}
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 
                   text-gray-900 dark:text-gray-100 font-semibold rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

ReturnTripForm.propTypes = {
  offloadEvent: PropTypes.object.isRequired,
  loadEvent: PropTypes.object,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func
};

export default ReturnTripForm;
