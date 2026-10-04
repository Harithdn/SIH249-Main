// FLEET — registry-style operations table: sort, filter, search, drill-down.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get } from '../services/api';
import { useSystem } from '../components/SystemContext';
import { Panel, PageHeader, SearchInput, Segmented, StatusTag, HealthBar, LoadingState, ErrorState, EmptyState, SortTh, useSort } from '../components/ui';
import { int, istDate, num, rulState, stateColor } from '../lib/format';

type Filter = 'ALL' | 'Operational' | 'Maintenance' | 'At Risk' | 'Critical';
type Col = 'aircraft_id' | 'platform' | 'base' | 'status' | 'health' | 'rul' | 'risk' | 'primary_risk' | 'flight_hours' | 'next_maintenance';

export default function FleetPage() {
  const sys = useSystem();
  const nav = useNavigate();
  const [rows, setRows] = useState<any[] | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const { sort, onSort } = useSort<Col>('risk', -1);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [ac, al] = await Promise.all([get('/api/aircraft'), get('/api/alerts')]);
        if (!alive) return;
        setRows(ac); setAlerts(al); sys.markUpdated();
      } catch (e: any) { if (alive) setErr(String(e?.message || e)); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sys.refreshKey]);

  const alertCount = useMemo(() => {
    const m: Record<string, number> = {};
    alerts.forEach((a) => { if (a.aircraft_id) m[a.aircraft_id] = (m[a.aircraft_id] || 0) + 1; });
    return m;
  }, [alerts]);

  const filtered = useMemo(() => {
    let list = rows || [];
    if (filter !== 'ALL') list = list.filter((r) => r.status === filter);
    if (q) {
      const s = q.toUpperCase();
      list = list.filter((r) => r.aircraft_id.includes(s) || r.platform.toUpperCase().includes(q.toUpperCase()) || r.base.toUpperCase().includes(q.toUpperCase()));
    }
    const dir = sort.dir;
    return [...list].sort((a, b) => {
      const va = a[sort.by], vb = b[sort.by];
      if (typeof va === 'string' || typeof vb === 'string') return String(va).localeCompare(String(vb)) * dir;
      return ((va ?? 0) - (vb ?? 0)) * dir;
    });
  }, [rows, filter, q, sort]);

  if (err) return <ErrorState title="FLEET DATA UNAVAILABLE" message="Unable to retrieve the aircraft registry from the backend service." detail={err} onRetry={() => sys.bumpRefresh()} />;
  if (!rows) return <LoadingState label="FETCHING AIRCRAFT REGISTRY" />;

  const counts = {
    ALL: rows.length,
    Operational: rows.filter((r) => r.status === 'Operational').length,
    Maintenance: rows.filter((r) => r.status === 'Maintenance').length,
    'At Risk': rows.filter((r) => r.status === 'At Risk').length,
    Critical: rows.filter((r) => r.status === 'Critical').length,
  };

  const byBase: Record<string, { n: number; op: number }> = {};
  rows.forEach((r) => {
    byBase[r.base] = byBase[r.base] || { n: 0, op: 0 };
    byBase[r.base].n++;
    if (r.status === 'Operational') byBase[r.base].op++;
  });

  return (
    <div>
      <PageHeader
        title="FLEET"
        sub="All registered aircraft with live health, risk and remaining-useful-life estimates. Select an aircraft to open its operational workspace."
        provenance="DATA SOURCE: SIMULATION · SYNTHETIC"
      >
        <SearchInput value={q} onChange={setQ} placeholder="SEARCH TAIL / TYPE / BASE" />
        <Segmented<Filter>
          value={filter} onChange={setFilter} ariaLabel="Status filter"
          options={[
            { id: 'ALL', label: 'ALL', count: counts.ALL },
            { id: 'Operational', label: 'READY', count: counts.Operational },
            { id: 'Maintenance', label: 'IN MAINT', count: counts.Maintenance },
            { id: 'At Risk', label: 'WARNING', count: counts['At Risk'] },
            { id: 'Critical', label: 'AOG', count: counts.Critical },
          ]}
        />
      </PageHeader>

      {/* base summary — information row */}
      <div className="panel mb-3 flex flex-wrap divide-x divide-line overflow-x-auto">
        {Object.entries(byBase).map(([base, v]) => (
          <div key={base} className="min-w-[150px] flex-1 px-4 py-2.5">
            <div className="tlabel">{base.toUpperCase()} (FICTIONAL)</div>
            <div className="metric-val mt-0.5 text-[15px]">{v.op}<span className="text-[11px] text-txt-faint"> / {v.n} READY</span></div>
          </div>
        ))}
        <div className="min-w-[150px] flex-1 px-4 py-2.5">
          <div className="tlabel">ACTIVE ALERTS</div>
          <div className="metric-val mt-0.5 text-[15px]" style={{ color: alerts.length ? '#D97070' : undefined }}>{alerts.length}</div>
        </div>
      </div>

      <Panel title="AIRCRAFT REGISTRY" sub={`${filtered.length} OF ${rows.length} AIRCRAFT`} icon="aircraft" bodyClass="p-0">
        {filtered.length === 0 ? (
          <div className="p-3"><EmptyState title="NO AIRCRAFT MATCH FILTER" message="Adjust the search term or status filter." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="dt">
              <thead>
                <tr>
                  <SortTh col="aircraft_id" sort={sort} setSort={onSort}>AIRCRAFT</SortTh>
                  <SortTh col="platform" sort={sort} setSort={onSort}>TYPE</SortTh>
                  <SortTh col="base" sort={sort} setSort={onSort}>BASE / SQN</SortTh>
                  <SortTh col="status" sort={sort} setSort={onSort}>STATUS</SortTh>
                  <SortTh col="health" sort={sort} setSort={onSort}>HEALTH</SortTh>
                  <SortTh col="rul" sort={sort} setSort={onSort}>RUL</SortTh>
                  <SortTh col="risk" sort={sort} setSort={onSort}>RISK</SortTh>
                  <SortTh col="primary_risk" sort={sort} setSort={onSort}>PRIMARY RISK SYSTEM</SortTh>
                  <SortTh col="flight_hours" sort={sort} setSort={onSort}>FLIGHT HRS</SortTh>
                  <SortTh col="next_maintenance" sort={sort} setSort={onSort}>NEXT MAINT</SortTh>
                  <th>ALERTS</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.aircraft_id} className="rowlink"
                    onClick={() => { sys.setCurrentAircraft(r.aircraft_id); nav(`/app/aircraft/${r.aircraft_id}`); }}>
                    <td className="mono">{r.aircraft_id}</td>
                    <td>{r.platform}</td>
                    <td><span className="text-txt-dim">{r.base.replace('Base ', '')}</span> <span className="font-mono text-[10px] text-txt-faint">{r.squadron}</span></td>
                    <td><StatusTag s={r.status} /></td>
                    <td><HealthBar value={r.health} width={76} /></td>
                    <td className="mono" style={{ color: stateColor(rulState(r.rul)) }}>{num(r.rul, 0)} D</td>
                    <td className="mono">{Math.round((r.risk ?? 0) * 100)}%</td>
                    <td>{r.primary_risk}</td>
                    <td className="mono">{int(r.flight_hours)}</td>
                    <td className="mono">{istDate(r.next_maintenance)}</td>
                    <td className="mono">{alertCount[r.aircraft_id] ? <span className="text-crit">{alertCount[r.aircraft_id]}</span> : <span className="text-txt-faint">0</span>}</td>
                    <td><span className="link font-mono text-[10px]">OPEN →</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">
          <span>HEALTH / RISK / RUL RECOMPUTED FROM LIVE TELEMETRY ON EACH FETCH</span>
          <span>CLICK COLUMN HEADERS TO SORT · ROW OPENS AIRCRAFT WORKSPACE</span>
        </div>
      </Panel>
    </div>
  );
}
