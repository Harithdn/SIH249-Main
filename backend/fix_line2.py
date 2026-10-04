with open('app/main.py', 'r') as f:
    lines = f.readlines()

# Fix line 874 (index 873)
# Current: '            "note": "Projected improvement in simulated scenario - not a measured real-world result."}\\n@app.get("/api/insights")\n'
# Should be: '            "note": "Projected improvement in simulated scenario - not a measured real-world result."}\n'

# Replace the problematic line
lines[873] = '            "note": "Projected improvement in simulated scenario - not a measured real-world result."}\n'

# Also fix line 871 - it seems to be missing the closing brace properly
# Let me check: line 871 is '    return {"pareto": pareto, "mttr": mttr, "mtbf": 240,\n'
# This is missing the closing } for the dict and the other keys

# Actually, looking at the structure, the return dict seems to span multiple lines
# Lines 871-874 should form one return dict

# Let me just rewrite the whole return block properly
# The return should be a single dict, so lines 871-874 need to be corrected

# Let me just replace lines 871-874
new_return = '''    return {"pareto": pareto, "mttr": mttr, "mtbf": 240,
            "availability_trend": fleet(s)["history"],
            "reactive_avail": reactive_avail, "predictive_avail": predictive_avail,
            "note": "Projected improvement in simulated scenario - not a measured real-world result."}'''

# Join lines 871-874 (indices 870-873) and replace
old_text = ''.join(lines[870:875])
new_text = new_return + '\n'

if old_text in ''.join(lines[870:875]):
    lines[870:875] = [new_return + '\n']
    with open('app/main.py', 'w') as f:
        f.writelines(lines)
    print("Fixed!")
else:
    print("Old text not matching")
    print("Current 870-874:", repr(''.join(lines[870:875])))