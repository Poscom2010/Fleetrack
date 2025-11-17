import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { updateCompany } from "../../services/companyService";

const CompanySettingsModal = ({ isOpen, onClose }) => {
  const { company, refreshUserData } = useAuth();
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [logoFile, setLogoFile] = React.useState(null);

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

      await refreshUserData();
      setLogoFile(null);
      onClose(); // Close modal after successful save
    } catch (error) {
      console.error("Error updating company profile:", error);
      alert("Failed to update company profile: " + error.message);
    } finally {
      setSavingProfile(false);
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full bg-slate-900 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-brand-500 focus:outline-none"
                required
              />
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
