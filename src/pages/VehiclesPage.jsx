import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { Plus, Car, Truck, Edit2, Trash2, AlertCircle, CheckCircle, Gauge, Fuel, Flame } from "lucide-react";
import toast from "react-hot-toast";
import { getLastRecordedMileage } from '../services/mileageValidationService';
import VehicleAlertsSection from '../components/vehicles/VehicleAlertsSection';
import VehicleForm from '../components/vehicles/VehicleForm';

const VehiclesPage = () => {
  usePageTitle('Vehicle Monitoring');
  const { user, company, userProfile } = useAuth();
  const { isDark } = useTheme();
  const [vehicles, setVehicles] = useState([]);
  const [vehicleMileages, setVehicleMileages] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  useEffect(() => {
    loadVehicles();
  }, [user, company]);

  // Refetch vehicle data when page regains focus (after trip/offload/return capture)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 VehiclesPage: Refreshing vehicle data after focus');
      loadVehicles();
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 VehiclesPage: Page became visible, refreshing data');
        loadVehicles();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadVehicles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const vehiclesRef = collection(db, 'vehicles');
      
      let q;
      if (userProfile?.role === 'system_admin') {
        // System admin sees all vehicles
        q = query(vehiclesRef);
      } else if (company?.id) {
        // Company users see only their company's vehicles
        q = query(vehiclesRef, where('companyId', '==', company.id));
      } else {
        // Individual users see only their vehicles
        q = query(vehiclesRef, where('userId', '==', user.uid));
      }

      const snapshot = await getDocs(q);
      const vehiclesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setVehicles(vehiclesData);

      // Load current mileage for each vehicle (cumulative from all events)
      const mileages = {};
      for (const vehicle of vehiclesData) {
        try {
          // Priority 1: Get the most recent mileage from getLastRecordedMileage (checks all events including return trips)
          const lastMileage = await getLastRecordedMileage(vehicle.id);
          
          // Priority 2: Use vehicle's currentOdometer (updated by services)
          const vehicleOdometer = vehicle.currentOdometer || 0;
          
          // Priority 3: Legacy currentMileage field
          const legacyMileage = vehicle.currentMileage || 0;
          
          // Use the highest value (most recent)
          const calculatedMileage = lastMileage?.lastMileage || 0;
          const finalMileage = Math.max(calculatedMileage, vehicleOdometer, legacyMileage);
          
          mileages[vehicle.id] = finalMileage;
          
          console.log(`🚗 Vehicle ${vehicle.registrationNumber}: Calculated=${calculatedMileage}, Odometer=${vehicleOdometer}, Legacy=${legacyMileage}, Final=${finalMileage}`);
        } catch (error) {
          console.error('Error loading mileage for vehicle:', error);
          // Fallback: prioritize currentOdometer over currentMileage
          mileages[vehicle.id] = vehicle.currentOdometer || vehicle.currentMileage || 0;
        }
      }
      setVehicleMileages(mileages);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast.error('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const getServiceStatus = (vehicle) => {
    if (!vehicle.nextServiceMileage) {
      return { 
        status: 'missing', 
        text: '⚠️ Please capture next service mileage', 
        color: 'yellow',
        icon: AlertCircle,
        important: true
      };
    }

    // Get current mileage from vehicleMileages state (most recent recorded mileage)
    const currentMileage = vehicleMileages[vehicle.id] || 0;
    const nextServiceMileage = parseInt(vehicle.nextServiceMileage) || 0;
    const mileageRemaining = nextServiceMileage - currentMileage;

    if (mileageRemaining <= 0) {
      return { 
        status: 'overdue', 
        text: 'Service Overdue', 
        color: 'red', 
        icon: AlertCircle,
        mileage: `${Math.abs(mileageRemaining)} km overdue`
      };
    } else if (mileageRemaining <= 500) {
      return { 
        status: 'due', 
        text: `Service Due Soon`, 
        color: 'orange', 
        icon: AlertCircle, 
        mileage: `${mileageRemaining} km remaining`
      };
    } else {
      return { 
        status: 'ok', 
        text: 'Service OK', 
        color: 'green', 
        icon: CheckCircle, 
        mileage: `Next at ${nextServiceMileage.toLocaleString()} km`
      };
    }
  };

  const getLicenseStatus = (vehicle) => {
    // Check all possible field names for backward compatibility
    const expiryDateValue = vehicle.discExpiryDate || vehicle.roadworthinessExpiryDate || vehicle.licenseExpiryDate;
    
    if (!expiryDateValue) {
      return { 
        status: 'missing', 
        text: '⚠️ Please capture disc licence expiry date', 
        color: 'yellow',
        icon: AlertCircle,
        important: true
      };
    }

    const expiryDate = new Date(expiryDateValue);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return {
        status: 'expired',
        text: 'Licence Disc Expired',
        color: 'red',
        icon: AlertCircle,
        date: expiryDate.toLocaleDateString(),
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        status: 'due',
        text: 'Licence Disc Renewal Soon',
        color: 'orange',
        icon: AlertCircle,
        date: expiryDate.toLocaleDateString(),
      };
    } else {
      return {
        status: 'ok',
        text: 'Licence Disc OK',
        color: 'green',
        icon: CheckCircle,
        date: expiryDate.toLocaleDateString(),
      };
    }
  };

  // Count vehicle types for hybrid breakdown
  const dieselCount = vehicles.filter(v => v.vehicleType === 'fuelTruck').length;
  const gasCount = vehicles.filter(v => v.vehicleType === 'lpGasTruck').length;
  const isHybrid = dieselCount > 0 && (vehicles.length - dieselCount - gasCount) > 0 || 
                   gasCount > 0 && (vehicles.length - dieselCount - gasCount) > 0 ||
                   (dieselCount > 0 && gasCount > 0);

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => getServiceStatus(v).status === 'ok').length,
    serviceDue: vehicles.filter(v => ['due', 'overdue'].includes(getServiceStatus(v).status)).length,
    missingData: vehicles.filter(v => 
      getServiceStatus(v).status === 'missing' || 
      getLicenseStatus(v).status === 'missing'
    ).length,
    dieselCount,
    gasCount,
    traditionalCount: vehicles.length - dieselCount - gasCount,
  };

  const handleOpenModal = (vehicle = null) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
  };

  // Smart default: Use business type preference or most common existing vehicle type
  const getSmartDefaultVehicleType = () => {
    // Priority 1: Check user's business type preference (set during registration)
    if (userProfile?.businessType === 'commodity') {
      // Commodity-only business - default to fuelTruck
      return 'fuelTruck';
    }
    
    // Priority 2: Check if company has commoditySettings
    if (company?.commoditySettings?.primaryCommodity === 'diesel') {
      return 'fuelTruck';
    }
    if (company?.commoditySettings?.primaryCommodity === 'lpGas') {
      return 'lpGasTruck';
    }
    
    // Priority 3: Check existing vehicles
    const existingTypes = vehicles.map(v => v.vehicleType).filter(Boolean);
    const hasCommodityVehicles = existingTypes.some(t => ['fuelTruck', 'lpGasTruck'].includes(t));
    
    if (hasCommodityVehicles) {
      // Default to the most common commodity type
      const fuelCount = existingTypes.filter(t => t === 'fuelTruck').length;
      const gasCount = existingTypes.filter(t => t === 'lpGasTruck').length;
      return gasCount > fuelCount ? 'lpGasTruck' : 'fuelTruck';
    }
    
    // Priority 4: Hybrid business - default to fuelTruck if they also have commodity tracking
    if (userProfile?.businessType === 'hybrid') {
      return 'fuelTruck';
    }
    
    // Fall back to taxi for traditional businesses
    return 'taxi';
  };

  const handleSubmit = async (formData) => {
    try {
      // Clean up formData - convert empty strings to null for optional fields
      const mileage = formData.currentMileage ? parseInt(formData.currentMileage) : null;
      const vehicleData = {
        ...formData,
        vehicleType: formData.vehicleType || 'taxi',
        currentMileage: mileage,
        currentOdometer: mileage, // Also set currentOdometer for compatibility
        nextServiceMileage: formData.nextServiceMileage ? parseInt(formData.nextServiceMileage) : null,
        discExpiryDate: formData.discExpiryDate || null,
        roadworthinessExpiryDate: formData.discExpiryDate || null, // Also save for compatibility
        userId: user.uid,
        companyId: company?.id || null,
        updatedAt: serverTimestamp(),
      };

      if (editingVehicle) {
        // Update existing vehicle
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), vehicleData);
        toast.success('Vehicle updated successfully!');
      } else {
        // Add new vehicle
        await addDoc(collection(db, 'vehicles'), {
          ...vehicleData,
          createdAt: serverTimestamp(),
        });
        toast.success('Vehicle added successfully!');
      }

      handleCloseModal();
      
      // Reload vehicles to reflect changes
      await loadVehicles();
      
      // Dispatch event to notify Sidebar of vehicle change
      window.dispatchEvent(new CustomEvent('vehicleChanged'));
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error('Failed to save vehicle: ' + error.message);
    }
  };

  const handleDelete = async (vehicleId) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      toast.success('Vehicle deleted successfully!');
      loadVehicles();
      
      // Dispatch event to notify Sidebar of vehicle change
      window.dispatchEvent(new CustomEvent('vehicleChanged'));
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-transparent' : 'bg-transparent'}`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-baltic-500 mb-4"></div>
          <p className={isDark ? 'text-slate-400' : 'text-baltic-600'}>Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-baltic-900'}`}>Vehicle Monitoring</h1>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-baltic-600'}`}>Monitor your fleet, alerts, and service schedules.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-5 py-2.5 bg-baltic-500 hover:bg-baltic-600 text-white rounded-lg font-medium transition shadow-lg shadow-baltic-500/20">
            <Plus className="w-5 h-5" />
            Add Vehicle
          </button>
        </div>

        {/* Vehicle Alerts Section */}
        <VehicleAlertsSection vehicles={vehicles} />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Vehicles */}
          <div className={`rounded-xl p-4 transition ${isDark ? 'bg-slate-900/50 border border-slate-800 hover:border-slate-700' : 'bg-white border border-baltic-200 hover:border-baltic-400 shadow-sm'}`}>
            <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-baltic-600'}`}>Total Vehicles</p>
            <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-baltic-900'}`}>{stats.total}</p>
            {/* Show breakdown for hybrid fleets */}
            {(stats.dieselCount > 0 || stats.gasCount > 0) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {stats.dieselCount > 0 && (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                    <Fuel className="w-3 h-3" /> {stats.dieselCount} Diesel
                  </span>
                )}
                {stats.gasCount > 0 && (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                    <Flame className="w-3 h-3" /> {stats.gasCount} Gas
                  </span>
                )}
                {stats.traditionalCount > 0 && (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${isDark ? 'bg-slate-500/20 text-slate-300' : 'bg-gray-100 text-gray-700'}`}>
                    <Car className="w-3 h-3" /> {stats.traditionalCount} Other
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Active Vehicles */}
          <div className={`rounded-xl p-4 transition ${isDark ? 'bg-slate-900/50 border border-slate-800 hover:border-slate-700' : 'bg-white border border-baltic-200 hover:border-baltic-400 shadow-sm'}`}>
            <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-baltic-600'}`}>Active</p>
            <p className={`text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>{stats.active}</p>
          </div>

          {/* Service Due */}
          <div className={`rounded-xl p-4 transition ${isDark ? 'bg-slate-900/50 border border-slate-800 hover:border-slate-700' : 'bg-white border border-baltic-200 hover:border-baltic-400 shadow-sm'}`}>
            <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-baltic-600'}`}>Service Due</p>
            <p className={`text-3xl font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>{stats.serviceDue}</p>
          </div>

          {/* Missing Data */}
          <div className={`rounded-xl p-4 transition ${isDark ? 'bg-slate-900/50 border border-slate-800 hover:border-slate-700' : 'bg-white border border-baltic-200 hover:border-baltic-400 shadow-sm'}`}>
            <p className={`text-xs font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-baltic-600'}`}>Missing Data</p>
            <p className={`text-3xl font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>{stats.missingData}</p>
          </div>
        </div>

        {/* Missing Data Alert Banner */}
        {stats.missingData > 0 && (
          <div className={`mb-4 rounded-xl p-4 animate-pulse ${isDark ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-300'}`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <div className="flex-1">
                <h3 className={`font-bold text-base mb-1 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  ⚠️ Action Required: Missing Critical Data
                </h3>
                <p className={`text-sm leading-relaxed mb-2 ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>
                  <strong>{stats.missingData} vehicle{stats.missingData > 1 ? 's' : ''}</strong> {stats.missingData > 1 ? 'are' : 'is'} missing important information needed for alerts:
                </p>
                <ul className={`text-xs space-y-1 ml-4 ${isDark ? 'text-yellow-200' : 'text-yellow-800'}`}>
                  <li>• <strong>Next Service Mileage</strong> - Required for service due alerts</li>
                  <li>• <strong>Disc License Expiry</strong> - Required for license renewal alerts</li>
                </ul>
                <p className={`text-xs mt-2 font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  👉 Please edit these vehicles and add the missing data to enable automatic alerts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Vehicles Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-baltic-900'}`}>Your Fleet</h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-baltic-600'}`}>{vehicles.length} {vehicles.length === 1 ? 'vehicle' : 'vehicles'}</p>
          </div>
          
          {/* Vehicles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.length === 0 ? (
            <div className={`col-span-full rounded-2xl p-12 text-center ${isDark ? 'bg-slate-900/30 border border-slate-800' : 'bg-baltic-50 border border-baltic-200'}`}>
              <Car className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-baltic-400'}`} />
              <p className={`text-lg mb-2 ${isDark ? 'text-slate-400' : 'text-baltic-700'}`}>No vehicles added yet</p>
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-baltic-600'}`}>Click "Add Vehicle" to get started</p>
            </div>
          ) : (
            vehicles.map((vehicle) => {
              const serviceStatus = getServiceStatus(vehicle);
              const StatusIcon = serviceStatus.icon || AlertCircle;
              const licenseStatus = getLicenseStatus(vehicle);
              const LicenseIcon = licenseStatus.icon || AlertCircle;

              return (
                <div
                  key={vehicle.id}
                  className={`rounded-xl p-4 transition ${isDark ? 'bg-slate-900/50 border border-slate-800 hover:border-slate-700' : 'bg-white border border-baltic-200 hover:border-baltic-400 shadow-sm'}`}
                >
                  {/* Header: Icon, Name, Actions */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2.5 rounded-xl ${
                      vehicle.vehicleType === 'fuelTruck' 
                        ? 'bg-amber-500' 
                        : vehicle.vehicleType === 'lpGasTruck'
                        ? 'bg-orange-500'
                        : 'bg-baltic-500'
                    }`}>
                      {vehicle.vehicleType === 'fuelTruck' ? (
                        <Fuel className="w-5 h-5 text-white" />
                      ) : vehicle.vehicleType === 'lpGasTruck' ? (
                        <Flame className="w-5 h-5 text-white" />
                      ) : ['generalTruck'].includes(vehicle.vehicleType) ? (
                        <Truck className="w-5 h-5 text-white" />
                      ) : (
                        <Car className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-baltic-900'}`}>{vehicle.name}</h3>
                      <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-baltic-600'}`}>{vehicle.registrationNumber}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleOpenModal(vehicle)}
                        className={`p-1.5 rounded-lg transition ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-baltic-100 hover:bg-baltic-200'}`}
                      >
                        <Edit2 className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-baltic-600'}`} />
                      </button>
                      {(userProfile?.role === 'company_admin' || userProfile?.role === 'company_manager' || userProfile?.role === 'system_admin') && (
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className={`p-1.5 rounded-lg transition ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-baltic-100 hover:bg-baltic-200'}`}
                        >
                          <Trash2 className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-baltic-600'}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info Row: Model & Mileage */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-baltic-600'}`}>
                        {vehicle.make} {vehicle.model}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-baltic-50 border-baltic-200'}`}>
                      <Gauge className={`w-3 h-3 ${isDark ? 'text-blue-400' : 'text-baltic-600'}`} />
                      <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-baltic-900'}`}>
                        {vehicleMileages[vehicle.id] !== undefined 
                          ? `${vehicleMileages[vehicle.id].toLocaleString()} km`
                          : '...'}
                      </span>
                    </div>
                  </div>

                  {/* Status Badges - Compact */}
                  <div className="space-y-2">
                    {/* Service Status */}
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        serviceStatus.status === 'ok'
                          ? isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'
                          : serviceStatus.status === 'due'
                          ? isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'
                          : serviceStatus.status === 'overdue'
                          ? isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
                          : serviceStatus.status === 'missing'
                          ? isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'
                          : isDark ? 'bg-slate-800 border-slate-700' : 'bg-baltic-50 border-baltic-200'
                      }`}
                    >
                      <StatusIcon
                        className={`w-4 h-4 flex-shrink-0 ${
                          serviceStatus.status === 'ok'
                            ? isDark ? 'text-green-400' : 'text-green-600'
                            : serviceStatus.status === 'due'
                            ? isDark ? 'text-orange-400' : 'text-orange-600'
                            : serviceStatus.status === 'overdue'
                            ? isDark ? 'text-red-400' : 'text-red-600'
                            : serviceStatus.status === 'missing'
                            ? isDark ? 'text-yellow-400' : 'text-yellow-600'
                            : isDark ? 'text-slate-400' : 'text-baltic-600'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${
                          serviceStatus.status === 'ok'
                            ? isDark ? 'text-green-400' : 'text-green-700'
                            : serviceStatus.status === 'due'
                            ? isDark ? 'text-orange-400' : 'text-orange-700'
                            : serviceStatus.status === 'overdue'
                            ? isDark ? 'text-red-400' : 'text-red-700'
                            : serviceStatus.status === 'missing'
                            ? isDark ? 'text-yellow-400' : 'text-yellow-700'
                            : isDark ? 'text-slate-400' : 'text-baltic-600'
                        }`}>
                          {serviceStatus.text}
                        </p>
                      </div>
                    </div>

                    {/* Licence Status */}
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                        licenseStatus.status === 'ok'
                          ? isDark ? 'bg-green-500/10 border-green-500/20' : 'bg-green-50 border-green-200'
                          : licenseStatus.status === 'due'
                          ? isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'
                          : licenseStatus.status === 'expired'
                          ? isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
                          : licenseStatus.status === 'missing'
                          ? isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'
                          : isDark ? 'bg-slate-800 border-slate-700' : 'bg-baltic-50 border-baltic-200'
                      }`}
                    >
                      <LicenseIcon
                        className={`w-4 h-4 flex-shrink-0 ${
                          licenseStatus.status === 'ok'
                            ? isDark ? 'text-green-400' : 'text-green-600'
                            : licenseStatus.status === 'due'
                            ? isDark ? 'text-orange-400' : 'text-orange-600'
                            : licenseStatus.status === 'expired'
                            ? isDark ? 'text-red-400' : 'text-red-600'
                            : licenseStatus.status === 'missing'
                            ? isDark ? 'text-yellow-400' : 'text-yellow-600'
                            : isDark ? 'text-slate-400' : 'text-baltic-600'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${
                          licenseStatus.status === 'ok'
                            ? isDark ? 'text-green-400' : 'text-green-700'
                            : licenseStatus.status === 'due'
                            ? isDark ? 'text-orange-400' : 'text-orange-700'
                            : licenseStatus.status === 'expired'
                            ? isDark ? 'text-red-400' : 'text-red-700'
                            : licenseStatus.status === 'missing'
                            ? isDark ? 'text-yellow-400' : 'text-yellow-700'
                            : isDark ? 'text-slate-400' : 'text-baltic-600'
                        }`}>
                          {licenseStatus.text}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

        {/* Add/Edit Vehicle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`rounded-2xl p-8 max-w-2xl w-full my-8 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-baltic-200'}`}>
            <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-baltic-900'}`}>
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>

            <VehicleForm
              vehicle={editingVehicle}
              defaultVehicleType={getSmartDefaultVehicleType()}
              onSubmit={handleSubmit}
              onCancel={handleCloseModal}
            />
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default VehiclesPage;
