// COMMAND CENTER — operational overview.
// Hierarchy: fleet readiness → fleet status board → active events →
// health trend → predictive maintenance queue.
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get } from '../services/api';
import { useSystem } from '../components/SystemContext';
import { Panel, PageHeader, Metric, MetricGrid, StatusTag, StateTag, LoadingState, ErrorState, EmptyState } from '../components/ui';
import { AvailabilityChart, Spark } from '../components/charts';
import { Icon } from '../components/icons';
import { num, pctOf, probState, rulState, healthState, stateColor, statusLabel, istClock } from '../lib/format';

const STATUS_ORDER = ['Critical', 'At Risk', 'Maintenance', 'Operational'];

/** Compact key/value row for the fleet readiness summary rail. */
function SumRow({ label, value, dot, color }: { label: string; value: ReactNode; dot?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 font-mono text-[10.5px] uppercase leading-tight tracking-[0.06em]">
      <span className="flex min-w-0 items-center gap-1.5 text-txt-faint">
        {dot && <span className="inline-block h-[7px] w-[7px] shrink-0" style={{ background: dot }} aria-hidden="true" />}
        <span className="min-w-0 break-words">{label}</span>
      </span>
      <span className="shrink-0 whitespace-nowrap num" style={{ color: color || 'var(--txt)' }}>{value}</span>
    </div>
  );
}

