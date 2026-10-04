with open('app/main.py', 'r') as f:
    content = f.read()

# Add reactive_avail and predictive_avail computation before the return statement
# Insert after 'mttr = round(float(np.mean([r.downtime_h for r in recs])) if recs else 8.2, 1)' line

old = '''    mttr = round(float(np.mean([r.downtime_h for r in recs])) if recs else 8.2, 1)
    return {"pareto": pareto, "mttr": mttr, "mtbf": 240,'''

new = '''    mttr = round(float(np.mean([r.downtime_h for r in recs])) if recs else 8.2, 1)
    # DB-calculated reactive availability: based on historical maintenance downtime
    if recs:
        total_downtime = sum(r.downtime_h or 0 for r in recs)
        total_days = max(1, (datetime.now(timezone.utc) - min(r.date for r in recs)).days)
        reactive_avail = round(max(0, 100 - total_downtime / total_days * 24 / (s.query(Aircraft).count() * 24)) * 100, 1)
    else:
        total = s.query(Aircraft).count() or 1
        reactive_avail = round(100 - 8.0 * 24 / (total * 24) * 100, 1)

    # DB-calculated predictive availability: based on predicted failures
    preds = s.query(Prediction).filter(Prediction.failure_probability > 0.5).count()
    avg_flight_hours = s.query(func.avg(Aircraft.flight_hours)).scalar() or 2000
    total_fleet_hours = total * float(avg_flight_hours)
    predicted_downtime_h = preds * float(mttr)
    predictive_avail = round(max(0, 100 - predicted_downtime_h / total_fleet_hours * 100), 1) if total else 100.0

    return {"pareto": pareto, "mttr": mttr, "mtbf": 240,}'''

if old in content:
    content = content.replace(old, new)
    with open('app/main.py', 'w') as f:
        f.write(content)
    print("Replacement successful")
else:
    print("Old string not found")