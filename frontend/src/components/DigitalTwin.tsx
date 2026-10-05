// Digital Twin — interactive diagnostic schematic of the aircraft.
// Top-view engineering drawing (generic, non-classified silhouette) with:
//  - subsystem modes that highlight the relevant geometry
//  - component markers colored by live component state
//  - component selection → technical inspection panel
//  - controlled zoom/pan, station reference marks
// All state values come from the backend; nothing is decorative.
import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../services/api';
import { compCode, compShort, healthState, num, pctOf, rulState, stateColor, SENSOR_SPEC, deviation } from '../lib/format';
import { Panel, StateTag, SectionHeader, NotAvailable } from './ui';
import { Icon } from './icons';
import { useSystem } from './SystemContext';

/* ---------- geometry ---------- */
const W = 920, H = 400, CY = 200;
// The drawing coordinates stay in the original engineering-space dimensions so
// all hotspots and subsystem geometry remain aligned. The rendered viewBox is
// trimmed to the actual schematic extents, making the aircraft substantially
// larger without distorting or replacing the interactive twin.
const VIEW = { x: 52, y: 4, w: 812, h: 392 };
// Nose is at the rounded left end (x≈80); the tail is at the right. The wing
// tips are therefore swept aft toward increasing x. Keeping this convention
// in the source geometry (rather than rotating the SVG) also keeps labels,
// station references and pointer hit areas in the same coordinate system.
const FUSE = 'M 80 200 C 96 184, 122 176, 162 174 L 560 174 L 624 177 L 782 189 L 846 195 L 846 205 L 782 211 L 624 223 L 560 226 L 162 226 C 122 224, 96 216, 80 200 Z';
const WING_T = 'M 360 174 L 468 28 L 548 32 L 650 171 Z';
const WING_B = 'M 360 226 L 468 372 L 548 368 L 650 229 Z';
const STAB_T = 'M 700 190 L 758 122 L 802 118 L 832 188 Z';
const STAB_B = 'M 700 210 L 758 278 L 802 282 L 832 212 Z';
const FIN = 'M 786 196 L 852 196 L 852 204 L 786 204 Z';
const TANK_C = { x: 470, y: 186, w: 66, h: 28 };
const TANK_T = 'M 414 151 L 474 68 L 531 70 L 588 151 Z';
const TANK_B = 'M 414 249 L 474 332 L 531 330 L 588 249 Z';
const AIL_T = 'M 536 44 L 552 50 L 613 143 L 598 148 Z';
const AIL_B = 'M 536 356 L 552 350 L 613 257 L 598 252 Z';
const ELEV_T = 'M 762 130 L 790 162 L 797 158 L 769 126 Z';
const ELEV_B = 'M 762 270 L 790 238 L 797 242 L 769 274 Z';

type ModeId = 'structure' | 'propulsion' | 'hydraulics' | 'electrical' | 'avionics' | 'fuel' | 'flightcontrols' | 'landinggear' | 'thermal';
const MODES: { id: ModeId; label: string; comps: string[]; derived?: string }[] = [
  { id: 'structure', label: 'STRUCTURE', comps: [], derived: 'AIRFRAME — OVERALL HEALTH INDEX (ALL SUBSYSTEMS)' },
  { id: 'propulsion', label: 'PROPULSION', comps: ['Engine'] },
  { id: 'hydraulics', label: 'HYDRAULICS', comps: ['Hydraulic System'] },
  { id: 'electrical', label: 'ELECTRICAL', comps: ['Electrical System'] },
  { id: 'avionics', label: 'AVIONICS', comps: ['Avionics'] },
  { id: 'fuel', label: 'FUEL', comps: ['Fuel System'] },
  { id: 'flightcontrols', label: 'FLIGHT CTRL', comps: ['Hydraulic System', 'Electrical System'], derived: 'ACTUATION DERIVED FROM HYDRAULICS + ELECTRICAL' },
  { id: 'landinggear', label: 'LANDING GEAR', comps: ['Landing Gear'] },
  { id: 'thermal', label: 'THERMAL', comps: ['Cooling System'] },
];

