from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

# Test /api/dashboard for downtime_avoided_h
r = c.get('/api/dashboard')
data = r.json()
print(f'dashboard keys: {list(data.keys())}')
print(f'downtime_avoided_h: {data.get("downtime_avoided_h")}')
print(f'availability: {data.get("availability")}')
print(f'operational: {data.get("operational")}')
print(f'fleet_size: {data.get("fleet_size")}')