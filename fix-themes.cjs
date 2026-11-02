const fs = require('fs');

const replaceInFile = (file, replacements) => {
  let content = fs.readFileSync(file, 'utf8');
  for (const [find, replace] of replacements) {
    content = content.split(find).join(replace);
  }
  fs.writeFileSync(file, content);
};

// 1. App.tsx
replaceInFile('src/App.tsx', [
  ['dark h-screen max-h-screen bg-background text-foreground', 'h-screen max-h-screen bg-slate-50 text-slate-900'],
  ['glass-panel', 'bg-white border border-slate-200 shadow-sm'],
  ['text-slate-100', 'text-slate-900'],
  ['text-white', 'text-slate-900'],
  ['text-cyan-400', 'text-blue-700'],
  ['text-cyan-500', 'text-blue-600'],
  ['text-slate-400', 'text-slate-500'],
  ['border-t-cyan-500', 'border-t-blue-500'],
  ['border-white/5', 'border-slate-100'],
  ['bg-white/5', 'bg-slate-50'],
  ['shadow-[0_0_15px_rgba(6,182,212,0.5)]', 'shadow-sm'],
  ['text-shadow-glow', ''],
  ['border-primary', 'border-blue-500']
]);

// 2. PlaybackWrapper.tsx
replaceInFile('src/components/PlaybackWrapper.tsx', [
  ['glass-panel', 'bg-white'],
  ['text-white', 'text-slate-100'], // wait inside button
  ['bg-slate-800', 'bg-slate-200'], // progress bar background
  ['text-slate-400', 'text-slate-600'],
  ['border-slate-700/50', 'border-slate-200'],
  ['text-cyan-100', 'text-slate-800'],
  ['bg-slate-900/50', 'bg-white'],
  ['bg-slate-900', 'bg-white'],
  ['border-slate-700', 'border-slate-200']
]);

// 3. GrainViewer.tsx
replaceInFile('src/components/GrainViewer.tsx', [
  ['glass-panel', 'bg-white border-slate-200 shadow-sm text-slate-800'],
  ['text-cyan-400', 'text-blue-800'],
  ['border-white/5', 'border-slate-100'],
  ['bg-white/5', 'bg-slate-50/80'],
  ['border-slate-700/50', 'border-slate-200'],
  ['bg-slate-800/80', 'bg-white'],
  ['bg-slate-900/50', 'bg-slate-100'],
  ['bg-slate-900', 'bg-slate-50'],
  ['text-slate-400', 'text-slate-500'],
  ['bg-cyan-500', 'bg-slate-400'],
  ['#334155', '#cbd5e1'], // border lines in svg
  ['#0f172a', '#f5f5f5'], // core empty space
  ['cyan-500', 'blue-500']
]);
