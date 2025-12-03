import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

const VehiclePerformanceTable = () => {
  const { company } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehiclePerformance();
  }, [company]);

  const loadVehiclePerformance = async () => {
    if (!company?.id) return;

    try {
      setLoading(true);

      // Fetch commodity vehicles
      const vehiclesRef = collection(db, 'vehicles');
      const vehiclesQuery = query(
        vehiclesRef,
        where('companyId', '==', company.id),
        where('vehicleType', 'in', ['fuelTruck', 'lpGasTruck'])
      );
      const vehiclesSnapshot = await getDocs(vehiclesQuery);

      // Fetch load events
      const loadEventsRef = collection(db, 'loadEvents');
      const loadQuery = query(
        loadEventsRef,
        where('companyId', '==', company.id)
      );
      const loadSnapshot = await getDocs(loadQuery);

      // Fetch offload events
      const offloadEventsRef = collection(db, 'offloadEvents');
      const offloadQuery = query(
        offloadEventsRef,
        where('companyId', '==', company.id)
      );
      const offloadSnapshot = await getDocs(offloadQuery);

      // Calculate performance metrics per vehicle
      const vehicleMetrics = {};

      vehiclesSnapshot.docs.forEach(doc => {
        const vehicleData = doc.data();
        vehicleMetrics[doc.id] = {
          id: doc.id,
          name: vehicleData.name,
          registrationNumber: vehicleData.registrationNumber,
          currentMileage: vehicleData.currentMileage || 0,
          trips: 0,
          totalVolume: 0,
          totalVariance: 0,
          varianceCount: 0
        };
      });

      // Count trips from load events
      loadSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (vehicleMetrics[data.vehicleId]) {
          vehicleMetrics[data.vehicleId].trips++;
          vehicleMetrics[data.vehicleId].totalVolume += parseFloat(data.loadQuantity) || 0;
        }
      });

      // Calculate variance from offload events
      offloadSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (vehicleMetrics[data.vehicleId] && data.variancePercentage !== undefined) {
          vehicleMetrics[data.vehicleId].totalVariance += Math.abs(parseFloat(data.variancePercentage) || 0);
          vehicleMetrics[data.vehicleId].varianceCount++;
        }
      });

      // Calculate average variance and sort by trips
      const performanceData = Object.values(vehicleMetrics)
        .map(vehicle => ({
          ...vehicle,
          avgVariance: vehicle.varianceCount > 0 
            ? (vehicle.totalVariance / vehicle.varianceCount).toFixed(2)
            : '0.00'
        }))
        .sort((a, b) => b.trips - a.trips)
        .slice(0, 5); // Top 5 vehicles

      setVehicles(performanceData);

    } catch (error) {
      console.error('Error loading vehicle performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-baltic-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading vehicle performance...</p>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p className="text-lg font-semibold">No vehicle data yet</p>
        <p className="text-sm mt-1">Add commodity vehicles and record trips to see performance</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Vehicle</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Current KM</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Trips</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Volume (L/kg)</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Avg Variance</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {vehicles.map((vehicle) => {
            const variance = parseFloat(vehicle.avgVariance);
            const varianceColor = variance < 1 ? 'text-success' : variance < 3 ? 'text-warning' : 'text-danger';
            const statusColor = variance < 1 ? 'bg-success/10 text-success' : variance < 3 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger';
            const statusText = variance < 1 ? '✓ Excellent' : variance < 3 ? '⚠ Review' : '🔴 Alert';

            return (
              <tr key={`${vehicle.id}-${vehicle.trips}-${variance}`} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-900">{vehicle.name}</p>
                    <p className="text-xs text-gray-500">{vehicle.registrationNumber}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-right font-medium text-gray-700">
                  {vehicle.currentMileage > 0 ? `${vehicle.currentMileage.toLocaleString()} km` : 'Not recorded'}
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                  {vehicle.trips}
                </td>
                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                  {vehicle.totalVolume.toLocaleString()}
                </td>
                <td className={`px-4 py-3 text-sm text-right font-bold ${varianceColor}`}>
                  {vehicle.avgVariance}%
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                    {statusText}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default VehiclePerformanceTable;
