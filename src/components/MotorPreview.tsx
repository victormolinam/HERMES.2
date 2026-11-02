import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function MotorPreview({ motor, grains }: { motor: any, grains: any[] }) {
  const [inhibitorThickness, setInhibitorThickness] = useState(2);

  const drawWidth = 400;
  const drawHeight = 160;
  
  const totalLength = motor.Lc;
  const scaleX = (drawWidth - 60) / Math.max(totalLength, 10);
  const scaleY = (drawHeight - 40) / Math.max(motor.Dc, 10);
  const scale = Math.min(scaleX, scaleY);
  const center_y = drawHeight / 2;

  let totalGrainLength = 0;
  let hasDiameterError = false;
  grains.forEach(g => {
    totalGrainLength += (g.L0 * g.N);
    if (g.D0 > motor.Dc) {
      hasDiameterError = true;
    }
  });

  const hasLengthError = totalGrainLength > motor.Lc;
  const hasError = hasLengthError || hasDiameterError;

  const casingThickness = 4 * scale;
  const nozzleLength = 40 * scale; // Assuming a visual proportional length for the diverging section

  return (
    <>
      <div className="absolute top-1.5 right-2 z-20 flex items-center gap-2 bg-card/80 backdrop-blur-sm px-2 py-1 rounded border border-border shadow-sm">
        <label className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">Inhibitor (mm)</label>
        <Input 
          type="number" 
          value={inhibitorThickness} 
          onChange={e => setInhibitorThickness(Number(e.target.value) || 0)} 
          className="w-12 h-5 text-[10px] px-1 py-0 text-center"
        />
      </div>
      
      {hasError && (
          <div className="absolute top-8 right-2 text-[10px] font-bold text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded border border-red-900/50 flex items-center gap-1 z-20 shadow-md backdrop-blur-sm">
            <AlertCircle size={12} /> <span className="tracking-wider uppercase">Design Violations</span>
          </div>
      )}

      <div className={`w-full h-full min-h-[120px] overflow-hidden rounded-sm flex items-center justify-center p-2 transition-colors duration-300 mt-2 ${hasError ? 'bg-red-950/20' : 'bg-transparent'}`}>
        <svg width="100%" height="100%" viewBox={`0 0 ${drawWidth} ${drawHeight + 50}`} preserveAspectRatio="xMidYMid meet" className="max-h-[140px] max-w-[95%]">
            {/* GRAINS */}
            {grains.map((g, index) => {
              let startX = 20;
              for (let i = 0; i < index; i++) {
                startX += grains[i].L0 * grains[i].N * scale;
              }

              let fillColor = "#cbd5e1";
              if (g.propellantType === 4 || g.propellantType === 5) fillColor = "#fca5a5";
              else if (g.propellantType === 6 || g.propellantType === 7) fillColor = "#94a3b8";

              return (
                <g key={g.id}>
                  {Array.from({length: g.N}).map((_, j) => {
                    const segStartX = startX + j * g.L0 * scale;
                    const inhibWidth = g.L0 * scale;
                    const inhibHeight = g.D0 * scale;
                    const inhibTop = center_y - (g.D0 / 2) * scale;

                    const propWidth = Math.max(0, (g.L0 - 4)) * scale;
                    const propHeight = Math.max(0, (g.D0 - 2 * inhibitorThickness)) * scale;
                    const propTop = center_y - (propHeight / 2);
                    const propStartX = segStartX + 2 * scale;

                    let coreTop = center_y;
                    let coreHeight = 0;
                    if (g.shape === 1) {
                      coreTop = center_y - (g.d0 / 2) * scale;
                      coreHeight = g.d0 * scale;
                    } else if (g.shape === 2) {
                      coreTop = center_y - (g.d0mayor / 2) * scale;
                      coreHeight = g.d0mayor * scale;
                    } else if (g.shape === 4) {
                      const finTotalD = g.d0 + 2 * (g.finLength !== undefined ? g.finLength : 15);
                      coreTop = center_y - (finTotalD / 2) * scale;
                      coreHeight = finTotalD * scale;
                    }

                    return (
                      <g key={j}>
                        {/* Inhibitor Top Wall */}
                        <rect 
                          x={segStartX} 
                          y={inhibTop} 
                          width={inhibWidth} 
                          height={inhibitorThickness * scale} 
                          fill="#334155" 
                          stroke="#1e293b" 
                          strokeWidth="0.5" 
                          opacity={g.D0 > motor.Dc ? 0.4 : 0.9}
                        />
                        {/* Inhibitor Bottom Wall */}
                        <rect 
                          x={segStartX} 
                          y={center_y + (g.D0 / 2) * scale - inhibitorThickness * scale} 
                          width={inhibWidth} 
                          height={inhibitorThickness * scale} 
                          fill="#334155" 
                          stroke="#1e293b" 
                          strokeWidth="0.5" 
                          opacity={g.D0 > motor.Dc ? 0.4 : 0.9}
                        />
                        
                        {/* Propellant */}
                        {propWidth > 0 && propHeight > 0 && (
                          <rect 
                            x={propStartX} 
                            y={propTop} 
                            width={propWidth} 
                            height={propHeight} 
                            fill={fillColor} 
                            stroke="#64748b" 
                            strokeWidth="1" 
                            opacity={g.D0 > motor.Dc ? 0.4 : 1}
                          />
                        )}

                        {/* Hollow Core */}
                        {g.shape !== 3 && coreHeight > 0 && (
                          <rect 
                            x={propStartX} 
                            y={coreTop} 
                            width={propWidth} 
                            height={coreHeight} 
                            fill="#090e17" 
                            stroke="#475569"
                            strokeWidth="0.5"
                            strokeDasharray="2 1"
                          />
                        )}
                        
                        {/* Labels: Positioned in the middle of each grain section */}
                        {propWidth > 15 && (
                          <text 
                            x={segStartX + inhibWidth/2} 
                            y={center_y} 
                            fontSize="9" 
                            fill={g.shape === 3 ? "#090e17" : "#090e17"} 
                            textAnchor="middle" 
                            dominantBaseline="middle"
                            fontWeight="black"
                          >
                            {index + 1}.{j + 1}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* CASING */}
            <rect 
               x="20" 
               y={center_y - motor.Dc/2*scale} 
               width={motor.Lc*scale} 
               height={motor.Dc*scale} 
               fill="none" 
               stroke="#60a5fa" 
               strokeWidth="2"
            />
            
            {/* Front Closure */}
            <rect x="15" y={center_y - motor.Dc/2*scale} width="5" height={motor.Dc*scale} fill="#60a5fa" />

            {/* Centerline */}
            <line x1="0" y1={center_y} x2={drawWidth} y2={center_y} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="8 4" />
            
            {/* Dimension Lines */}
            <g markerEnd="url(#arrow)" markerStart="url(#arrow)">
               <line x1="20" y1={center_y + motor.Dc/2*scale + 20} x2={20 + motor.Lc*scale} y2={center_y + motor.Dc/2*scale + 20} stroke="#94a3b8" strokeWidth="1" />
            </g>
            <text x={20 + (motor.Lc*scale)/2} y={center_y + motor.Dc/2*scale + 35} fontSize="9" fill="#cbd5e1" textAnchor="middle" fontWeight="bold">Lc = {motor.Lc} mm</text>
            
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
            </defs>
        </svg>
        </div>
    </>
  );
}
