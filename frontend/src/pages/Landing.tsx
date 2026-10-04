import { Link } from 'react-router-dom';
export default function Landing() {
  return <div className="max-w-5xl mx-auto p-8">
    <div className="text-cyan-300 text-sm tracking-widest">AEROSENTINEL · SIH 2026 · PROBLEM 26249</div>
    <h1 className="text-4xl font-bold mt-2">Predict Failures. Prevent Downtime.<br />Maximize Fleet Availability.</h1>
    <p className="text-slate-300 mt-3">An AI-powered decision-support platform for aircraft health monitoring, predictive maintenance and fleet readiness. <span className="text-amber-300">Demo with synthetic data.</span></p>
    <div className="flex gap-3 mt-5"><Link className="btn" to="/app">Explore Command Center</Link><Link className="btn-ghost" to="/login">View Live Simulation</Link></div>
    <div className="grid md:grid-cols-3 gap-3 mt-8">
      {[['From Reactive to Predictive', 'Failure → grounding → emergency fix → long downtime becomes Telemetry → anomaly → prediction → RUL → planned maintenance → higher readiness.'],
        ['AI Capabilities', 'Anomaly detection (IsolationForest), failure classification, RUL regression, explainability, recommendations — all computed live from synthetic telemetry.'],
        ['Human-in-the-Loop', 'AI detects → predicts → recommends. Engineer reviews → approves → work order → technician executes → validation. AI never autonomously grounds aircraft.']].map(([t, d]) => (
        <div key={t} className="card"><div className="font-semibold text-sm mb-1">{t}</div><div className="text-[13px] text-slate-300">{d}</div></div>))}
    </div>
    <div className="card mt-4 text-[13px] text-slate-300">Detect → Predict → Explain → Plan → Execute → Learn → Improve Readiness. Telemetry drives health, anomalies, predictions, RUL, recommendations, spares, technicians, schedule, downtime and fleet availability — one integrated thread.</div>
  </div>;
}
