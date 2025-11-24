import { CheckCircle, X, Copy, Mail } from 'lucide-react';
import { useState } from 'react';

/**
 * Beautiful success modal for driver invitations
 */
const SuccessModal = ({ isOpen, onClose, invitationData }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(invitationData.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationData.registrationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAll = () => {
    const text = `🎉 You're invited to join ${invitationData.companyName}!

📧 Your Email: ${invitationData.email}
👤 Your Name: ${invitationData.fullName}
👔 Role: ${invitationData.role}

🔗 Click this link to register:
${invitationData.registrationLink}

✨ Simply click the link, create your account, and you'll be automatically added to ${invitationData.companyName}!`;
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md my-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
        {/* Success Header with Animation */}
        <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
          
          <div className="relative">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-2 animate-bounce">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              Invitation Sent!
            </h2>
            <p className="text-green-100 text-xs">
              Driver invited to join your company
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Registration Link Card - Most Important */}
          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-lg p-4 border-2 border-green-500/50">
            <div className="text-center">
              <p className="text-xs font-semibold text-green-300 uppercase tracking-wide mb-2">
                🔗 Registration Link
              </p>
              <div className="bg-white/10 rounded-lg p-3 mb-3">
                <p className="text-xs text-blue-200 break-all mb-2">
                  {invitationData.registrationLink}
                </p>
                <button
                  onClick={handleCopyLink}
                  className="w-full p-2 rounded-lg bg-green-500/30 hover:bg-green-500/50 transition text-white font-medium flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              <p className="text-xs text-green-200">
                Send this link to the driver via email, SMS, or WhatsApp
              </p>
            </div>
          </div>

          {/* Driver Details Card */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Driver Details
            </h3>
            
            <div className="space-y-2">
              <div>
                <p className="text-xs text-slate-500 mb-1">Full Name</p>
                <p className="text-white font-medium">{invitationData.fullName}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Email Address</p>
                <p className="text-blue-400 font-medium">{invitationData.email}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1">Role</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium">
                  {invitationData.role}
                </span>
              </div>
            </div>
          </div>

          {/* Instructions Card */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg p-3 border border-blue-500/30">
            <div className="flex items-start gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-500/20">
                <Mail className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white mb-0.5">
                  Share These Instructions
                </h3>
                <p className="text-xs text-slate-400">
                  Send to the {invitationData.role.toLowerCase()}
                </p>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <p className="text-sm text-slate-300">
                  Copy and send the <span className="text-white font-bold">registration link</span> to {invitationData.role.toLowerCase()}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <p className="text-sm text-slate-300">
                  {invitationData.role} clicks the link from anywhere
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <p className="text-sm text-slate-300">
                  {invitationData.role} creates account with password
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center">
                  ✓
                </span>
                <p className="text-sm text-green-400 font-medium">
                  Auto-added to {invitationData.companyName} ✨
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyAll}
              className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy All'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-blue-500/30"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;
