const tagColors = { INFRASTRUCTURE:'#2563eb', TIMING:'#d97706', REAL_BUG:'#dc2626' };
export default function FlakinessList({ flakyTests }) {
  const flaky = Array.isArray(flakyTests) ? flakyTests.slice(0, 10) : [];
  if (flaky.length === 0) return <div style={{background:'#fff',borderRadius:'16px',padding:'24px',border:'1px solid #e2e8f0',color:'#64748b'}}>No flaky tests</div>;
  return (
    <div style={{background:'#fff',borderRadius:'16px',border:'1px solid #e2e8f0',overflow:'hidden',boxShadow:'0 10px 30px rgba(15,23,42,0.06)'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
        <thead>
          <tr style={{background:'#f9fafb'}}>
            {['Test Name','Layer','Score','Runs','Last Seen'].map(h => (
              <th key={h} style={{padding:'10px 16px',textAlign:'left',fontWeight:'500',color:'#374151',borderBottom:'0.5px solid #e5e7eb'}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flaky.map((d, i) => (
            <tr key={i} style={{borderBottom:'0.5px solid #f3f4f6'}}>
              <td style={{padding:'10px 16px',color:'#1a1a1a'}}>{d.testName}</td>
              <td style={{padding:'10px 16px',color:'#6b7280'}}>{d.layer || 'api'}</td>
              <td style={{padding:'10px 16px',color:'#1a1a1a',fontWeight:'600'}}>{d.flakinessScore ?? 0}</td>
              <td style={{padding:'10px 16px',color:'#1a1a1a',fontWeight:'600'}}>{d.totalRuns || 0}</td>
              <td style={{padding:'10px 16px'}}>
                <span style={{background: tagColors[d.rootCause] || '#6b7280',color:'#fff',padding:'2px 8px',borderRadius:'4px',fontSize:'11px',fontWeight:'500'}}>
                  {d.rootCause}
                </span>
              </td>
              <td style={{padding:'10px 16px',color:'#6b7280'}}>{d.lastSeen ? new Date(d.lastSeen).toLocaleDateString() : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
