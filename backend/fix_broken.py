with open('app/main.py', 'r') as f:
    lines = f.readlines()

# Find and fix the broken return statement
# Lines 871-874 need to be merged into one return statement
# The problem: line 871 ends with "},\n" and lines 872-874 are at the wrong indentation

# Replace lines 871-874 with a proper return statement
# Original format was: return {"pareto": pareto, "mttr": mttr, "mtbf": 240,
#                       "availability_trend": fleet(s)["history"],
#                       "reactive_avail": 78.4, "predictive_avail": 84.7,
#                       "note": "..."}

# New format: return {"pareto": pareto, "mttr": mttr, "mtbf": 240,
#                  "availability_trend": fleet(s)["history"],
#                  "reactive_avail": reactive_avail, "predictive_avail": predictive_avail,
#                  "note": "..."}

# Let me find the exact range
start_line = 870  # 0-indexed: 870 is line 871
end_line = 874    # 874 is line 875 (exclusive)

# Replace lines[start_line:end_line] with corrected content
new_lines = [
    '    return {"pareto": pareto, "mttr": mttr, "mtbf": 240,\\n',
    '            "availability_trend": fleet(s)["history"],\\n',
    '            "reactive_avail": reactive_avail, "predictive_avail": predictive_avail,\\n',
    '            "note": "Projected improvement in simulated scenario — not a measured real-world result."}\\n',
]

# Replace lines 871-874 (indices 870-873) with new lines
# Actually let me just replace the specific broken content
old_section = ''.join(lines[870:875])
new_section = '''    return {"pareto": pareto, "mttr": mttr, "mtbf": 240,
            "availability_trend": fleet(s)["history"],
            "reactive_avail": reactive_avail, "predictive_avail": predictive_avail,
            "note": "Projected improvement in simulated scenario — not a measured real-world result."}'''

if old_section in ''.join(lines[870:875]):
    # Replace
    lines[870:875] = [new_section + '\\n']
    with open('app/main.py', 'w') as f:
        f.writelines(lines)
    print("Fixed!")
else:
    print("Old section not matching")
    # Print what we have
    for i in range(870, 875):
        print(f'Line {i+1}: {repr(lines[i])}')