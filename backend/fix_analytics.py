with open('app/main.py', 'r') as f:
    content = f.read()

# Replace the hardcoded reactive_avail and predictive_avail with references to the computed variables
old = 'reactive_avail": 78.4, "predictive_avail": 84.7,'
new = 'reactive_avail: reactive_avail, "predictive_avail": predictive_avail,'

# Wait, need to get the exact context
print("Looking for old string...")
idx = content.find(old)
if idx >= 0:
    print("Found old string at", idx)
    content = content.replace(old, new)
    with open('app/main.py', 'w') as f:
        f.write(content)
    print("Replacement successful")
else:
    print("Old string not found")
    # Try to find the exact pattern
    import re
    match = re.search(r'\"reactive_avail\":\s*\d+\.\d+,', content)
    if match:
        print("Regex match:", match.group())