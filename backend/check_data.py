from app.main import app
from fastapi.testclient import TestClient
from app.database import SessionLocal, engine, Base
from sqlalchemy import inspect, select
import os

# Check if data is seeded
inspector = inspect(engine)
tables = inspector.get_table_names()
print(f"Tables: {tables}")

s = SessionLocal()
from app.main import Aircraft
aircraft_count = s.query(Aircraft).count()
component_count = s.query(Component).count() if hasattr(s.query, '__getitem__') else 0
# Use select for SQLAlchemy 2.0
from sqlalchemy import select as sa_select
aircraft_result = s.execute(sa_select(Aircraft).limit(1))
aircraft_rows = aircraft_result.scalars().all()
print(f"Aircraft rows fetched: {len(aircraft_rows)}")

# Try counting
try:
    aircraft_count = s.execute(sa_select(Aircraft)).scalar() or 0
except:
    aircraft_count = s.query(Aircraft).count()

component_result = s.execute(sa_select(type(s.query(__import__('app.database').Component)).__table__)).scalar() or 0
try:
    component_count = s.execute(sa_select(__import__('app.database').Component.__table__.c.id)).count()
except:
    component_count = 0

workorder_result = s.execute(sa_select(__import__('app.database').WorkOrder.__table__.c.id)).count() or 0
workorder_count = s.execute(sa_select(__import__('app.database').WorkOrder)).scalar() or 0

print(f"Aircraft: {aircraft_count}, Components: {component_count}, WorkOrders: {workorder_count}")

# Check some aircraft details
if aircraft_count > 0:
    aircrafts = s.execute(sa_select(Aircraft)).scalars().all()[:3]
    for a in aircrafts:
        print(f"  Aircraft: {a.id}, status: {a.status}, total_hours: {a.total_hours}")
        comps = s.execute(sa_select(__import__('app.database').Component).filter_by(aircraft_id=a.id)).scalars().all()
        print(f"    Components: {len(comps)}")
        for c in comps[:2]:
            print(f"      {c.name}: health={c.health}, risk={c.risk}, status={c.status}")

s.close()
print("Done")