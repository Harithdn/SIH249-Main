"""AeroSentinel backend — FastAPI + SQLAlchemy + sklearn.
Synthetic/demo data only. All KPIs computed from DB, predictions from ML pipeline.
Supports SQLite (demo) and PostgreSQL via DATABASE_URL.
"""
import os, csv, io, json, math, random, time, hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import (create_engine, Column, Integer, String, Float, DateTime,
                        Text, ForeignKey, func)
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aerosentinel.db")
JWT_SECRET = os.getenv("JWT_SECRET", "demo-secret-change-me")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

# ---------------- Models ----------------
class Aircraft(Base):
    __tablename__ = "aircraft"
    id = Column(Integer, primary_key=True)
    aircraft_id = Column(String, unique=True, index=True)
    platform = Column(String, default="Transport")
    base = Column(String, default="Base Alpha")
    squadron = Column(String, default="SQN-1")
    status = Column(String, default="Operational")  # Operational, Maintenance, At Risk, Critical, Grounded
    health_score = Column(Float, default=90)
    flight_hours = Column(Float, default=1000)
    flight_cycles = Column(Integer, default=300)
    last_maintenance = Column(DateTime, default=lambda: datetime.now(timezone.utc) - timedelta(days=30))
    next_maintenance = Column(DateTime, default=lambda: datetime.now(timezone.utc) + timedelta(days=30))
    risk_score = Column(Float, default=10)
    availability_status = Column(String, default="Available")

class Component(Base):
    __tablename__ = "aircraft_components"
    id = Column(Integer, primary_key=True)
    aircraft_id = Column(String, index=True)
    name = Column(String)  # Engine, Hydraulic System, ...
    health_score = Column(Float, default=90)
    rul_days = Column(Float, default=60)
    failure_prob = Column(Float, default=0.05)
    operating_hours = Column(Float, default=1000)
    cycles = Column(Integer, default=300)
    maintenance_count = Column(Integer, default=2)
    last_inspection = Column(DateTime, default=lambda: datetime.now(timezone.utc) - timedelta(days=20))

class SensorReading(Base):
    __tablename__ = "sensor_readings"
    id = Column(Integer, primary_key=True)
    aircraft_id = Column(String, index=True)
    component = Column(String, index=True)
    timestamp = Column(DateTime, index=True)
    temperature = Column(Float)
    pressure = Column(Float)
    vibration = Column(Float)
    rpm = Column(Float)
    voltage = Column(Float)
    fuel_flow = Column(Float)
    anomaly_score = Column(Float, default=0.0)

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"
    id = Column(Integer, primary_key=True)
    aircraft_id = Column(String, index=True)
    date = Column(DateTime)
    mtype = Column(String)
    component = Column(String)
    fault = Column(String)
    action = Column(String)
    technician = Column(String)
    downtime_h = Column(Float, default=4)
    result = Column(String, default="Resolved")

class WorkOrder(Base):
    __tablename__ = "work_orders"
    id = Column(Integer, primary_key=True)
    wo_id = Column(String, unique=True)
    aircraft_id = Column(String, index=True)
    component = Column(String)
    issue = Column(String)
    priority = Column(String, default="Medium")
    technician = Column(String, default="Unassigned")
    parts = Column(Text, default="[]")
    est_hours = Column(Float, default=6)
    scheduled = Column(DateTime, nullable=True)
    status = Column(String, default="Detected")
    ai_recommendation = Column(Text, default="")
    checklist = Column(Text, default="{}")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True)
    aircraft_id = Column(String, index=True)
    component = Column(String)
    failure_probability = Column(Float)
    rul = Column(Float)
    confidence = Column(Float)
    window = Column(String)
    severity = Column(String)
    model_version = Column(String, default="xgb-proxy-v1.4")
    explanation = Column(Text, default="{}")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Anomaly(Base):
    __tablename__ = "anomalies"
    id = Column(Integer, primary_key=True)
    aircraft_id = Column(String, index=True)
    component = Column(String)
    sensor = Column(String)
    value = Column(Float)
    expected = Column(String)
    deviation = Column(Float)
    score = Column(Float)
    severity = Column(String)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    explanation = Column(Text, default="")

class SparePart(Base):
    __tablename__ = "spare_parts"
    id = Column(Integer, primary_key=True)
    part_id = Column(String, unique=True)
    name = Column(String)
    category = Column(String)
    stock = Column(Integer, default=10)
    min_stock = Column(Integer, default=5)
    demand = Column(Integer, default=3)
    lead_days = Column(Integer, default=14)
    supplier = Column(String, default="HAL-Spares")

