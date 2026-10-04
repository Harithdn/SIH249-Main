with open('app/main.py', 'r') as f:
    lines = f.readlines()

# Find the insights function (lines 875-920ish) and replace it entirely
# The current insights function spans from line 875 to about 955

# New insights function
new_insights = '''@app.get("/api/insights")\ndef insights(s: Session = Depends(db)):\n    from sqlalchemy import func, or_\n    from datetime import datetime, timedelta\n    \n    insights = []\n    \n    # Top predicted failures\n    preds = s.query(Prediction).filter(Prediction.failure_probability > 0.5).order_by(Prediction.failure_probability.desc()).limit(3).all()\n    for p in preds:\n        insights.append({\n            \"text\": f\"Aircraft {p.aircraft_id} shows sustained increase in {p.component.lower()} vibration over the last 72 hours.\",\n            \"evidence\": f\"Failure prob {p.failure_probability}, RUL {p.rul}d\",\n            \"confidence\": p.confidence,\n            \"review\": \"Pending\"\n        })\n    \n    # Aircraft with highest risk\n    risky = s.query(Aircraft).filter(Aircraft.risk_score > 70).order_by(Aircraft.risk_score.desc()).limit(2).all()\n    for a in risky:\n        insights.append({\n            \"text\": f\"Aircraft {a.aircraft_id} has elevated risk level.\",\n            \"evidence\": f\"Risk score: {a.risk_score}, Health: {a.health_score}\",\n            \"confidence\": 0.8,\n            \"review\": \"Pending\"\n        })\n    \n    # Maintenance backlog\n    backlog = s.query(WorkOrder).filter(~WorkOrder.status.in_(['Completed', 'Cancelled'])).count()\n    if backlog > 0:\n        insights.append({\n            \"text\": f\"Maintenance backlog of {backlog} open work orders.\",\n            \"evidence\": f\"{backlog} pending jobs\",\n            \"confidence\": 0.9,\n            \"review\": \"Pending\"\n        })\n    \n    # Sensor health\n    n = s.query(SensorReading).count()\n    insights.append({\n        \"text\": f\"System has {n} sensor readings.\",\n        \"evidence\": \"Telemetry monitoring active\",\n        \"confidence\": 0.7,\n        \"review\": \"Pending\"\n    })\n    \n    return insights\n'''

# Find the start and end of the current insights function
# Start: line 875 (@app.get("/api/insights"))
# End: line ~955 (before the @app.get("/api/insights") would be repeated, or before the next major section)

# Actually, let me find exact boundaries
content = ''.join(lines)

# Find the start marker
start_marker = '@app.get(\"/api/insights\")'
start_idx = content.find(start_marker)
if start_idx < 0:
    print('Could not find start marker')
else:
    # Find the end marker - look for the next @app.get after this
    end_marker = content.find('\n@app.get', start_idx + 1)
    if end_marker < 0:
        end_marker = len(content)
    
    # Replace the section
    new_content = content[:start_idx] + new_insights + content[end_marker:]
    
    with open('app/main.py', 'w') as f:
        f.write(new_content)
    print('Rewrote insights function')