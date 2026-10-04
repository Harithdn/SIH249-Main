import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Fleet, Availability, Registry } from './pages/FleetPages';
import AircraftDetail from './pages/AircraftDetail';
import { Predictions, Anomalies, Rul } from './pages/PredictPages';
import { WorkOrders, Schedule, History } from './pages/MaintenancePages';
import { Inventory, Forecast, Resources } from './pages/LogisticsPages';
import { Analytics, WhatIf } from './pages/AnalyticsPages';
import { Alerts, Upload, Models, Copilot, Thread, Arch, Quality, Settings } from './pages/SystemPages';

function Guard({ children }: any) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
}
export default function App() {
  return <AuthProvider><BrowserRouter><Routes>
    <Route path="/" element={<Landing />} /><Route path="/login" element={<Login />} />
    <Route path="/app" element={<Guard><AppLayout /></Guard>}>
      <Route index element={<Dashboard />} />
      <Route path="fleet" element={<Fleet />} /><Route path="availability" element={<Availability />} />
      <Route path="registry" element={<Registry />} />
      <Route path="aircraft/:id" element={<AircraftDetail />} /><Route path="twin/:id" element={<AircraftDetail />} />
      <Route path="thread" element={<Thread />} />
      <Route path="predictions" element={<Predictions />} /><Route path="anomalies" element={<Anomalies />} /><Route path="rul" element={<Rul />} />
      <Route path="work-orders" element={<WorkOrders />} /><Route path="schedule" element={<Schedule />} /><Route path="history" element={<History />} />
      <Route path="inventory" element={<Inventory />} /><Route path="forecast" element={<Forecast />} /><Route path="resources" element={<Resources />} />
      <Route path="analytics" element={<Analytics />} /><Route path="whatif" element={<WhatIf />} />
      <Route path="alerts" element={<Alerts />} /><Route path="upload" element={<Upload />} /><Route path="models" element={<Models />} />
      <Route path="copilot" element={<Copilot />} /><Route path="arch" element={<Arch />} /><Route path="quality" element={<Quality />} /><Route path="settings" element={<Settings />} />
    </Route>
  </Routes></BrowserRouter></AuthProvider>;
}
