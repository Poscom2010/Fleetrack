import { useState } from 'react';
import { X, DollarSign, Receipt, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * TripExpenseForm Component
 * Form for capturing trip expenses
 */
const TripExpenseForm = ({ loadEvent, onSubmit, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    expenseItems: [{ expenseType: 'fuel', amount: '', description: '' }] // Array of expense items
  });

  const [errors, setErrors] = useState({});

  const expenseTypes = [
    { value: 'fuel', label: '⛽ Fuel', icon: '⛽' },
    { value: 'toll', label: '🛣️ Toll Fees', icon: '🛣️' },
    { value: 'maintenance', label: '🔧 Maintenance', icon: '🔧' },
    { value: 'parking', label: '🅿️ Parking', icon: '🅿️' },
    { value: 'other', label: '📝 Other', icon: '📝' }
  ];

  const handleDateChange = (e) => {
    setFormData(prev => ({ ...prev, date: e.target.value }));
    if (errors.date) {
      setErrors(prev => ({ ...prev, date: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    // Validate at least one valid expense
    const hasValidExpense = formData.expenseItems.some(item => 
      item.amount && parseFloat(item.amount) > 0
    );

    if (!hasValidExpense) {
      newErrors.expenseItems = 'Please add at least one valid expense';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    // Submit each expense item separately
    const validExpenses = formData.expenseItems.filter(item => 
      item.amount && parseFloat(item.amount) > 0
    ).map(item => ({
      expenseType: item.expenseType,
      amount: parseFloat(item.amount),
      description: item.description || '',
      date: formData.date,
      loadEventId: loadEvent.id,
      vehicleId: loadEvent.vehicleId
    }));

    onSubmit(validExpenses);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Trip Expense</h2>
              <p className="text-xs text-gray-600">Record expense for this trip</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Trip Info */}
          <div className="bg-gradient-to-br from-baltic-50 to-blue-50 rounded-lg p-3 border border-baltic-200">
            <p className="text-xs text-gray-600">Trip</p>
            <p className="font-semibold text-sm text-gray-900">
              {loadEvent.vehicleRegistration || loadEvent.vehicleId}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {loadEvent.commodityType === 'diesel' ? 'Diesel' : 'LP Gas'} • {loadEvent.loadQuantity} {loadEvent.commodityType === 'lpGas' ? 'kg' : 'L'}
            </p>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={handleDateChange}
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.date ? 'border-danger bg-danger/5' : 'border-gray-300'
              } focus:ring-2 focus:ring-baltic-500 focus:border-transparent`}
              disabled={isSubmitting}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-danger">{errors.date}</p>
            )}
          </div>

          {/* Multiple Expense Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Expenses *
              </label>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    expenseItems: [...prev.expenseItems, { expenseType: 'fuel', amount: '', description: '' }]
                  }));
                }}
                className="flex items-center gap-1 rounded-lg bg-baltic-500 hover:bg-baltic-600 px-3 py-1.5 text-xs font-semibold text-white transition"
                disabled={isSubmitting}
              >
                <span>+</span>
                Add Another
              </button>
            </div>

            {formData.expenseItems.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50">
                {/* Expense Type */}
                <div className="grid grid-cols-5 gap-1">
                  {expenseTypes.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        const newItems = [...formData.expenseItems];
                        newItems[index].expenseType = type.value;
                        setFormData(prev => ({ ...prev, expenseItems: newItems }));
                      }}
                      className={`p-2 rounded border-2 transition-all ${
                        item.expenseType === type.value
                          ? 'border-baltic-500 bg-baltic-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      title={type.label}
                    >
                      <span className="text-lg">{type.icon}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-12 gap-2">
                  {/* Amount */}
                  <div className="col-span-5">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500 text-sm">R</span>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => {
                          const newItems = [...formData.expenseItems];
                          newItems[index].amount = e.target.value;
                          setFormData(prev => ({ ...prev, expenseItems: newItems }));
                        }}
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="w-full pl-8 pr-2 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-baltic-500 focus:border-transparent"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...formData.expenseItems];
                        newItems[index].description = e.target.value;
                        setFormData(prev => ({ ...prev, expenseItems: newItems }));
                      }}
                      placeholder="Details..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-baltic-500 focus:border-transparent"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-1 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = formData.expenseItems.filter((_, i) => i !== index);
                        if (newItems.length === 0) {
                          newItems.push({ expenseType: 'fuel', amount: '', description: '' });
                        }
                        setFormData(prev => ({ ...prev, expenseItems: newItems }));
                      }}
                      className="rounded-lg bg-danger/20 hover:bg-danger/30 p-2 text-danger transition"
                      disabled={isSubmitting}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {errors.expenseItems && (
              <p className="text-sm text-danger">{errors.expenseItems}</p>
            )}

            <div className="flex justify-end pt-1 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-700">
                Total: <span className="text-warning">
                  R {formData.expenseItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0).toFixed(2)}
                </span>
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors text-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-warning hover:bg-warning/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Receipt className="w-4 h-4" />
                  Add Expense
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TripExpenseForm;
