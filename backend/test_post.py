from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

# Test POST endpoints
print('=== POST endpoint tests ===')
r = c.post('/api/predict', json={"temperature": 95, "vibration": 6.5})
print(f'/api/predict POST: {r.status_code} - failure_probability={r.json().get("failure_probability", "N/A")}')

r = c.post('/api/models/train', json={"target": "failure"})
print(f'/api/models/train POST: {r.status_code} - {r.json()}')

r = c.post('/api/work-orders', json={"aircraft_id": "AS-014", "component": "Hydraulic System", "issue": "Test issue"})
print(f'/api/work-orders POST: {r.status_code} - {r.json()}')

r = c.post('/api/simulate/degrade', json={"aircraft_id": "AS-014", "component": "Hydraulic System", "level": 0.3})
print(f'/api/simulate/degrade POST: {r.status_code} - {r.json()}')

r = c.post('/api/simulate/reset', json={"aircraft_id": "AS-014"})
print(f'/api/simulate/reset POST: {r.status_code} - {r.json()}')