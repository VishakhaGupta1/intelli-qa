import { useEffect, useState } from 'react';
import client from './api/client';
import MetricCards from './components/MetricCards';
import CoverageSummary from './components/CoverageSummary';
import DefectHeatmap from './components/DefectHeatmap';
import TrendChart from './components/TrendChart';
import FlakinessList from './components/FlakinessList';
import GapReport from './components/GapReport';
import TrustScorePanel from './components/TrustScorePanel';

export default function App() {
  const [metrics, setMetrics] = useState({ totalTests: 0, passRate: 0, failRate: 0, avgDuration: 0, lastRun: null });
  const [results, setResults] = useState({ results: [], total: 0, page: 1 });
  const [trend, setTrend] = useState([]);
  const [defects, setDefects] = useState([]);
  const [flakyTests, setFlakyTests] = useState([]);
  const [coverage, setCoverage] = useState({ covered: [], uncovered: [], coveragePercent: 0 });
  const [gaps, setGaps] = useState([]);
  const [trustScores, setTrustScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    let timerId = null;
    async function loadData() {
      try {
        const requests = await Promise.allSettled([
          client.get('/api/metrics'),
          client.get('/api/results'),
          client.get('/api/results/trend'),
          client.get('/api/coverage'),
          client.get('/api/flakiness'),
          client.get('/api/defects'),
          client.get('/api/gap-report'),
          client.get('/api/trust-scores')
        ]);
        if (!active) return;
        const [metricsRes, resultsRes, trendRes, coverageRes, flakyRes, defectsRes, gapRes, trustRes] = requests;
        if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value.data || {});
        if (resultsRes.status === 'fulfilled') setResults(resultsRes.value.data || { results: [], total: 0, page: 1 });
        if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data || []);
        if (coverageRes.status === 'fulfilled') setCoverage(coverageRes.value.data || { covered: [], uncovered: [], coveragePercent: 0 });
        if (flakyRes.status === 'fulfilled') setFlakyTests((flakyRes.value.data?.flakyTests) || []);
        if (defectsRes.status === 'fulfilled') setDefects((defectsRes.value.data?.defects) || []);
        if (gapRes.status === 'fulfilled') setGaps((gapRes.value.data?.gaps) || []);
        if (trustRes.status === 'fulfilled') setTrustScores(trustRes.value.data?.trustScores || []);
        const errors = requests.filter(item => item.status === 'rejected').map(item => item.reason?.message || 'Request failed');
        setError(errors.length > 0 ? errors.join(' | ') : null);
      } catch (err) {
        setError(err?.message || err?.error || 'Failed to load dashboard data');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    timerId = setInterval(loadData, 30000);
    return () => {
      active = false;
      if (timerId) clearInterval(timerId);
    };
  }, []);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif'}}>
      <div style={{padding:'18px 24px',borderRadius:'16px',border:'1px solid #e5e7eb',background:'#fff',boxShadow:'0 10px 30px rgba(0,0,0,0.08)'}}>
        Loading QA Dashboard...
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:'Inter, system-ui, sans-serif',padding:'24px',maxWidth:'1240px',margin:'0 auto',background:'linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%)',minHeight:'100vh'}}>
      <div style={{marginBottom:'18px',padding:'18px 20px',borderRadius:'18px',background:'rgba(255,255,255,0.88)',border:'1px solid rgba(148,163,184,0.22)',boxShadow:'0 20px 50px rgba(15,23,42,0.08)'}}>
        <h1 style={{fontSize:'30px',fontWeight:'800',margin:'0 0 6px',color:'#0f172a'}}>QA Intelligence Platform</h1>
        <p style={{color:'#475569',margin:0}}>Live quality metrics dashboard</p>
        {error ? <div style={{marginTop:'12px',padding:'12px 14px',borderRadius:'12px',background:'#fef2f2',color:'#b91c1c',border:'1px solid #fecaca'}}>Some data failed to load: {error}</div> : null}
      </div>
      <MetricCards metrics={metrics} />
      <div style={{display:'grid',gridTemplateColumns:'1.25fr 1fr',gap:'18px',marginTop:'18px'}}>
        <div>
          <h2 style={{fontSize:'16px',fontWeight:'700',margin:'0 0 12px',color:'#0f172a'}}>Coverage breakdown</h2>
          <CoverageSummary coverage={coverage} />
        </div>
        <div>
          <h2 style={{fontSize:'16px',fontWeight:'700',margin:'0 0 12px',color:'#0f172a'}}>Flaky tests</h2>
          <FlakinessList flakyTests={flakyTests} />
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'18px',marginTop:'18px'}}>
        <div>
          <h2 style={{fontSize:'16px',fontWeight:'700',margin:'0 0 12px',color:'#0f172a'}}>Defect heatmap</h2>
          <DefectHeatmap defects={defects} />
        </div>
        <div>
          <h2 style={{fontSize:'16px',fontWeight:'700',margin:'0 0 12px',color:'#0f172a'}}>AI coverage gap report</h2>
          <GapReport gaps={gaps} />
        </div>
      </div>
      <div style={{marginTop:'18px'}}>
        <h2 style={{fontSize:'16px',fontWeight:'700',margin:'0 0 12px',color:'#0f172a'}}>AI Trust Score Evaluation</h2>
        <TrustScorePanel trustScores={trustScores} />
      </div>
      <div style={{marginTop:'18px'}}>
        <h2 style={{fontSize:'16px',fontWeight:'700',margin:'0 0 12px',color:'#0f172a'}}>Pass rate trend (14 days)</h2>
        <TrendChart data={trend} />
      </div>
      <div style={{marginTop:'18px'}}>
        <h2 style={{fontSize:'16px',fontWeight:'700',margin:'0 0 12px',color:'#0f172a'}}>Recent results</h2>
        <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:'16px',padding:'16px'}}>
          {results.results.length === 0 ? <div style={{color:'#64748b'}}>No results yet.</div> : results.results.slice(0, 10).map((item, index) => (
            <div key={index} style={{display:'flex',justifyContent:'space-between',gap:'12px',padding:'10px 0',borderBottom:index === 9 ? 'none' : '1px solid #f1f5f9'}}>
              <div>
                <div style={{fontWeight:'600',color:'#0f172a'}}>{item.testName}</div>
                <div style={{fontSize:'12px',color:'#64748b'}}>{item.endpoint || 'N/A'}</div>
              </div>
              <div style={{textAlign:'right',color:'#475569'}}>{item.status} · {item.duration || 0}ms</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
