const fs = require('fs');
let code = fs.readFileSync('src/components/MissionControl.tsx', 'utf8');

// Fix the types
code = code.replace(
  'const [expDataType, setExpDataType] = useState<"both" | "pressure" | "force">(',
  'const [expDataType, setExpDataType] = useState<"time_thrust" | "time_pressure" | "freq_thrust" | "freq_pressure">('
);
code = code.replace(
  '"both",',
  '"time_thrust",'
);
code = code.replace(
  'expDataType: "both" as "both" | "pressure" | "force",',
  'expDataType: "time_thrust" as "time_thrust" | "time_pressure" | "freq_thrust" | "freq_pressure",'
);

fs.writeFileSync('src/components/MissionControl.tsx', code);
console.log('Fixed states');
