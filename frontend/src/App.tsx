import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { SystemProvider, useSystem } from './components/SystemContext';
import AppLayout from './components/AppShell';
import CommandCenter from './pages/CommandCenter';
import FleetPage from './pages/FleetPage';
import AircraftWorkspace from './pages/AircraftWorkspace';
import { Predictions, Anomalies, Rul } from './pages/PredictPages';
import Recommendations from './pages/Recommendations';
import { WorkOrders, History } from './pages/MaintenancePages';
import { Inventory, Technicians } from './pages/LogisticsPages';
import { Analytics, FailureAnalysis, WhatIf } from './pages/AnalyticsPages';
import { Alerts, Models, SystemStatus, DataSources, AuditLog, Copilot, Thread } from './pages/SystemPages';

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
    <SystemProvider>
      <BrowserRouter>
        <Routes>
          {/* entry — straight into the operational environment (no login in
              this demo build): "/" and "/overview" land on the Command Center */}
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/overview" element={<Navigate to="/app" replace />} />

          <Route path="/app" element={<AppLayout />}>
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
            {/* Consolidated workspace aliases preserve old bookmarks without
                leaving duplicate top-level destinations. */}
            <Route path="schedule" element={<Navigate to="/app/work-orders#schedule" replace />} />
            <Route path="history" element={<History />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="forecast" element={<Navigate to="/app/inventory#forecast" replace />} />
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
  );
}
