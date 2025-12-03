import { db } from './firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';

/**
 * AI Insights Service
 * 
 * Provides intelligent insights using advanced rule-based analysis.
 * 
 * Features:
 * - Revenue & profit analysis
 * - Commodity performance comparison (Diesel vs LP Gas)
 * - Variance detection & accuracy metrics
 * - Cost efficiency analysis
 * - Vehicle utilization tracking
 * - Predictive analytics (30-day forecasts)
 * - Smart recommendations with prioritization
 * 
 * Note: External AI API integration disabled due to CORS restrictions.
 * The rule-based engine provides comprehensive insights without external dependencies.
 */

const HF_API_KEY = ''; // Disabled - using rule-based insights only
const HF_API_URL = 'https://api-inference.huggingface.co/models/';

/**
 * Generate AI insights for a company's commodity operations
 */
export const generateAIInsights = async (companyId, dateRange = 30) => {
  try {
    // Check if AI is enabled for this company
    const companyDoc = await getDoc(doc(db, 'companies', companyId));
    const companyData = companyDoc.data();
    
    if (!companyData?.aiInsightsEnabled) {
      return {
        enabled: false,
        message: 'AI Insights are not enabled for your account. Contact your administrator.'
      };
    }

    // Fetch company data
    const data = await fetchCompanyData(companyId, dateRange);
    
    // Generate insights using both rule-based and AI
    const ruleBasedInsights = generateRuleBasedInsights(data);
    const aiEnhancedInsights = HF_API_KEY 
      ? await enhanceWithAI(ruleBasedInsights, data)
      : ruleBasedInsights;
    
    return {
      enabled: true,
      insights: aiEnhancedInsights,
      summary: generateSummary(data),
      recommendations: generateRecommendations(data),
      predictions: generatePredictions(data)
    };
  } catch (error) {
    console.error('Error generating AI insights:', error);
    throw error;
  }
};

/**
 * Fetch all relevant company data for analysis
 */
const fetchCompanyData = async (companyId, days) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Fetch load events
  const loadQuery = query(
    collection(db, 'loadEvents'),
    where('companyId', '==', companyId),
    where('loadDate', '>=', Timestamp.fromDate(startDate)),
    where('loadDate', '<=', Timestamp.fromDate(endDate))
  );
  const loadSnapshot = await getDocs(loadQuery);
  const loads = loadSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Fetch offload events
  const offloadQuery = query(
    collection(db, 'offloadEvents'),
    where('companyId', '==', companyId),
    where('offloadDate', '>=', Timestamp.fromDate(startDate)),
    where('offloadDate', '<=', Timestamp.fromDate(endDate))
  );
  const offloadSnapshot = await getDocs(offloadQuery);
  const offloads = offloadSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Fetch invoices
  const invoiceQuery = query(
    collection(db, 'invoices'),
    where('companyId', '==', companyId),
    where('invoiceDate', '>=', Timestamp.fromDate(startDate)),
    where('invoiceDate', '<=', Timestamp.fromDate(endDate))
  );
  const invoiceSnapshot = await getDocs(invoiceQuery);
  const invoices = invoiceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Fetch expenses
  const expensesQuery = query(
    collection(db, 'tripExpenses'),
    where('companyId', '==', companyId)
  );
  const expensesSnapshot = await getDocs(expensesQuery);
  const allExpenses = expensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const expenses = allExpenses.filter(exp => {
    const expDate = exp.date?.toDate() || exp.expenseDate?.toDate();
    return expDate && expDate >= startDate && expDate <= endDate;
  });

  // Fetch vehicles
  const vehiclesQuery = query(
    collection(db, 'vehicles'),
    where('companyId', '==', companyId)
  );
  const vehiclesSnapshot = await getDocs(vehiclesQuery);
  const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return {
    loads,
    offloads,
    invoices,
    expenses,
    vehicles,
    dateRange: { start: startDate, end: endDate, days }
  };
};

/**
 * Generate rule-based insights (works without AI API)
 */
