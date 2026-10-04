from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

# Test /api/analytics
r = c.get('/api/analytics')
print(f'/api/analytics status: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    print(f'Keys: {list(data.keys())}')
    for key in ['reactive_avail', 'predictive_avail', 'fleet_availability', 'downtime_avoided', 'scenario']:
        if key in data:
            print(f'{key}: {data[key]}')