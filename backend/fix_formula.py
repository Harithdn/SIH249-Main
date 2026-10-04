with open('app/main.py', 'r') as f:
    content = f.read()

# Fix the reactive_avail formula - the current formula is wrong
# Current: 100 - total_downtime / total_days * 24 / (total * 24)
# Correct: 100 * (1 - total_downtime / (total * 24 * total_days))
# Which is: 100 - 100 * total_downtime / (total * 24 * total_days)

old = '''    # DB-calculated reactive availability: based on historical maintenance downtime
    total = s.query(Aircraft).count  # total aircraft fleet size
    if recs:
        total_downtime = sum(r.downtime_h or 0 for r in recs)
        total_days = max(1, (datetime.now() - min(r.date for r in recs)).days)
        reactive_avail = round(max(0, 100 - total_downtime / total_days * 24 / (s.query(Aircraft).count() * 24)) * 100, 1)
    else:
        reactive_avail = round(100 - 8.0 * 24 / (total * 24) * 100, 1)'''

new = '''    # DB-calculated reactive availability: based on historical maintenance downtime
    total = s.query(Aircraft).count()  # total aircraft fleet size
    if recs:
        total_downtime = sum(r.downtime_h or 0 for r in recs)
        total_days = max(1, (datetime.now() - min(r.date for r in recs)).days)
        reactive_avail = round(max(0, 100 * (1 - total_downtime / (total * 24 * total_days))), 1)
    else:
        reactive_avail = 100.0'''

if old in content:
    content = content.replace(old, new)
    with open('app/main.py', 'w') as f:
        f.write(content)
    print("Fixed reactive_avail formula")
else:
    print("Old formula not found")
    # Print what's around the area
    idx = content.find('DB-calculated reactive')
    if idx >= 0:
        print("Found at index", idx)
        print("Context:", repr(content[idx:idx+300]))