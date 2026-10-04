import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SystemProvider, useSystem } from './components/SystemContext';
import AppLayout from './components/AppShell';
import Login from './pages/Login';
import CommandCenter from './pages/CommandCenter';
import FleetPage from './pages/FleetPage';
import AircraftWorkspace from './pages/AircraftWorkspace';
import { Predictions, Anomalies, Rul } from './pages/PredictPages';
import Recommendations from './pages/Recommendations';
import { WorkOrders, Schedule, History } from './pages/MaintenancePages';
import { Inventory, Forecast, Technicians } from './pages/LogisticsPages';
import { Analytics, FailureAnalysis, WhatIf } from './pages/AnalyticsPages';
import { Alerts, Models, SystemStatus, DataSources, AuditLog, Copilot, Thread } from './pages/SystemPages';

function Guard({ children }: { children: React.ReactElement }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
}

/** Redirects context-driven routes (/app/aircraft, /app/twin, …) to the focused aircraft. */
function AircraftContextRedirect({ tab }: { tab?: string }) {
  const sys = useSystem();
  const nav = useNavigate();
  const { id } = useParams();
  const target = id || sys.currentAircraft;
  React.useEffect(() => { nav(`/app/aircraft/${target}${tab ? '/' + tab : ''}`, { replace: true }); }, [target, tab, nav]);
  return <div className="panel px-4 py-5 font-mono text-[11px] uppercase tracking-[0.12em] text-txt-faint">OPENING AIRCRAFT {target}…</div>;
}

export default function App() {
  return (
    <AuthProvider>
      <SystemProvider>
        <BrowserRouter>
          <Routes>
            {/* entry — straight into the operational environment */}
            <Route path="/" element={<EntryRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route path="/app" element={<Guard><AppLayout /></Guard>}>
              <Route index element={<CommandCenter />} />
              <Route path="fleet" element={<FleetPage />} />

              {/* aircraft context routes */}
              <Route path="aircraft" element={<AircraftContextRedirect />} />
              <Route path="twin" element={<AircraftContextRedirect tab="twin" />} />
              <Route path="telemetry" element={<AircraftContextRedirect tab="telemetry" />} />
              <Route path="health" element={<AircraftContextRedirect />} />
              <Route path="diagnostics" element={<AircraftContextRedirect tab="diagnostics" />} />
              <Route path="aircraft/:id" element={<AircraftWorkspace />} />
              <Route path="aircraft/:id/twin" element={<AircraftWorkspace />} />
              <Route path="aircraft/:id/telemetry" element={<AircraftWorkspace />} />
              <Route path="aircraft/:id/diagnostics" element={<AircraftWorkspace />} />

              {/* maintenance */}
              <Route path="predictions" element={<Predictions />} />
              <Route path="anomalies" element={<Anomalies />} />
              <Route path="rul" element={<Rul />} />
              <Route path="recommendations" element={<Recommendations />} />
              <Route path="work-orders" element={<WorkOrders />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="history" element={<History />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="forecast" element={<Forecast />} />
              <Route path="technicians" element={<Technicians />} />

              {/* analytics */}
              <Route path="analytics" element={<Analytics />} />
              <Route path="failure-analysis" element={<FailureAnalysis />} />
              <Route path="whatif" element={<WhatIf />} />
              <Route path="models" element={<Models />} />

              {/* system */}
              <Route path="system" element={<SystemStatus />} />
              <Route path="data-sources" element={<DataSources />} />
              <Route path="audit" element={<AuditLog />} />
              <Route path="copilot" element={<Copilot />} />
              <Route path="thread" element={<Thread />} />

              {/* legacy routes preserved */}
              <Route path="registry" element={<Navigate to="/app/fleet" replace />} />
              <Route path="availability" element={<Navigate to="/app/analytics" replace />} />
              <Route path="resources" element={<Navigate to="/app/technicians" replace />} />
              <Route path="upload" element={<Navigate to="/app/data-sources" replace />} />
              <Route path="quality" element={<Navigate to="/app/system" replace />} />
              <Route path="arch" element={<Navigate to="/app/system" replace />} />
              <Route path="settings" element={<Navigate to="/app/system" replace />} />
              <Route path="alerts" element={<Alerts />} />
            </Route>

            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </BrowserRouter>
      </SystemProvider>
    </AuthProvider>
  );
}

function EntryRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? '/app' : '/login'} />;
}
