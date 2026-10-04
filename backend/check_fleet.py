from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

# Test /api/fleet
r = c.get('/api/fleet')
print(f'/api/fleet status: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    print(f'Keys: {list(data.keys())}')
    if 'aircraft' in data:
        print(f'aircraft: {data["aircraft"]}')