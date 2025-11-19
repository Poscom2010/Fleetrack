import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Search, Filter, Download } from 'lucide-react';

const TripLogbookPage = () => {
  usePageTitle('Trip Logbook');
  const { user, userProfile, company } = useAuth();
  const isDriver = userProfile?.role === 'company_user';
  const isAdminOrManager = userProfile?.role === 'company_admin' || userProfile?.role === 'company_manager';
  const [trips, setTrips] = useState([]);
  const [users, setUsers] = useState({});
  const [vehicles, setVehicles] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalCashIn, setTotalCashIn] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

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
        const usersRef = collection(db, 'users');
        const usersData = {};
        
        for (const userId of userIds) {
          const userQuery = query(usersRef, where('__name__', '==', userId));
          const userSnapshot = await getDocs(userQuery);
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            usersData[userId] = userData.fullName || userData.displayName || userData.email || 'Unknown';
          }
        }
        setUsers(usersData);
      }

      // Fetch vehicle details for all trips
      if (tripsData.length > 0) {
        const vehicleIds = [...new Set(tripsData.map(trip => trip.vehicleId).filter(Boolean))];
        const vehiclesRef = collection(db, 'vehicles');
        const vehiclesData = {};
        
        for (const vehicleId of vehicleIds) {
          const vehicleQuery = query(vehiclesRef, where('__name__', '==', vehicleId));
          const vehicleSnapshot = await getDocs(vehicleQuery);
          if (!vehicleSnapshot.empty) {
            const vehicleData = vehicleSnapshot.docs[0].data();
            vehiclesData[vehicleId] = vehicleData.name || vehicleData.registrationNumber || 'Unknown';
          }
        }
        setVehicles(vehiclesData);
      }

      setTrips(tripsData);

      // Calculate totals
      const cashIn = tripsData.reduce((sum, trip) => sum + (trip.cashIn || 0), 0);
      const expenses = tripsData.reduce((sum, trip) => {
        const fuel = trip.fuelExpense || 0;
        const repairs = trip.repairsExpense || 0;
        const other = trip.otherExpenses || 0;
        return sum + fuel + repairs + other;
      }, 0);

      setTotalCashIn(cashIn);
      setTotalExpenses(expenses);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrips = trips.filter(trip => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const driverName = users[trip.userId] || '';
    const vehicleName = vehicles[trip.vehicleId] || '';
    return (
      trip.startLocation?.toLowerCase().includes(search) ||
      trip.endLocation?.toLowerCase().includes(search) ||
      vehicleName.toLowerCase().includes(search) ||
      driverName.toLowerCase().includes(search) ||
      trip.date?.toLocaleDateString().includes(search)
    );
  });

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
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:border-slate-700 transition text-sm">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
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

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {filteredTrips.length === 0 ? (
            <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-8 text-center">
              <p className="text-slate-500 text-sm">No trips found. Start adding your trips to see them here.</p>
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const totalTripExpenses = (trip.fuelExpense || 0) + (trip.repairsExpense || 0) + (trip.otherExpenses || 0);
              const driverName = users[trip.userId] || 'Unknown';
              
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
                    const totalTripExpenses = (trip.fuelExpense || 0) + (trip.repairsExpense || 0) + (trip.otherExpenses || 0);
                    const driverName = users[trip.userId] || 'Unknown';
                    
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
                          ${totalTripExpenses.toFixed(2)}
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
