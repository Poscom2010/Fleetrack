import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { Plus, Car, Edit2, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

const VehiclesPage = () => {
  usePageTitle('Vehicle Monitoring');
  const { user, company, userProfile } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    make: '',
    model: '',
    nextServiceMileage: '',
    licenseExpiryDate: '',
  });

  useEffect(() => {
    loadVehicles();
  }, [user, company]);

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

    // Get current mileage (odometer reading)
    const currentMileage = vehicle.currentMileage || vehicle.startMileage || 0;
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
    if (!vehicle.licenseExpiryDate) {
      return { 
        status: 'missing', 
        text: '⚠️ Please capture disc licence expiry date', 
        color: 'yellow',
        icon: AlertCircle,
        important: true
      };
    }

    const expiryDate = new Date(vehicle.licenseExpiryDate);
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

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => getServiceStatus(v).status === 'ok').length,
    serviceDue: vehicles.filter(v => ['due', 'overdue'].includes(getServiceStatus(v).status)).length,
    missingData: vehicles.filter(v => 
      getServiceStatus(v).status === 'missing' || 
      getLicenseStatus(v).status === 'missing'
    ).length,
  };

  const handleOpenModal = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        name: vehicle.name || '',
        registrationNumber: vehicle.registrationNumber || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        nextServiceMileage: vehicle.nextServiceMileage || '',
        licenseExpiryDate: vehicle.licenseExpiryDate || '',
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        name: '',
        registrationNumber: '',
        make: '',
        model: '',
        nextServiceMileage: '',
        licenseExpiryDate: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    setFormData({
      name: '',
      registrationNumber: '',
      make: '',
      model: '',
      nextServiceMileage: '',
      licenseExpiryDate: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const vehicleData = {
        ...formData,
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
      loadVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error('Failed to save vehicle');
    }
  };

  const handleDelete = async (vehicleId) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;

    try {
      await deleteDoc(doc(db, 'vehicles', vehicleId));
      toast.success('Vehicle deleted successfully!');
      loadVehicles();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-400">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Vehicles</h1>
            <p className="text-slate-400 text-sm">Manage your fleet vehicles and service schedules.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-lg shadow-blue-500/20 text-sm">
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        </div>

        {/* Missing Data Alert Banner */}
        {stats.missingData > 0 && (
          <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-yellow-400 font-bold text-base mb-1">
                  ⚠️ Action Required: Missing Critical Data
                </h3>
                <p className="text-yellow-200 text-sm leading-relaxed mb-2">
                  <strong>{stats.missingData} vehicle{stats.missingData > 1 ? 's' : ''}</strong> {stats.missingData > 1 ? 'are' : 'is'} missing important information needed for alerts:
                </p>
                <ul className="text-yellow-200 text-xs space-y-1 ml-4">
                  <li>• <strong>Next Service Mileage</strong> - Required for service due alerts</li>
                  <li>• <strong>Disc License Expiry</strong> - Required for license renewal alerts</li>
                </ul>
                <p className="text-yellow-300 text-xs mt-2 font-medium">
                  👉 Please edit these vehicles and add the missing data to enable automatic alerts.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Total Vehicles */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium mb-1">Total Vehicles</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>

          {/* Active Vehicles */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium mb-1">Active Vehicles</p>
            <p className="text-3xl font-bold text-green-400">{stats.active}</p>
          </div>

          {/* Service Due */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium mb-1">Service Due</p>
            <p className="text-3xl font-bold text-orange-400">{stats.serviceDue}</p>
          </div>

          {/* Missing Data */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-slate-400 text-xs font-medium mb-1">Missing Data</p>
            <p className="text-3xl font-bold text-yellow-400">{stats.missingData}</p>
          </div>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.length === 0 ? (
            <div className="col-span-full bg-slate-900/30 border border-slate-800 rounded-2xl p-12 text-center">
              <Car className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg mb-2">No vehicles added yet</p>
              <p className="text-slate-500 text-sm">Click "Add Vehicle" to get started</p>
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
                  className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition"
                >
                  {/* Vehicle Icon and Actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-4 bg-blue-600 rounded-2xl">
                      <Car className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenModal(vehicle)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                      >
                        <Edit2 className="w-4 h-4 text-slate-400" />
                      </button>
                      {/* Only admins and managers can delete vehicles */}
                      {(userProfile?.role === 'company_admin' || userProfile?.role === 'company_manager' || userProfile?.role === 'system_admin') && (
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Name */}
                  <h3 className="text-xl font-bold text-white mb-1">{vehicle.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{vehicle.registrationNumber}</p>

                  {/* Model */}
                  <div className="mb-4">
                    <p className="text-slate-500 text-xs mb-1">Model</p>
                    <p className="text-white font-medium">
                      {vehicle.make} {vehicle.model}
                    </p>
                  </div>

                  {/* Service Status */}
                  <div
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl ${
                      serviceStatus.status === 'ok'
                        ? 'bg-green-500/10 border border-green-500/20'
                        : serviceStatus.status === 'due'
                        ? 'bg-orange-500/10 border border-orange-500/20'
                        : serviceStatus.status === 'overdue'
                        ? 'bg-red-500/10 border border-red-500/20'
                        : serviceStatus.status === 'missing'
                        ? 'bg-yellow-500/10 border border-yellow-500/30 animate-pulse'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <StatusIcon
                      className={`w-5 h-5 ${
                        serviceStatus.status === 'ok'
                          ? 'text-green-400'
                          : serviceStatus.status === 'due'
                          ? 'text-orange-400'
                          : serviceStatus.status === 'overdue'
                          ? 'text-red-400'
                          : serviceStatus.status === 'missing'
                          ? 'text-yellow-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <div className="flex-1">
                      <p
                        className={`font-medium text-sm ${
                          serviceStatus.status === 'ok'
                            ? 'text-green-400'
                            : serviceStatus.status === 'due'
                            ? 'text-orange-400'
                            : serviceStatus.status === 'overdue'
                            ? 'text-red-400'
                            : serviceStatus.status === 'missing'
                            ? 'text-yellow-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {serviceStatus.text}
                      </p>
                      {serviceStatus.mileage && (
                        <p className="text-xs text-slate-500 mt-0.5">{serviceStatus.mileage}</p>
                      )}
                    </div>
                  </div>

                  {/* Licence Disc Status */}
                  <div
                    className={`mt-3 flex items-center gap-2 px-4 py-3 rounded-xl ${
                      licenseStatus.status === 'ok'
                        ? 'bg-green-500/10 border border-green-500/20'
                        : licenseStatus.status === 'due'
                        ? 'bg-orange-500/10 border border-orange-500/20'
                        : licenseStatus.status === 'expired'
                        ? 'bg-red-500/10 border border-red-500/20'
                        : licenseStatus.status === 'missing'
                        ? 'bg-yellow-500/10 border border-yellow-500/30 animate-pulse'
                        : 'bg-slate-800 border border-slate-700'
                    }`}
                  >
                    <LicenseIcon
                      className={`w-5 h-5 ${
                        licenseStatus.status === 'ok'
                          ? 'text-green-400'
                          : licenseStatus.status === 'due'
                          ? 'text-orange-400'
                          : licenseStatus.status === 'expired'
                          ? 'text-red-400'
                          : licenseStatus.status === 'missing'
                          ? 'text-yellow-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <div className="flex-1">
                      <p
                        className={`font-medium text-sm ${
                          licenseStatus.status === 'ok'
                            ? 'text-green-400'
                            : licenseStatus.status === 'due'
                            ? 'text-orange-400'
                            : licenseStatus.status === 'expired'
                            ? 'text-red-400'
                            : licenseStatus.status === 'missing'
                            ? 'text-yellow-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {licenseStatus.text}
                      </p>
                      {licenseStatus.date && (
                        <p className="text-xs text-slate-500 mt-0.5">Expiry: {licenseStatus.date}</p>
                      )}
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>

            {/* Important Notice */}
            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-yellow-400 font-semibold text-sm mb-1">Important for Alerts!</h3>
                  <p className="text-yellow-200 text-xs leading-relaxed">
                    Please capture <strong>Next Service Mileage</strong> and <strong>Disc License Expiry</strong> to receive timely alerts. 
                    You can add these now or later by editing the vehicle.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Vehicle Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g., Toyota Camry"
                    required
                  />
                </div>

                {/* Registration Number */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Registration Number *
                  </label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g., ABC-123"
                    required
                  />
                </div>

                {/* Make */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Make *
                  </label>
                  <input
                    type="text"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g., Toyota"
                    required
                  />
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g., Camry Hybrid"
                    required
                  />
                </div>


                {/* Next Service Mileage */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Next Service Mileage (km) <span className="text-yellow-400 text-xs">⚠️ Critical for alerts</span>
                  </label>
                  <input
                    type="number"
                    value={formData.nextServiceMileage}
                    onChange={(e) => setFormData({ ...formData, nextServiceMileage: e.target.value })}
                    className="w-full bg-slate-800 border border-yellow-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition"
                    placeholder="e.g., 60000"
                  />
                  <p className="mt-1 text-xs text-yellow-400">⚠️ Required for service due alerts - Add now or later</p>
                </div>

                {/* Card Disc Licence Expiry */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Disc Licence Expiry <span className="text-yellow-400 text-xs">⚠️ Critical for alerts</span>
                  </label>
                  <input
                    type="date"
                    value={formData.licenseExpiryDate}
                    onChange={(e) => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
                    className="w-full bg-slate-800 border border-yellow-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500 transition"
                  />
                  <p className="mt-1 text-xs text-yellow-400">⚠️ Required for license renewal alerts - Add now or later</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
                >
                  {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesPage;
