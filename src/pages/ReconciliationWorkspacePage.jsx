import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSearchParams } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, doc, getDoc, updateDoc, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Search, Filter, ChevronDown, ChevronRight, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import ReconciliationBadge from '../components/commodity/ReconciliationBadge';
import toast from 'react-hot-toast';

const ReconciliationWorkspacePage = () => {
  usePageTitle('Reconciliation Workspace');
  const { user, company } = useAuth();
  const [searchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [vehicles, setVehicles] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, minor_variance, major_variance, resolved
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [investigationNotes, setInvestigationNotes] = useState({});
  const [resolutionData, setResolutionData] = useState({}); // {eventId: {resolution: '', rootCause: ''}}

  useEffect(() => {
    if (company?.id) {
      fetchReconciliationData();
    }
  }, [company, filterStatus]);

  // Auto-expand investigation panel if offloadId is in URL
  useEffect(() => {
    const offloadId = searchParams.get('offloadId');
    const shouldInvestigate = searchParams.get('investigate') === 'true';
    
    if (offloadId && shouldInvestigate && events.length > 0) {
      // Auto-expand the row for this offload
      setExpandedRows(new Set([offloadId]));
      
      // Scroll to the row after a short delay
      setTimeout(() => {
        const element = document.getElementById(`offload-${offloadId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [searchParams, events]);

  const fetchReconciliationData = async () => {
    try {
      setLoading(true);
      
      // Fetch offload events with variances
      let q = query(
        collection(db, 'offloadEvents'),
        where('companyId', '==', company.id),
        orderBy('offloadDate', 'desc')
      );

      const snapshot = await getDocs(q);
      
      const allEvents = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        let vehicleId = data.vehicleId;
        
        // If vehicleId is missing, try to get it from the load event
        if (!vehicleId && data.loadEventId) {
          try {
            const loadDoc = await getDoc(doc(db, 'loadEvents', data.loadEventId));
            if (loadDoc.exists()) {
              vehicleId = loadDoc.data().vehicleId;
            }
          } catch (error) {
            console.error('Error fetching load event for vehicle:', error);
          }
        }
        
        return {
          id: docSnap.id,
          ...data,
          vehicleId,
          offloadDate: data.offloadDate?.toDate(),
          createdAt: data.createdAt?.toDate()
        };
      }));

      // Filter by reconciliation status
      let filtered = allEvents;
      if (filterStatus === 'resolved') {
        // Show only resolved items
        filtered = allEvents.filter(event => event.resolvedAt);
      } else if (filterStatus !== 'all') {
        // Show specific status (unresolved only)
        filtered = allEvents.filter(event => event.reconciliationStatus === filterStatus && !event.resolvedAt);
      } else {
        // For "all", show only unresolved items that need attention
        filtered = allEvents.filter(event => 
          !event.resolvedAt && (
            event.reconciliationStatus !== 'matched' || 
            (event.variance && Math.abs(event.variance) > 0)
          )
        );
      }

      setEvents(filtered);

      // Fetch vehicle data
      const vehicleIds = [...new Set(filtered.map(e => e.vehicleId).filter(Boolean))];
      const vehicleData = {};
      for (const vId of vehicleIds) {
        try {
          const vDoc = await getDoc(doc(db, 'vehicles', vId));
          if (vDoc.exists()) {
            vehicleData[vId] = { id: vId, ...vDoc.data() };
          }
        } catch (error) {
          console.error(`Error fetching vehicle ${vId}:`, error);
        }
      }
      setVehicles(vehicleData);

    } catch (error) {
      console.error('Error fetching reconciliation data:', error);
      toast.error('Failed to load reconciliation data');
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (eventId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedRows(newExpanded);
  };

  const handleInvestigationUpdate = async (eventId) => {
    try {
      const notes = investigationNotes[eventId];
      if (!notes?.trim()) {
        toast.error('Please provide investigation notes');
        return;
      }

      await updateDoc(doc(db, 'offloadEvents', eventId), {
        investigatedBy: user.uid,
        investigationNotes: notes,
        investigationDate: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast.success('Investigation notes saved');
      fetchReconciliationData();
    } catch (error) {
      console.error('Error updating investigation:', error);
      toast.error('Failed to save investigation notes');
    }
  };

  const handleResolve = async (eventId) => {
    try {
      const data = resolutionData[eventId] || {};
      // Resolution details are now optional, just mark as resolved

      await updateDoc(doc(db, 'offloadEvents', eventId), {
        resolution: data.resolution,
        rootCause: data.rootCause || '',
        resolvedBy: user.uid,
        resolvedAt: Timestamp.now(),
        reconciliationStatus: 'matched', // Mark as resolved
        tankDiscrepancyAcknowledged: true, // Also mark tank discrepancy as acknowledged
        tankDiscrepancyAcknowledgedBy: user.uid,
        tankDiscrepancyAcknowledgedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      // Also acknowledge/delete any tank discrepancy alerts for this offload
      try {
        const alertQuery = query(
          collection(db, 'tankDiscrepancyAlerts'),
          where('offloadEventId', '==', eventId)
        );
        const alertSnapshot = await getDocs(alertQuery);
        
        // Update all related alerts to acknowledged
        const updatePromises = alertSnapshot.docs.map(alertDoc => 
          updateDoc(doc(db, 'tankDiscrepancyAlerts', alertDoc.id), {
            acknowledged: true,
            acknowledgedBy: user.uid,
            acknowledgedAt: Timestamp.now(),
            acknowledgeNotes: data.resolution || 'Resolved via reconciliation workspace',
            updatedAt: Timestamp.now()
          })
        );
        await Promise.all(updatePromises);
      } catch (alertError) {
        console.error('Error updating tank discrepancy alerts:', alertError);
        // Don't fail the resolution if alert update fails
      }

      toast.success('Variance resolved successfully');
      // Clear resolution form data
      setResolutionData(prev => {
        const newData = { ...prev };
        delete newData[eventId];
        return newData;
      });
      // Auto-close the expanded row
      setExpandedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(eventId);
        return newSet;
      });
      fetchReconciliationData();
    } catch (error) {
      console.error('Error resolving variance:', error);
      toast.error('Failed to resolve variance');
    }
  };

  const filteredEvents = events.filter(event => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      event.customer?.toLowerCase().includes(search) ||
      event.docketNumber?.toLowerCase().includes(search) ||
      vehicles[event.vehicleId]?.registrationNumber?.toLowerCase().includes(search) ||
      vehicles[event.vehicleId]?.name?.toLowerCase().includes(search) ||
      event.driverName?.toLowerCase().includes(search)
    );
  });

  const getStatusCounts = () => {
    return {
      all: events.filter(e => !e.resolvedAt).length, // Only unresolved
      very_minor: events.filter(e => e.reconciliationStatus === 'very_minor' && !e.resolvedAt).length,
      minor_variance: events.filter(e => e.reconciliationStatus === 'minor_variance' && !e.resolvedAt).length,
      major_variance: events.filter(e => e.reconciliationStatus === 'major_variance' && !e.resolvedAt).length,
      pending: events.filter(e => e.reconciliationStatus === 'pending' && !e.resolvedAt).length,
      resolved: events.filter(e => e.resolvedAt).length
    };
  };

  const counts = getStatusCounts();

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6">
      {/* Header - Compact on mobile */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Reconciliation</h1>
        <p className="text-xs sm:text-base text-gray-600 dark:text-gray-300 hidden sm:block">Review and resolve delivery variances</p>
      </div>

      {/* Status Filter Tabs - Compact on mobile */}
      <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-2 sm:px-4 py-1 sm:py-2 rounded font-medium text-[10px] sm:text-sm whitespace-nowrap transition-colors ${
            filterStatus === 'all'
              ? 'bg-baltic-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All ({counts.all})
        </button>
        <button
          onClick={() => setFilterStatus('very_minor')}
          className={`px-2 sm:px-4 py-1 sm:py-2 rounded font-medium text-[10px] sm:text-sm whitespace-nowrap transition-colors ${
            filterStatus === 'very_minor'
              ? 'bg-info text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="hidden sm:inline">Very Minor ≤3L</span>
          <span className="sm:hidden">≤3L</span> ({counts.very_minor})
        </button>
        <button
          onClick={() => setFilterStatus('minor_variance')}
          className={`px-2 sm:px-4 py-1 sm:py-2 rounded font-medium text-[10px] sm:text-sm whitespace-nowrap transition-colors ${
            filterStatus === 'minor_variance'
              ? 'bg-warning text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="hidden sm:inline">Minor &lt;50L</span>
          <span className="sm:hidden">&lt;50L</span> ({counts.minor_variance})
        </button>
        <button
          onClick={() => setFilterStatus('major_variance')}
          className={`px-2 sm:px-4 py-1 sm:py-2 rounded font-medium text-[10px] sm:text-sm whitespace-nowrap transition-colors ${
            filterStatus === 'major_variance'
              ? 'bg-danger text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="hidden sm:inline">Major ≥50L</span>
          <span className="sm:hidden">≥50L</span> ({counts.major_variance})
        </button>
        <button
          onClick={() => setFilterStatus('resolved')}
          className={`px-2 sm:px-4 py-1 sm:py-2 rounded font-medium text-[10px] sm:text-sm whitespace-nowrap transition-colors ${
            filterStatus === 'resolved'
              ? 'bg-success text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ✓ ({counts.resolved})
        </button>
      </div>

      {/* Search - Compact on mobile */}
      <div>
        <div className="relative">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-baltic-500 focus:border-transparent text-xs sm:text-base"
          />
        </div>
      </div>

      {/* Events Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-baltic-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading variances...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Variances Found</h3>
          <p className="text-gray-600">
            {filterStatus === 'all' 
              ? 'All deliveries are perfectly reconciled!' 
              : `No ${filterStatus.replace('_', ' ')} variances to review.`}
          </p>
        </div>
      ) : (
        <>
        {/* Mobile Card View - Compact */}
        <div className="lg:hidden space-y-2">
          {filteredEvents.map((event) => {
            const isExpanded = expandedRows.has(event.id);
            const vehicle = vehicles[event.vehicleId];
            
            return (
              <div key={event.id} id={`offload-${event.id}`} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Compact Card Header */}
                <div className="p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 truncate">{event.customer || 'Unknown'}</p>
                      <p className="text-[10px] text-gray-500">
                        {event.offloadDate?.toLocaleDateString('en-ZA')} • {vehicle?.name || vehicle?.registrationNumber || 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-900">{event.offloadQuantity?.toLocaleString()}L</p>
                        <p className={`text-[10px] font-bold ${
                          Math.abs(event.variance || 0) > 50 ? 'text-danger' :
                          Math.abs(event.variance || 0) > 3 ? 'text-warning' :
                          'text-success'
                        }`}>
                          {event.variance > 0 ? '+' : ''}{event.variance}L
                        </p>
                      </div>
                      <ReconciliationBadge status={event.reconciliationStatus} size="sm" />
                    </div>
                  </div>
                </div>
                
                {/* Expand Button */}
                <button
                  onClick={() => toggleRow(event.id)}
                  className="w-full px-2 py-1.5 text-[10px] font-medium text-baltic-600 bg-gray-50 hover:bg-baltic-50 flex items-center justify-center gap-1 border-t border-gray-100"
                >
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {isExpanded ? 'Hide' : 'Investigate'}
                </button>
                
                {/* Expanded Investigation - Compact */}
                {isExpanded && (
                  <div className="p-2 bg-gray-50 border-t border-gray-200 space-y-2">
                    {/* Variance Details - Inline */}
                    <div className="bg-white rounded p-2 border border-gray-200">
                      <p className="text-[10px] font-bold text-gray-700 mb-1">📊 Details</p>
                      <div className="grid grid-cols-4 gap-1 text-[10px]">
                        <div>
                          <span className="text-gray-400">Before</span>
                          <p className="font-semibold">{event.tankReadingBefore}L</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Offload</span>
                          <p className="font-semibold">{event.offloadQuantity}L</p>
                        </div>
                        <div>
                          <span className="text-gray-400">After</span>
                          <p className="font-semibold">{event.tankReadingAfter}L</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Expected</span>
                          <p className="font-semibold">{event.tankReadingBefore - event.offloadQuantity}L</p>
                        </div>
                      </div>
                      {event.discrepancyNotes && (
                        <p className="mt-1 text-[10px] text-gray-600 bg-gray-50 p-1 rounded">
                          <strong>Notes:</strong> {event.discrepancyNotes}
                        </p>
                      )}
                    </div>
                    
                    {/* Investigation Notes - Compact */}
                    {event.investigationNotes ? (
                      <div className="p-2 bg-blue-50 rounded border border-blue-200 text-[10px]">
                        <p className="font-semibold text-blue-900">
                          ✓ Investigated {event.investigationDate?.toDate?.()?.toLocaleDateString('en-ZA')}
                        </p>
                        <p className="text-blue-800">{event.investigationNotes}</p>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <input
                          type="text"
                          placeholder="Investigation notes..."
                          value={investigationNotes[event.id] || ''}
                          onChange={(e) => setInvestigationNotes(prev => ({
                            ...prev,
                            [event.id]: e.target.value
                          }))}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-[10px]"
                        />
                        <button
                          onClick={() => handleInvestigationUpdate(event.id)}
                          className="px-2 py-1.5 bg-baltic-500 hover:bg-baltic-600 text-white rounded text-[10px] font-medium"
                        >
                          Save
                        </button>
                      </div>
                    )}
                    
                    {/* Resolution - Compact */}
                    {event.resolution ? (
                      <div className="p-2 bg-success/10 rounded border border-success/30 text-[10px]">
                        <p className="font-bold text-success flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Resolved {event.resolvedAt?.toDate?.()?.toLocaleDateString('en-ZA')}
                        </p>
                        {event.rootCause && <p className="text-gray-700"><strong>Cause:</strong> {event.rootCause}</p>}
                        <p className="text-gray-700"><strong>Resolution:</strong> {event.resolution}</p>
                      </div>
                    ) : event.investigationNotes && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Root cause..."
                            value={resolutionData[event.id]?.rootCause || ''}
                            onChange={(e) => setResolutionData(prev => ({
                              ...prev,
                              [event.id]: { ...prev[event.id], rootCause: e.target.value }
                            }))}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-[10px]"
                          />
                          <input
                            type="text"
                            placeholder="Resolution..."
                            value={resolutionData[event.id]?.resolution || ''}
                            onChange={(e) => setResolutionData(prev => ({
                              ...prev,
                              [event.id]: { ...prev[event.id], resolution: e.target.value }
                            }))}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-[10px]"
                          />
                        </div>
                        <button
                          onClick={() => handleResolve(event.id)}
                          className="w-full px-2 py-1.5 bg-success hover:bg-success/90 text-white rounded text-[10px] font-medium flex items-center justify-center gap-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Offloaded</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Variance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvents.map((event) => {
                const isExpanded = expandedRows.has(event.id);
                const vehicle = vehicles[event.vehicleId];

                return (
                  <React.Fragment key={event.id}>
                    <tr id={`offload-${event.id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {event.offloadDate?.toLocaleDateString('en-ZA')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-900">
                          {vehicle ? (
                            vehicle.name && vehicle.registrationNumber 
                              ? `${vehicle.name} ${vehicle.registrationNumber}`
                              : vehicle.registrationNumber || vehicle.name || 'N/A'
                          ) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {event.driverName || 'Driver'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{event.customer || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {event.offloadQuantity?.toLocaleString()} L
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className={`font-bold ${
                          Math.abs(event.variance || 0) > 50 ? 'text-danger' :
                          Math.abs(event.variance || 0) > 3 ? 'text-warning' :
                          Math.abs(event.variance || 0) > 0 ? 'text-info' :
                          'text-success'
                        }`}>
                          {event.variance > 0 ? '+' : ''}{event.variance} L
                        </div>
                        <div className="text-xs text-gray-500">
                          {event.variancePercentage > 0 ? '+' : ''}{event.variancePercentage?.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <ReconciliationBadge status={event.reconciliationStatus} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRow(event.id)}
                          className="text-baltic-600 hover:text-baltic-700 font-medium text-sm flex items-center gap-1"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          {isExpanded ? 'Collapse' : 'Investigate'}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Investigation Row */}
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan="7" className="px-4 py-4">
                          <div className="ml-8 space-y-4">
                            {/* Variance Details */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-bold text-gray-900 mb-3">📊 Variance Details</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600 font-medium">Tank Before</p>
                                  <p className="text-gray-900 font-semibold">{event.tankReadingBefore} L</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Offloaded</p>
                                  <p className="text-gray-900 font-semibold">{event.offloadQuantity} L</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Tank After</p>
                                  <p className="text-gray-900 font-semibold">{event.tankReadingAfter} L</p>
                                </div>
                                <div>
                                  <p className="text-gray-600 font-medium">Expected After</p>
                                  <p className="text-gray-900 font-semibold">
                                    {event.tankReadingBefore - event.offloadQuantity} L
                                  </p>
                                </div>
                              </div>
                              
                              {event.discrepancyNotes && (
                                <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Driver Notes:</p>
                                  <p className="text-xs text-gray-600">{event.discrepancyNotes}</p>
                                </div>
                              )}
                            </div>

                            {/* Investigation Section */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-bold text-gray-900 mb-3">🔍 Investigation</h4>
                              
                              {event.investigationNotes ? (
                                <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-200">
                                  <p className="text-xs font-semibold text-blue-900 mb-1">
                                    Investigated on {event.investigationDate?.toDate?.()?.toLocaleDateString('en-ZA')}
                                  </p>
                                  <p className="text-sm text-blue-800">{event.investigationNotes}</p>
                                </div>
                              ) : (
                                <div>
                                  <textarea
                                    placeholder="Enter investigation findings..."
                                    value={investigationNotes[event.id] || ''}
                                    onChange={(e) => setInvestigationNotes(prev => ({
                                      ...prev,
                                      [event.id]: e.target.value
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-baltic-500 focus:border-transparent text-sm"
                                    rows="3"
                                  />
                                  <button
                                    onClick={() => handleInvestigationUpdate(event.id)}
                                    className="mt-2 px-4 py-2 bg-baltic-500 hover:bg-baltic-600 text-white rounded-lg text-sm font-medium transition-colors"
                                  >
                                    Save Investigation Notes
                                  </button>
                                </div>
                              )}

                              {/* Resolution Section */}
                              {event.resolution ? (
                                <div className="mt-3 p-3 bg-success/10 rounded-lg border-2 border-success/30">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-5 h-5 text-success" />
                                    <p className="text-sm font-bold text-success">
                                      Resolved on {event.resolvedAt?.toDate?.()?.toLocaleDateString('en-ZA')}
                                    </p>
                                  </div>
                                  {event.rootCause && (
                                    <div className="mb-2">
                                      <p className="text-xs font-semibold text-gray-700">Root Cause:</p>
                                      <p className="text-sm text-gray-800">{event.rootCause}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs font-semibold text-gray-700">Resolution:</p>
                                    <p className="text-sm text-gray-800">{event.resolution}</p>
                                  </div>
                                </div>
                              ) : event.investigationNotes && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                  <h5 className="text-sm font-bold text-gray-900 mb-3">✓ Mark as Resolved</h5>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Root Cause (Optional)
                                      </label>
                                      <input
                                        type="text"
                                        placeholder="e.g., Driver error, Meter calibration issue..."
                                        value={resolutionData[event.id]?.rootCause || ''}
                                        onChange={(e) => setResolutionData(prev => ({
                                          ...prev,
                                          [event.id]: { ...prev[event.id], rootCause: e.target.value }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-success focus:border-transparent text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Resolution Details (Optional)
                                      </label>
                                      <textarea
                                        placeholder="Describe how the issue was resolved..."
                                        value={resolutionData[event.id]?.resolution || ''}
                                        onChange={(e) => setResolutionData(prev => ({
                                          ...prev,
                                          [event.id]: { ...prev[event.id], resolution: e.target.value }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-success focus:border-transparent text-sm"
                                        rows="3"
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleResolve(event.id)}
                                      className="w-full px-4 py-2 bg-success hover:bg-success/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                      Mark as Resolved
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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

export default ReconciliationWorkspacePage;
