import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { post } from '../services/api';

const NAV: [string, [string, string][]][] = [
  ['COMMAND CENTER', [['Dashboard', '/app'], ['Fleet Overview', '/app/fleet'], ['Availability', '/app/availability']]],
  ['AIRCRAFT', [['Registry', '/app/registry'], ['Digital Twin', '/app/twin/AS-014'], ['Digital Thread', '/app/thread']]],
  ['PREDICTIVE MAINTENANCE', [['Predictions', '/app/predictions'], ['Anomalies', '/app/anomalies'], ['RUL Analysis', '/app/rul']]],
  ['MAINTENANCE OPS', [['Work Orders', '/app/work-orders'], ['Schedule', '/app/schedule'], ['History', '/app/history']]],
  ['LOGISTICS', [['Spare Parts', '/app/inventory'], ['Forecast', '/app/forecast'], ['Resources', '/app/resources']]],
  ['ANALYTICS', [['Fleet Analytics', '/app/analytics'], ['What-If Sim', '/app/whatif']]],
  ['SYSTEM', [['Alerts', '/app/alerts'], ['AI Copilot', '/app/copilot'], ['Data Upload', '/app/upload'], ['Models', '/app/models'], ['Data Quality', '/app/quality'], ['Architecture', '/app/arch'], ['Settings', '/app/settings']]],
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [demoStep, setDemoStep] = useState(0);
  const runDemo = async () => {
    // Guided 10-step demo: AS-014 degradation -> detection -> work order
    const steps = [0.15, 0.15, 0.15, 0.15, 0.15, 0.15];
    await post('/api/simulate/reset', {});
    for (let i = 0; i < steps.length; i++) {
      setDemoStep(i + 1);
      await post('/api/simulate/degrade', { aircraft_id: 'AS-014', component: 'Hydraulic System', level: steps[i] });
      await new Promise(r => setTimeout(r, 500));
    }
    setDemoStep(0);
    nav('/app/aircraft/AS-014');
  };
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-800 bg-[#0c1526] p-3 hidden md:block overflow-y-auto" style={{ maxHeight: '100vh' }}>
        <div className="font-bold text-cyan-300 tracking-wide">AEROSENTINEL</div>
        <div className="text-[11px] text-slate-400 mb-3">Predictive Maintenance · {user?.role} · {user?.username}</div>
        {NAV.map(([g, items]) => (
          <div key={g} className="mb-3"><div className="lbl mb-1">{g}</div>
            {items.map(([l, p]) => <NavLink key={p + l} to={p} end={p === '/app'}
              className={({ isActive }) => `block text-[13px] px-2 py-1.5 rounded ${isActive ? 'bg-cyan-500/15 text-cyan-200' : 'text-slate-300 hover:bg-slate-800'}`}>{l}</NavLink>)}
          </div>))}
        <button className="btn w-full mt-2" onClick={runDemo}>▶ Demo Mode {demoStep ? `(${demoStep}/6)` : ''}</button>
        <button className="btn-ghost w-full mt-2" onClick={() => { logout(); nav('/login'); }}>Logout</button>
        <div className="text-[10px] text-slate-500 mt-3">Prototype decision-support. Synthetic data. AI advisory — human review required.</div>
      </aside>
      <main className="flex-1 p-4 max-w-[1400px] mx-auto w-full">
        <Outlet />
        <footer className="text-[11px] text-slate-500 mt-6 border-t border-slate-800 pt-2">AeroSentinel is a prototype decision-support system using synthetic/demo data. AI outputs are advisory and require authorized human review.</footer>
      </main>
    </div>
  );
}
