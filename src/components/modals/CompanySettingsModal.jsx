import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { updateCompany } from "../../services/companyService";

const CompanySettingsModal = ({ isOpen, onClose }) => {
  const { company, refreshUserData } = useAuth();
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState(null);
  const [isEditingName, setIsEditingName] = React.useState(false);

  const [profileForm, setProfileForm] = React.useState({
    name: "",
    logoUrl: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    contactEmail: "",
    contactPhone: "",
  });

  React.useEffect(() => {
    // Initialize profile form from current company
    if (company) {
      setProfileForm({
        name: company.name || "",
        logoUrl: company.logoUrl || "",
        addressLine1: company.address?.line1 || "",
        addressLine2: company.address?.line2 || "",
        city: company.address?.city || "",
        contactEmail: company.contact?.email || "",
        contactPhone: company.contact?.phone || "",
      });
    }
  }, [company]);

  React.useEffect(() => {
    if (isOpen) {
      loadCompanyUsers();
    }
  }, [isOpen, company]);

  const loadCompanyUsers = async () => {
    try {
      setLoading(true);
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase');
      
      if (!company) return;
      
      const q = query(
        collection(db, 'users'),
        where('companyId', '==', company.id)
      );
      
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!company?.id) return;

    // Check if company name is being changed
    const isNameChanged = profileForm.name !== company.name;
    
    if (isNameChanged) {
      const confirmed = window.confirm(
        '⚠️ WARNING: CHANGING COMPANY NAME\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'You are about to change the company name from:\n' +
        `"${company.name}" → "${profileForm.name}"\n\n` +
        'CRITICAL IMPACTS:\n\n' +
        '❌ ALL pending invitations will show the NEW name\n' +
        '❌ ALL invitation links will reference the NEW name\n' +
        '❌ Company branding will change everywhere\n' +
        '❌ Reports and documents will show NEW name\n' +
        '❌ Email notifications will use NEW name\n\n' +
        '⚠️ THIS CHANGE IS IMMEDIATE AND AFFECTS:\n' +
        '   • All team members\n' +
        '   • All pending invitations\n' +
        '   • All system references\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        'Are you ABSOLUTELY SURE you want to proceed?\n\n' +
        'Type "YES" in the next prompt to confirm.'
      );
      
      if (!confirmed) {
        return;
      }
      
      // Second confirmation - require typing YES
      const typedConfirmation = prompt(
        'FINAL CONFIRMATION\n\n' +
        'Type "YES" (in capital letters) to confirm company name change:'
      );
      
      if (typedConfirmation !== 'YES') {
        alert('Company name change cancelled. No changes were made.');
        return;
      }
    }

    try {
      setSavingProfile(true);
      let logoUrlToSave = profileForm.logoUrl || null;

      // If a new logo file is selected, convert to base64
      if (logoFile) {
        const reader = new FileReader();
        logoUrlToSave = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
      }

      await updateCompany(company.id, {
        name: profileForm.name,
        logoUrl: logoUrlToSave,
        address: {
          line1: profileForm.addressLine1 || null,
          line2: profileForm.addressLine2 || null,
          city: profileForm.city || null,
        },
        contact: {
          email: profileForm.contactEmail || null,
          phone: profileForm.contactPhone || null,
        },
      });

      // If name changed, update all pending invitations
      if (isNameChanged) {
        await updatePendingInvitations(company.id, profileForm.name);
      }

      await refreshUserData();
      setLogoFile(null);
      
      if (isNameChanged) {
        alert(
          '✅ Company name updated successfully!\n\n' +
          'The new name is now active across the entire system.\n' +
          'All pending invitations have been updated.'
        );
      }
      
      onClose(); // Close modal after successful save
    } catch (error) {
      console.error("Error updating company profile:", error);
      alert("Failed to update company profile: " + error.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePendingInvitations = async (companyId, newCompanyName) => {
    try {
      const { doc, getDoc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase');
      
      const companyRef = doc(db, 'companies', companyId);
      const companyDoc = await getDoc(companyRef);
      
      if (!companyDoc.exists()) return;
      
      const pendingInvitations = companyDoc.data().pendingInvitations || [];
      
      // Update company name in all pending invitation tokens
      const updatedInvitations = pendingInvitations.map(invitation => {
        if (invitation.status === 'pending' && invitation.token) {
          try {
            // Decode token
            const decodedData = JSON.parse(atob(invitation.token));
            
            // Update company name
            decodedData.companyName = newCompanyName;
            
            // Re-encode token
            const newToken = btoa(JSON.stringify(decodedData));
            
            return {
              ...invitation,
              token: newToken
            };
          } catch (err) {
            console.error('Error updating invitation token:', err);
            return invitation;
          }
        }
        return invitation;
      });
      
      // Save updated invitations
      await updateDoc(companyRef, {
        pendingInvitations: updatedInvitations
      });
      
      console.log('✅ Updated pending invitations with new company name');
    } catch (error) {
      console.error('Error updating pending invitations:', error);
      throw error;
    }
  };

  if (!isOpen || !company) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 overflow-y-auto">
      <div className="min-h-screen p-8">
        <div className="max-w-5xl mx-auto space-y-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-slate-300 transition hover:bg-white/20 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Company Settings</h2>
          <p className="text-slate-400">Manage your company profile and team members</p>
        </div>

        {/* Company Profile Section */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Company Profile</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                Company Name
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Protected
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => {
                    if (isEditingName) {
                      setProfileForm({ ...profileForm, name: e.target.value });
                    }
                  }}
                  className={`w-full px-4 py-2 rounded-lg border text-white focus:outline-none ${
                    isEditingName 
                      ? 'bg-slate-900 border-amber-500 focus:border-amber-400' 
                      : 'bg-slate-900/50 border-slate-600 cursor-not-allowed'
                  }`}
                  required
                  disabled={!isEditingName}
                />
                {!isEditingName && (
                  <button
                    type="button"
                    onClick={() => {
                      const confirmed = window.confirm(
                        '⚠️ WARNING: You are about to unlock the Company Name field.\n\n' +
                        'Changing the company name has SERIOUS consequences:\n' +
                        '• All pending invitations will be updated\n' +
                        '• Company branding changes everywhere\n' +
                        '• This affects all team members\n\n' +
                        'Do you want to proceed?'
                      );
                      if (confirmed) {
                        setIsEditingName(true);
                      }
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs rounded border border-amber-500/50 transition flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                    Edit
                  </button>
                )}
                {isEditingName && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingName(false);
                      setProfileForm({ ...profileForm, name: company.name });
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded transition flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Lock
                  </button>
                )}
              </div>
              {!isEditingName && (
                <p className="text-xs text-slate-400 mt-1">
                  Click "Edit" to unlock and change company name
                </p>
              )}
              {isEditingName && (
                <p className="text-xs text-amber-300 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Field unlocked - You can now edit the company name
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Company Logo</label>

              {/* Current Logo Preview */}
              {(company.logoUrl || logoFile) && (
                <div className="mb-3 flex items-center gap-3">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-brand-gradient shadow-brand">
                    <div className="absolute inset-0 rounded-full bg-brand-gradient opacity-75 blur-xl"></div>
                    <div className="relative z-10 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-900">
                      <img
                        src={logoFile ? URL.createObjectURL(logoFile) : company.logoUrl}
                        alt="Company logo preview"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFile(null);
                      setProfileForm({ ...profileForm, logoUrl: "" });
                    }}
                    className="text-xs text-red-400 hover:text-red-300 underline"
                  >
                    Remove Logo
                  </button>
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setLogoFile(file);
                  }
                }}
                className="block w-full text-xs text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-brand-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-600"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Upload a square logo (recommended 256x256px)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Address Line 1</label>
              <input
                type="text"
                value={profileForm.addressLine1}
                onChange={(e) => setProfileForm({ ...profileForm, addressLine1: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Address Line 2</label>
              <input
                type="text"
                value={profileForm.addressLine2}
                onChange={(e) => setProfileForm({ ...profileForm, addressLine2: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">City / Town</label>
              <input
                type="text"
                value={profileForm.city}
                onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Contact Phone</label>
              <input
                type="tel"
                value={profileForm.contactPhone}
                onChange={(e) => setProfileForm({ ...profileForm, contactPhone: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
                placeholder="+27 82 123 4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Contact Email</label>
            <input
              type="email"
              value={profileForm.contactEmail}
              onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
              className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
              placeholder="company@example.com"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-60"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* Team Members Section */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Team Members</h2>
          <div className="text-sm text-slate-400 bg-slate-900 px-4 py-2 rounded-lg">
            Contact System Admin to add new users
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : users.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No team members yet</p>
        ) : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
                <div>
                  <p className="text-white font-medium">{user.displayName || user.email}</p>
                  <p className="text-sm text-slate-400">{user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm capitalize">
                    {user.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close Button at Bottom */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-lg bg-white/10 text-slate-200 font-semibold hover:bg-white/20 transition"
        >
          Close
        </button>
      </div>
        </div>
      </div>
    </div>
  );
};

export default CompanySettingsModal;