const COMP_MODE: Record<string, ModeId> = {
  'Engine': 'propulsion', 'Hydraulic System': 'hydraulics', 'Electrical System': 'electrical',
  'Avionics': 'avionics', 'Fuel System': 'fuel', 'Landing Gear': 'landinggear', 'Cooling System': 'thermal',
};

// geometry groups highlighted per mode
const MODE_GEO: Record<ModeId, string[]> = {
  structure: ['airframe'],
  propulsion: ['engine'],
  hydraulics: ['hyd'],
  electrical: ['elec'],
  avionics: ['avn'],
  fuel: ['fuel'],
  flightcontrols: ['fc'],
  landinggear: ['lg'],
  thermal: ['thermal'],
};

interface Marker { id: string; comp: string; x: number; y: number; label: string; lx?: number; ly?: number }
const MARKERS: Marker[] = [
  { id: 'eng1', comp: 'Engine', x: 477, y: 86, label: 'ENG R / 01', lx: 477, ly: 58 },
  { id: 'eng2', comp: 'Engine', x: 477, y: 314, label: 'ENG L / 02', lx: 477, ly: 342 },
  { id: 'hyd', comp: 'Hydraulic System', x: 590, y: 200, label: 'HYD PUMP', lx: 590, ly: 172 },
  { id: 'lgN', comp: 'Landing Gear', x: 172, y: 200, label: 'GEAR N', lx: 148, ly: 178 },
  { id: 'lgM', comp: 'Landing Gear', x: 505, y: 150, label: 'GEAR M1', lx: 540, ly: 138 },
  { id: 'lgM2', comp: 'Landing Gear', x: 505, y: 250, label: 'GEAR M2', lx: 540, ly: 264 },
  { id: 'fuelC', comp: 'Fuel System', x: 502, y: 200, label: 'TANK C', lx: 462, ly: 226 },
  { id: 'fuelW', comp: 'Fuel System', x: 515, y: 108, label: 'TANK W-R', lx: 535, ly: 88 },
  { id: 'avn', comp: 'Avionics', x: 136, y: 200, label: 'AVN BAY', lx: 118, ly: 222 },
  { id: 'elec', comp: 'Electrical System', x: 310, y: 200, label: 'ELEC BAY', lx: 310, ly: 226 },
  { id: 'thm', comp: 'Cooling System', x: 664, y: 200, label: 'THM XCHG', lx: 700, ly: 172 },
  { id: 'fcA', comp: '__fc', x: 574, y: 100, label: 'AILERON R', lx: 598, ly: 82 },
  { id: 'fcE', comp: '__fc', x: 782, y: 148, label: 'ELEVATOR R', lx: 806, ly: 126 },
];

const healthLabel = (h?: number) => (h == null ? 'UNKNOWN' : h >= 80 ? 'NOMINAL' : h >= 65 ? 'MONITOR' : h >= 50 ? 'DEGRADED' : 'CRITICAL');

