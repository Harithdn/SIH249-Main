import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get } from '../services/api';
import { Section, Badge, SimBanner } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function Fleet() {
  const [f, setF] = useState<any>(null);
  useEffect(() => { get('/api/fleet').then(setF); }, []);
  if (!f) return <div>Loading…</div>;
  const bases: any = {};
  f.aircraft.forEach((a: any) => { bases[a.base] = bases[a.base] || { base: a.base, n: 0, op: 0 }; bases[a.base].n++; if (a.status === 'Operational') bases[a.base].op++; });
  return <div><h2 className="text-xl font-bold">Fleet Overview</h2><SimBanner />
    <div className="grid md:grid-cols-4 gap-2 mt-2">{Object.values(bases).map((b: any) => (
      <div key={b.base} className="card"><div className="lbl">{b.base} (fictional)</div><div className="kpi">{b.op}/{b.n}</div><div className="text-xs text-slate-400">available</div></div>))}</div>
    <Section title="Availability projection — with vs without predictive maintenance">
      <ResponsiveContainer width="100%" height={260}><LineChart data={f.projection}>
        <XAxis dataKey="day" hide /><YAxis domain={[60, 100]} /><Tooltip />
        <Line dataKey="projected" stroke="#22c55e" dot={false} name="With predictive (sim)" />
        <Line dataKey="without" stroke="#ef4444" dot={false} name="Without (sim)" /></LineChart></ResponsiveContainer>
      <div className="text-[11px] text-slate-400">Simulation — not measured real-world results.</div>
    </Section></div>;
}

export function Availability() { return <Fleet />; }

export function Registry() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState(''); const [status, setStatus] = useState('');
  const [sp] = useSearchParams();
  const load = async () => setRows(await get(`/api/aircraft${status ? `?status=${status}` : ''}`));
  useEffect(() => { load(); }, [status]);
  const filt = rows.filter(r => !q || r.aircraft_id.includes(q.toUpperCase()));
  return <div><h2 className="text-xl font-bold">Aircraft Registry</h2><SimBanner />
    <div className="flex gap-2 my-2"><input className="inp max-w-xs" placeholder="Search AS-014…" value={q} onChange={e => setQ(e.target.value)} />
      <select className="inp max-w-xs" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option><option>Operational</option><option>Maintenance</option><option>At Risk</option><option>Critical</option></select></div>
    {sp.get('q') && <div className="text-xs text-slate-400">Filter hint: {sp.get('q')}</div>}
    <div className="overflow-x-auto card"><table className="dt"><thead><tr><th>ID</th><th>Platform</th><th>Base</th><th>Health</th><th>Risk</th><th>RUL</th><th>Status</th><th>Priority</th></tr></thead>
      <tbody>{filt.map(r => <tr key={r.aircraft_id}><td><Link className="text-cyan-300" to={`/app/aircraft/${r.aircraft_id}`}>{r.aircraft_id}</Link></td><td>{r.platform}</td><td>{r.base}</td><td>{r.health}</td><td>{Math.round(r.risk * 100)}%</td><td>{r.rul}d</td><td><Badge v={r.status} /></td><td><Badge v={r.priority} /></td></tr>)}</tbody></table></div></div>;
}
