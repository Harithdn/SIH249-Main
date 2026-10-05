// Application shell — left navigation, top system bar, main content area.
// Structured application chrome: strong alignment, subtle dividers,
// compact navigation, no floating cards or shadows.
//
// LAYOUT / SCROLL ARCHITECTURE
// ----------------------------------------------------------------------
// viewport
// └── .app-shell            CSS grid: [sidebar] [main-shell]
//     ├── aside.app-sidebar position: sticky, 100dvh, internal scroll
//     │                     only when the nav exceeds the viewport
//     └── div.app-main      min-width: 0
//         ├── header.app-topbar   position: sticky, top: 0
//         └── main                normal flow
//
// The DOCUMENT is the single primary vertical scroll owner. The chrome is
// sticky rather than fixed/clamped, so there is exactly one page
// scrollbar; html/body are never overflow-locked (only while the mobile
// navigation drawer is open, which is a real modal overlay).
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSystem } from './SystemContext';
import { Icon, type IconName } from './icons';
import { istClock } from '../lib/format';

/**
 * Primary navigation — major categories with collapsible sub-items.
 * The sidebar initially shows ONLY the category headers; clicking a header
 * expands/collapses its subnavigation (accordion: one category open at a
 * time). The category containing the current route is expanded automatically
 * — including on deep links / refresh — and its header gets the active state.
 */
const NAV: { group: string; icon: IconName; items: [string, string][] }[] = [
  { group: 'COMMAND', icon: 'target', items: [['Overview', '/app'], ['Fleet', '/app/fleet'], ['Alerts', '/app/alerts']] },
  // Aircraft health, the interactive twin, telemetry and diagnostics now live
  // inside one context-preserving aircraft workspace.
  { group: 'AIRCRAFT', icon: 'aircraft', items: [['Aircraft', '/app/aircraft'], ['Digital Twin', '/app/twin']] },
  // Scheduling is embedded in Work Orders; demand forecasting is embedded in
  // Inventory. Fleet-wide predictions and recommendations remain distinct
  // because they are cross-aircraft decision queues.
  { group: 'MAINTENANCE', icon: 'wrench', items: [['Work Orders', '/app/work-orders'], ['Inventory', '/app/inventory'], ['Predictions', '/app/predictions'], ['Recommendations', '/app/recommendations']] },
  { group: 'ANALYTICS', icon: 'chart', items: [['Analytics', '/app/analytics'], ['Failure Analysis', '/app/failure-analysis'], ['Simulation', '/app/whatif'], ['Model Performance', '/app/models']] },
  { group: 'SYSTEM', icon: 'gear', items: [['System', '/app/system'], ['Data Sources', '/app/data-sources'], ['Digital Thread', '/app/thread'], ['Query Console', '/app/copilot'], ['Audit Log', '/app/audit']] },
];

const SECTION_TITLES: Record<string, string> = {
  '/app': 'COMMAND CENTER', '/app/fleet': 'FLEET', '/app/alerts': 'ALERTS',
  '/app/predictions': 'PREDICTIONS', '/app/anomalies': 'ANOMALIES',
  '/app/rul': 'RUL ANALYSIS', '/app/recommendations': 'RECOMMENDATIONS',
  '/app/work-orders': 'WORK ORDERS', '/app/history': 'MAINTENANCE HISTORY',
  '/app/inventory': 'INVENTORY', '/app/technicians': 'TECHNICIANS',
  '/app/analytics': 'ANALYTICS', '/app/failure-analysis': 'FAILURE ANALYSIS',
  '/app/whatif': 'SIMULATION', '/app/models': 'MODEL PERFORMANCE',
  '/app/system': 'SYSTEM', '/app/data-sources': 'DATA SOURCES',
  '/app/thread': 'DIGITAL THREAD', '/app/copilot': 'QUERY CONSOLE',
  '/app/audit': 'AUDIT LOG',
};

/** Section group a route belongs to — used for the breadcrumb trail. */
const SECTION_GROUP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  NAV.forEach((g) => g.items.forEach(([, path]) => { m[path] = g.group; }));
  // Secondary tools stay reachable from their parent workspaces without
  // competing for permanent sidebar space.
  ['/app/anomalies', '/app/rul', '/app/history', '/app/technicians'].forEach((path) => { m[path] = 'MAINTENANCE'; });
  return m;
})();

