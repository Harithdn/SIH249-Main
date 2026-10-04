import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { post } from '../services/api';
import { useAuth } from '../context/AuthContext';
const ROLES = ['command', 'engineer', 'logistics', 'technician'];
export default function Login() {
  const [u, setU] = useState('commander'); const [role, setRole] = useState('command');
  const nav = useNavigate(); const { login } = useAuth();
  const go = async () => {
    try { const r = await post('/api/auth/login', { username: u, password: 'demo', role }); login({ username: u, role: r.role, token: r.token }); nav('/app'); }
    catch { login({ username: u, role }); nav('/app'); }
  };
  return <div className="min-h-screen flex items-center justify-center p-4">
    <div className="card w-[380px]">
      <div className="font-bold text-cyan-300 text-lg">AEROSENTINEL</div>
      <div className="text-xs text-slate-400">AI-Powered Aircraft Predictive Maintenance</div>
      <div className="text-[11px] text-amber-300 mt-1">Demo Environment — Synthetic Data</div>
      <label className="lbl mt-4">Username</label><input className="inp" value={u} onChange={e => setU(e.target.value)} />
      <label className="lbl mt-2">Password</label><input className="inp" type="password" defaultValue="demo" />
      <label className="lbl mt-2">Role</label>
      <select className="inp" value={role} onChange={e => setRole(e.target.value)}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
      <button className="btn w-full mt-4" onClick={go}>Login</button>
      <div className="text-[11px] text-slate-400 mt-2">Demo accounts: Command / Engineer / Logistics / Technician (any password).</div>
      <Link to="/" className="text-[12px] text-cyan-300">← Landing page</Link>
    </div></div>;
}
