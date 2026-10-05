// AIRCRAFT WORKSPACE — the per-aircraft operational context.
// Tabs: OVERVIEW (subsystem health, timeline, history) · DIGITAL TWIN ·
// TELEMETRY (engineered charts with thresholds) · DIAGNOSTICS (model
// reasoning, RUL, anomalies, recommended action).
import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { get } from '../services/api';
import { useSystem } from '../components/SystemContext';
import { Panel, SectionHeader, StatusTag, StateTag, HealthBar, LoadingState, ErrorState, EmptyState, Metric, MetricGrid, ContribBar, NotAvailable, KV } from '../components/ui';
import { TelemetryChart, RulChart, CHART } from '../components/charts';
import { Icon } from '../components/icons';
import {
  clockOnly, compShort, healthState, int, istDate, istTime, num, pctOf, probState,
  rulState, SENSOR_SPEC, stateColor, deviation, parseTs, istDateTime, istClock } from '../lib/format';

/* =================== workspace shell =================== */
export default function AircraftWorkspace() {
  const { id } = useParams();
  const sys = useSystem();
  const location = useLocation();
  const navigate = useNavigate();
  // /app/aircraft/:id(/tab) — segment 4 is the workspace tab
  const tab = location.pathname.split('/')[4] || 'overview';

  const [detail, setDetail] = useState<any>(null);
  const [preds, setPreds] = useState<any[]>([]);
  const [fleetOptions, setFleetOptions] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (id) sys.setCurrentAircraft(id); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [d, p, ac] = await Promise.all([
          get(`/api/aircraft/${id}`),
          get(`/api/aircraft/${id}/predictions`).catch(() => []),
          get('/api/aircraft').catch(() => []),
        ]);
        if (!alive) return;
        setDetail(d); setPreds(p); setFleetOptions(ac); sys.markUpdated();
      } catch (e: any) { if (alive) setErr(String(e?.message || e)); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sys.refreshKey]);

  if (err) return <ErrorState title="AIRCRAFT DATA UNAVAILABLE" message={`Unable to retrieve operational data for ${id}.`} detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!detail) return <LoadingState label={`FETCHING AIRCRAFT ${id || ''}`} />;

  const topPred = [...preds].sort((a, b) => b.failure_prob - a.failure_prob)[0];
  const healthSt = healthState(detail.health);

  const tabs: [string, string, string][] = [
    [``, 'OVERVIEW', 'aircraft'],
    [`telemetry`, 'TELEMETRY', 'waveform'],
    [`diagnostics`, 'DIAGNOSTICS', 'target'],
  ];

  return (
    <div>
      {/* ---------- header ---------- */}
      <div className="mb-3 border-b border-line pb-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link to="/app/fleet" className="link font-mono text-[10px] uppercase tracking-[0.1em]">← FLEET</Link>
            <span className="hidden h-4 w-px bg-line-strong sm:block" aria-hidden="true" />
            <label className="flex min-w-0 items-center gap-2">
              <span className="tlabel whitespace-nowrap">AIRCRAFT</span>
              <select
                className="inp w-auto min-w-[118px] py-1 font-mono text-[11px]"
                value={detail.aircraft_id}
                onChange={(e) => {
                  const next = e.target.value;
                  sys.setCurrentAircraft(next);
                  navigate(`/app/aircraft/${next}${tab === 'overview' ? '' : `/${tab}`}`);
                }}
                aria-label="Select aircraft"
              >
                {(fleetOptions.length ? fleetOptions : [detail]).map((a) => (
                  <option key={a.aircraft_id} value={a.aircraft_id}>{a.aircraft_id} · {a.platform}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="tlabel">SIMULATION</span>
            <button className="btn btn-xs" onClick={() => sys.degrade(id, topPred?.component || 'Hydraulic System', 0.2)}>
              <Icon name="warning" size={11} /> DEGRADE {compShort[topPred?.component] || 'SYSTEM'}
            </button>
            <button className="btn btn-xs" onClick={() => sys.resetSim(id)}>
              <Icon name="refresh" size={11} /> RESET
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-end gap-x-4 gap-y-2">
            <div>
              <h1 className="break-words font-mono text-[26px] font-medium leading-[1.2] tracking-[0.06em] text-txt">{detail.aircraft_id}</h1>
              <div className="tlabel mt-0.5 break-words">{detail.platform} · {detail.base} (FICTIONAL) · {detail.squadron}</div>
            </div>
            <StatusTag s={detail.status} className="mb-1" />
          </div>
        </div>

        {/* metrics strip — data freshness is shown once, in the top system bar */}
        <MetricGrid cols="grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))]" className="mt-3">
          <div>
            <div className="tlabel">HEALTH INDEX</div>
            <div className="metric-val mt-0.5 text-[19px]" style={{ color: stateColor(healthSt) }}>{num(detail.health, 1)}<span className="text-[11px] text-txt-faint"> /100</span></div>
          </div>
          <div>
            <div className="tlabel">RUL (MIN)</div>
            <div className="metric-val mt-0.5 text-[19px]" style={{ color: stateColor(rulState(Math.min(...(detail.components || []).map((c: any) => c.rul)))) }}>
              {num(Math.min(...(detail.components || []).map((c: any) => c.rul)), 1)}<span className="ml-1 text-[11px] text-txt-faint">D</span>
            </div>
          </div>
          <div>
            <div className="tlabel">FAILURE PROBABILITY</div>
            <div className="metric-val mt-0.5 text-[19px]" style={{ color: stateColor(probState(topPred?.failure_prob ?? 0)) }}>
              {topPred ? pctOf(topPred.failure_prob * 100, 1) : '—'}
            </div>
            <div className="mt-0.5 font-mono text-[9.5px] text-txt-faint">{topPred ? topPred.component.toUpperCase() : 'NO ACTIVE PREDICTION'}</div>
          </div>
          <div>
            <div className="tlabel">FLIGHT HOURS</div>
            <div className="metric-val mt-0.5 text-[19px]">{int(detail.flight_hours)}</div>
          </div>
          <div>
            <div className="tlabel">CYCLES</div>
            <div className="metric-val mt-0.5 text-[19px]">{int(detail.cycles)}</div>
          </div>
          <div>
            <div className="tlabel">LAST MAINTENANCE</div>
            <div className="metric-val mt-0.5 text-[14px]">{istDate(detail.last_maintenance)}</div>
          </div>
          <div>
            <div className="tlabel">NEXT MAINTENANCE</div>
            <div className="metric-val mt-0.5 text-[14px]">{istDate(detail.next_maintenance)}</div>
          </div>
        </MetricGrid>
      </div>

      {/* ---------- tabs ---------- */}
      <nav className="utabs mb-3" aria-label="Aircraft workspace sections">
        {tabs.map(([path, label]) => (
          <NavLink key={path} end to={`/app/aircraft/${id}${path ? '/' + path : ''}`} className={({ isActive }) => (isActive ? 'on' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>

      {tab === 'overview' && <OverviewTab detail={detail} preds={preds} />}
      {tab === 'telemetry' && <TelemetryTab aid={detail.aircraft_id} />}
      {tab === 'diagnostics' && <DiagnosticsTab detail={detail} preds={preds} />}
    </div>
  );
}

/* =================== OVERVIEW =================== */
function OverviewTab({ detail, preds }: { detail: any; preds: any[] }) {
  const comps: any[] = detail.components || [];
  const [selEvent, setSelEvent] = useState<any>(null);
  const nav = useNavigate();

  const timeline = useMemo(() => {
    const items = (detail.history || [])
      .filter((h: any) => h.date)
      .map((h: any) => ({ ...h, ts: parseTs(h.date) }))
      .sort((a: any, b: any) => (a.ts?.getTime() || 0) - (b.ts?.getTime() || 0));
    return items;
  }, [detail.history]);

  const t0 = timeline[0]?.ts?.getTime() || 0;
  const t1 = Date.now();
  const pos = (t?: number) => Math.max(2, Math.min(98, ((t || t0) - t0) / Math.max(1, t1 - t0) * 96 + 2));
  const typeColor = (t: string) => (t === 'Unscheduled' ? '#D97070' : t === 'Overhaul' ? '#56A8CC' : t === 'Inspection' ? '#D4AC55' : '#6FB789');

  return (
    <div className="grid gap-3">
      {/* subsystem health matrix */}
      <Panel title="SUBSYSTEM HEALTH MATRIX" sub="LIVE MODEL ESTIMATES PER COMPONENT" icon="engine" bodyClass="p-0">
        <div className="tablewrap" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="dt">
            <thead>
              <tr><th>SUBSYSTEM</th><th>HEALTH</th><th>STATE</th><th>RUL</th><th>P(FAIL)</th><th>OP HOURS</th><th>MAINT COUNT</th><th>LAST INSPECTION</th><th></th></tr>
            </thead>
            <tbody>
              {comps.map((c) => {
                const st = healthState(c.health);
                return (
                  <tr key={c.name} className="rowlink" onClick={() => nav(`/app/aircraft/${detail.aircraft_id}/twin`)}>
                    <td className="text-txt">{compShort[c.name] || c.name}</td>
                    <td><HealthBar value={c.health} width={120} /></td>
                    <td><StateTag st={st} label={c.health >= 80 ? 'NOMINAL' : c.health >= 65 ? 'MONITOR' : c.health >= 50 ? 'DEGRADED' : 'CRITICAL'} /></td>
                    <td className="mono" style={{ color: stateColor(rulState(c.rul)) }}>{num(c.rul, 1)} D</td>
                    <td className="mono" style={{ color: stateColor(probState(c.failure_prob)) }}>{pctOf(c.failure_prob * 100, 1)}</td>
                    <td className="mono">{int(c.hours)}</td>
                    <td className="mono">{c.cycles}</td>
                    <td className="mono">{istDate(c.last_inspection)}</td>
                    <td><span className="link font-mono text-[10px]">TWIN →</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* degradation / maintenance timeline */}
      <Panel title="OPERATIONAL & MAINTENANCE TIMELINE" sub="MAINTENANCE RECORDS → CURRENT STATE" icon="clock">
        {timeline.length === 0 ? <EmptyState title="NO HISTORY" message="No maintenance records registered for this aircraft." /> : (
          <>
            <div className="relative mb-2 h-16 border border-line bg-inset px-3">
              <div className="absolute left-3 right-3 top-8 h-px bg-line-strong" aria-hidden="true" />
              {timeline.map((h: any, i: number) => (
                <button key={i} className="absolute -translate-x-1/2 p-1" style={{ left: `${pos(h.ts?.getTime())}%`, top: '24px' }}
                  onClick={() => setSelEvent(h)} title={`${istDate(h.date)} · ${h.type} · ${h.component}`}>
                  <span className="block h-[9px] w-[9px] border" style={{ background: typeColor(h.type), borderColor: selEvent === h ? '#56A8CC' : 'transparent' }} />
                </button>
              ))}
              <span className="absolute top-[11px] -translate-x-1/2 p-1" style={{ left: '98.5%' }} title="CURRENT">
                <span className="block h-[9px] w-[9px] border border-acc bg-inset" />
              </span>
              <span className="tlabel absolute left-3 top-1">EARLIEST RECORD</span>
              <span className="tlabel absolute right-3 top-1 hidden sm:block">NOW · HEALTH {num(detail.health, 1)}</span>
              <span className="tlabel absolute bottom-1 left-3">{istDate(timeline[0]?.date)}</span>
              <span className="tlabel absolute bottom-1 right-3">{istDate(new Date().toISOString())}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {[['Scheduled', '#6FB789'], ['Unscheduled', '#D97070'], ['Inspection', '#D4AC55'], ['Overhaul', '#56A8CC']].map(([t, c]) => (
                <span key={t} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">
                  <span className="inline-block h-[8px] w-[8px]" style={{ background: c }} aria-hidden="true" />{t}
                </span>
              ))}
              <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">SELECT A MARKER FOR RECORD DETAIL</span>
            </div>
            {selEvent && (
              <div className="mt-3 grid gap-x-8 border border-line bg-inset px-3 py-2.5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="lg:col-span-3 mb-1 flex items-center gap-2">
                  <StateTag st={selEvent.type === 'Unscheduled' ? 'crit' : selEvent.type === 'Overhaul' ? 'acc' : 'warn'} label={selEvent.type} />
                  <span className="font-mono text-[12px] text-txt">{istDateTime(selEvent.date)}</span>
                </div>
                <KV k="COMPONENT" v={selEvent.component} />
                <KV k="FAULT" v={selEvent.fault} />
                <KV k="ACTION" v={selEvent.action} />
                <KV k="TECHNICIAN" v={selEvent.technician} />
                <KV k="DOWNTIME" v={`${num(selEvent.downtime, 1)} H`} />
              </div>
            )}
          </>
        )}
      </Panel>

      {/* active predictions */}
      <Panel title="ACTIVE PREDICTIONS" sub="THIS AIRCRAFT · SORTED BY FAILURE PROBABILITY" icon="warning" bodyClass="p-0">
        {preds.filter((p) => p.failure_prob > 0.35).length === 0 ? (
          <div className="p-3"><EmptyState title="NO ELEVATED RISK" message="All component failure probabilities are below the monitoring threshold (35%)." hint="CONTINUE STANDARD MONITORING" /></div>
        ) : (
          <div className="tablewrap" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="dt">
              <thead><tr><th>COMPONENT</th><th>P(FAIL)</th><th>SEVERITY</th><th>RUL</th><th>WINDOW</th><th>CONF</th><th>ANOMALY</th><th>RECOMMENDATION</th><th></th></tr></thead>
              <tbody>
                {preds.filter((p) => p.failure_prob > 0.35).sort((a, b) => b.failure_prob - a.failure_prob).map((p, i) => (
                  <tr key={i}>
                    <td className="text-txt">{p.component}</td>
                    <td className="mono" style={{ color: stateColor(probState(p.failure_prob)) }}>{pctOf(p.failure_prob * 100, 1)}</td>
                    <td><StatusTag s={p.severity} /></td>
                    <td className="mono" style={{ color: stateColor(rulState(p.rul)) }}>{num(p.rul, 1)} D</td>
                    <td className="mono">{p.window}</td>
                    <td className="mono">{pctOf(p.confidence * 100, 0)}</td>
                    <td className="mono">{num(p.anomaly, 2)}</td>
                    <td className="wrap">{p.recommendation}</td>
                    <td><Link className="link font-mono text-[10px]" to={`/app/aircraft/${detail.aircraft_id}/diagnostics`}>REASONING →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* =================== TELEMETRY =================== */
function TelemetryTab({ aid }: { aid: string }) {
  const sys = useSystem();
  const [tel, setTel] = useState<any[] | null>(null);
  const [hours, setHours] = useState(24);
  const [comp, setComp] = useState('ALL');
  const [err, setErr] = useState<string | null>(null);
  const comps = ['ALL', 'Engine', 'Hydraulic System', 'Landing Gear', 'Fuel System', 'Avionics', 'Electrical System', 'Cooling System'];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await get(`/api/aircraft/${aid}/telemetry?hours=${hours}${comp !== 'ALL' ? `&component=${encodeURIComponent(comp)}` : ''}`);
        if (!alive) return;
        setTel(r); sys.markUpdated();
      } catch (e: any) { if (alive) setErr(String(e?.message || e)); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aid, hours, comp, sys.refreshKey]);

  const data = useMemo(() => (tel || []).map((r) => ({ ...r, ts: clockOnly(r.t) })), [tel]);
  const latest = data[data.length - 1];

  const channels: { key: string; height?: number }[] = [
    { key: 'vibration' }, { key: 'temperature' }, { key: 'pressure' },
    { key: 'rpm' }, { key: 'voltage' }, { key: 'fuel_flow' },
  ];

  return (
    <div className="grid gap-3">
      <div className="panel flex flex-wrap items-center gap-3 px-3 py-2">
        <span className="tlabel">COMPONENT</span>
        <div className="seg flex-wrap">
          {comps.map((c) => <button key={c} className={comp === c ? 'on' : ''} onClick={() => setComp(c)}>{c === 'ALL' ? 'ALL SYSTEMS' : (compShort[c] || c).toUpperCase()}</button>)}
        </div>
        <span className="tlabel ml-2">RANGE</span>
        <div className="seg">
          {[1, 6, 24, 48].map((h) => <button key={h} className={hours === h ? 'on' : ''} onClick={() => setHours(h)}>{h}H</button>)}
        </div>
        <span className="ml-auto whitespace-nowrap font-mono text-[10px] text-txt-faint">{data.length} SAMPLES</span>
      </div>

      {err && <ErrorState title="TELEMETRY UNAVAILABLE" message={`Unable to retrieve telemetry for ${aid}.`} detail={err} onRetry={() => sys.bumpRefresh()} />}
      {!err && !tel && <LoadingState label="LOADING TELEMETRY" />}

      {!err && tel && (
        <>
          {data.length === 0 ? (
            <EmptyState title="NO TELEMETRY IN WINDOW" message={`No sensor readings recorded for ${aid} in the selected ${hours}-hour window${comp !== 'ALL' ? ` for ${comp}` : ''}.`} hint="SELECT A WIDER RANGE OR DIFFERENT COMPONENT" />
          ) : (
            <>
              {/* actual vs expected summary */}
              <Panel title="ACTUAL VS EXPECTED" sub="LATEST SAMPLE AGAINST LEARNED BASELINE" icon="activity" bodyClass="p-0">
                <div className="tablewrap" tabIndex={0} role="region" aria-label="Scrollable table">
                  <table className="dt">
                    <thead><tr><th>CHANNEL</th><th>UNIT</th><th>EXPECTED</th><th>ACTUAL</th><th>DEVIATION</th><th>THRESHOLD STATE</th></tr></thead>
                    <tbody>
                      {channels.map(({ key }) => {
                        const spec = SENSOR_SPEC[key];
                        const v = latest?.[key];
                        const dev = deviation(v, spec.baseline);
                        const breach = spec.warn != null && v > spec.warn;
                        return (
                          <tr key={key}>
                            <td className="text-txt">{spec.label}</td>
                            <td className="mono">{spec.unit}</td>
                            <td className="mono">{spec.fmt(spec.baseline)}</td>
                            <td className="mono">{v != null ? spec.fmt(v) : '—'}</td>
                            <td className="mono" style={{ color: breach ? '#D4AC55' : dev.sign !== 0 ? '#929CA5' : undefined }}>{dev.abs !== '—' ? `${dev.abs} ${spec.unit} (${dev.rel})` : '—'}</td>
                            <td>
                              {spec.warn != null
                                ? breach ? <StateTag st="warn" label={`ABOVE ${spec.warn} ${spec.unit}`} /> : <StateTag st="ok" label="WITHIN LIMITS" />
                                : <NotAvailable label="NO THRESHOLD DEFINED" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-line px-3 py-1.5 font-mono text-[9px] leading-relaxed tracking-[0.05em] text-txt-faint">
                  BASELINES AND WARNING THRESHOLDS ARE THOSE USED BY THE ANOMALY-DETECTION PIPELINE (LEARNED ON SYNTHETIC DATA).
                </div>
              </Panel>

              <div className="grid gap-3 lg:grid-cols-2">
                {channels.map(({ key, height }) => {
                  const spec = SENSOR_SPEC[key];
                  const v = latest?.[key];
                  const thresholds = spec.warn != null ? [{ y: spec.warn, label: `WARNING ${spec.warn}`, color: CHART.warn }] : [];
                  const bands = spec.band ? [{ from: spec.band[0], to: spec.band[1], label: 'NORMAL RANGE', color: CHART.ok }] : [];
                  const markers = key === 'vibration'
                    ? data.filter((r) => r.vibration > 5.0).map((r) => ({ x: r.ts, y: r.vibration }))
                    : key === 'temperature'
                      ? data.filter((r) => r.temperature > 100).map((r) => ({ x: r.ts, y: r.temperature }))
                      : [];
                  return (
                    <TelemetryChart
                      key={key} title={spec.label} unit={spec.unit}
                      current={v != null ? spec.fmt(v) : undefined}
                      data={data.map((r) => ({ ...r, __base: spec.baseline }))} xKey="ts" height={height || 170}
                      series={[
                        { key, label: 'ACTUAL', color: CHART.primary },
                        ...(spec.baseline != null ? [{ key: '__base', label: `BASELINE ${spec.baseline}`, color: '#5A646E', dash: '4 4', width: 1 }] : []),
                      ]}
                      thresholds={thresholds} bands={bands} markers={markers}
                      xFmt={(x) => String(x).slice(0, 5)}
                      legend={markers.length > 0 ? (
                        <span className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">
                          <span className="inline-block h-[7px] w-[7px] rotate-45" style={{ background: CHART.crit }} aria-hidden="true" /> ANOMALY ({markers.length})
                        </span>
                      ) : undefined}
                    />
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* =================== DIAGNOSTICS =================== */
function DiagnosticsTab({ detail, preds }: { detail: any; preds: any[] }) {
  const sys = useSystem();
  const aid = detail.aircraft_id;
  const [anoms, setAnoms] = useState<any[]>([]);
  const [rulRows, setRulRows] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [an, rl] = await Promise.all([
          get('/api/anomalies').catch(() => []),
          get('/api/rul').catch(() => []),
        ]);
        if (!alive) return;
        setAnoms(an.filter((a: any) => a.aircraft_id === aid));
        setRulRows(rl.filter((r: any) => r.aircraft_id === aid));
      } catch { /* handled by empty states */ }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aid, sys.refreshKey]);

  const top = [...preds].sort((a, b) => b.failure_prob - a.failure_prob)[0];
  const rulMatch = top ? rulRows.find((r) => r.component === top.component) : null;
  const expTotal = top?.explanation?.reduce((s: number, e: any) => s + e.pct, 0) ?? 0;

  return (
    <div className="grid gap-3">
      {!top ? (
        <Panel title="PREDICTED FAILURE" icon="target">
          <EmptyState title="NO ELEVATED RISK" message="The current model run does not flag any component of this aircraft above the monitoring threshold." hint="CONTINUE MONITORING · SEE TELEMETRY TAB" />
        </Panel>
      ) : (
        <>
          {/* primary diagnostic: what / severity */}
          <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1fr)]">
            <Panel title="PREDICTED FAILURE" sub={`PRIMARY RISK COMPONENT · ${aid}`} icon="target">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="tlabel">PREDICTED FAILURE MODE</div>
                  <div className="mt-1 font-mono text-[16px] font-medium tracking-[0.04em] text-txt">
                    {top.component.toUpperCase()} DEGRADATION
                  </div>
                  <div className="mt-1 text-[11.5px] text-txt-faint">{top.recommendation}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusTag s={top.severity} />
                    {top.low_confidence && <StateTag st="warn" label="LOW CONFIDENCE — ADDITIONAL TELEMETRY RECOMMENDED" className="tag-fit" />}
                  </div>
                </div>
                <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(130px,100%),1fr))] gap-x-6 gap-y-2 sm:min-w-[280px]">
                  <Metric label="PROBABILITY" value={pctOf(top.failure_prob * 100, 1)} st={probState(top.failure_prob)} />
                  <Metric label="RUL" value={`${num(top.rul, 1)} D`} st={rulState(top.rul)} hint={`WINDOW ${top.window}`} />
                  <Metric label="MODEL CONFIDENCE" value={pctOf(top.confidence * 100, 0)} />
                  <Metric label="ANOMALY SCORE" value={num(top.anomaly, 2)} st={top.anomaly > 0.55 ? 'warn' : undefined} />
                </div>
              </div>
              <div className="mt-3 border-t border-line pt-2 font-mono text-[9.5px] leading-relaxed tracking-[0.05em] text-txt-faint">
                CLASSIFIER: RANDOMFOREST PROXY (XGBOOST-CLASS PIPELINE) · OUTPUTS ARE ADVISORY AND REQUIRE AUTHORIZED HUMAN REVIEW.
              </div>
            </Panel>

            {/* feature contributions */}
            <Panel title="FEATURE CONTRIBUTION" sub="PERTURBATION-BASED · MODEL RUN" icon="chart">
              <SectionHeader title="DRIVERS OF CURRENT PREDICTION" />
              {top.explanation?.map((e: any) => <ContribBar key={e.feature} label={e.feature} pct={e.pct} />)}
              {expTotal === 0 && (
                <div className="mt-2 border border-line bg-inset px-2.5 py-2 font-mono text-[10px] leading-relaxed tracking-[0.04em] text-txt-faint">
                  NO DOMINANT DRIVER — PERTURBATION CONTRIBUTIONS ARE UNIFORM FOR THIS SAMPLE.
                </div>
              )}
              <div className="mt-3 border-t border-line pt-2 text-[11px] leading-relaxed text-txt-faint">
                Each value is the share of probability increase attributable to a +10% perturbation of that input
                feature, measured on the live classification model. Values sum to 100% across the five measured drivers.
              </div>
            </Panel>
          </div>

          {/* RUL visualization */}
          <Panel title="RUL — REMAINING USEFUL LIFE" sub={top.component.toUpperCase()} icon="clock"
            right={<span className="font-mono text-[10px] text-txt-faint">EXPECTED RANGE {top.window}</span>}>
            {rulMatch ? (
              <>
                <div className="mb-2 grid grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] gap-x-6 gap-y-2 border-b border-line pb-2">
                  <Metric label="CURRENT RUL" value={`${num(rulMatch.rul, 1)} D`} st={rulState(rulMatch.rul)} />
                  <Metric label="EXPECTED RANGE" value={`${num(rulMatch.lo, 1)}–${num(rulMatch.hi, 1)} D`} hint={`CONFIDENCE ${pctOf(rulMatch.confidence * 100, 0)}`} />
                  <Metric label="DEGRADATION" value={pctOf(rulMatch.degradation, 1)} st={rulMatch.degradation > 40 ? 'alert' : rulMatch.degradation > 25 ? 'warn' : 'ok'} />
                  <Metric label="TREND" value={<span style={{ color: '#D4AC55' }}>DECLINING</span>} hint="PROJECTED TO FAILURE THRESHOLD" />
                </div>
                <RulChart history={rulMatch.history} projection={rulMatch.projection} height={220} />
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                  {[['#56A8CC', 'MEASURED RUL (HISTORY)'], ['#D4AC55', 'PROJECTED RUL'], ['#D97070', 'FAILURE THRESHOLD']].map(([c, l]) => (
                    <span key={l} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">
                      <span className="inline-block h-[2px] w-4" style={{ background: c }} aria-hidden="true" />{l}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState title="RUL CURVE NOT AVAILABLE" message="The RUL service returned no degradation curve for this component in the current run." hint="CURRENT ESTIMATE FROM PREDICTION MODEL ONLY" />
            )}
          </Panel>
        </>
      )}

      {/* anomalies for this aircraft */}
      <Panel title="ANOMALY DETECTION" sub={`ACTIVE ANOMALIES · ${aid}`} icon="alert" bodyClass="p-0">
        {anoms.length === 0 ? (
          <div className="p-3"><EmptyState title="NO ACTIVE ANOMALIES" message="No sensor channel on this aircraft currently exceeds the anomaly threshold." hint={`LAST CHECK ${(sys.lastUpdated ? istClock(sys.lastUpdated) : '—')}`} /></div>
        ) : (
          <div className="tablewrap" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="dt">
              <thead><tr><th>TIME</th><th>COMPONENT</th><th>SENSOR</th><th>VALUE</th><th>EXPECTED</th><th>DEVIATION</th><th>SCORE</th><th>SEVERITY</th><th>ASSESSMENT</th></tr></thead>
              <tbody>
                {anoms.map((a, i) => (
                  <tr key={i}>
                    <td className="mono">{istTime(a.timestamp)}</td>
                    <td>{a.component}</td>
                    <td className="mono">{a.sensor}</td>
                    <td className="mono">{num(a.value, 2)} mm/s</td>
                    <td className="mono">{a.expected}</td>
                    <td className="mono">{a.deviation > 0 ? '+' : ''}{num(a.deviation, 1)}%</td>
                    <td className="mono">{num(a.score, 2)}</td>
                    <td><StateTag st={a.severity === 'HIGH' ? 'crit' : a.severity === 'MEDIUM' ? 'alert' : 'warn'} label={a.severity} /></td>
                    <td className="wrap text-[11.5px]">{a.assessment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* action */}
      {top && (
        <Panel title="RECOMMENDED ACTION" sub="FROM PREDICTION TO MAINTENANCE EXECUTION" icon="wrench">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="max-w-2xl">
              <div className="text-[13px] text-txt-dim">{top.recommendation}</div>
              <div className="mt-1 font-mono text-[9.5px] tracking-[0.05em] text-txt-faint">
                HUMAN REVIEW REQUIRED — AI OUTPUTS ARE ADVISORY AND DO NOT AUTHORIZE MAINTENANCE.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="btn" to={`/app/recommendations`}><Icon name="clipboard" size={12} /> MAINTENANCE PLAN</Link>
              <Link className="btn btn-primary" to={`/app/work-orders?pre=${aid}:${encodeURIComponent(top.component)}`}>
                <Icon name="wrench" size={12} /> CREATE WORK ORDER
              </Link>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
