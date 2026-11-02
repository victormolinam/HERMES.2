const fs = require('fs');
let code = fs.readFileSync('src/components/MissionControl.tsx', 'utf8');

code = code.replace(/expDataType === "force"/g, 'expDataType === "time_thrust"');
code = code.replace(/expDataType === "pressure"/g, 'expDataType === "time_pressure"');
code = code.replace(/expDataType === "both"/g, 'expDataType === "both_legacy"'); // shouldn't match anything useful now, but just in case
code = code.replace(/expDataType === "time_pressure" \|\|\\n\\s*calcExpParams.expDataType === "both_legacy"/g, 'expDataType === "time_pressure" || calcExpParams.expDataType === "freq_pressure"');

fs.writeFileSync('src/components/MissionControl.tsx', code);
