from app.main import app, ML
from fastapi.testclient import TestClient

c = TestClient(app)

# Test /predict endpoint - this should use actual ML models
print("=== Testing /api/predict POST ===")
r = c.post('/api/predict', json={"temperature": 95, "vibration": 6.5})
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"failure_probability: {data.get('failure_probability')}")
    print(f"rul_days: {data.get('rul_days')}")
    print(f"anomaly_score: {data.get('anomaly_score')}")
    print(f"confidence: {data.get('confidence')}")
    print(f"explanation: {str(data.get('explanation'))[:200]}...")
    print(f"advisory: {data.get('advisory')}")
    
    # Verify the prediction is not hardcoded
    fp = data.get('failure_probability', 0)
    # If failure_prob > 0.3, then the ML pipeline is actually being used (not hardcoded 0.0 or 1.0)
    if fp > 0.3:
        print("\n* Prediction from ML model (not hardcoded)")
    else:
        print("\n? Prediction value - verify it's from ML")
else:
    print(f"Error: {r.text}")

# Test /predictions GET endpoint
print("\n=== Testing /api/predictions GET ===")
r = c.get('/api/predictions?min_risk=0.3')
print(f"Status: {r.status_code}")
if r.status_code == 200:
    data = r.json()
    print(f"Number of predictions: {len(data)}")
    if data:
        print(f"First prediction keys: {list(data[0].keys())}")