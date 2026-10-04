// Shared UI primitives — panels, metric rows, status tags, bars, tables,
// empty/error/loading states. All visual hierarchy comes from borders,
// spacing and typography; no shadows, gradients or decorative elements.
import React from 'react';
import { stateColor, statusState, statusLabel, type State } from '../lib/format';
import { Icon, type IconName } from './icons';

/* ---------------- Page header ---------------- */
export function PageHeader({ title, sub, provenance, children }: { title: string; sub?: string; provenance?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-b border-line pb-3">
      <div className="min-w-0 flex-1 basis-[260px]">
        <h1 className="break-words font-mono text-[15px] font-semibold uppercase leading-snug tracking-[0.14em] text-txt">{title}</h1>
        {sub && <div className="mt-1 max-w-3xl text-[12px] leading-relaxed text-txt-dim">{sub}</div>}
        {provenance && <div className="provenance mt-1.5">{provenance}</div>}
      </div>
      {children && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/* ---------------- Panel ---------------- */
export function Panel({ title, sub, right, children, className = '', bodyClass = 'p-3', icon }: {
  title?: string; sub?: string; right?: React.ReactNode; children: React.ReactNode;
  className?: string; bodyClass?: string; icon?: IconName;
}) {
  return (
    <section className={`panel min-w-0 ${className}`} aria-label={title}>
      {title && (
        <header className="panel-head">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-0.5">
            {icon && <Icon name={icon} size={13} className="shrink-0 text-txt-faint" />}
            <span className="panel-title">{title}</span>
            {sub && <span className="tlabel min-w-0 break-words">{sub}</span>}
          </div>
          {right && <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2">{right}</div>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

/* ---------------- Section header (inside a panel body) ---------------- */
export function SectionHeader({ title, right, className = '' }: { title: string; right?: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 ${className}`}>
      <span className="tlabel tlabel-dim min-w-0 break-words">{title}</span>
      {right}
    </div>
  );
}

/* ---------------- Status tag ---------------- */
export function StatusTag({ s, label, className = '' }: { s?: string; label?: string; className?: string }) {
  const st: State = statusState(s);
  const c = stateColor(st);
  return (
    <span className={`tag ${className}`} style={{ color: c, borderColor: c + '55', background: c + '14' }}>
      <span className="glyph" style={{ background: c }} aria-hidden="true" />
      {label ?? statusLabel(s)}
      <span className="sr-only">{` — status ${label ?? statusLabel(s)}`}</span>
    </span>
  );
}

export function StateTag({ st, label, className = '' }: { st: State; label: string; className?: string }) {
  const c = stateColor(st);
  return (
    <span className={`tag ${className}`} style={{ color: c, borderColor: c + '55', background: c + '14' }}>
      <span className="glyph" style={{ background: c }} aria-hidden="true" />
      {label}
    </span>
  );
}

/* ---------------- Metric blocks ---------------- */
export function Metric({ label, value, unit, hint, st, big = false, className = '' }: {
  label: string; value: React.ReactNode; unit?: string; hint?: React.ReactNode; st?: State; big?: boolean; className?: string;
}) {
  const c = st ? stateColor(st) : undefined;
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="tlabel">{label}</div>
      <div className={`metric-val mt-0.5 ${big ? 'text-[30px] leading-[1.15]' : 'text-[17px] leading-[1.3]'}`} style={c ? { color: c } : undefined}>
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-txt-faint">{unit}</span>}
      </div>
      {hint && <div className="mt-0.5 break-words font-mono text-[10.5px] leading-snug text-txt-faint">{hint}</div>}
    </div>
  );
}

/**
 * Metric strip — CSS grid of metric cells separated by hairline dividers.
 *
 * The default template is intrinsic (`auto-fit` + `minmax`), so the number of
 * columns follows the available width rather than a breakpoint guess: cells
 * can never be squeezed past their minimum and therefore can never collide,
 * at any viewport size or with any content length. Every cell is its own
 * `min-width: 0` grid item, so long labels/values wrap inside the cell.
 * `cols` overrides the template where a page needs an explicit rhythm.
 */
export function MetricGrid({ children, cols = 'grid-cols-[repeat(auto-fit,minmax(min(150px,100%),1fr))]', className = '' }: {
  children: React.ReactNode; cols?: string; className?: string;
}) {
  return (
    <div className={`grid gap-px overflow-hidden rounded-[4px] border border-line bg-line ${cols} ${className}`}>
      {React.Children.map(children, (c, i) => (
        <div key={i} className="min-w-0 bg-surface px-4 py-3">{c}</div>
      ))}
    </div>
  );
}

/* ---------------- Bars ---------------- */
export function HealthBar({ value, width = 110, showValue = true, className = '' }: { value?: number; width?: number; showValue?: boolean; className?: string }) {
  const v = value == null || isNaN(value) ? 0 : Math.max(0, Math.min(100, value));
  const st = value == null ? 'off' : value >= 80 ? 'ok' : value >= 65 ? 'warn' : value >= 50 ? 'alert' : 'crit';
  const c = stateColor(st as State);
  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <div className="h-[7px] shrink border border-line-strong bg-inset" style={{ width, maxWidth: '100%' }} role="img" aria-label={`health ${v}`}>
        <div className="h-full" style={{ width: `${v}%`, background: c }} />
      </div>
      {showValue && <span className="font-mono text-[11.5px] text-txt num">{v.toFixed(1)}</span>}
    </div>
  );
}

/** Contribution / share bar with a leading label. */
export function ContribBar({ label, pct, color = '#56A8CC' }: { label: string; pct: number; color?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,120px)_minmax(40px,1fr)_minmax(0,52px)] items-center gap-2 py-[3px] sm:grid-cols-[minmax(0,150px)_minmax(40px,1fr)_minmax(0,52px)]">
      <span className="truncate text-[11.5px] text-txt-dim" title={label}>{label}</span>
      <div className="h-[8px] border border-line-strong bg-inset">
        <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
      </div>
      <span className="text-right font-mono text-[11px] text-txt num">{pct.toFixed(1)}%</span>
    </div>
  );
}

/* ---------------- Table helpers ---------------- */

/**
 * Horizontal scroll container for data tables.
 * Dense operational tables are wider than narrow viewports; scrolling is
 * constrained to the table itself so the PAGE never scrolls sideways.
 * Keyboard users can reach the scroll area (tabIndex 0) — required for
 * scrollable regions to be operable without a pointer.
 */
export function TableScroll({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`tablewrap ${className}`} tabIndex={0} role="region" aria-label="Scrollable table">
      {children}
    </div>
  );
}

export function SortTh<T extends string>({ col, sort, setSort, children, align = 'left' }: {
  col: T; sort: { by: T; dir: 1 | -1 }; setSort: (by: T) => void; children: React.ReactNode; align?: 'left' | 'right';
}) {
  const on = sort.by === col;
  return (
    <th scope="col" style={{ textAlign: align }}>
      <button
        className={`flex w-full items-center gap-1 font-mono text-[10px] uppercase tracking-[0.09em] ${align === 'right' ? 'justify-end' : ''} ${on ? 'text-acc' : 'hover:text-txt-dim'}`}
        onClick={() => setSort(col)}
        aria-label={`Sort by ${String(col)}`}
      >
        {children}
        <span aria-hidden="true" className="text-[8px]">{on ? (sort.dir === 1 ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
}

export function useSort<T extends string>(initial: T, initialDir: 1 | -1 = 1) {
  const [sort, setSort] = React.useState<{ by: T; dir: 1 | -1 }>({ by: initial, dir: initialDir });
  const onSort = (by: T) => setSort((s) => (s.by === by ? { by, dir: (s.dir === 1 ? -1 : 1) as 1 | -1 } : { by, dir: -1 as 1 | -1 }));
  return { sort, onSort };
}

/* ---------------- States ---------------- */
export function LoadingState({ label = 'FETCHING DATA' }: { label?: string }) {
  return (
    <div className="panel flex items-center gap-3 px-4 py-5" role="status" aria-live="polite">
      <span className="block h-[3px] w-16 overflow-hidden bg-line-strong" aria-hidden="true">
        <span className="block h-full w-1/3 bg-acc [animation:prog_1.2s_steps(4)_infinite]" />
      </span>
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-txt-faint">{label}…</span>
    </div>
  );
}

export function EmptyState({ title, message, hint, action }: { title: string; message?: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-line-strong bg-inset/50 px-6 py-8 text-center">
      <div className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-txt-dim">{title}</div>
      {message && <div className="mt-1.5 max-w-md text-[12px] text-txt-faint">{message}</div>}
      {hint && <div className="mt-1 font-mono text-[10.5px] text-txt-faint">{hint}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, message, detail, onRetry }: { title: string; message?: string; detail?: string; onRetry?: () => void }) {
  return (
    <div className="border border-[#4a2525] bg-crit-dim px-4 py-4" role="alert">
      <div className="flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.12em] text-crit">
        <Icon name="alert" size={14} /> {title}
      </div>
      {message && <div className="mt-1.5 text-[12px] text-txt-dim">{message}</div>}
      {detail && <div className="mt-1 font-mono text-[10.5px] text-txt-faint">{detail}</div>}
      {onRetry && <button className="btn btn-xs mt-3" onClick={onRetry}>Retry</button>}
    </div>
  );
}

/** Renders "DATA NOT AVAILABLE" where the backend provides no value. */
export function NotAvailable({ label = 'DATA NOT AVAILABLE' }: { label?: string }) {
  return <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-txt-faint">{label}</span>;
}

/* ---------------- Key / value listing ---------------- */
export function KV({ k, v, vClass = '' }: { k: string; v: React.ReactNode; vClass?: string }) {
  return (
    <div className="kv border-b border-line/60 last:border-0">
      <span className="k">{k}</span>
      <span className={`v ${vClass}`}>{v}</span>
    </div>
  );
}

/* ---------------- Controls ---------------- */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: {
  options: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; ariaLabel?: string;
}) {
  return (
    <div className="seg" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.id} role="tab" aria-selected={value === o.id}
          className={value === o.id ? 'on' : ''}
          onClick={() => onChange(o.id)}>
          {o.label}{o.count != null && <span className="ml-1.5 text-[9.5px] opacity-80">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'SEARCH', className = 'w-full min-w-0 sm:w-56' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Icon name="search" size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-txt-faint" />
      <input className="inp pl-8 font-mono text-[12px] uppercase" style={{ textTransform: 'none' }}
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </div>
  );
}

/* ---------------- Delta indicator ---------------- */
export function Delta({ value, unit = '', invert = false }: { value: number; unit?: string; invert?: boolean }) {
  if (value == null || isNaN(value)) return <NotAvailable />;
  const up = value > 0;
  const bad = invert ? up : !up;
  const c = value === 0 ? 'text-txt-faint' : bad ? 'text-crit' : 'text-ok';
  return (
    <span className={`font-mono text-[11.5px] num ${c}`}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}{unit && ` ${unit}`}
    </span>
  );
}

/* ---------------- Data provenance strip ---------------- */
export function ProvenanceNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-[#2a2312] bg-warn-dim px-3 py-1.5 font-mono text-[10px] uppercase leading-relaxed tracking-[0.08em] text-warn">
      {children}
    </div>
  );
}

export const DATA_NOTE = 'SIMULATION / SYNTHETIC DATA — DECISION-SUPPORT PROTOTYPE. AI OUTPUTS ADVISORY; AUTHORIZED HUMAN REVIEW REQUIRED.';
