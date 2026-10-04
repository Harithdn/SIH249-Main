with open('app/main.py', 'r') as f:
    lines = f.readlines()

# Add total = s.query(Aircraft).count() before the if recs block
# Current line 853: recs = s.query(MaintenanceRecord).all()
# Insert total calculation before it

# Find the line with 'recs = s.query(MaintenanceRecord).all()'
# and insert total before it

# Actually, let me just insert total = s.query(Aircraft).count() after the recs line
# or better, replace the if/else block to ensure total is always defined

# Let me find and fix the if/else block for reactive_avail
# The issue is that 'total' is only defined in the else branch

# I'll rewrite the reactive_avail calculation section
# Replace lines 855-862 with a version that defines total outside the if/else

old_section = '''    # DB-calculated reactive availability: based on historical maintenance downtime
    if recs:
        total_downtime = sum(r.downtime_h or 0 for r in recs)
        total_days = max(1, (datetime.now() - min(r.date for r in recs)).days)
        reactive_avail = round(max(0, 100 - total_downtime / total_days * 24 / (s.query(Aircraft).count() * 24)) * 100, 1)
    else:
        total = s.query(Aircraft).count() or 1
        reactive_avail = round(100 - 8.0 * 24 / (total * 24) * 100, 1)'''

new_section = '''    # DB-calculated reactive availability: based on historical maintenance downtime
    total = s.query(Aircraft).count()  # total aircraft fleet size
    if recs:
        total_downtime = sum(r.downtime_h or 0 for r in recs)
        total_days = max(1, (datetime.now() - min(r.date for r in recs)).days)
        reactive_avail = round(max(0, 100 - total_downtime / total_days * 24 / (total * 24)) * 100, 1)
    else:
        reactive_avail = round(100 - 8.0 * 24 / (total * 24) * 100, 1)'''

# Find the old section and replace
content = ''.join(lines)
if old_section in content:
    content = content.replace(old_section, new_section)
    with open('app/main.py', 'w') as f:
        f.write(content)
    print("Fixed total variable scoping")
else:
    print("Old section not found")
    # Print what's around line 855
    for i in range(854, 865):
        print(f'{i}: {lines[i-1]}', end='')