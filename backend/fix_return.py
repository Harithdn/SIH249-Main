with open('app/main.py', 'r') as f:
    content = f.read()

# Fix the broken return statement
old = '''    return {"pareto": pareto, "mttr": mttr, "mtbf": 240,\n            "availability_trend": fleet(s)["history"],\n            "reactive_avail": reactive_avail, "predictive_avail": predictive_avail,\n            "note": "Projected improvement in simulated scenario — not a measured real-world result."}'''

new = '''    return {"pareto": pareto, "mttr": mttr, "mtbf": 240,
            "availability_trend": fleet(s)["history"],
            "reactive_avail": reactive_avail, "predictive_avail": predictive_avail,
            "note": "Projected improvement in simulated scenario — not a measured real-world result."}'''

if old in content:
    content = content.replace(old, new)
    with open('app/main.py', 'w') as f:
        f.write(content)
    print("Fixed")
else:
    print("Old not found")