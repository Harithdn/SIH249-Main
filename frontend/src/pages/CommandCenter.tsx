// COMMAND CENTER — operational overview.
// Hierarchy: fleet readiness → fleet status board → active events →
// health trend → predictive maintenance queue.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get } from '../services/api';
import { useSystem } from '../components/SystemContext';
import { Panel, PageHeader, Metric, MetricGrid, StatusTag, StateTag, LoadingState, ErrorState, EmptyState } from '../components/ui';
import { AvailabilityChart } from '../components/charts';
import { Icon } from '../components/icons';
import { num, pctOf, probState, rulState, stateColor, istTime, istClock } from '../lib/format';

const STATUS_ORDER = ['Critical', 'At Risk', 'Maintenance', 'Operational'];

export default function CommandCenter() {
  const sys = useSystem();
  const nav = useNavigate();
  const [d, setD] = useState<any>(null);
  const [fleet, setFleet] = useState<any>(null);
  const [preds, setPreds] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dd, fl, pr, al, ins] = await Promise.all([
          get('/api/dashboard'), get('/api/fleet'),
          get('/api/predictions?min_risk=0.35'), get('/api/alerts'), get('/api/insights'),
        ]);
        if (!alive) return;
        setD(dd); setFleet(fl); setPreds(pr); setAlerts(al); setInsights(ins);
        sys.markUpdated();
      } catch (e: any) { if (alive) setErr(String(e?.message || e)); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  if (err) return <ErrorState title="COMMAND CENTER UNAVAILABLE" message="Unable to retrieve fleet operational data from the backend service." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!d || !fleet) return <LoadingState label="FETCHING FLEET OPERATIONAL DATA" />;

  const aircraft: any[] = fleet.aircraft || [];
  const dist = fleet.distribution || {};
  const readiness = d.availability;

  const queue = [...preds].sort((a, b) => b.failure_prob - a.failure_prob).slice(0, 8);

  // group the fleet board by base
  const byBase: Record<string, any[]> = {};
  aircraft.forEach((a) => { (byBase[a.base] = byBase[a.base] || []).push(a); });
  Object.values(byBase).forEach((list) => list.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.aircraft_id.localeCompare(b.aircraft_id)));

  return (
    <div>
      <PageHeader
        title="COMMAND CENTER"
        sub="Fleet readiness, active events and the predictive maintenance queue. Priorities are ordered by failure probability and remaining useful life."
        provenance="DATA SOURCE: SIMULATION · SYNTHETIC"
      >
        <button className="btn" onClick={async () => { await sys.degrade(); sys.setCurrentAircraft('AS-014'); nav('/app/aircraft/AS-014/diagnostics'); }}>
          <Icon name="warning" size={12} /> SIMULATE DEGRADATION AS-014
        </button>
        <a className="btn" href="/api/report" target="_blank" rel="noreferrer">
          <Icon name="file" size={12} /> READINESS REPORT
        </a>
      </PageHeader>

      {/* ---------------- SECTION 1 · FLEET READINESS ---------------- */}
      <div className="mb-3">
        <div className="mb-1.5 tlabel tlabel-dim">SECTION 01 — FLEET READINESS</div>
        <MetricGrid cols="grid-cols-[repeat(auto-fit,minmax(min(158px,100%),1fr))]">
          <div>
            <Metric label="FLEET READINESS" value={<span>{num(readiness, 1)}<span className="text-[16px]">%</span></span>} st={readiness >= 75 ? 'ok' : readiness >= 60 ? 'warn' : 'alert'} />
            <div className="mt-1 break-words font-mono text-[10px] leading-relaxed text-txt-faint">
              {d.operational} / {d.fleet_size} OPERATIONAL · MTTR {num(d.mttr, 1)} H
            </div>
          </div>
          <Metric label="READY" value={d.operational} st="ok" hint={`HEALTHY ${dist.Healthy ?? '—'}`} />
          <Metric label="IN MAINT" value={d.maintenance} st="warn" hint="PLANNED DOWNTIME" />
          <Metric label="WARNING" value={d.at_risk} st="alert" hint={`MONITOR ${dist.Monitoring ?? '—'}`} />
          <Metric label="AOG / CRITICAL" value={d.critical} st="crit" hint="ATTENTION REQUIRED" />
          <Metric label="PREDICTED FAILURES 30D" value={d.predicted_30d} st={d.predicted_30d > 0 ? 'alert' : 'ok'} hint="P>50% · RUL≤30D" />
          <Metric label="WO BACKLOG" value={d.backlog} st={d.backlog > 0 ? 'warn' : 'ok'} hint="OPEN WORK ORDERS" />
        </MetricGrid>
      </div>

      {/* ---------------- SECTION 2 + 3 ---------------- */}
      <div className="mb-3 grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        {/* fleet status board */}
        <Panel title="SECTION 02 — FLEET STATUS BOARD" sub="SELECT AIRCRAFT TO OPEN WORKSPACE" icon="aircraft">
          <div className="space-y-3">
            {Object.entries(byBase).map(([base, list]) => (
              <div key={base}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="tlabel tlabel-dim">{base.toUpperCase()} (FICTIONAL)</span>
                  <span className="font-mono text-[10px] text-txt-faint">
                    {list.filter((a) => a.status === 'Operational').length}/{list.length} READY
                  </span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(68px,100%),1fr))] gap-1">
                  {list.map((a) => {
                    const st = a.status === 'Operational' ? 'ok' : a.status === 'Maintenance' ? 'warn' : a.status === 'At Risk' ? 'alert' : 'crit';
                    const c = stateColor(st as any);
                    return (
                      <button key={a.aircraft_id} onClick={() => { sys.setCurrentAircraft(a.aircraft_id); nav(`/app/aircraft/${a.aircraft_id}`); }}
                        title={`${a.aircraft_id} · ${a.platform} · ${a.status} · health ${a.health}`}
                        className="border bg-inset px-1 py-1 text-center"
                        style={{ borderColor: c + '55' }}>
                        <div className="whitespace-nowrap font-mono text-[10.5px] tracking-wide text-txt">{a.aircraft_id}</div>
                        <div className="mt-1 h-[3px] w-full" style={{ background: c }} />
                        <div className="mt-0.5 font-mono text-[8.5px] text-txt-faint">{num(a.health, 0)}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2">
              {[['Operational', 'READY'], ['Maintenance', 'IN MAINT'], ['At Risk', 'WARNING'], ['Critical', 'AOG']].map(([s, l]) => (
                <span key={s} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">
                  <span className="inline-block h-[8px] w-[8px]" style={{ background: stateColor(s === 'Operational' ? 'ok' : s === 'Maintenance' ? 'warn' : s === 'At Risk' ? 'alert' : 'crit') }} aria-hidden="true" />{l}
                </span>
              ))}
            </div>
          </div>
        </Panel>

        {/* active events */}
        {/* The feed fills the row height set by the status board and scrolls
            internally only when the two panels sit side by side; stacked, it
            renders in full and the page remains the single scroll owner. */}
        <Panel title="SECTION 03 — ACTIVE EVENTS" sub="CURRENT ALERTS BY SEVERITY" icon="alert"
          className="flex flex-col" bodyClass="flex min-h-0 flex-1 flex-col p-0">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {alerts.length === 0 ? (
              <div className="p-3"><EmptyState title="NO ACTIVE ALERTS" message="No aircraft currently require immediate attention." hint={`LAST CHECKED ${(sys.lastUpdated ? istClock(sys.lastUpdated) : '—')}`} /></div>
            ) : alerts.slice(0, 7).map((a, i) => {
              const st = a.severity === 'Critical' ? 'crit' : a.severity === 'Warning' ? 'warn' : 'off';
              const pred = preds.find((p) => p.aircraft_id === a.aircraft_id && p.component === a.component);
              return (
                <button key={i} className="block w-full border-b border-line px-3 py-2.5 text-left last:border-0 hover:bg-surface2"
                  onClick={() => a.aircraft_id && nav(`/app/aircraft/${a.aircraft_id}/diagnostics`)}>
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <StateTag st={st as any} label={a.severity === 'Critical' ? 'HIGH' : a.severity === 'Warning' ? 'MONITOR' : a.severity.toUpperCase()} className="shrink-0" />
                      <span className="shrink-0 font-mono text-[12px] text-txt">{a.aircraft_id || '—'}</span>
                      <span className="truncate text-[11.5px] text-txt-dim" title={a.component}>{a.component}</span>
                    </div>
                    {pred && (
                      <span className="shrink-0 whitespace-nowrap font-mono text-[10px]" style={{ color: stateColor(rulState(pred.rul)) }}>
                        RUL {num(pred.rul, 0)} D
                      </span>
                    )}
                  </div>
                  <div className="mt-1 break-words text-[11.5px] leading-snug text-txt-dim">{a.message}</div>
                  <div className="mt-0.5 break-words font-mono text-[9.5px] leading-snug text-txt-faint">ACTION: {a.action}</div>
                </button>
              );
            })}
          </div>
          <div className="shrink-0 border-t border-line px-3 py-2">
            <Link to="/app/alerts" className="link font-mono text-[10.5px] uppercase tracking-[0.08em]">ALL ALERTS →</Link>
          </div>
        </Panel>
      </div>

      {/* ---------------- SECTION 4 + system assessment ---------------- */}
      <div className="mb-3 grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
        <Panel title="SECTION 04 — FLEET HEALTH TREND" sub="AVAILABILITY % · 30D HISTORY · 30D PROJECTION" icon="chart"
          right={<span className="font-mono text-[9.5px] text-txt-faint">SYNTHETIC SCENARIO</span>}>
          <AvailabilityChart history={fleet.history || []} projection={fleet.projection || []} height={230} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2">
            {[['#56A8CC', 'OPERATIONAL %'], ['#6FB789', 'PROJECTED (PREDICTIVE)'], ['#5A646E', 'PROJECTED (REACTIVE)']].map(([c, l]) => (
              <span key={l} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">
                <span className="inline-block h-[2px] w-4" style={{ background: c }} aria-hidden="true" />{l}
              </span>
            ))}
          </div>
          <div className="mt-1.5 font-mono text-[9.5px] leading-relaxed text-txt-faint">
            PROJECTION SHOWS SIMULATED SCENARIO WITH PREDICTIVE SCHEDULING VS REACTIVE MAINTENANCE — NOT A MEASURED RESULT.
          </div>
        </Panel>

        <Panel title="SYSTEM ASSESSMENT" sub="AUTO-GENERATED · EVIDENCE + CONFIDENCE" icon="activity"
          className="flex flex-col" bodyClass="flex min-h-0 flex-1 flex-col p-0">
          <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain">
            {insights.length === 0 ? (
              <div className="p-3"><EmptyState title="NO ASSESSMENTS" message="No system assessments currently published." /></div>
            ) : insights.map((x, i) => (
              <div key={i} className="px-3 py-2.5">
                <div className="text-[12px] leading-snug text-txt-dim">{x.text}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 font-mono text-[9.5px] text-txt-faint">
                  <span>EVIDENCE: {x.evidence}</span>
                  <span>CONF {num((x.confidence ?? 0) * 100, 0)}%</span>
                  <span>REVIEW {String(x.review).toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="shrink-0 border-t border-line px-3 py-2 font-mono text-[9px] leading-relaxed tracking-[0.05em] text-txt-faint">
            AI-GENERATED ASSESSMENTS — ADVISORY ONLY, REQUIRE AUTHORIZED HUMAN REVIEW.
          </div>
        </Panel>
      </div>

      {/* ---------------- SECTION 5 · PREDICTIVE MAINTENANCE QUEUE ---------------- */}
      <div className="mb-3">
        <div className="mb-1.5 tlabel tlabel-dim">SECTION 05 — PREDICTIVE MAINTENANCE QUEUE</div>
        <Panel title="AIRCRAFT REQUIRING ACTION" sub="ORDERED BY FAILURE PROBABILITY" icon="warning" bodyClass="p-0">
          {queue.length === 0 ? (
            <div className="p-3"><EmptyState title="QUEUE EMPTY" message="No component predictions above the monitoring threshold (P≥35%)." hint={`LAST MODEL RUN ${(sys.lastUpdated ? istClock(sys.lastUpdated) : '—')}`} /></div>
          ) : (
            <div className="tablewrap" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="dt">
                <thead>
                  <tr>
                    <th>AIRCRAFT</th><th>COMPONENT</th><th>P(FAIL)</th><th>SEVERITY</th><th>RUL</th>
                    <th>WINDOW</th><th>CONF</th><th>ANOMALY</th><th>RECOMMENDED ACTION</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((p, i) => (
                    <tr key={i} className="rowlink" onClick={() => nav(`/app/aircraft/${p.aircraft_id}/diagnostics`)}>
                      <td className="mono">{p.aircraft_id}</td>
                      <td>{p.component}</td>
                      <td className="mono" style={{ color: stateColor(probState(p.failure_prob)) }}>{pctOf(p.failure_prob * 100, 1)}</td>
                      <td><StatusTag s={p.severity} /></td>
                      <td className="mono" style={{ color: stateColor(rulState(p.rul)) }}>{num(p.rul, 1)} D</td>
                      <td className="mono">{p.window}</td>
                      <td className="mono">{pctOf(p.confidence * 100, 0)}</td>
                      <td className="mono">{num(p.anomaly, 2)}</td>
                      <td className="wrap-sm">{p.recommendation}</td>
                      <td><span className="link font-mono text-[10px]">DIAGNOSTICS →</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-line px-3 py-2">
            <Link to="/app/predictions" className="link font-mono text-[10.5px] uppercase tracking-[0.08em]">ALL PREDICTIONS →</Link>
          </div>
        </Panel>
      </div>
    </div>
  );
}
