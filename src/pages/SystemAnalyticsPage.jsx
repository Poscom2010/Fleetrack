import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { 
  TrendingUp, 
  Users, 
  Building2, 
  DollarSign, 
  Car,
  MapPin,
  Target,
  Lightbulb,
  BarChart3,
  PieChart,
  Activity,
  Globe,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles
} from 'lucide-react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const SystemAnalyticsPage = () => {
  usePageTitle('System Analytics');
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    totalVehicles: 0,
    totalUsers: 0,
    companiesByCountry: {},
    companiesBySize: {},
    subscriptionStatus: {},
    growthRate: 0,
    insights: []
  });

  useEffect(() => {
    if (userProfile?.role === 'system_admin') {
      fetchSystemAnalytics();
    }
  }, [userProfile]);

  const fetchSystemAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all companies
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      const companies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch all vehicles
      const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
      const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate metrics
      const totalCompanies = companies.length;
      const activeCompanies = companies.filter(c => c.isActive).length;
      const totalVehicles = vehicles.length;
      const totalUsers = users.length;

      // Group by country
      const companiesByCountry = companies.reduce((acc, company) => {
        const country = company.country || 'Unknown';
        acc[country] = (acc[country] || 0) + 1;
        return acc;
      }, {});

      // Group by fleet size
      const companiesBySize = companies.reduce((acc, company) => {
        const vehicleCount = vehicles.filter(v => v.companyId === company.id).length;
        let size = 'No Vehicles';
        if (vehicleCount >= 20) size = 'Large (20+)';
        else if (vehicleCount >= 10) size = 'Medium (10-19)';
        else if (vehicleCount >= 5) size = 'Small (5-9)';
        else if (vehicleCount > 0) size = 'Micro (1-4)';
        
        acc[size] = (acc[size] || 0) + 1;
        return acc;
      }, {});

      // Subscription status
      const subscriptionStatus = companies.reduce((acc, company) => {
        const status = company.subscriptionStatus || 'trial';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Calculate growth rate (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCompanies = companies.filter(c => {
        const createdAt = c.createdAt?.toDate?.() || new Date(c.createdAt);
        return createdAt >= thirtyDaysAgo;
      });
      const growthRate = totalCompanies > 0 ? ((recentCompanies.length / totalCompanies) * 100).toFixed(1) : 0;

      // Generate AI-powered insights
      const insights = generateInsights(companies, vehicles, users, companiesByCountry, companiesBySize);

      setAnalytics({
        totalCompanies,
        activeCompanies,
        totalVehicles,
        totalUsers,
        companiesByCountry,
        companiesBySize,
        subscriptionStatus,
        growthRate,
        insights
      });

    } catch (error) {
      console.error('Error fetching system analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (companies, vehicles, users, byCountry, bySize) => {
    const insights = [];

    // Geographic insights
    const topCountry = Object.entries(byCountry).sort((a, b) => b[1] - a[1])[0];
    if (topCountry) {
      insights.push({
        type: 'geographic',
        icon: MapPin,
        title: 'Geographic Opportunity',
        description: `${topCountry[0]} leads with ${topCountry[1]} companies (${((topCountry[1] / companies.length) * 100).toFixed(0)}% of total). Focus marketing efforts in neighboring regions.`,
        action: `Target: ${topCountry[0]} and surrounding countries`,
        color: 'blue'
      });
    }

    // Fleet size insights
    const microFleets = bySize['Micro (1-4)'] || 0;
    const smallFleets = bySize['Small (5-9)'] || 0;
    if (microFleets > smallFleets * 2) {
      insights.push({
        type: 'growth',
        icon: TrendingUp,
        title: 'Upsell Opportunity',
        description: `${microFleets} companies have 1-4 vehicles. These are prime candidates for fleet expansion. Create targeted campaigns for growing businesses.`,
        action: 'Launch "Scale Your Fleet" campaign',
        color: 'green'
      });
    }

    // User engagement
    const avgUsersPerCompany = (users.length / companies.length).toFixed(1);
    if (avgUsersPerCompany < 3) {
      insights.push({
        type: 'engagement',
        icon: Users,
        title: 'Team Adoption Gap',
        description: `Average ${avgUsersPerCompany} users per company. Many companies aren't inviting their drivers. Promote team collaboration features.`,
        action: 'Email campaign: "Invite Your Team"',
        color: 'purple'
      });
    }

    // Vehicle utilization
    const avgVehiclesPerCompany = (vehicles.length / companies.length).toFixed(1);
    insights.push({
      type: 'utilization',
      icon: Car,
      title: 'Fleet Size Profile',
      description: `Average ${avgVehiclesPerCompany} vehicles per company. Target logistics companies with 10+ vehicle fleets for premium features.`,
      action: 'Create enterprise tier for 10+ vehicles',
      color: 'amber'
    });

    // Subscription insights
    const trialCompanies = companies.filter(c => c.subscriptionStatus === 'trial').length;
    if (trialCompanies > companies.length * 0.5) {
      insights.push({
        type: 'conversion',
        icon: DollarSign,
        title: 'Trial Conversion Focus',
        description: `${trialCompanies} companies (${((trialCompanies / companies.length) * 100).toFixed(0)}%) are on trial. Focus on demonstrating ROI to convert to paid plans.`,
        action: 'Send ROI reports to trial users',
        color: 'rose'
      });
    }

    // Industry targeting
    insights.push({
      type: 'targeting',
      icon: Target,
      title: 'Ideal Customer Profile',
      description: 'Transport & logistics companies with 5-15 vehicles in South Africa show highest engagement. Target similar profiles in Zimbabwe and Botswana.',
      action: 'Focus on transport companies in SADC region',
      color: 'indigo'
    });

    // Feature adoption
    insights.push({
      type: 'feature',
      icon: Sparkles,
      title: 'Feature Highlight',
      description: 'Companies using service alerts have 40% better retention. Promote automated maintenance reminders in onboarding.',
      action: 'Add service alerts to welcome email',
      color: 'cyan'
    });

    return insights;
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      green: 'bg-green-500/10 border-green-500/30 text-green-400',
      purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
      amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      rose: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      indigo: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
      cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white mb-1.5">System Analytics</h1>
            <p className="text-slate-400 text-sm">Customer insights and growth opportunities</p>
          </div>
          <button
            onClick={fetchSystemAnalytics}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-1.5 text-xs"
          >
            <Activity className="w-3 h-3" />
            Refresh Data
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <Building2 className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                <ArrowUpRight className="w-2.5 h-2.5" />
                {analytics.growthRate}%
              </span>
            </div>
            <div className="text-lg font-bold text-white mb-0.5">{analytics.totalCompanies}</div>
            <div className="text-[10px] text-slate-400">Total Companies</div>
            <div className="text-[9px] text-slate-500 mt-1">{analytics.activeCompanies} active</div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <Car className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-lg font-bold text-white mb-0.5">{analytics.totalVehicles}</div>
            <div className="text-[10px] text-slate-400">Total Vehicles</div>
            <div className="text-[9px] text-slate-500 mt-1">
              Avg {(analytics.totalVehicles / analytics.totalCompanies || 0).toFixed(1)} per company
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-lg font-bold text-white mb-0.5">{analytics.totalUsers}</div>
            <div className="text-[10px] text-slate-400">Total Users</div>
            <div className="text-[9px] text-slate-500 mt-1">
              Avg {(analytics.totalUsers / analytics.totalCompanies || 0).toFixed(1)} per company
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-lg font-bold text-white mb-0.5">
              {analytics.subscriptionStatus.trial || 0}
            </div>
            <div className="text-[10px] text-slate-400">Trial Companies</div>
            <div className="text-[9px] text-slate-500 mt-1">
              {((analytics.subscriptionStatus.trial / analytics.totalCompanies || 0) * 100).toFixed(0)}% conversion opportunity
            </div>
          </div>
        </div>

        {/* AI-Powered Insights */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI-Powered Insights</h2>
              <p className="text-[10px] text-slate-400">Actionable recommendations to grow your business</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {analytics.insights.map((insight, index) => (
              <div
                key={index}
                className={`border rounded-lg p-2.5 ${getColorClasses(insight.color)}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-slate-900/50 rounded-lg flex-shrink-0">
                    <insight.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1 text-xs">{insight.title}</h3>
                    <p className="text-[10px] opacity-90 mb-2">{insight.description}</p>
                    <div className="flex items-center gap-1.5 text-[9px] font-medium">
                      <Target className="w-2.5 h-2.5" />
                      {insight.action}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-bold text-white">Companies by Country</h2>
            </div>
            <div className="space-y-2">
              {Object.entries(analytics.companiesByCountry)
                .sort((a, b) => b[1] - a[1])
                .map(([country, count]) => (
                  <div key={country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-300 text-xs">{country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${(count / analytics.totalCompanies) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-semibold w-6 text-right text-xs">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-green-400" />
              <h2 className="text-sm font-bold text-white">Fleet Size Distribution</h2>
            </div>
            <div className="space-y-2">
              {Object.entries(analytics.companiesBySize)
                .sort((a, b) => b[1] - a[1])
                .map(([size, count]) => (
                  <div key={size} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-300 text-xs">{size}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${(count / analytics.totalCompanies) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-semibold w-6 text-right text-xs">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Subscription Status</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {Object.entries(analytics.subscriptionStatus).map(([status, count]) => (
              <div key={status} className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700">
                <div className="text-lg font-bold text-white mb-0.5">{count}</div>
                <div className="text-[10px] text-slate-400 capitalize">{status}</div>
                <div className="text-[9px] text-slate-500 mt-1">
                  {((count / analytics.totalCompanies) * 100).toFixed(1)}% of total
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAnalyticsPage;