const generateRuleBasedInsights = (data) => {
  const insights = [];
  const { loads, offloads, invoices, expenses, vehicles } = data;

  // Calculate metrics
  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Diesel vs LP Gas analysis
  const dieselLoads = loads.filter(l => l.commodityType === 'diesel');
  const lpGasLoads = loads.filter(l => l.commodityType === 'lpGas');
  const dieselRevenue = invoices.filter(inv => {
    const relatedOffload = offloads.find(o => o.id === inv.offloadEventId);
    const relatedLoad = loads.find(l => l.id === relatedOffload?.loadEventId);
    return relatedLoad?.commodityType === 'diesel';
  }).reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const lpGasRevenue = totalRevenue - dieselRevenue;

  // Variance analysis
  const avgVariance = offloads.length > 0
    ? offloads.reduce((sum, o) => sum + Math.abs(o.variance || 0), 0) / offloads.length
    : 0;
  const highVarianceOffloads = offloads.filter(o => Math.abs(o.variance || 0) > 50);

  // Revenue insight
  if (totalRevenue > 0) {
    insights.push({
      type: 'revenue',
      severity: totalProfit > 0 ? 'success' : 'warning',
      title: totalProfit > 0 ? 'Strong Revenue Performance' : 'Revenue Generated',
      message: `Generated R ${totalRevenue.toLocaleString()} in revenue over the last ${data.dateRange.days} days with a ${profitMargin.toFixed(1)}% profit margin.`,
      metric: totalRevenue,
      icon: '💰'
    });
  }

  // Profit insight
  if (totalProfit > 0) {
    insights.push({
      type: 'profit',
      severity: 'success',
      title: 'Profitable Operations',
      message: `Net profit of R ${totalProfit.toLocaleString()} achieved. ${profitMargin > 20 ? 'Excellent' : profitMargin > 10 ? 'Good' : 'Moderate'} profit margin of ${profitMargin.toFixed(1)}%.`,
      metric: totalProfit,
      icon: '📈'
    });
  } else if (totalProfit < 0) {
    insights.push({
      type: 'loss',
      severity: 'danger',
      title: 'Operating at a Loss',
      message: `Current loss of R ${Math.abs(totalProfit).toLocaleString()}. Review expenses and pricing strategy.`,
      metric: totalProfit,
      icon: '⚠️'
    });
  }

  // Commodity comparison
  if (dieselLoads.length > 0 && lpGasLoads.length > 0) {
    const dieselPerTrip = dieselRevenue / dieselLoads.length;
    const lpGasPerTrip = lpGasRevenue / lpGasLoads.length;
    const moreProfitable = dieselPerTrip > lpGasPerTrip ? 'Diesel' : 'LP Gas';
    const difference = Math.abs(((dieselPerTrip - lpGasPerTrip) / Math.max(dieselPerTrip, lpGasPerTrip)) * 100);
    
    insights.push({
      type: 'commodity',
      severity: 'info',
      title: 'Commodity Performance Comparison',
      message: `${moreProfitable} operations are ${difference.toFixed(0)}% more profitable per trip (R ${Math.max(dieselPerTrip, lpGasPerTrip).toLocaleString()} vs R ${Math.min(dieselPerTrip, lpGasPerTrip).toLocaleString()}).`,
      metric: difference,
      icon: '⛽'
    });
  }

  // Variance insight
  if (highVarianceOffloads.length > 0) {
    insights.push({
      type: 'variance',
      severity: 'warning',
      title: 'High Variance Detected',
      message: `${highVarianceOffloads.length} deliveries have variance >50L. Average variance is ${avgVariance.toFixed(1)}L. Consider tank calibration.`,
      metric: avgVariance,
      icon: '📊'
    });
  } else if (avgVariance < 10) {
    insights.push({
      type: 'variance',
      severity: 'success',
      title: 'Excellent Accuracy',
      message: `Average variance of only ${avgVariance.toFixed(1)}L indicates excellent measurement accuracy and minimal losses.`,
      metric: avgVariance,
      icon: '✅'
    });
  }

  // Expense ratio insight
  const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
  if (expenseRatio > 70) {
    insights.push({
      type: 'expenses',
      severity: 'warning',
      title: 'High Expense Ratio',
      message: `Expenses are ${expenseRatio.toFixed(0)}% of revenue. Industry standard is 60-70%. Review cost optimization opportunities.`,
      metric: expenseRatio,
      icon: '💸'
    });
  } else if (expenseRatio < 60) {
    insights.push({
      type: 'expenses',
      severity: 'success',
      title: 'Efficient Cost Management',
      message: `Expenses are only ${expenseRatio.toFixed(0)}% of revenue, below industry average. Excellent cost control.`,
      metric: expenseRatio,
      icon: '💚'
    });
  }

  // Vehicle utilization
  const vehiclePerformance = vehicles.map(vehicle => {
    const vehicleLoads = loads.filter(l => l.vehicleId === vehicle.id);
    return {
      vehicle,
      trips: vehicleLoads.length
    };
  });
  const avgTripsPerVehicle = vehiclePerformance.reduce((sum, v) => sum + v.trips, 0) / vehicles.length;
  const underutilized = vehiclePerformance.filter(v => v.trips < avgTripsPerVehicle * 0.5 && v.trips > 0);
  
  if (underutilized.length > 0) {
    const vehicle = underutilized[0].vehicle;
    insights.push({
      type: 'utilization',
      severity: 'info',
      title: 'Low Vehicle Utilization',
      message: `${vehicle.name || vehicle.registrationNumber} completed only ${underutilized[0].trips} trips vs ${avgTripsPerVehicle.toFixed(0)} average. Consider route optimization.`,
      metric: underutilized[0].trips,
      icon: '🚛'
    });
  }

  return insights;
};

