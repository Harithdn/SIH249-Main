from app.main import Aircraft, Component
from app.database import SessionLocal, engine
from sqlalchemy import select

s = SessionLocal()
comps = s.execute(select(Component).filter_by(aircraft_id='AS-014')).scalars().all()
for c in comps:
    print(f'Component: {c.name}')
    print(f'  Attributes: {[x for x in dir(c) if not x.startswith("_")]}')

s.close()