export default function DigitalTwin({ aid, detail, preds }: { aid: string; detail: any; preds: any[] }) {
  const sys = useSystem();
  const [mode, setMode] = useState<ModeId>('propulsion');
  const [sel, setSel] = useState<string>('Engine');
  const [tel, setTel] = useState<any[]>([]);
  const [anoms, setAnoms] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const focused = useRef(false);

  // open pre-focused on the highest-risk component (user can override afterwards)
  React.useEffect(() => {
    if (focused.current || !preds?.length) return;
    const top = [...preds].sort((a, b) => b.failure_prob - a.failure_prob)[0];
    if (top?.failure_prob > 0.35 && COMP_MODE[top.component]) {
      setSel(top.component);
      setMode(COMP_MODE[top.component]);
    }
    focused.current = true;
  }, [preds]);

  React.useEffect(() => {
    let alive = true;
    get(`/api/aircraft/${aid}/telemetry?hours=48`).then((r) => { if (alive) setTel(r); }).catch(() => {});
    get('/api/anomalies').then((r) => { if (alive) setAnoms(r.filter((a: any) => a.aircraft_id === aid)); }).catch(() => {});
    return () => { alive = false; };
  }, [aid, sys.refreshKey]);

  const comps: any[] = detail?.components || [];
  const compByName = useMemo(() => {
    const m: Record<string, any> = {};
    comps.forEach((c) => (m[c.name] = c));
    return m;
  }, [comps]);
  const predByComp = useMemo(() => {
    const m: Record<string, any> = {};
    preds.forEach((p) => (m[p.component] = p));
    return m;
  }, [preds]);

  // latest telemetry per component channel
  const lastByComp = useMemo(() => {
    const m: Record<string, any> = {};
    tel.forEach((r) => { const c = m[r.component]; if (!c || new Date(r.t) > new Date(c.t)) m[r.component] = r; });
    return m;
  }, [tel]);

  const modeDef = MODES.find((m) => m.id === mode)!;
  const selComp = compByName[sel];
  const selPred = predByComp[sel];
  const fcDerived = sel === '__fc';
  const structureSel = sel === '__structure';

  // effective component for derived selections
  const effComp = fcDerived
    ? (['Hydraulic System', 'Electrical System'].map((n) => compByName[n]).filter(Boolean).sort((a, b) => a.health - b.health)[0])
    : structureSel
      ? { name: 'Airframe', health: detail?.health, rul: Math.min(...comps.map((c) => c.rul)), failure_prob: (detail?.risk ?? 0) / 100, hours: detail?.flight_hours }
      : selComp;

  const selHealth = effComp?.health;
  const selState = healthState(selHealth);

  const selectComp = (name: string, m?: ModeId) => {
    setSel(name);
    if (m) setMode(m);
  };

  const geoActive = (g: string) => MODE_GEO[mode].includes(g);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('[data-hot]')) return;
    drag.current = { x: pan.x, y: pan.y, px: e.clientX, py: e.clientY };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setPan({ x: drag.current.x + (e.clientX - drag.current.px), y: drag.current.y + (e.clientY - drag.current.py) });
  };
  const onPointerUp = () => { drag.current = null; };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // station reference marks
  const stations = [100, 200, 300, 400, 500, 600, 700, 800];

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(300px,320px)] xl:items-start">
      {/* ---------------- schematic ---------------- */}
      <Panel
        className="min-w-0"
        title={`DIGITAL TWIN — ${aid}`}
        sub="TOP VIEW · GENERIC SCHEMATIC · NON-CLASSIFIED"
        right={
          <div className="flex items-center gap-1">
            <button className="btn btn-xs" onClick={() => setZoom((z) => Math.max(1, +(z - 0.4).toFixed(1)))} aria-label="Zoom out"><Icon name="zoomOut" size={12} /></button>
            <span className="w-10 text-center font-mono text-[10px] text-txt-faint">{zoom.toFixed(1)}×</span>
            <button className="btn btn-xs" onClick={() => setZoom((z) => Math.min(2.6, +(z + 0.4).toFixed(1)))} aria-label="Zoom in"><Icon name="zoomIn" size={12} /></button>
            <button className="btn btn-xs" onClick={resetView}><Icon name="crosshair" size={12} /> RESET</button>
          </div>
        }
        bodyClass="p-0"
      >
        {/* subsystem modes */}
        <div className="border-b border-line px-2.5 py-2">
          <div className="seg flex-wrap">
            {MODES.map((m) => (
              <button key={m.id} className={mode === m.id ? 'on' : ''} onClick={() => {
                setMode(m.id);
                if (m.id === 'structure') setSel('__structure');
                else if (m.id === 'flightcontrols') setSel('__fc');
                else if (m.comps[0]) setSel(m.comps[0]);
              }}>{m.label}</button>
            ))}
          </div>
        </div>

        <div
          className="relative overflow-hidden bg-inset"
          style={{ cursor: drag.current ? 'grabbing' : 'grab' }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
        >
          <svg
            viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
            preserveAspectRatio="xMidYMid meet"
            className="block w-full select-none"
            role="img"
            aria-label={`Aircraft ${aid} digital twin schematic, subsystem mode ${MODES.find((m) => m.id === mode)?.label}`}
          >
            <defs>
              <pattern id="hatchP" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#c2ced8" strokeWidth="1" />
              </pattern>
            </defs>

            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom}) translate(${(W * (1 - 1 / zoom)) / 2} ${(H * (1 - 1 / zoom)) / 2})`}>
              {/* station reference */}
              {stations.map((x) => (
                <g key={x}>
                  <line x1={x} y1={8} x2={x} y2={16} stroke="#c2ced8" strokeWidth="1" />
                  <text x={x} y={26} fontSize="7.5" fill="#607080" textAnchor="middle" fontFamily="IBM Plex Mono" letterSpacing="1">FS {x}</text>
                </g>
              ))}
              <line x1={40} y1={12} x2={880} y2={12} stroke="#c2ced8" strokeWidth="0.75" />

              {/* centerline + explicit orientation reference */}
              <line x1={30} y1={CY} x2={890} y2={CY} stroke="#c2ced8" strokeWidth="0.75" strokeDasharray="14 5 3 5" />
              <g aria-hidden="true">
                <line x1={128} y1={48} x2={82} y2={48} stroke="#607080" strokeWidth="0.8" />
                <path d="M 82 48 L 91 44 M 82 48 L 91 52" fill="none" stroke="#607080" strokeWidth="0.8" />
                <text x={134} y={51} fontSize="8" fill="#607080" fontFamily="IBM Plex Mono" letterSpacing="1">NOSE</text>
              </g>

              {/* ---------- AIRFRAME ---------- */}
              <g opacity={mode === 'structure' ? 1 : 0.62}>
                <path d={WING_T} fill={mode === 'structure' ? '#e5f4eb' : '#f7f9fb'} stroke={mode === 'structure' ? stateColor(healthState(detail?.health)) : '#7890a0'} strokeWidth="1.25" />
                <path d={WING_B} fill={mode === 'structure' ? '#e5f4eb' : '#f7f9fb'} stroke={mode === 'structure' ? stateColor(healthState(detail?.health)) : '#7890a0'} strokeWidth="1.25" />
                <path d={STAB_T} fill="#f7f9fb" stroke="#7890a0" strokeWidth="1.25" />
                <path d={STAB_B} fill="#f7f9fb" stroke="#7890a0" strokeWidth="1.25" />
                <path d={FIN} fill="#f7f9fb" stroke="#7890a0" strokeWidth="1.25" />
                <path d={FUSE} fill={mode === 'structure' ? '#e5f4eb' : '#f4f7f9'} stroke={mode === 'structure' ? stateColor(healthState(detail?.health)) : '#7890a0'} strokeWidth="1.5" />
                <text x={566} y={24} fontSize="7.5" fill="#607080" textAnchor="middle" fontFamily="IBM Plex Mono" letterSpacing="1">R WING</text>
                <text x={566} y={388} fontSize="7.5" fill="#607080" textAnchor="middle" fontFamily="IBM Plex Mono" letterSpacing="1">L WING</text>
                {/* structural frames (structure mode) */}
                {mode === 'structure' && [150, 240, 330, 420, 510, 600, 690, 770].map((x) => (
                  <line key={x} x1={x} y1={175} x2={x} y2={225} stroke="#c2ced8" strokeWidth="0.75" strokeDasharray="3 3" />
                ))}
              </g>

              {/* ---------- FLIGHT CONTROLS ---------- */}
              <g opacity={geoActive('fc') ? 1 : 0.3}>
                {[AIL_T, AIL_B, ELEV_T, ELEV_B].map((d, i) => (
                  <path key={i} d={d} fill={geoActive('fc') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1" />
                ))}
                <rect x={832} y={195} width={16} height={10} fill={geoActive('fc') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1" />
              </g>

              {/* ---------- FUEL ---------- */}
              <g opacity={geoActive('fuel') ? 1 : 0.3}>
                <rect {...TANK_C} fill={geoActive('fuel') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1" />
                <path d={TANK_T} fill={geoActive('fuel') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1" />
                <path d={TANK_B} fill={geoActive('fuel') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1" />
                <path d="M 470 200 L 420 170 M 470 200 L 420 230 M 536 200 L 590 200" stroke="#56A8CC" strokeWidth="0.75" strokeDasharray="3 3" fill="none" />
              </g>

              {/* ---------- PROPULSION ---------- */}
              <g opacity={geoActive('propulsion') ? 1 : 0.35}>
                {[[438, 74], [438, 303]].map(([x, y], i) => (
                  <g key={i} data-hot onClick={() => selectComp('Engine', 'propulsion')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectComp('Engine', 'propulsion'); } }}
                    tabIndex={0} role="button" aria-label={`Engine ${i + 1} nacelle — select propulsion system`}
                    style={{ cursor: 'pointer' }}>
                    <rect x={x} y={y} width={78} height={23} fill={geoActive('propulsion') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1.25" />
                    <circle cx={x + 9} cy={y + 11.5} r={7} fill="none" stroke="#56A8CC" strokeWidth="1" />
                    <line x1={x + 22} y1={y + 11.5} x2={x + 70} y2={y + 11.5} stroke="#c2ced8" strokeWidth="0.75" strokeDasharray="3 2" />
                  </g>
                ))}
              </g>

              {/* ---------- HYDRAULICS ---------- */}
              <g opacity={geoActive('hydraulics') ? 1 : 0.3}>
                <path d="M 516 86 L 548 116 L 566 156 M 516 314 L 548 284 L 566 244 M 566 195 L 180 199 M 566 195 L 505 160 M 566 205 L 505 240 M 566 200 L 700 197 L 796 200"
                  fill="none" stroke="#56A8CC" strokeWidth={geoActive('hydraulics') ? 1.25 : 0.75} strokeDasharray="5 3" />
                <rect x={566} y={186} width={48} height={28} fill={geoActive('hydraulics') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1.25" />
                <text x={590} y={203} fontSize="8" fill="#607080" textAnchor="middle" fontFamily="IBM Plex Mono">PUMP</text>
              </g>

              {/* ---------- ELECTRICAL ---------- */}
              <g opacity={geoActive('electrical') ? 1 : 0.3}>
                <line x1={160} y1={CY} x2={830} y2={CY} stroke="#56A8CC" strokeWidth={geoActive('electrical') ? 1 : 0.6} strokeDasharray="2 3" />
                {[512, 512].map((x, i) => (
                  <rect key={i} x={x} y={i === 0 ? 80 : 308} width={9} height={9} fill="#dcecf5" stroke="#56A8CC" strokeWidth="1" />
                ))}
                <rect x={294} y={190} width={32} height={20} fill={geoActive('electrical') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1.25" />
                <text x={310} y={203} fontSize="7.5" fill="#607080" textAnchor="middle" fontFamily="IBM Plex Mono">BUS</text>
              </g>

              {/* ---------- AVIONICS ---------- */}
              <g opacity={geoActive('avionics') ? 1 : 0.3}>
                <rect x={112} y={183} width={48} height={34} fill={geoActive('avionics') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1.25" />
                <rect x={120} y={191} width={32} height={18} fill="url(#hatchP)" stroke="none" />
                <line x1={162} y1={182} x2={176} y2={182} stroke="#56A8CC" strokeWidth="1" />
              </g>

              {/* ---------- THERMAL ---------- */}
              <g opacity={geoActive('thermal') ? 1 : 0.3}>
                <rect x={640} y={185} width={48} height={30} fill={geoActive('thermal') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1.25" />
                {[192, 200, 208].map((y) => (
                  <line key={y} x1={648} y1={y} x2={680} y2={y} stroke="#c2ced8" strokeWidth="0.75" />
                ))}
              </g>

              {/* ---------- LANDING GEAR ---------- */}
              <g opacity={geoActive('landinggear') ? 1 : 0.3}>
                <rect x={166} y={194} width={13} height={12} fill={geoActive('landinggear') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1.25" />
                <rect x={498} y={153} width={14} height={14} fill={geoActive('landinggear') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1.25" />
                <rect x={498} y={233} width={14} height={14} fill={geoActive('landinggear') ? '#dcecf5' : '#eef4f8'} stroke="#56A8CC" strokeWidth="1.25" />
                <line x1={505} y1={167} x2={505} y2={174} stroke="#56A8CC" strokeWidth="1" />
                <line x1={505} y1={233} x2={505} y2={226} stroke="#56A8CC" strokeWidth="1" />
                <line x1={172} y1={206} x2={172} y2={212} stroke="#56A8CC" strokeWidth="1" />
              </g>

              {/* ---------- component markers ---------- */}
              {MARKERS.map((mk) => {
                const isFc = mk.comp === '__fc';
                const comp = isFc
                  ? { health: Math.min(compByName['Hydraulic System']?.health ?? 100, compByName['Electrical System']?.health ?? 100) }
                  : compByName[mk.comp];
                const st = healthState(comp?.health);
                const c = stateColor(st);
                const selected = (isFc && sel === '__fc') || (!isFc && sel === mk.comp);
                const dim = mode !== 'structure' && !modeDef.comps.includes(mk.comp) && !(isFc && mode === 'flightcontrols');
                const anom = !isFc && predByComp[mk.comp]?.anomaly > 0.55;
                return (
                  <g key={mk.id} data-hot
                    onClick={() => selectComp(isFc ? '__fc' : mk.comp, isFc ? 'flightcontrols' : COMP_MODE[mk.comp])}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectComp(isFc ? '__fc' : mk.comp, isFc ? 'flightcontrols' : COMP_MODE[mk.comp]); } }}
                    tabIndex={0} role="button" aria-label={`${mk.label} — ${compByName[mk.comp]?.name || 'Flight controls'}, health ${comp?.health ?? 'not available'}`}
                    style={{ cursor: 'pointer' }} opacity={dim ? 0.4 : 1}>
                    <title>{`${mk.label} — ${compByName[mk.comp]?.name || 'Flight controls'} · health ${comp?.health ?? '—'}`}</title>
                    <rect x={mk.x - 11} y={mk.y - 11} width={22} height={22} fill="transparent" />
                    {anom && <path d={`M ${mk.x} ${mk.y - 17} l 5 8 h -10 Z`} fill="none" stroke="#b7791f" strokeWidth="1" />}
                    {selected && <rect x={mk.x - 8} y={mk.y - 8} width={16} height={16} fill="none" stroke="#56A8CC" strokeWidth="1.5" />}
                    <rect x={mk.x - 4.5} y={mk.y - 4.5} width={9} height={9} fill={c} stroke="#ffffff" strokeWidth="1" />
                    {selected && (
                      <>
                        <line x1={mk.x} y1={mk.y - 8} x2={mk.lx ?? mk.x} y2={(mk.ly ?? mk.y) + 8} stroke="#56A8CC" strokeWidth="0.75" />
                        <text x={mk.lx ?? mk.x} y={mk.ly ?? mk.y} fontSize="9" fill="#1677b8" textAnchor="middle" fontFamily="IBM Plex Mono" letterSpacing="0.5">{mk.label}</text>
                      </>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* title block */}
          <div className="pointer-events-none absolute bottom-0 right-0 border-l border-t border-line bg-surface/95 px-2.5 py-1.5 font-mono text-[8.5px] uppercase leading-relaxed tracking-[0.08em] text-txt-faint">
            <div>{aid} · {detail?.platform || '—'} · TOP VIEW</div>
            <div>GENERIC SCHEMATIC — NON-CLASSIFIED SILHOUETTE</div>
          </div>
        </div>

        {/* legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-3 py-2">
          {[
            ['#238a5b', 'NOMINAL ≥80'], ['#b7791f', 'MONITOR 65–79'], ['#c45d21', 'DEGRADED 50–64'],
            ['#c0393b', 'CRITICAL <50'], ['#b7791f', '▲ ANOMALY'],
          ].map(([c, l]) => (
            <span key={l as string} className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">
              <span className="inline-block h-[8px] w-[8px]" style={{ background: c as string }} aria-hidden="true" />{l}
            </span>
          ))}
          <span className="ml-auto font-mono text-[9.5px] uppercase tracking-[0.06em] text-txt-faint">DRAG TO PAN · CLICK MARKER TO INSPECT</span>
        </div>
      </Panel>

      {/* ---------------- component inspection ---------------- */}
      <Panel title="COMPONENT INSPECTION" sub={aid} bodyClass="p-0">
        <div className="border-b border-line bg-surface2 px-3 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="break-words font-mono text-[13px] font-medium tracking-[0.06em] text-txt">
                {structureSel ? 'AIRFRAME / STRUCTURE' : fcDerived ? 'FLIGHT CONTROLS' : (compShort[sel] || sel)}
              </div>
              <div className="tlabel mt-0.5">
                {structureSel ? 'STRUCTURE MODE' : fcDerived ? 'FLIGHT CONTROLS MODE' : `SYSTEM ${compCode[sel] || '—'}`}
              </div>
            </div>
            {effComp && <StateTag st={selState} label={healthLabel(selHealth)} />}
          </div>
          {(structureSel || fcDerived) && (
            <div className="mt-2 border border-line bg-inset px-2 py-1 font-mono text-[9.5px] leading-relaxed tracking-[0.04em] text-txt-faint">
              {modeDef.derived}
            </div>
          )}
        </div>

        <div className="px-3 py-3">
          {!effComp ? <NotAvailable label="COMPONENT DATA NOT AVAILABLE" /> : (
            <>
              <SectionHeader title="COMPONENT HEALTH" />
              <div className="mb-1 flex items-center gap-3">
                <div className="h-[9px] flex-1 border border-line-strong bg-inset">
                  <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, selHealth ?? 0))}%`, background: stateColor(selState) }} />
                </div>
                <span className="metric-val text-[15px]" style={{ color: stateColor(selState) }}>{num(selHealth, 1)}</span>
              </div>

              <div className="mt-3 border-t border-line pt-2">
                <SectionHeader title="LATEST SENSOR READINGS" right={<span className="tlabel">{sel === '__fc' || structureSel ? 'SYSTEM' : '48H WINDOW'}</span>} />
                {(() => {
                  const src = fcDerived
                    ? lastByComp['Hydraulic System']
                    : structureSel
                      ? tel[tel.length - 1]
                      : lastByComp[sel];
                  if (!src) return <div className="py-2 font-mono text-[10.5px] text-txt-faint">NO COMPONENT-TAGGED TELEMETRY IN SELECTED WINDOW</div>;
                  const rows: [string, any][] = [
                    ['VIBRATION', src.vibration], ['TEMPERATURE', src.temperature], ['PRESSURE', src.pressure],
                    ['SHAFT SPEED', src.rpm], ['BUS VOLTAGE', src.voltage], ['FUEL FLOW', src.fuel_flow],
                  ];
                  return (
                    <table className="w-full">
                      <tbody>
                        {rows.map(([k, v]) => {
                          const spec = Object.values(SENSOR_SPEC).find((s) => s.label.toLowerCase().startsWith(k.split(' ')[0].toLowerCase()));
                          const dev = spec ? deviation(v, spec.baseline) : null;
                          const breach = spec?.warn != null && v > spec.warn;
                          return (
                            <tr key={k} className="border-b border-line/60">
                              <td className="tlabel py-[3px]">{k}</td>
                              <td className="py-[3px] text-right font-mono text-[11.5px] text-txt num">{v != null ? (spec ? spec.fmt(v) : v) : '—'}</td>
                              <td className={`py-[3px] pl-3 text-right font-mono text-[10px] num ${breach ? 'text-warn' : 'text-txt-faint'}`}>
                                {dev ? `Δ ${dev.rel}` : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              <div className="mt-3 border-t border-line pt-2">
                <SectionHeader title="MODEL OUTPUT" />
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(110px,100%),1fr))] gap-x-4">
                  <div><div className="tlabel">FAILURE PROB</div><div className="metric-val text-[15px]" style={{ color: stateColor(selPred ? (selPred.failure_prob >= 0.75 ? 'crit' : selPred.failure_prob >= 0.55 ? 'alert' : selPred.failure_prob >= 0.35 ? 'warn' : 'ok') : 'off') }}>{selPred ? pctOf(selPred.failure_prob * 100, 1) : '—'}</div></div>
                  <div><div className="tlabel">RUL</div><div className="metric-val text-[15px]" style={{ color: stateColor(rulState(effComp.rul)) }}>{num(effComp.rul, 1)}<span className="ml-1 text-[10px] text-txt-faint">D</span></div></div>
                  <div className="mt-2"><div className="tlabel">CONFIDENCE</div><div className="metric-val text-[13px]">{selPred ? pctOf(selPred.confidence * 100, 0) : '—'}</div></div>
                  <div className="mt-2"><div className="tlabel">ANOMALY SCORE</div><div className="metric-val text-[13px]">{selPred ? num(selPred.anomaly, 2) : '—'}</div></div>
                </div>
                {selPred && (
                  <div className="mt-2 font-mono text-[10px] text-txt-faint">
                    FAILURE WINDOW {selPred.window} · MODEL {sys.modelLabel}
                  </div>
                )}
              </div>

              <div className="mt-3 border-t border-line pt-2">
                <SectionHeader title="ANOMALIES (ACTIVE)" />
                {(() => {
                  const list = anoms.filter((a) => !fcDerived && !structureSel && a.component === sel);
                  return list.length === 0
                    ? <div className="py-1 font-mono text-[10.5px] text-txt-faint">NO ACTIVE ANOMALIES ON THIS COMPONENT</div>
                    : list.slice(0, 4).map((a, i) => (
                      <div key={i} className="border-b border-line/60 py-1.5 last:border-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-txt">{a.sensor} {num(a.value, 2)}</span>
                          <StateTag st={a.severity === 'HIGH' ? 'crit' : a.severity === 'MEDIUM' ? 'alert' : 'warn'} label={a.severity} />
                        </div>
                        <div className="mt-0.5 text-[11px] leading-snug text-txt-faint">{a.what}</div>
                      </div>
                    ));
                })()}
              </div>

              <div className="mt-3 border-t border-line pt-2">
                <SectionHeader title="RECOMMENDED ACTION" />
                <div className="text-[12px] leading-relaxed text-txt-dim">
                  {selPred?.recommendation || 'Continue monitoring. No elevated risk detected by the current model run.'}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link className="btn btn-xs" to={`/app/aircraft/${aid}/telemetry`}><Icon name="waveform" size={11} /> TELEMETRY</Link>
                  {!structureSel && !fcDerived && (
                    <Link className="btn btn-xs btn-primary" to={`/app/work-orders?pre=${aid}:${encodeURIComponent(sel)}`}>
                      <Icon name="clipboard" size={11} /> CREATE WORK ORDER
                    </Link>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
