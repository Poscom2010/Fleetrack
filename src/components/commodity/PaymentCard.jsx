import { CreditCard, Calendar, FileText } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/calculations';

/**
 * PaymentCard Component
 * Displays payment history for an invoice
 */
const PaymentCard = ({ payments, currency = 'USD' }) => {
  if (!payments || payments.length === 0) return null;

  const currencySymbol = getCurrencySymbol(currency);

  const getPaymentMethodIcon = (method) => {
    const icons = {
      cash: '💵',
      eft: '🏦',
      cheque: '📝',
      creditCard: '💳',
      debitCard: '💳',
      mobilePayment: '📱'
    };
    return icons[method] || '💰';
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'Cash',
      eft: 'EFT',
      cheque: 'Cheque',
      creditCard: 'Credit Card',
      debitCard: 'Debit Card',
      mobilePayment: 'Mobile'
    };
    return labels[method] || method;
  };

  const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);

  return (
    <div className="mt-3 pt-3 border-t border-gray-200">
      <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
        <CreditCard className="w-3 h-3" />
        Payment History ({payments.length})
      </h5>
      
      <div className="space-y-2">
        {payments.map((payment, index) => (
          <div 
            key={payment.id || index} 
            className="bg-gray-50 rounded-lg p-2 border border-gray-200"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <span className="text-lg">{getPaymentMethodIcon(payment.paymentMethod)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-success text-sm">
                      {currencySymbol}{payment.amountPaid?.toFixed(2)}
                    </p>
                    <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full font-medium">
                      {getPaymentMethodLabel(payment.paymentMethod)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(payment.paymentDate).toLocaleDateString('en-ZA', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                  {payment.referenceNumber && (
                    <p className="text-xs text-gray-500 mt-1">
                      Ref: {payment.referenceNumber}
                    </p>
                  )}
                  {payment.chequeNumber && (
                    <p className="text-xs text-gray-500">
                      Cheque #: {payment.chequeNumber}
                    </p>
                  )}
                  {payment.notes && (
                    <p className="text-xs text-gray-600 mt-1 italic">
                      {payment.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total Summary */}
      <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
        <p className="text-xs font-semibold text-gray-700">Total Paid:</p>
        <p className="font-bold text-success">{currencySymbol}{totalPaid.toFixed(2)}</p>
      </div>
    </div>
  );
};

export default PaymentCard;
