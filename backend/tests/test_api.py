from fastapi.testclient import TestClient
from app.main import app

def test_dashboard():
    c = TestClient(app)
    r = c.get("/api/dashboard")
    assert r.status_code == 200
    assert "availability" in r.json()

def test_predict():
    c = TestClient(app)
    r = c.post("/api/predict", json={"temperature": 95, "vibration": 6.5})
    assert r.status_code == 200
    assert r.json()["failure_probability"] > 0.3
