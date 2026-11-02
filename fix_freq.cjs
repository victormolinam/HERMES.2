const fs = require('fs');
let code = fs.readFileSync('src/components/MissionControl.tsx', 'utf8');

// Add samplingFreq state
if (!code.includes('const [samplingFreq, setSamplingFreq] = useState<number>(1000);')) {
  code = code.replace(
    'const [expDataType, setExpDataType] = useState<"time_thrust" | "time_pressure" | "freq_thrust" | "freq_pressure">("time_thrust");',
    'const [expDataType, setExpDataType] = useState<"time_thrust" | "time_pressure" | "freq_thrust" | "freq_pressure">("time_thrust");\n  const [samplingFreq, setSamplingFreq] = useState<number>(1000);'
  );
}

// Add the sampling freq input block
const oldSelectEnd = `              </Select>
              {expDataType === "time_pressure" && (`;

const newSelectEnd = `              </Select>
              {(expDataType === "freq_thrust" || expDataType === "freq_pressure") && (
                <div className="mt-2">
                  <NumberInputMC
                    label={lang === "es" ? "Frec. Muestreo [Hz]" : "Sampling Freq [Hz]"}
                    value={samplingFreq}
                    onChange={setSamplingFreq}
                  />
                </div>
              )}
              {expDataType === "time_pressure" && (`;

if(code.includes(oldSelectEnd)) {
  code = code.replace(oldSelectEnd, newSelectEnd);
} else {
  console.log("oldSelectEnd not found");
}

fs.writeFileSync('src/components/MissionControl.tsx', code);
console.log('Fixed freq');
