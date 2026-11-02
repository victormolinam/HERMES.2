const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Fix Area graph labels
content = content.replace(
  /<ChartLabel value={t.axis_time} position="insideBottom" offset={-45} fill="#cbd5e1" style={{ fontSize: '10px', fontFamily: 'monospace', letterSpacing: '1px', fontWeight: 700, textAnchor: 'middle' }} \/>/g,
  '<ChartLabel value={(t.axis_time).toUpperCase()} position="insideBottom" offset={-45} fill="#cbd5e1" style={{ fontSize: \'11px\', fontFamily: \'monospace\', letterSpacing: \'2px\', fontWeight: 700, textAnchor: \'middle\' }} />'
);

content = content.replace(
  /<ChartLabel value={t.axis_area} angle={-90} position="insideLeft" offset={-45} fill="#cbd5e1" style={{ fontSize: '10px', fontFamily: 'monospace', letterSpacing: '1px', fontWeight: 700, textAnchor: 'middle' }} \/>/g,
  '<ChartLabel value={(t.axis_area).toUpperCase()} angle={-90} position="insideLeft" offset={-45} fill="#cbd5e1" style={{ fontSize: \'11px\', fontFamily: \'monospace\', letterSpacing: \'2px\', fontWeight: 700, textAnchor: \'middle\' }} />'
);

// We need to also verify if the title of the graph matches results
// It seems the title was not specified by ChartLabel, but check CardTitle
// Wait, the results graph has axes 11px monospace. Area had 10px spacing 1px.

// EngineViewer background fixes
let engineViewer = fs.readFileSync('src/components/EngineViewer.tsx', 'utf8');
engineViewer = engineViewer.replace(/bg-white/g, 'bg-card');
engineViewer = engineViewer.replace(/bg-white\/80/g, 'bg-muted/80');
engineViewer = engineViewer.replace(/text-slate-800/g, 'text-card-foreground');
engineViewer = engineViewer.replace(/text-slate-700/g, 'text-slate-300');
engineViewer = engineViewer.replace(/text-slate-600/g, 'text-slate-300');
engineViewer = engineViewer.replace(/text-slate-500/g, 'text-slate-400');
engineViewer = engineViewer.replace(/border-slate-200/g, 'border-border');
engineViewer = engineViewer.replace(/border-slate-100/g, 'border-border');
engineViewer = engineViewer.replace(/bg-slate-50\/50/g, 'bg-muted/50');
engineViewer = engineViewer.replace(/text-orange-600/g, 'text-orange-400');
engineViewer = engineViewer.replace(/text-blue-600/g, 'text-blue-400');

// Add dark specific classes
engineViewer = engineViewer.replace(/className="max-h-full"/g, 'className="max-h-full" style={{ background: "#0a0f18" }}');

fs.writeFileSync('src/App.tsx', content);
fs.writeFileSync('src/components/EngineViewer.tsx', engineViewer);
