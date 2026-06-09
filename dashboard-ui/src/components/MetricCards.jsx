export default function MetricCards({ metrics }) {
  const safe = metrics || {};
  const cards = [
    { label: 'Total Tests', value: safe.totalTests ?? 0, tone: '#0f172a' },
    { label: 'Pass Rate %', value: safe.passRate ?? 0, tone: '#16a34a' },
    { label: 'Fail Rate %', value: safe.failRate ?? 0, tone: '#dc2626' },
    { label: 'Average Duration', value: `${safe.avgDuration ?? 0} ms`, tone: '#2563eb' },
  ];

  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'16px'}}>
      {cards.map(card => (
        <div key={card.label} style={{background:'#fff',borderRadius:'16px',padding:'20px',border:'1px solid #e2e8f0',boxShadow:'0 10px 30px rgba(15,23,42,0.06)'}}>
          <div style={{fontSize:'12px',color:'#64748b',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.08em'}}>{card.label}</div>
          <div style={{fontSize:'30px',fontWeight:'800',color:card.tone,lineHeight:'1.05'}}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
