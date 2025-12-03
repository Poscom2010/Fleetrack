import React, { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const FloatingSupportChat = () => {
  const { user, company, userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create support ticket in Firestore
      const ticketData = {
        userId: user?.uid || null,
        userEmail: user?.email || userProfile?.email || 'Anonymous',
        userName: userProfile?.fullName || user?.displayName || user?.email || 'Anonymous User',
        companyId: company?.id || null,
        companyName: company?.name || 'No Company',
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        priority: formData.priority,
        status: 'open',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      console.log('Submitting ticket:', ticketData);
      await addDoc(collection(db, 'supportTickets'), ticketData);

      toast.success('Support ticket submitted successfully! We\'ll get back to you soon.');
      
      // Reset form
      setFormData({
        subject: '',
        message: '',
        priority: 'normal'
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      toast.error(`Failed to submit: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-baltic-500 to-baltic-600 hover:from-baltic-600 hover:to-baltic-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 group"
        aria-label="Contact Support"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          </>
        )}
      </button>

      {/* Support Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 max-w-[calc(100vw-3rem)] animate-slideUp">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-baltic-500 to-baltic-600 p-3 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Contact Support</h3>
                    <p className="text-[10px] text-white/80">We're here to help!</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-white/20 rounded-full p-1 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-3 space-y-3">
              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-baltic-500 focus:border-transparent text-xs"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-baltic-500 focus:border-transparent text-xs"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message *
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your issue..."
                  rows="3"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-baltic-500 focus:border-transparent text-xs resize-none"
                  required
                />
              </div>

              {/* User Info Display (Read-only) */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md p-2 text-[10px] space-y-0.5">
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">From:</span> {userProfile?.fullName || user?.email || 'Anonymous'}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Email:</span> {user?.email || 'Not provided'}
                </p>
                {company?.name && (
                  <p className="text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Company:</span> {company.name}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-baltic-500 to-baltic-600 hover:from-baltic-600 hover:to-baltic-700 text-white py-2 rounded-md font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    Send Message
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-center text-[10px] text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
              We typically respond within 1 hour
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingSupportChat;
