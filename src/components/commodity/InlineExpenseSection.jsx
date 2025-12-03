import { X } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/calculations';

/**
 * InlineExpenseSection Component
 * Reusable section for capturing multiple expenses inline within forms
 */
const InlineExpenseSection = ({ expenses, onChange, disabled = false, currency = 'USD' }) => {
  const currencySymbol = getCurrencySymbol(currency);
  const expenseTypes = [
    { value: 'fuel', label: 'Fuel', icon: '⛽' },
    { value: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { value: 'repairs', label: 'Repairs', icon: '🛠️' },
    { value: 'insurance', label: 'Insurance', icon: '🛡️' },
    { value: 'registration', label: 'Registration', icon: '📋' },
    { value: 'cleaning', label: 'Cleaning', icon: '🧼' },
    { value: 'parking', label: 'Parking', icon: '🅿️' },
    { value: 'tolls', label: 'Tolls', icon: '🛣️' },
    { value: 'other', label: 'Other', icon: '📝' }
  ];

  const addExpense = () => {
    onChange([...expenses, { expenseType: 'fuel', amount: '', description: '' }]);
  };

  const removeExpense = (index) => {
    const newExpenses = expenses.filter((_, i) => i !== index);
    // Always keep at least one empty expense
    if (newExpenses.length === 0) {
      onChange([{ expenseType: 'fuel', amount: '', description: '' }]);
    } else {
      onChange(newExpenses);
    }
  };

  const updateExpense = (index, field, value) => {
    const newExpenses = [...expenses];
    newExpenses[index] = { ...newExpenses[index], [field]: value };
    onChange(newExpenses);
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-gray-700">
          💰 Trip Expenses (Optional)
        </label>
        <button
          type="button"
          onClick={addExpense}
          className="flex items-center gap-1 rounded-lg bg-warning/20 hover:bg-warning/30 px-2 py-1 text-xs font-semibold text-warning transition"
          disabled={disabled}
        >
          <span>+</span>
          Add Expense
        </button>
      </div>

      <div className="space-y-2">
        {expenses.map((expense, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-2 space-y-2 bg-gray-50">
            <div className="grid grid-cols-12 gap-2">
              {/* Expense Type Dropdown */}
              <div className="col-span-4">
                <select
                  value={expense.expenseType}
                  onChange={(e) => updateExpense(index, 'expenseType', e.target.value)}
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-warning focus:border-transparent"
                  disabled={disabled}
                >
                  {expenseTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div className="col-span-3">
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-gray-500 text-xs">R</span>
                  <input
                    type="number"
                    value={expense.amount}
                    onChange={(e) => updateExpense(index, 'amount', e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-warning focus:border-transparent"
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="col-span-4">
                <input
                  type="text"
                  value={expense.description}
                  onChange={(e) => updateExpense(index, 'description', e.target.value)}
                  placeholder="Details..."
                  className="w-full px-2 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-2 focus:ring-warning focus:border-transparent"
                  disabled={disabled}
                />
              </div>

              {/* Remove Button */}
              <div className="col-span-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeExpense(index)}
                  className="rounded-lg bg-danger/20 hover:bg-danger/30 p-1.5 text-danger transition"
                  disabled={disabled}
                  title="Remove expense"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      {totalExpenses > 0 && (
        <div className="flex justify-end pt-1 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-700">
            Total: <span className="text-warning">{currencySymbol} {totalExpenses.toFixed(2)}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default InlineExpenseSection;
