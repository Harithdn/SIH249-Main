<div align="center">

<img src="frontend/public/logo.png" alt="AeroSentinel logo — a networked globe with an ascending flight path" width="150" />

# AeroSentinel

**Predictive component-failure and fleet-availability decision support for aerospace maintenance operations.**

Turns synthetic aircraft telemetry into ranked, explainable, resource-aware maintenance actions — and closes the loop from detection to work-order completion and recovered fleet readiness.

[![Status: prototype](https://img.shields.io/badge/status-prototype-b45309?style=flat-square)](#project-status-and-next-steps)
[![Data: synthetic / simulation](https://img.shields.io/badge/data-synthetic%20%C2%B7%20simulation-8a5a00?style=flat-square)](#data-sources-and-licences)
[![SIH 2026 - Problem 26249](https://img.shields.io/badge/SIH%202026-problem%2026249-1f4e79?style=flat-square)](#citation)
[![Licence: not specified](https://img.shields.io/badge/licence-not%20specified-lightgrey?style=flat-square)](#licence)

[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript 5.6](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite 6](https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS 3](https://img.shields.io/badge/Tailwind%20CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![FastAPI 0.115](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?style=flat-square&logo=scikitlearn&logoColor=white)](https://scikit-learn.org)
[![SQLAlchemy 2](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Render](https://img.shields.io/badge/deploy-Render-46E3B7?style=flat-square&logo=render&logoColor=black)](https://render.com)

[Quick start](#quick-start) · [How it works](#how-it-works) · [AI and ML system](#the-ai-and-ml-system) · [API reference](#api-reference) · [Deployment](#deployment) · [Limitations](#limitations)

</div>

---

> [!IMPORTANT]
> **This is a prototype decision-support system. It is not an airworthiness, certification, or maintenance-authorisation system, and it must not be used to dispatch, ground, or release a real aircraft.**
>
> * All operational data in this repository is **synthetic** — generated in-process by the backend seeder. No real aircraft, fleet, base, sensor stream, technician or supplier data is included.
> * Every AI output (failure probability, remaining useful life, anomaly score, recommendation) is **advisory**. The application is built around explicit human review and records engineer approval in an audit trail.
> * "Bases", tail numbers, part numbers, suppliers and personnel names are fictional demo values.
> * No model in this repository has been validated against real failure data, and no accuracy, precision, recall or RUL-error figure in this README describes real-world performance.

---

## Table of contents

- [The question it answers](#the-question-it-answers)
  - [Problem](#problem) · [Approach](#approach) · [Operational benefit](#operational-benefit)
- [See it working](#see-it-working)
  - [What the console looks like](#what-the-console-looks-like) · [Two-minute demo](#two-minute-demo) · [Screenshot slots](#screenshot-slots)
- [Feature overview](#feature-overview)
- [How it works](#how-it-works)
  - [System architecture](#system-architecture) · [Frontend and backend interaction](#frontend-and-backend-interaction) · [Data model](#data-model) · [Predictive maintenance pipeline](#predictive-maintenance-pipeline) · [Work-order lifecycle](#work-order-lifecycle) · [Digital thread](#digital-thread)
- [The AI and ML system](#the-ai-and-ml-system)
  - [Training pipeline](#training-pipeline) · [Inference pipeline](#inference-pipeline) · [Explainability](#explainability-and-confidence) · [Model persistence](#model-persistence) · [What is real, what is simulated](#what-is-real-what-is-simulated)
- [How well it works](#how-well-it-works)
- [Typical operator workflow](#typical-operator-workflow)
- [Quick start](#quick-start)
  - [Option A — local development](#option-a--local-development) · [Option B — Docker Compose](#option-b--docker-compose)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Development](#development)
- [Deployment](#deployment)
- [Repository layout](#repository-layout)
- [Technology](#technology)
- [Data sources and licences](#data-sources-and-licences)
- [Limitations](#limitations)
- [Security and responsible AI](#security-and-responsible-ai)
- [Project status and next steps](#project-status-and-next-steps)
- [Contributing](#contributing)
- [Citation](#citation)
- [Acknowledgements](#acknowledgements)
- [Licence](#licence)

---

## The question it answers

### Problem

Fleet operators lose availability in three places at once: a component fails before anyone expects it, the spare part it needs is not on the shelf, and the engineer who can fit it is committed elsewhere. Each of those is visible in isolation — condition monitoring shows vibration, the stores system shows stock, the roster shows people — but the operational decision is a *combination* of all three, taken against a deadline.

Today that combination is usually assembled by hand. A planner opens an availability board, checks which aircraft are red, then opens a separate condition-monitoring tool, then opens a parts system, then opens a schedule — and reconciles them mentally, for a handful of aircraft, at whatever interval the planning cycle allows. The result is that maintenance is planned on **calendar intervals and flight hours** and executed **reactively** when something is already degraded or has already failed, and the interventions that were genuinely predictable were only noticed once they became urgent.

The people who live with this are fleet maintenance planners, MRO supervisors and engineering officers, and the knock-on cost lands on operations: grounded aircraft, cannibalised parts, expedited spares with long lead times, unplanned overtime.

Without a system like this, the failure mode is not "nobody saw the vibration" — dashboards already show vibration. It is that **nobody re-ran the analysis for every component of every aircraft, ranked the results by consequence and feasibility, and attached a part number, a technician and a slot to the top of the list** before the next planning meeting.

### Approach

AeroSentinel is a working prototype of that decision layer. It:

1. **Recomputes component risk on demand** from synthetic telemetry and maintenance history using three scikit-learn models — a failure classifier, a remaining-useful-life regressor, and an isolation-forest anomaly detector.
2. **Explains each prediction** with per-prediction feature contributions, so a planner can see *why* the number moved rather than accepting a black-box score.
3. **Converts predictions into executable work** — required part, suggested technician, earliest slot, estimated hours — and requires an engineer to approve before a work order exists.
4. **Closes the loop**: completing a work order clears the simulated degradation, updates component and aircraft health, writes a maintenance record, and moves the aircraft back to `Operational`, which changes fleet readiness on the Command Center.
5. **Keeps the operational thread visible** end-to-end, from sensor reading to aircraft availability, in a Digital Thread view.

### Operational benefit

The benefit the system is designed to demonstrate is a shift in *when* a decision is possible: from "the component has failed, what do we do" to "this component is at elevated risk with N days of useful life left, here is the part, the engineer and the slot — approve or defer, and the audit trail will record which". That is a workflow claim, not a measured outcome claim, and this repository does not contain evidence of realised availability improvement (see [How well it works](#how-well-it-works)).

| | Problem (what hurts) | Approach (what this repo does) | Operational benefit (what it aims to enable) |
|---|---|---|---|
| **Timing** | Maintenance planned on fixed intervals; failures found in service | Continuous model scoring per component per aircraft | Act while the component is still serviceable |
| **Prioritisation** | Risk lists are qualitative and hand-assembled | Ranked by failure probability and RUL, filtered by severity | Spend scarce engineering hours on the highest-consequence items |
| **Executability** | "Vibration is high" is not a work package | Recommendation carries part, technician, slot, est. hours, checklist | Fewer round trips between stores, roster and planning |
| **Traceability** | Reasoning is in the planner's head | Feature contributions, model version, audit log, digital thread | Decisions are reviewable after the fact |
| **Learning** | No feedback from outcome to model | Work-order completion writes a maintenance record and updates health | A basis for future outcome-based evaluation |

---

## See it working

The console is a single-page operations application (React 18 + TypeScript) with a persistent left navigation, a top system bar and a work area. It opens **directly on the Command Center** — there is no login step in this build.

### What the console looks like

Every screen below is implemented in `frontend/src/pages/` and is reachable from the sidebar.

| Area | Screen | Route | What the screen does |
|---|---|---|---|
| Command | **Overview** (Command Center) | `/app` | Fleet readiness KPIs, fleet status board grouped by base, active events by severity, 30-day availability history + projection, auto-generated system assessment. Contains the **Simulate Degradation AS-014** and **Readiness Report** actions. |
| Command | Fleet | `/app/fleet` | Registry table with sort/filter/search, per-base availability, health bars, primary risk component, minimum RUL, priority. Row click opens the aircraft workspace. |
| Command | Alerts | `/app/alerts` | Live alerts regenerated from predictions (severity ≥ 0.70) merged with stored alerts; filter by severity. |
| Aircraft | Aircraft workspace | `/app/aircraft/:id` | Three tabs: **Overview** (subsystem health matrix, operational/maintenance timeline, active predictions), **Telemetry** (per-channel charts with learned baseline, warning thresholds, anomaly markers, actual-vs-expected table), **Diagnostics** (predicted failure, feature contribution bars, RUL history/projection, anomaly table, recommended action). |
| Aircraft | Digital Twin | `/app/aircraft/:id/twin` | Interactive top-view engineering schematic with nine subsystem modes, component markers coloured by live state, pan/zoom, and a component inspection panel (health, latest readings, model output, active anomalies, recommended action). |
| Maintenance | Work Orders | `/app/work-orders` | Execution pipeline (`Detected → Approved → Scheduled → In Progress → Completed`), stage counts, work-order register, create form, per-order checklist, embedded **Schedule** section and **Recommended slots** from active predictions. |
| Maintenance | Inventory | `/app/inventory` | Spare-parts register with stock, minimum stock, demand, lead time, supplier and risk state; embedded **Spares Forecast** with projected coverage, reorder risk and stock trajectory from active predictions. |
| Maintenance | Predictions | `/app/predictions` | Fleet-wide component failures with P(fail), severity, RUL and window, confidence, anomaly score, vibration, temperature and recommendation; expandable row shows model reasoning. Probability and severity filters. |
| Maintenance | Recommendations | `/app/recommendations` | Model-proposed actions with parts, suggested technician, earliest slot, confidence and the basis for the recommendation; one click carries it into a pre-filled work-order form. |
| Maintenance | Anomalies | `/app/anomalies` | Detector output with deviation from the learned baseline and a four-part engineering explanation (*what / why / assessment / action*). |
| Maintenance | RUL analysis | `/app/rul` | Components ordered by urgency with expected range, degradation and a measured-history + projection curve. |
| Maintenance | Maintenance history | `/app/history` | Maintenance records across the fleet with MTTR and an MTBF proxy. |
| Maintenance | Technicians | `/app/technicians` | Workforce register: skill, availability, workload, active jobs. |
| Analytics | Analytics | `/app/analytics` | Availability history/projection, reactive vs predictive posture, reliability indicators, readiness report export. |
| Analytics | Failure analysis | `/app/failure-analysis` | Failure Pareto by component (counts + cumulative share), recorded fault modes, active anomalies by component. |
| Analytics | Simulation | `/app/whatif` | What-if scenario: capacity, technicians and delay inputs against the current fleet state. |
| Analytics | Model performance | `/app/models` | Model registry with recorded evaluation metrics, and a retraining control that re-fits the pipeline on synthetic data. |
| System | System | `/app/system` | Service status table, data-quality indicators, environment information, prototype stack overview. |
| System | Data sources | `/app/data-sources` | CSV ingestion with validation profile, plus the registers of what feeds the deployment and a downloadable sample CSV. |
| System | Digital thread | `/app/thread` | The 13-stage sensor-to-availability pipeline with the live prediction positioned in it. |
| System | Query console | `/app/copilot` (sidebar label: *Query Console*) | Read-only retrieval console over live application data (e.g. "Why is AS-014 high risk?"). It cannot issue operational commands. |
| System | Audit log | `/app/audit` | Chronological operator/system action trail: logins, work-order approvals, simulation events, training jobs, uploads. |

### Two-minute demo

The demo arc is built into the seeded dataset: **AS-014 / Hydraulic System** is the designated degraded aircraft, and the sidebar has a **SIMULATION CONTROL** cluster (*Live mode*, *Reset*, *Degrade AS-014*).

| # | Action | What you should see |
|---|---|---|
| 1 | Open the app | Land on the **Command Center** — fleet readiness, status board, active events, no login. |
| 2 | Press **Simulate Degradation AS-014** | The API injects a degradation level and immediately runs the full inference pipeline. |
| 3 | Open `AS-014` → **Diagnostics** | Vibration and temperature rise, anomaly score climbs, P(fail) rises, RUL shortens, feature-contribution bars appear, and a low-confidence badge appears when the model is unsure. |
| 4 | Open **Recommendations** | A row for AS-014 with required part (*Hydraulic Pump*), technician, slot, estimated hours and the stated basis. |
| 5 | Press **CREATE WO** | The work-order form opens pre-filled; submitting records engineer approval in the audit trail. |
| 6 | Advance the order in **Work Orders** | `Approved → Scheduled → In Progress → Completed`. |
| 7 | Return to **Command Center** / `AS-014` | On completion the aircraft's degradation state is cleared, component health and RUL recover, and its status returns to `Operational`. |
| 8 | Show **Digital Thread**, **Readiness Report** and the **Query Console** | The same aircraft traced from sensor data to availability, an exportable text report, and a natural-language query answered from live data. |

A recorded verification run of exactly this loop (with the numbers observed) is documented in [How well it works](#how-well-it-works).

### Screenshot slots

> [!NOTE]
> **This repository does not contain UI screenshots, and none have been fabricated for this README.** The gallery below is written as the screenshot structure, with the image embeds already positioned and commented out. Add the PNG files to `docs/screenshots/` using the names in the captions, then uncomment the corresponding `![...]` line. Capture instructions are in [`docs/screenshots/README.md`](docs/screenshots/README.md).

<details>
<summary><b>Command Center — fleet readiness, status board, active events</b> &nbsp;<code>docs/screenshots/01-command-center.png</code></summary>

Seven readiness KPIs across the top (readiness %, ready, in maintenance, warning, AOG/critical, predicted failures in 30 days, work-order backlog), a status board of every aircraft grouped by base with health bars and alert counts, a readiness distribution strip, an active-events list by severity, the 30-day availability history and projection, and an auto-generated system assessment.

<!-- Uncomment after adding the screenshot file:
![AeroSentinel Command Center showing fleet readiness KPIs, a per-base aircraft status board, active alerts and a readiness trend](docs/screenshots/01-command-center.png)
-->

</details>

<details>
<summary><b>Aircraft workspace — subsystem health matrix and timeline</b> &nbsp;<code>docs/screenshots/02-aircraft-workspace.png</code></summary>

The per-aircraft header (platform, base, squadron, status, health, risk, flight hours, next maintenance) above the three workspace tabs. The Overview tab shows the subsystem health matrix for all seven components with health state, RUL and failure probability, the operational/maintenance timeline built from maintenance records, and the active predictions table.

<!-- Uncomment after adding the screenshot file:
![Aircraft workspace overview showing the seven-component subsystem health matrix and the maintenance timeline](docs/screenshots/02-aircraft-workspace.png)
-->

</details>

<details>
<summary><b>Diagnostics — predicted failure, feature contributions, RUL</b> &nbsp;<code>docs/screenshots/03-diagnostics.png</code></summary>

The primary-risk component with probability, RUL and expected window, model confidence and anomaly score; the perturbation-based feature-contribution bars that explain the prediction; the RUL history and projection chart; the active-anomaly table; and the recommended action. This is the screen that demonstrates the "explain, don't just score" part of the design.

<!-- Uncomment after adding the screenshot file:
![Diagnostics tab showing predicted failure probability, feature contribution bars explaining the prediction, and the RUL projection chart](docs/screenshots/03-diagnostics.png)
-->

</details>

<details>
<summary><b>Digital Twin — interactive subsystem schematic</b> &nbsp;<code>docs/screenshots/04-digital-twin.png</code></summary>

The top-view schematic with subsystem-mode selector (Structure, Propulsion, Hydraulics, Electrical, Avionics, Fuel, Flight Controls, Landing Gear, Thermal), component markers coloured by live component state, station reference marks, controlled zoom/pan, and the component inspection panel opened alongside it.

<!-- Uncomment after adding the screenshot file:
![Digital twin schematic of the aircraft with subsystem modes, live-state component markers and the component inspection panel](docs/screenshots/04-digital-twin.png)
-->

</details>

<details>
<summary><b>Work Orders — execution pipeline and scheduling</b> &nbsp;<code>docs/screenshots/05-work-orders.png</code></summary>

Stage counts across the five work-order states, the work-order register with priority, technician, parts and scheduled date, the create form (with the AI recommendation carried in from the Recommendations screen), the per-order checklist, and the embedded schedule with recommended slots derived from active predictions.

<!-- Uncomment after adding the screenshot file:
![Work order execution pipeline with stage counts, the work order register and the embedded maintenance schedule](docs/screenshots/05-work-orders.png)
-->

</details>

<details>
<summary><b>Predictions and Recommendations — the decision queues</b> &nbsp;<code>docs/screenshots/06-predictions.png</code>, <code>docs/screenshots/07-recommendations.png</code></summary>

**Predictions** ranks every component in the fleet by failure probability with severity, RUL and window, confidence, anomaly score and the raw vibration/temperature values, and expands to show model reasoning. **Recommendations** turns the top of that queue into executable actions with parts, technician, slot, estimated hours and the stated basis, each carrying a one-click route into a pre-filled work order.

<!-- Uncomment after adding the screenshot files:
![Fleet-wide failure prediction table ranked by failure probability with severity, RUL and anomaly score](docs/screenshots/06-predictions.png)
![Maintenance recommendation queue with required parts, suggested technician, earliest slot and confidence](docs/screenshots/07-recommendations.png)
-->

</details>

<details>
<summary><b>Inventory and spares forecast</b> &nbsp;<code>docs/screenshots/08-inventory.png</code></summary>

The spare-parts register (stock, minimum stock, demand, lead time, supplier, risk state) with the embedded forecast showing predicted demand derived from the active prediction set, projected coverage, reorder recommendation and a six-month stock trajectory for the selected part.

<!-- Uncomment after adding the screenshot file:
![Spare parts register with stock levels, predicted demand, coverage and the stock trajectory chart](docs/screenshots/08-inventory.png)
-->

</details>

<details>
<summary><b>Analytics, failure Pareto and the digital thread</b> &nbsp;<code>docs/screenshots/09-analytics.png</code>, <code>docs/screenshots/10-digital-thread.png</code></summary>

**Analytics** shows availability history and projection, reactive vs predictive posture (both computed from database records and both labelled as simulated projection), MTTR and the MTBF proxy. **Failure analysis** shows the Pareto of predicted failures by component with cumulative share. **Digital thread** lays out the 13 pipeline stages from sensor data to aircraft availability with the current prediction positioned inside it.

<!-- Uncomment after adding the screenshot files:
![Fleet analytics with availability history and projection, reactive vs predictive posture and reliability indicators](docs/screenshots/09-analytics.png)
![Digital thread view listing the thirteen pipeline stages from sensor data to aircraft availability](docs/screenshots/10-digital-thread.png)
-->

</details>

<details>
<summary><b>System area — status, data sources, model registry, audit log</b> &nbsp;<code>docs/screenshots/11-system.png</code>, <code>docs/screenshots/12-model-performance.png</code></summary>

Service status for API, database, ML service, data ingestion and model service; telemetry data-quality indicators; environment information; the prototype stack summary; the CSV ingestion panel with its validation profile; the model registry with recorded (synthetic) evaluation metrics; and the audit trail of operator and system actions.

<!-- Uncomment after adding the screenshot files:
![System status page with service status table, data quality metrics and environment information](docs/screenshots/11-system.png)
![Model performance screen listing the registered model versions and their demo evaluation metrics](docs/screenshots/12-model-performance.png)
-->

</details>

---

## Feature overview

Only features that exist in the current code are listed.

| Category | Capability | Where |
|---|---|---|
| **Fleet command** | Fleet readiness, availability %, status distribution, MTTR, predicted 30-day failures, work-order backlog | `/api/dashboard`, `/api/fleet` |
| | Per-base grouping, aircraft status board, readiness distribution strip, auto-generated system assessment | Command Center |
| | Alert center merging alert rows stored in the database with alerts derived live from predictions ≥ 0.70 | `/api/alerts` |
| | Downloadable plain-text readiness report | `/api/report` |
| **Aircraft intelligence** | Per-aircraft workspace: health matrix, maintenance timeline, active predictions | `/api/aircraft/{id}` |
| | Telemetry workspace: per-channel charts with learned baseline, warning thresholds, anomaly markers, and an actual-vs-expected table | `/api/aircraft/{id}/telemetry` |
| | Diagnostics: predicted failure, feature contributions, RUL history/projection, active anomalies, recommended action | `/api/rul`, `/api/anomalies` |
| **Digital twin** | Interactive schematic with nine subsystem modes and derived modes (Structure = airframe index, Flight Controls = hydraulics + electrical) | `/app/aircraft/:id/twin` |
| | Component inspection: health, latest sensor readings with deviation vs baseline, model output, active anomalies, recommended action | `components/DigitalTwin.tsx` |
| **Predictive maintenance** | Component failure probability with severity banding, RUL estimate with expected range, and model confidence for every component | `/api/predictions` |
| | Anomaly detection with deviation from the learned vibration baseline and a four-part engineering explanation | `/api/anomalies` |
| | RUL workspace with urgency ordering, degradation percentage and a measured-history + projection curve | `/api/rul` |
| | Ad-hoc single-vector scoring for external telemetry | `POST /api/predict` |
| **Failure analysis** | Failure Pareto by component with cumulative share; recorded fault modes from maintenance history; active anomalies by component | `/api/analytics` (screen `/app/failure-analysis`) |
| | Reactive vs predictive posture computed from database records (labelled simulated) | `/api/analytics` |
| **Maintenance operations** | Work-order lifecycle with five states, stage counts, checklists and audit-logged transitions | `/api/work-orders`, `/api/work-orders/{id}/status` |
| | Recommendation queue → pre-filled work-order creation (human approval required before the order exists) | `/api/recommendations` |
| | Scheduling view of open orders plus recommended slots from active predictions | `/api/schedule` |
| | Maintenance history with MTTR and an MTBF proxy | `/api/maintenance` |
| **Spares and workforce** | Parts register with risk state derived from stock vs minimum stock | `/api/inventory` |
| | Spares demand forecast from the active prediction set, with projected coverage and reorder recommendation | `/api/inventory/forecast` |
| | Technician register: skill, availability, workload, active jobs | `/api/resources` |
| **Analytics and simulation** | Availability history and projection, reliability indicators | `/api/fleet`, `/api/analytics` |
| | What-if scenario (capacity, technicians, delay) against the current fleet state | `POST /api/whatif` |
| | Degradation injection, reset and state for the demo scenario | `/api/simulate/*` |
| **Data and system** | CSV ingestion with row/column/missing-value profile (validated and profiled, not persisted) | `POST /api/data/upload` |
| | Sample telemetry CSV download | `/api/data/sample` |
| | Telemetry data-quality indicators computed from the readings table | `/api/data-quality` |
| | Service status, model registry, in-process retraining, digital thread, read-only query console, audit log | `/api/system-health`, `/api/models`, `/api/models/train`, `/api/digital-thread`, `/api/copilot`, `/api/audit` |
| | Health and readiness probes | `/health`, `/ready` |

---

## How it works

### System architecture

The backend is a **single FastAPI process** — API routes, the SQLAlchemy data layer and the ML pipeline all live in one module, `backend/app/main.py`. There is no message queue, no separate model-serving service and no cache tier; the only external dependency is the database, which defaults to SQLite on disk and switches to PostgreSQL purely through the `DATABASE_URL` environment variable.

```mermaid
flowchart LR
    subgraph Client["Operator browser"]
        UI["React 18 operations console<br/>TypeScript · Vite · Tailwind CSS · Recharts"]
    end

    subgraph Service["backend/app/main.py — one FastAPI process"]
        API["REST API<br/>39 paths · 40 operations"]
        ML["ML pipeline (in memory)<br/>RandomForestClassifier · RandomForestRegressor · IsolationForest"]
        SIM["Simulation state (RAM)<br/>DEGRADE: aircraft level component level"]
    end

    DB[("SQLAlchemy 2.0<br/>SQLite aerosentinel.db<br/>or PostgreSQL via DATABASE_URL")]

    UI -->|"fetch /api/* same-origin, X-Role header"| API
    API --> ML
    API --> SIM
    API -->|"ORM queries and writes"| DB
    ML -->|"probabilities, RUL, anomaly scores"| API
```

**Why this shape:** a hackathon-scale prototype optimises for one command to run and one artefact to inspect. A single process means the ML pipeline is guaranteed to be the one answering the API, and the whole decision path is readable in one file. The cost of that choice is documented in [Limitations](#limitations) — model state and simulation state are per-process and in memory.

### Frontend and backend interaction

```mermaid
sequenceDiagram
    autonumber
    participant O as Operator
    participant C as React console
    participant A as FastAPI
    participant D as Database

    O->>C: open /app/aircraft/AS-014/diagnostics
    C->>A: GET /api/aircraft/AS-014
    A->>D: components + maintenance records
    A->>A: per component: latest telemetry + infer_all()
    A->>D: write back health, RUL, failure probability
    A-->>C: aircraft detail + components
    C->>A: GET /api/aircraft/AS-014/predictions
    A-->>C: ranked predictions with explanations
    C->>A: GET /api/anomalies + GET /api/rul
    A-->>C: anomaly events + RUL curves for this aircraft
    C-->>O: health matrix, diagnostics panels, RUL chart
```

Three practical details that shape how the app is built:

1. **Same-origin by default.** `frontend/src/services/api.ts` resolves the API base to `VITE_API_URL` if set, otherwise to the empty string, so the browser talks to its own origin. In development the Vite server proxies `/api`, `/health` and `/ready` to `BACKEND_URL` (default `http://localhost:8000`); in the Docker image nginx does the proxying; on Render the static site calls the backend directly using `VITE_API_URL`. This is why the frontend never contains a hard-coded backend host.
2. **All calls go through one module.** Every page imports `get`/`post` from `services/api.ts`, which attaches `Content-Type: application/json` and `X-Role: command`. The backend reads that header in `actor()` and stamps it onto audit-log entries. Authentication is disabled in this build, so the header is not a security control.
3. **Refresh is context-driven.** `SystemContext` owns a `refreshKey` that pages depend on; simulation actions, "Live mode" (8-second polling) and completed work orders bump it, which re-fetches every affected page. The top system bar polls `/api/system-health`, `/api/models` and `/api/simulate/state` every 30 seconds for the status, model-version and data-mode indicators.

### Data model

Thirteen SQLAlchemy tables, created automatically on first run (`Base.metadata.create_all`):

| Table | Purpose | Notable fields |
|---|---|---|
| `aircraft` | Fleet register | `aircraft_id` (e.g. `AS-014`), platform, base, squadron, status, `health_score`, `risk_score`, flight hours/cycles, last/next maintenance, availability status |
| `aircraft_components` | Seven subsystems per aircraft | name, `health_score`, `rul_days`, `failure_prob`, operating hours, cycles, maintenance count, last inspection |
| `sensor_readings` | Telemetry | timestamp, temperature, pressure, vibration, rpm, voltage, fuel flow, anomaly score |
| `maintenance_records` | Maintenance history and outcomes | type (Scheduled/Unscheduled/Inspection/Overhaul), component, fault, action, technician, downtime hours, result |
| `work_orders` | Executable maintenance | `wo_id`, aircraft, component, issue, priority, technician, parts (JSON), est. hours, scheduled, status, AI recommendation, checklist (JSON) |
| `predictions` | Prediction store | failure probability, RUL, confidence, window, severity, model version, explanation — **defined and read, but predictions are computed on the fly and not written here** (see [Limitations](#limitations)) |
| `anomalies` | Anomaly store | sensor, value, expected, deviation, score, severity, explanation — defined; anomaly events are currently derived from live inference |
| `spare_parts` | Stores | `part_id`, name, category, stock, minimum stock, demand, lead days, supplier |
| `technicians` | Workforce | name, skill, availability, workload, active jobs |
| `alerts` | Alert feed | severity, type, aircraft, component, message, recommended action, status |
| `model_versions` | Model registry | name, version, purpose, stored metrics (JSON), status, trained-at |
| `audit_logs` | Audit trail | actor, action, detail, timestamp |
| `ai_recommendations` | Approved recommendation record | aircraft, component, recommendation, reason, priority, parts, est. hours, confidence, review status |

Relationship model: aircraft ↔ components ↔ telemetry and records are joined by `aircraft_id` (string), and components are keyed by `(aircraft_id, name)` — there is no database-level foreign-key enforcement or unique constraint on components, which keeps the synthetic seeder simple at the cost of strict integrity.

### Predictive maintenance pipeline

This is the operational path the repository actually implements, drawn from `backend/app/main.py`. Stages that are not implemented (for example, real sensor ingest, model drift monitoring, or post-maintenance validation of the model's own accuracy) are not shown.

```mermaid
flowchart TD
    A["Synthetic telemetry<br/>sensor_readings rows"] --> B["current_telemetry()<br/>latest reading + active degradation offset"]
    B --> C["featurize() — 10-element feature vector"]
    C --> D["Failure classifier<br/>P(fail)"]
    C --> E["RUL regressor<br/>days of useful life"]
    C --> F["IsolationForest<br/>anomaly score"]
    D --> G["Threshold rule boost<br/>vibration above 5.0 mm/s, temperature above 100 C"]
    G --> H["Severity band + heuristic confidence"]
    H --> I["Perturbation explanation<br/>top contributing features"]
    I --> J["/api/predictions · /api/anomalies · /api/rul"]
    J --> K["/api/recommendations<br/>action + part + technician + slot"]
    K --> L["Engineer approves in the console<br/>work_orders row created · audit entry written"]
    L --> M["Status transitions to Completed"]
    M --> N["Degradation cleared · component and aircraft<br/>health, RUL and failure probability updated<br/>maintenance record written"]
    N --> O["Fleet readiness recomputed in /api/dashboard"]
```

Two implementation details worth knowing before reading the code:

* **Scoring is live, not stored.** `/api/predictions` recomputes every component in the fleet from current telemetry and caches the result for 60 seconds, keyed by the simulation state. `/api/aircraft/{id}` recomputes that aircraft's components and writes the updated health, RUL and failure probability back to the `aircraft_components` rows.
* **The fleet list is a cached view.** `/api/aircraft` reports the stored component values (and the seeded risk score) rather than re-running inference, so an aircraft's listed risk reflects its last detail-endpoint visit until it is recomputed. This keeps list endpoints fast and is a deliberate prototype trade-off.

### Work-order lifecycle

```mermaid
stateDiagram-v2
    direction LR
    state "In Progress" as InProgress
    [*] --> Detected
    Detected --> Approved
    Approved --> Scheduled
    Scheduled --> InProgress
    InProgress --> Completed
    Completed --> [*]
    note right of Completed
        Completing an order clears the aircraft's
        degradation state, raises component health,
        cuts failure probability, extends RUL,
        writes a maintenance record, and returns
        the aircraft to Operational.
    end note
```

Implemented consequences of transition (from `POST /api/work-orders/{woid}/status`):

| Transition | Effect on the data |
|---|---|
| Any status change | `audit_logs` row written (`work_order_<status>`), attributed to the `X-Role` actor |
| Work order created | Status starts at `Approved`; a five-item JSON checklist is attached; an `ai_recommendations` row is written with `review_status = Approved` |
| Work order `Completed` | Aircraft's degradation state removed; each component health `+25` (capped at 96), failure probability × 0.25, RUL `+25` days, maintenance count incremented, last inspection set to now; aircraft health `+18` (capped at 97), risk `-30`, status `Operational`, next maintenance `+30` days; a `maintenance_records` row is appended |

> [!NOTE]
> The stage list in the UI includes `Detected`, and the API enforces forward-only transitions, but `POST /api/work-orders` creates every new order directly in `Approved`. Detection is represented by the prediction and recommendation queues upstream of the work order, not by a `Detected` row.

### Digital thread

`/api/digital-thread` returns the thirteen-stage path the system models. Most stages map directly onto code paths in this repository — sensor reads, anomaly detection, failure prediction, RUL estimation, explanation, recommendation, spare-part check, technician assignment, work order, maintenance and the resulting availability — while **Data Validation** and **Post-Maintenance Validation** are represented indirectly (by the data-quality indicators computed in `/api/data-quality`, the CSV ingestion profile, and the post-completion health update) rather than by dedicated validation stages:

`Sensor Data → Data Validation → Anomaly Detection → Failure Prediction → RUL Estimation → AI Explanation → Maintenance Recommendation → Spare-Part Check → Technician Assignment → Work Order → Maintenance → Post-Maintenance Validation → Aircraft Availability`

The Digital Thread screen renders these stages and positions the currently selected aircraft's live prediction inside them, with direct actions to open diagnostics or create a work order.

---

## The AI and ML system

All three models are scikit-learn estimators trained **in-process at application import** on a synthetic dataset generated by a fixed-seed NumPy generator. There is no training script to run, no model artefact to download, and no external inference service.

| Model | Algorithm | Task | Output used by the app |
|---|---|---|---|
| Failure Prediction v1.4 | `RandomForestClassifier` — 60 trees, max depth 10, `random_state=42` | Binary failure within a horizon | `P(fail)` per component → severity band, alerts, recommendations, work orders |
| RUL Estimation v2.1 | `RandomForestRegressor` — 60 trees, max depth 10, `random_state=42` | Days of remaining useful life | RUL estimate, expected range, degradation curve, urgency ordering |
| Anomaly Detection v1.1 | `IsolationForest` — `contamination=0.06`, `random_state=42` | Unsupervised deviation from normal operation | Anomaly score and anomaly events; digital-twin markers are coloured by live component health state |

### Feature set

Ten features, assembled per component by `featurize()`:

| # | Feature | Source | Notes |
|---|---|---|---|
| 0 | Temperature | latest sensor reading (+ degradation offset) | °C |
| 1 | Vibration | latest sensor reading (+ degradation offset) | RMS, mm/s |
| 2 | Pressure | latest sensor reading (+ degradation offset) | PSI |
| 3 | Shaft speed | fixed at 12 000 rpm in the inference paths | the seeder writes rpm to readings; inference currently passes a constant |
| 4 | Operating hours | component row | cumulative hours |
| 5 | Cycles | component row | cumulative cycles |
| 6 | Maintenance age | days since last intervention | clipped to ≤ 90 in `infer_all()` |
| 7 | Previous failures | maintenance count | clipped to ≤ 2 so frequent routine servicing cannot auto-flag a component as critical |
| 8 | Vibration trend | rolling-window slope | available via `app/ml/feature_engineering.trend()`; inference passes 0.0 in the current paths |
| 9 | Temperature trend | rolling-window slope | as above |

Feature-engineering helpers live in `backend/app/ml/feature_engineering.py` (rolling mean, linear trend, relative deviation) and are exposed through `backend/app/ml/pipeline.py`. The serving paths in `app/main.py` currently supply trend features as constants, so the models rely principally on features 0–7.

### Training pipeline

```mermaid
flowchart LR
    G["Synthetic generator<br/>numpy default_rng(42) · n = 4000"] --> X["10-feature matrix X"]
    G --> Y1["Label y: Bernoulli of logistic(logit)"]
    G --> Y2["RUL target: clipped linear function + noise"]
    X --> C1["RandomForestClassifier"]
    X --> C2["RandomForestRegressor"]
    X --> C3["IsolationForest"]
    Y1 --> C1
    Y2 --> C2
    C1 --> R["In-memory model registry (ML dict)"]
    C2 --> R
    C3 --> R
    R --> S["Baseline constants<br/>temp 85 · vib 3.2 · press 3000 · rpm 12000"]
```

The ground truth is generated from explicit formulas in `train_ml_models()`, which is important for interpreting everything downstream:

* **Failure label** — the probability of failure is a logistic function of deviation from nominal values, maintenance age, previous failures, positive vibration/temperature trends, pressure deviation, hours and cycles (`logit = -4.0 + 0.09·(temp-85) + 1.1·(vib-3.2) + 0.02·(maint_age-30) + 0.6·prev_fail + 1.6·max(vib_trend,0)·4 + 1.2·max(temp_trend,0)·4 + |press-3000|/600 + hrs/5000 + cycles/2000`); the label is then drawn as a Bernoulli sample of that probability.
* **RUL target** — `90 - 8·vib - 0.25·maint_age - 0.008·hrs - 12·max(vib_trend,0)·10 - 8·max(temp_trend,0)·10 - 8·prev_fail + N(0,6)`, clipped to 1–120 days.
* **Anomaly detector** — fitted unsupervised on the same feature matrix; there is no labelled anomaly set.

**Read the consequence plainly:** the classifier learns *the generator's formula*, not physical failure behaviour. Its synthetic F1 is therefore a measure of how well the model reproduces a designed relationship, not evidence that it would detect real failures. This is the single most important caveat in the repository, and it is why every metric in this README is labelled *demo evaluation on synthetic data*.

### Inference pipeline

```mermaid
flowchart TD
    T["Latest telemetry for the component"] --> D{"Degradation active for this aircraft?"}
    D -->|yes| O["Add offset: vibration + 5.2x level,<br/>temperature + 26x level, pressure noise"]
    D -->|no| P["Use reading as-is"]
    O --> F["infer_all() — clipped features"]
    P --> F
    F --> C["Classifier → P(fail)"]
    F --> R["Regressor → RUL days"]
    F --> A["IsolationForest → raw anomaly score"]
    A --> N["Normalise: logistic((score - 0.55) x 12)"]
    N --> B["Rule boost: vibration above 5.0 or temperature above 100<br/>raises the anomaly score to at least 0.55"]
    C --> S["Severity band: Critical at or above 0.75, High at or above 0.55,<br/>Medium at or above 0.35, otherwise Low"]
    C --> K["Confidence heuristic"]
    B --> K
    S --> OUT["Prediction payload"]
    K --> OUT
    C --> E["Perturbation explanation"]
    E --> OUT
```

Everything the UI shows comes from that payload: failure probability, RUL, RUL window (`0.75×RUL` to `1.25×RUL`), confidence, severity, anomaly score, per-feature contributions, a recommended action string, and a `low_confidence` flag that is true below 0.65.

### Explainability and confidence

* **Explanations are perturbation-based, not SHAP.** For each prediction the classifier is re-run with individual features scaled up (vibration and temperature and cycle-related features by 10 %, pressure with an added offset), the increase in probability is measured, and the positive deltas are normalised to percentages across five named drivers: *Vibration increase, Temperature increase, Operating cycles, Pressure instability, Maintenance age*. Fleet-wide scoring batches these perturbations (five extra matrix passes rather than five per component).
* **Confidence is a heuristic, not a calibrated probability.** It is computed as `clamp(0.55 … 0.97)` from `0.9 − |P(fail) − 0.5| × 0.15` with a small bonus when the anomaly score exceeds 0.5. It expresses distance from the decision boundary, not statistical certainty, and the UI surfaces a low-confidence tag rather than hiding it.
* **RUL uncertainty is a fixed band.** The reported range is `±25 %` of the point estimate, labelled in the interface as the model's expected range rather than a measured confidence interval.
* **Human-in-the-loop is structural.** Recommendations never create work; an engineer submits the work-order form, which writes an `ai_recommendations` row with `review_status = Approved` and an audit entry. The `/api/predict` response carries the advisory string verbatim.

### Model persistence

| Aspect | Current behaviour |
|---|---|
| Persistence | **None.** Models live in the `ML` dictionary in process memory. `MODEL_PATH` exists in `.env.example` but is not read by any code, and `joblib` is a declared dependency without a current use. |
| Training trigger | `train_ml_models()` runs at import, so every process start re-trains on the synthetic dataset (a small, sub-second cost at this size). |
| Registry | `model_versions` rows record name, version, purpose, metric JSON and status. The seeded rows carry hand-written demo metrics; `POST /api/models/train` inserts a row with a fixed F1 of 0.85 — **no validation split is computed**, so treat those numbers as labels, not measurements. |
| Drift / versioning | Not implemented. There is no comparison between versions and no promotion logic. |

### What is real, what is simulated

| Component | Status |
|---|---|
| scikit-learn training and inference (three estimators) | **Real code, real fit/predict calls** — on synthetic data |
| Feature vector, threshold rule boost, severity bands | **Implemented**, deterministic given inputs |
| Perturbation explanations | **Implemented** (approximate, not SHAP-exact) |
| Confidence and RUL range | **Heuristic formulas**, not calibrated statistics |
| Telemetry, maintenance history, parts, technicians, alerts | **Synthetic**, generated by the seeder with a fixed seed |
| Degradation injection (`/api/simulate/degrade`) | **Scripted scenario** — an offset added to the latest reading; it does not simulate physics |
| Technician and slot assignment in recommendations | **Heuristic** — the first technician with availability > 0.5, slot = today + 3 days; it does not skill-match to the failing component |
| Part mapping | **Static lookup table** (`PART_MAP`) from component name to a single part number |
| Recommendations text | **Rule-based** templates keyed on probability bands, not generated prose |
| Model registry metrics | **Seeded / hard-coded demo labels** |
| CSV ingestion | **Real parsing and profiling** (rows, columns, missing values) — the file is validated and profiled but not written into the operational tables |
| What-if simulation | **Formula-based projection** over the current dashboard values, labelled as simulated in the API response and the UI |
| Priority scoring helper (`pipeline.priority_score`) | **Present but unused** by the serving paths |

---

## How well it works

### What was verified, and how

The checks below were run against the current commit in a clean Linux environment with the seeded synthetic dataset. They are verification of the *software*, not evaluation of the *models*.

| Check | How it was run | Result |
|---|---|---|
| Backend test suite | `cd backend && pytest -q` | **2 passed** (`backend/tests/test_api.py`: dashboard shape and `POST /api/predict` producing P(fail) > 0.3 for a hot, high-vibration input) |
| Frontend type-check + production build | `cd frontend && npm run build` (`tsc -b && vite build`) | **Succeeded** — no TypeScript errors; 775 kB JS (216 kB gzip) and 42 kB CSS; build warning only about chunk size |
| Endpoint sweep | 24 requests across every route group | **24 / 24 HTTP 200** |
| OpenAPI document | `GET /openapi.json` | Serves `AeroSentinel API 1.0.0`, 39 paths, 40 operations |
| Simulation → prediction loop | `POST /api/simulate/degrade` for AS-014 / Hydraulic System at levels 0.2, 0.4, 0.6, 0.8 | Vibration 4.43 → 5.47 → 6.51 → 7.55 mm/s, temperature 79.2 → 94.8 °C, P(fail) 0.507 → 0.778 → 0.816 → 0.831, anomaly score 0.18 → 0.86; RUL moved 5.4 → 5.0 → 5.1 → 6.0 days |
| Detection → work order → recovery loop | Create a work order for AS-014, then advance `Scheduled → In Progress → Completed` | Aircraft health **82.1 → 87.4**, risk **80.8 → 19.6**, status **Critical → Operational**; degradation state cleared; maintenance record appended |
| Data-quality computation | `GET /api/data-quality` on 738 seeded readings | Telemetry completeness 100 %, record completeness 100 %, overall score 70.0 — but `sensor_reliability` reports 0.0 % (see known defects) |
| Reproducibility | Re-run the seeder after deleting the SQLite file | The seed uses `random.Random(26249)` and `numpy.random.default_rng(42)`; fleet composition and component values are stable across runs, while a few response paths use unseeded randomness (`random.uniform` in the availability trend, RUL curve history, and degradation telemetry jitter) |

### Model evaluation recorded in the repository

These are the values stored in the seeded `model_versions` rows and rendered on the **Model Performance** screen. They are demo evaluations on synthetic data — the interface labels them as such, and no held-out evaluation run exists in the repository.

| Model | Version | Metric | Value |
|---|---|---|---|
| Failure Prediction | v1.4 | F1 | 0.89 |
| | | Precision | 0.87 |
| | | Recall | 0.91 |
| RUL Estimation | v2.1 | MAE | 12.4 hours |
| | | RMSE | 18.9 hours |
| Anomaly Detection | v1.1 | Contamination | 0.06 |
| User-triggered retrain | `v1.x-demo` | F1 | 0.85 (fixed value written by the endpoint — not computed) |

### What does not exist yet

To be unambiguous about the state of evaluation:

* **No real-world evaluation.** There is no operational dataset, no recorded failure, no labelled outcome and no ground truth from a real fleet anywhere in this repository.
* **No held-out model validation.** No train/test split, no cross-validation, no confusion matrix, no ROC-AUC, no precision-recall curve, no residual analysis, and no calibration check. Accuracy is deliberately not quoted anywhere in this README because it is not measured.
* **No RUL benchmark.** MAE/RMSE in the registry were not produced by an evaluation script; they are seeded values.
* **No load, latency or soak testing.** No throughput figures, no memory profile, no concurrency testing.
* **No frontend test suite.** `npm test` in `frontend/package.json` is a stub that echoes `ok`; the React application is covered only by the TypeScript compiler and the production build.
* **Known defects surfaced during this verification** — every item below was reproduced, and each is contained in a non-critical path:

| # | Symptom | Cause | Effect |
|---|---|---|---|
| 1 | `GET /health` always returns `"status": "degraded"` with `"simulation": "seeding"` | The data check references `app.Aircraft` on the FastAPI application object, which raises `AttributeError` and is swallowed as "no data" | Render health checks configured against `/health` would see a degraded status even when the system is serving normally |
| 2 | `GET /ready` always returns `"status": "not_ready"` | `conn.execute("SELECT 1")` is not wrapped in `sqlalchemy.text()` (required in SQLAlchemy 2.0), and the readiness check additionally requires `ML["trained"]`, a key that is never set | Readiness can never pass, regardless of actual state |
| 3 | Data-quality `sensor_reliability` is 0.0 % | The range filter validates `temperature` between 800 and 3500 — a pressure range applied to the wrong column | Drags the weighted quality score down to 70 % on an otherwise clean dataset |
| 4 | Feature contributions can read 0.0 % for several drivers (visible on `/api/recommendations` "basis" text and the query console) | The perturbation is measured only in the positive direction (`max(0, p2 - p_base)`), so features that are already dominant or that reduce probability contribute nothing | Explanations can under-report the true drivers of a prediction |
| 5 | `POST /api/simulate/degrade` and `GET /api/aircraft/{aid}` disagree on RUL and P(fail) for the same component | They build the feature vector from different inputs: the simulation endpoint hard-codes hours 2500 / cycles 700 / maintenance age 60, the detail endpoint uses the stored component values | Two screens can show two different numbers for one component in the same instant |
| 6 | `predictive_avail` in `/api/analytics` evaluates near 100 % | It counts rows in the `predictions` table, which is never written to | The reactive-vs-predictive comparison is currently bounded by that; the UI already labels it a simulated scenario |
| 7 | MTBF shown in analytics is always 240 h | It is a literal constant (`"mtbf": 240`) alongside a genuinely computed MTTR | Reliability indicators are half-computed |
| 8 | RUL is not monotonic under increased degradation | The regressor was fitted on the synthetic RUL target, which is not monotonic in every feature | RUL can edge upward between two successive degradation steps |

### What rigorous validation would require

1. **Data with outcomes.** Historic telemetry joined to confirmed failure and removal events, with the component serial and the failure mode, from at least one real platform type.
2. **Honest splits.** Time-based splits (train on earlier data, test on later data) rather than random splits, so that leakage from the future is excluded.
3. **Metrics suited to the task.** Precision/recall at the operating threshold the maintenance workflow would actually use, ROC-AUC and PR-AUC, lead-time distributions ("how many days before failure is the alert raised"), and false-alarm cost per aircraft-year — plus RUL error as a function of prediction horizon.
4. **Calibration.** Reliability diagrams and expected calibration error for `P(fail)`, and interval coverage for the RUL band, replacing the current heuristic confidence.
5. **An ablation and a baseline.** Comparison against simple thresholds and against the existing scheduled-maintenance policy, so the benefit can be attributed.
6. **Closed-loop feedback.** Persisting predictions with their eventual outcome (the `work_orders` → `maintenance_records` path already provides the hook) so the model can be evaluated on decisions, not only on scores.
7. **Safety review.** Any change from advisory to authoritative output would require airworthiness process, not just better metrics.

---

## Typical operator workflow

The workflow below is the one the implementation supports end to end; every step maps to a screen and an API route in this repository.

```mermaid
flowchart TD
    A["1. Command Center<br/>review fleet readiness and active events"] --> B["2. Identify an aircraft at risk<br/>from the status board or the prediction queue"]
    B --> C["3. Open the aircraft workspace<br/>health matrix and maintenance timeline"]
    C --> D["4. Inspect telemetry<br/>baseline, thresholds, anomaly markers"]
    D --> E["5. Investigate the anomaly<br/>what, why, assessment, recommended action"]
    E --> F["6. Review the predicted failure<br/>probability, window, severity"]
    F --> G["7. Examine RUL<br/>point estimate, expected range, projection"]
    G --> H["8. Review the recommendation<br/>action, part, technician, slot, confidence, basis"]
    H --> I["9. Check parts and workforce<br/>stock, lead time, technician availability"]
    I --> J["10. Approve and create the work order<br/>engineer approval recorded in the audit log"]
    J --> K["11. Schedule<br/>planned date and assigned technician"]
    K --> L["12. Execute and track<br/>checklist, In Progress, Completed"]
    L --> M["13. Observe recovery<br/>health and RUL recover, aircraft returns to Operational"]
    M --> A
```

Alternative entry points supported by the same code: the **Digital Twin** (open the schematic, select a subsystem, inspect the component and its live readings), the **Query Console** (ask a question in natural language and get an answer computed from live data), and the **Model Performance** screen (inspect registered versions and retrain on the synthetic dataset).

---

## Quick start

### Prerequisites

| Requirement | Version used by this repository | Notes |
|---|---|---|
| Python | **3.11** | `backend/Dockerfile` uses `python:3.11-slim`; `render.yaml` pins `PYTHON_VERSION=3.11.9` |
| Node.js + npm | **Node 20** | `frontend/Dockerfile` uses `node:20`; Vite 6 requires Node 18 or newer |
| Docker + Compose | Docker Engine 20+ with Compose v2 | Only for [Option B](#option-b--docker-compose) |
| Database | None required locally | Defaults to SQLite (`aerosentinel.db`, created next to the backend) and seeds itself on first run. PostgreSQL is used by the Compose stack (pinned to `postgres:16`) and by the Render blueprint (managed instance, version chosen by the platform). |

> [!TIP]
> **Fastest path:** `docker compose up`, then open `http://localhost:5173`. Local development with hot reload is [Option A](#option-a--local-development). Either way, the database seeds itself — 24 aircraft with 7 components each, technicians, spare parts, ~30 days of telemetry per aircraft (48 hours for `AS-014`), maintenance history, model registry rows and an initial alert set.

### Option A — local development

Two terminals. The Vite dev server proxies `/api`, `/health` and `/ready` to the backend, so the browser stays same-origin and no CORS configuration is needed.

**Terminal 1 — backend**

```bash
git clone https://github.com/Harithdn/SIH249-Main.git
cd SIH249-Main/backend

python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

* API: `http://localhost:8000`
* Interactive API documentation (Swagger UI): `http://localhost:8000/docs`
* Alternative documentation (ReDoc): `http://localhost:8000/redoc`
* OpenAPI document: `http://localhost:8000/openapi.json`
* Health probes: `http://localhost:8000/health`, `http://localhost:8000/ready`

**Terminal 2 — frontend**

```bash
cd SIH249-Main/frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The console opens directly on the Command Center.

**Optional environment files.** Both `.env.example` files document the variables each side understands, and the two sides load them differently:

```bash
cp backend/.env.example backend/.env       # DATABASE_URL, JWT_SECRET, FRONTEND_URL, …
cp frontend/.env.example frontend/.env     # VITE_API_URL (leave unset for the dev proxy)
```

* The **frontend** loads `frontend/.env` automatically (Vite) — only `VITE_`-prefixed variables reach the browser.
* The **backend** reads plain process environment variables (`os.getenv`); it does **not** load `.env` files by itself. Either export the variables in your shell, or start Uvicorn with the file — `uvicorn[standard]` already installs `python-dotenv` for exactly this:

  ```bash
  uvicorn app.main:app --reload --port 8000 --env-file .env
  ```

  In Docker and on Render the variables are injected by the platform, so no `.env` file is needed there.

**Point the frontend at a different backend** (for example a deployed API) by setting `VITE_API_URL` before starting or building the frontend, and by setting `BACKEND_URL` to change the dev proxy target.

**Run the backend tests**

```bash
cd SIH249-Main/backend
pytest
```

### Option B — Docker Compose

The Compose stack runs three services: `postgres` (PostgreSQL 16 with a named volume), `backend` (the FastAPI image) and `frontend` (a multi-stage build that compiles the React app and serves it with nginx, which also proxies `/api`, `/health` and `/ready` to the backend container).

```bash
git clone https://github.com/Harithdn/SIH249-Main.git
cd SIH249-Main

docker compose up --build
```

| URL | Service |
|---|---|
| `http://localhost:5173` | React console (served by nginx) |
| `http://localhost:8000` | FastAPI directly |
| `http://localhost:8000/docs` | API documentation |
| `localhost:5432` | PostgreSQL (`aero` / `aero` / `aerosentinel` — demo credentials) |

Shut down with `docker compose down`; delete the database volume with `docker compose down -v`.

> [!WARNING]
> The Compose file contains **demo credentials** (`POSTGRES_PASSWORD: aero`, `JWT_SECRET: demo-secret-change-me`) intended only for a local sandbox. Change them before exposing the stack to anything.

### Verifying the installation

| Check | Expected |
|---|---|
| `curl http://localhost:8000/health` | JSON with service/version/database/ML fields (see the known-defect note in [How well it works](#how-well-it-works) about the `status` value) |
| `curl http://localhost:8000/api/dashboard` | `fleet_size: 24` on a fresh database |
| Open `http://localhost:5173` | Command Center loads with fleet readiness KPIs and the aircraft status board |
| Press **Degrade AS-014**, then open `AS-014 → Diagnostics` | Vibration, temperature, P(fail) and anomaly score all rise; feature-contribution bars appear |

---

## Environment variables

Derived from `backend/app/main.py`, `backend/app/database.py`, `frontend/src/services/api.ts`, `frontend/vite.config.ts`, `render.yaml`, `docker-compose.yml` and the three `.env.example` files. Values shown are placeholders, never copy a real secret into this file.

Loading behaviour: the backend reads **process environment variables only** (`os.getenv`, no implicit `.env` loading — use `uvicorn --env-file` locally); the frontend resolves `VITE_API_URL` at **build time** through Vite (so changing it requires a rebuild); `BACKEND_URL` affects only the Vite dev/preview proxy.

| Variable | Side | Required | Purpose | Read by | Example |
|---|---|---|---|---|---|
| `DATABASE_URL` | Backend | No (defaults to SQLite) | SQLAlchemy connection string. `sqlite:///./aerosentinel.db` locally; PostgreSQL in production | `app/main.py`, `app/database.py` | `postgresql://USER:PASSWORD@HOST:5432/aerosentinel` |
| `FRONTEND_URL` | Backend | Recommended | Single allowed CORS origin. Falls back to `http://localhost:5173`; `*` enables all origins | CORS middleware in `app/main.py` | `https://your-frontend.example.com` |
| `JWT_SECRET` | Backend | Recommended | Salt used by the mock `/api/auth/login` token digest. Default `demo-secret-change-me` | `app/main.py` | generate a random value |
| `VITE_API_URL` | Frontend (build time) | Production only | Absolute API base URL for the built app. Unset → same-origin (dev proxy / nginx) | `src/services/api.ts` | `https://your-backend.example.com` |
| `BACKEND_URL` | Frontend (dev only) | No | Dev-server proxy target for `/api`, `/health`, `/ready`. Default `http://localhost:8000` | `vite.config.ts` | `http://localhost:8000` |
| `PORT` | Backend (platform) | Provided by host | Port Uvicorn binds to on Render | Render start command | provided automatically |
| `PYTHON_VERSION` | Backend (platform) | Set in `render.yaml` | Pins the Python runtime on Render | Render build | `3.11.9` |
| `MODEL_PATH` | Backend | No | Declared in `.env.example` as the model directory. **Not read by any current code** — models are in-memory | — | `./models` |
| `API_URL` | Backend | No | Documented as the value to mirror into the frontend's `VITE_API_URL`. **Not read by any current code** | — | `http://localhost:8000` |
| `LLM_API_KEY` | Backend | No | Commented placeholder in `.env.example`. **No LLM integration exists in the codebase** | — | *unused* |

`.env`, `.env.*` (except `*.example`), `*.db` and `*.sqlite` are ignored by `.gitignore`, so real credentials and the local database are never committed. Never commit a real `DATABASE_URL`, `JWT_SECRET` or API key.

---

## API reference

The backend exposes 39 paths / 40 operations. The authoritative, always-current list is the OpenAPI document at `/openapi.json` and the Swagger UI at `/docs` (ReDoc at `/redoc`). Responses are JSON unless noted.

### Health and observability

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Service, database, ML and data-seeding status (see known defect 1) |
| GET | `/ready` | Readiness probe with per-subsystem detail (see known defect 2) |
| GET | `/api/system-health` | Service status list rendered on the System screen |
| GET | `/api/data-quality` | Telemetry completeness, sensor reliability, record completeness, missing %, stale feeds, composite score |
| GET | `/api/audit` | Last 50 audit-log entries (actor, action, detail, timestamp) |

### Fleet and aircraft

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/dashboard` | Fleet KPIs: size, operational, maintenance, at risk, critical, availability %, predicted 30-day failures, backlog, MTTR, simulated downtime estimate |
| GET | `/api/fleet` | Aircraft list plus health distribution, 30-day availability history and 30-day projection |
| GET | `/api/aircraft` | Registry with filters `status`, `q`; includes health, risk, minimum RUL, primary risk component, priority |
| GET | `/api/aircraft/{aid}` | Full aircraft detail: metadata, per-component health/RUL/failure probability, maintenance history. Re-runs inference and writes results back |
| GET | `/api/aircraft/{aid}/health` | Alias of the aircraft detail response |
| GET | `/api/aircraft/{aid}/telemetry` | Telemetry window (`hours`, default 24, `component` filter, up to 600 readings, ordered oldest → newest, plus a live point when degradation is active) |
| GET | `/api/aircraft/{aid}/predictions` | Predictions for a single aircraft |

### Predictions, anomalies and RUL

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/predictions` | Fleet-wide component predictions (`min_risk` filter, max 80 returned), sorted by failure probability. Cached 60 s per simulation state |
| GET | `/api/anomalies` | Anomaly events with baseline deviation, severity and the *what / why / assessment / action* explanation (max 40) |
| GET | `/api/rul` | RUL estimates with expected range, degradation %, 20-point history and 30-point projection (max 60, most urgent first) |
| POST | `/api/predict` | Score an arbitrary feature vector: `temperature`, `vibration`, `pressure`, `rpm`, `hours`, `cycles`, `maint_age`, `prev_fail`. Returns probability, RUL, anomaly score, confidence, explanation and the advisory notice |

### Maintenance, work orders and logistics

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/recommendations` | Recommended actions for predictions ≥ 0.40 (max 20) with parts, technician, slot, confidence and basis |
| GET | `/api/work-orders` | Work-order register (`status` filter) |
| POST | `/api/work-orders` | Create a work order (starts `Approved`), write the approved `ai_recommendations` row and an audit entry |
| POST | `/api/work-orders/{woid}/status` | Advance status and optionally update the checklist; completion triggers recovery |
| GET | `/api/maintenance` | Maintenance records (`aid` filter) with MTTR and an MTBF proxy |
| GET | `/api/schedule` | Open work orders with scheduled dates |
| GET | `/api/inventory` | Spare-parts register with risk state derived from stock vs minimum stock |
| GET | `/api/inventory/forecast` | Demand derived from active predictions, projected coverage, reorder recommendation, six-point stock series |
| GET | `/api/resources` | Technician register: skill, availability, workload, active jobs |

### Analytics, insights and simulation

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/analytics` | Failure Pareto, MTTR, MTBF proxy, availability trend, reactive vs predictive posture |
| GET | `/api/insights` | Generated observations (top predicted failures, high-risk aircraft, backlog, sensor volume) with evidence and confidence |
| GET | `/api/alerts` | Severity-filterable alert feed: live prediction alerts plus stored alerts |
| GET | `/api/copilot` | Read-only retrieval answers over live data. Supported intents: `highest failure risk`, `why is AS-014 high risk`, `spare parts critical`, `vibration anomalies`, `tasks due this week`, `summarize fleet health` |
| POST | `/api/simulate/degrade` | Inject degradation (`aircraft_id`, `component`, `level` ≤ 1.0 cumulative) and run inference once |
| POST | `/api/simulate/reset` | Clear degradation for one aircraft or the whole fleet |
| GET | `/api/simulate/state` | Current degradation state |
| POST | `/api/whatif` | Scenario projection from `capacity`, `technicians`, `delay` against the live dashboard state |

### Data, models and reporting

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/data/upload` | Multipart CSV ingestion: returns file, rows, columns, missing count, duplicates, validation status and a quality score. Validated and profiled only — not persisted to operational tables |
| GET | `/api/data/sample` | Downloadable 50-row sample telemetry CSV (`text/csv`) |
| GET | `/api/models` | Model registry with stored metrics |
| POST | `/api/models/train` | Re-fit the three models on synthetic data and register a version (`target`, `kind`) |
| GET | `/api/digital-thread` | The thirteen pipeline stages plus the current prediction for an aircraft |
| GET | `/api/report` | Plain-text fleet readiness report (`text/plain`, download) |
| POST | `/api/auth/login` | **Mock** login used by integration examples; returns a truncated SHA-256 digest, not a signed JWT. The frontend never calls it |

---

## Development

### How the code is organised

```
backend/
  app/main.py                  FastAPI app, SQLAlchemy models, seeder, ML training + inference, all routes
  app/database.py              Re-exports engine and SessionLocal for modular imports
  app/ml/feature_engineering.py  rolling() · trend() · deviation()
  app/ml/pipeline.py           Feature-engineering re-exports, advisory string, unused priority helper
  tests/test_api.py            The only pytest suite
frontend/
  src/App.tsx                  Routes (with legacy-route redirects)
  src/components/AppShell.tsx  Sidebar, top system bar, layout and scroll ownership
  src/components/SystemContext.tsx  Global refresh bus, live mode, simulation actions, model label
  src/components/DigitalTwin.tsx    Interactive SVG schematic and component inspection
  src/components/ui.tsx        Panels, metrics, tags, tables, empty/error/loading states
  src/components/charts.tsx    Recharts-based engineering charts
  src/lib/format.ts            Timestamp/number formatting, semantic state mapping, sensor specs
  src/pages/*.tsx              One module per screen (or per group of related screens)
  src/services/api.ts          The only HTTP client
```

### Backend development

* **Run with reload:** `uvicorn app.main:app --reload --port 8000` from `backend/`.
* **Add an endpoint:** define the Pydantic request model next to the route, take `s: Session = Depends(db)` for database access, and use `audit(s, role, action, detail)` for anything an operator should be able to trace.
* **Change the ML pipeline:** training lives in `train_ml_models()`, inference in `infer_all()` / `_compute_predictions()`. Adding a feature means updating the generator, the `FEATURES` list, `featurize()` and every call site — the perturbation map in `_compute_predictions()` and `infer_all()` indexes features by position, so keep indices consistent.
* **Change the dataset:** the seeder is idempotent per table (`seed_if_empty()` returns early if aircraft exist). Delete `backend/aerosentinel.db` to regenerate from scratch.
* **Keep the honesty labels.** Response payloads carry provenance text (`"Demo evaluation on synthetic data"`, `"Simulation — not a measured real-world result"`) and the UI surfaces them. Preserve that convention when adding endpoints: if a number is projected, simulated or synthetic, say so in the payload and in the interface.

### Frontend development

* **Run:** `npm run dev` (port 5173, `host: true`, proxy to `BACKEND_URL`).
* **Build:** `npm run build` runs `tsc -b` first, so TypeScript errors fail the build. `npm run preview` serves the built output with the same API proxying.
* **TypeScript is strict** (`"strict": true` in `tsconfig.json`); there is no ESLint or Prettier configuration in the repository, so match the surrounding style — the codebase uses 2-space indentation, single quotes and explicit return types on exported helpers.
* **Design system:** Tailwind theme tokens are defined in `tailwind.config.js` and CSS variables in `src/index.css` (industrial aerospace palette, IBM Plex Sans/Mono, flat surfaces with border-based hierarchy and no shadows or gradients). Semantic state colours and thresholds live in `src/lib/format.ts` (`healthState`, `rulState`, `probState`, `SENSOR_SPEC`) — reuse them rather than hard-coding colours or thresholds.
* **Data loading convention:** pages fetch in `useEffect` keyed on `sys.refreshKey`, call `sys.markUpdated()` on success, and render `LoadingState` / `ErrorState` / `EmptyState` from `ui.tsx`. Follow that pattern so Live mode and simulation actions refresh your screen too.
* **Routing convention:** add the route in `App.tsx` under the `/app` layout, add the navigation entry in `AppShell.tsx`, and add a title to `SECTION_TITLES` (and a group to `SECTION_GROUP` if it is not a sidebar item) so the breadcrumb and active-state logic work.
* **No new runtime dependency without a reason.** The current stack is deliberately small: React, React Router, Recharts, Tailwind, IBM Plex fonts.

### Testing

| Suite | Command | Current state |
|---|---|---|
| Backend | `cd backend && pytest` | 2 tests covering the dashboard payload and the prediction endpoint |
| Backend (manual) | `python test_endpoints.py` and the other `backend/test_*.py` scripts | Ad-hoc development scripts that call endpoints through `TestClient` as module-level statements. They contain no test functions, so a `pytest` run collects only `tests/test_api.py` |
| Frontend | `cd frontend && npm run build` | Type-check + build is the current safety net; `npm test` is a stub that echoes `ok` |

When you change inference behaviour, add or extend a test that asserts a *direction* (higher vibration and temperature must not lower predicted failure probability; completing a work order must reduce failure probability and raise RUL). Directional tests survive model retraining; exact-value tests do not.

### Debugging

| Symptom | Likely cause |
|---|---|
| Dashboard KPIs are zero or an empty aircraft list | The database exists but was not seeded (for example a failed first run). Delete `backend/aerosentinel.db` and restart |
| Frontend shows "… UNAVAILABLE" error states everywhere | The backend is not running, or `VITE_API_URL` points somewhere unreachable. Check `http://localhost:8000/api/dashboard` first |
| CORS errors in the browser console | The frontend origin does not match `FRONTEND_URL`; the backend allows exactly one origin (or `*`) |
| Prediction values look unchanged after an action | The prediction endpoint caches for 60 s per simulation state; press *Reset* or wait for the cache to expire |
| `docker compose up` fails to reach the API | The nginx config proxies to the Compose service name `backend:8000`; it will not work with a differently named service |
| Data-quality score always 70 % | Expected on the current code — `sensor_reliability` is affected by known defect 3 |

### Branch and commit conventions

The repository history uses short, imperative, single-purpose commit subjects (for example *"Shrink the sidebar logo, pin it to the top, and make it the home control"*). Keep that style: one logical change per commit, subject in the imperative mood, body explaining *why* when the change is not self-evident. Work on a feature branch and open a pull request against `main` (see [Contributing](#contributing)).

---

## Deployment

Two deployment paths exist in the repository: a **Render blueprint** (`render.yaml`) using a managed PostgreSQL instance, and **Docker Compose** (`docker-compose.yml`) with a PostgreSQL container. `DEPLOYMENT.md` documents the Render flow in more detail and should be read together with this section.

### Render (both services from one blueprint)

`render.yaml` defines three resources:

```mermaid
flowchart LR
    U["Operator browser"] --> FE["Static site<br/>aerosentinel-frontend<br/>rootDir frontend<br/>build: npm install, then npm run build → dist/"]
    FE -->|"VITE_API_URL"| BE["Web service<br/>aerosentinel-backend<br/>rootDir backend<br/>pip install -r requirements.txt<br/>uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
    BE --> DB[("Render managed PostgreSQL<br/>aerosentinel-db<br/>internal connection string")]
```

| Setting | Backend service | Frontend service |
|---|---|---|
| Type | Web service (Python) | Static site |
| Root directory | `backend` | `frontend` |
| Build command | `pip install -r requirements.txt` | `npm install && npm run build` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | — (serves `dist/`) |
| Publish path | — | `dist` |
| Health check | `/health` (configured in `render.yaml`) | — |
| Environment | `PYTHON_VERSION=3.11.9`, `DATABASE_URL` (from the database), `JWT_SECRET` (generated), `FRONTEND_URL` (set manually) | `VITE_API_URL` (set manually) |
| Routing | — | SPA rewrite `/* → /index.html` so deep links such as `/app/fleet` resolve on refresh |

**Steps (order matters, because each service needs the other's URL):**

1. Create the blueprint from the repository (Render reads `render.yaml`), or create the services manually with the settings above.
2. Deploy the **backend** first. Copy its URL once live.
3. In the **frontend** service, set `VITE_API_URL` to the backend URL, **without a trailing slash**, and redeploy — Vite inlines this value at build time, so it must be correct *before* the build.
4. In the **backend** service, set `FRONTEND_URL` to the frontend URL (no trailing slash) so CORS allows it, and redeploy.
5. Verify using the checks below.

**Verification after deployment**

| Check | Expected |
|---|---|
| Backend logs | Server start, database initialisation, ML model initialisation |
| `GET https://<backend>/health` | JSON with `database: "connected"`, `ml: "ready"` — note that `status` currently reports `degraded` because of known defect 1 |
| `GET https://<backend>/ready` | Per-subsystem detail — currently always `not_ready` because of known defect 2 |
| `GET https://<backend>/api/dashboard` | `fleet_size: 24` on a fresh PostgreSQL instance |
| Frontend root and a deep link (e.g. `/app/fleet`) after a hard refresh | Both load the application shell (SPA rewrite working) |
| Browser console | No CORS or mixed-content errors |
| Work-order creation | Succeeds and appears in the register |

### Docker Compose

`docker compose up --build` starts PostgreSQL 16 (named volume `pgdata`), the backend image, and the frontend image. The frontend container is a two-stage build: Node 20 compiles the app, then nginx serves `dist/` and proxies `/api`, `/health` and `/ready` to `http://backend:8000`, with `try_files ... /index.html` for SPA routing. Compose maps `5173 → 80` on the frontend and `8000 → 8000` on the backend, so the console is at `http://localhost:5173` and the API is directly reachable at `http://localhost:8000`.

To deploy this stack to your own host, put a TLS-terminating reverse proxy in front of port 5173 (or set `VITE_API_URL` at build time and serve `dist/` from any static host while proxying `/api` to the backend). The images are otherwise self-contained.

### Configuration notes

* **API URL configuration.** Three mechanisms, in order of precedence: `VITE_API_URL` (build-time, absolute), same-origin relative paths (development proxy and docker nginx), or direct calls when `VITE_API_URL` is empty. Trailing slashes must not appear in `VITE_API_URL` or `FRONTEND_URL`.
* **Database.** `DATABASE_URL` is the only switch: SQLite for local work, PostgreSQL in Compose and on Render. The schema is created with `create_all` at startup; there are no migrations, so schema changes require either a fresh database or a manual migration.
* **Scaling caveat.** The simulation state (`DEGRADE`) and the trained models live in process memory. Running more than one backend instance means instances can disagree about simulation state, and every instance re-trains at startup. Persist those before scaling horizontally.
* **Health checks.** `/health` and `/ready` exist and are wired into `render.yaml`, but both currently report a non-healthy status regardless of the real state (known defects 1 and 2). Either fix them or point platform health checks at `/api/dashboard` until they are corrected.

### Common deployment issues

| Symptom | Cause and fix |
|---|---|
| Frontend loads but every panel shows an error | `VITE_API_URL` was unset or wrong at build time. Set it, then **rebuild** — it is compiled into the bundle |
| CORS errors after deploying | `FRONTEND_URL` on the backend does not exactly match the frontend origin (scheme, host and trailing slash all matter) |
| Deep links 404 on refresh | The static host is not rewriting unknown paths to `index.html`; `render.yaml` includes this rewrite, other hosts need an equivalent rule |
| Database tables empty after first deploy | The seeder runs on first request; check the logs for `seed_if_empty` failures and confirm `DATABASE_URL` is reachable from the service |
| Render service cold-starts slowly | Free plans spin down when idle; expect the first request after a pause to be slow — the app also re-trains its models on every cold start |
| Backend cannot reach PostgreSQL | Render's internal connection string is only routable from inside the Render network; the browser and the frontend service cannot connect to it directly |

---

## Repository layout

```
SIH249-Main/
├── README.md                       This document
├── DEPLOYMENT.md                   Render deployment guide (database, services, checklist)
├── docker-compose.yml              postgres 16 + backend + frontend (nginx) stack
├── render.yaml                     Render blueprint: database + web service + static site
├── .env.example                    Consolidated example environment (root level)
│
├── docs/
│   └── screenshots/
│       └── README.md               Capture guide for the screenshot slots in this README
│
├── backend/
│   ├── Dockerfile                  python:3.11-slim, uvicorn on 0.0.0.0:8000
│   ├── requirements.txt            FastAPI, SQLAlchemy, pydantic, scikit-learn, pandas, numpy, pytest, psycopg2
│   ├── .env.example                Backend environment template
│   ├── app/
│   │   ├── main.py                 Application: models, seeder, ML training/inference, all 40 route operations
│   │   ├── database.py             Engine and session factory (DATABASE_URL driven)
│   │   └── ml/
│   │       ├── feature_engineering.py  rolling · trend · deviation
│   │       └── pipeline.py             Feature re-exports, advisory string, unused priority helper
│   └── tests/
│       └── test_api.py             Dashboard and prediction endpoint tests
│
└── frontend/
    ├── Dockerfile                  Node 20 build stage → nginx runtime stage
    ├── nginx.conf                  SPA fallback + /api, /health, /ready proxy to backend:8000
    ├── package.json                React 18, React Router 6, Recharts 2, Tailwind 3, Vite 6, TypeScript 5.6
    ├── vite.config.ts              Dev server (host: true, allowedHosts) with API/health proxies
    ├── tailwind.config.js          Colour, font and sizing tokens for the operations UI
    ├── tsconfig.json               Strict TypeScript configuration
    ├── .env.example                Frontend environment template (VITE_API_URL)
    ├── public/
    │   ├── logo.png                Project mark used in the application and this README
    │   └── final logo.png          Wordmark version of the logo
    └── src/
        ├── App.tsx                 Route table, including redirects for consolidated legacy routes
        ├── main.tsx                Entry point; self-hosted IBM Plex fonts
        ├── index.css               Design system: variables, layout, component classes
        ├── components/             AppShell · SystemContext · DigitalTwin · ui · charts · icons
        ├── lib/format.ts           Formatting, semantic states, sensor specifications
        ├── pages/                  One module per screen group (Command, Fleet, Aircraft, Maintenance,
        │                           Logistics, Predict, Analytics, System, Recommendations)
        └── services/api.ts         Single HTTP client with base-URL resolution
```

| Path | Purpose |
|---|---|
| `backend/app/main.py` | The entire backend: 13 SQLAlchemy models, the synthetic seeder, ML training and inference, and every route. Read this first. |
| `backend/app/ml/` | Feature-engineering helpers and advisory constants intended for reuse; the serving paths currently live in `main.py`. |
| `backend/tests/` | The pytest suite (`pytest` is collected from the `backend` directory). |
| `docs/screenshots/` | Documentation assets for this README: the capture guide plus the PNG files the gallery slots expect. Empty until screenshots are captured. |
| `backend/*.py` (root of `backend/`) | One-off development and repair scripts (`check_*`, `fix_*`, `test_*`, `add_insights`, `rewrite_*`) plus `audit_report.txt`. They are working notes from building the prototype — not part of the runtime, and they contain no test functions. |
| `frontend/src/pages/*.py` | Three Windows-only helper scripts left inside the pages directory that rewrite a page component by path. They are development artefacts, are not imported by the application, and are safe to delete. |
| `frontend/public/` | The two logo assets. `logo.png` (square mark) is used in the UI sidebar and at the top of this README; `final logo.png` is the horizontal wordmark. |
| `DEPLOYMENT.md` | Render-specific walkthrough: database creation, service settings, environment variables, post-deployment checklist. |
| `render.yaml`, `docker-compose.yml` | The two deployment definitions. |
| Design tokens | `frontend/tailwind.config.js` and `frontend/src/index.css` are the single source of truth for colours, fonts and layout geometry. |

Two housekeeping notes for contributors: `frontend/tsconfig.tsbuildinfo` is a committed TypeScript build artefact (it changes on every build and could be excluded), and the `backend/` root scripts plus `frontend/src/pages/*.py` could move to a `tools/` or `scripts/` directory or be removed.

---

## Technology

| Layer | Technology | Version | Why it is used here |
|---|---|---|---|
| UI framework | **React** | 18.3 | Component model for a dense, stateful operations console with many independently refreshing panels |
| Language | **TypeScript** | 5.6 (strict) | Typed API payloads and safe refactoring across ~5 000 lines of UI code |
| Build tool | **Vite** | 6 | Fast dev server with a proxy that keeps the browser same-origin; production build consumed by both Docker and Render |
| Styling | **Tailwind CSS** | 3.4 (+ PostCSS, Autoprefixer) | Token-driven design system (industrial palette, no shadows) applied consistently across ~20 screens |
| Routing | **React Router** | 6.28 | Nested routes under an application shell, plus redirects that preserve old bookmarks |
| Charts | **Recharts** | 2.15 | Composed line/area charts with reference lines and bands for thresholds, baselines and anomaly markers |
| Typography | **IBM Plex Sans / Mono** (via Fontsource) | self-hosted | Engineering-document look; no external font requests |
| API framework | **FastAPI** | 0.115 | Typed request/response models, automatic OpenAPI/Swagger documentation at `/docs` |
| ASGI server | **Uvicorn** | 0.34 | Runs the API locally and on Render (`$PORT`) |
| ORM | **SQLAlchemy** | 2.0 | One model layer that works with both SQLite and PostgreSQL |
| Validation / settings | **Pydantic** (+ `pydantic-settings`) | 2.10 | Request body validation and settings loading |
| Machine learning | **scikit-learn** | ≥ 1.5.2 | `RandomForestClassifier`, `RandomForestRegressor`, `IsolationForest` — trained and served in-process |
| Data handling | **NumPy** | ≥ 1.26 | Matrix operations for batched scoring and explainability |
| Data handling (declared) | **pandas** | latest | Declared in `requirements.txt` and imported by `app/main.py`, but not used in the current serving path; `joblib` is likewise declared but unused |
| Database (dev) | **SQLite** | bundled | Zero-setup local persistence; the default when `DATABASE_URL` is unset |
| Database (prod) | **PostgreSQL** | 16 | Managed instance on Render; `postgres:16` container in Compose; driver `psycopg2-binary` |
| Auth libraries | `python-jose`, `passlib[bcrypt]` | — | Declared in `requirements.txt`; the current login route is a mock and does not sign real JWTs |
| Testing | **pytest**, `httpx` (via Starlette's `TestClient`) | 8.3 / 0.28 | Backend endpoint tests |
| Containers | **Docker**, **Docker Compose**, **nginx** | docker engine / compose v2 / nginx:alpine | Reproducible three-service stack; nginx serves the SPA and proxies the API |
| Hosting | **Render** | blueprint | One file defines the database, the web service and the static site with an SPA rewrite |

<details>
<summary><b>Complete backend dependency list</b> (<code>backend/requirements.txt</code>)</summary>

```text
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
pydantic==2.10.4
pydantic-settings==2.7.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.20
numpy>=1.26.0
pandas
scikit-learn>=1.5.2
joblib==1.4.2
pytest==8.3.4
httpx==0.28.1
psycopg2-binary==2.9.10
```

</details>

---

## Data sources and licences

### There is no external dataset

**Every operational value in this repository is synthetic.** There is no dataset download, no API integration, no telemetry feed, no imported CSV fixture and no model trained on third-party data. Nothing in the application represents a real aircraft, a real unit, a real part number or a real person.

| Category | What it is | Where it comes from |
|---|---|---|
| **Real data** | *None.* | — |
| **Synthetic data** | 24 aircraft (`AS-001` … `AS-024`) across 5 platform types, 4 fictional bases, 7 subsystems each, ~30 days of daily telemetry per aircraft (48 hourly points for `AS-014`), 2–6 maintenance records per aircraft, 9 spare parts, 8 technicians, 3 stored alerts and 3 model-registry rows | Generated by `seed_if_empty()` in `backend/app/main.py` using `random.Random(26249)` for structure and unseeded `random`/`numpy` calls for a few series |
| **Simulated data** | The degradation scenario: `POST /api/simulate/degrade` adds a cumulative offset to the latest reading (vibration `+5.2 × level`, temperature `+26 × level`, pressure noise), which then flows through the real inference pipeline | `DEGRADE` dict (in memory) + `current_telemetry()` |
| **Demo data** | Model-registry metric rows (`f1 0.89`, `precision 0.87`, `recall 0.91`, `mae_hours 12.4`, `rmse_hours 18.9`, `contamination 0.06`) and the seeded alerts. These are illustrative labels, not measurements | Seeded `model_versions` / `alerts` rows |
| **Model training data** | 4 000 synthetic samples generated in-process from the formulas documented in [Training pipeline](#training-pipeline) | `train_ml_models()`, `numpy.random.default_rng(42)` |
| **Uploaded data** | CSVs you upload through the Data Sources screen are parsed, profiled and reported (rows, columns, missing values) and are **not** written into the operational tables | `POST /api/data/upload` |

### Fictional identifiers

Base names (`Base Alpha` … `Base Delta`), squadron labels, tail numbers, technician names, part numbers and the supplier string `HAL-Spares` are demo placeholders authored for this prototype. `Base Alpha` etc. are labelled *"(FICTIONAL)"* in the Command Center itself. No real unit, organisation, supplier or person is represented, and no classified, export-controlled or otherwise sensitive data is included.

### Attribution and dataset licences

* **No dataset licence applies**, because no datasets are distributed or consumed. There is nothing to attribute and nothing to comply with beyond the licences of the software dependencies.
* **No external API is used.** There is no telemetry provider, no weather service, no LLM provider (`LLM_API_KEY` in `.env.example` is an unused placeholder) and no external model host.
* **If you connect real data**, you become responsible for its licence, classification, handling rules and attribution requirements. Check before you import.

### Third-party software licences

The principal dependencies carry permissive, widely used licences. This list is provided for orientation — **verify against each package's own distribution before redistribution**, and note that no dependency's licence has been vendored into this repository.

| Dependency | Commonly distributed under |
|---|---|
| FastAPI, SQLAlchemy, Pydantic, React, React Router, Recharts, Tailwind CSS, Vite | MIT |
| Uvicorn, scikit-learn, NumPy, pandas | BSD-3-Clause |
| TypeScript | Apache-2.0 |
| nginx | BSD-2-Clause |
| PostgreSQL | PostgreSQL License |
| IBM Plex Sans / Mono (via Fontsource) | SIL Open Font License 1.1 |

The project's own licence status is stated in [Licence](#licence) — the repository currently has none.

---

## Limitations

Framed deliberately: this section describes what the prototype can and cannot support, so that reviewers and future contributors inherit accurate expectations.

### Data and evidence

* **All data is synthetic.** There is no operational validation of any kind, and no real failure, incident or maintenance record exists in the repository. Nothing here demonstrates field performance.
* **The models learn a designed relationship.** The failure label and RUL target are generated from explicit formulas, so the estimators reproduce a synthetic function rather than physical degradation behaviour. A high synthetic F1 says the model memorised the generator well — it is not evidence of predictive skill on real telemetry.
* **No held-out evaluation, calibration or ablations exist.** Accuracy is therefore not quoted anywhere in this README; see [How well it works](#how-well-it-works) for what is measured and what would be required.

### Model behaviour

* **Confidence is heuristic, not calibrated.** It measures distance from the decision boundary and should not be read as a probability of being correct.
* **The RUL range is a fixed ±25 % band**, not a statistical interval, and RUL is not guaranteed to decrease monotonically as degradation increases (observed: 5.4 → 5.0 → 5.1 → 6.0 days across successive degradation steps).
* **Explanations are approximate.** Perturbation-based contributions only measure the positive direction and can collapse to 0.0 % for drivers that are already dominant or that reduce risk.
* **Two inference paths, two answers.** `/api/simulate/degrade` and `/api/aircraft/{aid}` build feature vectors from different inputs, so the same component can show different numbers in different views at the same moment.
* **Explanations are per-prediction, not global.** There is no stored feature importance, no partial-dependence analysis and no model-diagnostics view.
* **Retraining overwrites.** `POST /api/models/train` replaces the in-memory models globally; there is no shadow deployment, no comparison and no rollback. The F1 it records is a fixed value, not a computed metric.

### Architecture and scale

* **Single process, in-memory state.** Models and simulation state live in process memory. Multiple instances, workers or restarts will disagree about simulation state, and every cold start re-trains.
* **`predictions` and `anomalies` tables are not written to.** Prediction and anomaly results are computed on the fly, which is why the reactive-vs-predictive comparison is bounded and why the dashboard's simulated downtime figure reads zero. Persisting them is the natural first step toward outcome-based evaluation.
* **SQLite is the local default.** Fine for a single developer; unsuitable for concurrent production use. PostgreSQL via `DATABASE_URL` is the supported path for anything shared.
* **`create_all` instead of migrations.** Schema changes require a fresh database or manual SQL.
* **Some list endpoints report cached values.** `/api/aircraft` and `/api/fleet` return stored component/aircraft values until the detail endpoint recomputes them.
* **Analytics is partly literal.** The MTBF figure is a constant, and the availability history series includes generated variation rather than measured history.

### Security and operations

* **Authentication and authorisation are disabled.** The UI opens straight into the console; the backend trusts the `X-Role` header; `/api/auth/login` returns a digest, not a verifiable JWT. There is no role enforcement, no session management and no multi-tenancy.
* **No rate limiting, quota or upload size limit.** The CSV endpoint parses whatever it is given into memory.
* **No secrets management.** Configuration is environment-variable based, with demo credentials in `docker-compose.yml`.
* **Health probes currently misreport** (see defects 1 and 2). Platform health checks configured against them will not reflect real state.
* **No penetration testing, dependency scanning or CI pipeline** exists in the repository.

### Workflow and domain

* **Technician assignment is not skill-matched.** Recommendations select the first technician with availability > 0.5, and the suggested slot is always today + 3 days, regardless of the component or the actual roster.
* **Scheduling is a date field, not a scheduler.** There is no capacity model, no shift pattern, no resource levelling and no conflict detection.
* **Spares logic is threshold-based.** Coverage is `stock − (predicted demand + baseline demand)` compared against minimum stock; there is no economic order quantity, no lead-time variability and no supplier-performance modelling.
* **Some workflow states are reachable in the UI but not produced by the API** — for example, orders are created directly in `Approved`, never in `Detected`.
* **No multi-user behaviour.** There is no locking, no optimistic concurrency and no real-time collaboration; the audit log records actions but does not prevent conflicting ones.
* **No offline or degraded-mode operation.** If the API is unreachable, every screen shows an error state.

### Aviation and safety

* **This is not a certified or certifiable maintenance system.** It implements none of the process, traceability, independence, configuration-control or record-keeping requirements that aviation maintenance and airworthiness frameworks demand (for example design-assurance and safety-assessment processes, or a maintenance-organisation approval regime).
* **Outputs are advisory.** Every AI result requires authorised human review; the application is designed so that predictions never create work on their own. Do not represent its output as an airworthiness determination, a dispatch decision, a maintenance instruction or a compliance record.
* **Sensor-level realism is out of scope.** There is no physics model, no sensor-fault model, no missing-data or clock-skew simulation and no consideration of measurement error, so the pipeline's robustness to dirty telemetry is untested.

---

## Security and responsible AI

### What is implemented

| Control | Implementation |
|---|---|
| CORS restriction | A single allowed origin from `FRONTEND_URL` (default `http://localhost:5173`); `*` only if explicitly configured |
| Audit trail | `audit_logs` rows for logins, work-order approvals and status changes, simulation events, model training and dataset uploads, surfaced on the Audit Log screen |
| Actor attribution | `X-Role` header read in `actor()` and written into audit entries; the console sends `command` |
| Human-in-the-loop | Recommendations are advisory; a work order only exists after an engineer submits the form, and approval is recorded as an `ai_recommendations` row with `review_status = Approved` |
| Uncertainty surfaced | `low_confidence` flag below 0.65 rendered as an explicit tag; RUL shown with its expected range and the model version in the system bar |
| Advisory labelling | API payloads carry advisory strings (`"AI outputs are advisory and require authorized human review."`), the shell footer carries the same notice, and provenance labels (*SIMULATION / SYNTHETIC*) appear on the affected panels |
| Secret hygiene | `.env`, real databases and build outputs are git-ignored; only placeholder values appear in `.env.example` files; `render.yaml` uses `generateValue` for `JWT_SECRET` |
| Upload handling | Uploads are parsed and profiled with reported missing-value counts and are **not** written into operational tables |
| Read-only query console | The retrieval console answers from live data and cannot create, modify or authorise anything |
| Health endpoints | `/health` and `/ready` exist for platform probes (currently misreporting — see the defect table) |

### What is not implemented

* **No authentication or authorisation enforcement** on any endpoint. Treat the API as open.
* **No transport hardening inside the app** — TLS is entirely the host's responsibility; no HSTS, CSP or security headers are set by the application or the bundled nginx config.
* **No rate limiting, request size caps, input fuzzing or abuse protections.**
* **No encryption-at-rest strategy beyond what the database platform provides.**
* **No dependency scanning, secret scanning, SAST or CI checks.**
* **No formal privacy assessment** — none is needed for synthetic data, but it becomes mandatory the moment real telemetry or personnel data is loaded.

### Responsible-AI position

* **Advisory by design.** The system produces ranked, explained suggestions; a human decides and the decision is recorded. There is no autonomous grounding, dispatch, parts ordering or personnel assignment.
* **Uncertainty is exposed, not suppressed.** Low-confidence predictions are labelled rather than hidden, RUL is presented as a range, and every metric in the interface is tagged as synthetic or simulated.
* **No fabricated certainty.** This README states plainly that the model learns a synthetic generator, that the registry metrics are demo labels, and that no real-world evaluation has been performed.
* **Safety boundary.** Anything that would move this from decision support toward operational authority requires domain validation, calibration on real data, formal safety assessment and airworthiness approval — engineering work that is out of scope for this prototype and explicitly not claimed.

---

## Project status and next steps

### Implemented and verified

* Synthetic fleet seeder: 24 aircraft, 7 components each, telemetry, maintenance history, spare parts, technicians, model registry, alerts.
* Three-model scikit-learn pipeline (failure classifier, RUL regressor, anomaly detector) trained at startup and served in-process.
* 39 API paths / 40 operations with automatic OpenAPI documentation.
* Fleet command surface: readiness KPIs, status board, alert feed, availability history and projection, readiness report export.
* Aircraft workspace: subsystem health matrix, maintenance timeline, telemetry charts with baselines/thresholds/anomaly markers, diagnostics with feature contributions and RUL curves.
* Interactive digital twin with nine subsystem modes and component inspection.
* Prediction, anomaly and RUL queues with severity and confidence filtering.
* Recommendations → pre-filled work orders with an approval record and audit trail; five-state lifecycle with closed-loop recovery on completion.
* Spares register and prediction-driven spares forecast; technician register.
* Analytics, failure Pareto, what-if simulation, model registry and in-process retraining.
* CSV ingestion with profiling, data-quality indicators, digital thread, read-only query console, audit log.
* Docker Compose stack and a Render blueprint (database + web service + static site).
* Backend pytest suite (2 tests) and a strict TypeScript production build.

### Known gaps

The eight verified defects in [How well it works](#how-well-it-works), plus: no authentication, no prediction persistence, no database migrations, no frontend tests, no CI, and no model calibration or held-out validation.

### Candidate next steps

Ordered by how much each unblocks, and each tied to a gap above rather than to a wish list:

1. **Fix the health and readiness probes** (use `sqlalchemy.text()` for the probe query, check the data via a session instead of the application object, and set the expected model flag) so platform health checks are meaningful.
2. **Persist predictions and outcomes.** Write each scored prediction with its model version, then close it with the eventual work-order result. This is the prerequisite for every real evaluation metric and repairs the reactive-vs-predictive comparison.
3. **Unify the inference feature path** so the simulation endpoint and the aircraft detail endpoint derive features identically, and remove the two-answers-for-one-component inconsistency.
4. **Calibrate the uncertainty outputs.** Replace the heuristic confidence with a calibrated probability and replace the fixed RUL band with an interval whose coverage is measured.
5. **Build an evaluation harness.** Given a labelled dataset, compute precision/recall at the operating threshold, PR-AUC, RUL error by horizon and alert lead-time distributions, with a time-based split and a threshold baseline for comparison.
6. **Add authentication and authorisation** (real signed tokens and role enforcement) if the prototype is to be shared beyond a demo, and add rate limiting and upload size limits.
7. **Introduce migrations** (Alembic) and remove `create_all`-only schema management before any shared deployment.
8. **Add continuous integration** running pytest, the TypeScript build and a link/anchor check on documentation.
9. **Improve operational realism in the heuristics:** skill-matched technician assignment, capacity-aware scheduling, and a spare-parts model that accounts for lead-time variability.
10. **Housekeeping:** move the one-off `backend/*.py` scripts and `frontend/src/pages/*.py` helpers out of the source tree, and stop tracking `frontend/tsconfig.tsbuildinfo`.

---

## Contributing

Contributions are welcome, particularly fixes for the documented defects, additional tests, and evaluation tooling.

### Getting set up

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/<your-username>/SIH249-Main.git
cd SIH249-Main

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest                       # should pass before you start
uvicorn app.main:app --reload --port 8000

# Frontend — second terminal, from the repository root
cd ../frontend
npm install
npm run dev                  # http://localhost:5173
```

### Workflow

1. **Branch** from `main` with a descriptive name: `fix/health-probe`, `feat/persist-predictions`, `docs/api-reference`.
2. **Keep changes focused.** One logical change per pull request; do not reformat unrelated files.
3. **Test what you change.**
   * Backend: `cd backend && pytest` must pass. Add a test when you change inference behaviour or add an endpoint (prefer directional assertions — see [Testing](#testing)).
   * Frontend: `cd frontend && npm run build` must succeed; TypeScript errors fail the build, so run it before you push.
4. **Document what you change.** If you add or alter an endpoint, update the [API reference](#api-reference). If you add configuration, update [Environment variables](#environment-variables) and the relevant `.env.example`. If you add a capability or a limitation, update the corresponding section — this README is the project's contract with its readers.
5. **Preserve the honesty labels.** Never remove a synthetic-data, simulation or advisory notice, and never present a synthetic metric as a measured result. If you add a number to the UI or an API response, say where it came from.
6. **Commit** with a short, imperative subject and a body that explains *why*:

   ```
   Fix the readiness probe query for SQLAlchemy 2.0

   /ready always reported not_ready because execute("SELECT 1") is not
   executable without text() in SQLAlchemy 2.0, and the probe additionally
   required an ML["trained"] flag that is never set.
   ```
7. **Open a pull request** against `main` and describe: what changed, why, how you verified it (commands and, where useful, output), and any behaviour that is intentionally left out of scope.

### Issue reporting

Include the following so a report can be reproduced:

* What you ran (exact command or UI route) and what you expected.
* What happened instead, with the error output or a screenshot.
* Environment: OS, Python version, Node version, `DATABASE_URL` backend (SQLite or PostgreSQL), and whether you ran locally, with Compose, or on Render.
* Whether the deployment state had been modified (simulation active, work orders completed, CSV uploaded) — several behaviours depend on that state.

Please **do not** open issues that propose removing the synthetic-data and advisory disclaimers; they are a deliberate part of the design.

### Scope guidance

In scope: bug fixes, tests, evaluation tooling, accessibility and responsive-behaviour fixes, documentation improvements, performance work on the existing endpoints, and clearly-labelled new analytical features.

Out of scope without prior discussion: replacing the synthetic dataset with scraped or unlicensed real-world data, adding mandatory cloud services, removing the human-approval step from the maintenance workflow, or any change that presents the system as an operational or certified maintenance authority.

---

## Citation

This repository is not accompanied by a research paper, and no formal author list, DOI or publication record exists. If you reference it in academic or technical work, cite the software repository itself.

<details>
<summary><b>Text citation template</b></summary>

```text
AeroSentinel: AI-Assisted Predictive Maintenance and Fleet Availability Decision Support
(Software prototype). Smart India Hackathon 2026, Problem Statement 26249.
Source code: https://github.com/Harithdn/SIH249-Main
Accessed: <date>.
```

Replace the placeholder details with the current repository state, and add the commit or release you used — that is the only way to make a citation of a prototype reproducible.

</details>

<details>
<summary><b>BibTeX</b></summary>

```bibtex
@misc{aerosentinel2026,
  title        = {AeroSentinel: AI-Assisted Predictive Maintenance and Fleet Availability Decision Support},
  author       = {{AeroSentinel contributors}},
  year         = {2026},
  howpublished = {Software prototype. Smart India Hackathon 2026, Problem Statement 26249},
  url          = {https://github.com/Harithdn/SIH249-Main},
  note         = {Prototype decision-support system operating on synthetic data only.
                  AI outputs are advisory and require authorised human review.}
}
```

</details>

<details>
<summary><b>Citing the datasets and models used here</b></summary>

There are no datasets to cite: all operational data is generated in-process and no third-party data is consumed (see [Data sources and licences](#data-sources-and-licences)). If you cite the underlying tools, use the projects' own recommended citations for **scikit-learn**, **NumPy**, **pandas**, **FastAPI** and **React** as appropriate to your venue.

</details>

---

## Acknowledgements

This project is built on open-source software and open specifications:

* **scikit-learn** for `RandomForestClassifier`, `RandomForestRegressor` and `IsolationForest` — the models behind every prediction, RUL estimate and anomaly score.
* **FastAPI** and **Starlette** for the API layer and the automatic OpenAPI/Swagger documentation.
* **SQLAlchemy** for a data layer that runs unchanged on SQLite and PostgreSQL, and **Uvicorn** as the ASGI server.
* **PostgreSQL** and the **postgres** Docker image for the production database path.
* **React**, **React Router** and **Recharts** for the operations console and its engineering charts.
* **Vite** and **TypeScript** for the build chain and type safety.
* **Tailwind CSS** for the design system primitives.
* **IBM Plex** (Sans and Mono) by IBM, distributed through **Fontsource**, for the interface typography.
* **nginx** and the official **Python** and **Node.js** Docker images for the containerised deployment.
* **Render** for the blueprint-based deployment path documented in `DEPLOYMENT.md`.
* **Smart India Hackathon**, for the problem framing that this repository addresses under problem statement **26249** as stated in the application's own footer and in this repository. No claim is made here about the status of any submission, shortlisting or award.

Any omission is unintentional — open an issue or a pull request and it will be corrected.

---

## Licence

**This repository does not currently include a licence file.** There is no `LICENSE`, `LICENSE.md`, `COPYING` or equivalent anywhere in the tree, and no licence is declared in `package.json` or in the deployment configuration.

What that means in practice, under default copyright rules:

* The code is **not** published under an open-source licence. No permission is granted by default to copy, modify, distribute or use it commercially.
* You may view and fork the repository through GitHub subject to GitHub's Terms of Service, but that does not grant an open-source licence.
* The absence of a licence is not the same as a permissive licence — in particular, **do not assume MIT or Apache-2.0**.

If you are the repository owner and you intend for others to reuse this work (which the [Contributing](#contributing) section assumes), add a `LICENSE` file and reference it here — **MIT** for the most permissive and least ambiguous option, **Apache-2.0** if you also want an explicit patent grant. Sections [Data sources and licences](#data-sources-and-licences) and [Citation](#citation) should be updated at the same time.

Until a licence is added, please contact the repository owner for permission before using the code outside GitHub's terms.

---

<div align="center">
<sub><b>AeroSentinel</b> — prototype decision-support system · synthetic/demo data only · AI outputs are advisory and require authorised human review · SIH 2026 problem 26249</sub>
</div>
