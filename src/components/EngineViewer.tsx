import React, { useMemo } from 'react';
import { SimulationResults, getPropellantVisualProfile } from '../lib/types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Flame, Wind, Sparkles } from 'lucide-react';

export function EngineViewer({ results, timeIndex, t }: { results: SimulationResults, timeIndex: number, t?: any }) {
  if (!results || !results.t || results.t.length === 0) return null;

  const totalL = results.grains.reduce((acc, g) => acc + g.L0 * g.N, 0);
  const maxD = Math.max(...results.grains.map(g => g.D0));
  
  const thrust = results.F_N[timeIndex] || 0;
  const maxThrust = results.summary.Fmax_N || 1;
  const normalizedThrust = Math.min(1, Math.max(0, thrust / maxThrust));
  
  const pressure = results.P0_gage[timeIndex] || 0;
  const maxPressure = results.summary.Pmax_MPa || 1;
  const normalizedPressure = Math.min(1, Math.max(0, pressure / maxPressure));

  // Visual characteristics based on propellant type
  const profile = getPropellantVisualProfile(results.propellantType);
  const isSmoky = profile.isSmoky;
  const smokeColor = profile.smokeColorHex;
  const hasFlame = profile.hasFlame;
  const hasDiamonds = profile.hasDiamonds;
  const flameLengthMult = profile.category === 'apcp' ? 1.7 : (hasFlame ? 0.85 : 0);

  // Calculate dynamic flame properties
  const flameLength = 240 * normalizedThrust * flameLengthMult;
  const flameWidth = 26 + 32 * normalizedThrust;
  
  // Background technical mesh grid
  const meshLines = useMemo(() => {
    const lines = [];
    for(let i=0; i<60; i++) {
      lines.push(<line key={`v${i}`} x1={i*10} y1={0} x2={i*10} y2={300} stroke="#334155" strokeWidth="0.5" opacity="0.35" />);
    }
    for(let i=0; i<30; i++) {
      lines.push(<line key={`h${i}`} x1={0} y1={i*10} x2={600} y2={i*10} stroke="#334155" strokeWidth="0.5" opacity="0.35" />);
    }
    return lines;
  }, []);

  // Supersonic Shock Diamonds (Mach Discs)
  const diamonds = useMemo(() => {
    const arr = [];
    if (hasDiamonds && normalizedThrust > 0.06) {
      const numDiamonds = Math.max(2, Math.floor(normalizedThrust * 6));
      for (let i = 0; i < numDiamonds; i++) {
        const dx = 385 + (i * 32) * (0.8 + normalizedThrust * 0.2);
        const intensity = 1 - (i / numDiamonds) * 0.65;
        arr.push(
          <g key={i}>
            {/* Outer Diamond Glow */}
            <ellipse 
              cx={dx} 
              cy="150" 
              rx={11 + 8 * normalizedThrust} 
              ry={flameWidth * 0.28 * intensity} 
              fill="url(#diamondGrad)" 
              opacity={intensity * 0.95} 
              style={{ mixBlendMode: 'screen' }}
            />
            {/* Inner Core Bright Center */}
            <ellipse 
              cx={dx} 
              cy="150" 
              rx={4 + 3 * normalizedThrust} 
              ry={flameWidth * 0.12 * intensity} 
              fill="#ffffff" 
              opacity={intensity * 0.98} 
              style={{ mixBlendMode: 'screen' }}
            />
          </g>
        );
      }
    }
    return arr;
  }, [hasDiamonds, normalizedThrust, flameWidth]);

  // Generate realistic billowing smoke clusters (dynamic aerodynamic swirl)
  const smokeParticles = useMemo(() => {
    const arr = [];
    if (isSmoky && normalizedThrust > 0.02) {
       const particleCount = profile.category === 'candy' ? 55 : 42;
       for (let i = 0; i < particleCount; i++) {
          const seed = (timeIndex * 13 + i * 23) % 300;
          const progress = seed / 300;
          const dx = 385 + progress * 260 * (0.5 + normalizedThrust * 0.5);
          const expansion = Math.sin(timeIndex * 0.18 + i * 0.9) * (15 + progress * 80);
          const dy = 150 + expansion;
          const size = 18 + progress * (profile.category === 'candy' ? 75 : 60);
          const opacity = (1 - progress * 0.9) * (profile.category === 'rnx' ? 0.95 : 0.88) * normalizedPressure;
          
          arr.push(
            <circle 
              key={`smoke${i}`} 
              cx={dx} 
              cy={dy} 
              r={size} 
              fill={smokeColor} 
              opacity={Math.max(0.04, opacity)} 
              style={{ 
                filter: profile.category === 'rnx' ? 'blur(7px)' : 'blur(9px)', 
                mixBlendMode: 'normal' 
              }} 
            />
          );
       }
    }
    return arr;
  }, [isSmoky, normalizedThrust, timeIndex, smokeColor, normalizedPressure, profile.category]);

  const propellantDesc = profile.category === 'candy' 
    ? (t?.candy_white_smoke || 'Humo Blanco Denso (Sin Llama)') 
    : profile.category === 'rnx' 
      ? (t?.rnx_black_smoke || 'Humo Negro (Resina Epoxi)') 
      : (t?.apcp_supersonic || 'Llama Supersónica (Diamantes de Choque)');

  return (
    <Card className="bg-card border-border text-card-foreground shadow-sm h-full flex flex-col max-h-[500px] overflow-hidden">
      <CardHeader className="border-b border-border py-2 px-4 bg-muted/60 flex-none z-10 w-full">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.7)]"></div>
               <span className="font-bold tracking-wider text-xs uppercase text-foreground font-sans">
                  {t?.motor_2d_title || t?.exhaust_sim || 'Motor Animation'}
               </span>
               <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-semibold">
                  {profile.displayName}
               </span>
            </div>
            <div className="text-[10px] text-muted-foreground font-mono font-medium hidden sm:inline">
               {propellantDesc}
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 min-h-0 relative bg-slate-950 rounded-b-xl overflow-hidden w-full h-full">
         <div className="w-full h-full flex justify-center items-center overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid meet" className="max-h-full" style={{ background: "#070b12" }}>
              <defs>
                <linearGradient id="metallic" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#94a3b8" />
                  <stop offset="20%" stopColor="#f1f5f9" />
                  <stop offset="50%" stopColor="#cbd5e1" />
                  <stop offset="80%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
               
                <linearGradient id="metallicDark" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#475569" />
                  <stop offset="30%" stopColor="#94a3b8" />
                  <stop offset="70%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                <radialGradient id="plumeBase" cx="0%" cy="50%" r="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="20%" stopColor="#fef08a" stopOpacity="0.95" />
                  <stop offset="40%" stopColor="#f97316" stopOpacity="0.85" />
                  <stop offset="80%" stopColor="#dc2626" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="diamondGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="40%" stopColor="#60a5fa" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
                </radialGradient>
                
                <linearGradient id="heatMap" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#1e1b4b" />
                  <stop offset="20%" stopColor="#4c1d95" />
                  <stop offset="40%" stopColor="#be123c" />
                  <stop offset="60%" stopColor="#ea580c" />
                  <stop offset="80%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>

              {/* Mesh Grid */}
              <g>{meshLines}</g>
              
              {/* Centerline */}
              <line x1="20" y1="150" x2="580" y2="150" stroke="#f43f5e" strokeWidth="0.5" strokeDasharray="8 4" opacity="0.6" />

              {/* ROCKET ENGINE BODY */}
              {/* Outer Casing */}
              <rect x="50" y="110" width="300" height="80" rx="4" fill="url(#metallic)" stroke="#475569" strokeWidth="1.5" />
              
              {/* Internal Chamber (shows pressure heat emission) */}
              <rect x="52" y="112" width="296" height="76" rx="3" fill="#1e293b" />
              <rect x="52" y="112" width="296" height="76" rx="3" fill="url(#heatMap)" opacity={0.1 + (normalizedPressure * 0.88)} style={{ mixBlendMode: 'screen' }} />
              
              {/* Forward Bulkhead & Pressure Tap */}
              <rect x="42" y="106" width="10" height="88" rx="2" fill="url(#metallicDark)" stroke="#1e293b" strokeWidth="1" />
              <rect x="32" y="146" width="10" height="8" rx="1" fill="#d97706" />

              {/* Nozzle Profile */}
              <path d="M 350 110 
                       C 365 110, 368 135, 370 135
                       L 370 165
                       C 368 165, 365 190, 350 190 Z" 
                    fill="url(#metallicDark)" stroke="#1e293b" strokeWidth="1" />
              <path d="M 370 135 
                       C 375 135, 385 110, 395 105
                       L 395 195
                       C 385 190, 375 165, 370 165 Z" 
                    fill="url(#metallicDark)" stroke="#1e293b" strokeWidth="1" />
              
              {/* EXHAUST PLUME & SMOKE */}
              {normalizedThrust > 0.01 && (
                <g style={{ transition: 'all 0.05s linear' }}>
                  {/* Smoke billows for Candy (white) or RNX (black) */}
                  {isSmoky && <g>{smokeParticles}</g>}
                  
                  {/* Supersonic Flame & Shock Diamonds for APCP */}
                  {hasFlame && (
                     <path 
                       d={`M 390 106 L ${390 + flameLength*0.4} ${150 - flameWidth*0.75} Q ${390 + flameLength*0.8} ${150 - flameWidth*1.15} ${390 + flameLength*1.2} 150 Q ${390 + flameLength*0.8} ${150 + flameWidth*1.15} ${390 + flameLength*0.4} ${150 + flameWidth*0.75} L 390 194 Z`} 
                       fill="#fca5a5" 
                       opacity={0.65 * normalizedThrust}
                       style={{ filter: 'blur(8px)', mixBlendMode: 'screen' }}
                     />
                  )}
                  {hasFlame && (
                     <path 
                       d={`M 390 115 L ${390 + flameLength*0.3} ${150 - flameWidth*0.5} Q ${390 + flameLength*0.6} ${150 - flameWidth} ${390 + flameLength} 150 Q ${390 + flameLength*0.6} ${150 + flameWidth} ${390 + flameLength*0.3} ${150 + flameWidth*0.5} L 390 185 Z`} 
                       fill="url(#plumeBase)" 
                       opacity={0.92}
                       style={{ filter: 'blur(4px)', mixBlendMode: 'screen' }}
                     />
                  )}
                  
                  {/* Shock Diamonds */}
                  {hasDiamonds && <g>{diamonds}</g>}
                </g>
              )}
            </svg>
         </div>
      </CardContent>
    </Card>
  );
}
