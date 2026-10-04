import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { get, post } from '../services/api';
import { Section, Badge, Bar, SimBanner } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const COMPS = ['Engine', 'Hydraulic System', 'Landing Gear', 'Fuel System', 'Avionics', 'Electrical System', 'Cooling System'];

export default function AircraftDetail() {
  const { id } = useParams(); const [d, setD] = useState<any>(null);
  const [tel, setTel] = useState<any[]>([]); const [range, setRange] = useState(24);
  const [sel, setSel] = useState('Hydraulic System'); const [preds, setPreds] = useState<any[]>([]);
  const load = async () => {
    setD(await get(`/api/aircraft/${id}`));
    setTel(await get(`/api/aircraft/${id}/telemetry?hours=${range}`));
    setPreds(await get(`/api/aircraft/${id}/predictions`));
  };
  useEffect(() => { load(); }, [id, range]);
  if (!d) return <div>Loading {id}…</div>;
  const comp = d.components.find((c: any) => c.name === sel) || d.components[0];
  const pred = preds.find((p: any) => p.component === (comp?.name)) || preds[0];
  const color = (h: number) => h >= 80 ? '#22c55e' : h >= 65 ? '#eab308' : h >= 50 ? '#fb923c' : '#ef4444';
  return <div>
    <Link to="/app" className="text-xs text-cyan-300">← Command Center</Link>
    <div className="flex flex-wrap gap-2 items-center justify-between"><h2 className="text-xl font-bold">{d.aircraft_id} · {d.platform} · <Badge v={d.status} /></h2>
      <div className="flex gap-2">
        <button className="btn-ghost" onClick={async () => { await post('/api/simulate/degrade', { aircraft_id: id, component: sel, level: 0.2 }); load(); }}>Simulate {sel} degradation</button>
        <button className="btn-ghost" onClick={async () => { await post('/api/simulate/reset', { aircraft_id: id }); load(); }}>Reset simulation</button>
      </div></div>
    <SimBanner />
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-2">
      {[['Health', d.health + '/100'], ['Risk', Math.round(d.risk) + '%'], ['Flight hrs', d.flight_hours], ['Cycles', d.cycles], ['Last Mx', (d.last_maintenance || '').slice(0, 10)], ['Next Mx', (d.next_maintenance || '').slice(0, 10)]].map(([l, v]) => (
        <div key={l} className="card"><div className="lbl">{l}</div><div className="kpi text-lg">{v}</div></div>))}
    </div>
    <div className="grid lg:grid-cols-2 gap-4 mt-4">
      <Section title={`Digital Twin — generic silhouette (non-classified) · ${id}`}>
        <svg viewBox="0 0 400 160" className="w-full bg-slate-900 rounded">
          <g fill="none" stroke="#64748b" strokeWidth="2">
            <ellipse cx="200" cy="80" rx="130" ry="16" fill="#16233f" />
            <polygon points="200,20 225,80 175,80" fill="#16233f" />
            <polygon points="90,80 40,50 60,95" fill="#16233f" />
            <polygon points="310,80 360,50 340,95" fill="#16233f" />
          </g>
          {COMPS.map((c, i) => {
            const cc = d.components.find((x: any) => x.name === c);
            const h = cc?.health ?? 90;
            const x = 70 + i * 45, y = 120;
            return <g key={c} onClick={() => setSel(c)} style={{ cursor: 'pointer' }}>
              <circle cx={x} cy={y} r="14" fill={color(h)} opacity="0.85" />
              <text x={x} y={y + 28} fill="#cbd5e1" fontSize="8" textAnchor="middle">{c.split(' ')[0]}</text>
              {sel === c && <circle cx={x} cy={y} r="18" fill="none" stroke="#22d3ee" strokeWidth="2" />}</g>;
          })}
        </svg>
        <div className="text-[11px] text-slate-400 mt-1">Green healthy · yellow warning · red critical. Click a component. Generic illustration only.</div>
        {comp && <div className="text-[13px] mt-2"><b>{comp.name}</b> — health <b style={{ color: color(comp.health) }}>{comp.health}</b> · RUL {comp.rul}d · P(fail) {Math.round(comp.failure_prob * 100)}% · hours {comp.hours}</div>}
      </Section>
      <Section title={pred ? `Why is ${id} at risk? — Explainable AI` : 'Explainable AI'}>
        {!pred ? <div className="text-sm">No elevated risk. Model confidence high; continue monitoring.</div> : <>
          {pred.explanation?.map((e: any) => <Bar key={e.feature} label={e.feature} pct={e.pct} />)}
          <div className="text-[12px] text-slate-300 mt-2">Model confidence {pred.confidence} · severity {pred.severity} · window {pred.window}.</div>
          {pred.low_confidence && <div className="text-amber-300 text-xs">Insufficient confidence — additional telemetry recommended. Human review required.</div>}
          <div className="text-[12px] mt-1"><b>Recommendation:</b> {pred.recommendation}</div>
          <Link className="btn mt-2 inline-block" to={`/app/work-orders?pre=${id}:${pred.component}`}>Create work order →</Link>
        </>}
      </Section>
    </div>
    <Section title="Sensor Telemetry (simulated)" right={<div className="flex gap-1">{[1, 6, 24, 48].map(h => <button key={h} className="btn-ghost" onClick={() => setRange(h)}>{h}h</button>)}</div>}>
      <ResponsiveContainer width="100%" height={240}><LineChart data={tel}>
        <XAxis dataKey="t" hide /><YAxis /><Tooltip />
        <Line dataKey="vibration" stroke="#fb923c" dot={false} name="Vibration mm/s" />
        <Line dataKey="temperature" stroke="#ef4444" dot={false} name="Temp °C" /></LineChart></ResponsiveContainer>
      <div className="text-[11px] text-slate-400">Normal vibration 2.0–5.0 mm/s. Simulated data; live point appended during degradation.</div>
    </Section>
    <Section title="Maintenance History & MTBF pattern">
      <div className="overflow-x-auto"><table className="dt"><thead><tr><th>Date</th><th>Type</th><th>Component</th><th>Fault</th><th>Action</th><th>Tech</th><th>Downtime</th></tr></thead>
        <tbody>{d.history.map((h: any, i: number) => <tr key={i}><td>{(h.date || '').slice(0, 10)}</td><td>{h.type}</td><td>{h.component}</td><td>{h.fault}</td><td>{h.action}</td><td>{h.technician}</td><td>{h.downtime}h</td></tr>)}</tbody></table></div>
    </Section>
  </div>;
}

export function TwinRedirect() { return <AircraftDetail />; }
