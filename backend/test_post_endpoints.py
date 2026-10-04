from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

# Test POST endpoints
endpoints = [
    '/api/predict', 
    '/api/work-orders',
    '/api/models/train',
    '/api/data/upload',
]

for ep in endpoints:
    try:
        if ep == '/api/predict':
            r = c.post(ep, json={"temperature": 95, "vibration": 6.5})
        elif ep == '/api/work-orders':
            r = c.post(ep, json={"aircraft_id": "AS-014", "component": "Hydraulic System", "issue": "Test issue"})
        elif ep == '/api/models/train':
            r = c.post(ep, json={"target": "failure"})
        elif ep == '/api/data/upload':
            # Can't easily test file upload, just check status
            r = c.post(ep, data={"test": "data"})
        print(f'POST {ep}: {r.status_code}', end='')
        if r.status_code == 200:
            try:
                print(f', response: {r.json()}')
            except:
                print()
        else:
            print()
            if r.text:
                print(f'  response: {r.text[:200]}')
    except Exception as e:
        print(f'POST {ep}: ERROR - {e}')