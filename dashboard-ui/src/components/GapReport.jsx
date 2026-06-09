export default function GapReport({ gaps }) {
  const list = Array.isArray(gaps) ? gaps : [];
  if (list.length === 0) {
    return <div style={{background:'#fff',borderRadius:'16px',padding:'24px',border:'1px solid #e2e8f0',color:'#64748b'}}>All endpoints covered</div>;
  }

  return (
    <div style={{background:'#fff',borderRadius:'16px',padding:'20px',border:'1px solid #e2e8f0',boxShadow:'0 10px 30px rgba(15,23,42,0.06)'}}>
      <div style={{display:'grid',gap:'10px'}}>
        {list.map((gap, index) => (
          <div key={`${gap.method}-${gap.path}-${index}`} style={{padding:'12px 14px',border:'1px solid #fde68a',background:'#fffbeb',borderRadius:'12px'}}>
            <div style={{fontWeight:'700',color:'#0f172a'}}>{gap.method} {gap.path}</div>
            <div style={{fontSize:'13px',color:'#92400e',marginTop:'4px'}}>{gap.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
