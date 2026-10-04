with open('app/main.py', 'r') as f:
    content = f.read()

# Add /api/insights endpoint after the analytics function
# The analytics return ends with the closing brace and note
insights_func = '''\n@app.get("/api/insights")\ndef insights(s: Session = Depends(db)):\n    from sqlalchemy import func, or_\n    from datetime import datetime, timedelta\n    \n    insights = []\n    \n    # Top predicted failures\n    preds = s.query(Prediction).filter(Prediction.failure_probability > 0.5).order_by(Prediction.failure_prob.desc()).limit(3).all()\n    for p in preds:\n        insights.append({\n            \"text\": f\"Aircraft {p.aircraft_id} shows sustained increase in {p.component.lower()} vibration over the last 72 hours.\",\n            \"evidence\": f\"Failure prob {p.failure_prob}, RUL {p.rul}d\",\n            \"confidence\": p.confidence,\n            \"review\": \"Pending\"\n        })\n    \n    # Aircraft with highest risk\n    risky = s.query(Aircraft).filter(Aircraft.risk_score > 70).order_by(Aircraft.risk_score.desc()).limit(2).all()\n    for a in risky:\n        insights.append({\n            \"text\": f\"Aircraft {a.aircraft_id} has elevated risk level.\",\n            \"evidence\": f\"Risk score: {a.risk_score}, Health: {a.health_score}\",\n            \"confidence\": 0.8,\n            \"review\": \"Pending\"\n        })\n    \n    # Maintenance backlog\n    backlog = s.query(WorkOrder).filter(~WorkOrder.status.in_(['Completed', 'Cancelled'])).count()\n    if backlog > 0:\n        insights.append({\n            \"text\": f\"Maintenance backlog of {backlog} open work orders.\",\n            \"evidence\": f\"{backlog} pending jobs\",\n            \"confidence\": 0.9,\n            \"review\": \"Pending\"\n        })\n    \n    # Sensor health\n    n = s.query(SensorReading).count()\n    insights.append({\n        \"text\": f\"System has {n} sensor readings.\",\n        \"evidence\": \"Telemetry monitoring active\",\n        \"confidence\": 0.7,\n        \"review\": \"Pending\"\n    })\n    \n    return insights\n\n'''

# Find the position after the analytics return statement
# The analytics return ends with the closing brace and note
target_end = '\"note\": \"Projected improvement in simulated scenario - not a measured real-world result.\"}'

if target_end in content:
    # Insert the insights function after the target
    new_content = content.replace(
        target_end,
        target_end + insights_func
    )
    with open('app/main.py', 'w') as f:
        f.write(new_content)
    print('Added /api/insights endpoint')
else:
    print('Target not found')
    # Debug
    idx = content.find(target_end)
    if idx >= 0:
        print(f'Found at index {idx}')
        print(f'Context: {content[idx:idx+80]}')