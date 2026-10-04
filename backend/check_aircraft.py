from app.main import Aircraft, Component
from app.database import SessionLocal, engine
from sqlalchemy import inspect, select
import os

s = SessionLocal()
rows = s.execute(select(Aircraft)).scalars().all()[:3]
for a in rows:
    print(f'Aircraft: {a.id}')
    print(f'  status: {a.status}, health_score: {a.health_score}, risk_score: {a.risk_score}')
    print(f'  flight_hours: {a.flight_hours}, flight_cycles: {a.flight_cycles}')
    print(f'  availability_status: {a.availability_status}')
    print(f'  last_maintenance: {a.last_maintenance}')
    print(f'  next_maintenance: {a.next_maintenance}')
    
    # Check components
    comps = s.execute(select(Component).filter_by(aircraft_id=a.id)).scalars().all()
    print(f'  Components: {len(comps)}')
    for c in comps:
        print(f'    {c.name}: health={c.health}, risk={c.risk}, status={c.status}, maintenance_age={c.maintenance_age}')
        # Check sensor readings
        sensor_readings = s.execute(select(type(s.query(__import__('app.database').Component)).__table__.c.id)).scalars().all()[:1] if False else []
        print(f'      metadata: {c.metadata}')

s.close()