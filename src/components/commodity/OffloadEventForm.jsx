import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import { createOffloadEvent, getRunningTankBalance } from '../../services/offloadEventService';
import { createTripExpense } from '../../services/tripExpenseService';
import { calculateReconciliation } from '../../services/reconciliationService';
import { getLastRecordedMileage } from '../../services/vehicleMileageService';
import ReconciliationBadge from './ReconciliationBadge.jsx';
import InlineExpenseSection from './InlineExpenseSection';
import toast from 'react-hot-toast';

const OffloadEventForm = ({ loadEvent, consolidatedLoad, onSuccess, onCancel }) => {
  const { user, company } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Handle both single load and consolidated load
  const isConsolidated = !!consolidatedLoad;
  const activeLoadEvent = isConsolidated ? consolidatedLoad.oldestLoad : loadEvent;
  const totalAvailable = isConsolidated ? consolidatedLoad.totalRemaining : null;
  
  const [formData, setFormData] = useState({
    loadEventId: activeLoadEvent?.id || '',
    offloadDate: new Date().toISOString().slice(0, 16),
    customer: '',
    tankReadingBefore: '',  // Will be populated from running balance
    offloadQuantity: '',
    tankReadingAfter: '',
    odometerReading: '',  // Odometer at customer delivery
    docketNumber: '',
    discrepancyType: 'none',
    discrepancyNotes: '',
    notes: '',
    expenses: [{ expenseType: 'fuel', amount: '', description: '' }], // Trip expenses
  });
  const [errors, setErrors] = useState({});
  const [reconciliation, setReconciliation] = useState(null);
  const [currentTankBalance, setCurrentTankBalance] = useState(null);
  const [lastMileage, setLastMileage] = useState(null);

  // Fetch current tank balance AND last mileage when component mounts
  useEffect(() => {
    const fetchTankBalance = async () => {
      if (isConsolidated) {
        // For consolidated loads, use total remaining
        setCurrentTankBalance({
          remaining: consolidatedLoad.totalRemaining,
          loaded: consolidatedLoad.loads.reduce((sum, l) => sum + (l.loadQuantity || 0), 0),
          totalOffloaded: consolidatedLoad.loads.reduce((sum, l) => sum + (l.totalOffloaded || 0), 0),
          offloadCount: consolidatedLoad.loads.reduce((sum, l) => sum + (l.offloadCount || 0), 0)
        });
        setFormData(prev => ({
          ...prev,
          tankReadingBefore: consolidatedLoad.totalRemaining.toString()
        }));
      } else if (activeLoadEvent?.id) {
        const balance = await getRunningTankBalance(activeLoadEvent.id);
        if (balance) {
          setCurrentTankBalance(balance);
          // Prepopulate tank reading before with current remaining fuel
          setFormData(prev => ({
            ...prev,
            tankReadingBefore: balance.remaining.toString()
          }));
        }
      }
    };
    
    const fetchLastMileage = async () => {
      if (activeLoadEvent?.vehicleId && company?.id) {
        try {
          const mileageData = await getLastRecordedMileage(activeLoadEvent.vehicleId, company.id);
          setLastMileage(mileageData);
          console.log('✅ Fetched last mileage for offload form:', mileageData);
        } catch (error) {
          console.error('Error fetching last mileage:', error);
        }
      }
    };
    
    fetchTankBalance();
    fetchLastMileage();
  }, [activeLoadEvent, isConsolidated, consolidatedLoad, company]);

  // Calculate reconciliation in real-time when ANY tank reading changes
  useEffect(() => {
    // Skip if we don't have current tank balance yet
    if (!currentTankBalance) return;
    
    // Only calculate if we have all three required values
    const tankBefore = parseFloat(formData.tankReadingBefore);
    const offloadQty = parseFloat(formData.offloadQuantity);
    const tankAfter = parseFloat(formData.tankReadingAfter);
    
    if (activeLoadEvent && 
        !isNaN(tankBefore) && tankBefore >= 0 &&
        !isNaN(offloadQty) && offloadQty > 0 &&
        !isNaN(tankAfter) && tankAfter >= 0) {
      
      // Pass ALL three tank readings for accurate calculation
      const result = calculateReconciliation(activeLoadEvent, {
        tankReadingBefore: tankBefore,
        offloadQuantity: offloadQty,
        tankReadingAfter: tankAfter
      });
      setReconciliation(result);
      
      // Auto-set discrepancy type based on variance
      if (result.reconciliationStatus === 'matched') {
        setFormData(prev => ({ ...prev, discrepancyType: 'none' }));
      }
    } else {
      // Clear reconciliation if values are incomplete
      setReconciliation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.tankReadingBefore, formData.offloadQuantity, formData.tankReadingAfter]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.offloadDate) {
      newErrors.offloadDate = 'Offload date is required';
    }
    if (!formData.customer.trim()) {
      newErrors.customer = 'Customer name is required';
    }
    if (!formData.tankReadingBefore || parseFloat(formData.tankReadingBefore) < 0) {
      newErrors.tankReadingBefore = 'Valid tank reading before is required';
    }
    if (!formData.offloadQuantity || parseFloat(formData.offloadQuantity) <= 0) {
      newErrors.offloadQuantity = 'Offload quantity must be greater than 0';
    }
    // NEW VALIDATION: Compare with tank reading, not historical load quantity
    if (parseFloat(formData.offloadQuantity) > parseFloat(formData.tankReadingBefore)) {
      newErrors.offloadQuantity = `Cannot offload ${formData.offloadQuantity}L when tank only has ${formData.tankReadingBefore}L`;
    }
    if (!formData.tankReadingAfter || parseFloat(formData.tankReadingAfter) < 0) {
      newErrors.tankReadingAfter = 'Valid tank reading after is required';
    }
    // Check for impossible increase
    if (parseFloat(formData.tankReadingAfter) > parseFloat(formData.tankReadingBefore)) {
      newErrors.tankReadingAfter = 'Tank reading cannot increase during offload!';
    }
    
    // CRITICAL: Validate odometer reading - must be >= last recorded mileage from ANY event
    const lastKnownMileage = lastMileage?.mileage || activeLoadEvent?.mileageAtLoad || activeLoadEvent?.startingMileage || 0;
    const lastKnownLabel = lastMileage?.detail ? `last ${lastMileage.detail}` : (activeLoadEvent?.mileageAtLoad ? 'supplier odometer' : 'starting mileage');
    
    if (!formData.odometerReading || parseFloat(formData.odometerReading) <= 0) {
      newErrors.odometerReading = 'Odometer reading is required';
    } else if (lastKnownMileage && parseFloat(formData.odometerReading) < parseFloat(lastKnownMileage)) {
      newErrors.odometerReading = `Odometer (${formData.odometerReading} km) cannot be less than ${lastKnownLabel} (${lastKnownMileage} km)`;
    } else if (lastKnownMileage && parseFloat(formData.odometerReading) === parseFloat(lastKnownMileage)) {
      newErrors.odometerReading = `Odometer cannot be the same as ${lastKnownLabel} (${lastKnownMileage} km). Vehicle must have moved!`;
    }

    // Only require discrepancy notes for MAJOR variances (> 5L)
    // Minor variances (3-5L) are optional
    if (reconciliation && reconciliation.varianceAbs > 5) {
      if (!formData.discrepancyType || formData.discrepancyType === 'none') {
        newErrors.discrepancyType = 'Major variance detected - please select the reason';
      }
      if (!formData.discrepancyNotes.trim()) {
        newErrors.discrepancyNotes = 'Major variance detected - please explain what happened';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting', { id: 'validation-error' });
      return;
    }

    setLoading(true);

    try {
      // Separate expenses from offload data
      const { expenses, ...offloadDataWithoutExpenses } = formData;
      
      const offloadEventData = {
        ...offloadDataWithoutExpenses,
        tankReadingBefore: parseFloat(formData.tankReadingBefore),
        offloadQuantity: parseFloat(formData.offloadQuantity),
        tankReadingAfter: parseFloat(formData.tankReadingAfter),
        odometerReading: parseFloat(formData.odometerReading),
        // CRITICAL: Pass consolidatedLoad data for proper validation
        consolidatedLoad: isConsolidated ? consolidatedLoad : null,
      };

      const createdOffloadId = await createOffloadEvent(user.uid, company.id, offloadEventData);
      
      // Store the created offload ID for invoice generation
      const createdOffloadData = {
        offloadId: createdOffloadId,
        loadEvent: activeLoadEvent,
        consolidatedLoad: isConsolidated ? consolidatedLoad : null,
        customer: formData.customer,
        offloadQuantity: parseFloat(formData.offloadQuantity),
        offloadDate: formData.offloadDate
      };
      
      // Create trip expenses (only valid ones with amounts)
      let expensesAdded = 0;
      const validExpenses = expenses.filter(exp => exp.amount && parseFloat(exp.amount) > 0);
      if (validExpenses.length > 0) {
        try {
          const expensePromises = validExpenses.map(expense => 
            createTripExpense(user.uid, company.id, {
              loadEventId: activeLoadEvent.id,
              offloadEventId: createdOffloadId,
              vehicleId: activeLoadEvent.vehicleId,
              expenseType: expense.expenseType,
              amount: parseFloat(expense.amount),
              description: expense.description || '',
              date: formData.offloadDate
            })
          );
          await Promise.all(expensePromises);
          expensesAdded = validExpenses.length;
        } catch (expenseError) {
          console.error('Error creating expenses:', expenseError);
          toast.error('Offload recorded but failed to add some expenses', { id: 'offload-expense-error' });
        }
      }
      
      // Single combined success message
      const statusText = reconciliation?.reconciliationStatus === 'matched'
        ? 'auto-approved'
        : reconciliation?.reconciliationStatus === 'minor_variance'
        ? 'flagged for review'
        : 'requires investigation';
      const expenseText = expensesAdded > 0 ? ` with ${expensesAdded} expense(s)` : '';
      toast.success(`Offload recorded${expenseText} - ${statusText}!`, { id: 'offload-success' });
      
      if (onSuccess) {
        onSuccess(createdOffloadData);
      }
    } catch (error) {
      console.error('Error creating offload event:', error);
      toast.error(error.message || 'Failed to create offload event', { id: 'offload-error' });
    } finally {
      setLoading(false);
    }
  };

  const unit = activeLoadEvent?.unit === 'kgs' ? 'kg' : 'L';

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Load Event Info */}
      <div className="bg-baltic-50 dark:bg-gray-700/50 p-2 rounded-lg">
        {isConsolidated ? (
          // Consolidated loads summary - COMPACT VERSION
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-baltic-900 dark:text-gray-100 flex items-center gap-2">
                📦 Combined Loads ({consolidatedLoad?.loads?.length || 0})
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  {consolidatedLoad?.commodityType === 'diesel' ? 'Diesel' : 'LP Gas'}
                </span>
              </h3>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Available</p>
                <p className="text-lg font-bold text-success">
                  {consolidatedLoad?.totalRemaining ? consolidatedLoad.totalRemaining.toLocaleString() : '0'} {unit}
                </p>
              </div>
            </div>
            <details className="text-xs text-baltic-600 dark:text-gray-400 border-t border-baltic-200 dark:border-gray-600 pt-2">
              <summary className="cursor-pointer hover:text-baltic-700 dark:hover:text-gray-300 font-medium mb-1">
                📋 View Load Details ({consolidatedLoad?.loads?.length || 0} loads)
              </summary>
              <div className="mt-2 ml-3 space-y-1">
                {consolidatedLoad.loads && consolidatedLoad.loads.length > 0 ? (
                  consolidatedLoad.loads.map((load, index) => (
                    <p key={load.id || index} className="text-xs">
                      • {load.loadDate ? new Date(load.loadDate).toLocaleDateString('en-ZA') : 'N/A'} - 
                      {' '}{load.remaining ? load.remaining.toLocaleString() : '0'} {unit} from {load.supplier || 'N/A'}
                    </p>
                  ))
                ) : (
                  <p className="text-gray-500">No load details available</p>
                )}
                <p className="mt-2 text-warning font-medium">ℹ️ FIFO: Draws from oldest load first</p>
              </div>
            </details>
          </>
        ) : (
          // Single load summary
          <>
            <h3 className="font-semibold text-baltic-900 dark:text-gray-100 mb-3">
              Load Event Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Commodity</p>
                <p className="font-medium text-baltic-900 dark:text-gray-100">
                  {activeLoadEvent?.commodityType === 'diesel' ? 'Diesel' : 'LP Gas'}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Load Quantity</p>
                <p className="font-medium text-baltic-900 dark:text-gray-100">
                  {activeLoadEvent?.loadQuantity ? activeLoadEvent.loadQuantity.toLocaleString() : '0'} {unit}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Loaded At</p>
                <p className="font-medium text-baltic-900 dark:text-gray-100">
                  {activeLoadEvent?.loadDate ? new Date(activeLoadEvent.loadDate).toLocaleString('en-ZA', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Supplier</p>
                <p className="font-medium text-baltic-900 dark:text-gray-100">
                  {activeLoadEvent?.supplier || '-'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Offload Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Offload Date & Time *
          </label>
          <input
            type="datetime-local"
            name="offloadDate"
            value={formData.offloadDate}
            onChange={handleChange}
            max={new Date().toISOString().slice(0, 16)}
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.offloadDate
                ? 'border-danger bg-danger/10'
                : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
            focus:ring-2 focus:ring-baltic-500 focus:border-transparent
            transition-colors`}
            disabled={loading}
          />
          {errors.offloadDate && (
            <p className="mt-1 text-sm text-danger">{errors.offloadDate}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Customer *
          </label>
          <input
            type="text"
            name="customer"
            value={formData.customer}
            onChange={handleChange}
            placeholder="Customer name"
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.customer
                ? 'border-danger bg-danger/10'
                : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:ring-2 focus:ring-baltic-500 focus:border-transparent
            transition-colors`}
            disabled={loading}
          />
          {errors.customer && (
            <p className="mt-1 text-sm text-danger">{errors.customer}</p>
          )}
        </div>
      </div>

      {/* Current Tank Status Info - COMPACT */}
      {currentTankBalance && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span className="font-medium text-blue-900 dark:text-blue-100">
                In Tank: <span className="text-success font-bold">{currentTankBalance.remaining.toLocaleString()} {unit}</span>
              </span>
            </div>
            {currentTankBalance.offloadCount > 0 && (
              <span className="text-blue-700 dark:text-blue-300">
                Delivery #{currentTankBalance.offloadCount + 1}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tank Readings */}
      <div className="bg-baltic-50 dark:bg-gray-700/50 p-2 rounded-lg space-y-2">
        <h3 className="text-sm font-semibold text-baltic-900 dark:text-gray-100">
          Tank Readings ({unit})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              Before Offload *
            </label>
            <input
              type="number"
              name="tankReadingBefore"
              value={formData.tankReadingBefore}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.tankReadingBefore
                  ? 'border-danger bg-danger/10'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              transition-colors`}
              disabled={loading}
            />
            {errors.tankReadingBefore && (
              <p className="mt-1 text-sm text-danger">{errors.tankReadingBefore}</p>
            )}
            {currentTankBalance && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                💡 Prepopulated with current tank balance. Edit if different.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              Offload Quantity *
            </label>
            <input
              type="number"
              name="offloadQuantity"
              value={formData.offloadQuantity}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              max={formData.tankReadingBefore || 0}
              placeholder="0.00"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.offloadQuantity
                  ? 'border-danger bg-danger/10'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              transition-colors`}
              disabled={loading}
            />
            {errors.offloadQuantity && (
              <p className="mt-1 text-sm text-danger">{errors.offloadQuantity}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Max: {parseFloat(formData.tankReadingBefore || 0).toLocaleString()} {unit} (available in tank)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              After Offload *
            </label>
            <input
              type="number"
              name="tankReadingAfter"
              value={formData.tankReadingAfter}
              onChange={handleChange}
              step="0.01"
              min="0"
              placeholder="0.00"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.tankReadingAfter
                  ? 'border-danger bg-danger/10'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              transition-colors`}
              disabled={loading}
            />
            {errors.tankReadingAfter && (
              <p className="mt-1 text-sm text-danger">{errors.tankReadingAfter}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              <span className="flex items-center gap-2">
                Odometer Reading (km) *
                {(lastMileage?.mileage || activeLoadEvent?.mileageAtLoad || activeLoadEvent?.startingMileage) && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    (Last: {(lastMileage?.mileage || activeLoadEvent?.mileageAtLoad || activeLoadEvent?.startingMileage).toLocaleString()} km)
                  </span>
                )}
              </span>
            </label>
            <input
              type="number"
              name="odometerReading"
              value={formData.odometerReading}
              onChange={handleChange}
              step="1"
              min={lastMileage?.mileage || activeLoadEvent?.mileageAtLoad || activeLoadEvent?.startingMileage || 0}
              placeholder="e.g., 125430"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.odometerReading
                  ? 'border-danger bg-danger/10'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              transition-colors`}
              disabled={loading}
            />
            {errors.odometerReading && (
              <p className="mt-1 text-sm text-danger">{errors.odometerReading}</p>
            )}
            {formData.odometerReading && (lastMileage?.mileage || activeLoadEvent?.mileageAtLoad || activeLoadEvent?.startingMileage) && 
              parseFloat(formData.odometerReading) > (lastMileage?.mileage || activeLoadEvent?.mileageAtLoad || activeLoadEvent?.startingMileage) && (
              <p className="mt-1 text-xs text-success font-medium">
                📍 Distance to customer: {(parseFloat(formData.odometerReading) - (lastMileage?.mileage || activeLoadEvent?.mileageAtLoad || activeLoadEvent?.startingMileage)).toFixed(1)} km
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              🚗 Odometer reading at customer delivery location
            </p>
          </div>
        </div>
      </div>

      {/* Reconciliation Status */}
      {reconciliation && (
        <div className={`p-3 rounded-lg border-2 ${
          reconciliation.reconciliationStatus === 'matched'
            ? 'border-success bg-success/10'
            : reconciliation.reconciliationStatus === 'very_minor'
            ? 'border-info bg-info/10'
            : reconciliation.reconciliationStatus === 'minor_variance'
            ? 'border-warning bg-warning/10'
            : 'border-danger bg-danger/10'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-baltic-900 dark:text-gray-100">
              Reconciliation Status
            </h3>
            <ReconciliationBadge status={reconciliation.reconciliationStatus} />
          </div>
          
          {/* Calculation Display */}
          {reconciliation.calculation && (
            <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded border border-gray-200 dark:border-gray-700 space-y-2">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                📊 {reconciliation.calculation.description}
              </p>
              
              <div className="space-y-1 text-sm">
                <p className="text-baltic-900 dark:text-gray-100 font-mono">
                  {reconciliation.calculation.formula}
                </p>
                <p className="text-baltic-900 dark:text-gray-100 font-mono">
                  {reconciliation.calculation.actual}
                </p>
                <p className={`font-bold font-mono ${
                  reconciliation.varianceAbs === 0 
                    ? 'text-success' 
                    : reconciliation.varianceAbs < 50 
                    ? 'text-warning' 
                    : 'text-danger'
                }`}>
                  {reconciliation.calculation.result}
                </p>
              </div>
              
              {/* Variance percentage if there is variance */}
              {reconciliation.varianceAbs > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Variance: <span className={`font-bold ${
                      reconciliation.varianceAbs < 50 ? 'text-warning' : 'text-danger'
                    }`}>{reconciliation.varianceAbs.toFixed(2)} {unit} ({reconciliation.variancePercentage >= 0 ? '+' : ''}{reconciliation.variancePercentage.toFixed(2)}%)</span>
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Status Message */}
          <div className="mt-3">
            <p className={`text-sm font-medium ${
              reconciliation.reconciliationStatus === 'matched'
                ? 'text-success'
                : reconciliation.reconciliationStatus === 'minor_variance'
                ? 'text-warning'
                : 'text-danger'
            }`}>
              {reconciliation.message}
            </p>
          </div>

          {reconciliation.autoApproved && (
            <p className="mt-2 text-sm text-success font-medium">
              ✓ Perfect match - will be auto-approved
            </p>
          )}
          
          {reconciliation.requiresNotes && (
            <p className="mt-2 text-sm text-warning font-medium">
              ⚠️ Variance detected - notes required before proceeding
            </p>
          )}
        </div>
      )}

      {/* Discrepancy Details (if variance > 3L) */}
      {reconciliation && reconciliation.varianceAbs > 3 && (
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              Discrepancy Type *
            </label>
            <select
              name="discrepancyType"
              value={formData.discrepancyType}
              onChange={handleChange}
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.discrepancyType
                  ? 'border-danger bg-danger/10'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              transition-colors`}
              disabled={loading}
            >
              <option value="none">Select reason...</option>
              <option value="leftInTank">Left in Tank (Fuel Remaining)</option>
              <option value="evaporation">Evaporation</option>
              <option value="spillage">Spillage</option>
              <option value="meterError">Meter Error</option>
              <option value="theft">Theft/Pilferage</option>
              <option value="customerMeterError">Customer Meter Error</option>
              <option value="temperatureVariation">Temperature Variation</option>
              <option value="other">Other</option>
            </select>
            {errors.discrepancyType && (
              <p className="mt-1 text-sm text-danger">{errors.discrepancyType}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              Discrepancy Notes {reconciliation?.varianceAbs > 5 && <span className="text-danger">*</span>}
            </label>
            <textarea
              name="discrepancyNotes"
              value={formData.discrepancyNotes}
              onChange={handleChange}
              rows={2}
              placeholder={reconciliation?.varianceAbs > 5 ? "Required: Explain what caused this major variance..." : "Optional: Add notes about this variance..."}
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.discrepancyNotes
                  ? 'border-danger bg-danger/10'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              transition-colors resize-none`}
              disabled={loading}
            />
            {errors.discrepancyNotes && (
              <p className="mt-1 text-sm text-danger">{errors.discrepancyNotes}</p>
            )}
          </div>
        </div>
      )}

      {/* Additional Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Docket Number
          </label>
          <input
            type="text"
            name="docketNumber"
            value={formData.docketNumber}
            onChange={handleChange}
            placeholder="Optional"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                     transition-colors"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Notes
          </label>
          <input
            type="text"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Optional"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                     transition-colors"
            disabled={loading}
          />
        </div>
      </div>

      {/* Trip Expenses */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <InlineExpenseSection
          expenses={formData.expenses}
          onChange={(expenses) => setFormData(prev => ({ ...prev, expenses }))}
          disabled={loading}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:flex-1 px-6 py-3 bg-baltic-500 hover:bg-baltic-600 
                   text-white font-medium rounded-lg
                   transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed
                   focus:ring-2 focus:ring-baltic-500 focus:ring-offset-2"
        >
          {loading ? 'Recording...' : 'Record Offload'}
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 bg-gray-200 dark:bg-gray-700 
                   hover:bg-gray-300 dark:hover:bg-gray-600
                   text-baltic-900 dark:text-gray-100 font-medium rounded-lg
                   transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

OffloadEventForm.propTypes = {
  loadEvent: PropTypes.object, // Single load (legacy)
  consolidatedLoad: PropTypes.object, // Consolidated loads (new)
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
};

export default OffloadEventForm;
