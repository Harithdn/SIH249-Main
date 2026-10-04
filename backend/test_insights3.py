from app.main import app
from fastapi.testclient import TestClient

c = TestClient(app)

r = c.get('/api/insights')
print(f'/api/insights: {r.status_code}')
if r.status_code == 200:
    data = r.json()
    print(f'Number of insights: {len(data)}')
    for ins in data[:3]:
        print(f'  text preview: {ins["text"][:60]}...')
        print(f'  evidence: {ins["evidence"][:60]}...')
        print(f'  confidence: {ins["confidence"]}')
        print(f'  review: {ins["review"]}')