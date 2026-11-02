const fs = require('fs');
let code = fs.readFileSync('src/components/MissionControl.tsx', 'utf8');

const oldState = `  const [dryMass, setDryMass] = useState(7.5); // kg
  const [rocketDiameter, setRocketDiameter] = useState(80); // mm
  const [launchAltitude, setLaunchAltitude] = useState(169); // m
  const [launchTemp, setLaunchTemp] = useState(28); // ºC

  // Applied States for Calculation
  const [calcParams, setCalcParams] = useState({
    dryMass: 7.5,
    rocketDiameter: 80,
    launchAltitude: 169,
    launchTemp: 28,
  });

  const hasChanges =
    dryMass !== calcParams.dryMass ||
    rocketDiameter !== calcParams.rocketDiameter ||
    launchAltitude !== calcParams.launchAltitude ||
    launchTemp !== calcParams.launchTemp;

  const handleUpdate = () => {
    setCalcParams({ dryMass, rocketDiameter, launchAltitude, launchTemp });
  };`;

const newState = `  const [dryMass, setDryMass] = useState(7.5); // kg
  const [rocketDiameter, setRocketDiameter] = useState(80); // mm
  const [launchAltitude, setLaunchAltitude] = useState(169); // m
  const [launchTemp, setLaunchTemp] = useState(28); // ºC
  
  // Aerodynamic Data
  const [useAeroData, setUseAeroData] = useState(false);
  const [aeroDataRaw, setAeroDataRaw] = useState("");
  const [aeroParsed, setAeroParsed] = useState<{ mach: number[], cd: number[] } | null>(null);

  React.useEffect(() => {
    if (!useAeroData || aeroDataRaw.trim() === "") {
        setAeroParsed(null);
        return;
    }
    const lines = aeroDataRaw.split(/\\r?\\n/);
    const m: number[] = [];
    const c: number[] = [];
    for (const line of lines) {
        const parts = line.split(/[\\t,;]+/);
        if (parts.length >= 2) {
            const valM = parseFloat(parts[0].replace(",", "."));
            const valC = parseFloat(parts[1].replace(",", "."));
            if (!isNaN(valM) && !isNaN(valC)) {
                m.push(valM);
                c.push(valC);
            }
        }
    }
    if (m.length > 0) {
        setAeroParsed({ mach: m, cd: c });
    } else {
        setAeroParsed(null);
    }
  }, [useAeroData, aeroDataRaw]);

  // Applied States for Calculation
  const [calcParams, setCalcParams] = useState({
    dryMass: 7.5,
    rocketDiameter: 80,
    launchAltitude: 169,
    launchTemp: 28,
    useAeroData: false,
    aeroParsed: null as { mach: number[], cd: number[] } | null,
  });

  const hasChanges =
    dryMass !== calcParams.dryMass ||
    rocketDiameter !== calcParams.rocketDiameter ||
    launchAltitude !== calcParams.launchAltitude ||
    launchTemp !== calcParams.launchTemp ||
    useAeroData !== calcParams.useAeroData ||
    aeroParsed !== calcParams.aeroParsed;

  const handleUpdate = () => {
    setCalcParams({ dryMass, rocketDiameter, launchAltitude, launchTemp, useAeroData, aeroParsed });
  };`;

if(code.includes(oldState)) {
    code = code.replace(oldState, newState);
    fs.writeFileSync('src/components/MissionControl.tsx', code);
    console.log("Successfully patched state.");
} else {
    console.log("oldState not found.");
}
