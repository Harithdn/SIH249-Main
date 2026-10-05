// Engineering analytics charts built on recharts.
// Design rules: thin lines, subtle grid, restrained palette, meaningful
// thresholds and operating bands, anomaly markers, units, precise tooltips.
// Animations disabled throughout.
import React from 'react';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea,
} from 'recharts';

export const CHART = {
  grid: '#18222B',
  axis: '#2A3641',
  tick: '#75808B',
  primary: '#56A8CC',
  secondary: '#8A95A0',
  tertiary: '#6FB789',
  warn: '#D4AC55',
  crit: '#D97070',
  ok: '#6FB789',
  gray: '#5A646E',
};

/* ------------------------------------------------------------------ */
/* Precise tooltip                                                     */
/* ------------------------------------------------------------------ */
function TipBox({ active, payload, label, labelFmt, unit, digits = 2 }: any) {
  if (!active || !payload?.length) return null;
  // Intl requires minimumFractionDigits <= maximumFractionDigits; a raw
  // `digits = 0` with the previous hard-coded minimum of 1 threw a
  // RangeError during render and unmounted the whole app. Clamp both.
  const maxFd = Math.min(20, Math.max(0, Math.floor(Number.isFinite(+digits) ? +digits : 2)));
  const minFd = Math.min(1, maxFd);
  const fmtNum = (v: number) =>
    Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: maxFd, minimumFractionDigits: minFd }) : '—';
  return (
    <div className="border border-line-strong bg-[#0C1218] px-2.5 py-2 shadow-none">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.08em] text-txt-faint">
        {labelFmt ? labelFmt(label, payload) : label}
      </div>
      <table className="font-mono text-[11px]">
        <tbody>
          {payload.filter((p: any) => p.value != null).map((p: any, i: number) => (
            <tr key={i}>
              <td className="pr-2">
                <span className="mr-1.5 inline-block h-[7px] w-[7px] align-middle" style={{ background: p.color || p.payload?.fill }} aria-hidden="true" />
                <span className="text-txt-dim">{p.name}</span>
              </td>
              <td className="text-right text-txt num">
                {typeof p.value === 'number' ? fmtNum(p.value) : p.value}
                {unit && <span className="ml-1 text-[9.5px] text-txt-faint">{unit}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Time series chart with thresholds, bands and anomaly markers        */
/* ------------------------------------------------------------------ */
export interface SeriesSpec { key: string; label: string; color?: string; dash?: string; width?: number }
export interface ThresholdSpec { y: number; label: string; color?: string }
export interface BandSpec { from: number; to: number; label: string; color?: string }
export interface MarkerSpec { x: any; y: number; label?: string }

export function TimeSeriesChart({ data, xKey, xType = 'category', series, unit, domain, thresholds = [], bands = [], markers = [], height = 190, xFmt, yDigits = 1, tooltipLabelFmt }: {
  data: any[]; xKey: string; xType?: 'category' | 'number'; series: SeriesSpec[]; unit?: string;
  domain?: [any, any]; thresholds?: ThresholdSpec[]; bands?: BandSpec[]; markers?: MarkerSpec[];
  height?: number; xFmt?: (v: any) => string; yDigits?: number; tooltipLabelFmt?: (l: any, p: any) => string;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 6, right: 14, left: 0, bottom: 2 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          {bands.map((b, i) => (
            <ReferenceArea key={`b${i}`} y1={b.from} y2={b.to} fill={b.color || CHART.ok} fillOpacity={0.05}
              stroke={b.color || CHART.ok} strokeOpacity={0.18} strokeDasharray="2 3"
              label={{ value: b.label, position: 'insideTopLeft', fill: CHART.tick, fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
          ))}
          {thresholds.map((t, i) => (
            <ReferenceLine key={`t${i}`} y={t.y} stroke={t.color || CHART.warn} strokeDasharray="6 3" strokeWidth={1}
              label={{ value: t.label, position: 'insideBottomRight', fill: t.color || CHART.warn, fontSize: 9, fontFamily: 'IBM Plex Mono', dy: i % 2 === 0 ? -4 : 8 }} />
          ))}
          <XAxis dataKey={xKey} type={xType} tickFormatter={xFmt} tickLine={false} axisLine={{ stroke: CHART.axis }} minTickGap={28} height={18} />
          <YAxis domain={domain} tickLine={false} axisLine={false} width={44}
            tickFormatter={(v: any) => (typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: yDigits }) : v)} />
          <Tooltip content={<TipBox unit={unit} digits={yDigits} labelFmt={tooltipLabelFmt} />} cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }} />
          {series.map((s) => (
            <Line key={s.key} type="linear" dataKey={s.key} name={s.label} stroke={s.color || CHART.primary}
              strokeWidth={s.width || 1.5} strokeDasharray={s.dash} dot={false} isAnimationActive={false} connectNulls />
          ))}
          {markers.length > 0 && (
            <Scatter data={markers.map((m) => ({ [xKey]: m.x, marker: m.y }))} dataKey="marker" name="ANOMALY"
              fill={CHART.crit} shape="diamond" isAnimationActive={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Telemetry chart panel — title, unit, current value, spec, chart     */
/* ------------------------------------------------------------------ */
export function TelemetryChart({ title, unit, current, series, data, xKey, height = 180, domain, thresholds, bands, markers, xFmt, legend, footer }: {
  title: string; unit: string; current?: string; series: SeriesSpec[]; data: any[]; xKey: string;
  height?: number; domain?: [any, any]; thresholds?: ThresholdSpec[]; bands?: BandSpec[]; markers?: MarkerSpec[];
  xFmt?: (v: any) => string; legend?: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="panel min-w-0">
      <div className="flex min-h-[34px] flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line px-3 py-1.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="min-w-0 break-words font-mono text-[10.5px] font-medium uppercase leading-snug tracking-[0.1em] text-txt-dim">{title}</span>
          <span className="tlabel whitespace-nowrap">{unit}</span>
        </div>
        {current != null && (
          <div className="ml-auto whitespace-nowrap font-mono text-[12px] text-txt num">
            <span className="tlabel mr-1.5 hidden sm:inline">CUR</span>{current}
          </div>
        )}
      </div>
      <div className="p-2.5 pb-1.5">
        <TimeSeriesChart data={data} xKey={xKey} series={series} unit={unit} domain={domain} thresholds={thresholds}
          bands={bands} markers={markers} height={height} xFmt={xFmt} />
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">
                <span className="inline-block h-[2px] w-4" style={{ background: s.color || CHART.primary }} aria-hidden="true" />
                {s.label}
              </span>
            ))}
            {legend}
          </div>
          {footer}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RUL chart — history (solid) + projection (dashed)                   */
/* ------------------------------------------------------------------ */
export function RulChart({ history, projection, height = 210 }: { history: any[]; projection: any[]; height?: number }) {
  const data = [
    ...history.map((h) => ({ d: h.d, hist: h.v })),
    ...projection.map((p) => ({ d: p.d, proj: p.v })),
  ];
  const last = history[history.length - 1]?.v;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 14, left: 0, bottom: 2 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="d" tickLine={false} axisLine={{ stroke: CHART.axis }} minTickGap={30} height={18} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} width={36} label={{ value: 'DAYS', position: 'insideTopLeft', fill: CHART.tick, fontSize: 9, fontFamily: 'IBM Plex Mono', dx: 44, dy: -2 }} />
          <Tooltip content={<TipBox unit="d" digits={1} />} cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }} />
          <ReferenceLine y={0} stroke={CHART.crit} strokeDasharray="6 3" strokeWidth={1}
            label={{ value: 'FAILURE THRESHOLD', position: 'insideBottomRight', fill: CHART.crit, fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
          {last != null && (
            <ReferenceLine x={history[history.length - 1]?.d} stroke={CHART.secondary} strokeDasharray="2 4" strokeWidth={1}
              label={{ value: 'NOW', position: 'top', fill: CHART.tick, fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
          )}
          <Line type="linear" dataKey="hist" name="MEASURED RUL" stroke={CHART.primary} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="proj" name="PROJECTED RUL" stroke={CHART.warn} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Availability chart — actual vs projected vs without-predictive      */
/* ------------------------------------------------------------------ */
export function AvailabilityChart({ history, projection, height = 220 }: { history: any[]; projection: any[]; height?: number }) {
  const data = [
    ...history.map((h) => ({ day: h.day, actual: h.operational })),
    ...projection.map((p) => ({ day: p.day, projected: p.projected, without: p.without })),
  ];
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 14, left: 0, bottom: 2 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: CHART.axis }} minTickGap={34} height={18} interval="preserveStartEnd" />
          <YAxis domain={[50, 100]} tickLine={false} axisLine={false} width={34} tickFormatter={(v: any) => `${v}%`} />
          <Tooltip content={<TipBox unit="%" digits={1} />} cursor={{ stroke: CHART.axis, strokeDasharray: '3 3' }} />
          <ReferenceLine y={70} stroke={CHART.gray} strokeDasharray="2 4" strokeWidth={1}
            label={{ value: 'PLANNING FLOOR', position: 'insideBottomRight', fill: CHART.tick, fontSize: 9, fontFamily: 'IBM Plex Mono' }} />
          <Line type="linear" dataKey="actual" name="OPERATIONAL %" stroke={CHART.primary} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="projected" name="PROJECTED (PREDICTIVE)" stroke={CHART.tertiary} strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          <Line type="linear" dataKey="without" name="PROJECTED (REACTIVE)" stroke={CHART.gray} strokeWidth={1.2} strokeDasharray="2 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pareto chart — failure counts by component + cumulative line        */
/* ------------------------------------------------------------------ */
export function ParetoChart({ data, height = 240 }: { data: { component: string; failures: number; cum_pct: number }[]; height?: number }) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 14, left: 0, bottom: 2 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="component" tickLine={false} axisLine={{ stroke: CHART.axis }} height={32}
            tickFormatter={(v: string) => v
              .replace(' System', '').replace('Landing Gear', 'L/G')
              .replace('Hydraulic', 'HYD').replace('hydraulic', 'HYD')
              .replace('Electrical', 'ELEC').replace('electrical', 'ELEC')
              .toUpperCase()} interval={0} />
          <YAxis yAxisId="l" tickLine={false} axisLine={false} width={30} allowDecimals={false} />
          <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} width={38} tickFormatter={(v: any) => `${v}%`} />
          <Tooltip content={<TipBox digits={0} />} cursor={{ fill: '#141C24' }} />
          <Bar yAxisId="l" dataKey="failures" name="PREDICTED FAILURES" fill="#1E3A47" stroke={CHART.primary} strokeWidth={1} isAnimationActive={false} barSize={26} />
          <Line yAxisId="r" type="linear" dataKey="cum_pct" name="CUMULATIVE %" stroke={CHART.warn} strokeWidth={1.5} dot={{ r: 2, fill: CHART.warn, strokeWidth: 0 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compact sparkline for table rows                                    */
/* ------------------------------------------------------------------ */
export function Spark({ data, dataKey, color = CHART.primary, height = 26, width = 90 }: { data: any[]; dataKey: string; color?: string; height?: number; width?: number }) {
  return (
    <div style={{ width, height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <Line type="linear" dataKey={dataKey} stroke={color} strokeWidth={1.2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

