import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot
} from 'recharts';
import client from '../api/client';

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  if (payload.healingActive) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={6} fill="#dc2626" />
        <text x={cx} y={cy - 10} textAnchor="middle" fill="#dc2626" fontSize="10px" fontWeight="700">healed</text>
      </g>
    );
  }
  return <Dot {...props} r={4} fill="#7F77DD" />;
};

export default function TrustScorePanel() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await client.get('/api/trust-score/history');
      setHistory(res.data.history || []);
    } catch (e) {
      console.error('Failed to fetch trust history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading trust data...</div>;

  const latest = history.length > 0 ? history[history.length - 1] : null;

  const getScoreColor = (score) => {
    if (score >= 80) return '#16a34a';
    if (score >= 60) return '#ea580c';
    return '#dc2626';
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>AI Trust Score</div>
          <div style={{ fontSize: '32px', fontWeight: '800', color: latest ? getScoreColor(latest.overallScore) : '#1e293b' }}>
            {latest ? `${latest.overallScore}/100` : '--'}
          </div>
        </div>
        {latest?.healingActive && (
          <div style={{ background: '#fef2f2', color: '#991b1b', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', border: '1px solid #fee2e2' }}>
            Self-Healing Active
          </div>
        )}
      </div>

      <div style={{ height: '240px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTime} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              minTickGap={20}
            />
            <YAxis 
              domain={[0, 100]} 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10 }} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              labelFormatter={(ts) => new Date(ts).toLocaleString()}
            />
            <ReferenceLine y={80} stroke="#16a34a" strokeDasharray="3 3" label={{ position: 'right', value: 'Good', fill: '#16a34a', fontSize: 10 }} />
            <ReferenceLine y={60} stroke="#ea580c" strokeDasharray="3 3" label={{ position: 'right', value: 'Warning', fill: '#ea580c', fontSize: 10 }} />
            <Line 
              type="monotone" 
              dataKey="overallScore" 
              stroke="#7F77DD" 
              strokeWidth={3} 
              dot={<CustomDot />}
              activeDot={{ r: 8, fill: '#7F77DD' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
