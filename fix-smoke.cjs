const fs = require('fs');

let engineViewer = fs.readFileSync('src/components/EngineViewer.tsx', 'utf8');

// Change black smoke color to pure black and rely on opacity
engineViewer = engineViewer.replace(/smokeColor = "#0f172a"; \/\/ dense black smoke/g, 'smokeColor = "#000000"; // dense black smoke');

// Change the mixBlendMode of smoke to normal always. Multiply doesn't work well on dark backgrounds
engineViewer = engineViewer.replace(/mixBlendMode: smokeColor === "#0f172a" \? 'multiply' : 'normal'/g, "mixBlendMode: 'normal'");
engineViewer = engineViewer.replace(/mixBlendMode: smokeColor === "#000000" \? 'multiply' : 'normal'/g, "mixBlendMode: 'normal'");

fs.writeFileSync('src/components/EngineViewer.tsx', engineViewer);
