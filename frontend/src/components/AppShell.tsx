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
import { useAuth } from '../context/AuthContext';
import { useSystem } from './SystemContext';
import { Icon } from './icons';
import { istClock } from '../lib/format';

const NAV: { group: string; items: [string, string][] }[] = [
  { group: 'COMMAND', items: [['Overview', '/app'], ['Fleet', '/app/fleet'], ['Alerts', '/app/alerts']] },
  { group: 'AIRCRAFT', items: [['Aircraft', '/app/aircraft'], ['Digital Twin', '/app/twin'], ['Telemetry', '/app/telemetry'], ['Health', '/app/health'], ['Diagnostics', '/app/diagnostics']] },
  { group: 'MAINTENANCE', items: [['Predictions', '/app/predictions'], ['Anomalies', '/app/anomalies'], ['RUL Analysis', '/app/rul'], ['Recommendations', '/app/recommendations'], ['Work Orders', '/app/work-orders'], ['Schedule', '/app/schedule'], ['History', '/app/history'], ['Inventory', '/app/inventory'], ['Spares Forecast', '/app/forecast'], ['Technicians', '/app/technicians']] },
  { group: 'ANALYTICS', items: [['Fleet Trends', '/app/analytics'], ['Failure Analysis', '/app/failure-analysis'], ['Scenario Simulation', '/app/whatif'], ['Model Performance', '/app/models']] },
  { group: 'SYSTEM', items: [['System Status', '/app/system'], ['Data Sources', '/app/data-sources'], ['Digital Thread', '/app/thread'], ['Query Console', '/app/copilot'], ['Audit Log', '/app/audit']] },
];

const SECTION_TITLES: Record<string, string> = {
  '/app': 'COMMAND CENTER', '/app/fleet': 'FLEET', '/app/alerts': 'ALERTS',
  '/app/predictions': 'PREDICTIONS', '/app/anomalies': 'ANOMALIES',
  '/app/rul': 'RUL ANALYSIS', '/app/recommendations': 'RECOMMENDATIONS',
  '/app/work-orders': 'WORK ORDERS', '/app/schedule': 'SCHEDULE',
  '/app/history': 'HISTORY', '/app/inventory': 'INVENTORY',
  '/app/forecast': 'SPARES FORECAST', '/app/technicians': 'TECHNICIANS',
  '/app/analytics': 'FLEET TRENDS', '/app/failure-analysis': 'FAILURE ANALYSIS',
  '/app/whatif': 'SCENARIO SIMULATION', '/app/models': 'MODEL PERFORMANCE',
  '/app/system': 'SYSTEM STATUS', '/app/data-sources': 'DATA SOURCES',
  '/app/thread': 'DIGITAL THREAD', '/app/copilot': 'QUERY CONSOLE',
  '/app/audit': 'AUDIT LOG',
};

/** Section group a route belongs to — used for the breadcrumb trail. */
const SECTION_GROUP: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  NAV.forEach((g) => g.items.forEach(([, path]) => { m[path] = g.group; }));
  return m;
})();

function NavSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const sys = useSystem();
  const nav = useNavigate();
  const location = useLocation();

  // context-driven routes highlight their parent item.
  // /app/aircraft/:id(/tab) — segment 4 is the workspace tab.
  const isActive = (path: string) => {
    const p = location.pathname;
    if (path === '/app') return p === '/app';
    if (path === '/app/aircraft') {
      if (!p.startsWith('/app/aircraft')) return false;
      const tab = p.split('/')[4] || 'overview';
      return tab === 'overview';
    }
    if (['/app/twin', '/app/telemetry', '/app/diagnostics'].includes(path)) {
      if (!p.startsWith('/app/aircraft/')) return false;
      const tab = p.split('/')[4];
      return ({ twin: '/app/twin', telemetry: '/app/telemetry', diagnostics: '/app/diagnostics' } as Record<string, string>)[tab] === path;
    }
    if (path === '/app/health') return false; // alias — lands on the aircraft overview (subsystem health matrix)
    return p.startsWith(path);
  };

  return (
    <>
      <div className="shrink-0 border-b border-line px-4 py-2.5">
        <div className="font-mono text-[13px] font-semibold leading-tight tracking-[0.18em] text-txt">AEROSENTINEL</div>
        <div className="tlabel mt-0.5">FLEET OPERATIONS · PREDICTIVE MAINTENANCE</div>
      </div>

      {/* scrolls internally only when the navigation exceeds the viewport */}
      <nav className="app-nav px-2 py-1.5" aria-label="Application navigation">
        {NAV.map((g) => (
          <div key={g.group} className="mb-1 last:mb-0">
            <div className="px-2 pb-0.5 font-mono text-[9.5px] font-medium uppercase leading-tight tracking-[0.16em] text-txt-faint">{g.group}</div>
            {g.items.map(([label, path]) => (
              <NavLink key={path} to={path} onClick={onNavigate}
                className={`block rounded-[2px] px-2 py-[3px] text-[12px] leading-[1.35] ${
                  isActive(path) ? 'bg-[#17303C] text-acc' : 'text-txt-dim hover:bg-surface2 hover:text-txt'
                }`}
                aria-current={isActive(path) ? 'page' : undefined}>
                {label}
              </NavLink>
            ))}
          </div>
        ))}
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
 * (identity + logout) are never dropped; the operational metadata
 * between them degrades by priority as width is lost
 * (MODEL → DATA → SYSTEM), and the whole bar wraps to a second row
 * before anything can overlap.
 *
 * Time is rendered exactly ONCE here — the "UPDATED" stamp, which is the
 * single authoritative data-freshness value from SystemContext. No page
 * renders a second clock in the chrome.
 */
function TopBar({ onMenu, drawerOpen }: { onMenu: () => void; drawerOpen: boolean }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const sys = useSystem();
  const location = useLocation();

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
          <span className="text-txt-dim num">{sys.lastUpdated ? istClock(sys.lastUpdated) : '—'}</span>
        </span>
        <span className="hidden h-4 w-px shrink-0 bg-line-strong sm:block" aria-hidden="true" />
        <div className="flex min-w-0 items-center gap-2">
          <Icon name="person" size={13} className="shrink-0 text-txt-faint" />
          <span className="min-w-0 truncate font-mono text-[10.5px] uppercase tracking-[0.06em] text-txt-dim"
            title={`${user?.username ?? ''} / ${String(user?.role || '').toUpperCase()}`}>
            {user?.username}
            <span className="hidden text-txt-faint sm:inline"> / {String(user?.role || '').toUpperCase()}</span>
          </span>
          <button className="btn btn-xs btn-icon shrink-0" onClick={() => { logout(); nav('/login'); }}
            aria-label="Log out" title="Log out">
            <Icon name="logout" size={11} />
          </button>
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

  // predictable scrolling: every route starts at the top of the document
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

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
            <NavSidebar onNavigate={() => setDrawer(false)} />
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