/**
 * Enhance insights with AI (currently disabled due to CORS restrictions)
 * 
 * The rule-based insights engine already provides comprehensive analysis including:
 * - Revenue & profit trends
 * - Commodity performance comparison
 * - Variance analysis
 * - Cost efficiency metrics
 * - Vehicle utilization
 * - Predictive forecasts
 * 
 * External AI API integration can be re-enabled via backend proxy if needed.
 */
const enhanceWithAI = async (insights, data) => {
  // Return rule-based insights without external API call
  // These insights are already comprehensive and actionable
  return insights;
};

/**
 * Generate executive summary
 */
const generateSummary = (data) => {
  const { loads, offloads, invoices, expenses } = data;
  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalProfit = totalRevenue - totalExpenses;
  const perfectDeliveries = offloads.filter(o => o.reconciliationStatus === 'matched').length;
  const accuracyRate = offloads.length > 0 ? (perfectDeliveries / offloads.length) * 100 : 0;

  return {
    totalRevenue,
    totalExpenses,
    totalProfit,
    profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    totalTrips: loads.length,
    accuracyRate,
    period: `Last ${data.dateRange.days} days`
  };
};

/**
 * Generate actionable recommendations
 */
const generateRecommendations = (data) => {
  const recommendations = [];
  const { loads, offloads, invoices, expenses, vehicles } = data;

  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;

  // High expense ratio recommendation
  if (expenseRatio > 70) {
    recommendations.push({
      priority: 'high',
      category: 'Financial',
      title: 'Reduce Operating Costs',
      description: `Your expense ratio is ${expenseRatio.toFixed(0)}%, above the 70% threshold`,
      actions: [
        'Review fuel consumption and optimize routes',
        'Negotiate better rates with suppliers',
        'Implement preventive maintenance to reduce breakdowns',
        'Consider bulk purchasing for frequently used items'
      ],
      potentialImpact: `Reducing expenses by 10% could increase profit by R ${(totalExpenses * 0.1).toLocaleString()}`
    });
  }

  // High variance recommendation
  const avgVariance = offloads.length > 0
    ? offloads.reduce((sum, o) => sum + Math.abs(o.variance || 0), 0) / offloads.length
    : 0;
  const highVarianceVehicles = [...new Set(
    offloads
      .filter(o => Math.abs(o.variance || 0) > 50)
      .map(o => loads.find(l => l.id === o.loadEventId)?.vehicleId)
      .filter(Boolean)
  )];

  if (highVarianceVehicles.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'Operations',
      title: 'Address High Variance Issues',
      description: `${highVarianceVehicles.length} vehicle(s) have consistently high variance`,
      actions: [
        'Schedule tank calibration for affected vehicles',
        'Provide driver training on proper loading/offloading procedures',
        'Check for leaks or measurement equipment issues',
        'Review loading procedures at depot'
      ],
      potentialSavings: `Could reduce losses by ${(highVarianceVehicles.length * 50 * 30).toLocaleString()}L/month`
    });
  }

  // Low utilization recommendation
  const vehicleTrips = vehicles.map(v => ({
    vehicle: v,
    trips: loads.filter(l => l.vehicleId === v.id).length
  }));
  const avgTrips = vehicleTrips.reduce((sum, v) => sum + v.trips, 0) / vehicles.length;
  const underutilized = vehicleTrips.filter(v => v.trips < avgTrips * 0.5 && v.trips > 0);

  if (underutilized.length > 0) {
    recommendations.push({
      priority: 'low',
      category: 'Fleet Management',
      title: 'Improve Vehicle Utilization',
      description: `${underutilized.length} vehicle(s) are underutilized`,
      actions: [
        'Review route assignments and optimize scheduling',
        'Consider consolidating routes for better efficiency',
        'Analyze demand patterns to match vehicle capacity',
        'Evaluate if fleet size matches current demand'
      ],
      potentialImpact: `Better utilization could increase revenue by 15-20%`
    });
  }

  return recommendations;
};

