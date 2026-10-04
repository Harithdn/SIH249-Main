# AeroSentinel — AI-Powered Predictive Maintenance & Fleet Availability (SIH 2026 · Problem 26249)

Prototype decision-support platform. **Synthetic/demo data only.** AI outputs are advisory and require authorized human review.

## Story
Detect → Predict → Explain → Plan → Execute → Learn → Improve Readiness.
Telemetry → health → anomaly → failure prediction → RUL → recommendation → spares → technicians → schedule → downtime → availability.

## Run locally
### Backend
```
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Docs: http://localhost:8000/docs. DB auto-seeds 24 aircraft, 7 components each, telemetry, history, parts, techs on first run (SQLite `aerosentinel.db`; set `DATABASE_URL` for Postgres).

### Frontend
```
cd frontend
npm install
npm run dev
```
App: http://localhost:5173. The dev server proxies `/api` to the backend. Set `VITE_API_URL` only if the backend runs elsewhere.

### Docker
```
docker compose up
```
The frontend container serves the build via nginx and proxies `/api` to the backend service.

## Operations console
The frontend is an operations application shell (left navigation + top system bar + work area):
- **Command** — Overview (fleet readiness, status board, active events, maintenance queue), Fleet registry, Alert center.
- **Aircraft** — per-aircraft workspace: subsystem health matrix, operational timeline, **digital twin** (interactive schematic with subsystem modes and component inspection), engineered telemetry charts (baselines, warning thresholds, anomaly markers, actual-vs-expected), diagnostics (model reasoning, feature contributions, RUL history/projection).
- **Maintenance** — predictions, anomaly detection, RUL analysis, recommendations (parts + technician + slot), work orders (Detected → Approved → Scheduled → In Progress → Completed), schedule, history, inventory, spares forecast, technicians.
- **Analytics** — fleet trends, failure analysis (Pareto), scenario simulation, model performance (recorded metrics only).
- **System** — service status, data quality, data sources (CSV ingestion), digital thread, read-only query console, audit log.

## Demo (centerpiece, 2 min)
1. Login (any password): `commander / command`.
2. Overview → **Simulate Degradation AS-014** (or Live Mode / Degrade / Reset in the sidebar SIMULATION CONTROL cluster).
3. Open `AS-014` diagnostics: vibration/temp rise, anomaly score ↑, P(fail) 18%→82%, RUL →16d, feature-contribution bars.
4. Recommendations → parts check (Hydraulic Pump) → technician → slot → **Create work order**.
5. Work Orders → **Complete** → telemetry normalizes, health recovers, availability updates.
6. Show report (`Readiness Report`), query console ("Why is AS-014 high risk?"), Digital Thread.

## Roles
command (fleet), engineer (health/predictions/work orders), logistics (inventory/forecast), technician (assigned WOs). Mock JWT.

## Responsible AI
No autonomous grounding/authorization; low-confidence predictions flagged; all metrics labeled demo/simulation; no classified data; no fake claims (use "projected in simulated scenario").

## Tests
```
cd backend && pytest
```
