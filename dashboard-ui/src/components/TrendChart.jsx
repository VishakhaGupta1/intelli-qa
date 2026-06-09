import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
export default function TrendChart({ data }) {
  if (!data || data.length === 0) return (
    <div style={{background:'#fff',borderRadius:'16px',padding:'40px',border:'1px solid #e2e8f0',textAlign:'center',color:'#64748b'}}>
      No trend data yet.
    </div>
  );
  return (
    <div style={{background:'#fff',borderRadius:'16px',padding:'20px',border:'1px solid #e2e8f0',boxShadow:'0 10px 30px rgba(15,23,42,0.06)'}}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{top:5,right:20,left:0,bottom:5}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{fontSize:12}} tickFormatter={d => d.slice(5)} />
          <YAxis domain={[0,100]} tick={{fontSize:12}} unit="%" />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
          <Line type="monotone" dataKey="apiPassRate" stroke="#2563eb" strokeWidth={2} dot={false} name="API tests" />
          <Line type="monotone" dataKey="uiPassRate" stroke="#16a34a" strokeWidth={2} dot={false} name="UI tests" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
