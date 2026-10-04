// System-wide operational context: data freshness, simulation state,
// system status, model label, current-aircraft focus and refresh bus.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { get, post } from '../services/api';

type SysStatus = 'OPERATIONAL' | 'DEGRADED' | 'UNKNOWN';

interface SystemCtx {
  lastUpdated: Date | null;          // last successful data fetch by any page
  markUpdated: () => void;
  refreshKey: number;                // bump → pages reload (live mode / simulation actions)
  bumpRefresh: () => void;
  liveMode: boolean;                 // periodic auto-refresh
  setLiveMode: (v: boolean) => void;
  simActive: boolean;                // degradation simulation currently active
  systemStatus: SysStatus;
  modelLabel: string;                // compact version for the system bar (e.g. "V1.4")
  modelName: string;                 // full registry name (e.g. "Failure Prediction v1.4")
  currentAircraft: string;           // focused tail number
  setCurrentAircraft: (id: string) => void;
  degrade: (aircraftId?: string, component?: string, level?: number) => Promise<void>;
  resetSim: (aircraftId?: string) => Promise<void>;
}

const C = createContext<SystemCtx>(null as any);

export function SystemProvider({ children }: { children: React.ReactNode }) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [liveMode, setLiveMode] = useState(false);
  const [simActive, setSimActive] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SysStatus>('UNKNOWN');
  const [modelLabel, setModelLabel] = useState('—');
  const [modelName, setModelName] = useState('—');
  const [currentAircraft, setCurrentAircraftState] = useState(
    () => localStorage.getItem('currentAircraft') || 'AS-014'
  );

  const markUpdated = useCallback(() => setLastUpdated(new Date()), []);
  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const setCurrentAircraft = useCallback((id: string) => {
    setCurrentAircraftState(id);
    localStorage.setItem('currentAircraft', id);
  }, []);

  // system status + model label + simulation state polling
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const [health, models, sim] = await Promise.all([
          get('/api/system-health').catch(() => null),
          get('/api/models').catch(() => null),
          get('/api/simulate/state').catch(() => null),
        ]);
        if (!alive) return;
        if (Array.isArray(health)) {
          const bad = health.some((h: any) => h.status !== 'Operational');
          setSystemStatus(bad ? 'DEGRADED' : 'OPERATIONAL');
        }
        if (Array.isArray(models) && models.length) {
          const m = models.find((x: any) => x.name === 'Failure Prediction') || models[0];
          setModelLabel(String(m.version || '—').toUpperCase());
          setModelName(`${m.name} ${m.version}`);
        }
        if (sim && typeof sim.live === 'boolean') setSimActive(sim.live);
        // the shell poll is itself a data fetch — pages that load no data of
        // their own (e.g. scenario simulation, data upload) still get a real
        // UPDATED stamp instead of an em-dash.
        setLastUpdated(new Date());
      } catch { /* status stays as-is */ }
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => { alive = false; clearInterval(t); };
  }, [refreshKey]);

  // live mode: periodic refresh
  useEffect(() => {
    if (!liveMode) return;
    const t = setInterval(() => setRefreshKey((k) => k + 1), 8000);
    return () => clearInterval(t);
  }, [liveMode]);

  const degrade = useCallback(async (aircraftId = 'AS-014', component = 'Hydraulic System', level = 0.15) => {
    await post('/api/simulate/degrade', { aircraft_id: aircraftId, component, level });
    setSimActive(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const resetSim = useCallback(async (aircraftId?: string) => {
    await post('/api/simulate/reset', aircraftId ? { aircraft_id: aircraftId } : {});
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <C.Provider value={{
      lastUpdated, markUpdated, refreshKey, bumpRefresh, liveMode, setLiveMode,
      simActive, systemStatus, modelLabel, modelName, currentAircraft, setCurrentAircraft, degrade, resetSim,
    }}>
      {children}
    </C.Provider>
  );
}

export const useSystem = () => useContext(C);
