// MAINTENANCE OPS — work orders (human-in-the-loop), schedule, history.
// Workflow: DETECTION → DIAGNOSIS → RECOMMENDATION → PARTS → TECHNICIAN →
// SCHEDULE → WORK ORDER → RESOLUTION.
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { get, post } from '../services/api';
import { useSystem } from '../components/SystemContext';
import { Panel, PageHeader, StatusTag, StateTag, LoadingState, ErrorState, EmptyState, Metric, MetricGrid, Segmented, SearchInput } from '../components/ui';
import { int, istDate, num } from '../lib/format';
import { Icon } from '../components/icons';

const STAGES = ['Detected', 'Approved', 'Scheduled', 'In Progress', 'Completed'];
const NEXT: Record<string, string[]> = {
  Detected: ['Approved'], Approved: ['Scheduled'], Scheduled: ['In Progress'],
  'In Progress': ['Completed'], Completed: [],
};

/* ================= WORK ORDERS ================= */
export function WorkOrders() {
  const sys = useSystem();
  const [sp] = useSearchParams();
  const [rows, setRows] = useState<any[] | null>(null);
  const [fleet, setFleet] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [open, setOpen] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(!!sp.get('pre'));

  const [form, setForm] = useState({
    aircraft_id: 'AS-014', component: 'Hydraulic System', issue: 'Hydraulic pump vibration exceedance',
    priority: 'High', technician: 'Unassigned', parts: 'Hydraulic Pump', est_hours: 6,
    scheduled: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10),
    ai_recommendation: 'Model recommendation: schedule targeted inspection during next window.',
  });

  useEffect(() => {
    const p = sp.get('pre');
    if (p) {
      const [a, c] = p.split(':');
      setShowForm(true);
      setForm((f) => ({
        ...f, aircraft_id: a || f.aircraft_id, component: c ? decodeURIComponent(c) : f.component,
        issue: c ? `${c} degradation — model-flagged inspection` : f.issue,
        technician: sp.get('tech') ? decodeURIComponent(sp.get('tech')!) : f.technician,
        parts: sp.get('parts') ? decodeURIComponent(sp.get('parts')!) : f.parts,
        est_hours: sp.get('hours') ? +sp.get('hours')! : f.est_hours,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.get('pre')]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [wos, ac, res] = await Promise.all([
          get('/api/work-orders'), get('/api/aircraft').catch(() => []), get('/api/resources').catch(() => []),
        ]);
        if (!alive) return;
        setRows(wos); setFleet(ac); setTechs(res); sys.markUpdated();
      } catch (e: any) { if (alive) setErr(String(e?.message || e)); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  const create = async () => {
    try {
      const r = await post('/api/work-orders', {
        ...form, parts: form.parts.split(',').map((s) => s.trim()).filter(Boolean),
        est_hours: +form.est_hours, scheduled: new Date(form.scheduled).toISOString(),
      });
      setNotice(`WORK ORDER ${r.wo_id} CREATED — ENGINEER APPROVAL RECORDED`);
      setShowForm(false);
      const wos = await get('/api/work-orders'); setRows(wos);
    } catch (e: any) { setNotice(`WORK ORDER CREATION FAILED — ${String(e?.message || e).slice(0, 120)}`); }
  };

  const move = async (id: string, status: string) => {
    await post(`/api/work-orders/${id}/status`, { status });
    setRows(await get('/api/work-orders'));
    if (status === 'Completed') setNotice(`${id} COMPLETED — AIRCRAFT TELEMETRY NORMALIZED, HEALTH RECOVERED`);
  };

  if (err) return <ErrorState title="WORK ORDER SERVICE UNAVAILABLE" message="Unable to retrieve work orders." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!rows) return <LoadingState label="FETCHING WORK ORDERS" />;

  const filtered = filter === 'ALL' ? rows : rows.filter((r) => r.status === filter);
  const counts: Record<string, number> = { ALL: rows.length };
  STAGES.forEach((s) => { counts[s] = rows.filter((r) => r.status === s).length; });

  return (
    <div>
      <PageHeader
        title="WORK ORDERS"
        sub="Approved maintenance tasks from detection to resolution. AI never autonomously authorizes maintenance — every order records engineer approval."
        provenance="HUMAN-IN-THE-LOOP · AUDIT LOGGED"
      >
        <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
          <Icon name="clipboard" size={12} /> {showForm ? 'CLOSE FORM' : 'NEW WORK ORDER'}
        </button>
      </PageHeader>

      {notice && (
        <div className="mb-3 border border-line-strong bg-surface2 px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.06em] text-acc">
          {notice}
        </div>
      )}

      {/* workflow strip — wraps on narrow viewports, no internal scrolling */}
      <div className="panel mb-3 grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-px overflow-hidden bg-line">
        <div className="min-w-0 bg-surface2 px-3 py-2.5">
          <div className="tlabel">MAINTENANCE WORKFLOW</div>
          <div className="mt-1 font-mono text-[10px] leading-relaxed text-txt-faint">DETECTION → RESOLUTION</div>
        </div>
        {STAGES.map((s, i) => (
          <div key={s} className="min-w-0 bg-surface px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-txt-dim">
                <span className="mr-1.5 text-txt-faint">{String(i + 1).padStart(2, '0')}</span>{s.toUpperCase()}
              </span>
              <span className="metric-val shrink-0 text-[15px]">{counts[s]}</span>
            </div>
            <div className="mt-1.5 h-[3px] bg-line-strong">
              <div className="h-full" style={{ width: `${counts[s] ? Math.min(100, counts[s] * 25) : 0}%`, background: s === 'Completed' ? '#6FB789' : '#56A8CC' }} />
            </div>
            {i < STAGES.length - 1 && <div className="mt-1 font-mono text-[9px] text-txt-faint">↓</div>}
          </div>
        ))}
      </div>

      {/* create form */}
      {showForm && (
        <Panel title="CREATE WORK ORDER" sub="ENGINEER APPROVAL RECORDED ON SUBMIT" icon="clipboard" className="mb-3">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(190px,100%),1fr))] gap-2">
            <label className="block"><span className="tlabel">AIRCRAFT</span>
              <select className="inp mt-1" value={form.aircraft_id} onChange={(e) => setForm({ ...form, aircraft_id: e.target.value })}>
                {(fleet.length ? fleet.map((a) => a.aircraft_id) : [form.aircraft_id]).map((id: string) => <option key={id}>{id}</option>)}
              </select></label>
            <label className="block"><span className="tlabel">COMPONENT</span>
              <select className="inp mt-1" value={form.component} onChange={(e) => setForm({ ...form, component: e.target.value })}>
                {['Engine', 'Hydraulic System', 'Landing Gear', 'Fuel System', 'Avionics', 'Electrical System', 'Cooling System'].map((c) => <option key={c}>{c}</option>)}
              </select></label>
            <label className="block"><span className="tlabel">ISSUE</span>
              <input className="inp mt-1" value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} /></label>
            <label className="block"><span className="tlabel">PRIORITY</span>
              <select className="inp mt-1" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {['Critical', 'High', 'Medium', 'Low'].map((p) => <option key={p}>{p}</option>)}
              </select></label>
            <label className="block"><span className="tlabel">TECHNICIAN</span>
              <select className="inp mt-1" value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })}>
                <option>Unassigned</option>
                {techs.map((t) => <option key={t.name}>{t.name}</option>)}
              </select></label>
            <label className="block"><span className="tlabel">PARTS (COMMA-SEPARATED)</span>
              <input className="inp mt-1" value={form.parts} onChange={(e) => setForm({ ...form, parts: e.target.value })} /></label>
            <label className="block"><span className="tlabel">EST HOURS</span>
              <input className="inp mt-1" type="number" min="1" value={form.est_hours} onChange={(e) => setForm({ ...form, est_hours: +e.target.value })} /></label>
            <label className="block"><span className="tlabel">SCHEDULED DATE</span>
              <input className="inp mt-1" type="date" value={form.scheduled} onChange={(e) => setForm({ ...form, scheduled: e.target.value })} /></label>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <span className="max-w-xl font-mono text-[9.5px] leading-relaxed tracking-[0.04em] text-txt-faint">
              {form.ai_recommendation} — AI OUTPUT IS ADVISORY; SUBMISSION RECORDS ENGINEER APPROVAL IN THE AUDIT LOG.
            </span>
            <button className="btn btn-primary" onClick={create}><Icon name="check" size={12} /> APPROVE & CREATE</button>
          </div>
        </Panel>
      )}

      {/* orders table */}
      <Panel title="WORK ORDER REGISTER" sub={`${filtered.length} ORDERS`} icon="wrench"
        right={<Segmented value={filter} onChange={setFilter} ariaLabel="Status filter"
          options={[{ id: 'ALL', label: 'ALL', count: counts.ALL }, ...STAGES.map((s) => ({ id: s, label: s.toUpperCase(), count: counts[s] }))]} />}
        bodyClass="p-0">
        {filtered.length === 0 ? (
          <div className="p-3"><EmptyState title="NO WORK ORDERS" message="No work orders in this stage."
            action={<button className="btn btn-primary" onClick={() => setShowForm(true)}>NEW WORK ORDER</button>} /></div>
        ) : (
          <div className="tablewrap" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="dt">
              <thead>
                <tr><th>WO</th><th>AIRCRAFT</th><th>COMPONENT</th><th>ISSUE</th><th>PRIORITY</th><th>TECHNICIAN</th><th>PARTS</th><th>EST</th><th>SCHEDULED</th><th>STATUS</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <React.Fragment key={r.wo_id}>
                    <tr className={`rowlink ${open === r.wo_id ? 'sel' : ''}`} onClick={() => setOpen(open === r.wo_id ? null : r.wo_id)}>
                      <td className="mono text-txt">{r.wo_id}</td>
                      <td className="mono">{r.aircraft_id}</td>
                      <td>{r.component}</td>
                      <td className="wrap-sm">{r.issue}</td>
                      <td><StatusTag s={r.priority} /></td>
                      <td>{r.technician}</td>
                      <td className="text-[11px]">{(r.parts || []).join(', ') || '—'}</td>
                      <td className="mono">{num(r.est_hours, 0)} H</td>
                      <td className="mono">{istDate(r.scheduled)}</td>
                      <td><StatusTag s={r.status} /></td>
                      <td><span className="font-mono text-[10px] text-txt-faint">{open === r.wo_id ? '▾' : '▸'}</span></td>
                    </tr>
                    {open === r.wo_id && (
                      <tr>
                        <td colSpan={11} className="!whitespace-normal !bg-inset p-0">
                          <div className="flex flex-wrap items-center justify-between gap-3 p-3">
                            <div className="grid min-w-0 flex-1 basis-[280px] grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))] gap-x-6 gap-y-1">
                              <Metric label="WORK ORDER" value={r.wo_id} />
                              <Metric label="STAGE" value={String(r.status).toUpperCase()} />
                              <Metric label="AI RECOMMENDATION" value={<span className="text-[12px]">{r.ai || '—'}</span>} />
                              <Metric label="CREATED" value={istDate(r.created_at || r.scheduled)} />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {(NEXT[r.status] || []).map((n) => (
                                <button key={n} className="btn btn-xs" onClick={() => move(r.wo_id, n)}>
                                  <Icon name="chevronRight" size={10} /> ADVANCE TO {n.toUpperCase()}
                                </button>
                              ))}
                              {r.status !== 'Completed' && (
                                <button className="btn btn-xs btn-danger" onClick={() => move(r.wo_id, 'Completed')}>
                                  <Icon name="check" size={10} /> COMPLETE — RESOLVE
                                </button>
                              )}
                              <Link className="btn btn-xs" to={`/app/aircraft/${r.aircraft_id}/diagnostics`}>AIRCRAFT →</Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-line px-3 py-2 font-mono text-[9px] leading-relaxed tracking-[0.05em] text-txt-faint">
          COMPLETING A WORK ORDER CLEARS THE SIMULATED DEGRADATION AND RECOVERS COMPONENT HEALTH IN THE SYNTHETIC DATA SET.
        </div>
      </Panel>
    </div>
  );
}

/* ================= SCHEDULE ================= */
export function Schedule() {
  const sys = useSystem();
  const [rows, setRows] = useState<any[] | null>(null);
  const [recs, setRecs] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, r] = await Promise.all([
          get('/api/schedule'), get('/api/recommendations').catch(() => []),
        ]);
        if (!alive) return;
        setRows(s); setRecs(r); sys.markUpdated();
      } catch (e: any) { if (alive) setErr(String(e?.message || e)); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  if (err) return <ErrorState title="SCHEDULE UNAVAILABLE" message="Unable to retrieve the maintenance schedule." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!rows) return <LoadingState label="FETCHING MAINTENANCE SCHEDULE" />;

  const byDate: Record<string, any[]> = {};
  rows.forEach((r) => { const d = r.date ? r.date.slice(0, 10) : 'UNSCHEDULED'; (byDate[d] = byDate[d] || []).push(r); });
  const openRecs = recs.filter((r) => !rows.some((w) => w.aircraft_id === r.aircraft_id && w.component === r.component && w.status !== 'Completed'));

  return (
    <div>
      <PageHeader
        title="MAINTENANCE SCHEDULE"
        sub="Scheduled maintenance windows from approved work orders, with model-recommended slots for open predictions."
        provenance="SLOTS FROM RECOMMENDATION ENGINE · SYNTHETIC"
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
        <Panel title="SCHEDULED MAINTENANCE" sub={`${rows.length} ENTRIES`} icon="calendar" bodyClass="p-0">
          {rows.length === 0 ? (
            <div className="p-3"><EmptyState title="NOTHING SCHEDULED" message="No open work orders with a scheduled date. Approve a recommendation to create one." action={<Link className="btn" to="/app/recommendations">MAINTENANCE PLAN →</Link>} /></div>
          ) : (
            <div className="tablewrap" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="dt">
                <thead><tr><th>DATE</th><th>WO</th><th>AIRCRAFT</th><th>COMPONENT</th><th>TECHNICIAN</th><th>PRIORITY</th><th>STATUS</th></tr></thead>
                <tbody>
                  {Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).flatMap(([d, list]) => list.map((r) => (
                    <tr key={r.wo_id}>
                      <td className="mono">{d === 'UNSCHEDULED' ? '—' : istDate(r.date)}</td>
                      <td className="mono text-txt">{r.wo_id}</td>
                      <td className="mono">{r.aircraft_id}</td>
                      <td>{r.component}</td>
                      <td>{r.technician}</td>
                      <td><StatusTag s={r.priority} /></td>
                      <td><StatusTag s={r.status} /></td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="RECOMMENDED SLOTS" sub="FROM ACTIVE PREDICTIONS — NOT YET SCHEDULED" icon="clock" bodyClass="p-0">
          {openRecs.length === 0 ? (
            <div className="p-3"><EmptyState title="NO PENDING SLOTS" message="No open recommendations awaiting scheduling." /></div>
          ) : (
            <div className="divide-y divide-line">
              {openRecs.slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div>
                    <div className="font-mono text-[12px] text-txt">{r.aircraft_id} <span className="text-txt-dim">· {r.component}</span></div>
                    <div className="mt-0.5 font-mono text-[9.5px] text-txt-faint">SLOT {istDate(r.slot)} · {r.technician.toUpperCase()} · {r.est_hours} H</div>
                  </div>
                  <Link className="btn btn-xs btn-primary" to={`/app/work-orders?pre=${r.aircraft_id}:${encodeURIComponent(r.component)}&tech=${encodeURIComponent(r.technician)}&parts=${encodeURIComponent((r.parts || []).join(','))}&hours=${r.est_hours}`}>
                    SCHEDULE →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ================= HISTORY ================= */
export function History() {
  const sys = useSystem();
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    get('/api/maintenance').then((r) => { if (alive) { setD(r); sys.markUpdated(); } })
      .catch((e) => { if (alive) setErr(String(e?.message || e)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  if (err) return <ErrorState title="MAINTENANCE RECORDS UNAVAILABLE" message="Unable to retrieve maintenance history." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!d) return <LoadingState label="FETCHING MAINTENANCE HISTORY" />;

  const records = (d.records || []).filter((r: any) => !q || r.aircraft_id.includes(q.toUpperCase()) || r.component.toLowerCase().includes(q.toLowerCase()));

  const byType: Record<string, number> = {};
  d.records.forEach((r: any) => { byType[r.type] = (byType[r.type] || 0) + 1; });

  return (
    <div>
      <PageHeader title="MAINTENANCE HISTORY" sub="Completed maintenance records across the fleet with reliability indicators (MTTR / MTBF proxy)." provenance="RECORDS: SYNTHETIC">
        <SearchInput value={q} onChange={setQ} placeholder="SEARCH AIRCRAFT / COMPONENT" />
      </PageHeader>

      <MetricGrid cols="grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))]" className="mb-3">
        <Metric label="MTTR — MEAN TIME TO REPAIR" value={`${num(d.mttr_h, 1)} H`} />
        <Metric label="MTBF PROXY" value={`${int(d.mtbf_h)} H`} hint="DERIVED FROM RECORD DOWNTIME" />
        <Metric label="RECORDS" value={int(d.records.length)} />
        <div>
          <div className="tlabel">BY TYPE</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[10.5px] text-txt-dim">
            {Object.entries(byType).map(([t, n]) => <span key={t}>{t.toUpperCase()} <span className="text-txt">{n}</span></span>)}
          </div>
        </div>
      </MetricGrid>

      <Panel title="MAINTENANCE RECORDS" sub={`${records.length} SHOWN`} icon="database" bodyClass="p-0">
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="dt">
            <thead><tr><th>DATE</th><th>AIRCRAFT</th><th>TYPE</th><th>COMPONENT</th><th>FAULT</th><th>ACTION</th><th>TECHNICIAN</th><th>DOWNTIME</th></tr></thead>
            <tbody>
              {records.map((r: any, i: number) => (
                <tr key={i}>
                  <td className="mono">{istDate(r.date)}</td>
                  <td className="mono">{r.aircraft_id}</td>
                  <td><StateTag st={r.type === 'Unscheduled' ? 'crit' : r.type === 'Overhaul' ? 'acc' : r.type === 'Inspection' ? 'warn' : 'ok'} label={r.type} /></td>
                  <td>{r.component}</td>
                  <td>{r.fault}</td>
                  <td>{r.action}</td>
                  <td>{r.technician}</td>
                  <td className="mono">{num(r.downtime, 1)} H</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
