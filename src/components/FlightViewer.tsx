import React, { useState, useEffect, useRef } from 'react';
import { ApogeeResult } from '../lib/apogee';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Compass, Gauge, Wind, Navigation } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function FlightViewer({ 
    simApogee, 
    expApogee, 
    t,
    propellantType = 1
}: { 
    simApogee: ApogeeResult | null, 
    expApogee: ApogeeResult | null, 
    t: any,
    propellantType?: number
}) {
    const [activeMode, setActiveMode] = useState<'sim' | 'exp'>('sim');
    const [isPlaying, setIsPlaying] = useState(false);
    const [timeIndex, setTimeIndex] = useState(0);
    const [speed, setSpeed] = useState(1);
    
    // Automatically switch to sim if exp disappears and vice versa
    useEffect(() => {
        if (activeMode === 'sim' && !simApogee && expApogee) setActiveMode('exp');
        if (activeMode === 'exp' && !expApogee && simApogee) setActiveMode('sim');
    }, [simApogee, expApogee, activeMode]);

    const apogeeData = activeMode === 'sim' ? simApogee : expApogee;

    const requestRef = useRef<number>(0);
    const previousTimeRef = useRef<number>(0);
    const simulatedTimeRef = useRef<number>(0);

    useEffect(() => {
        setTimeIndex(0);
        setIsPlaying(false);
        simulatedTimeRef.current = 0;
    }, [apogeeData, activeMode]);

    useEffect(() => {
        if (!isPlaying || !apogeeData || !apogeeData.t || apogeeData.t.length === 0) return;
        
        simulatedTimeRef.current = apogeeData.t[timeIndex] || 0;
        previousTimeRef.current = performance.now();

        const animate = (time: number) => {
            const deltaTime = (time - previousTimeRef.current!) / 1000;
            simulatedTimeRef.current += deltaTime * speed;
            
            setTimeIndex(prev => {
                let newIndex = prev;
                while (newIndex < apogeeData.t.length - 1 && apogeeData.t[newIndex] < simulatedTimeRef.current) {
                    newIndex++;
                }
                if (newIndex >= apogeeData.t.length - 1) {
                    setIsPlaying(false);
                    return apogeeData.t.length - 1;
                }
                return newIndex;
            });
            
            previousTimeRef.current = time;
            requestRef.current = requestAnimationFrame(animate);
        };
        
        requestRef.current = requestAnimationFrame(animate);
        
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying, speed, apogeeData]);

    const handlePlayToggle = () => {
        if (!isPlaying && apogeeData && timeIndex >= apogeeData.t.length - 1) {
            setTimeIndex(0);
            simulatedTimeRef.current = 0;
        }
        setIsPlaying(!isPlaying);
    };

    if (!simApogee && !expApogee) return null;

    const tCurrent = apogeeData?.t[timeIndex] || 0;
    const altCurrent = apogeeData?.h[timeIndex] || 0;
    const vCurrent = apogeeData?.v[timeIndex] || 0;
    const aCurrent = apogeeData?.a[timeIndex] || 0;
    const maxAlt = Math.max(100, apogeeData?.maxApogee || 1000);
    const machCurrent = Math.abs(vCurrent) / 340.29; // Approx Mach
    
    // Smooth camera following logic
    const scale = 8; // pixels per meter
    const startFollowAlt = 15; // altitude to start panning camera
    const groundBaseBottom = 40; // baseline bottom offset in px

    const camAlt = Math.max(0, altCurrent - startFollowAlt);
    const rocketBottomPx = groundBaseBottom + (altCurrent - camAlt) * scale;

    const thrusting = vCurrent > 0 && aCurrent > 0 && (timeIndex < (apogeeData?.t.length || 0) / 2);
    const falling = vCurrent < -0.5 || (Boolean(apogeeData?.apogeeTime) && tCurrent > (apogeeData?.apogeeTime || 999));

    let flameColor = '#f97316';
    let diamondColor = '#fef08a';
    let flameSize = 1;
    let smokeColorHex = '#e2e8f0';
    let smokeOpacityNum = 0.3;

    if (propellantType >= 1 && propellantType <= 3) {
        // Candy: thick white smoke
        smokeColorHex = '#f8fafc';
        smokeOpacityNum = 0.65;
        flameSize = 1.0;
    } else if (propellantType === 4 || propellantType === 5) {
        // RNX Epoxy: dark smoke
        smokeColorHex = '#0f172a';
        smokeOpacityNum = 0.85;
        flameColor = '#ea580c';
        diamondColor = '#fdba74';
        flameSize = 0.85;
    } else if (propellantType >= 6) {
        // APCP: hot expansive plume
        flameSize = 1.8;
        flameColor = '#f97316';
        diamondColor = '#38bdf8';
        smokeColorHex = '#64748b';
        smokeOpacityNum = 0.45;
    }

    return (
        <Card className="bg-slate-950 border-slate-800 shadow-xl flex flex-col h-full overflow-hidden min-h-[420px]">
            <CardHeader className="py-2.5 px-4 bg-slate-900/90 border-b border-slate-800 flex flex-row items-center justify-between z-20 shrink-0">
                <div className="flex items-center gap-2">
                    <Navigation size={15} className="text-sky-400" />
                    <CardTitle className="text-xs uppercase text-slate-200 font-mono font-bold tracking-widest">
                        {t?.flight_sim || "Simulación de Vuelo • Apogeo"}
                    </CardTitle>
                </div>
                <div className="flex gap-2">
                    <Button 
                        size="sm" 
                        variant={activeMode === 'sim' ? 'default' : 'outline'} 
                        disabled={!simApogee}
                        onClick={() => setActiveMode('sim')}
                        className={`h-6 text-[10px] px-2.5 font-mono font-bold transition-all ${
                            activeMode === 'sim'
                                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                    >
                        {t?.simulated || "Simulado"}
                    </Button>
                    <Button 
                        size="sm" 
                        variant={activeMode === 'exp' ? 'default' : 'outline'} 
                        disabled={!expApogee}
                        onClick={() => setActiveMode('exp')}
                        className={`h-6 text-[10px] px-2.5 font-mono font-bold transition-all ${
                            activeMode === 'exp'
                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                    >
                        {t?.experimental || "Experimental"}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 relative bg-gradient-to-t from-sky-400 via-blue-950 to-slate-950 overflow-hidden min-h-[300px]">
                {/* Background stars (visible higher up) */}
                <div 
                    className="absolute inset-0 z-0 transition-opacity duration-500 pointer-events-none" 
                    style={{ 
                        backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', 
                        backgroundSize: '48px 48px', 
                        opacity: altCurrent > maxAlt / 4 ? Math.min(0.8, (altCurrent / maxAlt)) : 0 
                    }}
                />
                
                {/* Background clouds (parallax) */}
                <div 
                    className="absolute inset-0 z-0 transition-opacity duration-300 pointer-events-none" 
                    style={{ 
                        transform: `translateY(${camAlt * scale * 0.12}px)`,
                        opacity: altCurrent < 2500 ? Math.max(0, 1 - (altCurrent / 2500)) : 0,
                    }}
                >
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div 
                            key={`cloud-layer-${i}`} 
                            className="absolute opacity-50 pointer-events-none"
                            style={{
                                left: `${10 + (i * 32) % 85}%`,
                                bottom: `${160 + i * 220}px`,
                                filter: 'blur(3px)'
                            }}
                        >
                            <div className="w-28 h-9 bg-white/80 rounded-full absolute -left-4 -top-2" />
                            <div className="w-20 h-14 bg-white/90 rounded-full absolute left-4 -top-6" />
                            <div className="w-24 h-11 bg-white/75 rounded-full absolute left-14 -top-3" />
                        </div>
                    ))}
                </div>

                {/* HIGH-CONTRAST TOP HUD: Altitude & Telemetry */}
                <div className="absolute top-3 right-3 z-30 font-mono text-xs bg-slate-950/90 p-3 rounded-xl border border-slate-800 backdrop-blur-md shadow-2xl space-y-1.5 min-w-[150px]">
                    <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-1 text-[11px]">
                        <span>TIEMPO</span>
                        <span className="font-bold text-white">T+ {tCurrent.toFixed(2)} s</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">ALTITUD:</span>
                        <span className="text-sky-300 font-bold text-sm drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]">
                            {altCurrent.toFixed(1)} m
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">VELOCIDAD:</span>
                        <span className="text-emerald-300 font-bold">
                            {vCurrent.toFixed(1)} m/s
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-[11px]">ACELERACIÓN:</span>
                        <span className="text-amber-300 font-bold">
                            {aCurrent.toFixed(1)} m/s²
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/80">
                        <span>NÚM. MACH:</span>
                        <span className="font-bold text-purple-300 font-mono">M {machCurrent.toFixed(2)}</span>
                    </div>
                </div>

                {/* Flight Phase Badge */}
                <div className="absolute top-3 left-3 z-30 flex items-center gap-2 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur-md shadow-xl font-mono text-xs font-bold text-slate-200">
                    <div className={`w-2 h-2 rounded-full ${thrusting ? 'bg-orange-500 animate-ping' : (falling ? 'bg-purple-400' : 'bg-emerald-400')}`} />
                    <span>{thrusting ? '🔥 FASE PROPULSADA' : (falling ? '🪂 DESCENSO / APOGEO' : '🚀 VUELO INERCIAL')}</span>
                </div>

                {/* Slender, Elongated Rocket and Parachute Container */}
                <div 
                    className="absolute left-1/2 -translate-x-1/2 w-10 z-20 flex flex-col items-center justify-end"
                    style={{ 
                        bottom: `${rocketBottomPx}px`, 
                        height: '180px',
                        transition: isPlaying ? 'none' : 'bottom 0.3s ease-out'
                    }}
                >
                    {/* Parachute */}
                    {falling && (
                        <div className="absolute bottom-[85%] left-1/2 -translate-x-1/2 flex flex-col items-center z-10 transition-opacity duration-500 opacity-100">
                           <svg viewBox="0 0 64 64" className="w-28 h-28 drop-shadow-[0_12px_14px_rgba(0,0,0,0.6)]">
                                <path d="M32 8 Q60 8 60 38 L4 38 Q4 8 32 8 Z" fill="#ef4444" opacity="0.95" />
                                <path d="M4 38 L32 58 L60 38" stroke="#f1f5f9" strokeWidth="1.2" />
                                <path d="M32 8 Q18 8 18 38" stroke="white" strokeWidth="2" opacity="0.4" />
                                <path d="M32 8 Q46 8 46 38" stroke="white" strokeWidth="2" opacity="0.4" />
                           </svg>
                        </div>
                    )}

                    {/* Slender Rocket SVG (Refined, Elongated Proportions) */}
                    <svg 
                        viewBox="0 0 24 160" 
                        fill="none" 
                        className="w-full h-[155px] drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] z-20 relative origin-center"
                        style={{ 
                           transform: falling ? 'rotate(180deg)' : 'rotate(0deg)', 
                           transition: 'transform 0.5s ease-in-out' 
                        }}
                    >
                        {/* 1. Slender Ogive Nosecone */}
                        <path d="M12 0 C10 12, 9 24, 9 32 L15 32 C15 24, 14 12, 12 0 Z" fill="#0f172a" />
                        <path d="M12 0 C11 12, 10.5 24, 10.5 32 L12 32 C12 24, 12 12, 12 0 Z" fill="#334155" opacity="0.5" />

                        {/* 2. Slender Upper Body Tube (Glossy Black) */}
                        <rect x="9" y="32" width="6" height="40" fill="#0f172a" />
                        {/* Highlight streak */}
                        <line x1="10" y1="32" x2="10" y2="72" stroke="#475569" strokeWidth="0.8" opacity="0.7" />

                        {/* 3. Middle Avionics / COHETEROS Band (Pure White) */}
                        <rect x="9" y="72" width="6" height="20" fill="#f8fafc" />
                        <rect x="9" y="78" width="6" height="3" fill="#dc2626" />

                        {/* 4. Slender Lower Motor Section (Glossy Black) */}
                        <rect x="9" y="92" width="6" height="42" fill="#0f172a" />
                        <line x1="10" y1="92" x2="10" y2="134" stroke="#475569" strokeWidth="0.8" opacity="0.7" />

                        {/* 5. Sleek Clipped-Delta Aerodynamic Tail Fins */}
                        <path d="M9 112 L2 134 L9 130 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                        <path d="M15 112 L22 134 L15 130 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                        {/* Center fin projection */}
                        <polygon points="11.5,116 12.5,116 12.5,134 11.5,134" fill="#475569" />

                        {/* 6. Metallic Nozzle & Retainer */}
                        <path d="M9.5 134 L14.5 134 L15.5 140 L8.5 140 Z" fill="#94a3b8" />
                        <rect x="10" y="133" width="4" height="2" fill="#d97706" />

                        {/* 7. Rocket Exhaust Flame (Dynamic Shock Wave) */}
                        {thrusting && !falling && (
                            <path 
                                d={`M7.5 140 L12 ${140 + 26 * flameSize + Math.random() * 12 * flameSize} L16.5 140 Z`} 
                                fill={flameColor} 
                                className="animate-pulse"
                                style={{ filter: `drop-shadow(0 0 ${6 * flameSize}px ${flameColor})` }}
                            />
                        )}
                        {/* Mach Diamond Core */}
                        {thrusting && !falling && aCurrent > 15 && (
                             <path 
                                d={`M9.5 140 L12 ${140 + 10 * flameSize + Math.random() * 6 * flameSize} L14.5 140 Z`} 
                                fill={diamondColor} 
                             />
                        )}
                    </svg>

                    {/* Smoke particles leaving trail */}
                    {thrusting && !falling && (
                        <div 
                            className="absolute top-[155px] left-1/2 -translate-x-1/2 pointer-events-none -z-10"
                            style={{
                                width: flameSize > 1.5 ? '44px' : '26px',
                                height: flameSize > 1.5 ? '280px' : '180px',
                                filter: flameSize > 1.5 ? 'blur(20px)' : 'blur(10px)',
                                opacity: smokeOpacityNum,
                                background: `linear-gradient(to bottom, ${smokeColorHex}, transparent)`
                            }}
                        />
                    )}
                </div>

                {/* World container (Translates DOWN as camera pans UP) */}
                <div 
                    className="absolute bottom-0 left-0 w-full h-[60px] z-10 pointer-events-none"
                    style={{ 
                        transform: `translateY(${camAlt * scale}px)`,
                        transition: isPlaying ? 'none' : 'transform 0.3s ease-out'
                    }}
                >
                    {/* The Earth */}
                    <div className="absolute top-[20px] left-0 w-full h-[1000px] bg-slate-900 border-t-2 border-emerald-600">
                        {/* Grass visual line */}
                        <div className="w-full h-1 bg-emerald-500/40" />
                    </div>

                    {/* Launch Pad Exhaust Deflection (Ground Smoke Bouncing) */}
                    {thrusting && !falling && altCurrent < 30 && (
                        <div 
                            className="absolute bottom-[40px] left-1/2 -translate-x-1/2 flex justify-center items-end flex-nowrap pointer-events-none z-30"
                            style={{ 
                                opacity: Math.max(0, 1 - altCurrent / 30) * smokeOpacityNum * 1.5,
                                transform: `scale(${1 + (altCurrent / 30) * 1.5})`
                            }}
                        >
                            <div 
                                className="w-[160px] h-[35px] rounded-[100%] animate-pulse relative left-4"
                                style={{
                                    background: `radial-gradient(ellipse at center, ${smokeColorHex} 0%, transparent 70%)`,
                                    filter: 'blur(12px)'
                                }}
                            />
                            <div 
                                className="w-[160px] h-[35px] rounded-[100%] animate-pulse relative right-4"
                                style={{
                                    background: `radial-gradient(ellipse at center, ${smokeColorHex} 0%, transparent 70%)`,
                                    filter: 'blur(12px)'
                                }}
                            />
                        </div>
                    )}

                    {/* Hangar with COHETEROS Text */}
                    <div className="absolute right-[calc(50%+40px)] bottom-[40px] w-56 h-24 bg-zinc-800 border-2 border-zinc-700 rounded-t-xl overflow-hidden shadow-2xl z-0">
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-14 bg-zinc-900 border-t border-l border-r border-zinc-700 flex flex-col items-center pt-2">
                           <div className="w-full h-0.5 bg-zinc-800 mb-2" />
                           <div className="w-full h-0.5 bg-zinc-800 mb-2" />
                           <div className="w-full h-0.5 bg-zinc-800 mb-2" />
                        </div>
                        <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        
                        <div className="absolute top-3 w-full flex justify-center items-center gap-2 text-[14px] text-zinc-100 font-black italic tracking-[0.1em] drop-shadow-md">
                           <svg viewBox="0 0 100 100" className="w-6 h-6 fill-zinc-100 drop-shadow-md" style={{ transform: 'rotate(-5deg)' }}>
                                <path d="M50 0 L55 40 L100 50 L55 60 L50 100 L45 60 L0 50 L45 40 Z" />
                                <path d="M60 40 L85 25 L75 45 Z" />
                           </svg>
                           <span className="mt-1">COHETEROS</span>
                        </div>
                    </div>

                    {/* Launch Tower / Ramp */}
                    <div className="absolute left-[calc(50%+20px)] bottom-[40px] w-8 h-[350px] flex flex-col justify-end items-center pointer-events-none z-10">
                        <div className="absolute bottom-0 w-1.5 h-full bg-slate-600" />
                        
                        <div className="absolute bottom-0 left-0 w-full h-full flex flex-col justify-between py-1">
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map((idx) => (
                                <div key={`tower-brace-${idx}`} className="w-full h-2 border-b border-slate-700 relative">
                                    <div className="absolute inset-0 bg-slate-500/20" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>

            {/* Bottom Controls */}
            <div className="flex items-center gap-4 px-4 py-2.5 bg-slate-900 border-t border-slate-800 z-20 shrink-0">
                <Button 
                    onClick={handlePlayToggle} 
                    className="w-24 h-8 bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold gap-1.5 shadow-[0_0_10px_rgba(56,189,248,0.4)]"
                >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    {isPlaying ? (t?.pause || 'Pausar') : (timeIndex >= (apogeeData?.t.length || 1) - 1 ? (t?.restart || 'Reiniciar') : (t?.play || 'Play'))}
                </Button>
                
                <div className="flex-1 px-2">
                    <input 
                        type="range" 
                        min="0" 
                        max={(apogeeData?.t.length || 1) - 1} 
                        value={timeIndex} 
                        onChange={(e) => {
                            setTimeIndex(Number(e.target.value));
                            setIsPlaying(false);
                        }} 
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400" 
                    />
                </div>

                <div className="flex items-center gap-1.5 w-[110px]">
                    <span className="text-[10px] text-slate-400 font-mono uppercase">{t?.speed || 'Vel:'}</span>
                    <Select value={String(speed)} onValueChange={v => setSpeed(Number(v))}>
                        <SelectTrigger className="h-7 text-[10px] border-slate-700 bg-slate-950 text-sky-300 font-mono">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 text-sky-200 font-mono text-[10px] border-slate-700">
                            <SelectItem value="0.25">0.25x</SelectItem>
                            <SelectItem value="0.5">0.5x</SelectItem>
                            <SelectItem value="1">1.0x (Real)</SelectItem>
                            <SelectItem value="2">2.0x</SelectItem>
                            <SelectItem value="4">4.0x</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </Card>
    );
}
