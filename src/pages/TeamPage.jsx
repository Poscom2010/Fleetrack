import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import SuccessModal from '../components/common/SuccessModal';

/**
 * Team Page - Shows driver activity table for admins and managers
 */
const TeamPage = () => {
  const { company, userProfile, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [driverStats, setDriverStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInvitationData, setSuccessInvitationData] = useState(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    location: '',
    role: 'company_user',
  });

  const isSystemAdmin = userProfile?.role === 'system_admin';
  const isCompanyAdmin = userProfile?.role === 'company_admin';
  const isCompanyManager = userProfile?.role === 'company_manager';

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
        loadCompanyVehicles(),
        loadDriverStats(),
      ]);
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setLoading(false);
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

      const snapshot = await getDocs(q);
      const vehiclesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

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

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const userId = data.userId;
        const distance = data.distanceTraveled || 0;
        if (!userId) return;
        if (!stats[userId]) {
          stats[userId] = { totalKm: 0 };
        }
        stats[userId].totalKm += distance;
      });

      setDriverStats(stats);
    } catch (error) {
      console.error('Error loading driver stats:', error);
    }
  };

  // Show all company users in the table (not just drivers)
  const teamMembers = users;

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
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
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');
      
      // If vehicleId is empty, unassign the vehicle
      if (!vehicleId) {
        // Find and unassign any vehicle currently assigned to this user
        const currentVehicle = vehicles.find(v => v.userId === userId);
        if (currentVehicle) {
          await updateDoc(doc(db, 'vehicles', currentVehicle.id), {
            userId: null,
            updatedAt: serverTimestamp(),
          });
        }
        await loadData();
        return;
      }
      
      // Unassign vehicle from previous user if any
      const vehicleToAssign = vehicles.find(v => v.id === vehicleId);
      if (vehicleToAssign && vehicleToAssign.userId) {
        await updateDoc(doc(db, 'vehicles', vehicleId), {
          userId: null,
          updatedAt: serverTimestamp(),
        });
      }
      
      // Assign vehicle to new user
      await updateDoc(doc(db, 'vehicles', vehicleId), {
        userId: userId,
        updatedAt: serverTimestamp(),
      });
      
      await loadData();
      alert('Vehicle assigned successfully!');
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      alert('Failed to assign vehicle');
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
        role: inviteForm.role === 'company_user' ? 'Driver' : 'Manager',
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
          <h1 className="text-2xl font-bold text-white mb-1">Team Members</h1>
          <p className="text-sm text-slate-400">Monitor driver activity and performance</p>
        </div>

        {/* Driver Activity Table */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Driver Activity</h2>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Invite Driver
            </button>
          </div>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900">
              <table className="min-w-full divide-y divide-slate-700 text-sm">
                <thead className="bg-slate-900/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Driver
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Assigned Vehicle
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
                      <td colSpan="6" className="px-4 py-12 text-center">
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
                      const stats = driverStats[driver.id] || { totalKm: 0 };
                      let lastLogin = driver.lastLoginAt;
                      if (lastLogin && lastLogin.toDate) {
                        lastLogin = lastLogin.toDate();
                      }
                      
                      const lastLoginText = lastLogin
                        ? `${lastLogin.toLocaleDateString()} ${lastLogin.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'Never';

                      // Calculate days since last login for status indicator
                      let loginStatus = 'active'; // green
                      if (lastLogin) {
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
                            <select
                              value={assignedVehicle?.id || ''}
                              onChange={(e) => handleAssignVehicle(driver.id, e.target.value)}
                              className="bg-slate-800 text-white px-3 py-1.5 rounded border border-slate-600 text-xs focus:border-blue-500 focus:outline-none min-w-[150px]"
                            >
                              <option value="">No vehicle</option>
                              {vehicles.map((vehicle) => (
                                <option key={vehicle.id} value={vehicle.id}>
                                  {vehicle.name} ({vehicle.registrationNumber})
                                </option>
                              ))}
                            </select>
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
                                'bg-slate-500'
                              }`} />
                              <span className={`text-xs ${
                                loginStatus === 'active' ? 'text-slate-200' :
                                loginStatus === 'warning' ? 'text-orange-400' :
                                loginStatus === 'inactive' ? 'text-red-400' :
                                'text-slate-500'
                              }`}>
                                {lastLoginText}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={driver.role}
                              onChange={(e) => handleUpdateUserRole(driver.id, e.target.value)}
                              className="bg-slate-800 text-white px-3 py-1.5 rounded border border-slate-600 text-xs focus:border-blue-500 focus:outline-none"
                            >
                              <option value="company_admin">Admin</option>
                              <option value="company_manager">Manager</option>
                              <option value="company_user">Driver</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleResetPassword(driver.id, driver.email)}
                              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs transition"
                              title="Reset Password"
                            >
                              Reset Password
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Invite New Driver</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleInviteDriver} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={inviteForm.fullName}
                    onChange={(e) => setInviteForm({...inviteForm, fullName: e.target.value})}
                    className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                    className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={inviteForm.phoneNumber}
                    onChange={(e) => setInviteForm({...inviteForm, phoneNumber: e.target.value})}
                    className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                    placeholder="+27 82 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={inviteForm.location}
                    onChange={(e) => setInviteForm({...inviteForm, location: e.target.value})}
                    className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
                    placeholder="City, Region"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
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
      </div>
    </div>
  );
};

export default TeamPage;
