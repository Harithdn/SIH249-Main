import { useEffect, useState } from 'react';
import { get, post, apiBase } from '../services/api';
import { Section, Badge, SimBanner } from '../components/ui';

export function Alerts() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { get('/api/alerts').then(setRows); }, []);
  return <div><h2 className="text-xl font-bold">Alert Center</h2><SimBanner />
    <div className="grid gap-2 mt-2">{rows.map((a: any, i: number) => (
      <div key={i} className="card text-[13px]"><Badge v={a.severity} /> <b>{a.type}</b> {a.aircraft_id} {a.component}<div>{a.message}</div><div className="text-slate-400">Action: {a.action} · {(a.timestamp || '').slice(0, 16)} · {a.status}</div></div>))}</div></div>;
}

export function Upload() {
  const [res, setRes] = useState<any>(null);
  const send = async (f: File) => { const fd = new FormData(); fd.append('file', f);
    const r = await fetch(apiBase + '/api/data/upload', { method: 'POST', body: fd, headers: { 'X-Role': localStorage.getItem('role') || 'command' } }); setRes(await r.json()); };
  return <div><h2 className="text-xl font-bold">Data Ingestion</h2><SimBanner />
    <div className="card mt-2"><input type="file" accept=".csv" onChange={e => e.target.files && send(e.target.files[0])} />
      <a className="btn-ghost ml-2" href={apiBase + '/api/data/sample'}>Download sample CSV</a>
      {res && <div className="text-[13px] mt-2">File {res.file}: {res.rows} rows, cols [{res.columns.join(', ')}], missing {res.missing}, status {res.status}, quality {res.quality}</div>}</div></div>;
}

export function Models() {
  const [rows, setRows] = useState<any[]>([]); const [target, setTarget] = useState('failure');
  const load = async () => setRows(await get('/api/models'));
  useEffect(() => { load(); }, []);
  return <div><h2 className="text-xl font-bold">Model Management & Training Demo</h2><SimBanner />
    <div className="grid gap-2 mt-2">{rows.map((m: any, i: number) => (
      <div key={i} className="card text-[13px]"><b>{m.name} {m.version}</b> · {m.purpose} · {m.status}<div className="text-slate-400">{JSON.stringify(m.metrics)}</div></div>))}</div>
    <Section title="Train prototype model on synthetic data">
      <div className="flex gap-2"><select className="inp max-w-xs" value={target} onChange={e => setTarget(e.target.value)}><option value="failure">Classification: failure</option><option value="rul">Regression: RUL</option><option value="anomaly">Anomaly detection</option></select>
      <button className="btn" onClick={async () => { const r = await post('/api/models/train', { target, kind: target === 'rul' ? 'regression' : target }); alert('Trained ' + r.version); load(); }}>Train</button></div>
      <div className="text-[11px] text-slate-400 mt-1">Demo evaluation metrics only — not real-world performance.</div></Section></div>;
}

export function Copilot() {
  const [q, setQ] = useState('Why is AS-014 high risk?'); const [a, setA] = useState('');
  const ask = async () => setA((await get('/api/copilot?q=' + encodeURIComponent(q))).answer);
  useEffect(() => { ask(); }, []);
  return <div><h2 className="text-xl font-bold">AeroSentinel Copilot (retrieval-based, read-only)</h2><SimBanner />
    <div className="flex gap-2 mt-2"><input className="inp" value={q} onChange={e => setQ(e.target.value)} /><button className="btn" onClick={ask}>Ask</button></div>
    <div className="card mt-2 text-[14px] whitespace-pre-wrap">{a}</div>
    <div className="text-[11px] text-slate-400">Try: highest failure risk · vibration anomalies · spare parts critical · tasks due this week · summarize fleet health. Cannot issue operational commands.</div></div>;
}

export function Thread() {
  const [t, setT] = useState<any>(null);
  useEffect(() => { get('/api/digital-thread?aid=AS-014').then(setT); }, []);
  return <div><h2 className="text-xl font-bold">Digital Thread — sensor to availability</h2><SimBanner />
    <div className="card mt-2 flex flex-wrap gap-1">{(t?.steps || []).map((s: string, i: number) => (
      <span key={i} className="text-[12px] px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30">{i + 1}. {s} {i < (t.steps.length - 1) && '→'}</span>))}</div>
    {t?.current && <div className="card mt-2 text-[13px]">Live example AS-014: {t.current.component} P={Math.round(t.current.failure_prob * 100)}% RUL {t.current.rul}d → {t.current.recommendation}</div>}</div>;
}

export function Arch() {
  const layers = [['Data Layer', 'sensors · maintenance records · inventory · flight records · technical records'], ['Data Processing', 'ingestion · cleaning · validation · feature engineering'], ['AI/ML', 'anomaly (IsolationForest) · failure classification · RUL regression · demand forecasting'], ['Application', 'fleet dashboard · aircraft health · maintenance · logistics · analytics'], ['Decision Support', 'alerts · recommendations · scheduling · fleet planning (human approval mandatory)']];
  return <div><h2 className="text-xl font-bold">System Architecture</h2><SimBanner />
    {layers.map(([t, d]) => <div key={t} className="card mt-2"><b>{t}</b><div className="text-[13px] text-slate-300">{d}</div></div>)}
    <div className="card mt-2 text-[12px]">API: FastAPI /docs · DB: Postgres (SQLite fallback) · Frontend: React+TS · ML: sklearn. Endpoints: /api/dashboard /fleet /aircraft /telemetry /predictions /anomalies /rul /work-orders /inventory /alerts /analytics /models /data.</div></div>;
}

export function Quality() {
  const [q, setQ] = useState<any>(null); const [s, setS] = useState<any[]>([]);
  useEffect(() => { get('/api/data-quality').then(setQ); get('/api/system-health').then(setS); }, []);
  if (!q) return <div>Loading…</div>;
  return <div><h2 className="text-xl font-bold">Data Quality & System Health</h2><SimBanner />
    <div className="grid md:grid-cols-4 gap-2 mt-2">{[['Completeness', q.telemetry_completeness + '%'], ['Sensor reliability', q.sensor_reliability + '%'], ['Record completeness', q.record_completeness + '%'], ['Score', q.score]].map(([l, v]) => <div key={l} className="card"><div className="lbl">{l}</div><div className="kpi">{v}</div></div>)}</div>
    <div className="grid md:grid-cols-5 gap-2 mt-2">{s.map((x: any) => <div key={x.service} className="card text-[13px]"><b>{x.service}</b><div className="text-green-300">{x.status}</div></div>)}</div></div>;
}

export function Settings() {
  return <div><h2 className="text-xl font-bold">Settings</h2><div className="card mt-2 text-[13px]">Role: {localStorage.getItem('role')} · API: {apiBase} · Theme: dark (primary). Prototype prioritization model: Priority = FailureRisk × MissionPriority × DowntimeImpact × Criticality (prototype only, not an official standard).</div></div>;
}
