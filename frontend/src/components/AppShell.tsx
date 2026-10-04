// Application shell — left navigation, top system bar, main content area.
// Structured application chrome: strong alignment, subtle dividers,
// compact navigation, no floating cards or shadows.
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSystem } from './SystemContext';
import { Icon } from './icons';
import { istClock } from '../lib/format';
import { DATA_NOTE } from './ui';

const NAV: { group: string; items: [string, string][] }[] = [
  { group: 'COMMAND', items: [['Overview', '/app'], ['Fleet', '/app/fleet'], ['Alerts', '/app/alerts']] },
  { group: 'AIRCRAFT', items: [['Aircraft', '/app/aircraft'], ['Digital Twin', '/app/twin'], ['Telemetry', '/app/telemetry'], ['Health', '/app/health'], ['Diagnostics', '/app/diagnostics']] },
  { group: 'MAINTENANCE', items: [['Predictions', '/app/predictions'], ['Anomalies', '/app/anomalies'], ['RUL Analysis', '/app/rul'], ['Recommendations', '/app/recommendations'], ['Work Orders', '/app/work-orders'], ['Schedule', '/app/schedule'], ['History', '/app/history'], ['Inventory', '/app/inventory'], ['Spares Forecast', '/app/forecast'], ['Technicians', '/app/technicians']] },
  { group: 'ANALYTICS', items: [['Fleet Trends', '/app/analytics'], ['Failure Analysis', '/app/failure-analysis'], ['Scenario Simulation', '/app/whatif'], ['Model Performance', '/app/models']] },
  { group: 'SYSTEM', items: [['System Status', '/app/system'], ['Data Sources', '/app/data-sources'], ['Digital Thread', '/app/thread'], ['Query Console', '/app/copilot'], ['Audit Log', '/app/audit']] },
];

const SECTION_TITLES: Record<string, string> = {
  '/app': 'COMMAND / OVERVIEW', '/app/fleet': 'COMMAND / FLEET', '/app/alerts': 'COMMAND / ALERTS',
  '/app/predictions': 'MAINTENANCE / PREDICTIONS', '/app/anomalies': 'MAINTENANCE / ANOMALIES',
  '/app/rul': 'MAINTENANCE / RUL', '/app/recommendations': 'MAINTENANCE / RECOMMENDATIONS',
  '/app/work-orders': 'MAINTENANCE / WORK ORDERS', '/app/schedule': 'MAINTENANCE / SCHEDULE',
  '/app/history': 'MAINTENANCE / HISTORY', '/app/inventory': 'MAINTENANCE / INVENTORY',
  '/app/forecast': 'MAINTENANCE / SPARES FORECAST', '/app/technicians': 'MAINTENANCE / TECHNICIANS',
  '/app/analytics': 'ANALYTICS / FLEET TRENDS', '/app/failure-analysis': 'ANALYTICS / FAILURE ANALYSIS',
  '/app/whatif': 'ANALYTICS / SCENARIO SIMULATION', '/app/models': 'ANALYTICS / MODEL PERFORMANCE',
  '/app/system': 'SYSTEM / STATUS', '/app/data-sources': 'SYSTEM / DATA SOURCES',
  '/app/thread': 'SYSTEM / DIGITAL THREAD', '/app/copilot': 'SYSTEM / QUERY CONSOLE',
  '/app/audit': 'SYSTEM / AUDIT LOG',
};

function NavSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const sys = useSystem();
  const nav = useNavigate();
  const location = useLocation();

  // context-driven routes highlight their parent item
  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    if (['/app/aircraft', '/app/twin', '/app/telemetry', '/app/health', '/app/diagnostics'].includes(path)) {
      const tab = location.pathname.split('/')[3];
      const map: Record<string, string> = { undefined: '/app/aircraft', twin: '/app/twin', telemetry: '/app/telemetry', diagnostics: '/app/diagnostics' };
      if (location.pathname.startsWith('/app/aircraft/')) {
        // health tab lives on the overview page
        if (path === '/app/health' && (!tab)) return true;
        return map[tab] === path;
      }
      return false;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-4 py-3">
        <div className="font-mono text-[13px] font-semibold tracking-[0.18em] text-txt">AEROSENTINEL</div>
        <div className="tlabel mt-0.5">FLEET OPERATIONS · PREDICTIVE MAINTENANCE</div>
        <div className="mt-1.5 font-mono text-[10px] text-txt-faint">{user?.username} / {String(user?.role || '').toUpperCase()}</div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Application navigation">
        {NAV.map((g) => (
          <div key={g.group} className="mb-3">
            <div className="px-2 pb-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.16em] text-txt-faint">{g.group}</div>
            {g.items.map(([label, path]) => (
              <NavLink key={path} to={path} onClick={onNavigate}
                className={`block rounded-[2px] px-2 py-[5px] text-[12.5px] leading-tight ${
                  isActive(path) ? 'bg-[#17303C] text-acc' : 'text-txt-dim hover:bg-surface2 hover:text-txt'
                }`}
                aria-current={isActive(path) ? 'page' : undefined}>
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-2.5">
        <div className="tlabel mb-1.5 px-1">SIMULATION CONTROL</div>
        <div className="grid gap-1">
          <button className={`btn justify-center ${sys.liveMode ? 'btn-primary' : ''}`}
            onClick={() => sys.setLiveMode(!sys.liveMode)}
            title="Toggle periodic auto-refresh of live data">
            <Icon name={sys.liveMode ? 'stop' : 'play'} size={11} />
            {sys.liveMode ? 'LIVE MODE ON' : 'LIVE MODE'}
          </button>
          <button className="btn justify-center" onClick={async () => { await sys.degrade(); nav('/app/aircraft/AS-014'); onNavigate?.(); }}>
            <Icon name="warning" size={11} /> DEGRADE AS-014
          </button>
          <button className="btn justify-center" onClick={() => sys.resetSim()}>
            <Icon name="refresh" size={11} /> RESET SIM
          </button>
        </div>
        <div className="mt-2 px-1 font-mono text-[9px] leading-relaxed tracking-[0.05em] text-txt-faint">
          {DATA_NOTE}
        </div>
      </div>
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const sys = useSystem();
  const location = useLocation();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return () => clearInterval(t); }, []);

  const statusColor = sys.systemStatus === 'OPERATIONAL' ? 'text-ok' : sys.systemStatus === 'DEGRADED' ? 'text-crit' : 'text-txt-faint';
  const dotColor = sys.systemStatus === 'OPERATIONAL' ? '#6FB789' : sys.systemStatus === 'DEGRADED' ? '#D97070' : '#8A95A0';

  const crumb = (() => {
    const p = location.pathname;
    if (p.startsWith('/app/aircraft/')) {
      const tail = p.split('/')[3] || '';
      const tab = p.split('/')[4];
      const tabLabel = tab ? ` — ${tab.toUpperCase()}` : '';
      return `AIRCRAFT / ${tail}${tabLabel}`;
    }
    return SECTION_TITLES[p.split('/').slice(0, 3).join('/')] || 'OPERATIONS';
  })();

  return (
    <header className="flex h-11 shrink-0 items-center gap-4 border-b border-line bg-elev px-3">
      <button className="btn btn-xs lg:hidden" onClick={onMenu} aria-label="Open navigation">
        <Icon name="menu" size={13} />
      </button>
      <div className="hidden font-mono text-[10.5px] uppercase tracking-[0.14em] text-txt-dim md:block">
        FLEET OPERATIONS <span className="mx-1.5 text-line-strong">/</span>
        <span className="text-txt">{crumb}</span>
      </div>
      <div className="flex-1" />
      <div className="hidden items-center gap-5 font-mono text-[10px] uppercase tracking-[0.08em] lg:flex">
        <span className="flex items-center gap-1.5" title="Backend service status">
          <span className="tlabel">SYSTEM</span>
          <span className={`flex items-center gap-1.5 ${statusColor}`}>
            <span className="inline-block h-[7px] w-[7px]" style={{ background: dotColor }} aria-hidden="true" />
            {sys.systemStatus}
          </span>
        </span>
        <span className="flex items-center gap-1.5" title="Telemetry data mode">
          <span className="tlabel">DATA</span>
          <span className={sys.simActive ? 'text-acc' : 'text-warn'}>{sys.simActive ? 'LIVE SIM' : 'SIMULATION'}</span>
        </span>
        <span className="flex items-center gap-1.5" title="Active prediction model">
          <span className="tlabel">MODEL</span>
          <span className="text-txt-dim">{sys.modelLabel}</span>
        </span>
        <span className="flex items-center gap-1.5" title="Last successful data fetch">
          <span className="tlabel">UPDATED</span>
          <span className="text-txt-dim">{sys.lastUpdated ? istClock(sys.lastUpdated) : '—'}</span>
        </span>
      </div>
      <span className="hidden font-mono text-[10px] uppercase tracking-[0.08em] text-txt-faint sm:block" title="System clock (IST)">
        {istClock(clock)}
      </span>
      <span className="hidden h-4 w-px bg-line-strong md:block" aria-hidden="true" />
      <div className="flex items-center gap-2">
        <Icon name="person" size={13} className="text-txt-faint" />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-txt-dim">
          {user?.username}<span className="text-txt-faint"> / {String(user?.role || '').toUpperCase()}</span>
        </span>
        <button className="btn btn-xs" onClick={() => { logout(); nav('/login'); }} aria-label="Log out">
          <Icon name="logout" size={11} />
        </button>
      </div>
    </header>
  );
}

export default function AppShell() {
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();
  useEffect(() => { setDrawer(false); }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      {/* left navigation */}
      <aside className="hidden w-[212px] shrink-0 border-r border-line bg-elev lg:block" aria-label="Primary navigation">
        <NavSidebar />
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-[240px] border-r border-line bg-elev">
            <NavSidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setDrawer(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto" id="main">
          <div className="mx-auto w-full max-w-[1560px] px-4 py-4 md:px-6 md:py-5">
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
