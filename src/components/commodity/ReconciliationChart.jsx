import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const ReconciliationChart = () => {
  const { company } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReconciliationData();
  }, [company]);

  const loadReconciliationData = async () => {
    if (!company?.id) return;

    try {
      setLoading(true);

      // Fetch all offload events
      const offloadRef = collection(db, 'offloadEvents');
      const offloadQuery = query(
        offloadRef,
        where('companyId', '==', company.id)
      );
      const offloadSnapshot = await getDocs(offloadQuery);

      // Count by reconciliation status
      const statusCounts = {
        matched: 0,
        minor_variance: 0,
        major_variance: 0,
        pending: 0
      };

      offloadSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.reconciliationStatus || 'pending';
        if (statusCounts.hasOwnProperty(status)) {
          statusCounts[status]++;
        }
      });

      // Convert to chart data
      const chartData = [
        { name: 'Matched', value: statusCounts.matched, color: '#10b981' },
        { name: 'Minor Variance', value: statusCounts.minor_variance, color: '#f59e0b' },
        { name: 'Major Variance', value: statusCounts.major_variance, color: '#ef4444' },
        { name: 'Pending', value: statusCounts.pending, color: '#3b86c4' }
      ].filter(item => item.value > 0); // Only show non-zero values

      setData(chartData);

    } catch (error) {
      console.error('Error loading reconciliation data:', error);
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
          <p className="text-lg font-semibold">No reconciliation data yet</p>
          <p className="text-sm mt-1">Record deliveries to see reconciliation status</p>
        </div>
      </div>
    );
  }

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="14"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          formatter={(value, name) => [`${value} deliveries`, name]}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          wrapperStyle={{ fontSize: '12px' }}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default ReconciliationChart;
