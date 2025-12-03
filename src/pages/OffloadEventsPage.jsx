import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OffloadEventForm from '../components/commodity/OffloadEventForm.jsx';
import OffloadEventList from '../components/commodity/OffloadEventList.jsx';
import InvoiceForm from '../components/commodity/InvoiceForm.jsx';
import PaymentForm from '../components/commodity/PaymentForm.jsx';
import Modal from '../components/common/Modal.jsx';
import ReconciliationBadge from '../components/commodity/ReconciliationBadge.jsx';
import { useAuth } from '../hooks/useAuth';
import { createInvoiceFromOffload } from '../services/invoiceService';
import { recordPayment } from '../services/paymentService';
import toast from 'react-hot-toast';

const OffloadEventsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, company } = useAuth();
  const [showForm, setShowForm] = useState(!!(location.state?.loadEvent || location.state?.consolidatedLoad));
  const [editingOffload, setEditingOffload] = useState(null);
  const [selectedOffload, setSelectedOffload] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showReturnTripPrompt, setShowReturnTripPrompt] = useState(false);
  const [completedOffload, setCompletedOffload] = useState(null);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const loadEventFromState = location.state?.loadEvent;
  const consolidatedLoadFromState = location.state?.consolidatedLoad;

  const handleCreateSuccess = (offloadData) => {
    setShowForm(false);
    setCompletedOffload(offloadData);
    setShowInvoicePrompt(true);
    // Don't clear location state yet - wait for invoice decision
  };
  
  const handleGenerateInvoice = () => {
    setShowInvoicePrompt(false);
    setShowInvoiceForm(true);
  };
  
  const handleSkipInvoice = () => {
    setShowInvoicePrompt(false);
    setCompletedOffload(null);
    setRefreshKey(prev => prev + 1);
    navigate(location.pathname, { replace: true });
    toast.success('You can generate the invoice later from the Trip Logbook');
  };
  
  const handleInvoiceSubmit = async (invoiceData) => {
    if (!completedOffload || !user?.uid) return;
    
    try {
      setSubmittingInvoice(true);
      
      const invoiceId = await createInvoiceFromOffload(
        user.uid,
        company.id,
        completedOffload.offloadId,
        invoiceData
      );
      
      toast.success('Invoice generated successfully!');
      setShowInvoiceForm(false);
      
      // Store created invoice for payment prompt
      setCreatedInvoice({
        id: invoiceId,
        customer: invoiceData.customer,
        totalAmount: invoiceData.total || (invoiceData.unitPrice * completedOffload.offloadQuantity * (1 + invoiceData.vatRate / 100)),
        offloadId: completedOffload.offloadId
      });
      
      setRefreshKey(prev => prev + 1);
      
      // Show payment prompt
      setShowPaymentPrompt(true);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error(error.message || 'Failed to generate invoice');
    } finally {
      setSubmittingInvoice(false);
    }
  };
  
  const handleRecordPaymentNow = () => {
    setShowPaymentPrompt(false);
    setShowPaymentForm(true);
  };
  
  const handleSkipPayment = () => {
    setShowPaymentPrompt(false);
    
    // Navigate directly to trip log with return trip form
    navigate('/commodity/logbook', { 
      state: { 
        openReturnTrip: true,
        offloadEvent: completedOffload,
        vehicleId: completedOffload?.vehicleId 
      } 
    });
  };
  
  const handleRecordReturnTrip = () => {
    setShowReturnTripPrompt(false);
    // Navigate to Trip Log where return trip form can be opened
    navigate('/commodity/logbook', { 
      state: { 
        openReturnTrip: true,
        offloadEvent: completedOffload,
        vehicleId: completedOffload?.vehicleId 
      } 
    });
  };
  
  const handleSkipReturnTrip = () => {
    setShowReturnTripPrompt(false);
    setCreatedInvoice(null);
    setCompletedOffload(null);
    setRefreshKey(prev => prev + 1);
    navigate(location.pathname, { replace: true });
    toast.success('Trip completed successfully!');
  };
  
  const handlePaymentSubmit = async (paymentData) => {
    if (!createdInvoice || !user?.uid) return;
    
    try {
      setSubmittingPayment(true);
      
      await recordPayment(
        user.uid,
        company.id,
        createdInvoice.id,
        paymentData
      );
      
      toast.success('Payment recorded successfully!');
      setShowPaymentForm(false);
      
      // Navigate directly to trip log with return trip form
      navigate('/commodity/logbook', { 
        state: { 
          openReturnTrip: true,
          offloadEvent: completedOffload,
          vehicleId: completedOffload?.vehicleId 
        } 
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleViewDetails = (offload) => {
    setSelectedOffload(offload);
  };
  
  const handleEdit = (offload) => {
    setEditingOffload(offload);
    setShowForm(true);
  };

  const formatQuantity = (quantity, unit) => {
    return `${quantity.toLocaleString()} ${unit === 'kgs' ? 'kg' : 'L'}`;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success to-emerald-600 
                        flex items-center justify-center text-white text-2xl shadow-lg">
            ⬇️
          </div>
          <div>
            <h1 className="text-3xl font-black text-baltic-900 dark:text-gray-100">
              Offload Events
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track deliveries and reconciliation
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/commodity/loads')}
          className="relative overflow-hidden px-6 py-3 bg-gradient-to-r from-success to-emerald-600 
                   hover:from-emerald-600 hover:to-success
                   text-white font-bold rounded-xl shadow-xl
                   transition-all duration-300 transform hover:scale-105
                   focus:ring-2 focus:ring-success focus:ring-offset-2
                   flex items-center gap-2 group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                        -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="relative text-xl">+</span>
          <span className="relative">Record Delivery</span>
        </button>
      </div>

      {/* Offload Event List */}
      <OffloadEventList
        key={refreshKey}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
      />

      {/* Create Offload Event Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setEditingOffload(null);
            navigate(location.pathname, { replace: true });
          }}
          title={editingOffload ? "Edit Offload Event" : "Record Offload Event"}
        >
          <OffloadEventForm
            loadEvent={loadEventFromState}
            consolidatedLoad={consolidatedLoadFromState}
            existingOffload={editingOffload}
            onSuccess={(offloadData) => {
              setEditingOffload(null);
              if (editingOffload) {
                // Just refresh if editing
                setShowForm(false);
                setRefreshKey(prev => prev + 1);
                toast.success('Offload updated successfully');
              } else {
                // Continue with invoice flow if creating new
                handleCreateSuccess(offloadData);
              }
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingOffload(null);
              navigate(location.pathname, { replace: true });
            }}
          />
        </Modal>
      )}

      {/* View Offload Details Modal */}
      {selectedOffload && (
        <Modal
          isOpen={!!selectedOffload}
          onClose={() => setSelectedOffload(null)}
          title="Offload Event Details"
        >
          <div className="space-y-4">
            {/* Reconciliation Status */}
            <div className={`p-4 rounded-lg border-2 ${
              selectedOffload.reconciliationStatus === 'matched'
                ? 'border-success bg-success/10'
                : selectedOffload.reconciliationStatus === 'minor_variance'
                ? 'border-warning bg-warning/10'
                : 'border-danger bg-danger/10'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-baltic-900 dark:text-gray-100">
                  Reconciliation Status
                </h3>
                <ReconciliationBadge status={selectedOffload.reconciliationStatus} />
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Variance</p>
                  <p className={`text-2xl font-bold ${
                    selectedOffload.variance > 0 ? 'text-danger' : 
                    selectedOffload.variance < 0 ? 'text-success' : 
                    'text-baltic-900 dark:text-gray-100'
                  }`}>
                    {selectedOffload.variance >= 0 ? '+' : ''}{selectedOffload.variance} {selectedOffload.unit === 'kgs' ? 'kg' : 'L'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Variance %</p>
                  <p className="font-medium text-baltic-900 dark:text-gray-100">
                    {selectedOffload.variancePercentage >= 0 ? '+' : ''}{selectedOffload.variancePercentage?.toFixed(2)}%
                  </p>
                </div>
              </div>

              {selectedOffload.autoApproved && (
                <p className="mt-2 text-sm text-success">
                  ✓ Auto-approved - variance within acceptable limits
                </p>
              )}
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Date & Time</p>
                <p className="font-medium text-baltic-900 dark:text-gray-100">
                  {new Date(selectedOffload.offloadDate).toLocaleString('en-ZA')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
                <p className="font-medium text-baltic-900 dark:text-gray-100">
                  {selectedOffload.customer}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Commodity</p>
                <p className="font-medium text-baltic-900 dark:text-gray-100">
                  {selectedOffload.commodityType === 'diesel' ? 'Diesel' : 'LP Gas'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Offload Quantity</p>
                <p className="font-medium text-baltic-900 dark:text-gray-100">
                  {formatQuantity(selectedOffload.offloadQuantity, selectedOffload.unit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tank Before</p>
                <p className="font-medium text-baltic-900 dark:text-gray-100">
                  {formatQuantity(selectedOffload.tankReadingBefore, selectedOffload.unit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tank After</p>
                <p className="font-medium text-baltic-900 dark:text-gray-100">
                  {formatQuantity(selectedOffload.tankReadingAfter, selectedOffload.unit)}
                </p>
              </div>
              {selectedOffload.docketNumber && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Docket Number</p>
                  <p className="font-medium text-baltic-900 dark:text-gray-100">
                    {selectedOffload.docketNumber}
                  </p>
                </div>
              )}
            </div>

            {/* Discrepancy Details */}
            {selectedOffload.discrepancyType && selectedOffload.discrepancyType !== 'none' && (
              <div className="bg-warning/10 p-4 rounded-lg">
                <h4 className="font-semibold text-baltic-900 dark:text-gray-100 mb-2">
                  Discrepancy Information
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Type</p>
                    <p className="font-medium text-baltic-900 dark:text-gray-100">
                      {selectedOffload.discrepancyType.charAt(0).toUpperCase() + 
                       selectedOffload.discrepancyType.slice(1).replace(/([A-Z])/g, ' $1')}
                    </p>
                  </div>
                  {selectedOffload.discrepancyNotes && (
                    <div>
                      <p className="text-gray-600 dark:text-gray-400">Notes</p>
                      <p className="text-baltic-900 dark:text-gray-100">
                        {selectedOffload.discrepancyNotes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedOffload.notes && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Additional Notes</p>
                <p className="text-sm text-baltic-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                  {selectedOffload.notes}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
      
      {/* Invoice Prompt Modal */}
      {showInvoicePrompt && completedOffload && (
        <Modal
          isOpen={showInvoicePrompt}
          onClose={handleSkipInvoice}
          title="Delivery Completed! 🎉"
        >
          <div className="space-y-6">
            <div className="bg-success/10 border-2 border-success/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">✅</div>
                <div className="flex-1">
                  <h3 className="font-bold text-success text-lg mb-2">
                    Offload Recorded Successfully!
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p><span className="font-medium">Customer:</span> {completedOffload.customer}</p>
                    <p><span className="font-medium">Quantity:</span> {completedOffload.offloadQuantity.toLocaleString()} {completedOffload.loadEvent?.unit === 'kgs' ? 'kg' : 'L'}</p>
                    <p><span className="font-medium">Date:</span> {new Date(completedOffload.offloadDate).toLocaleString('en-ZA')}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💰</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Generate Invoice Now?
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Would you like to generate an invoice for this delivery right now? 
                    You can also do this later from the Trip Logbook.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSkipInvoice}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 
                         dark:bg-gray-700 dark:hover:bg-gray-600
                         text-baltic-900 dark:text-gray-100 font-medium rounded-lg
                         transition-colors duration-200"
              >
                Skip for Now
              </button>
              <button
                onClick={handleGenerateInvoice}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-success to-emerald-600 
                         hover:from-emerald-600 hover:to-success
                         text-white font-bold rounded-lg shadow-lg
                         transition-all duration-300 transform hover:scale-105
                         flex items-center justify-center gap-2"
              >
                <span>💰</span>
                <span>Generate Invoice</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Invoice Form Modal */}
      {showInvoiceForm && completedOffload && (
        <Modal
          isOpen={showInvoiceForm}
          onClose={() => {
            setShowInvoiceForm(false);
            handleSkipInvoice();
          }}
          title="Generate Invoice"
        >
          <InvoiceForm
            offloadEvent={{
              id: completedOffload.offloadId,
              customer: completedOffload.customer,
              offloadQuantity: completedOffload.offloadQuantity,
              offloadDate: completedOffload.offloadDate,
              loadEvent: completedOffload.loadEvent
            }}
            onSubmit={handleInvoiceSubmit}
            onCancel={() => {
              setShowInvoiceForm(false);
              handleSkipInvoice();
            }}
            isSubmitting={submittingInvoice}
          />
        </Modal>
      )}
      
      {/* Payment Prompt Modal */}
      {showPaymentPrompt && createdInvoice && (
        <Modal
          isOpen={showPaymentPrompt}
          onClose={handleSkipPayment}
          title="Invoice Generated! 💰"
        >
          <div className="space-y-6">
            <div className="bg-success/10 border-2 border-success/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-3xl">✅</div>
                <div className="flex-1">
                  <h3 className="font-bold text-success text-lg mb-2">
                    Invoice Created Successfully!
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <p><span className="font-medium">Customer:</span> {createdInvoice.customer}</p>
                    <p><span className="font-medium">Amount:</span> R {parseFloat(createdInvoice.totalAmount).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💳</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Record Payment Now?
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Would you like to record a payment for this invoice right now? 
                    You can also do this later from the Trip Logbook.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleSkipPayment}
                className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 
                         dark:bg-gray-700 dark:hover:bg-gray-600
                         text-baltic-900 dark:text-gray-100 font-medium rounded-lg
                         transition-colors duration-200"
              >
                Skip for Now
              </button>
              <button
                onClick={handleRecordPaymentNow}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-success to-emerald-600 
                         hover:from-emerald-600 hover:to-success
                         text-white font-bold rounded-lg shadow-lg
                         transition-all duration-300 transform hover:scale-105
                         flex items-center justify-center gap-2"
              >
                <span>💳</span>
                <span>Record Payment</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
      
      {/* Payment Form Modal */}
      {showPaymentForm && createdInvoice && (
        <PaymentForm
          invoice={createdInvoice}
          onSubmit={handlePaymentSubmit}
          onCancel={() => {
            setShowPaymentForm(false);
            handleSkipPayment();
          }}
          isSubmitting={submittingPayment}
          companyCurrency={company?.currency || 'ZAR'}
        />
      )}
      
      {/* Return Trip Prompt Modal - REMOVED: Now navigates directly to Trip Log */}
    </div>
  );
};

export default OffloadEventsPage;
