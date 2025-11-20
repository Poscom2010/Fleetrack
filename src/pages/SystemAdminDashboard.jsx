import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { collection, getDocs, query, where, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import toast from 'react-hot-toast';
import { wipeCompanyData } from '../services/dataWipeService';

const SystemAdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'dashboard');
  
  // Dynamic page title based on active tab
  const getPageTitle = () => {
    switch(activeTab) {
      case 'companies': return 'Companies';
      case 'users': return 'Users';
      default: return 'Admin Dashboard';
    }
  };
  
  usePageTitle(getPageTitle());
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [businessInsights, setBusinessInsights] = useState([]);
  const [deleteModal, setDeleteModal] = useState({ show: false, userId: null, userName: '' });
  const [emailModal, setEmailModal] = useState({ show: false, user: null });
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });
  const [wipeDataModal, setWipeDataModal] = useState({ show: false, companyId: null, companyName: '', confirmText: '' });
  
  // Privacy: Track which emails/phones are visible
  const [visibleEmails, setVisibleEmails] = useState({});
  const [visiblePhones, setVisiblePhones] = useState({});
  
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalVehicles: 0,
    totalTrips: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    activeCompanies: 0,
    avgRevenuePerCompany: 0,
    avgTripsPerCompany: 0,
    growthMetrics: {
      companiesThisMonth: 0,
      companiesLastMonth: 0,
      usersThisMonth: 0,
      usersLastMonth: 0,
      tripsThisMonth: 0,
      tripsLastMonth: 0,
      revenueThisMonth: 0,
      revenueLastMonth: 0,
    },
    topCompanies: [],
    churnRisk: [],
  });

  useEffect(() => {
    loadSystemStats();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab') || 'dashboard';
    setActiveTab(tab);
  }, [searchParams]);

  // Privacy Helper Functions
  const maskEmail = (email) => {
    if (!email) return '-';
    const [username, domain] = email.split('@');
    if (!username || !domain) return '***@***';
    const maskedUsername = username.length > 2 
      ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1]
      : username[0] + '*';
    return `${maskedUsername}@${domain}`;
  };

  const maskPhone = (phone) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
    if (cleaned.length < 4) return '***';
    // Show first 3 and last 2 digits, mask the middle
    return cleaned.slice(0, 3) + '*'.repeat(cleaned.length - 5) + cleaned.slice(-2);
  };

  const toggleEmailVisibility = (userId) => {
    setVisibleEmails(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const togglePhoneVisibility = (userId) => {
    setVisiblePhones(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const loadSystemStats = async () => {
    try {
      setLoading(true);

      // Date ranges
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all companies
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      const companiesData = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCompanies(companiesData);

      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);

      // Get all vehicles
      const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
      const vehicles = vehiclesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get all entries
      const entriesSnapshot = await getDocs(collection(db, 'dailyEntries'));
      const entries = entriesSnapshot.docs.map(doc => doc.data());

      // Get all expenses
      const expensesSnapshot = await getDocs(collection(db, 'expenses'));
      const expenses = expensesSnapshot.docs.map(doc => doc.data());

      // Calculate total revenue and expenses
      const totalRevenue = entries.reduce((sum, entry) => sum + (entry.revenue || 0), 0);
      const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;

      // Active companies (with entries in last 30 days)
      const activeCompanyIds = new Set();
      const companyActivity = {};
      entries.forEach(entry => {
        const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date);
        if (entryDate >= last30Days) {
          const user = usersData.find(u => u.id === entry.userId);
          if (user?.companyId) {
            activeCompanyIds.add(user.companyId);
            if (!companyActivity[user.companyId]) {
              companyActivity[user.companyId] = { trips: 0, revenue: 0, lastActivity: entryDate };
            }
            companyActivity[user.companyId].trips++;
            companyActivity[user.companyId].revenue += entry.revenue || 0;
            if (entryDate > companyActivity[user.companyId].lastActivity) {
              companyActivity[user.companyId].lastActivity = entryDate;
            }
          }
        }
      });

      // Revenue by company
      const revenueByCompany = {};
      entries.forEach(entry => {
        const user = usersData.find(u => u.id === entry.userId);
        if (user?.companyId) {
          const company = companiesData.find(c => c.id === user.companyId);
          if (company) {
            if (!revenueByCompany[user.companyId]) {
              revenueByCompany[user.companyId] = {
                companyName: company.name,
                revenue: 0,
                entries: 0,
                vehicles: vehicles.filter(v => v.companyId === user.companyId).length,
                users: usersData.filter(u => u.companyId === user.companyId).length,
              };
            }
            revenueByCompany[user.companyId].revenue += entry.totalCash || 0;
            revenueByCompany[user.companyId].entries += 1;
          }
        }
      });

      const revenueArray = Object.values(revenueByCompany);
      
      // Top performing companies (by revenue)
      const topPerforming = [...revenueArray]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Underperforming companies (registered but low/no activity)
      const underperforming = companiesData
        .filter(company => {
          const companyUsers = usersData.filter(u => u.companyId === company.id);
          const companyEntries = entries.filter(entry => {
            const user = usersData.find(u => u.id === entry.userId);
            return user?.companyId === company.id;
          });
          return companyUsers.length > 0 && companyEntries.length < 10; // Less than 10 entries
        })
        .map(company => ({
          id: company.id,
          name: company.name,
          users: usersData.filter(u => u.companyId === company.id).length,
          entries: entries.filter(entry => {
            const user = usersData.find(u => u.id === entry.userId);
            return user?.companyId === company.id;
          }).length,
          vehicles: vehicles.filter(v => v.companyId === company.id).length,
        }))
        .slice(0, 5);

      // Growth metrics (this month)
      const companiesThisMonth = companiesData.filter(c => {
        const createdAt = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return createdAt >= startOfMonth;
      });
      const companiesLastMonth = companiesData.filter(c => {
        const createdAt = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return createdAt >= startOfLastMonth && createdAt < startOfMonth;
      });

      const usersThisMonth = usersData.filter(u => {
        const createdAt = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
        return createdAt >= startOfMonth;
      });
      const usersLastMonth = usersData.filter(u => {
        const createdAt = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
        return createdAt >= startOfLastMonth && createdAt < startOfMonth;
      });

      const tripsThisMonth = entries.filter(e => {
        const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return date >= startOfMonth;
      });
      const tripsLastMonth = entries.filter(e => {
        const date = e.date?.toDate ? e.date.toDate() : new Date(e.date);
        return date >= startOfLastMonth && date < startOfMonth;
      });

      const revenueThisMonth = tripsThisMonth.reduce((sum, e) => sum + (e.revenue || 0), 0);
      const revenueLastMonth = tripsLastMonth.reduce((sum, e) => sum + (e.revenue || 0), 0);

      // Top companies by revenue
      const topCompanies = Object.entries(companyActivity)
        .map(([companyId, activity]) => ({
          company: companiesData.find(c => c.id === companyId),
          ...activity
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Churn risk (inactive companies)
      const churnRisk = companiesData
        .filter(company => {
          const activity = companyActivity[company.id];
          if (!activity) return true;
          const daysSinceActivity = (now - activity.lastActivity) / (1000 * 60 * 60 * 24);
          return daysSinceActivity > 14;
        })
        .slice(0, 5);

      // Companies by country and city
      const companiesByCountry = {};
      const companiesByCity = {};
      companiesData.forEach(company => {
        const country = company.country || 'Unknown';
        const city = company.address?.city || 'Unknown';
        
        companiesByCountry[country] = (companiesByCountry[country] || 0) + 1;
        companiesByCity[city] = (companiesByCity[city] || 0) + 1;
      });

      // Users by role
      const usersByRole = {};
      usersData.forEach(user => {
        const role = user.role || 'unknown';
        usersByRole[role] = (usersByRole[role] || 0) + 1;
      });

      // Top performing companies
      const topPerformingCompanies = Object.entries(companyActivity)
        .map(([companyId, activity]) => {
          const company = companiesData.find(c => c.id === companyId);
          return {
            name: company?.name || 'Unknown',
            revenue: activity.revenue,
            entries: activity.trips,
            vehicles: vehicles.filter(v => v.companyId === companyId).length,
            users: usersData.filter(u => u.companyId === companyId).length,
          };
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Underperforming companies
      const underperformingCompanies = companiesData
        .filter(company => {
          const activity = companyActivity[company.id];
          const companyUsers = usersData.filter(u => u.companyId === company.id);
          return companyUsers.length > 0 && (!activity || activity.trips < 10);
        })
        .map(company => ({
          name: company.name,
          users: usersData.filter(u => u.companyId === company.id).length,
          vehicles: vehicles.filter(v => v.companyId === company.id).length,
          entries: companyActivity[company.id]?.trips || 0,
        }))
        .slice(0, 5);

      setStats({
        totalCompanies: companiesData.length,
        totalUsers: usersData.length,
        totalVehicles: vehicles.length,
        totalTrips: entries.length,
        totalEntries: entries.length,
        totalRevenue,
        totalExpenses,
        netProfit,
        activeCompanies: activeCompanyIds.size,
        avgRevenuePerCompany: companiesData.length > 0 ? totalRevenue / companiesData.length : 0,
        avgTripsPerCompany: companiesData.length > 0 ? entries.length / companiesData.length : 0,
        companiesByCountry,
        companiesByCity,
        usersByRole,
        topPerformingCompanies,
        underperformingCompanies,
        growthMetrics: {
          companiesThisMonth: companiesThisMonth.length,
          companiesLastMonth: companiesLastMonth.length,
          usersThisMonth: usersThisMonth.length,
          usersLastMonth: usersLastMonth.length,
          tripsThisMonth: tripsThisMonth.length,
          tripsLastMonth: tripsLastMonth.length,
          entriesThisMonth: tripsThisMonth.length,
          revenueThisMonth,
          revenueLastMonth,
        },
        topCompanies,
        churnRisk,
      });

      // Generate business insights
      const insights = generateBusinessInsights({
        stats: {
          totalCompanies: companiesData.length,
          totalRevenue,
          netProfit,
          activeCompanies: activeCompanyIds.size,
        },
        growth: {
          companiesThisMonth: companiesThisMonth.length,
          companiesLastMonth: companiesLastMonth.length,
          revenueThisMonth,
          revenueLastMonth,
        },
        churnRisk: churnRisk.length,
      });
      setBusinessInsights(insights);
    } catch (error) {
      console.error('Error loading system stats:', error);
      toast.error('Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  const generateBusinessInsights = ({ stats, growth, churnRisk }) => {
    const insights = [];

    // Revenue growth insight
    if (growth.revenueLastMonth > 0) {
      const revenueGrowth = ((growth.revenueThisMonth - growth.revenueLastMonth) / growth.revenueLastMonth) * 100;
      if (revenueGrowth > 10) {
        insights.push({
          type: 'success',
          title: 'Strong Revenue Growth',
          message: `FleetTrack revenue is up ${revenueGrowth.toFixed(1)}% this month. Excellent performance!`
        });
      } else if (revenueGrowth < -5) {
        insights.push({
          type: 'warning',
          title: 'Revenue Decline',
          message: `Revenue is down ${Math.abs(revenueGrowth).toFixed(1)}% this month. Review marketing and retention strategies.`
        });
      }
    }

    // Customer acquisition
    if (growth.companiesLastMonth > 0) {
      const customerGrowth = ((growth.companiesThisMonth - growth.companiesLastMonth) / growth.companiesLastMonth) * 100;
      if (customerGrowth > 15) {
        insights.push({
          type: 'success',
          title: 'Rapid Customer Growth',
          message: `${growth.companiesThisMonth} new companies joined this month, up ${customerGrowth.toFixed(0)}% from last month!`
        });
      }
    }

    // Profitability
    if (stats.totalRevenue > 0) {
      const profitMargin = (stats.netProfit / stats.totalRevenue) * 100;
      if (profitMargin > 30) {
        insights.push({
          type: 'success',
          title: 'Healthy Profit Margins',
          message: `Operating at ${profitMargin.toFixed(1)}% profit margin with R${stats.netProfit.toFixed(0)} net profit.`
        });
      } else if (profitMargin < 10) {
        insights.push({
          type: 'warning',
          title: 'Low Profit Margins',
          message: `Profit margin is only ${profitMargin.toFixed(1)}%. Consider optimizing costs or adjusting pricing.`
        });
      }
    }

    // Customer engagement
    const engagementRate = stats.totalCompanies > 0 ? (stats.activeCompanies / stats.totalCompanies) * 100 : 0;
    if (engagementRate < 50) {
      insights.push({
        type: 'warning',
        title: 'Low Customer Engagement',
        message: `Only ${engagementRate.toFixed(0)}% of companies are active. Improve onboarding and support.`
      });
    }

    // Churn risk
    if (churnRisk > 3) {
      insights.push({
        type: 'danger',
        title: 'High Churn Risk',
        message: `${churnRisk} companies haven't logged activity recently. Reach out proactively.`
      });
    }

    return insights;
  };

  const handleDeleteUser = (userId, userName) => {
    console.log('🗑️ Opening delete confirmation for user:', { userId, userName });
    setDeleteModal({ show: true, userId, userName });
  };

  const confirmDeleteUser = async () => {
    const { userId, userName } = deleteModal;
    console.log('🗑️ Confirming delete for user:', { userId, userName });
    
    // Close modal
    setDeleteModal({ show: false, userId: null, userName: '' });

    try {
      console.log('🔄 Deleting user from Firestore...');
      
      // Delete from Firestore
      await deleteDoc(doc(db, 'users', userId));
      
      console.log('✅ User deleted from Firestore successfully');
      
      // Reload data to refresh the list
      console.log('🔄 Reloading system stats...');
      await loadSystemStats();
      
      toast.success(`User ${userName} deleted successfully`);
      console.log('✅ Delete operation completed');
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      
      // Check for specific error types
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. You may not have rights to delete this user.');
      } else if (error.code === 'not-found') {
        toast.error('User not found in database.');
      } else {
        toast.error(`Failed to delete user: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const cancelDeleteUser = () => {
    setDeleteModal({ show: false, userId: null, userName: '' });
  };

  const handleEmailUser = (user) => {
    setEmailModal({ show: true, user });
    setEmailForm({ subject: '', message: '' });
  };

  const handleSendEmail = () => {
    if (!emailForm.subject || !emailForm.message) {
      toast.error('Please fill in subject and message');
      return;
    }

    const user = emailModal.user;
    const userCompany = companies.find(c => c.id === user.companyId);
    
    // Prepare email content with signature
    const emailBody = `
${emailForm.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Best regards,

🚗 System Administrator
   FleetTrack - Fleet Management System
   ${userCompany ? `Managing: ${userCompany.name}` : ''}

📧 Email: poscomlimited@gmail.com
🌐 Website: fleettrack.app
📱 Support: Available 24/7

This is an official communication from FleetTrack System Administration.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    // Create mailto link
    const mailtoLink = `mailto:${user.email}?subject=${encodeURIComponent(emailForm.subject)}&body=${encodeURIComponent(emailBody)}`;
    
    // Open email client
    window.location.href = mailtoLink;
    
    toast.success('Opening your email client...');
    
    // Close modal
    setEmailModal({ show: false, user: null });
    setEmailForm({ subject: '', message: '' });
  };

  const handleDeactivateUser = async (userId, userName, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    // Using window.confirm for deactivate is fine since it's less critical
    const confirmed = window.confirm(`Are you sure you want to ${action} ${userName}?`);
    if (!confirmed) {
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        isActive: !currentStatus,
        updatedAt: Timestamp.now(),
      });
      await loadSystemStats();
      toast.success(`User ${action}d successfully`);
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      toast.error(`Failed to ${action} user`);
    }
  };

  const handleUpdateUserRole = async (userId, newRole, userName) => {
    if (!window.confirm(`Change ${userName}'s role to ${newRole}?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: Timestamp.now(),
      });
      await loadSystemStats();
      toast.success('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleToggleCompanyStatus = async (companyId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'companies', companyId), {
        isActive: !currentStatus,
        updatedAt: Timestamp.now(),
      });
      
      // Reload data
      await loadSystemStats();
      toast.success(`Company ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error toggling company status:', error);
      toast.error('Failed to update company status');
    }
  };

  const handleWipeDataRequest = (companyId, companyName) => {
    setWipeDataModal({ show: true, companyId, companyName, confirmText: '' });
  };

  const handleWipeDataConfirm = async () => {
    if (wipeDataModal.confirmText !== 'WIPE DATA') {
      toast.error('Please type "WIPE DATA" to confirm');
      return;
    }

    const toastId = toast.loading('Wiping company data...');
    
    try {
      const stats = await wipeCompanyData(wipeDataModal.companyId);
      
      toast.success(
        `Successfully wiped ${stats.total} records (${stats.dailyEntries} entries, ${stats.expenses} expenses, ${stats.trips} trips)`,
        { id: toastId, duration: 5000 }
      );
      
      setWipeDataModal({ show: false, companyId: null, companyName: '', confirmText: '' });
      
      // Reload stats
      await loadSystemStats();
    } catch (error) {
      console.error('Error wiping company data:', error);
      toast.error(error.message || 'Failed to wipe company data', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500 mb-4"></div>
          <p className="text-white">Loading system analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">FleetTrack Business Overview</h1>
            <p className="text-slate-400 text-xs sm:text-sm">Platform performance, revenue, and growth metrics</p>
          </div>
          <button
            onClick={() => navigate('/admin/analytics')}
            className="px-3 py-2 sm:px-4 sm:py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 shadow-lg text-sm"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span className="hidden sm:inline">AI Insights & Analytics</span>
            <span className="sm:hidden">Analytics</span>
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">

        {/* FleetTrack Business Insights */}
        {businessInsights.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">💡 Business Insights</h2>
            {businessInsights.map((insight, index) => {
              const colorClass = insight.type === 'success' ? 'bg-green-500/10 border-green-500/30' :
                                 insight.type === 'warning' ? 'bg-orange-500/10 border-orange-500/30' :
                                 insight.type === 'danger' ? 'bg-red-500/10 border-red-500/30' :
                                 'bg-blue-500/10 border-blue-500/30';
              const iconColor = insight.type === 'success' ? 'text-green-400' :
                               insight.type === 'warning' ? 'text-orange-400' :
                               insight.type === 'danger' ? 'text-red-400' :
                               'text-blue-400';
              return (
                <div key={index} className={`${colorClass} border rounded-lg p-4`}>
                  <div className="flex items-start gap-3">
                    <svg className={`h-5 w-5 ${iconColor} flex-shrink-0 mt-0.5`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {insight.type === 'success' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                      {insight.type === 'warning' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />}
                      {insight.type === 'danger' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />}
                      {insight.type === 'info' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    </svg>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${iconColor} text-sm mb-1`}>{insight.title}</h3>
                      <p className="text-slate-300 text-sm">{insight.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FleetTrack Revenue & Profit Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-green-900/30 to-slate-800 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-green-300 font-semibold">Total Revenue</p>
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white mb-1">R{stats.totalRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p className="text-xs text-green-400">+R{stats.growthMetrics.revenueThisMonth.toLocaleString(undefined, {maximumFractionDigits: 0})} this month</p>
          </div>

          <div className="bg-gradient-to-br from-blue-900/30 to-slate-800 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-blue-300 font-semibold">Net Profit</p>
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white mb-1">R{stats.netProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p className="text-xs text-blue-400">{stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : 0}% profit margin</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-slate-800 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-purple-300 font-semibold">Avg Revenue/Company</p>
              <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white mb-1">R{stats.avgRevenuePerCompany.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            <p className="text-xs text-purple-400">{stats.totalCompanies} active companies</p>
          </div>
        </div>

        {/* Platform Stats */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">📊 Platform Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400">Total Companies</p>
              <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalCompanies}</p>
            <p className="text-xs text-green-400 mt-0.5">+{stats.growthMetrics.companiesThisMonth} this month</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400">Total Users</p>
              <svg className="h-4 w-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
            <p className="text-xs text-green-400 mt-0.5">+{stats.growthMetrics.usersThisMonth} this month</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400">Total Vehicles</p>
              <svg className="h-4 w-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalVehicles}</p>
            <p className="text-xs text-slate-400 mt-0.5">Across all companies</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-slate-400">Total Entries</p>
              <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white">{stats.totalEntries.toLocaleString()}</p>
            <p className="text-xs text-green-400 mt-0.5">+{stats.growthMetrics.entriesThisMonth.toLocaleString()} this month</p>
          </div>
        </div>
        </div>

        {/* Activity & Geographic Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active vs Inactive Companies */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Company Activity</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300">Active (Last 30 days)</span>
                  <span className="text-green-400 font-semibold">{stats.activeCompanies}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${(stats.activeCompanies / stats.totalCompanies) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300">Inactive</span>
                  <span className="text-red-400 font-semibold">{stats.totalCompanies - stats.activeCompanies}</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-3">
                  <div 
                    className="bg-red-500 h-3 rounded-full transition-all"
                    style={{ width: `${((stats.totalCompanies - stats.activeCompanies) / stats.totalCompanies) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-700">
                <p className="text-sm text-slate-400">Activity Rate</p>
                <p className="text-2xl font-bold text-white">
                  {((stats.activeCompanies / stats.totalCompanies) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* Companies by Country */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">Geographic Distribution</h2>
            <div className="space-y-3">
              {Object.entries(stats.companiesByCountry)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([country, count]) => (
                  <div key={country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-brand-400"></div>
                      <span className="text-slate-300">{country}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-slate-900 rounded-full h-2">
                        <div 
                          className="bg-brand-500 h-2 rounded-full"
                          style={{ width: `${(count / stats.totalCompanies) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-semibold w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Top Performing Companies */}
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">🏆 Top Performing Companies</h2>
          
          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {stats.topPerformingCompanies.map((company, index) => (
              <div key={index} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500 text-slate-900' :
                    index === 1 ? 'bg-slate-400 text-slate-900' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-slate-700 text-white'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-white font-semibold text-sm">{company.companyName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Revenue:</span>
                    <p className="text-green-400 font-semibold">R{company.revenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Entries:</span>
                    <p className="text-blue-400 font-semibold">{company.entries.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Vehicles:</span>
                    <p className="text-purple-400 font-semibold">{company.vehicles}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Users:</span>
                    <p className="text-orange-400 font-semibold">{company.users}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-2 text-slate-300 font-semibold">Rank</th>
                  <th className="text-left py-3 px-2 text-slate-300 font-semibold">Company</th>
                  <th className="text-right py-3 px-2 text-slate-300 font-semibold">Revenue</th>
                  <th className="text-right py-3 px-2 text-slate-300 font-semibold">Entries</th>
                  <th className="text-right py-3 px-2 text-slate-300 font-semibold">Vehicles</th>
                  <th className="text-right py-3 px-2 text-slate-300 font-semibold">Users</th>
                </tr>
              </thead>
              <tbody>
                {stats.topPerformingCompanies.map((company, index) => (
                  <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500 text-slate-900' :
                        index === 1 ? 'bg-slate-400 text-slate-900' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-slate-700 text-white'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-white font-medium">{company.companyName}</td>
                    <td className="py-3 px-2 text-right text-green-400 font-semibold">
                      R {company.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-right text-blue-400">{company.entries.toLocaleString()}</td>
                    <td className="py-3 px-2 text-right text-purple-400">{company.vehicles}</td>
                    <td className="py-3 px-2 text-right text-orange-400">{company.users}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Underperforming Companies */}
        {stats.underperformingCompanies.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-red-900/30">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">⚠️ Companies Needing Attention</h2>
            <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4">Low activity - may need support or engagement</p>
            
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {stats.underperformingCompanies.map((company, index) => (
                <div key={index} className="bg-slate-900 rounded-lg p-3 border border-red-900/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-semibold text-sm">{company.name}</span>
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Low Activity</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Users:</span>
                      <p className="text-slate-300 font-semibold">{company.users}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Vehicles:</span>
                      <p className="text-slate-300 font-semibold">{company.vehicles}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Entries:</span>
                      <p className="text-orange-400 font-semibold">{company.entries}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-2 text-slate-300 font-semibold">Company</th>
                    <th className="text-right py-3 px-2 text-slate-300 font-semibold">Users</th>
                    <th className="text-right py-3 px-2 text-slate-300 font-semibold">Vehicles</th>
                    <th className="text-right py-3 px-2 text-slate-300 font-semibold">Entries</th>
                    <th className="text-right py-3 px-2 text-slate-300 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.underperformingCompanies.map((company, index) => (
                    <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-2 text-white">{company.name}</td>
                      <td className="py-3 px-2 text-right text-slate-300">{company.users}</td>
                      <td className="py-3 px-2 text-right text-slate-300">{company.vehicles}</td>
                      <td className="py-3 px-2 text-right text-orange-400">{company.entries}</td>
                      <td className="py-3 px-2 text-right">
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                          Low Activity
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users by Role */}
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">User Distribution by Role</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Object.entries(stats.usersByRole).map(([role, count]) => (
              <div key={role} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <p className="text-sm text-slate-400 mb-1 capitalize">{role.replace('_', ' ')}</p>
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {((count / stats.totalUsers) * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Cities Distribution */}
        <div className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">Top Cities</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {Object.entries(stats.companiesByCity)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([city, count]) => (
                <div key={city} className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">{city}</span>
                    <span className="text-brand-400 font-bold text-lg">{count}</span>
                  </div>
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-2">
                    <div 
                      className="bg-brand-500 h-2 rounded-full"
                      style={{ width: `${(count / stats.totalCompanies) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
          </div>
        </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
              All Companies ({companies.length})
            </h2>
            {companies.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No companies registered yet</p>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3">
                  {companies.map((company) => {
                    const companyUsers = users.filter(u => u.companyId === company.id);
                    const companyVehicles = users.filter(u => u.companyId === company.id).length;
                    return (
                      <div key={company.id} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-white font-semibold text-sm">{company.name || 'Unnamed Company'}</p>
                            <p className="text-slate-400 text-xs">{company.country || 'Not Set'}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            company.isActive !== false
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {company.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                          <div>
                            <span className="text-slate-400">City:</span>
                            <p className="text-slate-300">{company.address?.city || 'Not Set'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Users:</span>
                            <p className="text-slate-300 font-semibold">{companyUsers.length}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Vehicles:</span>
                            <p className="text-slate-300 font-semibold">{companyVehicles}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleCompanyStatus(company.id, company.isActive !== false)}
                            className="flex-1 px-3 py-1.5 bg-brand-500/20 text-brand-400 rounded hover:bg-brand-500/30 text-xs transition"
                          >
                            {company.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleWipeDataRequest(company.id, company.name)}
                            className="flex-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-xs transition"
                            title="Wipe all captured data"
                          >
                            Wipe Data
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-2 text-slate-300 font-semibold">Company</th>
                      <th className="text-left py-3 px-2 text-slate-300 font-semibold">Country</th>
                      <th className="text-left py-3 px-2 text-slate-300 font-semibold">City</th>
                      <th className="text-right py-3 px-2 text-slate-300 font-semibold">Users</th>
                      <th className="text-right py-3 px-2 text-slate-300 font-semibold">Vehicles</th>
                      <th className="text-right py-3 px-2 text-slate-300 font-semibold">Status</th>
                      <th className="text-right py-3 px-2 text-slate-300 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => {
                      const companyUsers = users.filter(u => u.companyId === company.id);
                      const companyVehicles = users.filter(u => u.companyId === company.id).length;
                      return (
                        <tr key={company.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-2 text-white font-medium">{company.name || 'Unnamed Company'}</td>
                          <td className="py-3 px-2 text-slate-300">{company.country || 'Not Set'}</td>
                          <td className="py-3 px-2 text-slate-300">{company.address?.city || 'Not Set'}</td>
                          <td className="py-3 px-2 text-right text-slate-300">{companyUsers.length}</td>
                          <td className="py-3 px-2 text-right text-slate-300">{companyVehicles}</td>
                          <td className="py-3 px-2 text-right">
                            <span className={`px-2 py-1 rounded text-xs ${
                              company.isActive !== false
                                ? 'bg-green-500/20 text-green-400' 
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {company.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleToggleCompanyStatus(company.id, company.isActive !== false)}
                                className="px-3 py-1 bg-brand-500/20 text-brand-400 rounded hover:bg-brand-500/30 text-xs"
                              >
                                {company.isActive !== false ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleWipeDataRequest(company.id, company.name)}
                                className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-xs"
                                title="Wipe all captured data"
                              >
                                Wipe Data
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-slate-800 rounded-lg p-4 sm:p-6 border border-slate-700">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">
              All Users ({users.length})
            </h2>
            {users.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No users registered yet</p>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="lg:hidden space-y-3">
                  {users.map((user) => {
                    const userCompany = companies.find(c => c.id === user.companyId);
                    return (
                      <div key={user.id} className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm">{user.fullName || user.displayName || user.email?.split('@')[0] || 'No Name'}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <p className="text-slate-400 text-xs truncate">
                                {visibleEmails[user.id] ? (user.email || 'No Email') : maskEmail(user.email)}
                              </p>
                              <button
                                onClick={() => toggleEmailVisibility(user.id)}
                                className="text-slate-400 hover:text-slate-200 transition flex-shrink-0"
                                title={visibleEmails[user.id] ? 'Hide email' : 'Show email'}
                              >
                                {visibleEmails[user.id] ? (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs flex-shrink-0 ${
                            user.isActive === false 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {user.isActive === false ? 'Inactive' : 'Active'}
                          </span>
                        </div>
                        <div className="space-y-2 text-xs mb-3">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Company:</span>
                            <span className="text-slate-300">{userCompany?.name || 'No Company'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Phone:</span>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-300">
                                {visiblePhones[user.id] ? (user.phoneNumber || '-') : maskPhone(user.phoneNumber)}
                              </span>
                              <button
                                onClick={() => togglePhoneVisibility(user.id)}
                                className="text-slate-400 hover:text-slate-200 transition"
                                title={visiblePhones[user.id] ? 'Hide phone' : 'Show phone'}
                              >
                                {visiblePhones[user.id] ? (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Role:</span>
                            <select
                              value={user.role || 'company_user'}
                              onChange={(e) => handleUpdateUserRole(user.id, e.target.value, user.fullName || user.displayName || user.email)}
                              className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 text-xs focus:border-blue-500 focus:outline-none"
                            >
                              <option value="system_admin">System Admin</option>
                              <option value="company_admin">Company Admin</option>
                              <option value="company_manager">Company Manager</option>
                              <option value="company_user">Driver</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleEmailUser(user)}
                            className="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition flex items-center justify-center gap-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email
                          </button>
                          <button
                            onClick={() => handleDeactivateUser(user.id, user.fullName || user.displayName || user.email, user.isActive !== false)}
                            className={`flex-1 px-2 py-1.5 rounded text-xs transition ${
                              user.isActive === false
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-orange-600 hover:bg-orange-700 text-white'
                            }`}
                          >
                            {user.isActive === false ? 'Activate' : 'Deactivate'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.fullName || user.displayName || user.email)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-2 text-slate-300 font-semibold">Name</th>
                      <th className="text-left py-3 px-2 text-slate-300 font-semibold">Email</th>
                      <th className="text-left py-3 px-2 text-slate-300 font-semibold">Phone</th>
                      <th className="text-left py-3 px-2 text-slate-300 font-semibold">Company</th>
                      <th className="text-left py-3 px-2 text-slate-300 font-semibold">Role</th>
                      <th className="text-left py-3 px-2 text-slate-300 font-semibold">Status</th>
                      <th className="text-right py-3 px-2 text-slate-300 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const userCompany = companies.find(c => c.id === user.companyId);
                      return (
                        <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-2 text-white">{user.fullName || user.displayName || user.email?.split('@')[0] || 'No Name'}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300">
                                {visibleEmails[user.id] ? (user.email || 'No Email') : maskEmail(user.email)}
                              </span>
                              <button
                                onClick={() => toggleEmailVisibility(user.id)}
                                className="text-slate-400 hover:text-slate-200 transition"
                                title={visibleEmails[user.id] ? 'Hide email' : 'Show email'}
                              >
                                {visibleEmails[user.id] ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-300">
                                {visiblePhones[user.id] ? (user.phoneNumber || '-') : maskPhone(user.phoneNumber)}
                              </span>
                              <button
                                onClick={() => togglePhoneVisibility(user.id)}
                                className="text-slate-400 hover:text-slate-200 transition"
                                title={visiblePhones[user.id] ? 'Hide phone' : 'Show phone'}
                              >
                                {visiblePhones[user.id] ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-slate-300">{userCompany?.name || 'No Company'}</td>
                          <td className="py-3 px-2">
                            <select
                              value={user.role || 'company_user'}
                              onChange={(e) => handleUpdateUserRole(user.id, e.target.value, user.fullName || user.displayName || user.email)}
                              className="bg-slate-900 text-white px-3 py-1.5 rounded border border-slate-600 text-xs focus:border-blue-500 focus:outline-none"
                            >
                              <option value="system_admin">System Admin</option>
                              <option value="company_admin">Company Admin</option>
                              <option value="company_manager">Company Manager</option>
                              <option value="company_user">Driver</option>
                            </select>
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              user.isActive === false 
                                ? 'bg-red-500/20 text-red-400' 
                                : 'bg-green-500/20 text-green-400'
                            }`}>
                              {user.isActive === false ? 'Inactive' : 'Active'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEmailUser(user)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition flex items-center gap-1"
                                title="Send Email"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Email
                              </button>
                              <button
                                onClick={() => handleDeactivateUser(user.id, user.fullName || user.displayName || user.email, user.isActive !== false)}
                                className={`px-3 py-1.5 rounded text-xs transition ${
                                  user.isActive === false
                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                                }`}
                                title={user.isActive === false ? 'Activate User' : 'Deactivate User'}
                              >
                                {user.isActive === false ? 'Activate' : 'Deactivate'}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.fullName || user.displayName || user.email)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition"
                                title="Delete User"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl border border-red-500/30 p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Delete User</h3>
            </div>
            
            <p className="text-slate-300 mb-6">
              Are you sure you want to permanently delete <span className="font-semibold text-white">{deleteModal.userName}</span>?
              <br /><br />
              This action cannot be undone and will remove the user from the database.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={cancelDeleteUser}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email User Modal */}
      {emailModal.show && emailModal.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-2xl border border-blue-500/30 p-5 max-w-lg w-full shadow-2xl my-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white">Send Email</h3>
                <p className="text-xs text-slate-400 truncate">To: {emailModal.user.fullName || emailModal.user.displayName || emailModal.user.email}</p>
              </div>
            </div>

            {/* User Info Display */}
            <div className="bg-slate-900 rounded-lg p-3 border border-slate-700 mb-3">
              <p className="text-xs text-slate-400 mb-1.5">Recipient</p>
              <div className="space-y-0.5">
                <p className="text-white text-xs">
                  <span className="text-slate-400">Email:</span> {emailModal.user.email}
                </p>
                <p className="text-white text-xs">
                  <span className="text-slate-400">Company:</span> {companies.find(c => c.id === emailModal.user.companyId)?.name || 'No Company'}
                </p>
              </div>
            </div>

            {/* Email Form */}
            <div className="space-y-3">
              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Subject *
                </label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                  placeholder="Enter email subject"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Message *
                </label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })}
                  placeholder="Type your message here..."
                  rows="5"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Important Note */}
              <div className="bg-amber-500/10 rounded-lg p-2.5 border border-amber-500/30">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div className="text-xs text-amber-200">
                    <p className="font-semibold mb-0.5">Important:</p>
                    <p>Make sure to send from <span className="font-semibold">poscomlimited@gmail.com</span> in your email client.</p>
                  </div>
                </div>
              </div>

              {/* Signature Preview */}
              <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1.5">Auto-signature:</p>
                <div className="flex items-center gap-2">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient shadow-brand flex-shrink-0">
                    <div className="absolute inset-0 rounded-full bg-brand-gradient opacity-75 blur-sm"></div>
                    <div className="relative z-10 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-slate-900">
                      <img 
                        src="/FleetTrack-logo.png" 
                        alt="FleetTrack" 
                        className="h-5 w-5 object-contain" 
                      />
                    </div>
                  </div>
                  <div className="text-xs text-slate-300 space-y-0.5">
                    <p className="font-semibold">System Administrator</p>
                    <p className="text-slate-400">FleetTrack | poscomlimited@gmail.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setEmailModal({ show: false, user: null });
                  setEmailForm({ subject: '', message: '' });
                }}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe Data Confirmation Modal */}
      {wipeDataModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-slate-800 rounded-2xl border border-red-500/30 p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Wipe Company Data?</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-200 font-semibold mb-2">⚠️ CRITICAL WARNING</p>
              <p className="text-sm text-slate-300 mb-2">
                You are about to permanently delete ALL captured data for:
              </p>
              <p className="text-base font-bold text-white mb-3">{wipeDataModal.companyName}</p>
              <p className="text-sm text-slate-300 mb-2">This will delete:</p>
              <ul className="text-sm text-slate-300 list-disc list-inside space-y-1 mb-3">
                <li>All daily entries and mileage records</li>
                <li>All expenses and financial data</li>
                <li>All trip logs and history</li>
              </ul>
              <p className="text-sm text-amber-300 font-semibold">
                ✓ Vehicles, users, and company profile will be preserved
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Type <span className="text-red-400 font-bold">WIPE DATA</span> to confirm:
              </label>
              <input
                type="text"
                value={wipeDataModal.confirmText}
                onChange={(e) => setWipeDataModal({ ...wipeDataModal, confirmText: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-red-500"
                placeholder="Type WIPE DATA here"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setWipeDataModal({ show: false, companyId: null, companyName: '', confirmText: '' })}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleWipeDataConfirm}
                disabled={wipeDataModal.confirmText !== 'WIPE DATA'}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Wipe All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemAdminDashboard;
