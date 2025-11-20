import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Search, Filter, Download } from 'lucide-react';
import { fetchDriverNames } from '../utils/driverUtils';

const TripLogbookPage = () => {
  usePageTitle('Trip Logbook');
  const { user, userProfile, company } = useAuth();
  const isDriver = userProfile?.role === 'company_user';
  const isAdminOrManager = userProfile?.role === 'company_admin' || userProfile?.role === 'company_manager';
  const [trips, setTrips] = useState([]);
  const [users, setUsers] = useState({});
  const [vehicles, setVehicles] = useState({});
  const [expenses, setExpenses] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCashIn, setTotalCashIn] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    vehicleId: '',
    driverId: ''
  });

  useEffect(() => {
    loadTrips();
  }, [user]);

  const loadTrips = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const entriesRef = collection(db, 'dailyEntries');
      
      let q;
      if (isAdminOrManager && company?.id) {
        // Admins and managers see all company trips
        q = query(
          entriesRef,
          where('companyId', '==', company.id),
          orderBy('date', 'desc')
        );
      } else {
        // Drivers see only their own trips
        q = query(
          entriesRef,
          where('userId', '==', user.uid),
          orderBy('date', 'desc')
        );
      }

      const snapshot = await getDocs(q);
      const tripsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate(),
      }));

      // Fetch user details for admin/manager view
      if (isAdminOrManager && tripsData.length > 0) {
        const userIds = [...new Set(tripsData.map(trip => trip.userId))];
        const usersData = await fetchDriverNames(userIds, company?.id);
        setUsers(usersData);
      }

      // Fetch vehicle details for all trips
      if (tripsData.length > 0) {
        const vehicleIds = [...new Set(tripsData.map(trip => trip.vehicleId).filter(Boolean))];
        const vehiclesData = {};
        
        for (const vehicleId of vehicleIds) {
          try {
            const vehicleDoc = await getDoc(doc(db, 'vehicles', vehicleId));
            if (vehicleDoc.exists()) {
              const vehicleData = vehicleDoc.data();
              // Show both name and registration number
              const name = vehicleData.name || 'Vehicle';
              const regNumber = vehicleData.registrationNumber || '';
              vehiclesData[vehicleId] = regNumber ? `${name} (${regNumber})` : name;
            } else {
              vehiclesData[vehicleId] = 'Unknown Vehicle';
            }
          } catch (error) {
            console.error(`Error fetching vehicle ${vehicleId}:`, error);
            vehiclesData[vehicleId] = 'Unknown Vehicle';
          }
        }
        setVehicles(vehiclesData);
      }

      // Fetch expenses from expenses collection
      const expensesRef = collection(db, 'expenses');
      let expensesQuery;
      if (isAdminOrManager && company?.id) {
        expensesQuery = query(
          expensesRef,
          where('companyId', '==', company.id)
        );
      } else {
        expensesQuery = query(
          expensesRef,
          where('userId', '==', user.uid)
        );
      }

      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesData = {};
      
      expensesSnapshot.docs.forEach(doc => {
        const expense = doc.data();
        const dateKey = expense.date?.toDate().toDateString();
        const vehicleId = expense.vehicleId;
        const key = `${dateKey}-${vehicleId}`;
        
        if (!expensesData[key]) {
          expensesData[key] = [];
        }
        expensesData[key].push({
          id: doc.id,
          description: expense.description,
          amount: expense.amount || 0,
          category: expense.category || 'Other'
        });
      });
      
      setExpenses(expensesData);

      setTrips(tripsData);

      // Calculate totals including expenses from expenses collection
      const cashIn = tripsData.reduce((sum, trip) => sum + (trip.cashIn || 0), 0);
      let totalExpensesAmount = tripsData.reduce((sum, trip) => {
        const fuel = trip.fuelExpense || 0;
        const repairs = trip.repairsExpense || 0;
        const other = trip.otherExpenses || 0;
        return sum + fuel + repairs + other;
      }, 0);

      // Add expenses from expenses collection
      Object.values(expensesData).forEach(expenseList => {
        expenseList.forEach(expense => {
          totalExpensesAmount += expense.amount;
        });
      });

      setTotalCashIn(cashIn);
      setTotalExpenses(totalExpensesAmount);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrips = trips.filter(trip => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const driverName = users[trip.userId] || '';
      const vehicleName = vehicles[trip.vehicleId] || '';
      const matchesSearch = (
        trip.startLocation?.toLowerCase().includes(search) ||
        trip.endLocation?.toLowerCase().includes(search) ||
        vehicleName.toLowerCase().includes(search) ||
        driverName.toLowerCase().includes(search) ||
        trip.date?.toLocaleDateString().includes(search)
      );
      if (!matchesSearch) return false;
    }

    // Date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      if (trip.date < startDate) return false;
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      if (trip.date > endDate) return false;
    }

    // Vehicle filter
    if (filters.vehicleId && trip.vehicleId !== filters.vehicleId) {
      return false;
    }

    // Driver filter (admin/manager only)
    if (filters.driverId && trip.userId !== filters.driverId) {
      return false;
    }

    return true;
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      vehicleId: '',
      driverId: ''
    });
  };

  const hasActiveFilters = filters.startDate || filters.endDate || filters.vehicleId || filters.driverId;

  const handleExport = () => {
    // Create CSV content
    const headers = isAdminOrManager 
      ? ['Date', 'Driver', 'Route', 'Vehicle', 'Distance', 'Cash In', 'Expenses']
      : ['Date', 'Route', 'Vehicle', 'Distance', 'Cash In', 'Expenses'];
    
    const rows = filteredTrips.map(trip => {
      const baseRow = [
        trip.date?.toLocaleDateString() || '',
        ...(isAdminOrManager ? [users[trip.userId] || 'Unknown'] : []),
        `${trip.startLocation} → ${trip.endLocation}`,
        vehicles[trip.vehicleId] || 'N/A',
        `${trip.distanceTraveled || 0} km`,
        `R${(trip.cashIn || 0).toFixed(2)}`,
        `R${((trip.fuelExpense || 0) + (trip.repairsExpense || 0) + (trip.otherExpenses || 0)).toFixed(2)}`
      ];
      return baseRow;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trip-logbook-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-400">Loading trip logbook...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Trip Logbook</h1>
          <p className="text-slate-400 text-xs sm:text-sm">Electronic logbook for all your trips and expenses.</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
          {/* Total Cash In */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 sm:p-4">
            <p className="text-slate-400 text-xs font-medium mb-1">Total Cash In</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-400">${totalCashIn.toFixed(2)}</p>
          </div>

          {/* Total Expenses */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 sm:p-4">
            <p className="text-slate-400 text-xs font-medium mb-1">Total Expenses</p>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-400">${totalExpenses.toFixed(2)}</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by route, vehicle, or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-800 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Filter Button */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 bg-slate-900/50 border rounded-lg transition text-sm relative ${
              hasActiveFilters 
                ? 'border-blue-500 text-blue-400 hover:text-blue-300' 
                : 'border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
            )}
          </button>

          {/* Export Button - Only for Admins and Managers */}
          {!isDriver && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-700 transition text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-4 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white">Filters</h3>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Start Date */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              {/* Vehicle Filter */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Vehicle</label>
                <select
                  value={filters.vehicleId}
                  onChange={(e) => handleFilterChange('vehicleId', e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                >
                  <option value="">All Vehicles</option>
                  {Object.entries(vehicles).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Driver Filter (Admin/Manager only) */}
              {isAdminOrManager && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Driver</label>
                  <select
                    value={filters.driverId}
                    onChange={(e) => handleFilterChange('driverId', e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="">All Drivers</option>
                    {Object.entries(users).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {filteredTrips.length === 0 ? (
            <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-500 text-sm">No trips found. Start adding your trips to see them here.</p>
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const inlineExpenses = (trip.fuelExpense || 0) + (trip.repairsExpense || 0) + (trip.otherExpenses || 0);
              const dateKey = trip.date?.toDateString();
              const vehicleId = trip.vehicleId;
              const expenseKey = `${dateKey}-${vehicleId}`;
              const tripExpensesList = expenses[expenseKey] || [];
              const separateExpensesTotal = tripExpensesList.reduce((sum, exp) => sum + exp.amount, 0);
              const totalTripExpenses = inlineExpenses + separateExpensesTotal;
              const driverName = users[trip.userId] || 'Unknown Driver';
              
              return (
                <div key={trip.id} className="bg-slate-900/30 border border-slate-800 rounded-xl p-3">
                  {/* Date */}
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/50">
                    <span className="text-slate-400 text-xs font-medium">
                      📅 {trip.date?.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  
                  {/* Driver (Admin/Manager only) */}
                  {isAdminOrManager && (
                    <div className="mb-2">
                      <span className="text-slate-500 text-xs">Driver:</span>
                      <p className="text-white font-medium text-sm">{driverName}</p>
                    </div>
                  )}
                  
                  {/* Route */}
                  <div className="mb-2">
                    <span className="text-slate-500 text-xs">Route:</span>
                    <p className="text-white font-medium text-sm">
                      {trip.startLocation} → {trip.endLocation}
                    </p>
                  </div>
                  
                  {/* Vehicle & Distance */}
                  <div className="grid grid-cols-2 gap-3 mb-2 text-xs">
                    <div>
                      <span className="text-slate-500">Vehicle:</span>
                      <p className="text-slate-300 font-medium">{vehicles[trip.vehicleId] || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Distance:</span>
                      <p className="text-slate-300 font-medium">{trip.distanceTraveled ? `${trip.distanceTraveled.toFixed(1)} km` : 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Cash In & Expenses */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-700/50">
                    <div>
                      <span className="text-slate-500 text-xs">Cash In:</span>
                      <p className="text-blue-400 font-bold text-sm">${(trip.cashIn || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs">Expenses:</span>
                      <p className="text-red-400 font-bold text-sm">${totalTripExpenses.toFixed(2)}</p>
                    </div>
                  </div>
                  
                  {/* Expense Breakdown */}
                  {(inlineExpenses > 0 || tripExpensesList.length > 0) && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                      <span className="text-slate-500 text-xs font-medium">Expense Breakdown:</span>
                      <div className="mt-1 space-y-1">
                        {trip.fuelExpense > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">• Fuel</span>
                            <span className="text-slate-300">${trip.fuelExpense.toFixed(2)}</span>
                          </div>
                        )}
                        {trip.repairsExpense > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">• Repairs</span>
                            <span className="text-slate-300">${trip.repairsExpense.toFixed(2)}</span>
                          </div>
                        )}
                        {trip.otherExpenses > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">• Other</span>
                            <span className="text-slate-300">${trip.otherExpenses.toFixed(2)}</span>
                          </div>
                        )}
                        {tripExpensesList.map((expense) => (
                          <div key={expense.id} className="flex justify-between text-xs">
                            <span className="text-slate-400">• {expense.description}</span>
                            <span className="text-slate-300">${expense.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-slate-900/30 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Date</th>
                  {isAdminOrManager && (
                    <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Driver</th>
                  )}
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Route</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Vehicle</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Distance</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Cash In</th>
                  <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={isAdminOrManager ? "7" : "6"} className="px-4 py-8 text-center text-slate-500 text-sm">
                      No trips found. Start adding your trips to see them here.
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((trip) => {
                    const inlineExpenses = (trip.fuelExpense || 0) + (trip.repairsExpense || 0) + (trip.otherExpenses || 0);
                    const dateKey = trip.date?.toDateString();
                    const vehicleId = trip.vehicleId;
                    const expenseKey = `${dateKey}-${vehicleId}`;
                    const tripExpensesList = expenses[expenseKey] || [];
                    const separateExpensesTotal = tripExpensesList.reduce((sum, exp) => sum + exp.amount, 0);
                    const totalTripExpenses = inlineExpenses + separateExpensesTotal;
                    const driverName = users[trip.userId] || 'Unknown Driver';
                    
                    return (
                      <tr key={trip.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          {trip.date?.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit' 
                          })}
                        </td>
                        {isAdminOrManager && (
                          <td className="px-4 py-3 text-slate-300 text-sm font-medium">
                            {driverName}
                          </td>
                        )}
                        <td className="px-4 py-3 text-white font-medium text-sm">
                          {trip.startLocation} → {trip.endLocation}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          {vehicles[trip.vehicleId] || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-slate-300 text-sm">
                          {trip.distanceTraveled ? `${trip.distanceTraveled.toFixed(1)} km` : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-blue-400 font-semibold text-sm">
                          ${(trip.cashIn || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-red-400 font-semibold text-sm">
                          <div className="flex flex-col">
                            <span>${totalTripExpenses.toFixed(2)}</span>
                            {(inlineExpenses > 0 || tripExpensesList.length > 0) && (
                              <div className="mt-1 text-xs text-slate-400 font-normal space-y-0.5">
                                {trip.fuelExpense > 0 && <div>Fuel: ${trip.fuelExpense.toFixed(2)}</div>}
                                {trip.repairsExpense > 0 && <div>Repairs: ${trip.repairsExpense.toFixed(2)}</div>}
                                {trip.otherExpenses > 0 && <div>Other: ${trip.otherExpenses.toFixed(2)}</div>}
                                {tripExpensesList.map((expense) => (
                                  <div key={expense.id}>{expense.description}: ${expense.amount.toFixed(2)}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Trip Count */}
        {filteredTrips.length > 0 && (
          <div className="mt-3 text-center text-slate-500 text-xs">
            Showing {filteredTrips.length} {filteredTrips.length === 1 ? 'trip' : 'trips'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TripLogbookPage;