function NavSidebar({ onNavigate, idPrefix = '' }: { onNavigate?: () => void; idPrefix?: string }) {
  const sys = useSystem();
  const nav = useNavigate();
  const location = useLocation();

  // Context-driven aircraft routes all belong to the single Aircraft item.
  const isActive = (path: string) => {
    const p = location.pathname;
    if (path === '/app') return p === '/app';
    if (path === '/app/aircraft') return p.startsWith('/app/aircraft');
    return p.startsWith(path);
  };

  // category containing the current route — expanded automatically on
  // navigation (covers refresh and direct deep links too). Accordion:
  // exactly one category is open at a time; headers toggle it.
  const routeBase = location.pathname.split('/').slice(0, 3).join('/');
  const routeGroup = NAV.find((g) => g.items.some(([, path]) => isActive(path)))?.group
    ?? SECTION_GROUP[routeBase]
    ?? null;
  const [open, setOpen] = useState<string | null>(routeGroup);
  useEffect(() => { if (routeGroup) setOpen(routeGroup); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="shrink-0 border-b border-line px-4 py-3">
        <div className="font-mono text-[14px] font-semibold leading-tight tracking-[0.18em] text-txt">AEROSENTINEL</div>
        <div className="mt-1 font-mono text-[10px] uppercase leading-[1.45] tracking-[0.1em] text-txt-faint">
          <span className="block">FLEET OPERATIONS</span>
          <span className="block">PREDICTIVE MAINTENANCE</span>
        </div>
      </div>

      {/* scrolls internally only when the navigation exceeds the viewport */}
      <nav className="app-nav px-2.5 py-2" aria-label="Application navigation">
        {NAV.map((g) => {
          const isOpen = open === g.group;
          const containsActive = routeGroup === g.group;
          return (
            <div key={g.group} className="mb-1 last:mb-0">
              <button
                onClick={() => setOpen(isOpen ? null : g.group)}
                className={`group flex w-full items-center gap-2 rounded-[2px] px-2 py-2 text-left transition-colors ${
                  containsActive ? 'bg-surface/60 text-txt' : 'text-txt-dim hover:bg-surface2 hover:text-txt'
                }`}
                aria-expanded={isOpen}
                aria-controls={`nav-${idPrefix}${g.group}`}
              >
                {/* active-category marker — fixed width so headers never shift */}
                <span className="h-4 w-[2px] shrink-0" style={{ background: containsActive ? '#56A8CC' : 'transparent' }} aria-hidden="true" />
                <Icon name={g.icon} size={13} className={`shrink-0 ${containsActive ? 'text-acc' : 'text-txt-faint group-hover:text-txt-dim'}`} />
                <span className="min-w-0 flex-1 whitespace-nowrap font-mono text-[11.5px] font-semibold uppercase leading-[1.35] tracking-[0.14em]">
                  {g.group}
                </span>
                <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={12} className="shrink-0 text-txt-faint" />
              </button>
              {isOpen && (
                <div id={`nav-${idPrefix}${g.group}`} className="mb-2 ml-[28px] mt-1 border-l border-line-strong pl-2">
                  {g.items.map(([label, path]) => (
                    <NavLink key={path} to={path} onClick={onNavigate}
                      className={`relative block rounded-[2px] px-2.5 py-1.5 text-[13px] leading-[1.4] transition-colors ${
                        isActive(path) ? 'bg-[#17303C] font-medium text-acc before:absolute before:-left-[9px] before:top-1/2 before:h-4 before:w-px before:-translate-y-1/2 before:bg-acc' : 'text-txt-dim hover:bg-surface2 hover:text-txt'
                      }`}
                      aria-current={isActive(path) ? 'page' : undefined}>
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-line p-2.5">
        <div className="tlabel mb-1 px-1">SIMULATION CONTROL</div>
        <div className="grid grid-cols-2 gap-1">
          <button className={`btn justify-center ${sys.liveMode ? 'btn-primary' : ''}`}
            onClick={() => sys.setLiveMode(!sys.liveMode)}
            aria-pressed={sys.liveMode}
            title="Toggle periodic auto-refresh of live data">
            <Icon name={sys.liveMode ? 'stop' : 'play'} size={11} />
            {sys.liveMode ? 'LIVE ON' : 'LIVE'}
          </button>
          <button className="btn justify-center" onClick={() => sys.resetSim()} title="Reset degradation simulation">
            <Icon name="refresh" size={11} /> RESET
          </button>
          <button className="btn col-span-2 justify-center" onClick={async () => { await sys.degrade(); nav('/app/aircraft/AS-014'); onNavigate?.(); }}>
            <Icon name="warning" size={11} /> DEGRADE AS-014
          </button>
        </div>
        <div className="mt-1.5 px-1 font-mono text-[9px] leading-normal tracking-[0.05em] text-txt-faint">
          SYNTHETIC DATA · AI ADVISORY — HUMAN REVIEW REQUIRED
        </div>
      </div>
    </>
  );
}

/**
 * Top system bar.
 *
 * Layout contract: breadcrumb (identity) and the operator cluster
 * (demo-mode indicator) are never dropped; the operational metadata
 * between them degrades by priority as width is lost
 * (MODEL → DATA → SYSTEM), and the whole bar wraps to a second row
 * before anything can overlap.
 *
 * Time is rendered exactly ONCE here — the "UPDATED" stamp, which is the
 * single authoritative data-freshness value from SystemContext. No page
 * renders a second clock in the chrome.
 */
function TopBar({ onMenu, drawerOpen }: { onMenu: () => void; drawerOpen: boolean }) {
  const sys = useSystem();
  const location = useLocation();
  const [liveClock, setLiveClock] = useState(new Date());
  useEffect(() => { const timer = window.setInterval(() => setLiveClock(new Date()), 1000); return () => window.clearInterval(timer); }, []);

  const statusColor = sys.systemStatus === 'OPERATIONAL' ? 'text-ok' : sys.systemStatus === 'DEGRADED' ? 'text-crit' : 'text-txt-faint';
  const dotColor = sys.systemStatus === 'OPERATIONAL' ? '#6FB789' : sys.systemStatus === 'DEGRADED' ? '#D97070' : '#8A95A0';

  // breadcrumb trail: FLEET OPERATIONS / <GROUP> / <PAGE>
  const crumbs = (() => {
    const p = location.pathname;
    if (p.startsWith('/app/aircraft/')) {
      const tail = p.split('/')[3] || '';
      const tab = p.split('/')[4];
      return ['AIRCRAFT', `${tail}${tab ? ` · ${tab.toUpperCase()}` : ''}`];
    }
    const base = p.split('/').slice(0, 3).join('/');
    const group = SECTION_GROUP[base];
    const title = SECTION_TITLES[base] || 'OPERATIONS';
    return group && group !== title ? [group, title] : [title];
  })();

  return (
    <header className="app-topbar flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-elev px-3 py-1.5">
      <div className="flex shrink-0 items-center gap-2"><img src="/logo.png" alt="" className="h-7 w-7 object-contain mix-blend-multiply" /><span className="font-mono text-[12px] font-semibold tracking-[0.14em] text-txt">AeroSentinel</span></div>
      <button className="btn btn-xs btn-icon shrink-0 lg:hidden" onClick={onMenu}
        aria-label="Open navigation" aria-expanded={drawerOpen} aria-controls="app-nav-drawer">
        <Icon name="menu" size={13} />
      </button>

      {/* location — wraps rather than colliding; current page always legible */}
      <nav aria-label="Breadcrumb" className="min-w-0 flex-1 basis-[180px]">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-[10.5px] uppercase leading-tight tracking-[0.14em] text-txt-dim">
          <li className="hidden whitespace-nowrap xl:block">FLEET OPERATIONS</li>
          <li className="hidden text-line-strong xl:block" aria-hidden="true">/</li>
          {crumbs.map((c, i) => (
            <li key={c} className={`flex items-center gap-1.5 ${i === crumbs.length - 1 ? 'min-w-0' : 'hidden md:flex'}`}>
              {i > 0 && <span className="hidden text-line-strong md:inline" aria-hidden="true">/</span>}
              <span className={i === crumbs.length - 1 ? 'break-words text-txt' : ''}
                aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{c}</span>
            </li>
          ))}
        </ol>
      </nav>

      {/* operational metadata + operator — one timestamp, no duplicates */}
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.08em]">
        <span className="hidden items-center gap-1.5 whitespace-nowrap md:flex" title="Backend service status">
          <span className="tlabel">SYSTEM</span>
          <span className={`flex items-center gap-1.5 ${statusColor}`}>
            <span className="inline-block h-[7px] w-[7px] shrink-0" style={{ background: dotColor }} aria-hidden="true" />
            {sys.systemStatus}
          </span>
        </span>
        <span className="hidden items-center gap-1.5 whitespace-nowrap lg:flex" title="Telemetry data mode">
          <span className="tlabel">DATA</span>
          <span className={sys.simActive ? 'text-acc' : 'text-warn'}>{sys.simActive ? 'LIVE SIM' : 'SIMULATION'}</span>
        </span>
        <span className="hidden items-center gap-1.5 whitespace-nowrap xl:flex" title={`Active prediction model — ${sys.modelName}`}>
          <span className="tlabel">MODEL</span>
          <span className="text-txt-dim">{sys.modelLabel}</span>
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap" title="Last successful data fetch (IST)">
          <span className="tlabel">UPDATED</span>
          <span className="text-txt-dim num">{istClock(liveClock)}</span>
        </span>
        <span className="hidden h-4 w-px shrink-0 bg-line-strong sm:block" aria-hidden="true" />
        <div className="flex min-w-0 items-center gap-2" title="Authentication disabled in this demo build — all actions are attributed to the command role">
          <Icon name="person" size={13} className="shrink-0 text-txt-faint" />
          <span className="min-w-0 truncate font-mono text-[10.5px] uppercase tracking-[0.06em] text-txt-dim">
            DEMO
            <span className="hidden text-txt-faint sm:inline"> / COMMAND</span>
          </span>
        </div>
      </div>
    </header>
  );
}

export default function AppShell() {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setDrawer(false); }, [location.pathname]);

  // Predictable route scrolling; consolidated legacy routes may target an
  // internal section (for example /schedule → /work-orders#schedule).
  useEffect(() => {
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
    } else {
      window.scrollTo(0, 0);
    }
  }, [location.pathname, location.hash]);

  // overlay behaviour: lock the page scroll (no double scrollbars) and
  // restore focus handling while the navigation drawer is open
  useEffect(() => {
    if (!drawer) return;
    const { body } = document;
    const prevPad = body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    if (gap > 0) body.style.paddingRight = `${gap}px`;
    body.classList.add('scroll-locked');
    drawerRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      body.classList.remove('scroll-locked');
      body.style.paddingRight = prevPad;
      window.removeEventListener('keydown', onKey);
    };
  }, [drawer]);

  return (
    <div className="app-shell bg-base">
      <a className="skip-link" href="#main">Skip to main content</a>

      {/* left navigation */}
      <aside className="app-sidebar hidden border-r border-line bg-elev lg:flex lg:flex-col" aria-label="Primary navigation">
        <NavSidebar />
      </aside>

      {/* mobile drawer — a real overlay: page scroll is locked while open */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div id="app-nav-drawer" ref={drawerRef} tabIndex={-1}
            className="absolute inset-y-0 left-0 flex w-[240px] max-w-[85vw] flex-col border-r border-line bg-elev outline-none">
            <NavSidebar onNavigate={() => setDrawer(false)} idPrefix="drawer-" />
          </div>
        </div>
      )}

      <div className="app-main flex min-w-0 flex-col">
        <TopBar onMenu={() => setDrawer(true)} drawerOpen={drawer} />
        <main className="min-w-0 flex-1" id="main">
          <div className="app-page px-4 py-4 md:px-6 md:py-5">
            <Outlet />
            <footer className="mt-8 border-t border-line pt-3 font-mono text-[9.5px] leading-relaxed tracking-[0.05em] text-txt-faint">
              AEROSENTINEL — PROTOTYPE DECISION-SUPPORT SYSTEM · SYNTHETIC / DEMO DATA · AI OUTPUTS ARE ADVISORY AND REQUIRE AUTHORIZED HUMAN REVIEW · SIH 2026 PROBLEM 26249
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
