from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

print("=== /health ===")
r = c.get('/health')
print(f"Status: {r.status_code}")
print(f"Body: {r.json()}")
print()

print("=== /ready ===")
r = c.get('/ready')
print(f"Status: {r.status_code}")
print(f"Body: {r.json()}")