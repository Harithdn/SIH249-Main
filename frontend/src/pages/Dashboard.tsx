import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post } from '../services/api';
import { Kpi, Badge, Section, Bar, SimBanner } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const [d, setD] = useState<any>(null); const [fleet, setFleet] = useState<any>(null);
  const [ac, setAc] = useState<any[]>([]); const [preds, setPreds] = useState<any[]>([]);
  const [ins, setIns] = useState<any[]>([]); const [live, setLive] = useState(false);
  const load = async () => {
    setD(await get('/api/dashboard')); setFleet(await get('/api/fleet'));
    setAc(await get('/api/aircraft')); setPreds(await get('/api/predictions'));
    setIns(await get('/api/insights'));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!live) return; const t = setInterval(load, 4000); return () => clearInterval(t);
  }, [live]);
  if (!d) return <div>Loading command center…</div>;
  const dist = fleet?.distribution || {};
  const pie = Object.entries(dist).map(([k, v]) => ({ name: k, value: v }));
  const COLORS = ['#22c55e', '#38bdf8', '#fb923c', '#ef4444'];
  return <div>
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div><h2 className="text-xl font-bold">Command Center</h2><SimBanner /></div>
      <div className="flex gap-2">
        <button className="btn-ghost" onClick={() => setLive(!live)}>{live ? '● LIVE SIMULATION ON' : 'Start Live Simulation'}</button>
        <button className="btn-ghost" onClick={async () => { await post('/api/simulate/degrade', { aircraft_id: 'AS-014', component: 'Hydraulic System', level: 0.25 }); load(); }}>Simulate Degradation (AS-014)</button>
        <a className="btn" href="http://localhost:8000/api/report" target="_blank" rel="noreferrer">Generate Fleet Readiness Report</a>
      </div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mt-2">
      <Kpi label="Fleet Size" value={d.fleet_size} /><Kpi label="Operational" value={d.operational} />
      <Kpi label="Maintenance" value={d.maintenance} /><Kpi label="At Risk" value={d.at_risk} />
      <Kpi label="Critical" value={d.critical} /><Kpi label="Availability" value={d.availability + '%'} />
      <Kpi label="Predicted 30d" value={d.predicted_30d} /><Kpi label="Downtime avoided" value={d.downtime_avoided_h + 'h'} sub="simulated estimate" />
    </div>
    <div className="grid lg:grid-cols-3 gap-4 mt-4">
      <Section title="Fleet Availability — history & projection (7/30/90d)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={(fleet?.history || []).map((h: any, i: number) => ({ ...h, proj: fleet?.projection?.[i]?.projected }))}>
            <XAxis dataKey="day" hide /><YAxis domain={[60, 100]} /><Tooltip />
            <Line dataKey="operational" stroke="#22d3ee" dot={false} name="Operational %" />
            <Line dataKey="proj" stroke="#a78bfa" strokeDasharray="5 5" dot={false} name="Projected w/ predictive" />
          </LineChart>
        </ResponsiveContainer>
        <div className="text-[11px] text-slate-400">Projected improvement in simulated scenario.</div>
      </Section>
      <Section title="Health Distribution (click to filter)">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart><Pie data={pie} dataKey="value" nameKey="name" outerRadius={80} label>{pie.map((_, i) => <Cell key={i} fill={COLORS[i % 4]} />)}</Pie><Tooltip /></PieChart>
        </ResponsiveContainer>
        <div className="flex gap-2 text-[12px] flex-wrap">{pie.map(p => <Link key={p.name} className="btn-ghost" to={`/app/registry?q=${p.name}`}>{p.name}: {p.value as number}</Link>)}</div>
      </Section>
      <Section title="AI Insights (evidence + confidence)">
        {ins.map((x: any, i: number) => <div key={i} className="text-[12px] border-l-2 border-cyan-500 pl-2 my-2"><div>{x.text}</div><div className="text-slate-400">Evidence: {x.evidence} · conf {x.confidence} · {x.review}</div></div>)}
      </Section>
    </div>
    <Section title="Top Predicted Failures" right={<Link className="btn-ghost" to="/app/predictions">All predictions</Link>}>
      <div className="grid md:grid-cols-3 gap-2">
        {preds.slice(0, 6).map((p: any, i: number) => (
          <div key={i} className="border border-slate-700 rounded p-2 text-[13px]">
            <div className="flex justify-between"><b>{p.aircraft_id} · {p.component}</b><Badge v={p.severity} /></div>
            <div>Failure probability: <b>{Math.round(p.failure_prob * 100)}%</b> · window {p.window}</div>
            <div>Confidence {p.confidence} · RUL {p.rul}d</div>
            <div className="text-slate-300">{p.recommendation}</div>
            {p.explanation?.slice(0, 3).map((e: any) => <Bar key={e.feature} label={e.feature} pct={e.pct} />)}
            <Link className="text-cyan-300 text-xs" to={`/app/aircraft/${p.aircraft_id}`}>Open aircraft →</Link>
          </div>))}
      </div>
    </Section>
    <Section title="Aircraft Risk Table" right={<Link className="btn-ghost" to="/app/registry">Registry</Link>}>
      <div className="overflow-x-auto"><table className="dt"><thead><tr><th>Aircraft</th><th>Platform</th><th>Health</th><th>Risk</th><th>RUL</th><th>Status</th><th>Primary Risk</th><th>Next Mx</th><th>Priority</th></tr></thead>
        <tbody>{ac.slice(0, 12).map((a: any) => <tr key={a.aircraft_id}>
          <td><Link className="text-cyan-300" to={`/app/aircraft/${a.aircraft_id}`}>{a.aircraft_id}</Link></td>
          <td>{a.platform}</td><td>{a.health}/100</td><td>{Math.round(a.risk * 100)}%</td><td>{a.rul}d</td>
          <td><Badge v={a.status} /></td><td>{a.primary_risk}</td><td>{(a.next_maintenance || '').slice(0, 10)}</td><td><Badge v={a.priority} /></td></tr>)}
        </tbody></table></div>
    </Section>
    <div className="card text-[12px] text-slate-300">Command dashboard answers: (1) fleet condition — availability {d.availability}%; (2) likely failures — {d.predicted_30d} in 30d; (3) when — RUL table; (4) what to do — AI recommendations; (5) can we execute — parts + technicians + schedule linked below in Logistics.</div>
  </div>;
}