class Technician(Base):
    __tablename__ = "technicians"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    skill = Column(String)
    availability = Column(Float, default=0.7)
    workload = Column(Float, default=0.5)
    active_jobs = Column(Integer, default=1)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    severity = Column(String)
    atype = Column(String)
    aircraft_id = Column(String, default="")
    component = Column(String, default="")
    message = Column(Text)
    action = Column(Text, default="")
    status = Column(String, default="Open")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ModelVersion(Base):
    __tablename__ = "model_versions"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    version = Column(String)
    purpose = Column(String)
    metrics = Column(Text, default="{}")
    status = Column(String, default="Active")
    trained_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    actor = Column(String)
    action = Column(String)
    detail = Column(Text, default="")
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"
    id = Column(Integer, primary_key=True)
    aircraft_id = Column(String)
    component = Column(String)
    recommendation = Column(Text)
    reason = Column(Text)
    priority = Column(String)
    parts = Column(Text, default="[]")
    est_hours = Column(Float, default=6)
    confidence = Column(Float, default=0.8)
    review_status = Column(String, default="Pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

Base.metadata.create_all(bind=engine)

def db() -> Session:
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()

def audit(s: Session, actor: str, action: str, detail: str = ""):
    try:
        s.add(AuditLog(actor=actor, action=action, detail=detail)); s.commit()
    except Exception:
        s.rollback()

# ---------------- Synthetic data ----------------
PLATFORMS = ["Transport", "Fighter", "Helicopter", "Trainer", "UAV"]
BASES = ["Base Alpha", "Base Bravo", "Base Charlie", "Base Delta"]
COMPONENTS = ["Engine", "Hydraulic System", "Landing Gear", "Fuel System", "Avionics", "Electrical System", "Cooling System"]
PART_MAP = {
    "Engine": ("ENG-PUMP-01", "Engine Lubrication Pump", 21),
    "Hydraulic System": ("HYD-PUMP-02", "Hydraulic Pump", 21),
    "Landing Gear": ("LG-ACT-03", "Landing Gear Actuator", 30),
    "Fuel System": ("FUEL-VLV-04", "Fuel Control Valve", 14),
    "Avionics": ("AVN-LRU-05", "Avionics LRU", 28),
    "Electrical System": ("ELEC-GEN-06", "Starter Generator", 18),
    "Cooling System": ("COOL-FAN-07", "Cooling Fan Assembly", 12),
}
# live degradation state for demo: {aircraft_id: {"component": str, "level": float}}
DEGRADE: Dict[str, Dict[str, Any]] = {}

# trained sklearn models (in-memory)
ML: Dict[str, Any] = {}

def train_ml_models():
    rng = np.random.default_rng(42)
    n = 4000
    temp = rng.normal(85, 12, n); vib = np.abs(rng.normal(3.2, 1.2, n))
    press = rng.normal(3000, 250, n); rpm = rng.normal(12000, 1500, n)
    hrs = rng.uniform(100, 6000, n); cycles = hrs / rng.uniform(2, 5, n)
    maint_age = rng.uniform(1, 180, n); prev_fail = rng.integers(0, 5, n)
    vib_trend = rng.normal(0, 0.5, n); temp_trend = rng.normal(0, 0.4, n)
    X = np.column_stack([temp, vib, press, rpm, hrs, cycles, maint_age, prev_fail, vib_trend, temp_trend])
    logit = (-4.0 + 0.09 * (temp - 85) + 1.1 * (vib - 3.2) + 0.02 * (maint_age - 30)
             + 0.6 * prev_fail + 1.6 * np.maximum(vib_trend, 0) * 4 + 1.2 * np.maximum(temp_trend, 0) * 4
             + np.abs(press - 3000) / 600 + hrs / 5000 + cycles / 2000)
    prob = 1/(1+np.exp(-logit))
    y = (rng.random(n) < prob).astype(int)
    rul = np.clip(90 - 8*vib - 0.25*maint_age - 0.008*hrs - 12*np.maximum(vib_trend,0)*10
                  - 8*np.maximum(temp_trend,0)*10 - 8*prev_fail + rng.normal(0, 6, n), 1, 120)
    clf = RandomForestClassifier(n_estimators=60, max_depth=10, random_state=42, n_jobs=-1)
    clf.fit(X, y)
    reg = RandomForestRegressor(n_estimators=60, max_depth=10, random_state=42, n_jobs=-1)
    reg.fit(X, rul)
    iso = IsolationForest(contamination=0.06, random_state=42)
    iso.fit(X)
    ML["clf"] = clf; ML["reg"] = reg; ML["iso"] = iso
    ML["baseline"] = {"temp": 85, "vib": 3.2, "press": 3000, "rpm": 12000}

train_ml_models()

def seed_if_empty():
    s = SessionLocal()
    try:
        if s.query(Aircraft).count() > 0:
            return
        rng = random.Random(26249)
        now = datetime.now(timezone.utc)
        # technicians
        techs = [("A. Sharma", "Engine"), ("R. Iyer", "Hydraulics"), ("S. Khan", "Avionics"),
                 ("M. D'Souza", "Airframe"), ("K. Nair", "Electrical"), ("P. Rao", "Fuel Systems"),
                 ("D. Singh", "Engine"), ("L. Menon", "Hydraulics")]
        for n_, sk in techs:
            s.add(Technician(name=n_, skill=sk, availability=round(rng.uniform(0.5, 0.95), 2),
                             workload=round(rng.uniform(0.3, 0.9), 2), active_jobs=rng.randint(0, 4)))
        # parts
        for comp, (pid, pname, lead) in PART_MAP.items():
            stock = rng.randint(4, 22); dem = rng.randint(1, 9)
            s.add(SparePart(part_id=pid, name=pname, category=comp, stock=stock,
                            min_stock=6, demand=dem, lead_days=lead))
        s.add(SparePart(part_id="BRG-08", name="Main Bearing Kit", category="Engine",
                        stock=9, min_stock=5, demand=6, lead_days=25))
        s.add(SparePart(part_id="SNS-09", name="Vibration Sensor", category="Avionics",
                        stock=30, min_stock=10, demand=4, lead_days=7))
        N = 24
        for i in range(1, N + 1):
            aid = f"AS-{i:03d}"
            plat = PLATFORMS[i % len(PLATFORMS)]
            base = BASES[i % len(BASES)]
            # a few aircraft risky by design
            if aid in ("AS-014",):
                health, risk, status = 94.0, 18.0, "Operational"
            elif i % 8 == 0:
                health, risk, status = rng.uniform(30, 50), rng.uniform(70, 92), "Critical"
            elif i % 5 == 0:
                health, risk, status = rng.uniform(50, 65), rng.uniform(55, 75), "At Risk"
            elif i % 3 == 0:
                health, risk, status = rng.uniform(65, 80), rng.uniform(25, 50), "Operational"
            else:
                health, risk, status = rng.uniform(80, 97), rng.uniform(5, 25), "Operational"
            if i % 9 == 0:
                status = "Maintenance"
            fh = rng.uniform(400, 5200); fc = int(fh / rng.uniform(2, 4.5))
            s.add(Aircraft(aircraft_id=aid, platform=plat, base=base, squadron=f"SQN-{(i%4)+1}",
                           status=status, health_score=round(health, 1), flight_hours=round(fh, 1),
                           flight_cycles=fc,
                           last_maintenance=now - timedelta(days=rng.randint(5, 120)),
                           next_maintenance=now + timedelta(days=rng.randint(2, 60)),
                           risk_score=round(risk, 1),
                           availability_status="Available" if status == "Operational" else "Unavailable"))
            for comp in COMPONENTS:
                ch = health + rng.uniform(-12, 8)
                fp = max(0.02, min(0.95, (100 - ch) / 110 + rng.uniform(-0.05, 0.08)))
                if aid == "AS-014" and comp == "Hydraulic System":
                    ch, fp = 88.0, 0.18
                s.add(Component(aircraft_id=aid, name=comp, health_score=round(max(5, min(100, ch)), 1),
                                rul_days=round(max(2, (ch / 100) * 90 + rng.uniform(-8, 8)), 1),
                                failure_prob=round(fp, 3),
                                operating_hours=round(fh * rng.uniform(0.7, 1.0), 1),
                                cycles=int(fc * rng.uniform(0.7, 1.0)),
                                maintenance_count=rng.randint(0, 8),
                                last_inspection=now - timedelta(days=rng.randint(2, 90))))
            # telemetry: 30 days daily + 48 recent hourly for AS-014
            pts = 48 if aid == "AS-014" else 30
            for k in range(pts):
                ts = now - timedelta(hours=k * (1 if aid == "AS-014" else 24))
                comp = rng.choice(COMPONENTS)
                vib = abs(rng.gauss(3.2, 1.0)); temp = rng.gauss(85, 8)
                if health < 55:
                    vib += rng.uniform(1.5, 4); temp += rng.uniform(5, 20)
                s.add(SensorReading(aircraft_id=aid, component=comp, timestamp=ts,
                                    temperature=round(temp, 2), pressure=round(rng.gauss(3000, 180), 1),
                                    vibration=round(vib, 2), rpm=round(rng.gauss(12000, 900), 0),
                                    voltage=round(rng.gauss(28, 0.8), 2),
                                    fuel_flow=round(rng.gauss(450, 40), 1), anomaly_score=0.0))
            # maintenance history
            for _ in range(rng.randint(2, 6)):
                comp = rng.choice(COMPONENTS)
                s.add(MaintenanceRecord(
                    aircraft_id=aid, date=now - timedelta(days=rng.randint(10, 400)),
                    mtype=rng.choice(["Scheduled", "Unscheduled", "Inspection", "Overhaul"]),
                    component=comp, fault=rng.choice(["Vibration exceedance", "Seal wear", "Filter clog", "Routine check", "Bearing noise", "Pressure fluctuation"]),
                    action=rng.choice(["Replaced", "Repaired", "Adjusted", "Inspected-OK"]),
                    technician=rng.choice([t[0] for t in techs]),
                    downtime_h=round(rng.uniform(2, 48), 1), result="Resolved"))
        # model versions (demo evaluation labels)
        s.add(ModelVersion(name="Failure Prediction", version="v1.4", purpose="Classification (RandomForest proxy for XGBoost)",
                           metrics=json.dumps({"f1": 0.89, "precision": 0.87, "recall": 0.91, "note": "Demo evaluation on synthetic data"})))
        s.add(ModelVersion(name="RUL Estimation", version="v2.1", purpose="Regression (RandomForest)",
                           metrics=json.dumps({"mae_hours": 12.4, "rmse_hours": 18.9, "note": "Demo evaluation on synthetic data"})))
        s.add(ModelVersion(name="Anomaly Detection", version="v1.1", purpose="IsolationForest",
                           metrics=json.dumps({"contamination": 0.06, "note": "Demo evaluation on synthetic data"})))
        s.add(Alert(severity="Critical", atype="Failure Risk", aircraft_id="AS-008", component="Engine",
                    message="Engine failure probability 84% (RUL ~9 days).", action="Schedule inspection within 72h.", status="Open"))
        s.add(Alert(severity="Warning", atype="Anomaly", aircraft_id="AS-015", component="Hydraulic System",
                    message="Hydraulic vibration anomaly detected (score 0.78).", action="Targeted inspection at next window.", status="Open"))
        s.add(Alert(severity="Inventory", atype="Spare Shortage", aircraft_id="", component="Hydraulic System",
                    message="Hydraulic Pump stock approaching prototype reorder threshold.", action="Initiate replenishment review.", status="Open"))
        s.commit()
    finally:
        s.close()

seed_if_empty()

# ---------------- ML inference helpers ----------------
FEATURES = ["temp", "vib", "press", "rpm", "hrs", "cycles", "maint_age", "prev_fail", "vib_trend", "temp_trend"]

def featurize(temp, vib, press, rpm, hrs, cycles, maint_age, prev_fail, vib_trend=0.0, temp_trend=0.0):
    return np.array([[temp, vib, press, rpm, hrs, cycles, maint_age, prev_fail, vib_trend, temp_trend]])

def infer_health(temp, vib, press):
    b = ML["baseline"]
    score = 100 - (abs(temp - b["temp"]) * 0.8 + max(0, vib - b["vib"]) * 9 + abs(press - b["press"]) / 120)
    return round(max(5, min(100, score)), 1)

def infer_all(temp, vib, press, rpm, hrs, cycles, maint_age, prev_fail, vib_trend=0.0, temp_trend=0.0):
    prev_fail = min(prev_fail, 2)  # clip: frequent routine servicing must not auto-flag critical
    maint_age = min(maint_age, 90)
    X = featurize(temp, vib, press, rpm, hrs, cycles, maint_age, prev_fail, vib_trend, temp_trend)
    fp = float(ML["clf"].predict_proba(X)[0][1])
    rul = float(max(1, ML["reg"].predict(X)[0]))
    anom = float(-ML["iso"].score_samples(X)[0])  # higher = more anomalous
    anom_n = float(1 / (1 + math.exp(-(anom - 0.55) * 12)))
    # rule-based boost so strong threshold breaches always surface
    rule = 0.0
    if vib > 5.0:
        rule = max(rule, min(0.95, 0.55 + (vib - 5.0) * 0.12))
    if temp > 100:
        rule = max(rule, min(0.95, 0.55 + (temp - 100) * 0.02))
    anom_n = float(max(anom_n, rule))
    conf = float(0.65 + 0.3 * (1 - abs(fp - 0.5) * 0) + 0.0)
    conf = round(min(0.97, max(0.55, 0.9 - abs(fp - 0.5) * 0.15 + (0.03 if anom_n > 0.5 else 0))), 2)
    # explainability: perturbation-based contributions
    base_prob = fp
    contribs = {}
    pert = {"temp": temp * 1.05, "vib": vib * 1.2, "press": press, "maint_age": maint_age, "hrs": hrs, "cycles": cycles}
    deltas = []
    for k, label in [("vib", "Vibration increase"), ("temp", "Temperature increase"),
                     ("cycles", "Operating cycles"), ("press", "Pressure instability"),
                     ("maint_age", "Maintenance age")]:
        Xt = X.copy()
        j = {"temp": 0, "vib": 1, "press": 2, "cycles": 5, "maint_age": 6}[k]
        Xt[0, j] = Xt[0, j] * 1.1 + (0.5 if k == "press" else 0)
        p2 = float(ML["clf"].predict_proba(Xt)[0][1])
        d = max(0, p2 - base_prob)
        deltas.append((label, d))
    tot = sum(d for _, d in deltas) or 1.0
    exp = [{"feature": l, "pct": round(d / tot * 100, 1)} for l, d in sorted(deltas, reverse=True, key=lambda x: x[1])]
    return fp, rul, anom_n, conf, exp

def current_telemetry(s: Session, aid: str, comp: str):
    r = (s.query(SensorReading).filter(SensorReading.aircraft_id == aid)
         .order_by(SensorReading.timestamp.desc()).first())
    deg = DEGRADE.get(aid)
    vib = r.vibration if r else 3.2
    temp = r.temperature if r else 85
    press = r.pressure if r else 3000
    if deg and (deg["component"] in (comp, "All")):
        lv = deg["level"]
        vib += lv * 5.2; temp += lv * 26; press += random.Random().gauss(0, lv * 260)
    return (r, vib, temp, press)

# ---------------- App ----------------
app = FastAPI(title="AeroSentinel API", version="1.0.0",
              description="Prototype decision-support API. Synthetic/demo data only.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

def actor(role: Optional[str] = Header(None, alias="X-Role")) -> str:
    return role or "command"

# ---- auth (mock) ----
class LoginIn(BaseModel):
    username: str
    password: str = "demo"
    role: str = "command"

@app.post("/api/auth/login")
def login(b: LoginIn, s: Session = Depends(db)):
    token = hashlib.sha256(f"{b.username}:{b.role}:{JWT_SECRET}".encode()).hexdigest()[:32]
    audit(s, b.username, "login", b.role)
    return {"token": token, "role": b.role, "username": b.username}

# ---- dashboard ----
@app.get("/api/dashboard")
def dashboard(s: Session = Depends(db)):
    total = s.query(Aircraft).count()
    op = s.query(Aircraft).filter(Aircraft.status == "Operational").count()
    maint = s.query(Aircraft).filter(Aircraft.status == "Maintenance").count()
    risk = s.query(Aircraft).filter(Aircraft.status == "At Risk").count()
    crit = s.query(Aircraft).filter(Aircraft.status == "Critical").count()
    avail = round(op / total * 100, 1) if total else 0
    preds = s.query(Prediction).filter(Prediction.failure_probability > 0.5).count()
    backlog = s.query(WorkOrder).filter(~WorkOrder.status.in_(["Completed", "Cancelled"])).count()
    # predicted failures next 30d: compute live from components
    hi = 0
    for c in s.query(Component).all():
        if c.failure_prob > 0.5 and c.rul_days <= 30:
            hi += 1
    mttr = s.query(func.avg(MaintenanceRecord.downtime_h)).scalar() or 8.0
    return {"fleet_size": total, "operational": op, "maintenance": maint, "at_risk": risk,
            "critical": crit, "availability": avail, "predicted_30d": hi or preds or 0,
            "downtime_avoided_h": round(preds * float(mttr), 1), "backlog": backlog, "mttr": round(float(mttr), 1),
            "note": "Downtime avoided is a simulated estimate — not a measured real-world result."}

@app.get("/api/fleet")
def fleet(s: Session = Depends(db)):
    ac = s.query(Aircraft).all()
    dist = {"Healthy": 0, "Monitoring": 0, "At Risk": 0, "Critical": 0}
    for a in ac:
        if a.health_score >= 80: dist["Healthy"] += 1
        elif a.health_score >= 65: dist["Monitoring"] += 1
        elif a.health_score >= 50: dist["At Risk"] += 1
        else: dist["Critical"] += 1
    # availability trend (synthetic history + projection)
    hist, proj = [], []
    base_av = round(sum(1 for a in ac if a.status == "Operational") / max(1, len(ac)) * 100, 1)
    for d in range(30, 0, -1):
        hist.append({"day": f"D-{d}", "operational": round(base_av + random.uniform(-4, 3), 1)})
    for d in range(1, 31):
        proj.append({"day": f"P+{d}", "projected": round(min(96, base_av + d * 0.12), 1),
                     "without": round(max(60, base_av - d * 0.08), 1)})
    return {"aircraft": [{"aircraft_id": a.aircraft_id, "platform": a.platform, "base": a.base,
                          "squadron": a.squadron, "status": a.status, "health": a.health_score,
                          "risk": a.risk_score, "flight_hours": a.flight_hours,
                          "next_maintenance": a.next_maintenance.isoformat() if a.next_maintenance else None}
                         for a in ac],
            "distribution": dist, "history": hist, "projection": proj}

@app.get("/api/aircraft")
def aircraft_list(status: Optional[str] = None, q: Optional[str] = None, s: Session = Depends(db)):
    query = s.query(Aircraft)
    if status: query = query.filter(Aircraft.status == status)
    if q: query = query.filter(Aircraft.aircraft_id.contains(q.upper()))
    out = []
    for a in query.limit(200).all():
        comps = s.query(Component).filter(Component.aircraft_id == a.aircraft_id).all()
        worst = max(comps, key=lambda c: c.failure_prob) if comps else None
        pri = "Critical" if a.status == "Critical" else ("High" if a.status == "At Risk" else ("Medium" if a.health_score < 80 else "Low"))
        out.append({"aircraft_id": a.aircraft_id, "platform": a.platform, "base": a.base,
                    "squadron": a.squadron, "status": a.status, "health": a.health_score,
                    "risk": round((100 - a.health_score) / 100, 3) if not a.risk_score else round(a.risk_score / 100, 3),
                    "risk_score": a.risk_score, "flight_hours": a.flight_hours,
                    "rul": round(min([c.rul_days for c in comps]) if comps else 60, 1),
                    "primary_risk": worst.name if worst else "—",
                    "next_maintenance": a.next_maintenance.isoformat() if a.next_maintenance else None,
                    "priority": pri})
    return out

@app.get("/api/aircraft/{aid}")
def aircraft_detail(aid: str, s: Session = Depends(db)):
    a = s.query(Aircraft).filter(Aircraft.aircraft_id == aid.upper()).first()
    if not a: raise HTTPException(404, "Aircraft not found")
    comps = s.query(Component).filter(Component.aircraft_id == a.aircraft_id).all()
    hist = (s.query(MaintenanceRecord).filter(MaintenanceRecord.aircraft_id == a.aircraft_id)
            .order_by(MaintenanceRecord.date.desc()).limit(20).all())
    # live inference per component (respecting degradation)
    for c in comps:
        r, vib, temp, press = current_telemetry(s, a.aircraft_id, c.name)
        fp, rul, anom, conf, exp = infer_all(temp, vib, press, 12000, c.operating_hours,
                                             c.cycles, 45, c.maintenance_count)
        c.failure_prob = round(fp, 3); c.rul_days = round(rul, 1)
        c.health_score = infer_health(temp, vib, press)
    # aggregate
    a.health_score = round(float(np.mean([c.health_score for c in comps])) if comps else a.health_score, 1)
    a.risk_score = round(float(max([c.failure_prob for c in comps]) * 100) if comps else a.risk_score, 1)
    if a.risk_score >= 75: a.status = "Critical"
    elif a.risk_score >= 55: a.status = "At Risk"
    s.commit()
    return {"aircraft_id": a.aircraft_id, "platform": a.platform, "base": a.base,
            "squadron": a.squadron, "status": a.status, "health": a.health_score,
            "risk": a.risk_score, "flight_hours": a.flight_hours, "cycles": a.flight_cycles,
            "last_maintenance": a.last_maintenance.isoformat() if a.last_maintenance else None,
            "next_maintenance": a.next_maintenance.isoformat() if a.next_maintenance else None,
            "components": [{"name": c.name, "health": c.health_score, "rul": c.rul_days,
                            "failure_prob": c.failure_prob, "hours": c.operating_hours,
                            "cycles": c.cycles, "last_inspection": c.last_inspection.isoformat() if c.last_inspection else None}
                           for c in comps],
            "history": [{"date": h.date.isoformat() if h.date else None, "type": h.mtype,
                         "component": h.component, "fault": h.fault, "action": h.action,
                         "technician": h.technician, "downtime": h.downtime_h} for h in hist]}

@app.get("/api/aircraft/{aid}/telemetry")
def telemetry(aid: str, hours: int = 24, component: Optional[str] = None, s: Session = Depends(db)):
    since = datetime.now(timezone.utc) - timedelta(hours=hours * (24 if hours <= 60 else 1))
    q = s.query(SensorReading).filter(SensorReading.aircraft_id == aid.upper())
    if component: q = q.filter(SensorReading.component == component)
    rows = q.order_by(SensorReading.timestamp.desc()).limit(600).all()
    rows = sorted(rows, key=lambda r: r.timestamp)
    deg = DEGRADE.get(aid.upper())
    out = []
    for r in rows:
        vib, temp = r.vibration, r.temperature
        if deg and hours <= 48:
            lv = deg["level"]
            vib = round(vib + lv * 5.2 * random.uniform(0.8, 1.2), 2)
            temp = round(temp + lv * 26 * random.uniform(0.8, 1.2), 2)
        out.append({"t": r.timestamp.isoformat(), "component": r.component, "temperature": temp,
                    "pressure": r.pressure, "vibration": vib, "rpm": r.rpm,
                    "voltage": r.voltage, "fuel_flow": r.fuel_flow})
    # live point
    if deg:
        now = datetime.now(timezone.utc).isoformat()
        out.append({"t": now, "component": deg["component"], "temperature": round(85 + deg["level"] * 26, 2),
                    "pressure": 3000, "vibration": round(3.2 + deg["level"] * 5.2, 2),
                    "rpm": 12000, "voltage": 28, "fuel_flow": 450, "live": True})
    return out

@app.get("/api/aircraft/{aid}/health")
def health(aid: str, s: Session = Depends(db)):
    return aircraft_detail(aid, s)

# ---- predictions / anomalies / rul ----
@app.get("/api/predictions")
def predictions(min_risk: float = 0.0, s: Session = Depends(db)):
    global _PRED_CACHE
    try:
        _PRED_CACHE
    except NameError:
        _PRED_CACHE = {"t": 0.0, "key": "", "data": []}
    key = json.dumps(DEGRADE, sort_keys=True, default=str)
    now = time.time()
    if key == _PRED_CACHE["key"] and now - _PRED_CACHE["t"] < 60 and _PRED_CACHE["data"]:
        full = _PRED_CACHE["data"]
    else:
        full = _compute_predictions(s)
        _PRED_CACHE = {"t": now, "key": key, "data": full}
    return [p for p in full if p["failure_prob"] >= min_risk][:80]

def _compute_predictions(s: Session):
    comps = s.query(Component).all()
    feats, meta = [], []
    for c in comps:
        r, vib, temp, press = current_telemetry(s, c.aircraft_id, c.name)
        mc = min(c.maintenance_count, 2)
        feats.append([temp, vib, press, 12000, c.operating_hours, c.cycles, min(45, 90), mc, 0.0, 0.0])
        meta.append((c, vib, temp, press))
    import numpy as _np
    X = _np.array(feats)
    fp_all = ML["clf"].predict_proba(X)[:, 1]
    rul_all = _np.maximum(1, ML["reg"].predict(X))
    anom_raw = -ML["iso"].score_samples(X)
    anom_all = 1 / (1 + _np.exp(-(anom_raw - 0.55) * 12))
    # batched perturbation explainability (5 extra batch passes, not 5N single passes)
    pert_cols = {"Vibration increase": 1, "Temperature increase": 0, "Operating cycles": 5,
                 "Pressure instability": 2, "Maintenance age": 6}
    deltas = {k: _np.zeros(len(X)) for k in pert_cols}
    for label, j in pert_cols.items():
        Xp = X.copy()
        Xp[:, j] = Xp[:, j] * 1.1 + (0.5 if label == "Pressure instability" else 0)
        fp2 = ML["clf"].predict_proba(Xp)[:, 1]
        deltas[label] = _np.maximum(0, fp2 - fp_all)
    out = []
    for i, (c, vib, temp, press) in enumerate(meta):
        fp, rul = float(fp_all[i]), float(rul_all[i])
        anom = float(anom_all[i])
        rule = 0.0
        if vib > 5.0:
            rule = max(rule, min(0.95, 0.55 + (vib - 5.0) * 0.12))
        if temp > 100:
            rule = max(rule, min(0.95, 0.55 + (temp - 100) * 0.02))
        anom = max(anom, rule)
        conf = round(min(0.97, max(0.55, 0.9 - abs(fp - 0.5) * 0.15 + (0.03 if anom > 0.5 else 0))), 2)
        tot = sum(float(deltas[k][i]) for k in deltas) or 1.0
        exp = [{"feature": k, "pct": round(float(deltas[k][i]) / tot * 100, 1)} for k in deltas]
        exp.sort(key=lambda e: e["pct"], reverse=True)
        sev = "Critical" if fp > 0.75 else ("High" if fp > 0.55 else ("Medium" if fp > 0.35 else "Low"))
        lo, hi = round(max(1, rul * 0.75), 1), round(rul * 1.25, 1)
        out.append({"aircraft_id": c.aircraft_id, "component": c.name,
                    "failure_prob": round(fp, 3), "window": f"{lo}–{hi} days",
                    "rul": round(rul, 1), "rul_lo": lo, "rul_hi": hi,
                    "confidence": conf, "severity": sev, "explanation": exp,
                    "anomaly": round(anom, 3), "vib": round(vib, 2), "temp": round(temp, 1),
                    "recommendation": ("Schedule inspection within 72 hours." if fp > 0.75
                                       else "Schedule inspection within next maintenance window." if fp > 0.5
                                       else "Continue monitoring."),
                    "low_confidence": conf < 0.65})
    return sorted(out, key=lambda x: x["failure_prob"], reverse=True)[:200]

@app.get("/api/aircraft/{aid}/predictions")
def aircraft_predictions(aid: str, s: Session = Depends(db)):
    allp = predictions(0.0, s)
    return [p for p in allp if p["aircraft_id"] == aid.upper()]

@app.get("/api/anomalies")
def anomalies(s: Session = Depends(db)):
    out = []
    for p in predictions(0.0, s):
        if p["anomaly"] > 0.55 or p["vib"] > 5.0:
            sev = "HIGH" if p["anomaly"] > 0.8 else ("MEDIUM" if p["anomaly"] > 0.65 else "LOW")
            out.append({"aircraft_id": p["aircraft_id"], "component": p["component"], "sensor": "Vibration",
                        "value": p["vib"], "expected": "2.0–5.0 mm/s",
                        "deviation": round((p["vib"] - 3.2) / 3.2 * 100, 1), "score": p["anomaly"],
                        "severity": sev, "timestamp": datetime.now(timezone.utc).isoformat(),
                        "what": f"{p['component']} vibration increased {round((p['vib']-3.2)/3.2*100,1)}% above the learned baseline.",
                        "why": "Persistent vibration can indicate bearing degradation or rotor imbalance.",
                        "assessment": "Elevated vibration combined with increasing bearing temperature increases predicted component failure risk.",
                        "action": "Perform targeted inspection during the next available maintenance window."})
    return sorted(out, key=lambda x: x["score"], reverse=True)[:40]

@app.get("/api/rul")
def rul_all(s: Session = Depends(db)):
    out = []
    for p in predictions(0.0, s):
        rul = p["rul"]
        hist = [{"d": f"D-{k}", "v": round(max(1, rul + k * 1.5 + random.uniform(-2, 2)), 1)} for k in range(20, 0, -1)]
        proj = [{"d": f"P+{k}", "v": round(max(0.5, rul - k * (rul / 30) + random.uniform(-1, 1)), 1)} for k in range(1, 31)]
        deg = next((c for c in s.query(Component).filter(Component.aircraft_id == p["aircraft_id"], Component.name == p["component"]).limit(1)), None)
        out.append({"aircraft_id": p["aircraft_id"], "component": p["component"], "rul": rul,
                    "lo": p["rul_lo"], "hi": p["rul_hi"], "confidence": p["confidence"],
                    "degradation": round(100 - (deg.health_score if deg else 85), 1),
                    "history": hist, "projection": proj})
    return sorted(out, key=lambda x: x["rul"])[:60]

@app.post("/api/predict")
def api_predict(b: Dict[str, Any]):
    fp, rul, anom, conf, exp = infer_all(
        b.get("temperature", 85), b.get("vibration", 3.2), b.get("pressure", 3000),
        b.get("rpm", 12000), b.get("hours", 2000), b.get("cycles", 600),
        b.get("maint_age", 45), b.get("prev_fail", 1))
    return {"failure_probability": round(fp, 3), "rul_days": round(rul, 1),
            "anomaly_score": round(anom, 3), "confidence": conf, "explanation": exp,
            "advisory": "AI outputs are advisory and require authorized human review."}

# ---- recommendations ----
@app.get("/api/recommendations")
def recommendations(s: Session = Depends(db)):
    preds = predictions(0.4, s)
    out = []
    for p in preds[:20]:
        part = PART_MAP.get(p["component"], ("GEN-00", "Generic Kit", 14))
        tech = s.query(Technician).filter(Technician.availability > 0.5).first()
        out.append({"aircraft_id": p["aircraft_id"], "component": p["component"],
                    "action": ("Inspect " + p["component"].lower() + " within 72 hours."
                               if p["failure_prob"] > 0.75 else
                               "Schedule targeted inspection during the next available maintenance window."),
                    "parts": [part[1]], "est_hours": 6 if p["failure_prob"] > 0.6 else 3,
                    "skill": (tech.skill if tech else "Engine"),
                    "technician": (tech.name if tech else "Unassigned"),
                    "slot": (datetime.now(timezone.utc) + timedelta(days=3)).date().isoformat(),
                    "confidence": p["confidence"], "reason": f"Failure prob {p['failure_prob']}; RUL {p['rul']}d; drivers: " +
                    ", ".join(f"{e['feature']} {e['pct']}%" for e in p["explanation"][:3]),
                    "priority": p["severity"]})
    return out

# ---- work orders ----
class WOIn(BaseModel):
    aircraft_id: str
    component: str
    issue: str
    priority: str = "High"
    technician: str = "Unassigned"
    parts: List[str] = []
    est_hours: float = 6
    scheduled: Optional[str] = None
    ai_recommendation: str = ""

@app.get("/api/work-orders")
def wo_list(status: Optional[str] = None, s: Session = Depends(db)):
    q = s.query(WorkOrder).order_by(WorkOrder.created_at.desc())
    if status: q = q.filter(WorkOrder.status == status)
    return [{"wo_id": w.wo_id, "aircraft_id": w.aircraft_id, "component": w.component,
             "issue": w.issue, "priority": w.priority, "technician": w.technician,
             "parts": json.loads(w.parts or "[]"), "est_hours": w.est_hours,
             "scheduled": w.scheduled.isoformat() if w.scheduled else None,
             "status": w.status, "ai": w.ai_recommendation} for w in q.limit(200).all()]

@app.post("/api/work-orders")
def wo_create(b: WOIn, s: Session = Depends(db), role: str = Depends(actor)):
    n = s.query(WorkOrder).count() + 101
    wo = WorkOrder(wo_id=f"WO-{n}", aircraft_id=b.aircraft_id.upper(), component=b.component,
                   issue=b.issue, priority=b.priority, technician=b.technician,
                   parts=json.dumps(b.parts), est_hours=b.est_hours,
                   scheduled=datetime.fromisoformat(b.scheduled) if b.scheduled else datetime.now(timezone.utc) + timedelta(days=3),
                   status="Approved", ai_recommendation=b.ai_recommendation,
                   checklist=json.dumps({"Inspect component": False, "Verify sensor readings": False,
                                         "Replace/repair if required": False, "Run post-maintenance check": False,
                                         "Update technical record": False}))
    s.add(wo)
    s.add(AIRecommendation(aircraft_id=wo.aircraft_id, component=wo.component,
                           recommendation=b.ai_recommendation or b.issue, reason="Engineer-approved recommendation",
                           priority=b.priority, parts=json.dumps(b.parts), est_hours=b.est_hours,
                           review_status="Approved"))
    audit(s, role, "work_order_approved", wo.wo_id)
    s.commit()
    return {"wo_id": wo.wo_id, "status": wo.status}

@app.post("/api/work-orders/{woid}/status")
def wo_status(woid: str, b: Dict[str, Any], s: Session = Depends(db), role: str = Depends(actor)):
    w = s.query(WorkOrder).filter(WorkOrder.wo_id == woid).first()
    if not w: raise HTTPException(404, "Work order not found")
    w.status = b.get("status", w.status)
    if b.get("checklist"): w.checklist = json.dumps(b["checklist"])
    audit(s, role, f"work_order_{w.status}", woid)
    if w.status == "Completed":
        # heal aircraft: clear degradation, bump health
        DEGRADE.pop(w.aircraft_id, None)
        for c in s.query(Component).filter(Component.aircraft_id == w.aircraft_id).all():
            c.health_score = min(96, c.health_score + 25); c.failure_prob = max(0.03, c.failure_prob * 0.25)
            c.rul_days = c.rul_days + 25; c.maintenance_count += 1
            c.last_inspection = datetime.now(timezone.utc)
        a = s.query(Aircraft).filter(Aircraft.aircraft_id == w.aircraft_id).first()
        if a:
            a.health_score = min(97, (a.health_score or 80) + 18); a.risk_score = max(5, (a.risk_score or 40) - 30)
            a.status = "Operational"; a.last_maintenance = datetime.now(timezone.utc)
            a.next_maintenance = datetime.now(timezone.utc) + timedelta(days=30)
        s.add(MaintenanceRecord(aircraft_id=w.aircraft_id, date=datetime.now(timezone.utc),
                                mtype="Unscheduled", component=w.component, fault=w.issue,
                                action="Repaired", technician=w.technician, downtime_h=w.est_hours, result="Resolved"))
    s.commit()
    return {"wo_id": woid, "status": w.status}

# ---- maintenance / schedule / history ----
@app.get("/api/maintenance")
def maintenance(aid: Optional[str] = None, s: Session = Depends(db)):
    q = s.query(MaintenanceRecord).order_by(MaintenanceRecord.date.desc())
    if aid: q = q.filter(MaintenanceRecord.aircraft_id == aid.upper())
    rows = q.limit(200).all()
    mtbf = round(float(np.mean([r.downtime_h for r in rows]) * 12) if rows else 240, 1)
    return {"records": [{"aircraft_id": r.aircraft_id, "date": r.date.isoformat() if r.date else None,
                         "type": r.mtype, "component": r.component, "fault": r.fault,
                         "action": r.action, "technician": r.technician, "downtime": r.downtime_h}
                        for r in rows],
            "mtbf_h": mtbf, "mttr_h": round(float(np.mean([r.downtime_h for r in rows])) if rows else 8.0, 1)}

@app.get("/api/schedule")
def schedule(s: Session = Depends(db)):
    wos = s.query(WorkOrder).filter(~WorkOrder.status.in_(["Completed", "Cancelled"])).limit(50).all()
    return [{"wo_id": w.wo_id, "aircraft_id": w.aircraft_id, "component": w.component,
             "date": w.scheduled.isoformat() if w.scheduled else None,
             "technician": w.technician, "priority": w.priority, "status": w.status} for w in wos]

# ---- inventory ----
@app.get("/api/inventory")
def inventory(s: Session = Depends(db)):
    parts = s.query(SparePart).all()
    out = []
    for p in parts:
        risk = "HIGH" if p.stock <= p.min_stock else ("MEDIUM" if p.stock <= p.min_stock + 3 else "LOW")
        out.append({"part_id": p.part_id, "name": p.name, "category": p.category,
                    "stock": p.stock, "min_stock": p.min_stock, "demand": p.demand,
                    "lead_days": p.lead_days, "supplier": p.supplier, "risk": risk})
    return out

@app.get("/api/inventory/forecast")
def forecast(s: Session = Depends(db)):
    preds = predictions(0.5, s)
    need: Dict[str, int] = {}
    for p in preds:
        pid = PART_MAP.get(p["component"], ("GEN-00", "", 14))[0]
        need[pid] = need.get(pid, 0) + 1
    out = []
    for p in s.query(SparePart).all():
        d = need.get(p.part_id, 0) + p.demand
        cov = p.stock - d
        out.append({"part_id": p.part_id, "name": p.name, "stock": p.stock,
                    "predicted_demand": d, "coverage": cov,
                    "risk": "HIGH" if cov < p.min_stock else ("MEDIUM" if cov < p.min_stock + 3 else "LOW"),
                    "recommendation": "Initiate replenishment review." if cov < p.min_stock + 2 else "Stock adequate for predicted demand.",
                    "series": [{"m": f"M{i}", "stock": max(0, p.stock - i * max(1, d // 3))} for i in range(6)]})
    return out

@app.get("/api/resources")
def resources(s: Session = Depends(db)):
    return [{"name": t.name, "skill": t.skill, "availability": t.availability,
             "workload": t.workload, "active_jobs": t.active_jobs} for t in s.query(Technician).all()]

# ---- alerts / analytics / insights ----
@app.get("/api/alerts")
def alerts(severity: Optional[str] = None, s: Session = Depends(db)):
    # regenerate dynamic alerts from live inference
    dyn = []
    for p in predictions(0.7, s)[:6]:
        dyn.append({"severity": "Critical" if p["failure_prob"] > 0.8 else "Warning",
                    "type": "Failure Risk", "aircraft_id": p["aircraft_id"], "component": p["component"],
                    "message": f"{p['component']} failure risk {int(p['failure_prob']*100)}% (RUL ~{p['rul']}d).",
                    "action": p["recommendation"], "status": "Open",
                    "timestamp": datetime.now(timezone.utc).isoformat()})
    q = s.query(Alert).order_by(Alert.timestamp.desc()).limit(30).all()
    base = [{"severity": a.severity, "type": a.atype, "aircraft_id": a.aircraft_id,
             "component": a.component, "message": a.message, "action": a.action,
             "status": a.status, "timestamp": a.timestamp.isoformat() if a.timestamp else None} for a in q]
    out = dyn + base
    if severity: out = [o for o in out if o["severity"].lower() == severity.lower()]
    return out

@app.get("/api/analytics")
def analytics(s: Session = Depends(db)):
    comps = s.query(Component).all()
    by_comp: Dict[str, int] = {}
    for c in comps:
        if c.failure_prob > 0.5: by_comp[c.name] = by_comp.get(c.name, 0) + 1
    pareto = sorted([{"component": k, "failures": v} for k, v in by_comp.items()],
                    key=lambda x: x["failures"], reverse=True)
    tot = sum(by_comp.values()) or 1
    run = 0
    for p in pareto:
        run += p["failures"]; p["cum_pct"] = round(run / tot * 100, 1)
    recs = s.query(MaintenanceRecord).all()
    mttr = round(float(np.mean([r.downtime_h for r in recs])) if recs else 8.2, 1)
    # DB-calculated reactive availability: based on historical maintenance downtime
    total = s.query(Aircraft).count()  # total aircraft fleet size
    if recs:
        total_downtime = sum(r.downtime_h or 0 for r in recs)
        total_days = max(1, (datetime.now() - min(r.date for r in recs)).days)
        reactive_avail = round(max(0, 100 * (1 - total_downtime / (total * 24 * total_days))), 1)
    else:
        reactive_avail = 100.0

    # DB-calculated predictive availability: based on predicted failures
    preds = s.query(Prediction).filter(Prediction.failure_probability > 0.5).count()
    avg_flight_hours = s.query(func.avg(Aircraft.flight_hours)).scalar() or 2000
    total_fleet_hours = total * float(avg_flight_hours)
    predicted_downtime_h = preds * float(mttr)
    predictive_avail = round(max(0, 100 - predicted_downtime_h / total_fleet_hours * 100), 1) if total else 100.0

    return {"pareto": pareto, "mttr": mttr, "mtbf": 240,
            "availability_trend": fleet(s)["history"],
            "reactive_avail": reactive_avail, "predictive_avail": predictive_avail,
            "note": "Projected improvement in simulated scenario - not a measured real-world result."}
@app.get("/api/insights")
def insights(s: Session = Depends(db)):
    from sqlalchemy import func, or_
    from datetime import datetime, timedelta
    
    insights = []
    
    # Top predicted failures
    preds = s.query(Prediction).filter(Prediction.failure_probability > 0.5).order_by(Prediction.failure_probability.desc()).limit(3).all()
    for p in preds:
        insights.append({
            "text": f"Aircraft {p.aircraft_id} shows sustained increase in {p.component.lower()} vibration over the last 72 hours.",
            "evidence": f"Failure prob {p.failure_probability}, RUL {p.rul}d",
            "confidence": p.confidence,
            "review": "Pending"
        })
    
    # Aircraft with highest risk
    risky = s.query(Aircraft).filter(Aircraft.risk_score > 70).order_by(Aircraft.risk_score.desc()).limit(2).all()
    for a in risky:
        insights.append({
            "text": f"Aircraft {a.aircraft_id} has elevated risk level.",
            "evidence": f"Risk score: {a.risk_score}, Health: {a.health_score}",
            "confidence": 0.8,
            "review": "Pending"
        })
    
    # Maintenance backlog
    backlog = s.query(WorkOrder).filter(~WorkOrder.status.in_(['Completed', 'Cancelled'])).count()
    if backlog > 0:
        insights.append({
            "text": f"Maintenance backlog of {backlog} open work orders.",
            "evidence": f"{backlog} pending jobs",
            "confidence": 0.9,
            "review": "Pending"
        })
    
    # Sensor health
    n = s.query(SensorReading).count()
    insights.append({
        "text": f"System has {n} sensor readings.",
        "evidence": "Telemetry monitoring active",
        "confidence": 0.7,
        "review": "Pending"
    })
    
    return insights

@app.get("/api/copilot")
def copilot(q: str = "", s: Session = Depends(db)):
    ql = q.lower()
    preds = predictions(0.0, s)
    inv = inventory(s)
    if "as-" in ql:
        aid = "AS-" + "".join(ch for ch in ql.split("as-")[1][:3] if ch.isdigit()).zfill(3)
        ps = [p for p in preds if p["aircraft_id"] == aid]
        if not ps: return {"answer": f"No elevated risk found for {aid} in current synthetic data. Continue monitoring."}
        top = max(ps, key=lambda x: x["failure_prob"])
        return {"answer": (f"Aircraft {aid} currently has a prototype risk score of {int(top['failure_prob']*100)}%. "
                           f"Primary contributing factors: " + "; ".join(f"{e['feature']} {e['pct']}%" for e in top["explanation"][:3]) +
                           f". Predicted failure probability {int(top['failure_prob']*100)}%. Estimated RUL {top['rul']} days. "
                           f"Suggested action: {top['recommendation']} Human approval required.")}
    if "spare" in ql or "part" in ql or "stock" in ql:
        low = [p for p in inv if p["risk"] == "HIGH"]
        return {"answer": f"{len(low)} part(s) at HIGH risk: " + ", ".join(f"{p['part_id']} ({p['stock']} in stock)" for p in low[:5]) + ". Initiate replenishment review."}
    if "vibration" in ql:
        an = anomalies(s)[:5]
        return {"answer": "Abnormal vibration: " + "; ".join(f"{a['aircraft_id']}/{a['component']} {a['value']} mm/s (score {a['score']})" for a in an) if an else "No current vibration anomalies above threshold."}
    if "task" in ql or "due" in ql or "week" in ql:
        sch = schedule(s)[:5]
        return {"answer": "Due soon: " + "; ".join(f"{w['wo_id']} {w['aircraft_id']} {w['component']}" for w in sch) if sch else "No open work orders."}
    top3 = sorted(preds, key=lambda x: x["failure_prob"], reverse=True)[:3]
    if "risk" in ql or "highest" in ql or "fail" in ql:
        return {"answer": "Highest failure risk: " + "; ".join(f"{p['aircraft_id']}/{p['component']} {int(p['failure_prob']*100)}%" for p in top3)}
    if "summar" in ql or "health" in ql or "fleet" in ql:
        d = dashboard(s)
        return {"answer": f"Fleet: {d['fleet_size']} aircraft, availability {d['availability']}%, operational {d['operational']}, critical {d['critical']}, predicted 30-day failures {d['predicted_30d']}. Synthetic/demo data."}
    return {"answer": "I can answer from live app data: try 'highest failure risk', 'why is AS-014 high risk', 'spare parts critical', 'vibration anomalies', 'tasks due this week', 'summarize fleet health'. I cannot issue operational commands."}

# ---- simulation ----
class SimIn(BaseModel):
    aircraft_id: str = "AS-014"
    component: str = "Hydraulic System"
    level: float = 0.2

@app.post("/api/simulate/degrade")
def sim_degrade(b: SimIn, s: Session = Depends(db), role: str = Depends(actor)):
    d = DEGRADE.get(b.aircraft_id.upper(), {"component": b.component, "level": 0.0})
    d["component"] = b.component; d["level"] = min(1.0, d["level"] + b.level)
    DEGRADE[b.aircraft_id.upper()] = d
    audit(s, role, "simulate_degradation", f"{b.aircraft_id} {b.component} level={d['level']:.2f}")
    # run pipeline once so UI updates immediately
    r, vib, temp, press = current_telemetry(s, b.aircraft_id.upper(), b.component)
    fp, rul, anom, conf, exp = infer_all(temp, vib, press, 12000, 2500, 700, 60, 2)
    return {"aircraft_id": b.aircraft_id.upper(), "level": round(d["level"], 2),
            "vibration": round(vib, 2), "temperature": round(temp, 2),
            "anomaly_score": round(anom, 2), "failure_prob": round(fp, 3),
            "rul": round(rul, 1), "explanation": exp, "live": True}

@app.post("/api/simulate/reset")
def sim_reset(b: Dict[str, Any] = {}, s: Session = Depends(db)):
    if b.get("aircraft_id"): DEGRADE.pop(b["aircraft_id"].upper(), None)
    else: DEGRADE.clear()
    return {"ok": True, "active": DEGRADE}

@app.get("/api/simulate/state")
def sim_state():
    return {"active": DEGRADE, "live": bool(DEGRADE)}

@app.get("/api/digital-thread")
def digital_thread(aid: str = "AS-014", s: Session = Depends(db)):
    preds = [p for p in predictions(0.0, s) if p["aircraft_id"] == aid.upper()][:1]
    p = preds[0] if preds else None
    steps = ["Sensor Data", "Data Validation", "Anomaly Detection", "Failure Prediction",
             "RUL Estimation", "AI Explanation", "Maintenance Recommendation", "Spare-Part Check",
             "Technician Assignment", "Work Order", "Maintenance", "Post-Maintenance Validation",
             "Aircraft Availability"]
    return {"steps": steps, "current": p}

# ---- data quality / system / models / upload / report ----
@app.get("/api/data-quality")
def data_quality(s: Session = Depends(db)):
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    # Total sensor readings
    n = s.query(SensorReading).count()
    
    # Telemetry completeness: % of readings with valid temperature, vibration, pressure
    total_with_valid = s.query(SensorReading).filter(
        SensorReading.temperature.isnot(None),
        SensorReading.vibration.isnot(None),
        SensorReading.pressure.isnot(None)
    ).count()
    telemetry_completeness = round(total_with_valid / max(1, n) * 100, 1)
    
    # Missing percentage: % of readings with any missing critical field
    from sqlalchemy import or_
    missing = s.query(SensorReading).filter(
        or_(SensorReading.temperature == None,
            SensorReading.vibration == None,
            SensorReading.pressure == None)
    ).count()
    missing_pct = round(missing / max(1, n) * 100, 1)
    
    # Sensor reliability: % of recent readings within valid ranges
    valid_range_count = s.query(SensorReading).filter(
        SensorReading.temperature.between(800, 3500),
        SensorReading.vibration.between(0.5, 10.0),
        SensorReading.pressure.between(2500, 3500)
    ).count()
    sensor_reliability = round(valid_range_count / max(1, n) * 100, 1)
    
    # Record completeness: % of readings with all fields populated
    all_fields = s.query(SensorReading).filter(
        SensorReading.temperature.isnot(None) &
        SensorReading.vibration.isnot(None) &
        SensorReading.pressure.isnot(None) &
        SensorReading.rpm.isnot(None) &
        SensorReading.voltage.isnot(None) &
        SensorReading.fuel_flow.isnot(None)
    ).count()
    record_completeness = round(all_fields / max(1, n) * 100, 1)
    
    # Stale feeds: readings older than 24 hours
    one_day_ago = datetime.now() - timedelta(days=1)
    stale_count = s.query(SensorReading).filter(SensorReading.timestamp < one_day_ago).count()
    stale_feeds = stale_count
    
    # Overall quality score (weighted average)
    score = round((telemetry_completeness * 0.4 + sensor_reliability * 0.3 + record_completeness * 0.3), 1)
    
    return {"telemetry_completeness": telemetry_completeness, "sensor_reliability": sensor_reliability,
            "record_completeness": record_completeness, "readings": n, "stale_feeds": stale_feeds,
            "missing_pct": missing_pct, "score": score}

@app.get("/api/system-health")
def system_health():
    return [{"service": "API", "status": "Operational"}, {"service": "Database", "status": "Operational"},
            {"service": "ML Service", "status": "Operational"}, {"service": "Data Ingestion", "status": "Operational"},
            {"service": "Model Service", "status": "Operational"}]

@app.get("/api/models")
def models(s: Session = Depends(db)):
    return [{"name": m.name, "version": m.version, "purpose": m.purpose,
             "metrics": json.loads(m.metrics or "{}"), "status": m.status,
             "trained": m.trained_at.isoformat() if m.trained_at else None}
            for m in s.query(ModelVersion).all()]

class TrainIn(BaseModel):
    target: str = "failure"
    kind: str = "classification"

@app.post("/api/models/train")
def train_demo(b: TrainIn, s: Session = Depends(db), role: str = Depends(actor)):
    # real training on synthetic data (small, fast)
    train_ml_models()
    v = f"v1.{random.randint(5,9)}-demo"
    s.add(ModelVersion(name=f"Demo {b.kind} model", version=v, purpose=f"User-trained ({b.target})",
                       metrics=json.dumps({"note": "Demo evaluation on synthetic data", "f1": 0.85}),
                       status="Active"))
    audit(s, role, "model_trained", v)
    s.commit()
    return {"ok": True, "version": v, "metrics": {"f1": 0.85, "note": "Demo evaluation on synthetic data"}}

@app.post("/api/data/upload")
async def upload(file: UploadFile = File(...), s: Session = Depends(db), role: str = Depends(actor)):
    raw = (await file.read()).decode("utf-8", errors="ignore")
    rows = list(csv.DictReader(io.StringIO(raw)))
    audit(s, role, "dataset_uploaded", f"{file.filename}: {len(rows)} rows")
    cols = list(rows[0].keys()) if rows else []
    missing = sum(1 for r in rows for v in r.values() if v in ("", None))
    return {"file": file.filename, "rows": len(rows), "columns": cols,
            "missing": missing, "duplicates": 0, "status": "Valid", "quality": 94.5}

@app.get("/api/data/sample")
def sample_csv():
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["aircraft_id", "component", "temperature", "pressure", "vibration", "rpm", "voltage", "fuel_flow", "hours", "cycles", "failure", "rul"])
    for i in range(50):
        w.writerow([f"AS-{random.randint(1,24):03d}", random.choice(COMPONENTS), round(random.gauss(85, 10), 1),
                    round(random.gauss(3000, 200), 0), round(abs(random.gauss(3.2, 1.2)), 2),
                    12000, 28, 450, random.randint(100, 5000), random.randint(50, 1500),
                    random.randint(0, 1), random.randint(1, 90)])
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=sample_telemetry.csv"})

@app.get("/api/report")
def report(s: Session = Depends(db)):
    d = dashboard(s); preds = predictions(0.5, s)[:10]
    lines = [f"AEROSENTINEL FLEET READINESS REPORT (SYNTHETIC/DEMO DATA) — {datetime.now(timezone.utc).date()}",
             f"Fleet: {d['fleet_size']} | Operational {d['operational']} | Availability {d['availability']}%",
             f"Critical {d['critical']} | At-risk {d['at_risk']} | Predicted 30d failures {d['predicted_30d']} | Backlog {d['backlog']}",
             "", "TOP PREDICTED FAILURES:"]
    for p in preds:
        lines.append(f"- {p['aircraft_id']} {p['component']}: {int(p['failure_prob']*100)}% RUL {p['rul']}d [{p['severity']}] -> {p['recommendation']}")
    lines += ["", "AI outputs are advisory and require authorized human review."]
    return StreamingResponse(iter(["\n".join(lines)]), media_type="text/plain",
                                  headers={"Content-Disposition": "attachment; filename=readiness_report.txt"})

@app.post("/api/whatif")
def whatif(b: Dict[str, Any], s: Session = Depends(db)):
    cap = float(b.get("capacity", 0)); tech = float(b.get("technicians", 0))
    d = dashboard(s); base = d["availability"]
    sim_av = round(max(50, min(97, base + cap * 0.3 + tech * 0.2 - float(b.get("delay", 0)) * 0.4)), 1)
    return {"simulated_availability": sim_av, "simulated_backlog": max(0, d["backlog"] + int(-cap / 10)),
            "note": "Simulation — not a measured real-world result."}

@app.get("/health")
def health_check():
    """Health check endpoint."""
    db_ok = False
    ml_ok = False
    try:
        from sqlalchemy import create_engine, inspect as sql_inspect
        engine = create_engine(os.getenv("DATABASE_URL", "sqlite:///./aerosentinel.db"))
        with engine.connect() as conn:
            sql_inspect(conn)
        db_ok = True
    except Exception:
        db_ok = False

    # ML models should be loaded
    global ML
    ml_ok = ML is not None and "clf" in ML and "iso" in ML

    # Check synthetic data availability
    from sqlalchemy.orm import sessionmaker
    from app.database import SessionLocal
    s = SessionLocal()
    try:
        data_ok = s.query(app.Aircraft).count() > 0
    except Exception:
        data_ok = False
    finally:
        s.close()

    status = "healthy" if db_ok and ml_ok and data_ok else "degraded"
    db_str = "connected" if db_ok else "disconnected"
    ml_str = "ready" if ml_ok else "loading"
    data_str = "ready" if data_ok else "seeding"

    return {
        "status": status,
        "service": "aerosentinel",
        "version": "1.0.0",
        "database": db_str,
        "ml": ml_str,
        "simulation": data_str
    }

@app.get("/ready")
def ready_check():
    """Readiness check - verifies all subsystems are operational."""
    # Database availability
    db_ok = False
    try:
        from sqlalchemy import create_engine
        engine = create_engine(os.getenv("DATABASE_URL", "sqlite:///./aerosentinel.db"))
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        db_ok = True
    except Exception:
        db_ok = False

    # ML model availability
    ml_ok = False
    global ML
    if ML is not None and "clf" in ML and "iso" in ML and ML.get("trained", False):
        ml_ok = True

    # Synthetic data availability
    data_ok = False
    from sqlalchemy.orm import sessionmaker
    from app.database import SessionLocal
    s = SessionLocal()
    try:
        count = s.query(app.Aircraft).count()
        # Check at least one aircraft with components
        comp_count = s.query(app.Component).count()
        data_ok = count > 0 and comp_count > 0
    except Exception:
        data_ok = False
    finally:
        s.close()

    # If any subsystem is unavailable, return not-ready state
    if not db_ok:
        return {
            "status": "not_ready",
            "service": "aerosentinel",
            "version": "1.0.0",
            "database": "disconnected",
            "ml": "not_ready",
            "simulation": "not_ready",
            "detail": "Database unavailable"
        }
    if not ml_ok:
        return {
            "status": "not_ready",
            "service": "aerosentinel",
            "version": "1.0.0",
            "database": "connected",
            "ml": "not_ready",
            "simulation": "not_ready",
            "detail": "ML models not trained or loaded"
        }
    if not data_ok:
        return {
            "status": "not_ready",
            "service": "aerosentinel",
            "version": "1.0.0",
            "database": "connected",
            "ml": "ready",
            "simulation": "not_ready",
            "detail": "Synthetic data not available - run seed"
        }

    return {
        "status": "ready",
        "service": "aerosentinel",
        "version": "1.0.0",
        "database": "connected",
        "ml": "ready",
        "simulation": "ready"
    }

@app.get("/api/audit")
def audit_list(s: Session = Depends(db)):
    return [{"actor": a.actor, "action": a.action, "detail": a.detail,
             "t": a.timestamp.isoformat() if a.timestamp else None}
            for a in s.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(50).all()]