/**
 * Generate predictive analytics
 */
const generatePredictions = (data) => {
  const { loads, invoices, expenses } = data;
  
  // Simple linear trend analysis
  const revenueByWeek = {};
  invoices.forEach(inv => {
    const week = getWeekKey(inv.invoiceDate?.toDate());
    revenueByWeek[week] = (revenueByWeek[week] || 0) + (Number(inv.total) || 0);
  });

  const weeks = Object.keys(revenueByWeek).sort();
  const revenueValues = weeks.map(w => revenueByWeek[w]);
  
  // Calculate trend
  const avgRevenue = revenueValues.reduce((sum, v) => sum + v, 0) / revenueValues.length;
  const trend = revenueValues.length > 1 
    ? ((revenueValues[revenueValues.length - 1] - revenueValues[0]) / revenueValues[0]) * 100
    : 0;

  // Predict next 30 days
  const predictedRevenue = avgRevenue * (1 + (trend / 100)) * 4; // 4 weeks
  const confidence = Math.min(0.85, 0.5 + (revenueValues.length * 0.05)); // More data = higher confidence

  return {
    revenue: {
      predicted: predictedRevenue,
      confidence,
      range: {
        low: predictedRevenue * 0.9,
        high: predictedRevenue * 1.1
      },
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      trendPercentage: Math.abs(trend)
    },
    expenses: {
      predicted: (expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) / data.dateRange.days) * 30,
      confidence: 0.75
    }
  };
};

const getWeekKey = (date) => {
  if (!date) return 'Unknown';
  const d = new Date(date);
  const weekNum = Math.ceil((d.getDate() - d.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${weekNum}`;
};

/**
 * Toggle AI insights for a company (System Admin only)
 */
export const toggleAIInsights = async (companyId, enabled) => {
  try {
    const companyRef = doc(db, 'companies', companyId);
    await setDoc(companyRef, {
      aiInsightsEnabled: enabled,
      aiInsightsUpdatedAt: Timestamp.now()
    }, { merge: true });
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling AI insights:', error);
    throw error;
  }
};

/**
 * Toggle AI insights globally (System Admin only)
 */
export const toggleAIInsightsGlobally = async (enabled) => {
  try {
    const companiesSnapshot = await getDocs(collection(db, 'companies'));
    const updates = companiesSnapshot.docs.map(doc => 
      setDoc(doc.ref, {
        aiInsightsEnabled: enabled,
        aiInsightsUpdatedAt: Timestamp.now()
      }, { merge: true })
    );
    
    await Promise.all(updates);
    return { success: true, companiesUpdated: updates.length };
  } catch (error) {
    console.error('Error toggling AI insights globally:', error);
    throw error;
  }
};
