import { X, AlertTriangle, Calendar, MapPin, Gauge, CheckCircle, Eye, ArrowLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { acknowledgeMileageGap } from '../../services/mileageGapDetectionService';
import toast from 'react-hot-toast';

const MileageGapsModal = ({ isOpen, onClose, gaps, vehicles, user, onGapAcknowledged }) => {
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedGap, setSelectedGap] = useState(null);
  const [vehicleTrips, setVehicleTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [acknowledgingGap, setAcknowledgingGap] = useState(null);

  // Reset view when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setSelectedGap(null);
      setVehicleTrips([]);
      setSelectedSeverity('all');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter gaps by severity
  const filteredGaps = selectedSeverity === 'all' 
    ? gaps 
    : gaps.filter(gap => gap.severity === selectedSeverity);

  // Sort by severity and unaccounted km
  const sortedGaps = [...filteredGaps].sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    return b.unaccountedKm - a.unaccountedKm;
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'low': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const loadVehicleTrips = async (gap) => {
    setLoadingTrips(true);
    setSelectedGap(gap);
    
    try {
      const tripsQuery = query(
        collection(db, 'dailyEntries'),
        where('vehicleId', '==', gap.vehicleId),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(tripsQuery);
      const trips = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
      }));
      
      setVehicleTrips(trips);
    } catch (error) {
      console.error('Error loading vehicle trips:', error);
      // Try without orderBy if index missing
      try {
        const tripsQuery = query(
          collection(db, 'dailyEntries'),
          where('vehicleId', '==', gap.vehicleId)
        );
        
        const snapshot = await getDocs(tripsQuery);
        const trips = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
        }));
        
        // Sort manually
        trips.sort((a, b) => b.date - a.date);
        setVehicleTrips(trips);
      } catch (err) {
        console.error('Failed to load trips:', err);
      }
    } finally {
      setLoadingTrips(false);
    }
  };

  const backToList = () => {
    setSelectedGap(null);
    setVehicleTrips([]);
  };

  const handleAcknowledgeGap = async (gap) => {
    if (!user) return;
    
    setAcknowledgingGap(gap.id);
    const toastId = toast.loading('Noting gap...');
    
    try {
      await acknowledgeMileageGap(gap.id, user.uid, 'Gap noted by manager');
      toast.success('Gap noted successfully', { id: toastId });
      
      // Refresh gaps list
      if (onGapAcknowledged) {
        await onGapAcknowledged();
      }
      
      // Close modal after successful acknowledgment
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Error acknowledging gap:', error);
      toast.error('Failed to note gap', { id: toastId });
    } finally {
      setAcknowledgingGap(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4 py-8">
        <div className="relative w-full max-w-4xl my-auto flex flex-col rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-700 bg-slate-900/80 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedGap && (
                <button
                  onClick={backToList}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white mr-1"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="rounded-lg bg-yellow-500/20 p-1.5">
                {selectedGap ? <Gauge className="h-5 w-5 text-blue-400" /> : <AlertTriangle className="h-5 w-5 text-yellow-400" />}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {selectedGap ? `${selectedGap.vehicleName} - All Trips` : `Unaccounted Mileage - ${sortedGaps.length} Gaps`}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Severity Filter - Only show in gaps list view */}
          {!selectedGap && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setSelectedSeverity('all')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedSeverity === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              All ({gaps.length})
            </button>
            <button
              onClick={() => setSelectedSeverity('high')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedSeverity === 'high'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              High ({gaps.filter(g => g.severity === 'high').length})
            </button>
            <button
              onClick={() => setSelectedSeverity('medium')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedSeverity === 'medium'
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Medium ({gaps.filter(g => g.severity === 'medium').length})
            </button>
            <button
              onClick={() => setSelectedSeverity('low')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedSeverity === 'low'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Low ({gaps.filter(g => g.severity === 'low').length})
            </button>
          </div>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto flex-1 p-4">
          {loadingTrips ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-slate-400">Loading trips...</div>
            </div>
          ) : selectedGap ? (
            /* Trip Details View */
            <div className="space-y-2">
              {vehicleTrips.map((trip, index) => {
                const isGapTrip = trip.id === selectedGap.previousEntryId || trip.id === selectedGap.currentEntryId;
                const isCurrentGapTrip = trip.id === selectedGap.currentEntryId;
                
                // Find previous trip to calculate gap
                const previousTrip = index < vehicleTrips.length - 1 ? vehicleTrips[index + 1] : null;
                const prevClosing = previousTrip?.endMileage;
                const unaccountedKm = prevClosing ? (trip.startMileage || 0) - prevClosing : 0;
                
                return (
                  <div
                    key={trip.id}
                    className={`rounded-lg border overflow-hidden ${
                      isGapTrip ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-slate-700 bg-slate-800/50'
                    }`}
                  >
                    <div className="px-3 py-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300">{formatDate(trip.date)}</span>
                        {isGapTrip && (
                          <span className="text-xs bg-yellow-500 text-slate-900 px-2 py-0.5 rounded-full font-bold">
                            GAP TRIP
                          </span>
                        )}
                      </div>
                      
                      {/* Show previous closing and gap if exists */}
                      {prevClosing && unaccountedKm > 0 && (
                        <div className="mb-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="text-slate-400">Prev Closing:</span>
                              <span className="text-white font-semibold ml-1">{prevClosing.toLocaleString()} km</span>
                            </div>
                            <div>
                              <span className="text-yellow-300 font-bold">⚠️ {unaccountedKm.toLocaleString()} km Gap</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500">Start:</span>
                          <span className="text-white font-semibold ml-1">{trip.startMileage?.toLocaleString()} km</span>
                        </div>
                        <div>
                          <span className="text-slate-500">End:</span>
                          <span className="text-white font-semibold ml-1">{trip.endMileage?.toLocaleString()} km</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Driven:</span>
                          <span className="text-blue-300 font-semibold ml-1">
                            {((trip.endMileage || 0) - (trip.startMileage || 0)).toLocaleString()} km
                          </span>
                        </div>
                        {trip.totalCashIn > 0 && (
                          <div>
                            <span className="text-slate-500">Cash In:</span>
                            <span className="text-emerald-300 font-semibold ml-1">${trip.totalCashIn}</span>
                          </div>
                        )}
                      </div>
                      {trip.startLocation && trip.endLocation && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="h-3 w-3" />
                          <span>{trip.startLocation} → {trip.endLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Gaps List View */
            <div className="space-y-3">
              {sortedGaps.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-slate-400 text-sm">No gaps found for the selected severity.</p>
                </div>
              ) : (
                sortedGaps.map((gap) => (
                <div
                  key={gap.id}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 overflow-hidden"
                >
                  {/* Compact Trip View - Like Recent Captures */}
                  <div className="px-3 py-2 bg-slate-900/50 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-blue-400" />
                      <span className="font-bold text-white text-sm">{gap.vehicleName}</span>
                      <span className="text-xs text-slate-400">{gap.vehicleRegistration}</span>
                    </div>
                    <div className={`rounded-full border px-2 py-0.5 text-xs font-bold uppercase ${getSeverityColor(gap.severity)}`}>
                      {gap.severity}
                    </div>
                  </div>

                  {/* Gap Summary */}
                  <div className="px-3 py-2 bg-yellow-500/5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-yellow-300 font-semibold">
                        ⚠️ {gap.unaccountedKm.toLocaleString()} km Gap
                      </div>
                      <div className="text-slate-400 text-xs">
                        {gap.daysBetween} {gap.daysBetween === 1 ? 'day' : 'days'} between trips
                      </div>
                    </div>
                  </div>

                  {/* Trip Details - Compact Table */}
                  <div className="px-3 py-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-700/50">
                          <th className="text-left py-1 font-medium">Date</th>
                          <th className="text-right py-1 font-medium">Start</th>
                          <th className="text-right py-1 font-medium">End</th>
                          <th className="text-right py-1 font-medium">Driven</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-300">
                        {/* Previous Trip */}
                        <tr className="border-b border-slate-700/30">
                          <td className="py-1.5">
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
                              <span>{formatDate(gap.previousDate)}</span>
                            </div>
                          </td>
                          <td className="text-right py-1.5">-</td>
                          <td className="text-right py-1.5 font-semibold text-white">
                            {gap.previousEndMileage.toLocaleString()}
                          </td>
                          <td className="text-right py-1.5">-</td>
                        </tr>
                        
                        {/* Gap Row */}
                        <tr className="bg-yellow-500/10">
                          <td colSpan="4" className="py-1.5 text-center">
                            <span className="text-yellow-400 font-bold text-xs">
                              ⬇️ {gap.unaccountedKm.toLocaleString()} km UNACCOUNTED ⬇️
                            </span>
                          </td>
                        </tr>

                        {/* Current Trip */}
                        <tr>
                          <td className="py-1.5">
                            <div className="flex items-center gap-1">
                              <div className="h-1.5 w-1.5 rounded-full bg-green-400"></div>
                              <span>{formatDate(gap.currentDate)}</span>
                            </div>
                          </td>
                          <td className="text-right py-1.5 font-semibold text-white">
                            {gap.currentStartMileage.toLocaleString()}
                          </td>
                          <td className="text-right py-1.5">-</td>
                          <td className="text-right py-1.5">-</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-3 py-3 bg-slate-900/50 border-t border-slate-700/50 space-y-2">
                    {/* PRIMARY ACTION - Note as Reviewed */}
                    <button
                      onClick={() => handleAcknowledgeGap(gap)}
                      disabled={acknowledgingGap === gap.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-green-500/50 hover:shadow-green-500/70 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {acknowledgingGap === gap.id ? (
                        <span>Noting...</span>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          <span>✓ Mark as Reviewed (Manager)</span>
                        </>
                      )}
                    </button>
                    
                    {/* SECONDARY ACTION - View Trips */}
                    <button
                      onClick={() => loadVehicleTrips(gap)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600/30 border-2 border-blue-500/50 text-blue-200 hover:bg-blue-600/40 hover:border-blue-400 transition-all font-semibold text-xs shadow-md hover:shadow-blue-500/30"
                    >
                      <Eye className="h-4 w-4" />
                      <span>View All Trips for {gap.vehicleName}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 bg-slate-900/80 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              💡 Review these gaps and update trip records or note as personal use
            </p>
            <button
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default MileageGapsModal;
