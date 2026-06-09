const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

const SEVERITY_STYLES = {
  CRITICAL: { background: '#b42318', color: '#fff' },
  HIGH: { background: '#f04438', color: '#fff' },
  MEDIUM: { background: '#f79009', color: '#111827' },
  LOW: { background: '#84cc16', color: '#111827' },
};

function normalizeSeverity(value) {
  const severity = String(value || 'LOW').toUpperCase();
  return SEVERITY_ORDER.includes(severity) ? severity : 'LOW';
}

export default function DefectHeatmap({ defects = [] }) {
  const grouped = defects.reduce((acc, defect) => {
    const endpoint = defect.endpoint || defect.message || 'Unknown';
    const severity = normalizeSeverity(defect.severity);
    if (!acc[endpoint]) {
      acc[endpoint] = { endpoint, total: 0, severities: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } };
    }
    acc[endpoint].total += 1;
    acc[endpoint].severities[severity] += 1;
    return acc;
  }, {});

  const rows = Object.values(grouped).sort((a, b) => b.total - a.total);

  if (!rows.length) {
    return (
      <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',padding:'16px',color:'#64748b'}}>
        No defects recorded yet.
      </div>
    );
  }

  return (
    <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:'16px',padding:'16px',boxShadow:'0 10px 30px rgba(15,23,42,0.06)'}}>
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'14px'}}>
        {SEVERITY_ORDER.map((severity) => (
          <span key={severity} style={{...SEVERITY_STYLES[severity],padding:'4px 10px',borderRadius:'999px',fontSize:'12px',fontWeight:'600'}}>
            {severity}
          </span>
        ))}
      </div>

      <div style={{display:'grid',gap:'10px'}}>
        {rows.map((row) => (
          <div key={row.endpoint} style={{display:'grid',gridTemplateColumns:'minmax(220px,2fr) repeat(4,1fr)',gap:'8px',alignItems:'stretch'}}>
            <div style={{padding:'10px 12px',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:'10px',fontSize:'13px',fontWeight:'600',color:'#111827'}}>
              {row.endpoint}
            </div>
            {SEVERITY_ORDER.map((severity) => {
              const count = row.severities[severity];
              return (
                <div
                  key={severity}
                  style={{
                    ...SEVERITY_STYLES[severity],
                    minHeight:'46px',
                    borderRadius:'10px',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    fontSize:'14px',
                    fontWeight:'700',
                    opacity: count ? Math.min(1, 0.35 + count * 0.18) : 0.1,
                    border:'1px solid rgba(17,24,39,0.06)'
                  }}
                  title={`${row.endpoint} — ${severity}: ${count}`}
                >
                  {count}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}