import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../services/api';
import { Section, Badge, Bar, SimBanner } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar as RBar } from 'recharts';

export function Predictions() {
  const [rows, setRows] = useState<any[]>([]); const [min, setMin] = useState(0.3);
  useEffect(() => { get(`/api/predictions?min_risk=${min}`).then(setRows); }, [min]);
  return <div><h2 className="text-xl font-bold">Predicted Component Failures</h2><SimBanner />
    <label className="lbl">Min risk {(min * 100).toFixed(0)}%</label>
    <input type="range" min="0" max="0.8" step="0.1" value={min} onChange={e => setMin(+e.target.value)} />
    <div className="overflow-x-auto card"><table className="dt"><thead><tr><th>Aircraft</th><th>Component</th><th>P(fail)</th><th>Window</th><th>RUL</th><th>Conf</th><th>Sev</th><th>Action</th></tr></thead>
      <tbody>{rows.map((p: any, i: number) => <tr key={i}><td><Link className="text-cyan-300" to={`/app/aircraft/${p.aircraft_id}`}>{p.aircraft_id}</Link></td><td>{p.component}</td><td>{Math.round(p.failure_prob * 100)}%</td><td>{p.window}</td><td>{p.rul}d</td><td>{p.confidence}</td><td><Badge v={p.severity} /></td><td className="whitespace-normal">{p.recommendation}</td></tr>)}</tbody></table></div></div>;
}

export function Anomalies() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { get('/api/anomalies').then(setRows); }, []);
  const [sel, setSel] = useState<any>(null);
  return <div><h2 className="text-xl font-bold">Anomaly Detection (IsolationForest + thresholds)</h2><SimBanner />
    <div className="grid lg:grid-cols-2 gap-4 mt-2">
      <Section title="Timeline"><div className="overflow-x-auto"><table className="dt"><thead><tr><th>Time</th><th>Aircraft</th><th>Sensor</th><th>Value</th><th>Score</th><th>Sev</th></tr></thead>
        <tbody>{rows.map((a: any, i: number) => <tr key={i} onClick={() => setSel(a)} className="cursor-pointer hover:bg-slate-800"><td>{(a.timestamp || '').slice(11, 19)}</td><td>{a.aircraft_id}</td><td>{a.component} {a.sensor}</td><td>{a.value}</td><td>{a.score}</td><td><Badge v={a.severity} /></td></tr>)}</tbody></table></div></Section>
      <Section title="Anomaly Explanation">{!sel ? <div className="text-sm text-slate-400">Click an anomaly.</div> : <>
        <div className="text-[13px]"><b>What happened?</b> {sel.what}</div>
        <div className="text-[13px]"><b>Why important?</b> {sel.why}</div>
        <div className="text-[13px]"><b>AI assessment:</b> {sel.assessment}</div>
        <div className="text-[13px]"><b>Recommended action:</b> {sel.action}</div>
        <div className="text-[11px] text-amber-300 mt-1">AI-generated recommendation — not an authorized maintenance procedure.</div></>}</Section>
    </div></div>;
}

export function Rul() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { get('/api/rul').then(setRows); }, []);
  const [sel, setSel] = useState(0);
  const cur = rows[sel];
  return <div><h2 className="text-xl font-bold">RUL — Remaining Useful Life</h2><SimBanner />
    <div className="grid lg:grid-cols-3 gap-4 mt-2">
      <div className="card overflow-y-auto" style={{ maxHeight: 500 }}>{rows.slice(0, 30).map((r: any, i: number) => (
        <div key={i} onClick={() => setSel(i)} className={`text-[13px] p-1.5 rounded cursor-pointer ${i === sel ? 'bg-cyan-500/15' : 'hover:bg-slate-800'}`}><b>{r.aircraft_id}</b> {r.component} — <b>{r.rul}d</b> ({r.lo}–{r.hi}) conf {r.confidence}</div>))}</div>
      <div className="lg:col-span-2"><Section title={cur ? `${cur.aircraft_id} ${cur.component} — RUL ${cur.rul}d (expected ${cur.lo}–${cur.hi}, conf ${cur.confidence})` : 'Degradation curve'}>
        {cur && <ResponsiveContainer width="100%" height={260}><LineChart data={[...cur.history.map((h: any) => ({ d: h.d, v: h.v })), ...cur.projection.map((h: any) => ({ d: h.d, v: h.v }))]}>
          <XAxis dataKey="d" hide /><YAxis /><Tooltip /><Line dataKey="v" stroke="#22d3ee" dot={false} name="RUL days" /></LineChart></ResponsiveContainer>}
        <div className="text-[11px] text-slate-400">Historical degradation → predicted degradation → failure threshold. {cur ? `Degradation ${Math.round(cur.degradation)}%.` : ''}</div>
      </Section></div>
    </div></div>;
}
