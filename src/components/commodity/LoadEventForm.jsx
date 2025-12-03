import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import { getCompanyVehicles } from '../../services/vehicleService';
import { createLoadEvent, updateLoadEvent } from '../../services/loadEventService';
import { validateTankReadings } from '../../services/loadEventService';
import { getDriverProfiles, createDriverProfile } from '../../services/driverProfileService';
import { createTripExpense } from '../../services/tripExpenseService';
import { getExpectedTankReading, validateTankReadingBeforeLoad } from '../../services/fuelAccountabilityService';
import { getLastRecordedMileage, getIncompleteReturnTrip, validateMileageReading } from '../../services/vehicleMileageService';
import VehicleForm from '../vehicles/VehicleForm';
import Modal from '../common/Modal';
import InlineExpenseSection from './InlineExpenseSection';
import ReturnTripForm from './ReturnTripForm';
import { AlertTriangle, Truck, MapPin, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const LoadEventForm = ({ onSuccess, onCancel, initialData = null, loadEvent = null }) => {
  const isEditMode = !!loadEvent;
  const navigate = useNavigate();
  const { user, company, userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [newDriverData, setNewDriverData] = useState({ fullName: '', phoneNumber: '', email: '' });
  const [formData, setFormData] = useState({
    vehicleId: loadEvent?.vehicleId || initialData?.vehicleId || '',
    driverId: loadEvent?.driverId || initialData?.driverId || user?.uid || '',
    commodityType: loadEvent?.commodityType || initialData?.commodityType || 'diesel',
    loadDate: loadEvent?.loadDate ? new Date(loadEvent.loadDate.seconds ? loadEvent.loadDate.toDate() : loadEvent.loadDate).toISOString().slice(0, 16) : (initialData?.loadDate || new Date().toISOString().slice(0, 16)),
    supplier: loadEvent?.supplier || initialData?.supplier || '',
    tankReadingBefore: loadEvent?.tankReadingBefore?.toString() || initialData?.tankReadingBefore || '',
    loadQuantity: loadEvent?.loadQuantity?.toString() || initialData?.loadQuantity || '',
    tankReadingAfter: loadEvent?.tankReadingAfter?.toString() || initialData?.tankReadingAfter || '',
    startingMileage: loadEvent?.startingMileage?.toString() || initialData?.startingMileage || '',
    mileageAtLoad: loadEvent?.mileageAtLoad?.toString() || initialData?.mileageAtLoad || '',
    docketNumber: loadEvent?.docketNumber || initialData?.docketNumber || '',
    temperature: loadEvent?.temperature?.toString() || initialData?.temperature || '',
    notes: loadEvent?.notes || initialData?.notes || '',
    expenses: [{ expenseType: 'fuel', amount: '', description: '' }], // Trip expenses
  });
  const [errors, setErrors] = useState({});
  const [tankValidation, setTankValidation] = useState(null);
  const [expectedTankStatus, setExpectedTankStatus] = useState(null);
  const [tankDiscrepancy, setTankDiscrepancy] = useState(null);
  const [showDiscrepancyFields, setShowDiscrepancyFields] = useState(false);
  const [lastMileage, setLastMileage] = useState(null);
  const [incompleteReturnTrip, setIncompleteReturnTrip] = useState(null);
  const [incompleteOffload, setIncompleteOffload] = useState(null);
  const [showIncompleteReturnWarning, setShowIncompleteReturnWarning] = useState(false);
  const [showReturnTripModal, setShowReturnTripModal] = useState(false);
  const [discrepancyData, setDiscrepancyData] = useState({
    reason: '',
    notes: ''
  });

  // Load commodity vehicles and drivers
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load ALL commodity vehicles first
        const allVehicles = await getCompanyVehicles(company.id);
        const commodityVehicles = allVehicles.filter(v => 
          ['fuelTruck', 'lpGasTruck'].includes(v.vehicleType)
        );
        setVehicles(commodityVehicles);

        // Load drivers
        const driverList = await getDriverProfiles(company.id);
        setDrivers(driverList);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load data', { id: 'load-data-error' });
      }
    };

    if (company?.id) {
      loadData();
    }
  }, [company]);

  // Filter vehicles based on selected commodity type
  const getFilteredVehicles = () => {
    if (!formData.commodityType) return vehicles;
    
    // Diesel can ONLY be loaded by fuelTruck
    if (formData.commodityType === 'diesel') {
      return vehicles.filter(v => v.vehicleType === 'fuelTruck');
    }
    
    // LP Gas can ONLY be loaded by lpGasTruck
    if (formData.commodityType === 'lpGas') {
      return vehicles.filter(v => v.vehicleType === 'lpGasTruck');
    }
    
    return vehicles;
  };

  const filteredVehicles = getFilteredVehicles();

  // Get expected tank reading and check for incomplete return trips when vehicle is selected
  useEffect(() => {
    const fetchVehicleData = async () => {
      if (formData.vehicleId && company?.id && !isEditMode) {
        // Get expected tank reading
        const expected = await getExpectedTankReading(formData.vehicleId, company.id);
        setExpectedTankStatus(expected);
        
        // Get last recorded mileage
        const lastMileageData = await getLastRecordedMileage(formData.vehicleId, company.id);
        setLastMileage(lastMileageData);
        
        // Auto-populate starting mileage if available
        if (lastMileageData && lastMileageData.mileage) {
          setFormData(prev => ({
            ...prev,
            startingMileage: lastMileageData.mileage.toString()
          }));
        }
        
        // Check for incomplete return trips
        const incomplete = await getIncompleteReturnTrip(formData.vehicleId, company.id);
        setIncompleteReturnTrip(incomplete);
        
        if (incomplete) {
          setShowIncompleteReturnWarning(true);
          
          // Fetch the last offload for this incomplete load event
          const offloadEventsRef = collection(db, 'offloadEvents');
          const offloadQuery = query(
            offloadEventsRef,
            where('loadEventId', '==', incomplete.id),
            orderBy('offloadDate', 'desc'),
            limit(1)
          );
          const offloadSnapshot = await getDocs(offloadQuery);
          
          if (!offloadSnapshot.empty) {
            const offloadDoc = offloadSnapshot.docs[0];
            setIncompleteOffload({
              id: offloadDoc.id,
              ...offloadDoc.data(),
              offloadDate: offloadDoc.data().offloadDate?.toDate()
            });
          }
        }
        
        // Auto-populate tank reading before if we have history
        if (expected.hasHistory && !formData.tankReadingBefore) {
          setFormData(prev => ({
            ...prev,
            tankReadingBefore: expected.expectedReading.toString()
          }));
          // Silently auto-populate - no toast notification
        }
      }
    };
    
    fetchVehicleData();
  }, [formData.vehicleId, company, isEditMode]);

  // Auto-populate driver when vehicle is selected (based on last load event)
  useEffect(() => {
    const fetchLastDriver = async () => {
      if (formData.vehicleId && company?.id && !isEditMode && !initialData?.driverId) {
        try {
          // Get last load event for this vehicle to find last driver
          const loadEventsRef = collection(db, 'loadEvents');
          const lastLoadQuery = query(
            loadEventsRef,
            where('companyId', '==', company.id),
            where('vehicleId', '==', formData.vehicleId),
            orderBy('loadDate', 'desc'),
            limit(1)
          );
          const lastLoadSnap = await getDocs(lastLoadQuery);
          
          if (!lastLoadSnap.empty) {
            const lastLoad = lastLoadSnap.docs[0].data();
            const lastDriverId = lastLoad.driverId;
            
            if (lastDriverId && lastDriverId !== formData.driverId) {
              setFormData(prev => ({
                ...prev,
                driverId: lastDriverId
              }));
              
              // Silently auto-populate driver - no toast notification
            }
          }
        } catch (error) {
          console.error('Error fetching last driver:', error);
        }
      }
    };
    
    fetchLastDriver();
  }, [formData.vehicleId, company, isEditMode, initialData, drivers]);

  // Validate tank reading before when user enters it
  useEffect(() => {
    const validateTankReading = async () => {
      if (formData.vehicleId && formData.tankReadingBefore && company?.id && !isEditMode) {
        const tankBefore = parseFloat(formData.tankReadingBefore);
        if (!isNaN(tankBefore) && tankBefore >= 0) {
          const validation = await validateTankReadingBeforeLoad(
            formData.vehicleId,
            company.id,
            tankBefore
          );
          setTankDiscrepancy(validation);
          
          // Show discrepancy fields if validation requires notes
          if (validation.requiresNotes) {
            setShowDiscrepancyFields(true);
          } else {
            setShowDiscrepancyFields(false);
            setDiscrepancyData({ reason: '', notes: '' });
          }
        }
      }
    };
    
    validateTankReading();
  }, [formData.vehicleId, formData.tankReadingBefore, company, isEditMode]);

  // Auto-calculate tank reading after (always auto-calculate)
  useEffect(() => {
    const before = parseFloat(formData.tankReadingBefore);
    const quantity = parseFloat(formData.loadQuantity);
    
    if (!isNaN(before) && !isNaN(quantity) && before >= 0 && quantity > 0) {
      const expectedAfter = (before + quantity).toFixed(2);
      
      // Only update if different to avoid infinite loop
      if (formData.tankReadingAfter !== expectedAfter) {
        setFormData(prev => ({
          ...prev,
          tankReadingAfter: expectedAfter
        }));
      }
      setTankValidation(null);
    } else if (!formData.tankReadingBefore && !formData.loadQuantity) {
      // Clear after reading if inputs are empty
      if (formData.tankReadingAfter) {
        setFormData(prev => ({ ...prev, tankReadingAfter: '' }));
      }
      setTankValidation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.tankReadingBefore, formData.loadQuantity]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle "Add New Vehicle" option
    if (name === 'vehicleId' && value === 'add-new') {
      setShowVehicleModal(true);
      return;
    }
    
    // Handle "Add New Driver" option
    if (name === 'driverId' && value === 'add-new') {
      setShowDriverModal(true);
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleVehicleAdded = async (vehicleData) => {
    // Actually create the vehicle in Firebase
    try {
      const { createVehicle } = await import('../../services/vehicleService');
      const vehicleId = await createVehicle(user.uid, company.id, vehicleData);
      
      console.log('✅ Vehicle created with ID:', vehicleId);
      console.log('📦 Vehicle data:', vehicleData);
      
      // Reload vehicles to include the new one
      const allVehicles = await getCompanyVehicles(company.id);
      console.log('📋 All vehicles after creation:', allVehicles.length);
      
      const commodityVehicles = allVehicles.filter(v => 
        ['fuelTruck', 'lpGasTruck'].includes(v.vehicleType)
      );
      console.log('🚛 Commodity vehicles filtered:', commodityVehicles.length);
      console.log('🚛 Commodity vehicles:', commodityVehicles.map(v => ({ id: v.id, name: v.name, type: v.vehicleType })));
      
      setVehicles(commodityVehicles);
      
      // Auto-set commodity type based on vehicle type
      const newCommodityType = vehicleData.vehicleType === 'fuelTruck' ? 'diesel' : 'lpGas';
      console.log('⛽ Setting commodity type to:', newCommodityType);
      
      // Auto-select the newly added vehicle
      setFormData(prev => ({ 
        ...prev, 
        vehicleId: vehicleId,
        commodityType: newCommodityType
      }));
      
      console.log('✅ Vehicle auto-selected:', vehicleId);
      
      setShowVehicleModal(false);
      toast.success(`Vehicle added and selected! (${vehicleData.name})`, { id: 'vehicle-added' });
    } catch (error) {
      console.error('❌ Error creating vehicle:', error);
      toast.error(error.message || 'Failed to create vehicle', { id: 'vehicle-error' });
    }
  };

  const handleAddDriver = async () => {
    if (!newDriverData.fullName.trim()) {
      toast.error('Driver name is required', { id: 'driver-name-error' });
      return;
    }

    try {
      // Create driver profile with correct signature
      const driverProfileId = await createDriverProfile(company.id, {
        fullName: newDriverData.fullName,
        email: newDriverData.email || null,
        phone: newDriverData.phoneNumber || null,
        licenseNumber: null,
      });

      // Reload drivers
      const driverList = await getDriverProfiles(company.id);
      setDrivers(driverList);

      // Select the newly added driver
      setFormData(prev => ({ ...prev, driverId: driverProfileId }));

      setShowDriverModal(false);
      setNewDriverData({ fullName: '', phoneNumber: '', email: '' });
      toast.success('Driver added successfully!', { id: 'driver-added' });
    } catch (error) {
      console.error('Error adding driver:', error);
      toast.error(error.message || 'Failed to add driver', { id: 'driver-error' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // CRITICAL: Block if there's an incomplete return trip
    if (incompleteReturnTrip && !isEditMode) {
      newErrors.incompleteReturnTrip = `Cannot start new load! Vehicle has incomplete trip from ${
        incompleteReturnTrip.loadDate ? new Date(incompleteReturnTrip.loadDate).toLocaleDateString() : 'previous load'
      }. Please complete the return trip first.`;
      toast.error('Complete the previous trip before starting a new load', { id: 'incomplete-trip-error' });
    }

    if (!formData.vehicleId) {
      newErrors.vehicleId = 'Please select a vehicle';
    }
    if (!formData.loadDate) {
      newErrors.loadDate = 'Load date is required';
    }
    if (!formData.tankReadingBefore || parseFloat(formData.tankReadingBefore) < 0) {
      newErrors.tankReadingBefore = 'Valid tank reading before is required';
    }
    if (!formData.loadQuantity || parseFloat(formData.loadQuantity) <= 0) {
      newErrors.loadQuantity = 'Load quantity must be greater than 0';
    }
    if (!formData.tankReadingAfter || parseFloat(formData.tankReadingAfter) < 0) {
      newErrors.tankReadingAfter = 'Valid tank reading after is required';
    }

    // CRITICAL: Validate starting mileage - MUST be provided and MUST increase
    if (!formData.startingMileage || parseFloat(formData.startingMileage) <= 0) {
      newErrors.startingMileage = 'Starting mileage is required';
    } else {
      const mileageValidation = validateMileageReading(
        parseFloat(formData.startingMileage),
        lastMileage?.mileage
      );
      if (!mileageValidation.valid) {
        newErrors.startingMileage = mileageValidation.message;
      }
    }

    // Validate mileage at load - MUST be >= starting mileage
    if (!formData.mileageAtLoad || parseFloat(formData.mileageAtLoad) <= 0) {
      newErrors.mileageAtLoad = 'Odometer at supplier is required';
    } else if (formData.startingMileage && parseFloat(formData.mileageAtLoad) < parseFloat(formData.startingMileage)) {
      newErrors.mileageAtLoad = `Odometer at supplier (${formData.mileageAtLoad}) cannot be less than starting odometer (${formData.startingMileage})`;
    }

    // Validate tank discrepancy notes if required
    if (tankDiscrepancy && tankDiscrepancy.requiresNotes) {
      if (!discrepancyData.reason) {
        newErrors.discrepancyReason = 'Please select a reason for the discrepancy';
      }
      if (!discrepancyData.notes.trim()) {
        newErrors.discrepancyNotes = 'Please explain the discrepancy';
      }
    }

    // Tank reading validation
    if (formData.tankReadingBefore && formData.loadQuantity && formData.tankReadingAfter) {
      const validation = validateTankReadings(
        parseFloat(formData.tankReadingBefore),
        parseFloat(formData.loadQuantity),
        parseFloat(formData.tankReadingAfter)
      );
      
      if (!validation.valid) {
        newErrors.tankReadingAfter = validation.message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting', { id: 'validation-error' });
      return;
    }

    setLoading(true);

    try {
      // Separate expenses from load event data
      const { expenses, ...loadEventDataWithoutExpenses } = formData;
      
      const loadEventData = {
        ...loadEventDataWithoutExpenses,
        tankReadingBefore: parseFloat(formData.tankReadingBefore),
        loadQuantity: parseFloat(formData.loadQuantity),
        tankReadingAfter: parseFloat(formData.tankReadingAfter),
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
        unit: formData.commodityType === 'lpGas' ? 'kgs' : 'litres',
        // Include discrepancy data if present
        tankDiscrepancy: tankDiscrepancy && tankDiscrepancy.hasDiscrepancy ? {
          severity: tankDiscrepancy.severity,
          expectedReading: tankDiscrepancy.expectedReading,
          actualReading: tankDiscrepancy.actualReading,
          difference: tankDiscrepancy.difference,
          reason: discrepancyData.reason,
          notes: discrepancyData.notes,
          lastOffloadDate: tankDiscrepancy.lastOffloadDate,
          lastCustomer: tankDiscrepancy.lastCustomer
        } : null,
      };

      let createdLoadEventId;
      let expensesAdded = 0;
      
      if (isEditMode) {
        // Update existing load event
        await updateLoadEvent(loadEvent.id, loadEventData);
        createdLoadEventId = loadEvent.id;
      } else {
        // Create new load event
        createdLoadEventId = await createLoadEvent(user.uid, company.id, loadEventData);
      }
      
      // Create trip expenses (only valid ones with amounts)
      const validExpenses = expenses.filter(exp => exp.amount && parseFloat(exp.amount) > 0);
      if (validExpenses.length > 0) {
        try {
          const expensePromises = validExpenses.map(expense => 
            createTripExpense(user.uid, company.id, {
              loadEventId: createdLoadEventId,
              vehicleId: formData.vehicleId,
              expenseType: expense.expenseType,
              amount: parseFloat(expense.amount),
              description: expense.description || '',
              date: formData.loadDate
            })
          );
          await Promise.all(expensePromises);
          expensesAdded = validExpenses.length;
        } catch (expenseError) {
          console.error('Error creating expenses:', expenseError);
          toast.error('Load event saved but failed to add some expenses', { id: 'expense-error' });
        }
      }
      
      // Single combined success message
      const actionWord = isEditMode ? 'updated' : 'created';
      const expenseText = expensesAdded > 0 ? ` with ${expensesAdded} expense(s)` : '';
      toast.success(`Load event ${actionWord} successfully${expenseText}!`, { id: 'load-event-success' });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} load event:`, error);
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} load event`, { id: 'load-event-error' });
    } finally {
      setLoading(false);
    }
  };

  const unit = formData.commodityType === 'lpGas' ? 'kg' : 'L';

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-2">
      {/* CRITICAL WARNING: Incomplete Return Trip */}
      {incompleteReturnTrip && showIncompleteReturnWarning && !isEditMode && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-400 dark:border-amber-600 rounded-xl p-5 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800/50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-amber-800 dark:text-amber-200 text-lg mb-3">
                ⚠️ Complete Previous Trip First
              </h4>
              
              {/* Trip Info Card */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4 border border-amber-200 dark:border-amber-700">
                <div className="flex items-center gap-3 mb-3">
                  <Truck className="w-5 h-5 text-baltic-500" />
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {vehicles.find(v => v.id === incompleteReturnTrip.vehicleId)?.name || 'Vehicle'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      Started: <strong className="text-gray-900 dark:text-white">{new Date(incompleteReturnTrip.loadDate).toLocaleDateString()}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {incompleteReturnTrip.offloadCount || 1} delivery(s) made
                    </span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                The truck hasn't returned to depot yet. Record the return trip to close this cycle and start a new load.
              </p>
              
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (incompleteOffload) {
                      setShowReturnTripModal(true);
                    } else {
                      toast.error('Unable to find offload data. Please try from Trip Log.');
                      navigate('/commodity/logbook');
                    }
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-baltic-500 to-baltic-600 text-white rounded-lg hover:from-baltic-600 hover:to-baltic-700 transition-all font-semibold text-sm shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  Capture Return Trip
                </button>
                <button
                  type="button"
                  onClick={() => setShowIncompleteReturnWarning(false)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {errors.incompleteReturnTrip && (
        <div className="bg-danger/10 border border-danger rounded-lg p-3">
          <p className="text-sm text-danger font-semibold">{errors.incompleteReturnTrip}</p>
        </div>
      )}
      
      {/* Vehicle & Driver Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Vehicle Selection */}
        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Vehicle *
          </label>
          <select
            name="vehicleId"
            value={formData.vehicleId}
            onChange={handleChange}
            className={`w-full px-3 py-1.5 rounded-lg border ${
              errors.vehicleId
                ? 'border-danger bg-danger/10'
                : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
            focus:ring-2 focus:ring-baltic-500 focus:border-transparent
            transition-colors`}
            disabled={loading}
          >
            <option value="">
              {formData.commodityType 
                ? `Select ${formData.commodityType === 'diesel' ? 'Fuel' : 'LP Gas'} Truck`
                : 'Select commodity type first'}
            </option>
            {filteredVehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.registrationNumber} - {vehicle.name}
              </option>
            ))}
            {filteredVehicles.length === 0 && formData.commodityType && (
              <option disabled>
                No {formData.commodityType === 'diesel' ? 'fuel' : 'LP gas'} trucks available
              </option>
            )}
            <option value="add-new" className="font-semibold text-baltic-600 dark:text-baltic-400">
              + Add New Vehicle
            </option>
          </select>
          {errors.vehicleId && (
            <p className="mt-1 text-sm text-danger">{errors.vehicleId}</p>
          )}
          {formData.commodityType && (
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              💡 {formData.commodityType === 'diesel' 
                ? `Showing Fuel Trucks only (${filteredVehicles.length} available). LP Gas trucks hidden.`
                : `Showing LP Gas Trucks only (${filteredVehicles.length} available). Diesel trucks hidden.`}
            </p>
          )}
        </div>

        {/* Driver Selection */}
        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Driver *
          </label>
          <select
            name="driverId"
            value={formData.driverId}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                     focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                     transition-colors"
            disabled={loading}
          >
            <option value="">Select a driver</option>
            {drivers.map(driver => (
              <option key={driver.id} value={driver.userId || driver.id}>
                {driver.fullName || driver.name}
              </option>
            ))}
            <option value="add-new" className="font-semibold text-baltic-600 dark:text-baltic-400">
              + Add New Driver
            </option>
          </select>
          {formData.vehicleId && formData.driverId && !formData.driverId.includes('add') && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              💡 Auto-selected based on last use
            </p>
          )}
        </div>
      </div>

      {/* Commodity Type & Load Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Commodity Type *
          </label>
          <select
            name="commodityType"
            value={formData.commodityType}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                     focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                     transition-colors"
            disabled={loading}
          >
            <option value="diesel">Diesel</option>
            <option value="lpGas">LP Gas</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Load Date & Time *
          </label>
          <input
            type="datetime-local"
            name="loadDate"
            value={formData.loadDate}
            onChange={handleChange}
            max={new Date().toISOString().slice(0, 16)}
            className={`w-full px-4 py-2 rounded-lg border ${
              errors.loadDate
                ? 'border-danger bg-danger/10'
                : 'border-gray-300 dark:border-gray-600'
            } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
            focus:ring-2 focus:ring-baltic-500 focus:border-transparent
            transition-colors`}
            disabled={loading || isEditMode}
          />
          {errors.loadDate && (
            <p className="mt-1 text-sm text-danger">{errors.loadDate}</p>
          )}
        </div>
      </div>

      {/* Supplier */}
      <div>
        <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
          Supplier
        </label>
        <input
          type="text"
          name="supplier"
          value={formData.supplier}
          onChange={handleChange}
          placeholder="e.g., Shell Depot, Engen Terminal"
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                   placeholder-gray-400 dark:placeholder-gray-500
                   focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                   transition-colors"
          disabled={loading}
        />
      </div>

      {/* Odometer/Mileage Section - Two Column Layout */}
      <div className="bg-baltic-50 dark:bg-gray-700/50 p-3 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Starting Odometer */}
          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-2">
              🚗 Starting Odometer (km) *
            </label>
            <input
              type="number"
              name="startingMileage"
              value={formData.startingMileage}
              onChange={handleChange}
              step="0.1"
              min="0"
              placeholder="e.g., 45230.5"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.startingMileage
                  ? 'border-danger bg-danger/10'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              transition-colors`}
              disabled={loading}
            />
            {errors.startingMileage && (
              <p className="mt-1 text-sm text-danger">{errors.startingMileage}</p>
            )}
            {lastMileage && lastMileage.mileage ? (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                💡 Last: {lastMileage.mileage.toLocaleString()} km
                {lastMileage.source === 'return' ? ' (return trip)' : ' (prev load)'}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                💡 Odometer when leaving depot
              </p>
            )}
          </div>

          {/* Odometer at Supplier */}
          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-2">
              ⛽ Odometer at Supplier (km) *
            </label>
            <input
              type="number"
              name="mileageAtLoad"
              value={formData.mileageAtLoad}
              onChange={handleChange}
              step="0.1"
              min={formData.startingMileage || 0}
              placeholder="e.g., 45280.5"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.mileageAtLoad
                  ? 'border-danger bg-danger/10'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              transition-colors`}
              disabled={loading}
            />
            {errors.mileageAtLoad && (
              <p className="mt-1 text-sm text-danger">{errors.mileageAtLoad}</p>
            )}
            {formData.startingMileage && formData.mileageAtLoad && parseFloat(formData.mileageAtLoad) >= parseFloat(formData.startingMileage) ? (
              <p className="mt-1 text-xs text-success font-medium">
                📍 Distance: {(parseFloat(formData.mileageAtLoad) - parseFloat(formData.startingMileage)).toFixed(1)} km
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                💡 Odometer when arriving at supplier
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Expected Tank Status Alert */}
      {expectedTankStatus && expectedTankStatus.hasHistory && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="text-2xl">📊</div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Expected Fuel in Tank
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                {expectedTankStatus.message}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Last Delivery</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {expectedTankStatus.lastOffloadDate?.toLocaleDateString('en-ZA')}
                  </p>
                </div>
                <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Customer</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {expectedTankStatus.lastCustomer || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tank Discrepancy Alert */}
      {tankDiscrepancy && tankDiscrepancy.hasDiscrepancy && (
        <div className={`border-2 rounded-lg p-3 ${
          tankDiscrepancy.severity === 'very_minor'
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : tankDiscrepancy.severity === 'minor'
            ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-800'
        }`}>
          <div className="flex items-start gap-2">
            <div className="text-2xl">
              {tankDiscrepancy.severity === 'very_minor' ? 'ℹ️' : tankDiscrepancy.severity === 'minor' ? '⚠️' : '🚨'}
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold mb-1 ${
                tankDiscrepancy.severity === 'very_minor'
                  ? 'text-blue-900 dark:text-blue-100'
                  : tankDiscrepancy.severity === 'minor'
                  ? 'text-yellow-900 dark:text-yellow-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {tankDiscrepancy.severity === 'very_minor' ? 'Minor Difference Detected' : 
                 tankDiscrepancy.severity === 'minor' ? 'Discrepancy Detected' : 
                 'CRITICAL DISCREPANCY'}
              </h4>
              <p className={`text-sm mb-2 ${
                tankDiscrepancy.severity === 'very_minor'
                  ? 'text-blue-800 dark:text-blue-200'
                  : tankDiscrepancy.severity === 'minor'
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : 'text-red-800 dark:text-red-200'
              }`}>
                {tankDiscrepancy.message}
              </p>
              {tankDiscrepancy.explanation && (
                <p className={`text-xs mb-2 ${
                  tankDiscrepancy.severity === 'very_minor'
                    ? 'text-blue-700 dark:text-blue-300'
                    : tankDiscrepancy.severity === 'minor'
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {tankDiscrepancy.explanation}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-2">
                <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Expected</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {tankDiscrepancy.expectedReading.toLocaleString()} {tankDiscrepancy.unit}
                  </p>
                </div>
                <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Actual</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {tankDiscrepancy.actualReading.toLocaleString()} {tankDiscrepancy.unit}
                  </p>
                </div>
                <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded">
                  <p className="text-gray-600 dark:text-gray-400">Difference</p>
                  <p className={`font-semibold ${
                    tankDiscrepancy.difference > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tankDiscrepancy.difference > 0 ? '+' : ''}{tankDiscrepancy.difference.toFixed(2)} {tankDiscrepancy.unit}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tank Readings */}
      <div className="bg-baltic-50 dark:bg-gray-700/50 p-2 rounded-lg space-y-2">
        <h3 className="text-sm font-semibold text-baltic-900 dark:text-gray-100">
          Tank Readings ({unit})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              Before Loading *
            </label>
            <input
              type="number"
              name="tankReadingBefore"
              value={formData.tankReadingBefore}
              onChange={handleChange}
              step="0.01"
              min="0"
              max="100000"
              placeholder="e.g., 5000.00"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.tankReadingBefore
                  ? 'border-danger bg-danger/10'
                  : tankDiscrepancy && tankDiscrepancy.severity === 'major'
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              transition-colors`}
              disabled={loading}
            />
            {errors.tankReadingBefore && (
              <p className="mt-1 text-sm text-danger">{errors.tankReadingBefore}</p>
            )}
            {expectedTankStatus && expectedTankStatus.hasHistory && (
              <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                💡 Expected: {expectedTankStatus.expectedReading.toLocaleString()} {unit}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              Load Quantity *
            </label>
            <input
              type="number"
              name="loadQuantity"
              value={formData.loadQuantity}
              onChange={handleChange}
              step="0.01"
              min="0.01"
              max="100000"
              placeholder="e.g., 30000.00"
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.loadQuantity
                  ? 'border-danger bg-danger/10'
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              focus:ring-2 focus:ring-baltic-500 focus:border-transparent
              transition-colors`}
              disabled={loading}
            />
            {errors.loadQuantity && (
              <p className="mt-1 text-sm text-danger">{errors.loadQuantity}</p>
            )}
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Amount loaded at depot ({unit})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
              After Loading
            </label>
            <input
              type="text"
              name="tankReadingAfter"
              value={formData.tankReadingAfter}
              readOnly
              placeholder=""
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-gray-100 dark:bg-gray-700 text-baltic-900 dark:text-gray-100
                       cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Discrepancy Details (if required) */}
      {showDiscrepancyFields && tankDiscrepancy && tankDiscrepancy.requiresNotes && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-800 rounded-lg p-3 space-y-2">
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            🔍 Discrepancy Explanation Required
          </h4>
          
          <div>
            <label className="block text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              Reason for Discrepancy *
            </label>
            <select
              value={discrepancyData.reason}
              onChange={(e) => setDiscrepancyData(prev => ({ ...prev, reason: e.target.value }))}
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.discrepancyReason
                  ? 'border-danger bg-danger/10'
                  : 'border-yellow-300 dark:border-yellow-700'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              focus:ring-2 focus:ring-yellow-500 focus:border-transparent
              transition-colors`}
              disabled={loading}
            >
              <option value="">Select reason...</option>
              <option value="fuelUsedBeforeLoad">Fuel Used Before Load (Trip to Depot)</option>
              <option value="evaporation">Evaporation/Natural Loss</option>
              <option value="leak">Tank Leak Detected</option>
              <option value="theft">Suspected Theft/Pilferage</option>
              <option value="meterError">Meter Reading Error</option>
              <option value="dataEntryError">Previous Data Entry Error</option>
              <option value="fuelAddedElsewhere">Fuel Added Elsewhere (Not Recorded)</option>
              <option value="other">Other (Explain in Notes)</option>
            </select>
            {errors.discrepancyReason && (
              <p className="mt-1 text-sm text-danger">{errors.discrepancyReason}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
              Explanation *
            </label>
            <textarea
              value={discrepancyData.notes}
              onChange={(e) => setDiscrepancyData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Provide detailed explanation for the discrepancy..."
              className={`w-full px-4 py-2 rounded-lg border ${
                errors.discrepancyNotes
                  ? 'border-danger bg-danger/10'
                  : 'border-yellow-300 dark:border-yellow-700'
              } bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:ring-2 focus:ring-yellow-500 focus:border-transparent
              transition-colors resize-none`}
              disabled={loading}
            />
            {errors.discrepancyNotes && (
              <p className="mt-1 text-sm text-danger">{errors.discrepancyNotes}</p>
            )}
          </div>
        </div>
      )}

      {/* Additional Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Docket Number
          </label>
          <input
            type="text"
            name="docketNumber"
            value={formData.docketNumber}
            onChange={handleChange}
            placeholder="Optional"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                     transition-colors"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
            Temperature (°C)
          </label>
          <input
            type="number"
            name="temperature"
            value={formData.temperature}
            onChange={handleChange}
            step="0.1"
            placeholder="Optional"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                     placeholder-gray-400 dark:placeholder-gray-500
                     focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                     transition-colors"
            disabled={loading}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-baltic-900 dark:text-gray-100 mb-1">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
          placeholder="Any additional notes..."
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                   bg-white dark:bg-gray-800 text-baltic-900 dark:text-gray-100
                   placeholder-gray-400 dark:placeholder-gray-500
                   focus:ring-2 focus:ring-baltic-500 focus:border-transparent
                   transition-colors resize-none"
          disabled={loading}
        />
      </div>

      {/* Trip Expenses */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <InlineExpenseSection
          expenses={formData.expenses}
          onChange={(expenses) => setFormData(prev => ({ ...prev, expenses }))}
          disabled={loading}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:flex-1 px-6 py-3 bg-baltic-500 hover:bg-baltic-600 
                   text-white font-medium rounded-lg
                   transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed
                   focus:ring-2 focus:ring-baltic-500 focus:ring-offset-2"
        >
          {loading ? 'Creating...' : 'Create Load Event'}
        </button>
        
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-3 bg-gray-200 dark:bg-gray-700 
                   hover:bg-gray-300 dark:hover:bg-gray-600
                   text-baltic-900 dark:text-gray-100 font-medium rounded-lg
                   transition-colors duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
      </form>

      {/* Add New Vehicle Modal - Outside form to avoid nesting */}
      {showVehicleModal && (
        <Modal
          isOpen={showVehicleModal}
          onClose={() => setShowVehicleModal(false)}
          title={`Add New ${formData.commodityType === 'lpGas' ? 'LP Gas' : 'Fuel'} Truck`}
        >
          <VehicleForm
            defaultVehicleType={formData.commodityType === 'lpGas' ? 'lpGasTruck' : 'fuelTruck'}
            onSubmit={handleVehicleAdded}
            onCancel={() => setShowVehicleModal(false)}
          />
        </Modal>
      )}

      {/* Add New Driver Modal - Outside form to avoid nesting */}
      {showDriverModal && (
        <Modal
          isOpen={showDriverModal}
          onClose={() => setShowDriverModal(false)}
          title="Add New Driver"
        >
          <div className="space-y-4">
            {/* Info Banner */}
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                💡 <strong>Quick Add:</strong> Create a driver profile for load tracking. You can invite them to the platform later.
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Driver Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newDriverData.fullName}
                onChange={(e) => setNewDriverData(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="Enter driver's full name"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300
                         bg-white text-gray-900
                         placeholder-gray-400
                         focus:ring-2 focus:ring-baltic-500 focus:border-baltic-500
                         transition-all"
                required
              />
              <p className="mt-1 text-xs text-gray-600">This field is required</p>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Phone Number <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="tel"
                value={newDriverData.phoneNumber}
                onChange={(e) => setNewDriverData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="e.g., +27 12 345 6789"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300
                         bg-white text-gray-900
                         placeholder-gray-400
                         focus:ring-2 focus:ring-baltic-500 focus:border-baltic-500
                         transition-all"
              />
              <p className="mt-1 text-xs text-gray-600">For contact and notifications</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                Email Address <span className="text-gray-500">(Optional)</span>
              </label>
              <input
                type="email"
                value={newDriverData.email}
                onChange={(e) => setNewDriverData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="e.g., driver@example.com"
                className="w-full px-4 py-3 rounded-lg border-2 border-gray-300
                         bg-white text-gray-900
                         placeholder-gray-400
                         focus:ring-2 focus:ring-baltic-500 focus:border-baltic-500
                         transition-all"
              />
              <p className="mt-1 text-xs text-gray-600">For platform invitation later</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleAddDriver}
                disabled={!newDriverData.fullName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-baltic-500 to-baltic-600 
                         hover:from-baltic-600 hover:to-baltic-700
                         text-white font-semibold rounded-lg transition-all
                         shadow-lg hover:shadow-xl transform hover:scale-[1.02]
                         disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                         focus:ring-2 focus:ring-baltic-500 focus:ring-offset-2"
              >
                ✓ Add Driver
              </button>
              <button
                onClick={() => {
                  setShowDriverModal(false);
                  setNewDriverData({ fullName: '', phoneNumber: '', email: '' });
                }}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300
                         text-gray-900 font-semibold rounded-lg 
                         transition-all border-2 border-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Return Trip Modal */}
      {showReturnTripModal && incompleteOffload && incompleteReturnTrip && (
        <Modal
          isOpen={showReturnTripModal}
          onClose={() => setShowReturnTripModal(false)}
          title="🚛 Capture Return Trip"
          size="lg"
        >
          <div className="p-2">
            {/* Trip Context Info */}
            <div className="bg-baltic-50 dark:bg-slate-800 rounded-lg p-4 mb-4 border border-baltic-200 dark:border-slate-600">
              <div className="flex items-center gap-3 mb-2">
                <Truck className="w-5 h-5 text-baltic-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {vehicles.find(v => v.id === incompleteReturnTrip.vehicleId)?.name || 'Vehicle'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Trip started on {new Date(incompleteReturnTrip.loadDate).toLocaleDateString()} • 
                Last delivery on {incompleteOffload.offloadDate ? new Date(incompleteOffload.offloadDate).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            
            <ReturnTripForm
              offloadEvent={incompleteOffload}
              loadEvent={incompleteReturnTrip}
              onSuccess={async () => {
                setShowReturnTripModal(false);
                setShowIncompleteReturnWarning(false);
                setIncompleteReturnTrip(null);
                setIncompleteOffload(null);
                toast.success('Return trip recorded! You can now start a new load.');
              }}
              onCancel={() => setShowReturnTripModal(false)}
            />
          </div>
        </Modal>
      )}
    </>
  );
};

LoadEventForm.propTypes = {
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
  initialData: PropTypes.object,
};

export default LoadEventForm;
