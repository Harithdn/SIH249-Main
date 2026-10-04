// RECOMMENDATIONS — AI-proposed maintenance actions with parts, technician
// and slot, feeding the work-order creation flow. Advisory only.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../services/api';
import { useSystem } from '../components/SystemContext';
import { Panel, PageHeader, StatusTag, LoadingState, ErrorState, EmptyState, Metric, MetricGrid } from '../components/ui';
import { pctOf, istDate } from '../lib/format';
import { Icon } from '../components/icons';

export default function Recommendations() {
  const sys = useSystem();
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    get('/api/recommendations').then((r) => { if (alive) { setRows(r); sys.markUpdated(); } })
      .catch((e) => { if (alive) setErr(String(e?.message || e)); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  if (err) return <ErrorState title="RECOMMENDATIONS UNAVAILABLE" message="Unable to retrieve maintenance recommendations." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!rows) return <LoadingState label="COMPUTING MAINTENANCE RECOMMENDATIONS" />;

  return (
    <div>
      <PageHeader
        title="MAINTENANCE RECOMMENDATIONS"
        sub="Model-proposed actions derived from active predictions: required parts, suggested technician and earliest slot. An engineer must review and approve before a work order is created."
        provenance="AI RECOMMENDATION · HUMAN APPROVAL REQUIRED"
      />

      <MetricGrid cols="grid-cols-1 sm:grid-cols-3" className="mb-3">
        <Metric label="OPEN RECOMMENDATIONS" value={rows.length} st={rows.length ? 'warn' : 'ok'} />
        <Metric label="CRITICAL PRIORITY" value={rows.filter((r) => r.priority === 'Critical').length} st="crit" />
        <Metric label="TOTAL ESTIMATED EFFORT" value={`${rows.reduce((s, r) => s + (r.est_hours || 0), 0)} H`} />
      </MetricGrid>

      {rows.length === 0 ? (
        <Panel title="RECOMMENDATION QUEUE">
          <EmptyState title="NO RECOMMENDATIONS" message="No component currently exceeds the recommendation threshold (P ≥ 40%)." hint="PREDICTIONS AND RECOMMENDATIONS RECOMPUTE ON EACH MODEL RUN" />
        </Panel>
      ) : (
        <Panel title="RECOMMENDATION QUEUE" sub="ORDERED BY PRIORITY" icon="clipboard" bodyClass="p-0">
          <div className="overflow-x-auto">
            <table className="dt">
              <thead>
                <tr><th>PRIORITY</th><th>AIRCRAFT</th><th>COMPONENT</th><th>RECOMMENDED ACTION</th><th>PARTS</th><th>EST HRS</th><th>TECHNICIAN</th><th>SLOT</th><th>CONFIDENCE</th><th>BASIS</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const order = { Critical: 0, High: 1, Medium: 2, Low: 3 } as any;
                  return { ...r, _o: order[r.priority] ?? 9 };
                }).sort((a: any, b: any) => a._o - b._o).map((r: any, i: number) => (
                  <tr key={i}>
                    <td><StatusTag s={r.priority} /></td>
                    <td className="mono">{r.aircraft_id}</td>
                    <td className="text-txt">{r.component}</td>
                    <td style={{ whiteSpace: 'normal' }} className="max-w-[280px]">{r.action}</td>
                    <td>{(r.parts || []).join(', ') || '—'}</td>
                    <td className="mono">{r.est_hours} H</td>
                    <td>{r.technician}</td>
                    <td className="mono">{istDate(r.slot)}</td>
                    <td className="mono">{pctOf(r.confidence * 100, 0)}</td>
                    <td style={{ whiteSpace: 'normal' }} className="max-w-[260px] text-[11px] text-txt-faint">{r.reason}</td>
                    <td>
                      <Link className="btn btn-xs btn-primary" to={`/app/work-orders?pre=${r.aircraft_id}:${encodeURIComponent(r.component)}&tech=${encodeURIComponent(r.technician)}&parts=${encodeURIComponent((r.parts || []).join(','))}&hours=${r.est_hours}`}>
                        <Icon name="wrench" size={10} /> CREATE WO
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-3 py-2 font-mono text-[9px] leading-relaxed tracking-[0.05em] text-txt-faint">
            RECOMMENDATIONS ARE AI-GENERATED (SYNTHETIC EVALUATION) AND DO NOT AUTHORIZE MAINTENANCE — ENGINEER REVIEW AND APPROVAL REQUIRED.
          </div>
        </Panel>
      )}
    </div>
  );
}
