import { useEffect, useState } from 'react';
import { get } from '../services/api';
import { Section, Badge, SimBanner, Bar } from '../components/ui';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function Inventory() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { get('/api/inventory').then(setRows); }, []);
  return <div><h2 className="text-xl font-bold">Spare Parts</h2><SimBanner />
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 my-2">
      <div className="card"><div className="lbl">Total parts</div><div className="kpi">{rows.length}</div></div>
      <div className="card"><div className="lbl">Low stock</div><div className="kpi">{rows.filter(r => r.risk !== 'LOW').length}</div></div>
      <div className="card"><div className="lbl">Critical</div><div className="kpi">{rows.filter(r => r.risk === 'HIGH').length}</div></div>
    </div>
    <div className="card overflow-x-auto"><table className="dt"><thead><tr><th>Part</th><th>Name</th><th>Category</th><th>Stock</th><th>Min</th><th>Demand</th><th>Lead</th><th>Risk</th><th>Supplier</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.part_id}><td>{r.part_id}</td><td>{r.name}</td><td>{r.category}</td><td>{r.stock}</td><td>{r.min_stock}</td><td>{r.demand}</td><td>{r.lead_days}d</td><td><Badge v={r.risk} /></td><td>{r.supplier}</td></tr>)}</tbody></table></div></div>;
}

export function Forecast() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { get('/api/inventory/forecast').then(setRows); }, []);
  return <div><h2 className="text-xl font-bold">Predictive Spare Demand (from predicted failures)</h2><SimBanner />
    <div className="grid md:grid-cols-2 gap-3 mt-2">{rows.map(r => (
      <Section key={r.part_id} title={`${r.part_id} — ${r.name}`}>
        <div className="text-[13px]">Stock {r.stock} · predicted demand {r.predicted_demand} · coverage {r.coverage} · <Badge v={r.risk} /></div>
        <div className="text-[12px] text-amber-200">{r.recommendation}</div>
        <ResponsiveContainer width="100%" height={120}><LineChart data={r.series}><XAxis dataKey="m" hide /><YAxis /><Tooltip /><Line dataKey="stock" stroke="#22d3ee" dot={false} /></LineChart></ResponsiveContainer>
      </Section>))}</div></div>;
}

export function Resources() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { get('/api/resources').then(setRows); }, []);
  return <div><h2 className="text-xl font-bold">Resource Planning — technicians & workshop</h2><SimBanner />
    <div className="grid md:grid-cols-3 gap-2 mt-2">{rows.map((t: any, i: number) => (
      <div key={i} className="card text-[13px]"><b>{t.name}</b> · {t.skill}<Bar label="Availability" pct={Math.round(t.availability * 100)} /><Bar label="Workload" pct={Math.round(t.workload * 100)} color="#fb923c" /><div>Active jobs: {t.active_jobs}</div></div>))}</div></div>;
}
