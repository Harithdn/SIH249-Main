from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

# Test /api/dashboard
r = c.get('/api/dashboard')
print(f'/api/dashboard status: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    print(f'Keys: {list(data.keys())}')
    for key in ['fleet_availability', 'reactive_avail', 'predictive_avail', 'downtime_avoided_h', 'operational', 'maintenance']:
        if key in data:
            print(f'{key}: {data[key]}')