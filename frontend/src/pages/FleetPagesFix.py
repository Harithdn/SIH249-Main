import os
full = r'C:\Users\Harith\OneDrive\Desktop\AeroSentinel\frontend\src\pages\FleetPages.tsx'
with open(full, 'r') as f:
    content = f.read()

# Replace the Availability function
old = 'export function Availability() { return <Fleet />;}'

new = '''export function Availability() {
  const [f, setF] = useState<any>(null);
  useEffect(() => { get('/api/fleet').then(setF); }, []);
  if (!f) return <div>Loading…</div>;
  const bases = {};
  f.aircraft.forEach((a: any) => { bases[a.base] = bases[a.base] || { base: a.base, total: 0, operational: 0 }; bases[a.base].total++; if (a.status === 'Operational') bases[a.base].operational++; });
  const totalBases = Object.keys(bases).length;
  const totalOperational = Object.values(bases).reduce((sum, b) => sum + b.operational, 0);
  const availability = totalBases > 0 ? Math.round(totalOperational / totalBases * 100) : 0;
  
  return (
    <div className=\"min-h-screen p-4\">
      <h2 className=\"text-xl font-bold text-cyan-200\">Fleet Availability</h2>
      <SimBanner />
      <div className=\"grid md:grid-cols-2 gap-4 mt-4\">
        <div className=\"card\">
          <div className=\"lbl\">Total Bases</div>
          <div className=\"kpi\">{Object.keys(f).length}</div>
        </div>
        <div className=\"card\">
          <div className=\"lbl\">Availability</div>
          <div className=\"kpi\">{availability}%</div>
        </div>
      </div>
      <div className=\"grid md:grid-cols-3 gap-2 mt-4\">
        <div className=\"card\">
          <div className=\"lbl\">Operational</div>
          <div className=\"kpi\">{Object.values(f).reduce((sum, b) => sum + b.operational, 0)}</div>
        </div>
        <div className=\"card\">
          <div className=\"lbl\">At Risk</div>
          <div className=\"kpi\">{Object.values(f).reduce((sum, b) => sum + (b.total - b.operational > 0 ? 1 : 0), 0)}</div>
        </div>
        <div className=\"card\">
          <div className=\"lbl\">Critical</div>
          <div className=\"kpi\">{Object.values(f).reduce((sum, b) => sum + (b.total > 0 && b.total - b.operational > b.total * 0.4 ? 1 : 0), 0)}</div>
        </div>
      </div>
    </div>
  );
}'''

if old in content:
    content = content.replace(old, new)
    with open(full, 'w') as f:
        f.write(content)
    print('Fixed Availability component')
else:
    print('Old string not found')
    # Print what's around line 25
    lines = content.split(chr(10))
    for i in range(24, 28):
        print(f'Line {i+1}: {lines[i]}')
"