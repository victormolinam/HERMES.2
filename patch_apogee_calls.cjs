const fs = require('fs');
let code = fs.readFileSync('src/components/MissionControl.tsx', 'utf8');

const oldCall1 = `      const simResult = calculateApogee(
        results.t,
        results.E_N,
        results.mgra_total.map((mg) => mg + calcParams.dryMass),
        calcParams.dryMass,
        calcParams.rocketDiameter / 1000,
        calcParams.launchAltitude,
        calcParams.launchTemp,
      );`;

const newCall1 = `      const simResult = calculateApogee(
        results.t,
        results.E_N,
        results.mgra_total.map((mg) => mg + calcParams.dryMass),
        calcParams.dryMass,
        calcParams.rocketDiameter / 1000,
        calcParams.launchAltitude,
        calcParams.launchTemp,
        calcParams.aeroParsed ? calcParams.aeroParsed.mach : undefined,
        calcParams.aeroParsed ? calcParams.aeroParsed.cd : undefined
      );`;

const oldCall2 = `      const res = calculateApogee(
        exp_t,
        exp_f_N,
        exp_mass,
        calcParams.dryMass,
        calcParams.rocketDiameter / 1000,
        calcParams.launchAltitude,
        calcParams.launchTemp,
      );`;

const newCall2 = `      const res = calculateApogee(
        exp_t,
        exp_f_N,
        exp_mass,
        calcParams.dryMass,
        calcParams.rocketDiameter / 1000,
        calcParams.launchAltitude,
        calcParams.launchTemp,
        calcParams.aeroParsed ? calcParams.aeroParsed.mach : undefined,
        calcParams.aeroParsed ? calcParams.aeroParsed.cd : undefined
      );`;

code = code.replace(oldCall1, newCall1);
code = code.replace(oldCall2, newCall2);

fs.writeFileSync('src/components/MissionControl.tsx', code);
console.log("Successfully patched calls.");
