// PREDICTIVE MAINTENANCE — fleet-wide predictions, anomaly detection, RUL.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get } from '../services/api';
import { useSystem } from '../components/SystemContext';
import { Panel, PageHeader, StatusTag, StateTag, LoadingState, ErrorState, EmptyState, ContribBar, Metric, SearchInput, Segmented, NotAvailable } from '../components/ui';
import { RulChart } from '../components/charts';
import { istTime, num, pctOf, probState, rulState, stateColor } from '../lib/format';

/* ================= PREDICTIONS ================= */
export function Predictions() {
  const sys = useSystem();
  const nav = useNavigate();
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [min, setMin] = useState(0.3);
  const [sev, setSev] = useState<string>('ALL');
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    get(`/api/predictions?min_risk=0`).then((r) => { if (alive) { setRows(r); sys.markUpdated(); } })
      .catch((e) => { if (alive) setErr(String(e?.message || e)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  if (err) return <ErrorState title="PREDICTION SERVICE UNAVAILABLE" message="Unable to retrieve failure predictions from the model service." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!rows) return <LoadingState label="RUNNING FAILURE PREDICTION" />;

  const counts = {
    ALL: rows.length,
    Critical: rows.filter((r) => r.severity === 'Critical').length,
    High: rows.filter((r) => r.severity === 'High').length,
    Medium: rows.filter((r) => r.severity === 'Medium').length,
    Low: rows.filter((r) => r.severity === 'Low').length,
  };
  const filtered = rows.filter((r) => r.failure_prob >= min && (sev === 'ALL' || r.severity === sev))
    .sort((a, b) => b.failure_prob - a.failure_prob);

  return (
    <div>
      <PageHeader
        title="FAILURE PREDICTIONS"
        sub="Component-level failure probability, remaining useful life and model confidence, recomputed from live telemetry. Select a row for model reasoning."
        provenance="MODEL: RANDOMFOREST PROXY · SYNTHETIC EVALUATION"
      >
        <label className="flex items-center gap-2">
          <span className="tlabel">MIN P(FAIL) {(min * 100).toFixed(0)}%</span>
          <input type="range" min="0" max="0.8" step="0.05" value={min} onChange={(e) => setMin(+e.target.value)} className="inp w-32" aria-label="Minimum failure probability" />
        </label>
        <Segmented value={sev} onChange={setSev} ariaLabel="Severity filter"
          options={[
            { id: 'ALL', label: 'ALL', count: counts.ALL }, { id: 'Critical', label: 'CRITICAL', count: counts.Critical },
            { id: 'High', label: 'HIGH', count: counts.High }, { id: 'Medium', label: 'MEDIUM', count: counts.Medium },
            { id: 'Low', label: 'LOW', count: counts.Low },
          ]} />
      </PageHeader>

      <Panel title="PREDICTED COMPONENT FAILURES" sub={`${filtered.length} COMPONENTS`} icon="target" bodyClass="p-0">
        {filtered.length === 0 ? (
          <div className="p-3"><EmptyState title="NO PREDICTIONS MATCH FILTER" message="No components above the selected probability threshold." hint={`MODEL RUN ${istTime(new Date().toISOString())}`} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="dt">
              <thead>
                <tr><th>AIRCRAFT</th><th>COMPONENT</th><th>P(FAIL)</th><th>SEVERITY</th><th>RUL</th><th>WINDOW</th><th>CONFIDENCE</th><th>ANOMALY</th><th>VIB</th><th>TEMP</th><th>RECOMMENDATION</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <React.Fragment key={i}>
                    <tr className={`rowlink ${open === i ? 'sel' : ''}`} onClick={() => setOpen(open === i ? null : i)}>
                      <td className="mono">{p.aircraft_id}</td>
                      <td className="text-txt">{p.component}</td>
                      <td className="mono" style={{ color: stateColor(probState(p.failure_prob)) }}>{pctOf(p.failure_prob * 100, 1)}</td>
                      <td><StatusTag s={p.severity} /></td>
                      <td className="mono" style={{ color: stateColor(rulState(p.rul)) }}>{num(p.rul, 1)} D</td>
                      <td className="mono">{p.window}</td>
                      <td className="mono">{pctOf(p.confidence * 100, 0)}{p.low_confidence && <span className="ml-1 text-warn">LOW</span>}</td>
                      <td className="mono">{num(p.anomaly, 2)}</td>
                      <td className="mono">{num(p.vib, 2)}</td>
                      <td className="mono">{num(p.temp, 1)}°</td>
                      <td style={{ whiteSpace: 'normal' }} className="max-w-[240px] text-[11.5px]">{p.recommendation}</td>
                      <td><span className="font-mono text-[10px] text-txt-faint">{open === i ? '▾' : '▸'} REASONING</span></td>
                    </tr>
                    {open === i && (
                      <tr>
                        <td colSpan={12} className="!whitespace-normal !bg-inset p-0">
                          <div className="grid gap-4 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]">
                            <div>
                              <div className="tlabel tlabel-dim mb-1.5">FEATURE CONTRIBUTION (PERTURBATION-BASED)</div>
                              {p.explanation?.map((e: any) => <ContribBar key={e.feature} label={e.feature} pct={e.pct} />)}
                              <div className="mt-1 font-mono text-[9px] text-txt-faint">SHARE OF PROBABILITY INCREASE FROM +10% FEATURE PERTURBATION</div>
                            </div>
                            <div>
                              <div className="tlabel tlabel-dim mb-1.5">SENSOR CONTEXT</div>
                              <div className="grid grid-cols-2 gap-x-6">
                                <Metric label="VIBRATION" value={`${num(p.vib, 2)} mm/s`} st={p.vib > 5 ? 'warn' : 'ok'} />
                                <Metric label="TEMPERATURE" value={`${num(p.temp, 1)} °C`} st={p.temp > 100 ? 'warn' : 'ok'} />
                                <Metric label="ANOMALY SCORE" value={num(p.anomaly, 2)} st={p.anomaly > 0.55 ? 'warn' : undefined} />
                                <Metric label="CONFIDENCE" value={pctOf(p.confidence * 100, 0)} />
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <button className="btn" onClick={(e) => { e.stopPropagation(); nav(`/app/aircraft/${p.aircraft_id}/diagnostics`); }}>OPEN DIAGNOSTICS →</button>
                              <Link className="btn btn-primary" to={`/app/work-orders?pre=${p.aircraft_id}:${encodeURIComponent(p.component)}`} onClick={(e) => e.stopPropagation()}>CREATE WORK ORDER</Link>
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
      </Panel>
    </div>
  );
}

/* ================= ANOMALIES ================= */
export function Anomalies() {
  const sys = useSystem();
  const nav = useNavigate();
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<any>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    get('/api/anomalies').then((r) => { if (alive) { setRows(r); sys.markUpdated(); } })
      .catch((e) => { if (alive) setErr(String(e?.message || e)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  if (err) return <ErrorState title="ANOMALY SERVICE UNAVAILABLE" message="Unable to retrieve anomaly detections." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!rows) return <LoadingState label="RUNNING ANOMALY DETECTION" />;

  const filtered = rows.filter((r) => !q || r.aircraft_id.includes(q.toUpperCase()) || r.component.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="ANOMALY DETECTION"
        sub="Sensor deviations flagged by the IsolationForest detector plus deterministic threshold rules. Select a detection for the engineering explanation."
        provenance="DETECTOR: ISOLATIONFOREST + THRESHOLD RULES"
      >
        <SearchInput value={q} onChange={setQ} placeholder="SEARCH AIRCRAFT / COMPONENT" />
      </PageHeader>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="DETECTION TIMELINE" sub={`${filtered.length} EVENTS · BY SCORE`} icon="alert" bodyClass="p-0">
          {filtered.length === 0 ? (
            <div className="p-3"><EmptyState title="NO ANOMALIES DETECTED" message="No sensor channel currently exceeds the anomaly threshold." hint={`LAST DETECTOR RUN ${istTime(new Date().toISOString())}`} /></div>
          ) : (
            <div className="max-h-[560px] overflow-auto">
              <table className="dt">
                <thead><tr><th>TIME</th><th>AIRCRAFT</th><th>COMPONENT</th><th>SENSOR</th><th>VALUE</th><th>EXPECTED</th><th>DEVIATION</th><th>SCORE</th><th>SEVERITY</th></tr></thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr key={i} className={`rowlink ${sel === a ? 'sel' : ''}`} onClick={() => setSel(a)}>
                      <td className="mono">{istTime(a.timestamp)}</td>
                      <td className="mono">{a.aircraft_id}</td>
                      <td>{a.component}</td>
                      <td className="mono">{a.sensor}</td>
                      <td className="mono text-txt">{num(a.value, 2)}</td>
                      <td className="mono">{a.expected}</td>
                      <td className="mono">{a.deviation > 0 ? '+' : ''}{num(a.deviation, 1)}%</td>
                      <td className="mono">{num(a.score, 2)}</td>
                      <td><StateTag st={a.severity === 'HIGH' ? 'crit' : a.severity === 'MEDIUM' ? 'alert' : 'warn'} label={a.severity} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="ANOMALY EXPLANATION" sub={sel ? `${sel.aircraft_id} · ${sel.component}` : 'SELECT A DETECTION'} icon="chart">
          {!sel ? (
            <EmptyState title="NO DETECTION SELECTED" message="Select an anomaly from the timeline to inspect the engineering explanation and recommended action." />
          ) : (
            <div className="grid gap-3">
              <div className="grid grid-cols-3 gap-3 border-b border-line pb-3">
                <Metric label="SENSOR" value={sel.sensor} />
                <Metric label="VALUE" value={`${num(sel.value, 2)} mm/s`} st="warn" />
                <Metric label="SCORE" value={num(sel.score, 2)} st={sel.score > 0.8 ? 'crit' : 'warn'} />
              </div>
              <div>
                <div className="tlabel tlabel-dim mb-1">WHAT HAPPENED</div>
                <div className="text-[12px] leading-relaxed text-txt-dim">{sel.what}</div>
              </div>
              <div>
                <div className="tlabel tlabel-dim mb-1">WHY IT MATTERS</div>
                <div className="text-[12px] leading-relaxed text-txt-dim">{sel.why}</div>
              </div>
              <div>
                <div className="tlabel tlabel-dim mb-1">MODEL ASSESSMENT</div>
                <div className="text-[12px] leading-relaxed text-txt-dim">{sel.assessment}</div>
              </div>
              <div>
                <div className="tlabel tlabel-dim mb-1">RECOMMENDED ACTION</div>
                <div className="text-[12px] leading-relaxed text-txt">{sel.action}</div>
              </div>
              <div className="flex gap-2 border-t border-line pt-3">
                <button className="btn" onClick={() => nav(`/app/aircraft/${sel.aircraft_id}/telemetry`)}>OPEN TELEMETRY →</button>
                <button className="btn" onClick={() => nav(`/app/aircraft/${sel.aircraft_id}/diagnostics`)}>DIAGNOSTICS →</button>
              </div>
              <div className="font-mono text-[9px] leading-relaxed tracking-[0.05em] text-txt-faint">
                AI-GENERATED EXPLANATION — NOT AN AUTHORIZED MAINTENANCE PROCEDURE.
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ================= RUL ================= */
export function Rul() {
  const sys = useSystem();
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selIdx, setSelIdx] = useState(0);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    get('/api/rul').then((r) => { if (alive) { setRows(r); sys.markUpdated(); } })
      .catch((e) => { if (alive) setErr(String(e?.message || e)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  const filtered = useMemo(
    () => (rows || []).filter((r) => !q || r.aircraft_id.includes(q.toUpperCase()) || r.component.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );
  const cur = filtered[Math.min(selIdx, filtered.length - 1)];

  if (err) return <ErrorState title="RUL SERVICE UNAVAILABLE" message="Unable to retrieve remaining-useful-life estimates." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!rows) return <LoadingState label="COMPUTING RUL ESTIMATES" />;

  return (
    <div>
      <PageHeader
        title="RUL — REMAINING USEFUL LIFE"
        sub="Degradation curves per component: measured RUL history, projected decline and expected failure window. Ordered by urgency."
        provenance="REGRESSION MODEL · SYNTHETIC EVALUATION"
      >
        <SearchInput value={q} onChange={(v) => { setQ(v); setSelIdx(0); }} placeholder="SEARCH AIRCRAFT / COMPONENT" />
      </PageHeader>

      <div className="grid gap-3 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="COMPONENTS BY URGENCY" sub={`${filtered.length} TRACKED`} icon="clock" bodyClass="p-0">
          <div className="max-h-[560px] divide-y divide-line overflow-y-auto">
            {filtered.length === 0 ? <div className="p-3"><EmptyState title="NO MATCHES" message="No RUL records match the search." /></div> : filtered.map((r, i) => (
              <button key={i} className={`block w-full px-3 py-2 text-left ${i === selIdx ? 'bg-[#14222B]' : 'hover:bg-surface2'}`}
                onClick={() => setSelIdx(i)}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12px] text-txt">{r.aircraft_id}</span>
                  <span className="font-mono text-[11.5px]" style={{ color: stateColor(rulState(r.rul)) }}>{num(r.rul, 1)} D</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-txt-faint">{r.component}</span>
                  <span className="font-mono text-[9.5px] text-txt-faint">RANGE {num(r.lo, 0)}–{num(r.hi, 0)} D · CONF {pctOf(r.confidence * 100, 0)}</span>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {cur ? (
          <Panel title={`DEGRADATION CURVE — ${cur.aircraft_id} · ${cur.component}`} sub="MEASURED HISTORY + PROJECTION" icon="chart"
            right={<Link className="link font-mono text-[10px] uppercase tracking-[0.08em]" to={`/app/aircraft/${cur.aircraft_id}/diagnostics`}>DIAGNOSTICS →</Link>}>
            <div className="mb-2 grid grid-cols-2 gap-x-8 border-b border-line pb-2 sm:grid-cols-4">
              <Metric label="CURRENT RUL" value={`${num(cur.rul, 1)} D`} st={rulState(cur.rul)} />
              <Metric label="EXPECTED RANGE" value={`${num(cur.lo, 1)}–${num(cur.hi, 1)} D`} hint={`CONFIDENCE ${pctOf(cur.confidence * 100, 0)}`} />
              <Metric label="DEGRADATION" value={pctOf(cur.degradation, 1)} st={cur.degradation > 40 ? 'alert' : cur.degradation > 25 ? 'warn' : 'ok'} />
              <Metric label="TREND" value={<span className="text-warn">DECLINING</span>} hint="PROJECTION TO THRESHOLD" />
            </div>
            <RulChart history={cur.history || []} projection={cur.projection || []} height={260} />
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {[['#56A8CC', 'MEASURED RUL'], ['#D4AC55', 'PROJECTED RUL'], ['#D97070', 'FAILURE THRESHOLD']].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">
                  <span className="inline-block h-[2px] w-4" style={{ background: c }} aria-hidden="true" />{l}
                </span>
              ))}
            </div>
            <div className="mt-2 font-mono text-[9px] leading-relaxed tracking-[0.05em] text-txt-faint">
              RUL IS A REGRESSION ESTIMATE ON SYNTHETIC TELEMETRY; THE BAND IS THE MODEL'S REPORTED EXPECTED RANGE, NOT A MEASURED CONFIDENCE INTERVAL.
            </div>
          </Panel>
        ) : (
          <Panel title="DEGRADATION CURVE"><NotAvailable label="SELECT A COMPONENT" /></Panel>
        )}
      </div>
    </div>
  );
}
