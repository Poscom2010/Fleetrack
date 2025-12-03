import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import { getOffloadEvents } from '../../services/offloadEventService';
import { getLoadEvents } from '../../services/loadEventService';
import { getCompanyVehicles } from '../../services/vehicleService';
import ReconciliationBadge from './ReconciliationBadge.jsx';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Edit2, ChevronDown } from 'lucide-react';

const OffloadEventList = ({ onViewDetails, onEdit }) => {
  const { company } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [offloads, setOffloads] = useState([]);
  const [loads, setLoads] = useState([]);
  const [vehicles, setVehicles] = useState({});
  const [viewMode, setViewMode] = useState('delivered'); // 'delivered' or 'pending'
  const [reconciliationFilter, setReconciliationFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllDelivered, setShowAllDelivered] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);

  useEffect(() => {
    loadData();
  }, [company]);

  const loadData = async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      // Load vehicles
      const vehiclesList = await getCompanyVehicles(company.id);
      const vehiclesMap = {};
      vehiclesList.forEach(v => {
        vehiclesMap[v.id] = v;
      });
      setVehicles(vehiclesMap);

      // Load both offloads and loads
      const [offloadsList, loadsList] = await Promise.all([
        getOffloadEvents(company.id),
        getLoadEvents(company.id)
      ]);
      
      setOffloads(offloadsList);
      setLoads(loadsList);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Get pending deliveries (loads without offload)
  const pendingDeliveries = loads.filter(load => {
    // Exclude completed or cancelled loads
    if (load.status === 'completed' || load.status === 'cancelled') {
      return false;
    }
    // Check if load has been offloaded
    const hasOffload = offloads.some(offload => offload.loadEventId === load.id);
    return !hasOffload;
  });

  // Filter delivered offloads
  const filteredOffloads = offloads.filter(offload => {
    // Reconciliation filter
    if (reconciliationFilter !== 'all' && offload.reconciliationStatus !== reconciliationFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const vehicle = vehicles[offload.vehicleId];
      return (
        offload.customer?.toLowerCase().includes(search) ||
        offload.docketNumber?.toLowerCase().includes(search) ||
        vehicle?.registrationNumber?.toLowerCase().includes(search) ||
        vehicle?.name?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  // Limit for display
  const ITEMS_LIMIT = 2;
  
  // Filter pending deliveries by search
  const filteredPending = pendingDeliveries.filter(load => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const vehicle = vehicles[load.vehicleId];
      return (
        load.supplier?.toLowerCase().includes(search) ||
        load.docketNumber?.toLowerCase().includes(search) ||
        vehicle?.registrationNumber?.toLowerCase().includes(search) ||
        vehicle?.name?.toLowerCase().includes(search)
      );
    }
    return true;
  });
  
  // Limit displayed items
  const displayedOffloads = showAllDelivered ? filteredOffloads : filteredOffloads.slice(0, ITEMS_LIMIT);
  const displayedPending = showAllPending ? filteredPending : filteredPending.slice(0, ITEMS_LIMIT);
  const hasMoreDelivered = filteredOffloads.length > ITEMS_LIMIT;
  const hasMorePending = filteredPending.length > ITEMS_LIMIT;

  // Count flagged trips
  const flaggedCount = offloads.filter(o => 
    o.reconciliationStatus === 'minor_variance' || 
    o.reconciliationStatus === 'major_variance'
  ).length;

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatQuantity = (quantity, unit) => {
    if (!quantity && quantity !== 0) return 'N/A';
    return `${parseFloat(quantity).toLocaleString()} ${unit === 'kgs' ? 'kg' : 'L'}`;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert Banner for Flagged Trips */}
      {flaggedCount > 0 && (
        <div className="bg-warning/10 border-l-4 border-warning p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-baltic-900 dark:text-gray-100">
                {flaggedCount} Trip{flaggedCount > 1 ? 's' : ''} Require{flaggedCount === 1 ? 's' : ''} Attention
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Variance detected - review and investigate discrepancies
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('pending')}
            className={`px-4 py-2 font-medium transition-all ${
              viewMode === 'pending'
                ? 'text-warning border-b-2 border-warning'
                : 'text-gray-600 dark:text-gray-400 hover:text-baltic-900 dark:hover:text-gray-100'
            }`}
          >
            🚛 Pending Deliveries ({filteredPending.length})
          </button>
          <button
            onClick={() => setViewMode('delivered')}
            className={`px-4 py-2 font-medium transition-all ${
              viewMode === 'delivered'
                ? 'text-success border-b-2 border-success'
                : 'text-gray-600 dark:text-gray-400 hover:text-baltic-900 dark:hover:text-gray-100'
            }`}
          >
            ✓ Delivered ({filteredOffloads.length})
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <input
            type="search"
            placeholder={viewMode === 'pending' ? 'Search loads...' : 'Search deliveries...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                     transition-colors"
          />

          {viewMode === 'delivered' && (
            <select
              value={reconciliationFilter}
              onChange={(e) => setReconciliationFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                       focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                       transition-colors"
            >
              <option value="all">All Reconciliation</option>
              <option value="matched">✓ Matched</option>
              <option value="minor_variance">⚠️ Minor Variance</option>
              <option value="major_variance">🚨 Major Discrepancy</option>
              <option value="pending">⏳ Pending</option>
            </select>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'pending' ? (
        // Pending Deliveries
        displayedPending.length === 0 && filteredPending.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-semibold text-baltic-900 dark:text-gray-100 mb-2">
              No pending deliveries
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All loads have been delivered
            </p>
          </div>
        ) : (
          <>
          {/* Mobile Card View - Pending */}
          <div className="lg:hidden space-y-3">
            {displayedPending.map(load => {
              const vehicle = vehicles[load.vehicleId];
              return (
                <div key={load.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-baltic-900 dark:text-white">
                        {vehicle?.name || vehicle?.registrationNumber || 'Unknown Vehicle'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(load.loadDate?.toDate ? load.loadDate.toDate() : load.loadDate).toLocaleDateString('en-ZA')}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-warning/20 text-warning text-xs font-semibold rounded">
                      🚛 Pending
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-gray-500">Supplier:</span>
                      <p className="font-medium text-gray-900 dark:text-white truncate">{load.supplier || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Commodity:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {load.commodityType === 'diesel' ? '⛽ Diesel' : '🔥 LP Gas'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Quantity:</span>
                      <p className="font-bold text-baltic-600">{(load.quantityLoaded || 0).toLocaleString()} {load.commodityType === 'diesel' ? 'L' : 'kg'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Docket:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{load.docketNumber || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onRecordDelivery(load)}
                    className="w-full px-3 py-2 bg-success hover:bg-success/90 text-white rounded-lg text-xs font-medium"
                  >
                    📦 Record Delivery
                  </button>
                </div>
              );
            })}
          </div>
          
          {/* Desktop Table - Pending */}
          <div className="hidden lg:block overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Load Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Commodity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Load Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Docket
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {displayedPending.map(load => {
                  const vehicle = vehicles[load.vehicleId];
                  
                  return (
                    <tr
                      key={load.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-baltic-900 dark:text-gray-100">
                        {formatDate(load.loadDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-baltic-900 dark:text-gray-100">
                        <div>
                          <div className="font-medium">{vehicle?.registrationNumber || 'Unknown'}</div>
                          {vehicle?.name && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{vehicle.name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-baltic-900 dark:text-gray-100">
                        {load.supplier}
                      </td>
                      <td className="px-4 py-3 text-sm text-baltic-900 dark:text-gray-100">
                        {load.commodityType === 'diesel' ? '⛽ Diesel' : '🔥 LP Gas'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-baltic-900 dark:text-gray-100">
                        {formatQuantity(load.loadQuantity || load.quantity, load.commodityType === 'lpGas' ? 'kgs' : 'liters')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {load.docketNumber || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => navigate('/commodity/offloads/new', { state: { loadEvent: load } })}
                          className="px-3 py-1.5 bg-success hover:bg-success/90 text-white rounded-lg text-xs font-medium transition-colors"
                        >
                          Record Delivery
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Show All Button for Pending */}
            {hasMorePending && (
              <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowAllPending(!showAllPending)}
                  className="px-4 py-2 bg-baltic-100 hover:bg-baltic-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-baltic-700 dark:text-gray-200 font-medium rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  {showAllPending ? (
                    <>
                      <ChevronDown className="w-4 h-4 rotate-180" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show All ({filteredPending.length - ITEMS_LIMIT} more)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          </>
        )
      ) : (
        // Delivered Offloads
        displayedOffloads.length === 0 && filteredOffloads.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-baltic-900 dark:text-gray-100 mb-2">
              No deliveries found
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {searchTerm || reconciliationFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Record your first delivery to get started'}
            </p>
          </div>
        ) : (
        <>
        {/* Mobile Card View - Delivered */}
        <div className="lg:hidden space-y-3">
          {displayedOffloads.map(offload => {
            const vehicle = vehicles[offload.vehicleId];
            const isFlagged = offload.reconciliationStatus === 'minor_variance' || 
                             offload.reconciliationStatus === 'major_variance';
            
            return (
              <div key={offload.id} className={`bg-white dark:bg-gray-800 rounded-lg border shadow-sm overflow-hidden ${
                isFlagged ? 'border-warning' : 'border-gray-200 dark:border-gray-700'
              }`}>
                {/* Header */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-baltic-900 dark:text-white">{offload.customer || 'Unknown Customer'}</p>
                      <p className="text-xs text-gray-500">{formatDate(offload.offloadDate)}</p>
                    </div>
                    <ReconciliationBadge status={offload.reconciliationStatus} size="sm" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Vehicle:</span>
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {vehicle?.name || vehicle?.registrationNumber || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Quantity:</span>
                      <p className="font-bold text-baltic-600">{formatQuantity(offload.offloadQuantity, offload.unit)}</p>
                    </div>
                  </div>
                </div>
                
                {/* Variance Info */}
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-gray-500">Variance:</span>
                    <p className={`text-sm font-bold ${
                      Math.abs(offload.variancePercentage || 0) > 3 ? 'text-danger' :
                      Math.abs(offload.variancePercentage || 0) > 0 ? 'text-warning' :
                      'text-success'
                    }`}>
                      {offload.variance > 0 ? '+' : ''}{offload.variance || 0} ({(offload.variancePercentage || 0).toFixed(1)}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Docket:</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{offload.docketNumber || 'N/A'}</p>
                  </div>
                </div>
                
                {/* Actions */}
                {isFlagged && (
                  <div className="p-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => navigate(`/commodity/reconciliation?offloadId=${offload.id}&investigate=true`)}
                      className="w-full px-3 py-2 bg-warning hover:bg-warning/90 text-white rounded-lg text-xs font-medium"
                    >
                      🔍 Investigate Variance
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Desktop Table - Delivered */}
        <div className="hidden lg:block overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Variance
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Reconciliation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Delivery
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Docket
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {displayedOffloads.map(offload => {
                const vehicle = vehicles[offload.vehicleId];
                const isFlagged = offload.reconciliationStatus === 'minor_variance' || 
                                 offload.reconciliationStatus === 'major_variance';
                
                return (
                  <tr
                    key={offload.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      isFlagged ? 'bg-warning/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-sm text-baltic-900 dark:text-gray-100">
                      {formatDate(offload.offloadDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-baltic-900 dark:text-gray-100">
                      <div>
                        <div className="font-medium">{vehicle?.registrationNumber || 'Unknown'}</div>
                        {vehicle?.name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">{vehicle.name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-baltic-900 dark:text-gray-100">
                      {offload.customer}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-baltic-900 dark:text-gray-100">
                      {formatQuantity(offload.offloadQuantity, offload.unit)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <div className={`font-medium ${
                          offload.variance > 0 ? 'text-danger' : 
                          offload.variance < 0 ? 'text-success' : 
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {offload.variance >= 0 ? '+' : ''}{offload.variance} {offload.unit === 'kgs' ? 'kg' : 'L'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {offload.variancePercentage >= 0 ? '+' : ''}{offload.variancePercentage?.toFixed(2)}%
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <ReconciliationBadge status={offload.reconciliationStatus} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                        ✓ Delivered
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {offload.docketNumber || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(offload);
                          }}
                          className="px-2 py-1 text-baltic-600 hover:text-baltic-700 hover:bg-baltic-50 rounded transition-colors"
                          title="View Details"
                        >
                          👁️
                        </button>
                        {onEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(offload);
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Offload"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Show All Button for Delivered */}
          {hasMoreDelivered && (
            <div className="p-4 text-center border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAllDelivered(!showAllDelivered)}
                className="px-4 py-2 bg-baltic-100 hover:bg-baltic-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-baltic-700 dark:text-gray-200 font-medium rounded-lg transition-colors inline-flex items-center gap-2"
              >
                {showAllDelivered ? (
                  <>
                    <ChevronDown className="w-4 h-4 rotate-180" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Show All ({filteredOffloads.length - ITEMS_LIMIT} more)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        </>
        )
      )}
    </div>
  );
};

OffloadEventList.propTypes = {
  onViewDetails: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
};

export default OffloadEventList;
