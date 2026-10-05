// ANALYTICS — fleet trends, failure analysis, scenario simulation.
import { useEffect, useMemo, useState } from 'react';
import { get, post } from '../services/api';
import { useSystem } from '../components/SystemContext';
import { Panel, PageHeader, Metric, MetricGrid, LoadingState, ErrorState, EmptyState, NotAvailable, StateTag } from '../components/ui';
import { AvailabilityChart, ParetoChart, CHART } from '../components/charts';
import { num, pctOf } from '../lib/format';
import { Icon } from '../components/icons';

/* ================= FLEET TRENDS ================= */
export function Analytics() {
  const sys = useSystem();
  const [a, setA] = useState<any>(null);
  const [fleet, setFleet] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [an, fl] = await Promise.all([get('/api/analytics'), get('/api/fleet')]);
        if (!alive) return;
        setA(an); setFleet(fl); sys.markUpdated();
      } catch (e: any) { if (alive) setErr(String(e?.message || e)); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  if (err) return <ErrorState title="ANALYTICS UNAVAILABLE" message="Unable to retrieve fleet analytics." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!a || !fleet) return <LoadingState label="COMPUTING FLEET ANALYTICS" />;

  const delta = (a.predictive_avail ?? 0) - (a.reactive_avail ?? 0);

  return (
    <div>
      <PageHeader
        title="FLEET TRENDS"
        sub="Availability history and projection, and the computed comparison between reactive and predictive maintenance postures."
        provenance="AVAILABILITY MODEL · SYNTHETIC SCENARIO"
      >
        <a className="btn" href="/api/report" target="_blank" rel="noreferrer"><Icon name="download" size={12} /> READINESS REPORT</a>
      </PageHeader>

      <MetricGrid cols="grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))]" className="mb-3">
        <Metric label="CURRENT AVAILABILITY" value={`${num((fleet.history || []).slice(-1)[0]?.operational, 1)}%`} />
        <Metric label="REACTIVE POSTURE" value={`${num(a.reactive_avail, 1)}%`} hint="FROM HISTORICAL DOWNTIME" />
        <Metric label="PREDICTIVE POSTURE" value={`${num(a.predictive_avail, 1)}%`} st={delta >= 0 ? 'ok' : 'crit'} hint="PROJECTED, SIMULATED" />
        <Metric label="PROJECTED DELTA" value={`${delta >= 0 ? '+' : ''}${num(delta, 1)}%`} st={delta >= 0 ? 'ok' : 'crit'} hint="SIMULATED SCENARIO ONLY" />
      </MetricGrid>

      <div className="grid gap-3">
        <Panel title="FLEET AVAILABILITY — HISTORY & PROJECTION" sub="30D MEASURED · 30D PROJECTED" icon="chart">
          <AvailabilityChart history={fleet.history || a.availability_trend || []} projection={fleet.projection || []} height={250} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2">
            {[['#56A8CC', 'OPERATIONAL %'], ['#6FB789', 'PROJECTED (PREDICTIVE)'], ['#5A646E', 'PROJECTED (REACTIVE)'], ['#5A646E', '— PLANNING FLOOR 70%']].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">
                <span className="inline-block h-[2px] w-4" style={{ background: c }} aria-hidden="true" />{l}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="REACTIVE VS PREDICTIVE POSTURE" sub="COMPUTED FROM DB RECORDS" icon="activity">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-4">
            <div>
              <div className="tlabel tlabel-dim mb-2">REACTIVE — FROM HISTORICAL DOWNTIME</div>
              <div className="metric-val text-[24px]">{num(a.reactive_avail, 1)}%</div>
              <div className="mt-1.5 text-[11.5px] leading-relaxed text-txt-faint">
                Computed from recorded maintenance downtime across the fleet: unplanned failures, longer corrective cycles and inventory uncertainty.
              </div>
              <div className="mt-3 h-[8px] border border-line-strong bg-inset">
                <div className="h-full bg-[#8A95A0]" style={{ width: `${a.reactive_avail}%` }} />
              </div>
            </div>
            <div>
              <div className="tlabel tlabel-dim mb-2">PREDICTIVE — PROJECTED WITH EARLY WARNINGS</div>
              <div className="metric-val text-[24px]" style={{ color: CHART.tertiary }}>{num(a.predictive_avail, 1)}%</div>
              <div className="mt-1.5 text-[11.5px] leading-relaxed text-txt-faint">
                Projected when predicted failures are planned into maintenance windows: shorter downtime, parts pre-positioned, scheduled labor.
              </div>
              <div className="mt-3 h-[8px] border border-line-strong bg-inset">
                <div className="h-full" style={{ width: `${a.predictive_avail}%`, background: CHART.tertiary }} />
              </div>
            </div>
          </div>
          <div className="mt-3 border-t border-line pt-2 font-mono text-[9px] leading-relaxed tracking-[0.05em] text-txt-faint">
            {a.note ? a.note.toUpperCase() : ''} — VALUES ARE COMPUTED FROM THE SYNTHETIC DATASET, NOT MEASURED AIRLINE OPERATIONS.
          </div>
        </Panel>

        <Panel title="RELIABILITY INDICATORS" icon="database">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3">
            <Metric label="MTBF (PROXY)" value={`${num(a.mtbf, 0)} H`} hint="PROTOTYPE ESTIMATE" />
            <Metric label="MTTR" value={`${num(a.mttr, 1)} H`} hint="MEAN TIME TO REPAIR" />
            <Metric label="FLEET SIZE" value={fleet.aircraft?.length ?? '—'} hint="REGISTERED AIRCRAFT" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ================= FAILURE ANALYSIS ================= */
export function FailureAnalysis() {
  const sys = useSystem();
  const [a, setA] = useState<any>(null);
  const [anoms, setAnoms] = useState<any[]>([]);
  const [maint, setMaint] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [an, anm, m] = await Promise.all([
          get('/api/analytics'), get('/api/anomalies').catch(() => []), get('/api/maintenance').catch(() => null),
        ]);
        if (!alive) return;
        // guard the contract: anomalies must be an array (a malformed 200
        // response would otherwise crash anomalyByComp's forEach on render)
        setA(an); setAnoms(Array.isArray(anm) ? anm : []); setMaint(m); sys.markUpdated();
      } catch (e: any) { if (alive) setErr(String(e?.message || e)); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  const faultCounts = useMemo(() => {
    const m: Record<string, number> = {};
    (maint?.records || []).forEach((r: any) => { if (r.fault) m[r.fault] = (m[r.fault] || 0) + 1; });
    return Object.entries(m).sort((x, y) => y[1] - x[1]);
  }, [maint]);

  const anomalyByComp = useMemo(() => {
    const m: Record<string, number> = {};
    anoms.forEach((a) => { m[a.component] = (m[a.component] || 0) + 1; });
    return Object.entries(m).sort((x, y) => y[1] - x[1]);
  }, [anoms]);

  if (err) return <ErrorState title="FAILURE ANALYSIS UNAVAILABLE" message="Unable to retrieve failure analytics." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!a) return <LoadingState label="COMPUTING FAILURE ANALYSIS" />;

  return (
    <div>
      <PageHeader
        title="FAILURE ANALYSIS"
        sub="Where failures concentrate: predicted failures by component (Pareto), recorded fault modes and active anomaly distribution."
        provenance="PREDICTED FAILURES: P>50% · SYNTHETIC"
      />

      <div className="grid gap-3">
        <Panel title="FAILURE PARETO — PREDICTED FAILURES BY COMPONENT" sub="COUNTS + CUMULATIVE SHARE" icon="chart">
          {a.pareto?.length ? (
            <>
              <ParetoChart data={a.pareto} height={250} />
              <div className="tablewrap mt-2 border-t border-line pt-2" tabIndex={0} role="region" aria-label="Scrollable table">
                <table className="dt">
                  <thead><tr><th>COMPONENT</th><th>PREDICTED FAILURES</th><th>CUMULATIVE %</th></tr></thead>
                  <tbody>
                    {a.pareto.map((p: any) => (
                      <tr key={p.component}>
                        <td className="text-txt">{p.component}</td>
                        <td className="mono">{p.failures}</td>
                        <td className="mono">{pctOf(p.cum_pct, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EmptyState title="NO PREDICTED FAILURES" message="No component currently exceeds the 50% failure-probability threshold." />
          )}
        </Panel>

        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title="RECORDED FAULT MODES" sub="MAINTENANCE HISTORY" icon="database" bodyClass="p-0">
            {faultCounts.length === 0 ? <div className="p-3"><NotAvailable label="NO RECORDS" /></div> : (
              <div className="tablewrap" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="dt">
                <thead><tr><th>FAULT MODE</th><th>RECORDS</th><th>SHARE</th></tr></thead>
                <tbody>
                  {faultCounts.map(([f, n]) => (
                    <tr key={f}>
                      <td className="text-txt">{f}</td>
                      <td className="mono">{n}</td>
                      <td className="mono">{pctOf((n / (maint?.records || []).length) * 100, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Panel>

          <Panel title="ACTIVE ANOMALIES BY COMPONENT" sub="DETECTOR OUTPUT" icon="alert" bodyClass="p-0">
            {anomalyByComp.length === 0 ? <div className="p-3"><EmptyState title="NO ACTIVE ANOMALIES" message="No sensor channel currently exceeds the anomaly threshold." /></div> : (
              <div className="tablewrap" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="dt">
                <thead><tr><th>COMPONENT</th><th>ACTIVE ANOMALIES</th></tr></thead>
                <tbody>
                  {anomalyByComp.map(([c, n]) => (
                    <tr key={c}>
                      <td className="text-txt">{c}</td>
                      <td className="mono"><StateTag st={n > 3 ? 'crit' : 'warn'} label={String(n)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ================= SCENARIO SIMULATION ================= */
export function WhatIf() {
  const [f, setF] = useState({ capacity: 0, technicians: 0, delay: 0 });
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true); setErr(null);
    try { setR(await post('/api/whatif', f)); } catch (e: any) { setErr(String(e?.message || e)); }
    setBusy(false);
  };

  const FIELDS: [keyof typeof f, string, string][] = [
    ['capacity', 'MAINTENANCE CAPACITY Δ', '% CHANGE — POSITIVE ADDS CAPACITY'],
    ['technicians', 'TECHNICIAN FORCE Δ', 'HEADCOUNT CHANGE'],
    ['delay', 'MAINTENANCE DELAY Δ', 'ADDITIONAL DAYS OF DEFERRAL'],
  ];

  return (
    <div>
      <PageHeader
        title="SCENARIO SIMULATION"
        sub="What-if analysis of fleet availability under changes to maintenance capacity, technician force and deferral policy."
        provenance="SIMULATION — NOT A MEASURED RESULT"
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(320px,3fr)]">
        <Panel title="SCENARIO INPUTS" icon="gear">
          <div className="grid gap-3">
            {FIELDS.map(([k, label, hint]) => (
              <label key={k} className="block">
                <span className="tlabel">{label}</span>
                <input className="inp mt-1 font-mono" type="number" value={f[k]}
                  onChange={(e) => setF({ ...f, [k]: +e.target.value })} aria-label={label} />
                <span className="mt-0.5 block font-mono text-[9px] tracking-[0.04em] text-txt-faint">{hint}</span>
              </label>
            ))}
            <button className="btn btn-primary justify-center" onClick={run} disabled={busy}>
              {busy ? 'SIMULATING…' : 'RUN SIMULATION'}
            </button>
          </div>
        </Panel>

        <Panel title="SIMULATION RESULT" sub={r ? 'COMPUTED AGAINST CURRENT FLEET STATE' : 'NO SCENARIO RUN'} icon="chart">
          {err && <ErrorState title="SIMULATION FAILED" message="The what-if service could not be reached." detail={err} onRetry={run} />}
          {!err && !r && (
            <EmptyState title="NO SCENARIO RUN"
              message="Enter capacity, technician and delay deltas, then run the simulation to project availability."
              hint="EXAMPLE: CAPACITY −20 SIMULATES A WORKSHOP BOTTLENECK" />
          )}
          {!err && r && (
            <>
              <MetricGrid cols="grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))]">
                <Metric label="SIMULATED AVAILABILITY" value={`${num(r.simulated_availability, 1)}%`} big st={r.simulated_availability >= 70 ? 'ok' : 'alert'} />
                <Metric label="SIMULATED BACKLOG" value={r.simulated_backlog} big st={r.simulated_backlog > 0 ? 'warn' : 'ok'} hint="OPEN WORK ORDERS" />
              </MetricGrid>
              <div className="mt-3 border-t border-line pt-2 font-mono text-[9.5px] leading-relaxed tracking-[0.05em] text-txt-faint">
                {String(r.note || '').toUpperCase()} — THE SIMULATION APPLIES A SIMPLIFIED RESPONSE MODEL TO THE CURRENT SYNTHETIC FLEET STATE.
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
