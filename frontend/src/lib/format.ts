// Formatting + semantic-state helpers shared across the application.

/** Parse backend ISO timestamps (mostly naive UTC, sometimes with tz) into Date. */
export function parseTs(iso?: string | null): Date | null {
  if (!iso) return null;
  let s = iso;
  if (!s.endsWith('Z') && !s.includes('+') && !s.includes('-', 10)) s += 'Z';
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const IST = 'Asia/Kolkata';
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: IST });
const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: IST });

export const istTime = (iso?: string | null) => { const d = parseTs(iso); return d ? timeFmt.format(d) + ' IST' : '—'; };
export const istClock = (d: Date) => timeFmt.format(d) + ' IST';
export const istDate = (iso?: string | null) => { const d = parseTs(iso); return d ? dateFmt.format(d) : '—'; };
export const istDateTime = (iso?: string | null) => { const d = parseTs(iso); return d ? dateTimeFmt.format(d) + ' IST' : '—'; };
export const clockOnly = (iso?: string | null) => { const d = parseTs(iso); return d ? timeFmt.format(d) : '—'; };

export const num = (v: any, digits = 1): string => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};
export const int = (v: any): string => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (isNaN(n)) return '—';
  return Math.round(n).toLocaleString('en-US');
};
export const pct = (v: any, digits = 1): string => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (isNaN(n)) return '—';
  return (n * 100).toFixed(digits) + '%';
};
export const pctOf = (v: any, digits = 0): string => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (isNaN(n)) return '—';
  return n.toFixed(digits) + '%';
};

export const days = (v: any): string => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (isNaN(n)) return '—';
  return `${num(n, n < 10 ? 1 : 0)} d`;
};

// ---------- semantic states ----------
export type State = 'ok' | 'warn' | 'alert' | 'crit' | 'off' | 'acc';

const STATE_COLORS: Record<State, string> = {
  ok: '#6FB789', warn: '#D4AC55', alert: '#D98B54', crit: '#D97070', off: '#8A95A0', acc: '#56A8CC',
};
export function stateColor(st: State): string {
  return STATE_COLORS[st] || STATE_COLORS.off;
}

/** Health score → semantic state (thresholds aligned to fleet distribution bands). */
export function healthState(h?: number): State {
  if (h == null || isNaN(h)) return 'off';
  if (h >= 80) return 'ok';
  if (h >= 65) return 'warn';
  if (h >= 50) return 'alert';
  return 'crit';
}

/** RUL (days) → urgency state. */
export function rulState(r?: number): State {
  if (r == null || isNaN(r)) return 'off';
  if (r <= 7) return 'crit';
  if (r <= 15) return 'alert';
  if (r <= 30) return 'warn';
  return 'ok';
}

export function probState(p?: number): State {
  if (p == null || isNaN(p)) return 'off';
  if (p >= 0.75) return 'crit';
  if (p >= 0.55) return 'alert';
  if (p >= 0.35) return 'warn';
  return 'ok';
}

/** Normalize any backend status/severity string to a semantic state. */
const STATUS_MAP: Record<string, State> = {
  // aircraft status / system health
  'operational': 'ok', 'maintenance': 'warn', 'at risk': 'alert', 'critical': 'crit', 'grounded': 'crit',
  'healthy': 'ok', 'monitoring': 'warn',
  // severity / priority / inventory risk (HIGH shortage → alert, MEDIUM watch → warn, LOW → ok)
  'low': 'ok', 'medium': 'warn', 'high': 'alert',
  // work orders
  'detected': 'warn', 'approved': 'acc', 'assigned': 'acc', 'scheduled': 'acc', 'in progress': 'acc', 'completed': 'ok', 'cancelled': 'off',
  // alerts
  'warning': 'warn', 'inventory': 'warn', 'info': 'off', 'open': 'warn', 'resolved': 'ok',
  // systems
  'active': 'ok', 'live': 'acc', 'pending': 'warn',
};

export function statusState(s?: string): State {
  if (!s) return 'off';
  return STATUS_MAP[s.toLowerCase()] ?? 'off';
}

/** Status display label — uppercased technical term. */
export function statusLabel(s?: string): string {
  if (!s) return 'UNKNOWN';
  const map: Record<string, string> = {
    'operational': 'READY', 'maintenance': 'IN MAINT', 'at risk': 'WARNING', 'critical': 'AOG',
    'healthy': 'HEALTHY', 'monitoring': 'MONITOR', 'low': 'LOW', 'medium': 'MEDIUM', 'high': 'HIGH',
    'detected': 'DETECTED', 'approved': 'APPROVED', 'assigned': 'ASSIGNED', 'scheduled': 'SCHEDULED',
    'in progress': 'IN PROGRESS', 'completed': 'COMPLETED', 'cancelled': 'CANCELLED',
    'open': 'OPEN', 'resolved': 'RESOLVED', 'warning': 'WARNING', 'inventory': 'INVENTORY',
    'active': 'ACTIVE', 'pending': 'PENDING', 'live': 'LIVE',
  };
  return map[s.toLowerCase()] ?? s.toUpperCase();
}

/** Short component names for dense displays. */
export const compShort: Record<string, string> = {
  'Engine': 'ENGINE',
  'Hydraulic System': 'HYDRAULICS',
  'Landing Gear': 'LANDING GEAR',
  'Fuel System': 'FUEL',
  'Avionics': 'AVIONICS',
  'Electrical System': 'ELECTRICAL',
  'Cooling System': 'THERMAL',
};

export const compCode: Record<string, string> = {
  'Engine': 'ENG',
  'Hydraulic System': 'HYD',
  'Landing Gear': 'LG',
  'Fuel System': 'FUEL',
  'Avionics': 'AVN',
  'Electrical System': 'ELEC',
  'Cooling System': 'THM',
};

/** Learned sensor baselines and rule thresholds used by the backend ML pipeline. */
export const SENSOR_SPEC: Record<string, { label: string; unit: string; baseline: number; warn?: number; band?: [number, number]; fmt: (v: number) => string }> = {
  vibration: { label: 'VIBRATION RMS', unit: 'mm/s', baseline: 3.2, warn: 5.0, band: [2.0, 5.0], fmt: (v) => num(v, 2) },
  temperature: { label: 'TEMPERATURE', unit: '°C', baseline: 85, warn: 100, fmt: (v) => num(v, 1) },
  pressure: { label: 'PRESSURE', unit: 'PSI', baseline: 3000, band: [2500, 3500], fmt: (v) => int(v) },
  rpm: { label: 'SHAFT SPEED', unit: 'RPM', baseline: 12000, fmt: (v) => int(v) },
  voltage: { label: 'BUS VOLTAGE', unit: 'V', baseline: 28, fmt: (v) => num(v, 1) },
  fuel_flow: { label: 'FUEL FLOW', unit: 'kg/h', baseline: 450, fmt: (v) => num(v, 0) },
};

/** Truncate a sensor channel to a compact current/expected/deviation triple. */
export function deviation(actual?: number, expected?: number, digits = 1): { abs: string; rel: string; sign: number } {
  if (actual == null || expected == null || isNaN(actual) || isNaN(expected)) return { abs: '—', rel: '—', sign: 0 };
  const d = actual - expected;
  const rel = expected !== 0 ? (d / expected) * 100 : 0;
  return { abs: (d >= 0 ? '+' : '') + num(d, digits), rel: (rel >= 0 ? '+' : '') + rel.toFixed(1) + '%', sign: Math.sign(d) };
}
