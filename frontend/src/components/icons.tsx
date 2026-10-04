// Minimal inline SVG icon set — consistent 16px grid, 1.5px strokes, no fill.
// Icons represent actual functions only (navigation, warning, maintenance,
// telemetry, inventory, technician, calendar, settings, actions).
import React from 'react';

export type IconName =
  | 'aircraft' | 'engine' | 'warning' | 'wrench' | 'waveform' | 'box' | 'person'
  | 'calendar' | 'gear' | 'search' | 'chevronDown' | 'chevronRight' | 'external'
  | 'refresh' | 'check' | 'close' | 'menu' | 'logout' | 'activity' | 'database'
  | 'chip' | 'file' | 'clock' | 'clipboard' | 'chart' | 'target' | 'play' | 'stop'
  | 'zoomIn' | 'zoomOut' | 'crosshair' | 'download' | 'alert';

const P: Record<IconName, React.ReactNode> = {
  aircraft: <><path d="M8 1.5v13M8 9l5.5-2.5M8 9 2.5 6.5M8 11l-3 3M8 11l3 3" /></>,
  engine: <><path d="M2.5 6.5h2l1.5-2h3l1 2h3.5v4h-2l-1 2.5H6l-1-2.5H2.5z" /><path d="M8 4.5v-2" /></>,
  warning: <><path d="M8 2 14.5 13.5h-13z" /><path d="M8 6.5v3.5M8 11.8v.4" /></>,
  wrench: <><path d="M13.5 3.5 11 6l-1.5-1.5 2.5-2.5a3.4 3.4 0 0 0-4.3 4.1L2.5 11.3a1.6 1.6 0 0 0 2.2 2.2l5.2-5.2a3.4 3.4 0 0 0 3.6-4.8z" /></>,
  waveform: <><path d="M1.5 8h2l1.5-4 2 8 2-6 1.5 4h4" /></>,
  box: <><path d="M2 4.5 8 2l6 2.5v7L8 14l-6-2.5z" /><path d="M2 4.5 8 7l6-2.5M8 7v7" /></>,
  person: <><circle cx="8" cy="5" r="2.5" /><path d="M3 14c.5-2.8 2.5-4 5-4s4.5 1.2 5 4" /></>,
  calendar: <><rect x="2" y="3" width="12" height="11" rx="1" /><path d="M2 6.5h12M5 1.5V4M11 1.5V4" /></>,
  gear: <><circle cx="8" cy="8" r="2.2" /><path d="M8 1.8v2M8 12.2v2M1.8 8h2M12.2 8h2M3.6 3.6l1.4 1.4M11 11l1.4 1.4M12.4 3.6 11 5M5 11l-1.4 1.4" /></>,
  search: <><circle cx="7" cy="7" r="4" /><path d="m10.2 10.2 3.3 3.3" /></>,
  chevronDown: <><path d="m4 6.5 4 4 4-4" /></>,
  chevronRight: <><path d="m6.5 4 4 4-4 4" /></>,
  external: <><path d="M9 2.5h4.5V7M13 3 7.5 8.5" /><path d="M12.5 9.5v4h-11v-11h4" /></>,
  refresh: <><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" /><path d="M13.5 2.5V6h-3.5" /></>,
  check: <><path d="m3 8.5 3.5 3.5L13 4.5" /></>,
  close: <><path d="m3.5 3.5 9 9M12.5 3.5l-9 9" /></>,
  menu: <><path d="M2.5 4h11M2.5 8h11M2.5 12h11" /></>,
  logout: <><path d="M6 2.5H3v11h3" /><path d="M8.5 8h6M12 5l2.5 3L12 11" /></>,
  activity: <><path d="M1.5 8h3L6 4l2.5 8L11 8h3.5" /></>,
  database: <><ellipse cx="8" cy="3.5" rx="5.5" ry="2" /><path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2" /></>,
  chip: <><rect x="4" y="4" width="8" height="8" rx="1" /><path d="M6.5 1.5v2M9.5 1.5v2M6.5 12.5v2M9.5 12.5v2M1.5 6.5h2M1.5 9.5h2M12.5 6.5h2M12.5 9.5h2" /></>,
  file: <><path d="M4 1.5h5.5L13 5v9.5H4z" /><path d="M9.5 1.5V5H13M6 8.5h4M6 11h4" /></>,
  clock: <><circle cx="8" cy="8" r="5.5" /><path d="M8 5v3.2l2.2 1.3" /></>,
  clipboard: <><rect x="3.5" y="2.5" width="9" height="12" rx="1" /><path d="M6 2.5V1.5h4v1M6.5 7h3.5M6.5 10h3.5" /></>,
  chart: <><path d="M2.5 13.5h11" /><path d="M4.5 11V7M7.5 11V4M10.5 11V8.5" /></>,
  target: <><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="2" /><path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" /></>,
  play: <><path d="M4.5 3v10l8-5z" /></>,
  stop: <><rect x="4" y="4" width="8" height="8" /></>,
  zoomIn: <><circle cx="7" cy="7" r="4" /><path d="M10.2 10.2 13.5 13.5M7 5v4M5 7h4" /></>,
  zoomOut: <><circle cx="7" cy="7" r="4" /><path d="M10.2 10.2 13.5 13.5M5 7h4" /></>,
  crosshair: <><path d="M8 1.5v4M8 10.5v4M1.5 8h4M10.5 8h4" /><circle cx="8" cy="8" r="2" /></>,
  download: <><path d="M8 2v7M5 6.5 8 9.5l3-3" /><path d="M2.5 11v2.5h11V11" /></>,
  alert: <><circle cx="8" cy="8" r="6" /><path d="M8 4.8v4M8 11.2v.3" /></>,
};

export function Icon({ name, size = 14, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter"
      aria-hidden="true" className={className} style={{ flex: 'none' }}
    >
      {P[name]}
    </svg>
  );
}
