// LOGISTICS — inventory, predictive spares forecast, technicians.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../services/api';
import { useSystem } from '../components/SystemContext';
import { Panel, PageHeader, StateTag, LoadingState, ErrorState, Metric, SearchInput, Segmented, NotAvailable } from '../components/ui';
import { Spark, TimeSeriesChart } from '../components/charts';
import { int, pctOf } from '../lib/format';

/* ================= INVENTORY ================= */
export function Inventory() {
  const sys = useSystem();
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [risk, setRisk] = useState('ALL');

  useEffect(() => {
    let alive = true;
    get('/api/inventory').then((r) => { if (alive) { setRows(r); sys.markUpdated(); } })
      .catch((e) => { if (alive) setErr(String(e?.message || e)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  if (err) return <ErrorState title="INVENTORY UNAVAILABLE" message="Unable to retrieve spare-parts inventory." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!rows) return <LoadingState label="FETCHING SPARE PARTS INVENTORY" />;

  const counts = {
    ALL: rows.length,
    HIGH: rows.filter((r) => r.risk === 'HIGH').length,
    MEDIUM: rows.filter((r) => r.risk === 'MEDIUM').length,
    LOW: rows.filter((r) => r.risk === 'LOW').length,
  };
  const filtered = rows.filter((r) =>
    (risk === 'ALL' || r.risk === risk) &&
    (!q || r.part_id.includes(q.toUpperCase()) || r.name.toLowerCase().includes(q.toLowerCase()) || r.category.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div>
      <PageHeader
        title="SPARE PARTS INVENTORY"
        sub="Stock positions against minimum levels, predicted demand and supplier lead times. Shortages are flagged for replenishment review."
        provenance="INVENTORY DATA: SYNTHETIC"
      >
        <SearchInput value={q} onChange={setQ} placeholder="SEARCH PART / CATEGORY" />
        <Segmented value={risk} onChange={setRisk} ariaLabel="Stock risk filter"
          options={[{ id: 'ALL', label: 'ALL', count: counts.ALL }, { id: 'HIGH', label: 'SHORTAGE', count: counts.HIGH }, { id: 'MEDIUM', label: 'WATCH', count: counts.MEDIUM }, { id: 'LOW', label: 'ADEQUATE', count: counts.LOW }]} />
      </PageHeader>

      <div className="mb-3 grid gap-3 sm:grid-cols-4">
        <Metric label="TRACKED PARTS" value={int(rows.length)} className="panel px-4 py-3" />
        <Metric label="SHORTAGE (STOCK ≤ MIN)" value={counts.HIGH} className="panel px-4 py-3" st={counts.HIGH ? 'crit' : 'ok'} />
        <Metric label="WATCH LEVEL" value={counts.MEDIUM} className="panel px-4 py-3" st={counts.MEDIUM ? 'warn' : 'ok'} />
        <Metric label="ADEQUATE" value={counts.LOW} className="panel px-4 py-3" st="ok" />
      </div>

      <Panel title="PARTS REGISTER" sub={`${filtered.length} PARTS`} icon="box" bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="dt">
            <thead>
              <tr><th>PART NUMBER</th><th>DESCRIPTION</th><th>CATEGORY</th><th>STOCK / MIN</th><th>COVERAGE</th><th>DEMAND</th><th>LEAD TIME</th><th>SUPPLIER</th><th>STATUS</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const ratio = r.min_stock ? r.stock / r.min_stock : 2;
                const c = r.risk === 'HIGH' ? '#D97070' : r.risk === 'MEDIUM' ? '#D4AC55' : '#6FB789';
                return (
                  <tr key={r.part_id} className={r.risk === 'HIGH' ? 'bg-crit-dim/40' : ''}>
                    <td className="mono text-txt">{r.part_id}</td>
                    <td className="text-txt-dim">{r.name}</td>
                    <td>{r.category}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11.5px] text-txt">{r.stock}</span>
                        <span className="font-mono text-[10px] text-txt-faint">/ {r.min_stock} MIN</span>
                        <span className="inline-block h-[6px] w-14 border border-line-strong bg-inset">
                          <span className="block h-full" style={{ width: `${Math.min(100, ratio * 50)}%`, background: c }} />
                        </span>
                      </div>
                    </td>
                    <td className="mono">{ratio >= 1 ? '≥' : '<'} MIN {ratio.toFixed(1)}×</td>
                    <td className="mono">{r.demand}/MO</td>
                    <td className="mono">{r.lead_days} D</td>
                    <td className="text-[11.5px]">{r.supplier}</td>
                    <td><StateTag st={r.risk === 'HIGH' ? 'crit' : r.risk === 'MEDIUM' ? 'warn' : 'ok'} label={r.risk === 'HIGH' ? 'SHORTAGE' : r.risk === 'MEDIUM' ? 'WATCH' : 'ADEQUATE'} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 font-mono text-[9px] tracking-[0.05em] text-txt-faint">
          <span>DEMAND = EXPECTED MONTHLY CONSUMPTION (SYNTHETIC) · LEAD TIME FROM SUPPLIER MASTER</span>
          <Link to="/app/forecast" className="link font-mono text-[10px] uppercase tracking-[0.08em]">PREDICTIVE DEMAND FORECAST →</Link>
        </div>
      </Panel>
    </div>
  );
}

/* ================= FORECAST ================= */
export function Forecast() {
  const sys = useSystem();
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    get('/api/inventory/forecast').then((r) => { if (alive) { setRows(r); sys.markUpdated(); if (r.length) setSel((s) => s || r[0].part_id); } })
      .catch((e) => { if (alive) setErr(String(e?.message || e)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  if (err) return <ErrorState title="FORECAST UNAVAILABLE" message="Unable to retrieve the spares demand forecast." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!rows) return <LoadingState label="COMPUTING SPARES DEMAND FORECAST" />;

  const cur = rows.find((r) => r.part_id === sel);

  return (
    <div>
      <PageHeader
        title="SPARES DEMAND FORECAST"
        sub="Predicted component failures mapped to required parts: projected stock trajectory against predicted demand over six months."
        provenance="DEMAND FROM PREDICTION MODEL · SYNTHETIC"
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="PARTS BY PROJECTED COVERAGE" sub={`${rows.length} PARTS`} icon="box" bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="dt">
              <thead><tr><th>PART</th><th>DESCRIPTION</th><th>STOCK</th><th>PREDICTED DEMAND</th><th>COVERAGE</th><th>TRAJECTORY</th><th>STATUS</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.part_id} className={`rowlink ${sel === r.part_id ? 'sel' : ''}`} onClick={() => setSel(r.part_id)}>
                    <td className="mono text-txt">{r.part_id}</td>
                    <td className="text-txt-dim">{r.name}</td>
                    <td className="mono">{r.stock}</td>
                    <td className="mono">{r.predicted_demand}</td>
                    <td className="mono" style={{ color: r.coverage < r.stock ? '#D97070' : r.risk === 'MEDIUM' ? '#D4AC55' : '#6FB789' }}>{r.coverage > 0 ? '+' : ''}{r.coverage}</td>
                    <td><Spark data={r.series} dataKey="stock" color={r.risk === 'HIGH' ? '#D97070' : '#56A8CC'} /></td>
                    <td><StateTag st={r.risk === 'HIGH' ? 'crit' : r.risk === 'MEDIUM' ? 'warn' : 'ok'} label={r.risk === 'HIGH' ? 'SHORTFALL RISK' : r.risk === 'MEDIUM' ? 'WATCH' : 'ADEQUATE'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {cur ? (
          <Panel title={`STOCK TRAJECTORY — ${cur.part_id}`} sub={cur.name} icon="chart">
            <div className="mb-2 grid grid-cols-3 gap-3 border-b border-line pb-2">
              <Metric label="CURRENT STOCK" value={cur.stock} />
              <Metric label="PREDICTED DEMAND" value={cur.predicted_demand} st={cur.risk === 'HIGH' ? 'crit' : 'warn'} />
              <Metric label="COVERAGE" value={cur.coverage} st={cur.risk === 'HIGH' ? 'crit' : 'ok'} />
            </div>
            <TimeSeriesChart data={cur.series} xKey="m" height={170}
              series={[{ key: 'stock', label: 'PROJECTED STOCK', color: cur.risk === 'HIGH' ? '#D97070' : '#56A8CC' }]}
              unit=" units" yDigits={0} />
            <div className="mt-2 border-t border-line pt-2">
              <div className="tlabel tlabel-dim">RECOMMENDATION</div>
              <div className="mt-1 text-[12px] leading-relaxed text-txt-dim">{cur.recommendation}</div>
            </div>
          </Panel>
        ) : <Panel title="STOCK TRAJECTORY"><NotAvailable /></Panel>}
      </div>
    </div>
  );
}

/* ================= TECHNICIANS ================= */
export function Technicians() {
  const sys = useSystem();
  const [rows, setRows] = useState<any[] | null>(null);
  const [wos, setWos] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [res, w] = await Promise.all([get('/api/resources'), get('/api/work-orders').catch(() => [])]);
        if (!alive) return;
        setRows(res); setWos(w); sys.markUpdated();
      } catch (e: any) { if (alive) setErr(String(e?.message || e)); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  const assigned = useMemo(() => {
    const m: Record<string, any[]> = {};
    wos.filter((w) => w.status !== 'Completed' && w.technician !== 'Unassigned')
      .forEach((w) => { (m[w.technician] = m[w.technician] || []).push(w); });
    return m;
  }, [wos]);

  if (err) return <ErrorState title="RESOURCES UNAVAILABLE" message="Unable to retrieve technician assignments." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!rows) return <LoadingState label="FETCHING TECHNICIAN ASSIGNMENTS" />;

  return (
    <div>
      <PageHeader
        title="TECHNICIANS"
        sub="Specialization, availability, workload and active assignments. Assignment happens through the work-order workflow."
        provenance="RESOURCE DATA: SYNTHETIC"
      />

      <div className="mb-3 grid gap-3 sm:grid-cols-3">
        <Metric label="TECHNICIANS" value={rows.length} className="panel px-4 py-3" />
        <Metric label="AVAILABLE (>60%)" value={rows.filter((t) => t.availability > 0.6).length} className="panel px-4 py-3" st="ok" />
        <Metric label="OPEN ASSIGNMENTS" value={Object.values(assigned).reduce((s: number, l: any[]) => s + l.length, 0)} className="panel px-4 py-3" st="warn" />
      </div>

      <Panel title="WORKFORCE REGISTER" sub={`${rows.length} TECHNICIANS`} icon="person" bodyClass="p-0">
        <div className="overflow-x-auto">
          <table className="dt">
            <thead>
              <tr><th>TECHNICIAN</th><th>SPECIALIZATION</th><th>AVAILABILITY</th><th>WORKLOAD</th><th>ACTIVE JOBS</th><th>ASSIGNED WORK ORDERS</th><th>STATUS</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const jobs = assigned[t.name] || [];
                const avail = t.availability >= 0.6 ? 'ok' : t.availability >= 0.4 ? 'warn' : 'crit';
                return (
                  <tr key={t.name}>
                    <td className="text-txt">{t.name}</td>
                    <td>{t.skill}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-[6px] w-16 border border-line-strong bg-inset">
                          <span className="block h-full" style={{ width: `${t.availability * 100}%`, background: avail === 'ok' ? '#6FB789' : avail === 'warn' ? '#D4AC55' : '#D97070' }} />
                        </span>
                        <span className="font-mono text-[11px]">{pctOf(t.availability * 100, 0)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-[6px] w-16 border border-line-strong bg-inset">
                          <span className="block h-full" style={{ width: `${t.workload * 100}%`, background: t.workload > 0.75 ? '#D97070' : '#D4AC55' }} />
                        </span>
                        <span className="font-mono text-[11px]">{pctOf(t.workload * 100, 0)}</span>
                      </div>
                    </td>
                    <td className="mono">{t.active_jobs}</td>
                    <td>
                      {jobs.length === 0 ? <span className="text-txt-faint">—</span> : (
                        <span className="font-mono text-[11px] text-txt-dim">{jobs.map((j) => j.wo_id).join(', ')}</span>
                      )}
                    </td>
                    <td><StateTag st={avail} label={avail === 'ok' ? 'AVAILABLE' : avail === 'warn' ? 'LIMITED' : 'FULLY LOADED'} /></td>
                    <td>{jobs.length > 0 && <Link className="link font-mono text-[10px]" to="/app/work-orders">WORK ORDERS →</Link>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-3 py-2 font-mono text-[9px] tracking-[0.05em] text-txt-faint">
          AVAILABILITY AND WORKLOAD ARE SYNTHETIC RESOURCE-PLANNING VALUES; ACTIVE JOBS ARE JOINED FROM THE OPEN WORK-ORDER REGISTER.
        </div>
      </Panel>
    </div>
  );
}
