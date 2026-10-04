from app.database import SessionLocal
from sqlalchemy import select
from app.main import Prediction

s = SessionLocal()
cols = [c.name for c in Prediction.__table__.columns]
print(f'Prediction columns: {cols}')

pred = s.execute(select(Prediction)).scalars().first()
if pred:
    print(f'Sample prediction: {pred}')
    print(f'  dir: {[x for x in dir(pred) if not x.startswith("_")]}')

s.close()