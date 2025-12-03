import { FileText, DollarSign, Calendar, Clock, AlertCircle, Download, Share2, Eye } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/calculations';

/**
 * InvoiceCard Component
 * Displays invoice summary in trip log
 */
const InvoiceCard = ({ invoice, onRecordPayment, onDownloadPDF, onShareInvoice, onViewInvoice, companyCurrency = 'USD' }) => {
  if (!invoice) return null;

  const currencySymbol = getCurrencySymbol(invoice.currency || companyCurrency);
  
  // Determine status badge
  const getStatusBadge = () => {
    switch (invoice.status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-success/10 text-success">
            ✓ Paid
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-warning/10 text-warning">
            ⚠️ Partial
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-danger/10 text-danger">
            🔴 Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
            ⏳ Unpaid
          </span>
        );
    }
  };

  const isOverdue = invoice.status === 'overdue' || (invoice.dueDate && new Date(invoice.dueDate) < new Date() && invoice.status !== 'paid');

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-success" />
          Invoice Details
        </h4>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
        <div>
          <p className="text-gray-600 text-xs font-medium">Invoice #</p>
          <p className="font-semibold text-gray-900">{invoice.invoiceNumber}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs font-medium">Date</p>
          <p className="font-semibold text-gray-900">
            {new Date(invoice.invoiceDate).toLocaleDateString('en-ZA', { 
              day: 'numeric', 
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
        <div>
          <p className="text-gray-600 text-xs font-medium">Total Amount</p>
          <p className="font-bold text-success">{currencySymbol}{invoice.total?.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs font-medium">Due Date</p>
          <p className={`font-semibold ${isOverdue ? 'text-danger' : 'text-gray-900'}`}>
            {new Date(invoice.dueDate).toLocaleDateString('en-ZA', { 
              day: 'numeric', 
              month: 'short'
            })}
          </p>
        </div>
      </div>

      {/* Payment Status */}
      {invoice.status !== 'paid' && (
        <div className="bg-gradient-to-r from-warning/10 to-orange/10 rounded-lg p-3 border border-warning/30 mb-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-600 text-xs">Amount Paid</p>
              <p className="font-bold text-success">{currencySymbol}{invoice.amountPaid?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs">Outstanding</p>
              <p className="font-bold text-danger">{currencySymbol}{invoice.outstandingBalance?.toFixed(2)}</p>
            </div>
          </div>
          
          {isOverdue && (
            <div className="mt-2 flex items-start gap-2 text-xs text-danger">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="font-medium">
                Payment overdue by {Math.floor((new Date() - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24))} days
              </p>
            </div>
          )}
        </div>
      )}

      {/* Full payment confirmation */}
      {invoice.status === 'paid' && (
        <div className="bg-success/10 rounded-lg p-3 border border-success/30 mb-3">
          <div className="flex items-center gap-2 text-sm text-success">
            <span className="text-lg">✓</span>
            <div>
              <p className="font-bold">Paid in Full</p>
              <p className="text-xs">
                Paid on {new Date(invoice.paidAt).toLocaleDateString('en-ZA', { 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Record Payment Button */}
        {invoice.status !== 'paid' && onRecordPayment && (
          <button
            onClick={onRecordPayment}
            className="w-full px-4 py-2 bg-success hover:bg-success/90 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            Record Payment
          </button>
        )}

        {/* Download/Share/View Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {onDownloadPDF && (
            <button
              onClick={() => onDownloadPDF(invoice)}
              className="px-3 py-2 bg-baltic-500 hover:bg-baltic-600 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
          )}
          
          {onShareInvoice && (
            <button
              onClick={() => onShareInvoice(invoice)}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
              title="Share Invoice"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
          )}
          
          {onViewInvoice && (
            <button
              onClick={() => onViewInvoice(invoice)}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
              title="View Invoice"
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceCard;
