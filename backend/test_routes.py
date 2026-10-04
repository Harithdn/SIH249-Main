from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

# Test all major endpoints
endpoints = [
    '/health', '/ready',
    '/api/dashboard', '/api/fleet', '/api/aircraft', '/api/predictions',
    '/api/anomalies', '/api/rul', '/api/work-orders', '/api/inventory',
    '/api/alerts', '/api/analytics', '/api/models', '/api/models/train',
    '/api/predict', '/api/copilot', '/api/digital-thread', '/api/data-quality',
    '/api/report', '/api/simulate/degrade', '/api/simulate/reset', '/api/simulate/state',
    '/api/insights', '/api/system-health', '/api/resources', '/api/schedule',
    '/api/inventory/forecast', '/api/maintenance', '/api/data/upload', '/api/data/sample'
]

print('=== API ENDPOINT TESTS ===')
print()

for ep in endpoints:
    try:
        r = c.get(ep)
        status = r.status_code
        if status != 200:
            print(f'{ep}: {status}')
    except Exception as e:
        print(f'{ep}: ERROR - {e}')

print()
print('=== KEY ENDPOINT VERIFICATION ===')
r = c.get('/health')
print(f'/health: {r.status_code}')

r = c.get('/ready')
print(f'/ready: {r.status_code}')

r = c.get('/api/insights')
print(f'/api/insights: {r.status_code}')