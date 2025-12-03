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
    <div className="space-y-3">
      {/* Compact Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-baltic-500 to-baltic-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Support Tickets</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">Manage support requests</p>
            </div>
          </div>
          {/* Filter Tabs - Compact */}
          <div className="flex items-center gap-1 sm:ml-auto bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-medium transition ${
                filter === 'all'
                  ? 'bg-baltic-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              All <span className="hidden sm:inline">({tickets.length})</span>
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-medium transition ${
                filter === 'open'
                  ? 'bg-baltic-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Open <span className="text-[10px]">({tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length})</span>
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs font-medium transition ${
                filter === 'closed'
                  ? 'bg-baltic-500 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Closed <span className="text-[10px]">({tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tickets List - Compact */}
      {filteredTickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 text-center">
          <MessageCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No tickets found</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {filter === 'all' ? 'No support tickets yet.' : `No ${filter} tickets.`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Ticket Header - Compact */}
              <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(ticket.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{ticket.subject}</h3>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{ticket.userName}</span>
                      <span className="hidden sm:inline">{ticket.userEmail}</span>
                      {ticket.companyName && <span className="hidden md:inline">{ticket.companyName}</span>}
                      <span>{ticket.createdAt?.toLocaleDateString()}</span>
                    </div>
                  </div>
                  {/* Actions - Compact */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleReplyClick(ticket)}
                      className="p-1.5 bg-baltic-500 hover:bg-baltic-600 text-white rounded-lg transition"
                      title="Reply"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    <select
                      value={ticket.status}
                      onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                      className="px-1.5 py-1 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] focus:ring-1 focus:ring-baltic-500"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>
              {/* Message Preview - Collapsible on mobile */}
              <div className="p-3 bg-gray-50 dark:bg-gray-700/30">
                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 sm:line-clamp-3">{ticket.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal - Compact */}
      {showReplyModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header - Compact */}
            <div className="bg-gradient-to-r from-baltic-500 to-baltic-600 p-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">Reply to Ticket</h3>
                  <p className="text-[10px] text-white/80 truncate">
                    #{selectedTicket.id.slice(0, 8)} - {selectedTicket.subject}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyMessage('');
                  setSelectedTicket(null);
                }}
                className="hover:bg-white/20 rounded-full p-1 transition flex-shrink-0"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1">
              {/* Ticket Info - Compact */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 space-y-1">
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-medium text-gray-500 dark:text-gray-400">To:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{selectedTicket.userName}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-[10px]">({selectedTicket.userEmail})</span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Original:</span>
                  <p className="mt-0.5 text-gray-600 dark:text-gray-300 italic line-clamp-2">{selectedTicket.message}</p>
                </div>
              </div>

              {/* Reply Message */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Your Reply
                </label>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows="6"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-baltic-500 focus:border-transparent resize-none text-sm"
                  placeholder="Type your reply here..."
                />
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  Opens your email client with this message.
                </p>
              </div>
            </div>

            {/* Actions - Fixed at bottom */}
            <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyMessage('');
                  setSelectedTicket(null);
                }}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition text-xs"
              >
                Cancel
              </button>
              <button
                onClick={sendReply}
                className="px-3 py-1.5 bg-baltic-500 hover:bg-baltic-600 text-white rounded-lg font-medium transition flex items-center gap-1.5 text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTicketsPage;
