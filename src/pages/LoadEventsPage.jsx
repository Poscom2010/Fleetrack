import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadEventForm from '../components/commodity/LoadEventForm.jsx';
import LoadEventList from '../components/commodity/LoadEventList.jsx';
import Modal from '../components/common/Modal.jsx';
import { getRunningTankBalance } from '../services/offloadEventService';

const LoadEventsPage = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [editingLoad, setEditingLoad] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadBalance, setLoadBalance] = useState(null);

  // Refetch data when page regains focus (after offload creation)
  useEffect(() => {
    const handleFocus = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Fetch running balance when a load is selected for viewing
  useEffect(() => {
    const fetchBalance = async () => {
      if (selectedLoad?.id) {
        const balance = await getRunningTankBalance(selectedLoad.id);
        setLoadBalance(balance);
      } else {
        setLoadBalance(null);
      }
    };
    fetchBalance();
  }, [selectedLoad]);

  const handleCreateSuccess = () => {
    setShowForm(false);
    setEditingLoad(null);
    setRefreshKey(prev => prev + 1); // Trigger list refresh
  };

  const handleEdit = (load) => {
    // Close the details modal first
    setSelectedLoad(null);
    // Then open the edit modal with the load data
    setEditingLoad(load);
  };

  const handleRecordOffload = (loadOrConsolidated) => {
    // Check if this is a consolidated load or single load
    const isConsolidated = loadOrConsolidated.loads && loadOrConsolidated.totalRemaining !== undefined;
    
    if (isConsolidated) {
      // Navigate with consolidated load data
      navigate('/commodity/offloads/new', { state: { consolidatedLoad: loadOrConsolidated } });
    } else {
      // Navigate with single load data
      navigate('/commodity/offloads/new', { state: { loadEvent: loadOrConsolidated } });
    }
  };

  const handleViewDetails = (load) => {
    setSelectedLoad(load);
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-baltic-500 to-baltic-600 
                        flex items-center justify-center text-white text-2xl shadow-lg">
            ⬆️
          </div>
          <div>
            <h1 className="text-3xl font-black text-baltic-900 dark:text-gray-100">
              Load Events
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Record and manage fuel loading at depot
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="relative overflow-hidden px-6 py-3 bg-gradient-to-r from-baltic-500 to-baltic-600 
                   hover:from-baltic-600 hover:to-baltic-700
                   text-white font-bold rounded-xl shadow-xl
                   transition-all duration-300 transform hover:scale-105
                   focus:ring-2 focus:ring-baltic-500 focus:ring-offset-2
                   flex items-center gap-2 group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                        -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          <span className="relative text-xl">+</span>
          <span className="relative">Create Load Event</span>
        </button>
      </div>

      {/* Load Event List */}
      <LoadEventList
        key={refreshKey}
        onRecordOffload={handleRecordOffload}
        onViewDetails={handleViewDetails}
      />

      {/* Create Load Event Modal */}
      {showForm && (
        <Modal
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          title="Create Load Event"
        >
          <LoadEventForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {/* Edit Load Event Modal */}
      {editingLoad && (
        <Modal
          isOpen={!!editingLoad}
          onClose={() => setEditingLoad(null)}
          title="Edit Load Event"
        >
          <LoadEventForm
            loadEvent={editingLoad}
            onSuccess={handleCreateSuccess}
            onCancel={() => setEditingLoad(null)}
          />
        </Modal>
      )}

      {/* View Load Details Modal */}
      {selectedLoad && (
        <Modal
          isOpen={!!selectedLoad}
          onClose={() => setSelectedLoad(null)}
          title={selectedLoad.loads ? "Consolidated Load Details" : "Load Event Details"}
        >
          <div className="space-y-4">
            {/* Check if this is a consolidated load (has loads array) or single load */}
            {selectedLoad.loads ? (
              // Consolidated Load View
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Vehicle</p>
                    <p className="font-medium text-baltic-900 dark:text-gray-100">
                      {selectedLoad.vehicleName || 'Unknown Vehicle'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-success/20 text-success">
                      Active
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Commodity</p>
                    <p className="font-medium text-baltic-900 dark:text-gray-100">
                      {selectedLoad.commodityType === 'diesel' ? 'Diesel' : 'LP Gas'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Loaded</p>
                    <p className="font-medium text-baltic-900 dark:text-gray-100">
                      {(selectedLoad.totalLoaded || 0).toLocaleString()} {selectedLoad.unit === 'kgs' ? 'kg' : 'L'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Offloaded</p>
                    <p className="font-medium text-warning">
                      {(selectedLoad.totalOffloaded || 0).toLocaleString()} {selectedLoad.unit === 'kgs' ? 'kg' : 'L'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Remaining in Tank</p>
                    <p className="font-bold text-success text-lg">
                      {(selectedLoad.totalRemaining || 0).toLocaleString()} {selectedLoad.unit === 'kgs' ? 'kg' : 'L'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Number of Loads</p>
                    <p className="font-medium text-baltic-900 dark:text-gray-100">
                      {selectedLoad.loads.length} load(s)
                    </p>
                  </div>
                </div>

                {/* Individual Loads */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Individual Loads:</p>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedLoad.loads.map((load, index) => (
                      <div key={load.id || index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {load.loadDate ? new Date(load.loadDate).toLocaleDateString('en-ZA') : 'Unknown date'}
                          </span>
                          <button
                            onClick={() => handleEdit(load)}
                            className="text-xs px-2 py-1 bg-baltic-100 dark:bg-baltic-900/30 text-baltic-600 dark:text-baltic-400 rounded hover:bg-baltic-200 dark:hover:bg-baltic-900/50 transition-colors"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Quantity: </span>
                            <span className="font-medium text-baltic-900 dark:text-gray-100">
                              {(load.loadQuantity || 0).toLocaleString()} {load.unit === 'kgs' ? 'kg' : 'L'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Supplier: </span>
                            <span className="font-medium text-baltic-900 dark:text-gray-100">
                              {load.supplier || 'N/A'}
                            </span>
                          </div>
                          {load.docketNumber && (
                            <div className="col-span-2">
                              <span className="text-gray-500 dark:text-gray-400">Docket: </span>
                              <span className="font-medium text-baltic-900 dark:text-gray-100">
                                {load.docketNumber}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setSelectedLoad(null);
                      handleRecordOffload(selectedLoad);
                    }}
                    className="flex-1 px-6 py-3 bg-baltic-500 hover:bg-baltic-600 
                             text-white font-medium rounded-lg
                             transition-colors duration-200"
                  >
                    Record Offload
                  </button>
                </div>
              </>
            ) : (
              // Single Load View
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Date & Time</p>
                    <p className="font-medium text-baltic-900 dark:text-gray-100">
                      {selectedLoad.loadDate ? new Date(selectedLoad.loadDate).toLocaleString('en-ZA') : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selectedLoad.status === 'active'
                          ? 'bg-success/20 text-success'
                          : selectedLoad.status === 'completed'
                          ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                          : 'bg-danger/20 text-danger'
                      }`}
                    >
                      {selectedLoad.status 
                        ? selectedLoad.status.charAt(0).toUpperCase() + selectedLoad.status.slice(1)
                        : 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Commodity</p>
                    <p className="font-medium text-baltic-900 dark:text-gray-100">
                      {selectedLoad.commodityType === 'diesel' ? 'Diesel' : 'LP Gas'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Load Quantity</p>
                    <p className="font-medium text-baltic-900 dark:text-gray-100">
                      {(selectedLoad.loadQuantity || 0).toLocaleString()} {selectedLoad.unit === 'kgs' ? 'kg' : 'L'}
                    </p>
                  </div>
                  {loadBalance && loadBalance.offloadCount > 0 && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Offloaded</p>
                        <p className="font-medium text-warning">
                          {(loadBalance.totalOffloaded || 0).toLocaleString()} {selectedLoad.unit === 'kgs' ? 'kg' : 'L'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
                        <p className="font-bold text-success text-lg">
                          {(loadBalance.remaining || 0).toLocaleString()} {selectedLoad.unit === 'kgs' ? 'kg' : 'L'}
                        </p>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tank Before</p>
                    <p className="font-medium text-baltic-900 dark:text-gray-100">
                      {(selectedLoad.tankReadingBefore || 0).toLocaleString()} {selectedLoad.unit === 'kgs' ? 'kg' : 'L'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tank After</p>
                    <p className="font-medium text-baltic-900 dark:text-gray-100">
                      {(selectedLoad.tankReadingAfter || 0).toLocaleString()} {selectedLoad.unit === 'kgs' ? 'kg' : 'L'}
                    </p>
                  </div>
                  {selectedLoad.supplier && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Supplier</p>
                      <p className="font-medium text-baltic-900 dark:text-gray-100">
                        {selectedLoad.supplier}
                      </p>
                    </div>
                  )}
                  {selectedLoad.docketNumber && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Docket Number</p>
                      <p className="font-medium text-baltic-900 dark:text-gray-100">
                        {selectedLoad.docketNumber}
                      </p>
                    </div>
                  )}
                  {selectedLoad.temperature && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Temperature</p>
                      <p className="font-medium text-baltic-900 dark:text-gray-100">
                        {selectedLoad.temperature}°C
                      </p>
                    </div>
                  )}
                </div>

                {selectedLoad.notes && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Notes</p>
                    <p className="text-sm text-baltic-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {selectedLoad.notes}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  {selectedLoad.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleEdit(selectedLoad)}
                        className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 
                                 dark:bg-gray-700 dark:hover:bg-gray-600
                                 text-baltic-900 dark:text-gray-100 font-medium rounded-lg
                                 transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <span>✏️</span>
                        Edit Load
                      </button>
                      <button
                        onClick={() => {
                          setSelectedLoad(null);
                          handleRecordOffload(selectedLoad);
                        }}
                        className="flex-1 px-6 py-3 bg-baltic-500 hover:bg-baltic-600 
                                 text-white font-medium rounded-lg
                                 transition-colors duration-200"
                      >
                        Record Offload
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LoadEventsPage;
