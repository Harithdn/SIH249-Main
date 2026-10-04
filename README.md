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
App: http://localhost:5173. Set `VITE_API_URL=http://localhost:8000`.

### Docker
```
docker compose up
```

## Demo (centerpiece, 2 min)
1. Login (any password): `commander / command`.
2. Command Center → **Simulate Degradation (AS-014)** (or Demo Mode in sidebar, 6 steps).
3. Open `AS-014`: vibration/temp rise, anomaly score ↑, P(fail) 18%→82%, RUL →16d, explainability bars.
4. Recommendations → spares check (Hydraulic Pump) → technician → slot → **Create work order → Approve**.
5. Work Orders → **Complete** → telemetry normalizes, health recovers to ~94, availability updates.
6. Show report (`Generate Fleet Readiness Report`), copilot ("Why is AS-014 high risk?"), Digital Thread.

## Roles
command (fleet), engineer (health/predictions/work orders), logistics (inventory/forecast), technician (assigned WOs). Mock JWT.

## Responsible AI
No autonomous grounding/authorization; low-confidence predictions flagged; all metrics labeled demo/simulation; no classified data; no fake claims (use "projected in simulated scenario").

## Tests
```
cd backend && pytest
```
