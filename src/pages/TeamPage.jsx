import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNavigate } from 'react-router-dom';
import SuccessModal from '../components/common/SuccessModal';

/**
 * Team Page - Shows driver activity table for admins and managers
 */
const TeamPage = () => {
  usePageTitle('Team Management / Invitations');
  const { company, userProfile, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [driverStats, setDriverStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInvitationData, setSuccessInvitationData] = useState(null);
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [invitationToDelete, setInvitationToDelete] = useState(null);
  const [driverProfiles, setDriverProfiles] = useState([]);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    location: '',
    role: 'company_user',
    driverProfileId: '', // Link to existing driver profile
  });

  const isSystemAdmin = userProfile?.role === 'system_admin';
  const isCompanyAdmin = userProfile?.role === 'company_admin';
  const isCompanyManager = userProfile?.role === 'company_manager';

  // Helper function to format time ago (like system admin dashboard)
  const getTimeAgo = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    // For older dates, show the actual date
    return date.toLocaleDateString();
  };

  // Only admins and managers can access
  useEffect(() => {
    if (userProfile && !isSystemAdmin && !isCompanyAdmin && !isCompanyManager) {
      navigate('/dashboard');
    }
  }, [userProfile, navigate, isSystemAdmin, isCompanyAdmin, isCompanyManager]);

  useEffect(() => {
    console.log('🔄 TeamPage useEffect triggered');
    console.log('Company:', company);
    console.log('Is System Admin:', isSystemAdmin);
    console.log('User Profile:', userProfile);
    
    if (company || isSystemAdmin) {
      console.log('✅ Starting to load team data...');
      loadData();
    } else {
      console.log('⚠️ No company found, cannot load team data');
    }
  }, [company, isSystemAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCompanyUsers(),
        loadInvitations(),
        loadCompanyVehicles(),
        loadDriverStats(),
        loadDriverProfiles(),
      ]);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDriverProfiles = async () => {
    try {
      if (!company?.id) return;
      const { getDriverProfiles } = await import('../services/driverProfileService');
      const profiles = await getDriverProfiles(company.id);
      setDriverProfiles(profiles.filter(p => !p.isInvited)); // Only uninvited profiles
    } catch (error) {
      console.error('Error loading driver profiles:', error);
    }
  };

  const loadInvitations = async () => {
    try {
      if (!company?.id) {
        console.log('⚠️ No company ID available');
        setInvitations([]);
        return;
      }
      
      console.log('📨 Loading invitations for company:', company.id);
      const { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');

      const companyRef = doc(db, 'companies', company.id);
      const companyDoc = await getDoc(companyRef);

      if (!companyDoc.exists()) {
        console.log('❌ Company document not found');
        setInvitations([]);
        return;
      }

      const companyData = companyDoc.data();
      const pendingInvitations = companyData.pendingInvitations || [];
      
      console.log('📋 Raw pending invitations:', pendingInvitations);
      
      // Check if any "pending" invitations have actually registered
      // Get all users in this company
      const usersRef = collection(db, 'users');
      const usersQuery = query(usersRef, where('companyId', '==', company.id));
      const usersSnapshot = await getDocs(usersQuery);
      const registeredEmails = new Set(
        usersSnapshot.docs.map(doc => doc.data().email?.toLowerCase())
      );
      
      console.log('👥 Registered users in company:', registeredEmails.size);
      
      // Update invitations that have registered users
      let needsUpdate = false;
      const updatedInvitations = pendingInvitations.map(inv => {
        if (inv.status === 'pending' && inv.email && registeredEmails.has(inv.email.toLowerCase())) {
          console.log('🔄 Marking invitation as accepted for registered user:', inv.email);
          needsUpdate = true;
          // Find the user ID
          const userDoc = usersSnapshot.docs.find(doc => 
            doc.data().email?.toLowerCase() === inv.email.toLowerCase()
          );
          return {
            ...inv,
            status: 'accepted',
            userId: userDoc?.id || null,
            acceptedAt: new Date().toISOString(),
          };
        }
        return inv;
      });
      
      // Update Firestore if needed
      if (needsUpdate) {
        console.log('💾 Updating invitation statuses in Firestore...');
        await updateDoc(companyRef, {
          pendingInvitations: updatedInvitations,
          updatedAt: serverTimestamp(),
        });
        console.log('✅ Invitation statuses synced with registered users');
      }
      
      // Filter only pending invitations and validate data
      const invitationsData = updatedInvitations
        .filter(inv => {
          if (!inv) {
            console.warn('⚠️ Null invitation found');
            return false;
          }
          if (inv.status !== 'pending') {
            console.log('⏭️ Skipping non-pending invitation:', inv.email, inv.status);
            return false;
          }
          if (!inv.email || !inv.fullName) {
            console.warn('⚠️ Invalid invitation data:', inv);
            return false;
          }
          return true;
        })
        .map(inv => {
          try {
            return {
              id: inv.id || `inv_${Date.now()}`,
              fullName: inv.fullName || 'Unknown',
              email: inv.email || 'No email',
              phoneNumber: inv.phoneNumber || null,
              role: inv.role || 'company_user',
              status: inv.status,
              createdAt: inv.invitedAt ? { seconds: new Date(inv.invitedAt).getTime() / 1000 } : null,
              isPending: true,
            };
          } catch (err) {
            console.error('Error mapping invitation:', inv, err);
            return null;
          }
        })
        .filter(inv => inv !== null);

      console.log('✅ Loaded invitations:', invitationsData.length);
      console.log('📊 Invitations data:', invitationsData);
      setInvitations(invitationsData);
    } catch (error) {
      console.error('❌ Error loading invitations:', error);
      setInvitations([]);
    }
  };

  const loadCompanyUsers = async () => {
    try {
      console.log('📥 loadCompanyUsers called');
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');

      let q;

      if (isSystemAdmin) {
        console.log('Loading all users (system admin)');
        q = query(collection(db, 'users'));
      } else {
        if (!company) {
          console.log('❌ No company available, cannot load users');
          return;
        }
        console.log('Loading users for company:', company.id, company.name);
        q = query(
          collection(db, 'users'),
          where('companyId', '==', company.id)
        );
      }

      console.log('🔍 Executing Firestore query...');
      const snapshot = await getDocs(q);
      console.log('📊 Query returned', snapshot.docs.length, 'documents');
      
      const usersData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('User document:', doc.id, data);
        return {
          id: doc.id,
          ...data,
          lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : data.lastLoginAt || null,
        };
      });

      console.log('✅ Loaded users from company:', usersData.length);
      console.log('Users data:', usersData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadCompanyVehicles = async () => {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      const { getActiveAssignments } = await import('../services/vehicleAssignmentService');

      let q;

      if (isSystemAdmin) {
        q = query(collection(db, 'vehicles'));
      } else {
        if (!company) return;
        q = query(
          collection(db, 'vehicles'),
          where('companyId', '==', company.id)
        );
      }

      console.log('🔍 Executing Firestore query...');
      const snapshot = await getDocs(q);
      console.log('📊 Query returned', snapshot.docs.length, 'documents');
      
      const vehiclesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get active assignments
      if (company?.id) {
        const assignments = await getActiveAssignments(company.id);
        
        // Map assignments to vehicles
        vehiclesData.forEach(vehicle => {
          const assignment = assignments.find(a => a.vehicleId === vehicle.id);
          vehicle.currentAssignment = assignment;
          vehicle.userId = assignment?.driverId || null; // For backward compatibility
        });
      }

      console.log('✅ Loaded vehicles from company:', vehiclesData.length);
      setVehicles(vehiclesData);
    } catch (error) {
      console.error('Error loading vehicles:', error);
    }
  };

  const loadDriverStats = async () => {
    try {
      if (!company && !isSystemAdmin) return;

      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');

      console.log('📊 Loading driver stats for company:', company?.id);

      let q;
      
      if (isSystemAdmin) {
        q = query(collection(db, 'dailyEntries'));
      } else {
        q = query(
          collection(db, 'dailyEntries'),
          where('companyId', '==', company.id)
        );
      }

      const snapshot = await getDocs(q);
      const stats = {};

      console.log('📊 Found', snapshot.size, 'daily entries');

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userId = data.userId;
        const vehicleId = data.vehicleId;
        const distance = data.distanceTraveled || 0;
        
        if (!userId) {
          console.log('⚠️ Entry without userId:', docSnap.id, data);
          return;
        }
        
        if (!stats[userId]) {
          stats[userId] = { 
            totalKm: 0,
            vehiclesUsed: new Set() // Track all vehicles this driver has used
          };
        }
        stats[userId].totalKm += distance;
        
        // Track which vehicles this driver has used
        if (vehicleId) {
          stats[userId].vehiclesUsed.add(vehicleId);
        }
        
        console.log('✅ Added', distance, 'km for user:', userId, 'Vehicle:', vehicleId, 'Total:', stats[userId].totalKm);
      });
      
      // Convert Sets to Arrays for easier use in UI
      Object.keys(stats).forEach(userId => {
        stats[userId].vehiclesUsed = Array.from(stats[userId].vehiclesUsed);
      });

      console.log('📊 Final driver stats:', stats);
      setDriverStats(stats);
    } catch (error) {
      console.error('Error loading driver stats:', error);
    }
  };

  // Show all company users in the table (not just drivers)
  // Also include driver profiles who have trip data but aren't invited yet
  const teamMembers = React.useMemo(() => {
    const members = [...users];
    
    // Add uninvited driver profiles who have trip data
    driverProfiles.forEach(profile => {
      // Check if this profile has any trip data
      if (driverStats[profile.id] && driverStats[profile.id].totalKm > 0) {
        // Add as a pseudo-user with special flag
        members.push({
          id: profile.id,
          fullName: profile.fullName,
          email: profile.email || 'Not provided',
          phoneNumber: profile.phoneNumber,
          role: 'driver_profile', // Special role to identify uninvited drivers
          isDriverProfile: true,
          lastLoginAt: null, // Not invited yet
        });
      }
    });
    
    return members;
  }, [users, driverProfiles, driverStats]);

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      // Prevent users from changing their own role
      if (userId === user?.uid) {
        alert('You cannot change your own role. Another manager must change it for you.');
        return;
      }

      const targetUser = users.find(u => u.id === userId);
      
      // Prevent changing manager role - only manager can exist (company owner)
      if (targetUser && targetUser.role === 'company_manager') {
        alert('Cannot change the Company Manager role. The manager is the company owner.');
        return;
      }

      // Only company managers can promote/demote between driver and admin
      if (!isCompanyManager) {
        alert('Only the Company Manager can change user roles.');
        return;
      }

      // Validate role change
      if (newRole !== 'company_user' && newRole !== 'company_admin') {
        alert('Invalid role. Can only assign Driver or Admin roles.');
        return;
      }

      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      
      await loadData();
      alert('User role updated successfully!');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const handleResetPassword = async (userId, email) => {
    if (!window.confirm(`Send password reset email to ${email}?`)) {
      return;
    }
    
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('../services/firebase');
      
      await sendPasswordResetEmail(auth, email);
      alert(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Error sending password reset:', error);
      alert('Failed to send password reset email');
    }
  };

  const handleAssignVehicle = async (userId, vehicleId) => {
    try {
      const { assignVehicleToDriver, unassignVehicleFromDriver } = await import('../services/vehicleAssignmentService');
      
      // If vehicleId is empty, unassign the vehicle
      if (!vehicleId) {
        await unassignVehicleFromDriver(userId);
        await loadData();
        alert('Vehicle unassigned successfully!');
        return;
      }
      
      // Assign vehicle to driver (creates history entry)
      await assignVehicleToDriver(company.id, vehicleId, userId, user.uid);
      
      await loadData();
      alert('Vehicle assigned successfully! Assignment history has been recorded.');
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      alert('Failed to assign vehicle: ' + error.message);
    }
  };

  const handleDeleteInvitation = (invitationId, invitationEmail, invitationName) => {
    setInvitationToDelete({ id: invitationId, email: invitationEmail, name: invitationName });
    setShowDeleteModal(true);
  };

  const confirmDeleteInvitation = async () => {
    if (!invitationToDelete) return;

    try {
      console.log('🗑️ Deleting invitation:', invitationToDelete.id, invitationToDelete.email);
      const { doc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');

      const companyRef = doc(db, 'companies', company.id);
      const companyDoc = await getDoc(companyRef);

      if (!companyDoc.exists()) {
        alert('Company not found. Please refresh and try again.');
        setShowDeleteModal(false);
        setInvitationToDelete(null);
        return;
      }

      const pendingInvitations = companyDoc.data().pendingInvitations || [];
      
      // Filter out the invitation to delete
      const updatedInvitations = pendingInvitations.filter(inv => inv.id !== invitationToDelete.id);

      console.log('📝 Updating invitations:', {
        before: pendingInvitations.length,
        after: updatedInvitations.length
      });

      await updateDoc(companyRef, {
        pendingInvitations: updatedInvitations,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Invitation deleted successfully');
      
      // Close modal and reset
      setShowDeleteModal(false);
      setInvitationToDelete(null);
      
      // Reload invitations
      await loadInvitations();
      
      // Show success toast
      const toast = await import('react-hot-toast');
      toast.default.success('Invitation deleted successfully!');
    } catch (error) {
      console.error('❌ Error deleting invitation:', error);
      const toast = await import('react-hot-toast');
      toast.default.error('Failed to delete invitation: ' + error.message);
      setShowDeleteModal(false);
      setInvitationToDelete(null);
    }
  };

  const handleInviteDriver = async (e) => {
    e.preventDefault();
    try {
      const { doc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      
      const companyRef = doc(db, 'companies', company.id);
      const companyDoc = await getDoc(companyRef);
      
      if (!companyDoc.exists()) {
        alert('Company not found. Please try again.');
        return;
      }
      
      const existingInvitations = companyDoc.data().pendingInvitations || [];
      
      const alreadyInvited = existingInvitations.some(inv => 
        inv.email === inviteForm.email && inv.status === 'pending'
      );
      
      if (alreadyInvited) {
        alert('This email has already been invited. Please use a different email.');
        return;
      }
      
      const invitationToken = btoa(JSON.stringify({
        companyId: company.id,
        companyName: company.name,
        email: inviteForm.email.toLowerCase(),
        fullName: inviteForm.fullName,
        phoneNumber: inviteForm.phoneNumber || null,
        location: inviteForm.location || null,
        role: inviteForm.role,
        driverProfileId: inviteForm.driverProfileId || null, // Link to driver profile
        timestamp: Date.now()
      }));
      
      const newInvitation = {
        id: Date.now().toString(),
        token: invitationToken,
        email: inviteForm.email.toLowerCase(),
        fullName: inviteForm.fullName,
        phoneNumber: inviteForm.phoneNumber || null,
        location: inviteForm.location || null,
        role: inviteForm.role,
        status: 'pending',
        invitedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      
      existingInvitations.push(newInvitation);
      
      await updateDoc(companyRef, {
        pendingInvitations: existingInvitations,
        updatedAt: serverTimestamp(),
      });
      
      const registrationLink = `${window.location.origin}/?invite=${encodeURIComponent(invitationToken)}`;
      
      setSuccessInvitationData({
        email: inviteForm.email,
        fullName: inviteForm.fullName,
        role: inviteForm.role === 'company_user' ? 'Driver' : 
              inviteForm.role === 'company_admin' ? 'Admin' : 'Manager',
        companyName: company.name,
        registrationLink: registrationLink,
        invitationToken: invitationToken,
      });
      
      setShowInviteModal(false);
      setShowSuccessModal(true);
      setInviteForm({ email: '', fullName: '', phoneNumber: '', location: '', role: 'company_user' });
      await loadData();
    } catch (error) {
      console.error('Error inviting driver:', error);
      alert('Failed to create invitation: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Page Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white mb-1">Team Management / Invitations</h1>
          <p className="text-sm text-slate-400">Manage team members, invite drivers, and monitor activity</p>
        </div>

        {/* Driver Activity Table */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {showPendingInvites ? 'Pending Invitations' : 'Driver Activity'}
            </h2>
            <div className="flex items-center gap-2">
              {/* Pending Invites Button */}
              <button
                onClick={() => setShowPendingInvites(!showPendingInvites)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                  showPendingInvites 
                    ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                    : 'bg-orange-600 hover:bg-orange-700 text-white shadow-lg'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {showPendingInvites ? 'Back to Team' : `Pending Invites ${invitations.length > 0 ? `(${invitations.length})` : ''}`}
              </button>
              
              {/* Invite Team Member Button */}
              {!showPendingInvites && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {isCompanyManager || isCompanyAdmin ? 'Invite Team Member' : 'Invite Driver'}
                </button>
              )}
            </div>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : showPendingInvites ? (
            <>
              {/* Pending Invitations View */}
              {invitations.length === 0 ? (
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-4 text-slate-400">No pending invitations</p>
                  <p className="text-xs text-slate-500 mt-1">All invited members have registered</p>
                </div>
              ) : (
                <>
                  {/* Mobile View - Pending Invitations */}
                  <div className="lg:hidden space-y-3">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-white font-semibold">{invitation.fullName}</h3>
                            <p className="text-xs text-slate-400">{invitation.email}</p>
                          </div>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                            📧 Pending
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm mb-3">
                          <div>
                            <span className="text-slate-500">Role:</span>
                            <p className="text-slate-200">{invitation.role === 'company_admin' ? 'Admin' : 'Driver'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Phone:</span>
                            <p className="text-slate-200">{invitation.phoneNumber || 'Not provided'}</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Invited:</span>
                            <p className="text-slate-200">{invitation.createdAt ? new Date(invitation.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}</p>
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteInvitation(invitation.id, invitation.email, invitation.fullName)}
                          className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Invitation
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View - Pending Invitations */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Phone</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Invited</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {invitations.map((invitation) => (
                          <tr key={invitation.id} className="hover:bg-slate-700/30 transition">
                            <td className="px-4 py-3 text-sm text-white">{invitation.fullName}</td>
                            <td className="px-4 py-3 text-sm text-slate-300">{invitation.email}</td>
                            <td className="px-4 py-3 text-sm text-slate-300">{invitation.phoneNumber || 'Not provided'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                invitation.role === 'company_admin' 
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}>
                                {invitation.role === 'company_admin' ? 'Admin' : 'Driver'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-300">
                              {invitation.createdAt ? new Date(invitation.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                📧 Awaiting Registration
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleDeleteInvitation(invitation.id, invitation.email, invitation.fullName)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition flex items-center gap-1"
                                title="Delete Invitation"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {teamMembers.length === 0 ? (
                  <div className="bg-slate-900 rounded-lg border border-slate-700 p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="mt-4 text-slate-400">No drivers yet</p>
                    <p className="text-xs text-slate-500 mt-1">Invite drivers from Company Settings</p>
                  </div>
                ) : (
                  teamMembers.map((driver) => {
                    const assignedVehicle = vehicles.find((v) => v.userId === driver.id);
                    const stats = driverStats[driver.id] || { totalKm: 0, vehiclesUsed: [] };
                    const vehicleCount = stats.vehiclesUsed?.length || 0;
                    console.log('🔍 Driver:', driver.id, driver.fullName, 'Stats:', stats, 'Vehicle count:', vehicleCount);
                    let lastLogin = driver.lastLoginAt;
                    if (lastLogin && lastLogin.toDate) {
                      lastLogin = lastLogin.toDate();
                    }
                    
                    const lastLoginText = driver.isDriverProfile
                      ? 'Not yet invited'
                      : getTimeAgo(lastLogin);

                    let loginStatus = 'active';
                    if (driver.isDriverProfile) {
                      loginStatus = 'pending'; // Special status for uninvited drivers
                    } else if (lastLogin) {
                      const daysSinceLogin = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
                      if (daysSinceLogin > 30) {
                        loginStatus = 'inactive';
                      } else if (daysSinceLogin > 14) {
                        loginStatus = 'warning';
                      }
                    } else {
                      loginStatus = 'never';
                    }

                    return (
                      <div key={driver.id} className="bg-slate-900 rounded-lg border border-slate-700 p-3">
                        {/* Driver Info */}
                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-700/50">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 shadow-lg">
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-100 text-sm">
                              {driver.fullName || driver.displayName || driver.email}
                            </p>
                            <p className="text-xs text-slate-400">{driver.email}</p>
                          </div>
                        </div>

                        {/* Vehicle Assignment */}
                        <div className="mb-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-500 text-xs">Vehicle{vehicleCount > 1 ? 's' : ''}:</span>
                            {vehicleCount > 1 && (
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                {vehicleCount} vehicles
                              </span>
                            )}
                          </div>
                          {stats.vehiclesUsed && stats.vehiclesUsed.length > 0 ? (
                            vehicleCount === 1 ? (
                              // Single vehicle - just display it
                              (() => {
                                const vehicle = vehicles.find(v => v.id === stats.vehiclesUsed[0]);
                                return vehicle ? (
                                  <div className="flex items-center gap-2 text-xs bg-slate-800 px-3 py-2 rounded border border-slate-600">
                                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-slate-200 font-medium">{vehicle.name} ({vehicle.registrationNumber})</span>
                                  </div>
                                ) : <p className="text-xs text-slate-400">Vehicle not found</p>;
                              })()
                            ) : (
                              // Multiple vehicles - show dropdown to select
                              <div className="space-y-2">
                                {stats.vehiclesUsed.map(vehicleId => {
                                  const vehicle = vehicles.find(v => v.id === vehicleId);
                                  return vehicle ? (
                                    <div key={vehicleId} className="flex items-center gap-2 text-xs bg-slate-800 px-2 py-1.5 rounded border border-slate-600">
                                      <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span className="text-slate-200">{vehicle.name} ({vehicle.registrationNumber})</span>
                                    </div>
                                  ) : null;
                                })}
                                <p className="text-xs text-slate-500 italic">Used multiple vehicles</p>
                              </div>
                            )
                          ) : (
                            <p className="text-xs text-slate-400 mt-1">No trips captured yet</p>
                          )}
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                          <div>
                            <span className="text-slate-500">Total Distance:</span>
                            <p className="text-slate-200 font-semibold">{stats.totalKm.toFixed(2)} km</p>
                          </div>
                          <div>
                            <span className="text-slate-500">Last Login:</span>
                            <div className="flex items-center gap-1 mt-1">
                              <div className={`h-2 w-2 rounded-full ${
                                loginStatus === 'active' ? 'bg-green-500' :
                                loginStatus === 'warning' ? 'bg-orange-500' :
                                loginStatus === 'inactive' ? 'bg-red-500' :
                                loginStatus === 'pending' ? 'bg-yellow-500' :
                                'bg-slate-500'
                              }`} />
                              <span className={`text-xs ${
                                loginStatus === 'active' ? 'text-slate-200' :
                                loginStatus === 'warning' ? 'text-orange-400' :
                                loginStatus === 'inactive' ? 'text-red-400' :
                                loginStatus === 'pending' ? 'text-yellow-400' :
                                'text-slate-500'
                              }`}>
                                {lastLoginText}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Role */}
                        <div className="mb-3">
                          <span className="text-slate-500 text-xs">Role:</span>
                          {driver.isDriverProfile ? (
                            <div className="mt-1">
                              <span className="inline-block px-3 py-1.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                ⏳ Pending Invitation
                              </span>
                              <p className="text-xs text-slate-500 mt-1">Driver has trip data but hasn't been invited yet</p>
                            </div>
                          ) : driver.id === user?.uid ? (
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-3 py-1.5 rounded text-xs font-medium ${
                                driver.role === 'company_admin' 
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                                  : driver.role === 'company_manager'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : 'bg-green-500/20 text-green-300 border border-green-500/30'
                              }`}>
                                🔒 {driver.role === 'company_admin' ? 'Admin' : driver.role === 'company_manager' ? 'Manager' : 'Driver'}
                              </span>
                              <span className="text-xs text-slate-500">(You)</span>
                            </div>
                          ) : (driver.role === 'company_admin' || driver.role === 'company_manager') ? (
                            <span className={`inline-block mt-1 px-3 py-1.5 rounded text-xs font-medium ${
                              driver.role === 'company_admin' 
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}>
                              🔒 {driver.role === 'company_admin' ? 'Admin' : 'Manager'}
                            </span>
                          ) : (
                            <select
                              value={driver.role}
                              onChange={(e) => handleUpdateUserRole(driver.id, e.target.value)}
                              className="w-full mt-1 bg-slate-800 text-white px-3 py-2 rounded border border-slate-600 text-sm focus:border-blue-500 focus:outline-none"
                              disabled={!isCompanyManager}
                            >
                              <option value="company_user">Driver</option>
                              {isCompanyManager && <option value="company_admin">Admin</option>}
                            </select>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-slate-700/50">
                          {driver.isDriverProfile ? (
                            <button
                              onClick={() => setShowInviteModal(true)}
                              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition"
                            >
                              Invite Driver
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResetPassword(driver.id, driver.email)}
                              className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm transition"
                            >
                              Reset Password
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-700 bg-slate-900">
                <table className="min-w-full divide-y divide-slate-700 text-sm">
                <thead className="bg-slate-900/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Vehicles Used
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                      # Vehicles
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Total km travelled
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Last system login
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {teamMembers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-12 text-center">
                        <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="mt-4 text-slate-400">No drivers yet</p>
                        <p className="text-xs text-slate-500 mt-1">Invite drivers from Company Settings</p>
                      </td>
                    </tr>
                  ) : (
                    teamMembers.map((driver) => {
                      const assignedVehicle = vehicles.find((v) => v.userId === driver.id);
                      const stats = driverStats[driver.id] || { totalKm: 0, vehiclesUsed: [] };
                      const vehicleCount = stats.vehiclesUsed?.length || 0;
                      let lastLogin = driver.lastLoginAt;
                      if (lastLogin && lastLogin.toDate) {
                        lastLogin = lastLogin.toDate();
                      }
                      
                      const lastLoginText = driver.isDriverProfile
                        ? 'Not yet invited'
                        : getTimeAgo(lastLogin);

                      // Calculate days since last login for status indicator
                      let loginStatus = 'active'; // green
                      if (driver.isDriverProfile) {
                        loginStatus = 'pending'; // yellow - uninvited driver
                      } else if (lastLogin) {
                        const daysSinceLogin = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysSinceLogin > 30) {
                          loginStatus = 'inactive'; // red
                        } else if (daysSinceLogin > 14) {
                          loginStatus = 'warning'; // orange
                        }
                      } else {
                        loginStatus = 'never'; // gray
                      }

                      return (
                        <tr key={driver.id} className="hover:bg-slate-800/60 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 shadow-lg">
                                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium text-slate-100">
                                  {driver.fullName || driver.displayName || driver.email}
                                </span>
                                <span className="text-xs text-slate-400">{driver.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {stats.vehiclesUsed && stats.vehiclesUsed.length > 0 ? (
                              vehicleCount === 1 ? (
                                // Single vehicle - display prominently
                                (() => {
                                  const vehicle = vehicles.find(v => v.id === stats.vehiclesUsed[0]);
                                  return vehicle ? (
                                    <div className="flex items-center gap-2 text-sm">
                                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="text-slate-200 font-medium">{vehicle.name} ({vehicle.registrationNumber})</span>
                                    </div>
                                  ) : <span className="text-xs text-slate-400">Vehicle not found</span>;
                                })()
                              ) : (
                                // Multiple vehicles - show list
                                <div className="space-y-1">
                                  {stats.vehiclesUsed.map(vehicleId => {
                                    const vehicle = vehicles.find(v => v.id === vehicleId);
                                    return vehicle ? (
                                      <div key={vehicleId} className="flex items-center gap-1.5 text-xs bg-slate-800 px-2 py-1 rounded border border-slate-600">
                                        <svg className="w-3 h-3 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-slate-200">{vehicle.name} ({vehicle.registrationNumber})</span>
                                      </div>
                                    ) : null;
                                  })}
                                </div>
                              )
                            ) : (
                              <span className="text-xs text-slate-400">No trips yet</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {vehicleCount > 0 ? (
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                vehicleCount === 1 ? 'bg-green-500/20 text-green-400' :
                                vehicleCount === 2 ? 'bg-blue-500/20 text-blue-400' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {vehicleCount}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-semibold text-slate-200">
                              {stats.totalKm.toFixed(2)} km
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* Status indicator */}
                              <div className={`h-2 w-2 rounded-full ${
                                loginStatus === 'active' ? 'bg-green-500' :
                                loginStatus === 'warning' ? 'bg-orange-500' :
                                loginStatus === 'inactive' ? 'bg-red-500' :
                                loginStatus === 'pending' ? 'bg-yellow-500' :
                                'bg-slate-500'
                              }`} />
                              <span className={`text-xs ${
                                loginStatus === 'active' ? 'text-slate-200' :
                                loginStatus === 'warning' ? 'text-orange-400' :
                                loginStatus === 'inactive' ? 'text-red-400' :
                                loginStatus === 'pending' ? 'text-yellow-400' :
                                'text-slate-500'
                              }`}>
                                {lastLoginText}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {driver.isDriverProfile ? (
                              <span className="px-3 py-1.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                ⏳ Pending Invitation
                              </span>
                            ) : driver.id === user?.uid ? (
                              // Current user - show locked badge regardless of role
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1.5 rounded text-xs font-medium ${
                                  driver.role === 'company_admin' 
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                                    : driver.role === 'company_manager'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                    : 'bg-green-500/20 text-green-300 border border-green-500/30'
                                }`}>
                                  🔒 {driver.role === 'company_admin' ? 'Admin' : driver.role === 'company_manager' ? 'Manager' : 'Driver'}
                                </span>
                                <span className="text-xs text-slate-500">(You)</span>
                              </div>
                            ) : (driver.role === 'company_admin' || driver.role === 'company_manager') ? (
                              // Other admins/managers - show locked badge
                              <span className={`px-3 py-1.5 rounded text-xs font-medium ${
                                driver.role === 'company_admin' 
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}>
                                🔒 {driver.role === 'company_admin' ? 'Admin' : 'Manager'}
                              </span>
                            ) : (
                              // Other drivers - show dropdown (only managers can change)
                              <select
                                value={driver.role}
                                onChange={(e) => handleUpdateUserRole(driver.id, e.target.value)}
                                className="bg-slate-800 text-white px-3 py-1.5 rounded border border-slate-600 text-xs focus:border-blue-500 focus:outline-none"
                                disabled={!isCompanyManager}
                              >
                                <option value="company_user">Driver</option>
                                {isCompanyManager && <option value="company_admin">Admin</option>}
                              </select>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {driver.isDriverProfile ? (
                              <button
                                onClick={() => setShowInviteModal(true)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition"
                                title="Invite Driver"
                              >
                                Invite Driver
                              </button>
                            ) : (
                              <button
                                onClick={() => handleResetPassword(driver.id, driver.email)}
                                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs transition"
                                title="Reset Password"
                              >
                                Reset Password
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>

        {/* Legend */}
        {teamMembers.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Activity Status</h3>
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-slate-300">Active (logged in within 14 days)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="text-slate-300">Warning (14-30 days since login)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-slate-300">Inactive (30+ days since login)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-slate-500" />
                <span className="text-slate-300">Never logged in</span>
              </div>
            </div>
          </div>
        )}

        {/* Invite Driver Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-4 border border-slate-700 my-4 max-h-[95vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Invite Team Member</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleInviteDriver} className="space-y-3">
                {/* Driver Profile Selection */}
                {driverProfiles.length > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                    <label className="block text-xs font-medium text-blue-300 mb-1.5">
                      📋 Invite New / Select Existing
                    </label>
                    <select
                      value={inviteForm.driverProfileId}
                      onChange={(e) => {
                        const profileId = e.target.value;
                        if (profileId) {
                          const profile = driverProfiles.find(p => p.id === profileId);
                          
                          // Check if profile has email
                          if (!profile.email || profile.email.trim() === '') {
                            const addEmail = window.confirm(
                              `⚠️ "${profile.fullName}" has no email!\n\n` +
                              'Email is required for sending invitation and login.\n\n' +
                              'Please add their email address in the form below before sending invitation.\n\n' +
                              'Continue?'
                            );
                            
                            if (!addEmail) {
                              return;
                            }
                          }
                          
                          setInviteForm({
                            ...inviteForm,
                            driverProfileId: profileId,
                            fullName: profile.fullName,
                            email: profile.email || '',
                            phoneNumber: profile.phone || '',
                          });
                        } else {
                          setInviteForm({
                            ...inviteForm,
                            driverProfileId: '',
                            fullName: '',
                            email: '',
                            phoneNumber: '',
                          });
                        }
                      }}
                      className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">➕ Add New Team Member</option>
                      {driverProfiles.map(profile => (
                        <option key={profile.id} value={profile.id}>
                          👤 {profile.fullName} {profile.email ? `(${profile.email})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-blue-200 mt-2">
                      Link to someone who already has trip data. Their existing trips will be connected to their account.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={inviteForm.fullName}
                    onChange={(e) => setInviteForm({...inviteForm, fullName: e.target.value})}
                    className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                    className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                    placeholder="driver@example.com"
                    required
                  />
                  <p className="text-xs text-blue-200 mt-1 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Email is required for invitation. It will be auto-populated during driver registration.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={inviteForm.phoneNumber}
                    onChange={(e) => setInviteForm({...inviteForm, phoneNumber: e.target.value})}
                    className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                    placeholder="+27 82 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={inviteForm.location}
                    onChange={(e) => setInviteForm({...inviteForm, location: e.target.value})}
                    className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                    placeholder="City, Region"
                  />
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Role *
                  </label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                    className="w-full bg-slate-900 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none text-sm"
                    required
                  >
                    <option value="company_user">Driver</option>
                    {isCompanyManager && <option value="company_admin">Admin</option>}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    {inviteForm.role === 'company_admin' 
                      ? '🔑 Admins can manage vehicles, view analytics, and manage drivers'
                      : '🚗 Drivers can capture trips and view their own data'}
                  </p>
                  {!isCompanyManager && (
                    <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Only Company Managers can invite Admins
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition text-sm"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Modal */}
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          invitationData={successInvitationData}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteModal && invitationToDelete && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-red-500/20 animate-slideUp">
              {/* Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">Delete Invitation</h3>
                    <p className="text-sm text-slate-400 mt-0.5">This action cannot be undone</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <p className="text-slate-300">
                  Are you sure you want to delete the invitation for:
                </p>
                
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold">{invitationToDelete.name}</p>
                      <p className="text-sm text-slate-400 truncate">{invitationToDelete.email}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-300">
                      The invitation link will no longer work and they won't be able to register using it.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 bg-slate-900/50 border-t border-slate-700/50 flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setInvitationToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteInvitation}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Invitation
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamPage;
