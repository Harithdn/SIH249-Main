import { useEffect, useState } from 'react';
import { get, post } from '../services/api';
import { Section, Badge, SimBanner } from '../components/ui';

const COLS = ['Detected', 'Approved', 'Scheduled', 'In Progress', 'Completed'];

export function WorkOrders() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ aircraft_id: 'AS-014', component: 'Hydraulic System', issue: 'Hydraulic pump vibration exceedance', priority: 'High', technician: 'R. Iyer', est_hours: 6 });
  const load = async () => setRows(await get('/api/work-orders'));
  useEffect(() => { load(); const p = new URLSearchParams(location.search).get('pre'); if (p) { const [a, c] = p.split(':'); setForm(f => ({ ...f, aircraft_id: a, component: c })); } }, []);
  const create = async () => { const r = await post('/api/work-orders', { ...form, parts: ['Hydraulic Pump'], scheduled: new Date(Date.now() + 3 * 864e5).toISOString(), ai_recommendation: 'Schedule targeted inspection during next window.' }); alert('Work order ' + r.wo_id + ' created (engineer approval recorded).'); load(); };
  const move = async (id: string, status: string) => { await post(`/api/work-orders/${id}/status`, { status }); load(); };
  return <div><h2 className="text-xl font-bold">Work Orders (human-in-the-loop)</h2><SimBanner />
    <div className="text-[12px] text-slate-300 my-1">AI Detection → Prediction → Recommendation → <b>Engineer Review → Approval</b> → Work Order → Execution → Validation → Record. AI never autonomously authorizes maintenance.</div>
    <Section title="Create work order (engineer approval)">
      <div className="grid md:grid-cols-6 gap-2">
        {(['aircraft_id', 'component', 'issue', 'priority', 'technician'] as const).map(k => <input key={k} className="inp" value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={k} />)}
        <button className="btn" onClick={create}>Approve & Create</button></div>
    </Section>
    <div className="grid md:grid-cols-5 gap-2">{COLS.map(c => (
      <div key={c} className="card"><div className="lbl mb-2">{c}</div>
        {rows.filter(r => r.status === c || (c === 'Detected' && r.status === 'Detected')).map((r: any) => (
          <div key={r.wo_id} className="border border-slate-700 rounded p-2 mb-2 text-[12px]">
            <b>{r.wo_id}</b> {r.aircraft_id} · {r.component}<br />{r.issue}<br /><Badge v={r.priority} /> <Badge v={r.status} />
            <div>Tech: {r.technician} · {r.est_hours}h</div>
            <div className="flex gap-1 mt-1 flex-wrap">{COLS.filter(x => x !== r.status).slice(0, 2).map(n => <button key={n} className="btn-ghost !py-0.5 !px-2" onClick={() => move(r.wo_id, n)}>→ {n}</button>)}</div>
            {r.status !== 'Completed' && <button className="btn-ghost !py-0.5 !px-2 mt-1" onClick={() => move(r.wo_id, 'Completed')}>Complete (heals aircraft)</button>}
          </div>))}</div>))}</div></div>;
}

export function Schedule() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { get('/api/schedule').then(setRows); }, []);
  return <div><h2 className="text-xl font-bold">Maintenance Schedule</h2><SimBanner />
    <div className="card"><table className="dt"><thead><tr><th>WO</th><th>Aircraft</th><th>Component</th><th>Date</th><th>Tech</th><th>Priority</th></tr></thead>
      <tbody>{rows.map((r: any) => <tr key={r.wo_id}><td>{r.wo_id}</td><td>{r.aircraft_id}</td><td>{r.component}</td><td>{(r.date || '').slice(0, 10)}</td><td>{r.technician}</td><td><Badge v={r.priority} /></td></tr>)}</tbody></table></div>
    <div className="card mt-2 text-[13px]">Example: AS-014 hydraulic RUL 16d → recommended slot +3 days to avoid high-risk operational window (parts + tech + workshop checked).</div></div>;
}

export function History() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { get('/api/maintenance').then(setD); }, []);
  if (!d) return <div>Loading…</div>;
  return <div><h2 className="text-xl font-bold">Maintenance History</h2><SimBanner />
    <div className="grid grid-cols-2 gap-2 my-2"><div className="card"><div className="lbl">MTTR</div><div className="kpi">{d.mttr_h}h</div></div><div className="card"><div className="lbl">MTBF proxy</div><div className="kpi">{d.mtbf_h}h</div></div></div>
    <div className="card"><table className="dt"><thead><tr><th>Aircraft</th><th>Date</th><th>Type</th><th>Component</th><th>Fault</th><th>Action</th><th>Downtime</th></tr></thead>
      <tbody>{d.records.slice(0, 60).map((r: any, i: number) => <tr key={i}><td>{r.aircraft_id}</td><td>{(r.date || '').slice(0, 10)}</td><td>{r.type}</td><td>{r.component}</td><td>{r.fault}</td><td>{r.action}</td><td>{r.downtime}h</td></tr>)}</tbody></table></div></div>;
}
