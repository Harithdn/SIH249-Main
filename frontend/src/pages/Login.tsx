// Operator access — authentication for the operations environment.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { post } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/icons';

const ROLES = ['command', 'engineer', 'logistics', 'technician'];

export default function Login() {
  const [u, setU] = useState('commander');
  const [role, setRole] = useState('command');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { login } = useAuth();

  const go = async () => {
    setBusy(true);
    try {
      const r = await post('/api/auth/login', { username: u, password: 'demo', role });
      login({ username: u, role: r.role, token: r.token });
    } catch {
      login({ username: u, role });
    }
    nav('/app');
  };

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-base px-4 py-8">
      <div className="w-full max-w-[380px] min-w-0">
        <div className="border border-line bg-surface">
          <div className="border-b border-line bg-surface2 px-5 py-4">
            <div className="font-mono text-[14px] font-semibold tracking-[0.2em] text-txt">AEROSENTINEL</div>
            <div className="tlabel mt-1">FLEET OPERATIONS · PREDICTIVE MAINTENANCE</div>
          </div>

          <form className="px-5 py-5" onSubmit={(e) => { e.preventDefault(); go(); }}>
            <div className="mb-4 border border-[#2a2312] bg-warn-dim px-2.5 py-1.5 font-mono text-[9.5px] uppercase leading-relaxed tracking-[0.08em] text-warn">
              DEMO ENVIRONMENT — SYNTHETIC DATA
            </div>

            <label className="tlabel mb-1 block" htmlFor="user">OPERATOR</label>
            <input id="user" className="inp mb-3" value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" />

            <label className="tlabel mb-1 block" htmlFor="pass">PASSWORD</label>
            <input id="pass" className="inp mb-3" type="password" defaultValue="demo" autoComplete="current-password" />

            <label className="tlabel mb-1 block" htmlFor="role">ROLE</label>
            <select id="role" className="inp mb-4" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r.toUpperCase()}</option>)}
            </select>

            <button className="btn btn-primary w-full justify-center" type="submit" disabled={busy}>
              <Icon name="logout" size={12} /> {busy ? 'AUTHENTICATING…' : 'SIGN IN'}
            </button>

            <div className="mt-4 font-mono text-[9.5px] leading-relaxed tracking-[0.05em] text-txt-faint">
              DEMO ACCOUNTS — COMMAND / ENGINEER / LOGISTICS / TECHNICIAN (ANY PASSWORD).
              AI OUTPUTS ARE ADVISORY; AUTHORIZED HUMAN REVIEW REQUIRED.
            </div>
          </form>
        </div>
        <div className="mt-3 text-center font-mono text-[9.5px] uppercase tracking-[0.1em] text-txt-faint">
          SIH 2026 · PROBLEM 26249 · PROTOTYPE DECISION-SUPPORT SYSTEM
        </div>
      </div>
    </div>
  );
}
