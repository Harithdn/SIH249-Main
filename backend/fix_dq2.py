with open('app/main.py', 'r') as f:
    content = f.read()

# Replace the data quality function with a simpler version that doesn't use complex SQLAlchemy bitwise ops
old = '''@app.get("/api/data-quality")
def data_quality(s: Session = Depends(db)):
    from sqlalchemy import func
    from datetime import datetime, timedelta
    
    # Total sensor readings
    n = s.query(SensorReading).count()
    
    # Telemetry completeness: % of readings with valid temperature, vibration, pressure
    total_with_valid = s.query(SensorReading).filter(
        SensorReading.temperature.isnot(None),
        SensorReading.vibration.isnot(None),
        SensorReading.pressure.isnot(None)
    ).count()
    telemetry_completeness = round(total_with_valid / max(1, n) * 100, 1)
    
    # Missing percentage: % of readings with any missing critical field
    total_rows = s.query(SensorReading).filter(
        SensorReading.temperature == None |
        SensorReading.vibration == None |
        SensorReading.pressure == None
    ).count()
    missing_pct = round(total_rows / max(1, n) * 100, 1)
    
    # Sensor reliability: % of recent readings within valid ranges
    valid_range_count = s.query(SensorReading).filter(
        SensorReading.between('temperature', 800, 3500) &
        SensorReading.between('vibration', 0.5, 10.0) &
        SensorReading.between('pressure', 2500, 3500)
    ).count()
    sensor_reliability = round(valid_range_count / max(1, n) * 100, 1)
    
    # Record completeness: % of readings with all fields populated
    all_fields = s.query(SensorReading).filter(
        SensorReading.temperature.isnot(None) &
        SensorReading.vibration.isnot(None) &
        SensorReading.pressure.isnot(None) &
        SensorReading.rpm.isnot(None) &
        SensorReading.voltage.isnot(None) &
        SensorReading.fuel_flow.isnot(None)
    ).count()
    record_completeness = round(all_fields / max(1, n) * 100, 1)
    
    # Stale feeds: readings older than 24 hours
    one_day_ago = datetime.now() - timedelta(days=1)
    stale_count = s.query(SensorReading).filter(SensorReading.timestamp < one_day_ago).count()
    
    # Overall quality score (weighted average)
    score = round((telemetry_completeness * 0.4 + sensor_reliability * 0.3 + record_completeness * 0.3), 1)
    
    return {"telemetry_completeness": telemetry_completeness, "sensor_reliability": sensor_reliability,
            "record_completeness": record_completeness, "readings": n, "stale_feeds": stale_count,
            "missing_pct": missing_pct, "score": score}'''

new = '''@app.get("/api/data-quality")
def data_quality(s: Session = Depends(db)):
    from sqlalchemy import or_
    from datetime import datetime, timedelta
    
    # Total sensor readings
    n = s.query(SensorReading).count()
    
    # Telemetry completeness: % of readings with valid temperature, vibration, pressure
    total_with_valid = s.query(SensorReading).filter(
        SensorReading.temperature.isnot(None),
        SensorReading.vibration.isnot(None),
        SensorReading.pressure.isnot(None)
    ).count()
    telemetry_completeness = round(total_with_valid / max(1, n) * 100, 1)
    
    # Missing percentage: % of readings with any missing critical field
    missing = s.query(SensorReading).filter(
        or_(SensorReading.temperature == None,
            SensorReading.vibration == None,
            SensorReading.pressure == None)
    ).count()
    missing_pct = round(missing / max(1, n) * 100, 1)
    
    # Sensor reliability: % of recent readings within valid ranges
    valid_range_count = s.query(SensorReading).filter(
        SensorReading.temperature >= 800,
        SensorReading.temperature <= 3500,
        SensorReading.vibration >= 0.5,
        SensorReading.vibration <= 10.0,
        SensorReading.pressure >= 2500,
        SensorReading.pressure <= 3500
    ).count()
    sensor_reliability = round(valid_range_count / max(1, n) * 100, 1)
    
    # Record completeness: % of readings with all fields populated
    all_fields = s.query(SensorReading).filter(
        SensorReading.temperature.isnot(None) &
        SensorReading.vibration.isnot(None) &
        SensorReading.pressure.isnot(None) &
        SensorReading.rpm.isnot(None) &
        SensorReading.voltage.isnot(None) &
        SensorReading.fuel_flow.isnot(None)
    ).count()
    record_completeness = round(all_fields / max(1, n) * 100, 1)
    
    # Stale feeds: readings older than 24 hours
    one_day_ago = datetime.now() - timedelta(days=1)
    stale_count = s.query(SensorReading).filter(SensorReading.timestamp < one_day_ago).count()
    
    # Overall quality score (weighted average)
    score = round((telemetry_completeness * 0.4 + sensor_reliability * 0.3 + record_completeness * 0.3), 1)
    
    return {"telemetry_completeness": telemetry_completeness, "sensor_reliability": sensor_reliability,
            "record_completeness": record_completeness, "readings": n, "stale_feeds": stale_count,
            "missing_pct": missing_pct, "score": score}'''

if old in content:
    content = content.replace(old, new)
    with open('app/main.py', 'w') as f:
        f.write(content)
    print("Fixed data quality endpoint v2")
else:
    print("Old string not found")
    idx = content.find('def data_quality')
    if idx >= 0:
        print("Found at index", idx)