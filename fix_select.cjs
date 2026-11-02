const fs = require('fs');
let code = fs.readFileSync('src/components/MissionControl.tsx', 'utf8');

const oldBlock = `                <SelectContent className="bg-popover text-popover-foreground border-border">
                  <SelectItem value="both">
                    {t.cols_3 || "Time, Pressure, Force (3 cols)"}
                  </SelectItem>
                  <SelectItem value="pressure">
                    {t.cols_2p || "Only Time and Pressure (2 cols)"}
                  </SelectItem>
                  <SelectItem value="force">
                    {t.cols_2f || "Only Time and Force (2 cols)"}
                  </SelectItem>
                </SelectContent>`;

const newBlock = `                <SelectContent className="bg-popover text-popover-foreground border-border">
                  <SelectItem value="time_thrust">
                    {lang === "es" ? "Tiempo y Empuje (Recomendado)" : "Time and Thrust (Recommended)"}
                  </SelectItem>
                  <SelectItem value="time_pressure">
                    {lang === "es" ? "Tiempo y Presión" : "Time and Pressure"}
                  </SelectItem>
                  <SelectItem value="freq_thrust">
                    {lang === "es" ? "Frecuencia de Muestreo y Empuje" : "Sampling Freq and Thrust"}
                  </SelectItem>
                  <SelectItem value="freq_pressure">
                    {lang === "es" ? "Frecuencia de Muestreo y Presión" : "Sampling Freq and Pressure"}
                  </SelectItem>
                </SelectContent>`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync('src/components/MissionControl.tsx', code);
console.log('Fixed select block');
