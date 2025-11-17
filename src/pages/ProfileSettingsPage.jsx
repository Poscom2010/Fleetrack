import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User, Mail, Phone, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfileSettingsPage = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const isDriver = userProfile?.role === 'company_user';
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || user?.displayName || '',
        email: user?.email || '',
        phoneNumber: userProfile.phoneNumber || '',
        location: userProfile.location || '',
      });
    }
  }, [userProfile, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Drivers can update phone number and location
      if (isDriver) {
        await updateDoc(userRef, {
          phoneNumber: formData.phoneNumber,
          location: formData.location,
        });
        toast.success('Profile updated successfully!');
      } else {
        // Admins and managers can update all fields
        await updateDoc(userRef, {
          fullName: formData.fullName,
          phoneNumber: formData.phoneNumber,
          location: formData.location,
        });
        toast.success('Profile updated successfully!');
      }
      
      // Close the page after successful update
      setTimeout(() => {
        navigate(-1); // Go back to previous page
      }, 1000);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
            <p className="text-slate-400 text-sm">Manage your account information and preferences.</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Personal Information Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Personal Information</h2>
          </div>

          {/* Profile Avatar */}
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {formData.fullName || 'User'}
              </h3>
              <p className="text-sm text-slate-400">
                {userProfile?.role === 'company_admin' ? 'Company Admin' :
                 userProfile?.role === 'company_manager' ? 'Manager' :
                 userProfile?.role === 'company_user' ? 'Professional Driver' : 'User'}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    disabled={isDriver}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition ${
                      isDriver ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    placeholder="John Driver"
                  />
                </div>
                {isDriver && (
                  <p className="mt-1 text-xs text-slate-500">Only admin can update this field</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 opacity-60 cursor-not-allowed"
                    placeholder="john.driver@example.com"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <p className="mt-1 text-xs text-green-400">You can update this field</p>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                    placeholder="San Francisco, CA"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box for Drivers */}
        {isDriver && (
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-blue-300 mb-1">Driver Profile</h3>
                <p className="text-xs text-blue-200">
                  As a driver, you can update your phone number and location. Other information can be updated by your company admin or manager.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSettingsPage;
