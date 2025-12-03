import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const VarianceTrendChart = () => {
  const { company } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVarianceData();
  }, [company]);

  const loadVarianceData = async () => {
    if (!company?.id) return;

    try {
      setLoading(true);

      // Get last 30 days of offload events
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const offloadRef = collection(db, 'offloadEvents');
      const offloadQuery = query(
        offloadRef,
        where('companyId', '==', company.id),
        where('offloadDate', '>=', Timestamp.fromDate(thirtyDaysAgo))
      );
      const offloadSnapshot = await getDocs(offloadQuery);

      // Group by date and calculate average variance
      const varianceByDate = {};
      offloadSnapshot.docs.forEach(doc => {
        const eventData = doc.data();
        const date = eventData.offloadDate?.toDate() || new Date(eventData.offloadDate);
        const dateKey = date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
        
        if (!varianceByDate[dateKey]) {
          varianceByDate[dateKey] = {
            date: dateKey,
            variances: [],
            avgVariance: 0
          };
        }

        const variance = Math.abs(parseFloat(eventData.variancePercentage) || 0);
        varianceByDate[dateKey].variances.push(variance);
      });

      // Calculate averages and format for chart
      const chartData = Object.values(varianceByDate)
        .map(item => ({
          date: item.date,
          variance: item.variances.length > 0 
            ? parseFloat((item.variances.reduce((a, b) => a + b, 0) / item.variances.length).toFixed(2))
            : 0
        }))
        .slice(-14); // Last 14 days

      setData(chartData);

    } catch (error) {
      console.error('Error loading variance data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-baltic-500"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-lg font-semibold">No variance data yet</p>
          <p className="text-sm mt-1">Record deliveries to track variance trends</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={{ stroke: '#d1d5db' }}
        />
        <YAxis 
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={{ stroke: '#d1d5db' }}
          label={{ value: 'Variance %', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 11 } }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            fontSize: '12px'
          }}
          formatter={(value) => [`${value}%`, 'Avg Variance']}
        />
        <Legend 
          wrapperStyle={{ fontSize: '11px' }}
          iconType="circle"
        />
        {/* Reference lines for thresholds */}
        <ReferenceLine y={1} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target (<1%)', position: 'right', fill: '#10b981', fontSize: 10 }} />
        <ReferenceLine y={3} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Alert (>3%)', position: 'right', fill: '#ef4444', fontSize: 10 }} />
        
        <Line 
          type="monotone" 
          dataKey="variance" 
          stroke="#3b86c4" 
          strokeWidth={3}
          dot={{ fill: '#3b86c4', r: 4 }}
          activeDot={{ r: 6 }}
          name="Average Variance"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default VarianceTrendChart;
