import { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/calculations';
import { getExchangeRate, SUPPORTED_CURRENCIES, formatCurrencyAmount, convertCurrency } from '../../services/exchangeRateService';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * InvoiceForm Component
 * Generates invoices from offload events
 */
const InvoiceForm = ({ offloadEvent, loadEvent, onSubmit, onCancel, isSubmitting, companyCurrency }) => {
  const { company } = useAuth();
  // Use company.currency as the base currency, fallback to prop, then ZAR
  const baseCurrency = company?.currency || companyCurrency || 'ZAR';
  const currencySymbol = getCurrencySymbol(baseCurrency);
  
  const [formData, setFormData] = useState({
    customer: offloadEvent?.customer || '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    paymentTermsDays: 30,
    unitPrice: '',
    vatRate: 15,
    currency: baseCurrency, // Default to company's base currency
    description: '',
    notes: '',
    internalNotes: ''
  });

  const [errors, setErrors] = useState({});
  const [exchangeRate, setExchangeRate] = useState(1);
  const [loadingRate, setLoadingRate] = useState(false);
  const [manualRateMode, setManualRateMode] = useState(false);
  const [calculated, setCalculated] = useState({
    quantity: 0,
    subtotal: 0,
    vatAmount: 0,
    total: 0,
    dueDate: '',
    baseCurrencyTotal: 0 // Amount in company base currency
  });

  // Fetch exchange rate when currency changes (unless manual mode)
  useEffect(() => {
    const fetchRate = async () => {
      if (formData.currency === baseCurrency) {
        setExchangeRate(1);
        setManualRateMode(false); // Reset manual mode for same currency
        return;
      }
      
      // Skip auto-fetch if user is in manual mode
      if (manualRateMode) {
        return;
      }
      
      setLoadingRate(true);
      try {
        const rate = await getExchangeRate(formData.currency, baseCurrency, company?.id);
        setExchangeRate(rate);
      } catch (error) {
        console.error('Error fetching exchange rate:', error);
        toast.error('Could not fetch exchange rate. Switch to manual mode to enter rate.');
        setExchangeRate(1);
      } finally {
        setLoadingRate(false);
      }
    };
    
    fetchRate();
  }, [formData.currency, baseCurrency, company?.id, manualRateMode]);

  // Calculate amounts when form data changes
  useEffect(() => {
    if (offloadEvent) {
      const quantity = Number(offloadEvent.offloadQuantity) || 0;
      const unitPrice = parseFloat(formData.unitPrice) || 0;
      const subtotal = quantity * unitPrice;
      const vatRate = parseFloat(formData.vatRate) || 0;
      const vatAmount = subtotal * (vatRate / 100);
      const total = subtotal + vatAmount;
      
      // Convert to base currency if different
      const baseCurrencyTotal = formData.currency === baseCurrency 
        ? total 
        : total * exchangeRate;

      // Calculate due date
      const invoiceDate = new Date(formData.invoiceDate);
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + parseInt(formData.paymentTermsDays));

      setCalculated({
        quantity,
        subtotal: subtotal.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        total: total.toFixed(2),
        baseCurrencyTotal: baseCurrencyTotal.toFixed(2),
        dueDate: dueDate.toISOString().split('T')[0]
      });
    }
  }, [offloadEvent, formData.unitPrice, formData.vatRate, formData.invoiceDate, formData.paymentTermsDays, formData.currency, baseCurrency, exchangeRate]);

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

    if (!formData.customer?.trim()) {
      newErrors.customer = 'Customer name is required';
    }

    if (!formData.unitPrice || parseFloat(formData.unitPrice) <= 0) {
      newErrors.unitPrice = 'Unit price must be greater than 0';
    }

    if (!formData.invoiceDate) {
      newErrors.invoiceDate = 'Invoice date is required';
    }

    if (!formData.paymentTermsDays || parseInt(formData.paymentTermsDays) < 0) {
      newErrors.paymentTermsDays = 'Payment terms must be 0 or greater';
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

    onSubmit({
      ...formData,
      unitPrice: parseFloat(formData.unitPrice),
      vatRate: parseFloat(formData.vatRate),
      paymentTermsDays: parseInt(formData.paymentTermsDays),
      // Multi-currency fields
      invoiceCurrency: formData.currency,
      baseCurrency: baseCurrency,
      exchangeRate: exchangeRate,
      totalInInvoiceCurrency: parseFloat(calculated.total),
      totalInBaseCurrency: parseFloat(calculated.baseCurrencyTotal)
    });
  };

  const unit = loadEvent?.commodityType === 'lpGas' ? 'kg' : 'L';
  const commodityLabel = loadEvent?.commodityType === 'diesel' ? 'Diesel' : 'LP Gas';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto my-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Generate Invoice</h2>
              <p className="text-sm text-gray-600">Create invoice for delivery</p>
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
          {/* Delivery Summary - Compact */}
          <div className="bg-gradient-to-br from-baltic-50 to-blue-50 rounded-lg p-3 border border-baltic-200 mb-4">
            <h3 className="text-xs font-bold text-baltic-900 mb-2 flex items-center gap-1">
              📦 Delivery Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-600">Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(offloadEvent.offloadDate.toDate ? offloadEvent.offloadDate.toDate() : offloadEvent.offloadDate).toLocaleDateString('en-ZA')}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Commodity</p>
                <p className="font-semibold text-gray-900">{commodityLabel}</p>
              </div>
              <div>
                <p className="text-gray-600">Quantity Offloaded</p>
                <p className="font-bold text-success text-sm">{calculated.quantity.toLocaleString()} {unit}</p>
              </div>
              <div>
                <p className="text-gray-600">Customer</p>
                <p className="font-semibold text-gray-900">{offloadEvent.customer || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div>
            <h3 className="text-xs font-bold text-gray-900 mb-2">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.customer ? 'border-danger bg-danger/5' : 'border-gray-300'
                  } focus:ring-2 focus:ring-baltic-500 focus:border-transparent`}
                  disabled={isSubmitting}
                />
                {errors.customer && (
                  <p className="mt-1 text-sm text-danger">{errors.customer}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-baltic-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-baltic-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="customerAddress"
                  value={formData.customerAddress}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-baltic-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div>
            <h3 className="text-xs font-bold text-gray-900 mb-2">Invoice Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  name="invoiceDate"
                  value={formData.invoiceDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.invoiceDate ? 'border-danger bg-danger/5' : 'border-gray-300'
                  } focus:ring-2 focus:ring-baltic-500 focus:border-transparent`}
                  disabled={isSubmitting}
                />
                {errors.invoiceDate && (
                  <p className="mt-1 text-sm text-danger">{errors.invoiceDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms (Days) *
                </label>
                <input
                  type="number"
                  name="paymentTermsDays"
                  value={formData.paymentTermsDays}
                  onChange={handleChange}
                  min="0"
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.paymentTermsDays ? 'border-danger bg-danger/5' : 'border-gray-300'
                  } focus:ring-2 focus:ring-baltic-500 focus:border-transparent`}
                  disabled={isSubmitting}
                />
                {errors.paymentTermsDays && (
                  <p className="mt-1 text-sm text-danger">{errors.paymentTermsDays}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={calculated.dueDate}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-gray-50"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-xs font-bold text-gray-900 mb-2">Pricing & Currency</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Currency *
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-baltic-500 focus:border-transparent"
                  disabled={isSubmitting}
                >
                  {SUPPORTED_CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
                {loadingRate && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Fetching exchange rate...
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price ({getCurrencySymbol(formData.currency)})*
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">{getCurrencySymbol(formData.currency)}</span>
                  <input
                    type="number"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className={`w-full pl-8 pr-4 py-2 rounded-lg border ${
                      errors.unitPrice ? 'border-danger bg-danger/5' : 'border-gray-300'
                    } focus:ring-2 focus:ring-baltic-500 focus:border-transparent`}
                    placeholder="0.00"
                    disabled={isSubmitting}
                  />
                  {errors.unitPrice && (
                    <p className="mt-1 text-sm text-danger">{errors.unitPrice}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VAT Rate (%)
                </label>
                <input
                  type="number"
                  name="vatRate"
                  value={formData.vatRate}
                  onChange={handleChange}
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-baltic-500 focus:border-transparent"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            
            {/* Exchange Rate Info & Manual Override */}
            {formData.currency !== baseCurrency && (
              <div className="mt-3 space-y-2">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-blue-900 font-medium">💱 Multi-Currency Invoice</p>
                    <button
                      type="button"
                      onClick={() => setManualRateMode(!manualRateMode)}
                      className="text-xs px-2 py-1 rounded border border-blue-400 bg-white hover:bg-blue-100 text-blue-700 transition-colors flex items-center gap-1"
                    >
                      {manualRateMode ? '🔄 Auto Rate' : '✏️ Manual Rate'}
                    </button>
                  </div>
                  
                  {!manualRateMode ? (
                    <>
                      <p className="text-xs text-blue-700">
                        Exchange Rate: <strong>1 {formData.currency} = {exchangeRate.toFixed(4)} {baseCurrency}</strong>
                        {loadingRate && <span className="ml-2 text-blue-500">(Updating...)</span>}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Auto-fetched from market rates • Click "Manual Rate" to override
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-blue-900">
                        Enter Exchange Rate: 1 {formData.currency} =
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={exchangeRate}
                          onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                          step="0.0001"
                          min="0.0001"
                          className="w-32 px-3 py-2 rounded border border-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          placeholder="18.5000"
                        />
                        <span className="text-sm font-medium text-blue-900">{baseCurrency}</span>
                      </div>
                      <p className="text-xs text-amber-700 flex items-center gap-1">
                        ⚠️ Manual rate - Ensure this matches your bank/agreed rate
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600">
                  Invoice will be in {formData.currency}, but payments will be tracked in your base currency ({baseCurrency}) for accounting.
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder={`${commodityLabel} delivery - ${calculated.quantity} ${unit}`}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-baltic-500 focus:border-transparent"
              disabled={isSubmitting}
            />
          </div>

          {/* Amount Summary */}
          <div className="bg-gradient-to-br from-success/10 to-success/5 rounded-lg p-3 border border-success/30">
            <h3 className="text-xs font-bold text-gray-900 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-success" />
              Invoice Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal ({calculated.quantity.toLocaleString()} {unit} @ {getCurrencySymbol(formData.currency)}{formData.unitPrice || '0'})</span>
                <span className="font-semibold text-gray-900">{getCurrencySymbol(formData.currency)} {parseFloat(calculated.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT ({formData.vatRate}%)</span>
                <span className="font-semibold text-gray-900">{getCurrencySymbol(formData.currency)} {parseFloat(calculated.vatAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-2 border-t border-success/20 flex justify-between">
                <span className="font-bold text-gray-900">Invoice Total</span>
                <span className="font-bold text-xl text-success">{getCurrencySymbol(formData.currency)} {parseFloat(calculated.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {/* Show conversion if different currency */}
              {formData.currency !== baseCurrency && exchangeRate !== 1 && (
                <div className="pt-2 border-t border-blue-200">
                  <div className="flex justify-between text-xs text-blue-700">
                    <span>Equivalent in {baseCurrency} (for accounting)</span>
                    <span className="font-semibold">{getCurrencySymbol(baseCurrency)} {parseFloat(calculated.baseCurrencyTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <p className="text-[10px] text-blue-600 mt-1">
                    @ {exchangeRate.toFixed(4)} {baseCurrency}/{formData.currency}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (visible to customer)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-baltic-500 focus:border-transparent resize-none"
                placeholder="Payment instructions, thank you message..."
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes (not visible to customer)
              </label>
              <textarea
                name="internalNotes"
                value={formData.internalNotes}
                onChange={handleChange}
                rows="2"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-baltic-500 focus:border-transparent resize-none"
                placeholder="Internal comments, special instructions..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Warning */}
          {parseFloat(calculated.total) === 0 && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-warning">Invoice total is {getCurrencySymbol(formData.currency)} 0.00</p>
                <p className="text-gray-700 mt-1">Please enter a unit price to calculate the invoice amount.</p>
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
              disabled={isSubmitting || parseFloat(calculated.total) === 0}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generate Invoice
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvoiceForm;
