import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../hooks/useAuth';
import { getLoadEvents, getActiveLoads } from '../../services/loadEventService';
import { getCompanyVehicles } from '../../services/vehicleService';
import { getConsolidatedVehicleLoads } from '../../services/offloadEventService';
import LoadEventCard from './LoadEventCard.jsx';
import ConsolidatedLoadEventCard from './ConsolidatedLoadEventCard.jsx';
import toast from 'react-hot-toast';

const LoadEventList = ({ onRecordOffload, onViewDetails }) => {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeLoads, setActiveLoads] = useState([]);
  const [consolidatedLoads, setConsolidatedLoads] = useState([]);
  const [allLoads, setAllLoads] = useState([]);
  const [vehicles, setVehicles] = useState({});
  const [filter, setFilter] = useState('active'); // Default to active loads only
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [company]);

  const loadData = async () => {
    if (!company?.id) return;

    setLoading(true);
    try {
      // Load vehicles first
      const vehiclesList = await getCompanyVehicles(company.id);
      const vehiclesMap = {};
      vehiclesList.forEach(v => {
        vehiclesMap[v.id] = v;
      });
      setVehicles(vehiclesMap);

      // Load active loads
      const active = await getActiveLoads(company.id);
      setActiveLoads(active);

      // Group active loads by vehicle and consolidate
      const vehicleLoadsMap = {};
      active.forEach(load => {
        if (!vehicleLoadsMap[load.vehicleId]) {
          vehicleLoadsMap[load.vehicleId] = [];
        }
        vehicleLoadsMap[load.vehicleId].push(load);
      });

      // Create consolidated load objects for each vehicle
      const consolidated = await Promise.all(
        Object.keys(vehicleLoadsMap).map(async (vehicleId) => {
          try {
            return await getConsolidatedVehicleLoads(vehicleId, company.id);
          } catch (error) {
            console.error(`Error consolidating loads for vehicle ${vehicleId}:`, error);
            return null;
          }
        })
      );

      // Filter out any null results from failed consolidations
      setConsolidatedLoads(consolidated.filter(c => c !== null));

      // Load all loads
      const all = await getLoadEvents(company.id);
      setAllLoads(all);
    } catch (error) {
      console.error('Error loading load events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const filteredLoads = allLoads.filter(load => {
    // Filter by status - default shows only active/pending
    if (filter === 'active') {
      // Show only active and pending loads (not completed or cancelled)
      if (load.status === 'completed' || load.status === 'cancelled') {
        return false;
      }
    } else if (filter !== 'all' && load.status !== filter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const vehicle = vehicles[load.vehicleId];
      return (
        load.docketNumber?.toLowerCase().includes(search) ||
        load.supplier?.toLowerCase().includes(search) ||
        vehicle?.registrationNumber?.toLowerCase().includes(search) ||
        vehicle?.name?.toLowerCase().includes(search)
      );
    }

    return true;
  });

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
    return `${quantity.toLocaleString()} ${unit === 'kgs' ? 'kg' : 'L'}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeletons */}
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Loads Section - Consolidated by Vehicle */}
      {consolidatedLoads.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-baltic-900 dark:text-gray-100 mb-4">
            Active Loads ({consolidatedLoads.length} {consolidatedLoads.length === 1 ? 'vehicle' : 'vehicles'}, {activeLoads.length} {activeLoads.length === 1 ? 'load' : 'loads'})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {consolidatedLoads.map(consolidatedLoad => (
              <ConsolidatedLoadEventCard
                key={consolidatedLoad.vehicleId}
                consolidatedLoad={consolidatedLoad}
                vehicleData={vehicles[consolidatedLoad.vehicleId]}
                onRecordOffload={() => onRecordOffload(consolidatedLoad)}
                onViewDetails={() => onViewDetails(consolidatedLoad)}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Loads Section */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h2 className="text-lg font-semibold text-baltic-900 dark:text-gray-100">
            {filter === 'active' ? 'Pending Loads' : 'Load Events'} ({filteredLoads.length})
          </h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="search"
              placeholder="Search by docket, supplier, vehicle..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                       transition-colors"
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                       focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                       transition-colors"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Load Events List */}
        {filteredLoads.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-baltic-900 dark:text-gray-100 mb-2">
              No load events found
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {searchTerm || filter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first load event to get started'}
            </p>
          </div>
        ) : (
          <>
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {filteredLoads.map(load => {
              const vehicle = vehicles[load.vehicleId];
              return (
                <div 
                  key={load.id}
                  onClick={() => onViewDetails(load)}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-bold text-baltic-900 dark:text-white">
                        {vehicle?.name || vehicle?.registrationNumber || 'Unknown Vehicle'}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(load.loadDate)}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        load.status === 'active'
                          ? 'bg-success/20 text-success'
                          : load.status === 'completed'
                          ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                          : 'bg-danger/20 text-danger'
                      }`}
                    >
                      {load.status.charAt(0).toUpperCase() + load.status.slice(1)}
                    </span>
                  </div>
                  
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Commodity:</span>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {load.commodityType === 'diesel' ? '⛽ Diesel' : '🔥 LP Gas'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Quantity:</span>
                      <p className="font-bold text-baltic-600">{formatQuantity(load.loadQuantity, load.unit)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Supplier:</span>
                      <p className="font-medium text-gray-900 dark:text-white truncate">{load.supplier || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Docket:</span>
                      <p className="font-medium text-gray-900 dark:text-white">{load.docketNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Desktop Table View */}
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
                    Commodity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Docket
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLoads.map(load => {
                  const vehicle = vehicles[load.vehicleId];
                  return (
                    <tr
                      key={load.id}
                      onClick={() => onViewDetails(load)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
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
                        {load.commodityType === 'diesel' ? 'Diesel' : 'LP Gas'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-baltic-900 dark:text-gray-100">
                        {formatQuantity(load.loadQuantity, load.unit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {load.supplier || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            load.status === 'active'
                              ? 'bg-success/20 text-success'
                              : load.status === 'completed'
                              ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                              : 'bg-danger/20 text-danger'
                          }`}
                        >
                          {load.status.charAt(0).toUpperCase() + load.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {load.docketNumber || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

LoadEventList.propTypes = {
  onRecordOffload: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
};

export default LoadEventList;
