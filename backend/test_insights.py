from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

# Check what test data might be useful for insights
r = c.get('/api/dashboard')
d = r.json()
print(f'dashboard: fleet_size={d["fleet_size"]}, operational={d["operational"]}, critical={d["critical"]}, at_risk={d["at_risk"]}')

# Check fleet data
r = c.get('/api/fleet')
fleet = r.json()
aircraft_count = len(fleet['aircraft'])
print(f'fleet: {aircraft_count} aircraft')

# Check predictions
r = c.get('/api/predictions?min_risk=0.3')
preds = r.json()
print(f'predictions with risk>0.3: {len(preds)}')

# Check analytics
r = c.get('/api/analytics')
ana = r.json()
print(f'analytics: reactive_avail={ana["reactive_avail"]}, predictive_avail={ana["predictive_avail"]}')