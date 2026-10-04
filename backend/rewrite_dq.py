with open('app/main.py', 'r') as f:
    lines = f.readlines()

# Replace lines 967-972 (indices 966-971) with the new function definition
# The old lines are:
# @app.get("/api/data-quality")\n
# def data_quality(s: Session = Depends(db)):\n
#     from sqlalchemy import func\n
#     from datetime import datetime, timedelta\n
#      \n
#    # Total sensor readings\n
#    n = s.query(SensorReading).count()\n

# New function definition
new_func = '''@app.get("/api/data-quality")
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
            "missing_pct": missing_pct, "score": score}
'''

# Replace lines 966-972 (0-indexed: 965-971) with new function
# Actually, let me just replace from line 967 onwards
# The function old code spans from line 967 to the return statement

# Find the index where the old function starts
# Let me just replace lines starting from @app.get
# Find the line numbers

# Get the content as a string
content = ''.join(lines)

# The old function starts at '@app.get("/api/data-quality")'
old_start = content.find('@app.get("/api/data-quality")')
if old_start >= 0:
    # Find the old return statement
    old_return = '    return {"telemetry_completeness": 96.2, "sensor_reliability": 94.7,'
    old_return_idx = content.find(old_return)
    if old_return_idx >= 0:
        # Replace from old_start to old_return_idx + length of return statement
        # Get the return line and beyond
        new_section = new_func
        
        # Find where the old function ends (next @app or end)
        # Actually, let me just replace a known section
        # The old function is lines 967-972, which is about 6 lines
        # Let me find the exact replacement area
        
        # The old function content from @app.get to the return
        old_section = content[old_start:old_return_idx + len(old_return) + 10]  # include some after
        
        if old_section:
            content = content.replace(old_section, new_section)
            with open('app/main.py', 'w') as f:
                f.write(content)
            print("Replaced data quality function")
        else:
            print("Old section not found for replacement")
    else:
        print("Old return not found")
else:
    print("Old start not found")
"