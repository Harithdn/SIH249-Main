import React from 'react';
export function Kpi({ label, value, sub }: any) {
  return <div className="card"><div className="lbl">{label}</div><div className="kpi">{value}</div>{sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}</div>;
}
export function Badge({ v }: { v: string }) {
  const c: any = { Operational: '#22c55e', Maintenance: '#f59e0b', 'At Risk': '#fb923c', Critical: '#ef4444', High: '#fb923c', Medium: '#eab308', Low: '#22c55e', HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#22c55e', Open: '#f59e0b', Approved: '#38bdf8', Completed: '#22c55e', Detected: '#fb923c', Scheduled: '#38bdf8', 'In Progress': '#a78bfa' };
  const bg = c[v] || '#64748b';
  return <span className="badge" style={{ background: bg + '22', color: bg, border: `1px solid ${bg}55` }}>{v}</span>;
}
export function Bar({ label, pct, color = '#22d3ee' }: any) {
  return <div className="my-1.5"><div className="flex justify-between text-xs text-slate-300"><span>{label}</span><span>{pct}%</span></div>
    <div className="h-2 rounded bg-slate-800"><div className="h-2 rounded" style={{ width: `${Math.min(100, pct)}%`, background: color }} /></div></div>;
}
export function Section({ title, children, right }: any) {
  return <div className="card mb-4"><div className="flex items-center justify-between mb-3"><h3 className="font-semibold text-sm tracking-wide">{title}</h3>{right}</div>{children}</div>;
}
export function SimBanner() {
  return <div className="text-[11px] text-amber-300/90 border border-amber-500/30 bg-amber-500/10 rounded px-2 py-1 inline-block mb-2">SIMULATION / SYNTHETIC DATA — demo only, not real military data</div>;
}
