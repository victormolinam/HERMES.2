const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldBlock = `          {/* Theme Dropdown */}
          <Select value={theme} onValueChange={(v) => setTheme(v as 'dark' | 'light')}>`;

const newBlock = `          {/* Cursor Dropdown */}
          <Select value={cursor} onValueChange={(v) => setCursor(v)}>
            <SelectTrigger className={\`w-28 h-8 text-xs font-semibold px-2 flex items-center justify-between gap-1 backdrop-blur-sm shadow-sm transition-colors cursor-pointer rounded border focus:outline-none focus:ring-0 \${
              theme === 'light' 
                ? 'bg-white border-slate-300 text-slate-700' 
                : 'bg-slate-900/80 border-slate-700/50 text-slate-200'
            }\`}>
              <div className="flex items-center gap-1.5 truncate">
                <span className="truncate">{cursor === 'rocket' ? '🚀 Rocket' : cursor === 'crosshair' ? '⌖ Cross' : cursor === 'pointer' ? '👆 Point' : 'Mouse'}</span>
              </div>
            </SelectTrigger>
            <SelectContent className={\`border \${
              theme === 'light' 
                ? 'bg-white text-slate-800 border-slate-200' 
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }\`}>
              <SelectItem value="default" className="text-xs cursor-pointer">Mouse</SelectItem>
              <SelectItem value="rocket" className="text-xs cursor-pointer">🚀 Rocket</SelectItem>
              <SelectItem value="crosshair" className="text-xs cursor-pointer">⌖ Cross</SelectItem>
              <SelectItem value="pointer" className="text-xs cursor-pointer">👆 Point</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Theme Dropdown */}
          <Select value={theme} onValueChange={(v) => setTheme(v as 'dark' | 'light')}>`;

if(code.includes(oldBlock)) {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync('src/App.tsx', code);
  console.log('patched cursor dropdown');
} else {
  console.log('oldBlock not found');
}
