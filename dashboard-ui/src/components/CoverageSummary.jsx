export default function CoverageSummary({ coverage }) {
  const covered = Array.isArray(coverage?.covered) ? coverage.covered : [];
  const uncovered = Array.isArray(coverage?.uncovered) ? coverage.uncovered : [];
  const total = covered.length + uncovered.length;
  const percent = coverage?.coveragePercent ?? 0;

  if (total === 0) {
    return <div style={{background:'#fff',borderRadius:'16px',padding:'22px',border:'1px solid #e2e8f0',color:'#64748b'}}>No coverage data yet.</div>;
  }

  return (
    <div style={{background:'#fff',borderRadius:'16px',padding:'22px',border:'1px solid #e2e8f0',boxShadow:'0 10px 30px rgba(15,23,42,0.06)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',gap:'12px'}}>
        <div>
          <div style={{fontSize:'12px',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.08em'}}>Coverage</div>
          <div style={{fontSize:'28px',fontWeight:'800',color:'#2563eb'}}>{percent}%</div>
        </div>
        <div style={{textAlign:'right',color:'#475569'}}>
          <div>Covered: {covered.length}</div>
          <div>Uncovered: {uncovered.length}</div>
        </div>
      </div>
      <div style={{height:'10px',borderRadius:'999px',background:'#e2e8f0',overflow:'hidden',marginBottom:'18px'}}>
        <div style={{width:`${percent}%`,height:'100%',background:'linear-gradient(90deg,#2563eb,#22c55e)'}} />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        <div>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#0f172a',marginBottom:'8px'}}>Covered</div>
          <div style={{display:'grid',gap:'8px'}}>
            {covered.length > 0 ? covered.map((item, index) => (
              <div key={`${item.method}-${item.path}-${index}`} style={{padding:'10px 12px',border:'1px solid #dcfce7',background:'#f0fdf4',borderRadius:'12px',fontSize:'13px'}}>
                {item.method} {item.path}
              </div>
            )) : <div style={{color:'#64748b'}}>None</div>}
          </div>
        </div>
        <div>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#0f172a',marginBottom:'8px'}}>Uncovered</div>
          <div style={{display:'grid',gap:'8px'}}>
            {uncovered.length > 0 ? uncovered.map((item, index) => (
              <div key={`${item.method}-${item.path}-${index}`} style={{padding:'10px 12px',border:'1px solid #fee2e2',background:'#fef2f2',borderRadius:'12px',fontSize:'13px'}}>
                {item.method} {item.path}
              </div>
            )) : <div style={{color:'#64748b'}}>All endpoints covered</div>}
          </div>
        </div>
      </div>
    </div>
  );
}