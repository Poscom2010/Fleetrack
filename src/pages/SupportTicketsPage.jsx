import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { MessageCircle, Clock, CheckCircle, XCircle, AlertCircle, Mail, Send } from 'lucide-react';
import toast from 'react-hot-toast';

const SupportTicketsPage = () => {
  const { user, company, userProfile } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, open, closed
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');

  useEffect(() => {
    loadTickets();
  }, [company, userProfile]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      // Only system admins can view support tickets
      if (userProfile?.role !== 'system_admin') {
        toast.error('Access denied. Only system administrators can view support tickets.');
        setTickets([]);
        setLoading(false);
        return;
      }
      
      const ticketsRef = collection(db, 'supportTickets');
      const q = query(ticketsRef, orderBy('createdAt', 'desc'));

      const snapshot = await getDocs(q);
      const ticketsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      }));

      setTickets(ticketsData);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      await updateDoc(doc(db, 'supportTickets', ticketId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      toast.success('Ticket status updated');
      loadTickets();
    } catch (error) {
      console.error('Error updating ticket:', error);
      toast.error('Failed to update ticket status');
    }
  };

  const handleReplyClick = (ticket) => {
    setSelectedTicket(ticket);
    setReplyMessage(`Hi ${ticket.userName.split(' ')[0]},\n\nThank you for contacting FleetTrack support.\n\n[Your response here]\n\nBest regards,\nFleetTrack Support Team`);
    setShowReplyModal(true);
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) {
      toast.error('Please enter a reply message');
      return;
    }

    try {
      // Save reply to Firestore for tracking
      await addDoc(collection(db, 'supportReplies'), {
        ticketId: selectedTicket.id,
        ticketSubject: selectedTicket.subject,
        userEmail: selectedTicket.userEmail,
        userName: selectedTicket.userName,
        companyId: selectedTicket.companyId,
        companyName: selectedTicket.companyName,
        replyMessage: replyMessage.trim(),
        repliedBy: userProfile?.fullName || user?.email,
        repliedByEmail: user?.email,
        createdAt: Timestamp.now(),
      });

      // Open user's email client with pre-filled message
      const subject = encodeURIComponent(`Re: ${selectedTicket.subject} [Ticket #${selectedTicket.id.slice(0, 8)}]`);
      const body = encodeURIComponent(replyMessage);
      const mailtoLink = `mailto:${selectedTicket.userEmail}?subject=${subject}&body=${body}`;
      
      window.open(mailtoLink, '_blank');

      // Update ticket status to in_progress if it's still open
      if (selectedTicket.status === 'open') {
        await updateTicketStatus(selectedTicket.id, 'in_progress');
      }

      toast.success('Reply email opened! Send the email from your email client.');
      setShowReplyModal(false);
      setReplyMessage('');
      setSelectedTicket(null);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to prepare reply');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'normal': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'low': return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed': return <XCircle className="w-4 h-4 text-gray-500" />;
      default: return <MessageCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    if (filter === 'open') return ticket.status === 'open' || ticket.status === 'in_progress';
    if (filter === 'closed') return ticket.status === 'resolved' || ticket.status === 'closed';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-baltic-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-baltic-500 to-baltic-600 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage customer support requests</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-baltic-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All ({tickets.length})
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'open'
                  ? 'bg-baltic-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Open ({tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length})
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'closed'
                  ? 'bg-baltic-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Closed ({tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length})
            </button>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
          <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No tickets found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'all' ? 'No support tickets have been submitted yet.' : `No ${filter} tickets.`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusIcon(ticket.status)}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{ticket.subject}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>From: <strong>{ticket.userName}</strong></span>
                    <span>Email: <strong>{ticket.userEmail}</strong></span>
                    {ticket.companyName && <span>Company: <strong>{ticket.companyName}</strong></span>}
                    <span>Created: {ticket.createdAt?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReplyClick(ticket)}
                    className="px-3 py-1.5 bg-baltic-500 hover:bg-baltic-600 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Reply
                  </button>
                  <select
                    value={ticket.status}
                    onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-baltic-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticket.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-baltic-500 to-baltic-600 p-6 text-white rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6" />
                  <div>
                    <h3 className="text-xl font-bold">Reply to Support Ticket</h3>
                    <p className="text-sm text-white/80 mt-1">
                      Ticket #{selectedTicket.id.slice(0, 8)} - {selectedTicket.subject}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyMessage('');
                    setSelectedTicket(null);
                  }}
                  className="hover:bg-white/20 rounded-full p-2 transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Ticket Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">To:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{selectedTicket.userName}</span>
                  <span className="text-gray-600 dark:text-gray-400">({selectedTicket.userEmail})</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Original Message:</span>
                  <p className="mt-1 text-gray-700 dark:text-gray-300 italic">{selectedTicket.message}</p>
                </div>
              </div>

              {/* Reply Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Reply
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows="10"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-baltic-500 focus:border-transparent resize-none"
                  placeholder="Type your reply here..."
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  This will open your email client with the message pre-filled. You can edit it before sending.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowReplyModal(false);
                    setReplyMessage('');
                    setSelectedTicket(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={sendReply}
                  className="px-4 py-2 bg-gradient-to-r from-baltic-500 to-baltic-600 hover:from-baltic-600 hover:to-baltic-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Open Email Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTicketsPage;
