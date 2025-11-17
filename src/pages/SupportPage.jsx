import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const SupportPage = () => {
  const { user, userProfile } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'normal',
  });
  const [sending, setSending] = useState(false);

  const supportEmail = 'poscomlimited@gmail.com';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.message) {
      toast.error('Please fill in all fields');
      return;
    }

    setSending(true);

    try {
      // Prepare email content
      const emailBody = `
From: ${userProfile?.displayName || user?.email}
Email: ${user?.email}
Company: ${userProfile?.companyId || 'N/A'}
Role: ${userProfile?.role || 'N/A'}
Priority: ${formData.priority}

Message:
${formData.message}

---
Sent from FleetTrack Support System
      `.trim();

      // Create mailto link
      const mailtoLink = `mailto:${supportEmail}?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(emailBody)}`;
      
      // Open email client
      window.location.href = mailtoLink;
      
      toast.success('Opening your email client...');
      
      // Reset form
      setFormData({
        subject: '',
        message: '',
        priority: 'normal',
      });
    } catch (error) {
      console.error('Error sending support request:', error);
      toast.error('Failed to open email client');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Support Center</h1>
          <p className="text-slate-400">Get help with FleetTrack - we're here to assist you</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Form */}
          <div className="lg:col-span-2 bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Send Support Request</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User Info Display */}
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-400 mb-2">Your Information</p>
                <div className="space-y-1">
                  <p className="text-white text-sm">
                    <span className="text-slate-400">Name:</span> {userProfile?.displayName || 'Not set'}
                  </p>
                  <p className="text-white text-sm">
                    <span className="text-slate-400">Email:</span> {user?.email}
                  </p>
                  <p className="text-white text-sm">
                    <span className="text-slate-400">Role:</span> {userProfile?.role?.replace('_', ' ') || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="low">Low - General inquiry</option>
                  <option value="normal">Normal - Standard support</option>
                  <option value="high">High - Urgent issue</option>
                  <option value="critical">Critical - System down</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Describe your issue or question in detail..."
                  rows="8"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                className="w-full px-6 py-3 bg-brand-gradient text-white font-semibold rounded-lg hover:shadow-brand-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Opening Email...' : 'Send Support Request'}
              </button>

              <p className="text-sm text-slate-400 text-center">
                This will open your default email client with the message pre-filled
              </p>
            </form>
          </div>

          {/* Support Info Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <svg className="h-5 w-5 text-brand-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm text-slate-400">Email</p>
                    <a href={`mailto:${supportEmail}`} className="text-white hover:text-brand-400 transition">
                      {supportEmail}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Response Time</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  <p className="text-sm text-slate-300">Critical: Within 2 hours</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                  <p className="text-sm text-slate-300">High: Within 4 hours</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-400"></div>
                  <p className="text-sm text-slate-300">Normal: Within 24 hours</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-slate-400"></div>
                  <p className="text-sm text-slate-300">Low: Within 48 hours</p>
                </div>
              </div>
            </div>

            {/* Coming Soon */}
            <div className="bg-gradient-to-br from-brand-500/20 to-purple-500/20 rounded-lg p-6 border border-brand-500/30">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-5 w-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="text-lg font-bold text-white">Coming Soon</h3>
              </div>
              <p className="text-sm text-slate-300">
                AI-powered support with instant insights and automated analysis
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
