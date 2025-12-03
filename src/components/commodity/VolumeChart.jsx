import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

const VolumeChart = () => {
  const { company } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVolumeData();
  }, [company]);

  const loadVolumeData = async () => {
    if (!company?.id) return;

    try {
      setLoading(true);

      // Get last 7 days of data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch offload events (deliveries)
      const offloadRef = collection(db, 'offloadEvents');
      const offloadQuery = query(
        offloadRef,
        where('companyId', '==', company.id),
        where('offloadDate', '>=', Timestamp.fromDate(sevenDaysAgo))
      );
      const offloadSnapshot = await getDocs(offloadQuery);

      // Group by date
      const volumeByDate = {};
      offloadSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.offloadDate?.toDate() || new Date(data.offloadDate);
        const dateKey = date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
        
        if (!volumeByDate[dateKey]) {
          volumeByDate[dateKey] = {
            date: dateKey,
            diesel: 0,
            lpGas: 0,
            total: 0
          };
        }

        const quantity = parseFloat(data.offloadQuantity) || 0;
        if (data.commodityType === 'diesel') {
          volumeByDate[dateKey].diesel += quantity;
        } else if (data.commodityType === 'lpGas') {
          volumeByDate[dateKey].lpGas += quantity;
        }
        volumeByDate[dateKey].total += quantity;
      });

      // Convert to array and sort by date
      const chartData = Object.values(volumeByDate).slice(-7);
      setData(chartData);

    } catch (error) {
      console.error('Error loading volume data:', error);
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
          <p className="text-lg font-semibold">No delivery data yet</p>
          <p className="text-sm mt-1">Record deliveries to see volume trends</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorDiesel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b86c4" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b86c4" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="colorLpGas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={{ stroke: '#d1d5db' }}
        />
        <YAxis 
          tick={{ fill: '#6b7280', fontSize: 11 }}
          axisLine={{ stroke: '#d1d5db' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#fff', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            fontSize: '12px'
          }}
          formatter={(value) => [`${value.toLocaleString()} L/kg`, '']}
        />
        <Legend 
          wrapperStyle={{ fontSize: '11px' }}
          iconType="circle"
        />
        <Area 
          type="monotone" 
          dataKey="diesel" 
          stroke="#3b86c4" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorDiesel)" 
          name="Diesel (L)"
        />
        <Area 
          type="monotone" 
          dataKey="lpGas" 
          stroke="#f59e0b" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorLpGas)" 
          name="LP Gas (kg)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default VolumeChart;
