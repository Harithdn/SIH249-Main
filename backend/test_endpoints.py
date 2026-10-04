from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

# Test key endpoints
endpoints = [
    '/health', '/ready',
    '/api/dashboard', '/api/fleet', '/api/aircraft', '/api/predictions', 
    '/api/anomalies', '/api/rul', '/api/work-orders', '/api/inventory', 
    '/api/alerts', '/api/models/train', '/api/data/upload', '/api/copilot', 
    '/api/simulate/degrade', '/api/simulate/reset', '/api/report', 
    '/api/digital-thread', '/api/models'
]

for ep in endpoints:
    try:
        r = c.get(ep)
        print(f'GET {ep}: {r.status_code}', end='')
        if r.status_code == 200 and isinstance(r.json(), dict):
            keys = list(r.json().keys())[:3]
            print(f', keys: {keys}')
        else:
            print()
    except Exception as e:
        print(f'GET {ep}: ERROR - {e}')