with open('app/main.py', 'r') as f:
    content = f.read()

# Fix the broken line - the quote got mangled
old = '"reactive_avail: reactive_avail, "'
new = '\"reactive_avail\": reactive_avail,'

# Actually, let me just replace the whole broken line section
# The broken line is: "reactive_avail: reactive_avail, "predictive_avail": predictive_avail,
# It should be: "reactive_avail": reactive_avail, "predictive_avail": predictive_avail,

# Find and replace
idx = content.find('\"reactive_avail: reactive_avail,')
if idx >= 0:
    # Find the end of the broken line
    end_idx = content.find('\"predictive_avail\": predictive_avail,', idx)
    if end_idx >= 0:
        old_section = content[idx:end_idx+len('\"predictive_avail\": predictive_avail,')]
        new_section = '\"reactive_avail\": reactive_avail, \"predictive_avail\": predictive_avail,'
        content = content.replace(old_section, new_section)
        with open('app/main.py', 'w') as f:
            f.write(content)
        print('Fixed!')
    else:
        print('Could not find end index')
else:
    print('Could not find old section')
    # Let's just print what's around line 857
    lines = content.split('\n')
    for i, line in enumerate(lines[854:862], 855):
        print(f'{i}: {repr(line)}')