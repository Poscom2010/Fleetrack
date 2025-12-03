import { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calendar, AlertCircle, Upload } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/calculations';
import toast from 'react-hot-toast';

/**
 * PaymentForm Component
 * Records payments against invoices
 */
const PaymentForm = ({ invoice, onSubmit, onCancel, isSubmitting, companyCurrency = 'ZAR' }) => {
  // Calculate outstanding balance properly - try multiple field names
  const totalAmount = parseFloat(invoice?.totalAmount || invoice?.total || 0);
  const amountPaid = parseFloat(invoice?.paidAmount || invoice?.amountPaid || 0);
  // Round to 2 decimal places to avoid floating point precision errors
  const outstandingBalance = Math.max(0, Math.round((totalAmount - amountPaid) * 100) / 100);

  // Get currency from invoice first, with multiple fallbacks
  const invoiceCurrency = invoice?.invoiceCurrency || invoice?.currency || invoice?.baseCurrency || companyCurrency;
  const currencySymbol = getCurrencySymbol(invoiceCurrency);

  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    amountPaid: outstandingBalance.toFixed(2),  // Auto-populate with outstanding amount (2 decimals)
    paymentMethod: 'eft',
    referenceNumber: '',
    bankName: '',
    chequeNumber: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});

  // Format number with thousand separator
  const formatCurrency = (amount) => {
    return parseFloat(amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

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

    if (!formData.paymentDate) {
      newErrors.paymentDate = 'Payment date is required';
    }

    // Clean the amount - remove currency symbol, spaces, and commas
    const cleanedAmount = String(formData.amountPaid).replace(/[R\s,]/g, '');
    const parsedAmount = parseFloat(cleanedAmount);
    
    if (!cleanedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amountPaid = 'Payment amount must be greater than 0';
    } else if (parsedAmount > outstandingBalance + 0.01) {
      // Add 0.01 tolerance for floating point comparison
      newErrors.amountPaid = `Amount exceeds outstanding balance of ${currencySymbol}${formatCurrency(outstandingBalance)}`;
    }

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    // Validate method-specific fields
    if (formData.paymentMethod === 'eft' && !formData.referenceNumber?.trim()) {
      newErrors.referenceNumber = 'Reference number is required for EFT payments';
    }

    if (formData.paymentMethod === 'cheque') {
      if (!formData.chequeNumber?.trim()) {
        newErrors.chequeNumber = 'Cheque number is required';
      }
      if (!formData.bankName?.trim()) {
        newErrors.bankName = 'Bank name is required for cheque payments';
      }
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

    // Clean the amount - remove currency symbol, spaces, and commas
    const cleanedAmount = String(formData.amountPaid).replace(/[R\s,]/g, '');
    
    onSubmit({
      ...formData,
      amountPaid: parseFloat(cleanedAmount)
    });
  };

  const paymentMethods = [
    { value: 'cash', label: 'Cash', icon: '💵' },
    { value: 'eft', label: 'EFT/Bank Transfer', icon: '🏦' },
    { value: 'cheque', label: 'Cheque', icon: '📝' },
    { value: 'creditCard', label: 'Credit Card', icon: '💳' },
    { value: 'debitCard', label: 'Debit Card', icon: '💳' },
    { value: 'mobilePayment', label: 'Mobile Payment', icon: '📱' }
  ];

  const newOutstanding = outstandingBalance - (parseFloat(formData.amountPaid) || 0);
  const willBePaid = newOutstanding <= 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
              <p className="text-sm text-gray-600">Invoice {invoice?.invoiceNumber}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Invoice Summary */}
          <div className="bg-gradient-to-br from-baltic-50 to-blue-50 rounded-lg p-3 border border-baltic-200">
            <h3 className="text-xs font-bold text-baltic-900 mb-2">💰 Invoice Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-600">Total Amount</p>
                <p className="font-bold text-gray-900 text-base">{currencySymbol}{formatCurrency(totalAmount)}</p>
              </div>
              <div>
                <p className="text-gray-600">Paid</p>
                <p className="font-bold text-success text-base">{currencySymbol}{formatCurrency(amountPaid)}</p>
              </div>
              <div className="col-span-2 pt-2 border-t border-baltic-200">
                <p className="text-gray-600">Outstanding</p>
                <p className="font-bold text-danger text-lg">{currencySymbol}{formatCurrency(outstandingBalance)}</p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div>
            <h3 className="text-xs font-bold text-gray-900 mb-2">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      errors.paymentDate ? 'border-danger bg-danger/5' : 'border-gray-300'
                    } focus:ring-2 focus:ring-baltic-500 focus:border-transparent`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.paymentDate && (
                  <p className="mt-1 text-sm text-danger">{errors.paymentDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Paid *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="amountPaid"
                    value={formData.amountPaid}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    max={outstandingBalance}
                    placeholder={`Outstanding: ${currencySymbol}${formatCurrency(outstandingBalance)}`}
                    className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                      errors.amountPaid ? 'border-danger bg-danger/5' : 'border-gray-300'
                    } focus:ring-2 focus:ring-baltic-500 focus:border-transparent`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.amountPaid && (
                  <p className="mt-1 text-sm text-danger">{errors.amountPaid}</p>
                )}
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Payment Method *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => handleChange({ target: { name: 'paymentMethod', value: method.value } })}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.paymentMethod === method.value
                      ? 'border-baltic-500 bg-baltic-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  disabled={isSubmitting}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">{method.icon}</span>
                    <span className={`text-xs font-medium text-center ${
                      formData.paymentMethod === method.value ? 'text-baltic-900' : 'text-gray-700'
                    }`}>
                      {method.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {errors.paymentMethod && (
              <p className="mt-2 text-sm text-danger">{errors.paymentMethod}</p>
            )}
          </div>

          {/* Method-specific fields */}
          {formData.paymentMethod === 'eft' && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">🏦 Bank Transfer Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number *
                  </label>
                  <input
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleChange}
                    placeholder="e.g., TXN123456789"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.referenceNumber ? 'border-danger bg-danger/5' : 'border-gray-300'
                    } focus:ring-2 focus:ring-baltic-500 focus:border-transparent`}
                    disabled={isSubmitting}
                  />
                  {errors.referenceNumber && (
                    <p className="mt-1 text-sm text-danger">{errors.referenceNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    placeholder="e.g., FNB, Standard Bank"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-baltic-500 focus:border-transparent"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          )}

          {formData.paymentMethod === 'cheque' && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-900 mb-3">📝 Cheque Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cheque Number *
                  </label>
                  <input
                    type="text"
                    name="chequeNumber"
                    value={formData.chequeNumber}
                    onChange={handleChange}
                    placeholder="e.g., CHQ000123"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.chequeNumber ? 'border-danger bg-danger/5' : 'border-gray-300'
                    } focus:ring-2 focus:ring-baltic-500 focus:border-transparent`}
                    disabled={isSubmitting}
                  />
                  {errors.chequeNumber && (
                    <p className="mt-1 text-sm text-danger">{errors.chequeNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleChange}
                    placeholder="e.g., ABSA, Nedbank"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      errors.bankName ? 'border-danger bg-danger/5' : 'border-gray-300'
                    } focus:ring-2 focus:ring-baltic-500 focus:border-transparent`}
                    disabled={isSubmitting}
                  />
                  {errors.bankName && (
                    <p className="mt-1 text-sm text-danger">{errors.bankName}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {(formData.paymentMethod === 'creditCard' || formData.paymentMethod === 'debitCard') && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-green-900 mb-3">💳 Card Payment Details</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authorization/Reference Number
                </label>
                <input
                  type="text"
                  name="referenceNumber"
                  value={formData.referenceNumber}
                  onChange={handleChange}
                  placeholder="e.g., AUTH123456"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-baltic-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-baltic-500 focus:border-transparent resize-none"
              placeholder="Additional payment notes or comments..."
              disabled={isSubmitting}
            />
          </div>

          {/* Payment Impact Summary */}
          {formData.amountPaid && parseFloat(formData.amountPaid) > 0 && (
            <div className={`rounded-lg p-4 border-2 ${
              willBePaid 
                ? 'bg-success/10 border-success/30' 
                : 'bg-warning/10 border-warning/30'
            }`}>
              <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className={`w-4 h-4 ${willBePaid ? 'text-success' : 'text-warning'}`} />
                Payment Impact
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Current Outstanding</p>
                  <p className="font-bold text-danger">{currencySymbol}{formatCurrency(outstandingBalance)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment Amount</p>
                  <p className="font-bold text-gray-900">- {currencySymbol}{formatCurrency(formData.amountPaid)}</p>
                </div>
                <div className="col-span-2 pt-3 border-t border-gray-200">
                  <p className="text-gray-600 mb-1">New Outstanding Balance</p>
                  <p className={`font-bold text-xl ${willBePaid ? 'text-success' : 'text-warning'}`}>
                    {currencySymbol}{formatCurrency(newOutstanding)}
                  </p>
                  {willBePaid && (
                    <p className="text-sm text-success mt-2 flex items-center gap-1">
                      ✓ This payment will mark the invoice as <span className="font-semibold">PAID IN FULL</span>
                    </p>
                  )}
                  {!willBePaid && newOutstanding > 0 && (
                    <p className="text-sm text-warning mt-2 flex items-center gap-1">
                      ⚠️ Invoice will remain as <span className="font-semibold">PARTIALLY PAID</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2 bg-success hover:bg-success/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting || !formData.amountPaid || parseFloat(formData.amountPaid) <= 0}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;
