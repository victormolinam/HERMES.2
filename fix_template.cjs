const fs = require('fs');
let code = fs.readFileSync('src/components/MissionControl.tsx', 'utf8');

const oldBlock = `  const downloadTemplate = () => {
    let headers = "";
    let sample = "";
    if (expDataType === "both_legacy") {
      headers = "Time,Pressure,Force\\n";
      sample = "0.00,0.10,0.0\\n0.05,1.25,120.5\\n0.10,2.85,340.2\\n0.15,4.10,510.9\\n0.20,3.95,490.4\\n0.25,1.80,180.1\\n0.30,0.10,0.0\\n";
    } else if (expDataType === "time_pressure") {
      headers = "Time,Pressure\\n";
      sample = "0.00,0.10\\n0.05,1.25\\n0.10,2.85\\n0.15,4.10\\n0.20,3.95\\n0.25,1.80\\n0.30,0.10\\n";
    } else {
      headers = "Time,Force\\n";
      sample = "0.00,0.0\\n0.05,120.5\\n0.10,340.2\\n0.15,510.9\\n0.20,490.4\\n0.25,180.1\\n0.30,0.0\\n";
    }
    const blob = new Blob([headers + sample], { type: "text/csv;charset=utf-8;" });`;

const newBlock = `  const downloadTemplate = () => {
    let headers = "";
    let sample = "";
    if (expDataType === "time_pressure") {
      headers = "Time,Pressure\\n";
      sample = "0.00,0.10\\n0.05,1.25\\n0.10,2.85\\n0.15,4.10\\n0.20,3.95\\n0.25,1.80\\n0.30,0.10\\n";
    } else if (expDataType === "freq_pressure") {
      headers = "Pressure\\n";
      sample = "0.10\\n1.25\\n2.85\\n4.10\\n3.95\\n1.80\\n0.10\\n";
    } else if (expDataType === "freq_thrust") {
      headers = "Force\\n";
      sample = "0.0\\n120.5\\n340.2\\n510.9\\n490.4\\n180.1\\n0.0\\n";
    } else {
      headers = "Time,Force\\n";
      sample = "0.00,0.0\\n0.05,120.5\\n0.10,340.2\\n0.15,510.9\\n0.20,490.4\\n0.25,180.1\\n0.30,0.0\\n";
    }
    const blob = new Blob([headers + sample], { type: "text/csv;charset=utf-8;" });`;

code = code.replace(oldBlock, newBlock);
fs.writeFileSync('src/components/MissionControl.tsx', code);
console.log('Fixed download template');
