import { useEffect, useState } from 'react';
import { get, post, apiBase } from '../services/api';
import { Section, SimBanner, Bar } from '../components/ui';
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export function Analytics() {
  const [a, setA] = useState<any>(null);
  useEffect(() => { get('/api/analytics').then(setA); }, []);
  if (!a) return <div>Loading…</div>;
  return <div><h2 className="text-xl font-bold">Fleet & Reliability Analytics</h2><SimBanner />
    <div className="grid lg:grid-cols-2 gap-4 mt-2">
      <Section title={`Failure Pareto (MTBF ${a.mtbf}h · MTTR ${a.mttr}h)`}>
        <ResponsiveContainer width="100%" height={240}><BarChart data={a.pareto}><XAxis dataKey="component" hide /><YAxis /><Tooltip /><RBar dataKey="failures" fill="#22d3ee" /></BarChart></ResponsiveContainer>
        {a.pareto.map((p: any) => <div key={p.component} className="text-[12px]">{p.component}: {p.failures} ({p.cum_pct}%)</div>)}
      </Section>
      <Section title="Reactive vs Predictive (simulated scenario)">
        <div className="text-sm">Reactive availability: <b>{a.reactive_avail}%</b> (unexpected failures, longer downtime, inventory uncertainty)</div>
        <div className="text-sm">Predictive availability: <b className="text-green-300">{a.predictive_avail}%</b> (early warnings, planned maintenance, better forecasting)</div>
        <div className="text-[11px] text-slate-400">{a.note}</div>
        <a className="btn mt-2 inline-block" href={`${apiBase}/api/report`} target="_blank" rel="noreferrer">Export readiness report</a>
      </Section>
    </div>
    <Section title="Availability trend"><ResponsiveContainer width="100%" height={200}><LineChart data={a.availability_trend}><XAxis dataKey="day" hide /><YAxis domain={[60, 100]} /><Tooltip /><Line dataKey="operational" stroke="#22d3ee" dot={false} /></LineChart></ResponsiveContainer></Section>
  </div>;
}

export function WhatIf() {
  const [f, setF] = useState({ capacity: 0, technicians: 0, delay: 0 });
  const [r, setR] = useState<any>(null);
  const run = async () => setR(await post('/api/whatif', f));
  return <div><h2 className="text-xl font-bold">What-If Simulation & Fleet Optimization</h2><SimBanner />
    <div className="card grid md:grid-cols-4 gap-2 mt-2">
      {[['capacity', 'Maintenance capacity %'], ['technicians', 'Technician delta'], ['delay', 'Maintenance delay days']].map(([k, l]) => (
        <div key={k}><label className="lbl">{l}</label><input className="inp" type="number" value={(f as any)[k]} onChange={e => setF({ ...f, [k]: +e.target.value })} /></div>))}
      <button className="btn self-end" onClick={run}>Simulate</button></div>
    {r && <div className="card mt-2">Simulated availability: <b>{r.simulated_availability}%</b> · backlog {r.simulated_backlog} · <span className="text-slate-400 text-xs">{r.note}</span></div>}
    <div className="card mt-2 text-[13px]">What happens if maintenance capacity decreases by 20%? Enter capacity −20 and simulate.</div></div>;
}