export default function CommandCenter() {
  const sys = useSystem();
  const nav = useNavigate();
  const [d, setD] = useState<any>(null);
  const [fleet, setFleet] = useState<any>(null);
  const [preds, setPreds] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dd, fl, pr, al, ins, wo] = await Promise.all([
          get('/api/dashboard'), get('/api/fleet'),
          get('/api/predictions?min_risk=0.35'), get('/api/alerts'), get('/api/insights'),
          get('/api/work-orders').catch(() => []),
        ]);
        if (!alive) return;
        setD(dd); setFleet(fl); setPreds(pr); setAlerts(al); setInsights(ins); setWorkOrders(wo);
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

  // ---- fleet status board aggregations (all derived from the live fetches above) ----
  // elevated component risks per aircraft (the /api/predictions feed is already ≥35% P)
  const predsByAircraft: Record<string, { n: number; minRul: number }> = {};
  preds.forEach((p) => {
    const e = predsByAircraft[p.aircraft_id] || { n: 0, minRul: Infinity };
    e.n += 1;
    if (typeof p.rul === 'number' && p.rul < e.minRul) e.minRul = p.rul;
    predsByAircraft[p.aircraft_id] = e;
  });
  const lowestRul = Object.entries(predsByAircraft).reduce<{ id: string; rul: number } | null>(
    (acc, [id, e]) => (isFinite(e.minRul) && (acc === null || e.minRul < acc.rul) ? { id, rul: e.minRul } : acc),
    null
  );
  // active (unresolved) alerts per aircraft
  const alertsByAircraft: Record<string, number> = {};
  alerts.forEach((a) => { if (a.aircraft_id && a.status !== 'Resolved') alertsByAircraft[a.aircraft_id] = (alertsByAircraft[a.aircraft_id] || 0) + 1; });
  // status distribution + aircraft requiring attention
  const sc: Record<string, number> = { Operational: 0, Maintenance: 0, 'At Risk': 0, Critical: 0 };
  const attention = new Set<string>();
  aircraft.forEach((a) => {
    if (sc[a.status] != null) sc[a.status]++;
    if (a.status === 'At Risk' || a.status === 'Critical') attention.add(a.aircraft_id);
  });
  Object.keys(predsByAircraft).forEach((k) => attention.add(k));
  Object.keys(alertsByAircraft).forEach((k) => attention.add(k));
  const total = aircraft.length || 1;
  const distSegs = [
    { label: 'READY', n: sc.Operational, color: stateColor('ok') },
    { label: 'IN MAINT', n: sc.Maintenance, color: stateColor('warn') },
    { label: 'WARNING', n: sc['At Risk'], color: stateColor('alert') },
    { label: 'AOG', n: sc.Critical, color: stateColor('crit') },
  ];
  const healthSegs = [
    { label: 'HEALTHY', n: dist.Healthy ?? 0, color: stateColor('ok') },
    { label: 'MONITOR', n: dist.Monitoring ?? 0, color: stateColor('warn') },
    { label: 'AT RISK', n: dist['At Risk'] ?? 0, color: stateColor('alert') },
    { label: 'CRITICAL', n: dist.Critical ?? 0, color: stateColor('crit') },
  ];
  const readinessColor = stateColor(d.availability >= 75 ? 'ok' : d.availability >= 60 ? 'warn' : 'crit');
  const averageHealth = aircraft.length
    ? aircraft.reduce((sum, a) => sum + (Number(a.health) || 0), 0) / aircraft.length
    : 0;
  const criticalComponents = preds.filter((p) => p.rul <= 30 || p.failure_prob >= 0.75).length;
  const highestRisk = queue[0];
  const activeMaintenance = workOrders.filter((w) => ['Scheduled', 'In Progress'].includes(w.status)).length;
  const unassignedMaintenance = workOrders.filter((w) => w.status !== 'Completed' && w.technician === 'Unassigned').length;
  const now = Date.now();
  const upcomingMaintenance = workOrders.filter((w) => {
    if (w.status === 'Completed' || !w.scheduled) return false;
    const t = new Date(w.scheduled).getTime();
    return Number.isFinite(t) && t >= now - 864e5 && t <= now + 14 * 864e5;
  }).length;
  const readinessHistory = fleet.history || [];
  const currentTrend = readinessHistory.length > 1
    ? (readinessHistory[readinessHistory.length - 1]?.operational ?? d.availability) -
      (readinessHistory[Math.max(0, readinessHistory.length - 8)]?.operational ?? d.availability)
    : 0;

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
      <div className="mb-3 grid items-stretch gap-3 xl:grid-cols-[minmax(0,2.35fr)_minmax(340px,0.85fr)]">
        {/* fleet status board — cards fill the width; a readiness summary rail
            occupies the right side; a readiness distribution strip fills the
            lower edge. Every figure derives from the live fetches above. */}
        <Panel title="SECTION 02 — FLEET STATUS BOARD" sub="SELECT AIRCRAFT TO OPEN WORKSPACE" icon="aircraft">
          <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)]">
            {/* aircraft cards grouped by base */}
            <div className="min-w-0 space-y-3">
              {Object.entries(byBase).map(([base, list]) => (
                <div key={base}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="tlabel tlabel-dim">{base.toUpperCase()} (FICTIONAL)</span>
                    <span className="shrink-0 font-mono text-[10px] text-txt-faint">
                      {list.filter((a) => a.status === 'Operational').length}/{list.length} READY
                    </span>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(min(134px,100%),1fr))] gap-1.5">
                    {list.map((a) => {
                      const st = a.status === 'Operational' ? 'ok' : a.status === 'Maintenance' ? 'warn' : a.status === 'At Risk' ? 'alert' : 'crit';
                      const c = stateColor(st as any);
                      const pr = predsByAircraft[a.aircraft_id];
                      const ac = alertsByAircraft[a.aircraft_id] || 0;
                      const hColor = stateColor(healthState(a.health));
                      const hPct = typeof a.health === 'number' && !isNaN(a.health) ? Math.max(0, Math.min(100, a.health)) : 0;
                      return (
                        <button key={a.aircraft_id} onClick={() => { sys.setCurrentAircraft(a.aircraft_id); nav(`/app/aircraft/${a.aircraft_id}`); }}
                          title={`${a.aircraft_id} · ${a.platform} · ${a.status} · health ${num(a.health, 1)}${pr ? ` · ${pr.n} elevated component risk${pr.n > 1 ? 's' : ''} · min RUL ${num(pr.minRul, 0)}D` : ''}${ac ? ` · ${ac} active alert${ac > 1 ? 's' : ''}` : ''}`}
                          className="min-w-0 border bg-inset px-2.5 py-2 text-left hover:bg-surface2"
                          style={{ borderColor: c + '55' }}>
                          <div className="flex min-w-0 items-center justify-between gap-1.5">
                            <span className="whitespace-nowrap font-mono text-[12px] font-medium tracking-[0.04em] text-txt">{a.aircraft_id}</span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              {ac > 0 && <span className="whitespace-nowrap font-mono text-[9px] leading-none text-crit">▲{ac}</span>}
                              <span className="inline-block h-[7px] w-[7px]" style={{ background: c }} aria-hidden="true" />
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-baseline justify-between gap-1">
                            <span className="tlabel">HEALTH</span>
                            <span className="font-mono text-[15px] leading-none num" style={{ color: hColor }}>{num(a.health, 1)}</span>
                          </div>
                          <div className="mt-1.5 h-[3px] w-full border border-line-strong bg-inset" aria-hidden="true">
                            <div className="h-full" style={{ width: `${hPct}%`, background: c }} />
                          </div>
                          <div className="mt-1.5 flex items-center justify-between gap-1.5 font-mono text-[9px] uppercase leading-none tracking-[0.06em]">
                            <span className="whitespace-nowrap" style={{ color: c }}>{statusLabel(a.status)}</span>
                            {pr ? (
                              <span className="whitespace-nowrap" style={{ color: stateColor(rulState(pr.minRul)) }}>
                                RUL {num(pr.minRul, 0)}D{pr.n > 1 ? ` · ${pr.n} RISK` : ''}
                              </span>
                            ) : (
                              <span className="whitespace-nowrap text-txt-faint">NOMINAL</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* readiness distribution — fills the lower edge of the board */}
              <div className="border-t border-line pt-2.5">
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <span className="tlabel tlabel-dim">READINESS DISTRIBUTION</span>
                  <span className="font-mono text-[10px] text-txt-faint">{d.fleet_size} AIRCRAFT · {num(d.availability, 1)}% MISSION READY</span>
                </div>
                <div className="flex h-[6px] w-full overflow-hidden border border-line-strong bg-inset"
                  role="img"
                  aria-label={`Readiness distribution — ${sc.Operational} ready, ${sc.Maintenance} in maintenance, ${sc['At Risk']} warning, ${sc.Critical} AOG`}>
                  {distSegs.filter((s) => s.n > 0).map((s) => (
                    <div key={s.label} className="h-full" style={{ width: `${(s.n / total) * 100}%`, background: s.color }} />
                  ))}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                  {distSegs.map((s) => (
                    <span key={s.label} className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">
                      <span className="inline-block h-[8px] w-[8px] shrink-0" style={{ background: s.color }} aria-hidden="true" />
                      {s.label} <span className="text-txt-dim num">{s.n}</span>
                      <span className="num">({pctOf((s.n / total) * 100, 0)})</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Operational summary uses the board's second column for actual
                fleet, prediction and maintenance data rather than stretching
                aircraft cards or leaving an empty rail. */}
            <aside className="flex min-w-0 flex-col border border-line bg-inset" aria-label="Fleet readiness summary">
              <div className="border-b border-line bg-surface2 px-3 py-2">
                <span className="tlabel tlabel-dim">OPERATIONAL READINESS SUMMARY</span>
              </div>
              <div className="flex flex-1 flex-col px-3 py-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                  <div>
                    <div className="tlabel">MISSION READY</div>
                    <div className="mt-1 font-mono text-[30px] leading-none num" style={{ color: readinessColor }}>
                      {num(d.availability, 1)}<span className="text-[14px]">%</span>
                    </div>
                    <div className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.05em] text-txt-faint">
                      {d.operational} OF {d.fleet_size} OPERATIONAL
                    </div>
                  </div>
                  <div className="min-w-0 text-right">
                    <Spark data={readinessHistory} dataKey="operational" width={124} height={36} color={readinessColor} />
                    <div className={`mt-1 font-mono text-[9.5px] num ${currentTrend >= 0 ? 'text-ok' : 'text-crit'}`}>
                      7D {currentTrend > 0 ? '+' : ''}{num(currentTrend, 1)} PT
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 h-[5px] w-full border border-line-strong bg-base" aria-hidden="true">
                  <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, d.availability))}%`, background: readinessColor }} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden border border-line bg-line sm:grid-cols-4 2xl:grid-cols-2">
                  {distSegs.map((s) => (
                    <div key={s.label} className="min-w-0 bg-surface px-2.5 py-2">
                      <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.06em] text-txt-faint">
                        <span className="h-[7px] w-[7px] shrink-0" style={{ background: s.color }} aria-hidden="true" />
                        <span className="truncate">{s.label}</span>
                      </div>
                      <div className="mt-1 font-mono text-[17px] leading-none text-txt num">{s.n}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 border-t border-line pt-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="tlabel tlabel-dim">FLEET HEALTH / RISK</span>
                    <span className="font-mono text-[11px] num" style={{ color: stateColor(healthState(averageHealth)) }}>{num(averageHealth, 1)} AVG</span>
                  </div>
                  <div className="flex h-[6px] overflow-hidden border border-line-strong bg-base" role="img" aria-label="Fleet health risk distribution">
                    {healthSegs.filter((s) => s.n > 0).map((s) => (
                      <span key={s.label} className="h-full" style={{ width: `${(s.n / total) * 100}%`, background: s.color }} />
                    ))}
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1">
                    {healthSegs.map((s) => <SumRow key={s.label} label={s.label} value={s.n} dot={s.color} />)}
                  </div>
                </div>

                <div className="mt-3 grid gap-3 border-t border-line pt-2.5 sm:grid-cols-2 2xl:grid-cols-1">
                  <div className="space-y-1.5">
                    <div className="tlabel tlabel-dim mb-1">RISK PRIORITIES</div>
                    <SumRow label="AIRCRAFT REQ. ATTENTION" value={attention.size} color={attention.size ? stateColor('alert') : stateColor('ok')} />
                    <SumRow label="ACTIVE ALERTS" value={alerts.length} color={alerts.length ? stateColor('crit') : stateColor('ok')} />
                    <SumRow label="CRITICAL COMPONENTS" value={criticalComponents} color={criticalComponents ? stateColor('crit') : stateColor('ok')} />
                    <SumRow label="PRED FAILURE · 30D" value={d.predicted_30d} color={d.predicted_30d ? stateColor('alert') : stateColor('ok')} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="tlabel tlabel-dim mb-1">MAINTENANCE LOAD</div>
                    <SumRow label="WORK ORDER BACKLOG" value={d.backlog} color={d.backlog ? stateColor('warn') : stateColor('ok')} />
                    <SumRow label="ACTIVE ACTIONS" value={activeMaintenance} color={activeMaintenance ? stateColor('warn') : undefined} />
                    <SumRow label="UPCOMING · 14D" value={upcomingMaintenance} />
                    <SumRow label="UNASSIGNED" value={unassignedMaintenance} color={unassignedMaintenance ? stateColor('alert') : stateColor('ok')} />
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-line pt-2.5">
                  {highestRisk && (
                    <SumRow label={`HIGHEST RISK · ${highestRisk.aircraft_id}`}
                      value={pctOf(highestRisk.failure_prob * 100, 0)} color={stateColor(probState(highestRisk.failure_prob))} />
                  )}
                  {lowestRul && (
                    <SumRow label={`LOWEST RUL · ${lowestRul.id}`}
                      value={`${num(lowestRul.rul, 0)} D`} color={stateColor(rulState(lowestRul.rul))} />
                  )}
                </div>

                <Link to="/app/fleet" className="link mt-auto block border-t border-line pt-2.5 font-mono text-[10.5px] uppercase tracking-[0.08em]">
                  FULL FLEET REGISTRY →
                </Link>
              </div>
            </aside>
          </div>
        </Panel>

        {/* Active events shares the status-board row without adding another
            scroll owner; the document remains the command center's scrollbar. */}
        <Panel title="SECTION 03 — ACTIVE EVENTS" sub="CURRENT ALERTS BY SEVERITY" icon="alert"
          className="flex flex-col" bodyClass="flex min-h-0 flex-1 flex-col p-0">
          <div className="min-h-0 flex-1">
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
