import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SimulationResults, MotorInput, NozzleInput, getPropellantVisualProfile } from '../lib/types';
import { Motor3DViewer } from './Motor3DViewer';
import { EngineViewer } from './EngineViewer';
import { GrainViewer } from './GrainViewer';
import { Button } from '@/components/ui/button';
import { 
  Box, 
  Layers, 
  Play, 
  Pause, 
  Flame, 
  Activity 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PlaybackWrapper({ 
  results, 
  t_parent,
  motor,
  nozzle
}: { 
  results: SimulationResults; 
  t_parent?: any;
  motor?: MotorInput;
  nozzle?: NozzleInput;
}) {
  const t = t_parent || {};

  const [activeTab, setActiveTab] = useState<'3d' | '2d'>('3d');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [timeIndex, setTimeIndex] = useState(0);
  
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);
  const simulatedTimeRef = useRef<number>(0);

  useEffect(() => {
    setTimeIndex(0);
    setIsPlaying(false);
    simulatedTimeRef.current = 0;
  }, [results]);

  useEffect(() => {
    if (!isPlaying || !results || !results.t || results.t.length === 0) return;
    
    simulatedTimeRef.current = results.t[timeIndex] || 0;
    previousTimeRef.current = performance.now();

    const animate = (time: number) => {
      const deltaTime = (time - previousTimeRef.current!) / 1000;
      simulatedTimeRef.current += deltaTime * speed;
      
      setTimeIndex(prev => {
        let newIndex = prev;
        while (newIndex < results.t.length - 1 && results.t[newIndex] < simulatedTimeRef.current) {
           newIndex++;
        }
        if (newIndex >= results.t.length - 1) {
           setIsPlaying(false);
           return results.t.length - 1;
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
  }, [isPlaying, speed, results]);

  const handlePlayToggle = () => {
    if (!isPlaying && timeIndex >= results.t.length - 1) {
      setTimeIndex(0);
      simulatedTimeRef.current = 0;
    }
    setIsPlaying(!isPlaying);
  };

  const profile = useMemo(() => {
    return getPropellantVisualProfile(results?.propellantType || 1);
  }, [results?.propellantType]);

  if (!results || !results.t) return null;

  const currentT = results.t[timeIndex] || 0;
  const currentThrust = results.F_N[timeIndex] || 0;
  const currentP = results.P0_gage[timeIndex] || 0;
  const maxThrust = Math.max(1, results.summary.Fmax_N || 1);
  const normThrust = Math.min(1, Math.max(0, currentThrust / maxThrust));

  return (
    <div className="flex flex-col w-full h-full min-h-[480px] gap-2">
      
      {/* Sub-navigation bar for 3D vs 2D Views */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 rounded-lg border border-border shrink-0">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={activeTab === '3d' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('3d')}
            className={`h-7 text-xs font-mono font-bold gap-1.5 transition-all ${
              activeTab === '3d' 
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Box size={14} className="text-purple-300" />
            <span>{t?.active_tab_3d || 'Motor 3D Interactivo'}</span>
          </Button>

          <Button
            size="sm"
            variant={activeTab === '2d' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('2d')}
            className={`h-7 text-xs font-mono font-bold gap-1.5 transition-all ${
              activeTab === '2d' 
                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers size={14} className="text-sky-300" />
            <span>{t?.active_tab_2d || 'Análisis Geométrico 2D'}</span>
          </Button>
        </div>

        <span className="text-[10px] font-mono text-muted-foreground hidden sm:inline">
          {activeTab === '3d' ? (t?.tab_3d_hint || 'Gira con clic y arrastre • Zoom con rueda') : (t?.tab_2d_hint || 'Perfiles longitudinales y transversales')}
        </span>
      </div>

      {/* Main View Area */}
      <div className="flex-1 min-h-[420px] relative rounded-xl overflow-hidden border border-border">
        {activeTab === '3d' ? (
          <Motor3DViewer
            results={results}
            timeIndex={timeIndex}
            motor={motor}
            nozzle={nozzle}
            onTimeChange={(newIdx) => {
              setTimeIndex(newIdx);
              setIsPlaying(false);
            }}
            isPlaying={isPlaying}
            onTogglePlay={handlePlayToggle}
            speed={speed}
            onSpeedChange={setSpeed}
            t={t}
          />
        ) : (
          <div className="flex flex-col w-full h-full bg-slate-950 text-slate-100 rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative select-none">
            
            {/* TOP HUD BAR FOR 2D VIEW (Exact same setup as 3D version) */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                <div>
                  <span className="font-bold text-xs uppercase tracking-widest text-white font-mono flex items-center gap-2">
                    <Flame size={14} className="text-orange-500" />
                    {t?.motor_2d_title || 'Animación 2D del Motor • CFD y Cámara'}
                  </span>
                  <div className="text-[10px] text-slate-300 font-mono flex items-center gap-1.5 mt-0.5">
                    <span className="text-purple-300 font-semibold">{profile.displayName}</span>
                    <span>•</span>
                    <span>{results.grains.length} {t?.grains_types || 'tipos de granos'}</span>
                  </div>
                </div>
              </div>

              {/* Live Gauges in HUD (Matching 3D setup) */}
              <div className="flex items-center gap-4 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase">{t?.thrust || 'Thrust'}:</span>
                  <span className="font-bold text-orange-400">{currentThrust.toFixed(1)} N</span>
                </div>
                <div className="h-3 w-px bg-slate-700"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase">{t?.pressure || 'Pressure'}:</span>
                  <span className="font-bold text-sky-400">{(currentP * 10).toFixed(2)} bar</span>
                </div>
                <div className="h-3 w-px bg-slate-700"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase">{t?.axis_time?.split(' ')[0] || 'Time'}:</span>
                  <span className="font-bold text-purple-300">T+ {currentT.toFixed(3)}s</span>
                </div>
              </div>

              {/* Motor Status Badge */}
              <div className="flex items-center gap-1.5 bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-700 font-mono text-[11px] text-slate-200">
                <Activity size={13} className="text-emerald-400" />
                <span>{normThrust > 0.05 ? `🔥 ${t?.motor_firing || 'EN COMBUSTIÓN'}` : (timeIndex >= results.t.length - 1 ? `🏁 ${t?.motor_exhausted || 'AGOTADO'}` : `⏸ ${t?.motor_standby || 'EN ESPERA'}`)}</span>
              </div>
            </div>

            {/* Middle Scrollable 2D View Area */}
            <div className="flex-1 min-h-0 flex flex-col gap-3 p-3 bg-slate-950/60 overflow-y-auto">
              <div className="flex-1 min-h-[220px] rounded-lg border border-slate-800 overflow-hidden">
                <EngineViewer results={results} timeIndex={timeIndex} t={t} />
              </div>
              <div className="flex-1 min-h-[200px] rounded-lg border border-slate-800 overflow-hidden">
                <GrainViewer results={results} timeIndex={timeIndex} t={t} />
              </div>
            </div>

            {/* BOTTOM PLAYBACK CONTROLS BAR (With Speed Selector, Slider & Play/Pause) */}
            <div className="flex items-center gap-4 px-4 py-3 bg-slate-900/90 border-t border-slate-800 backdrop-blur-md z-10 shrink-0">
              
              {/* Play/Pause Button */}
              <Button
                onClick={handlePlayToggle}
                className={`w-24 h-8 font-mono text-xs font-bold gap-1.5 transition-all shadow-md ${
                  isPlaying 
                    ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                    : 'bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.4)]'
                }`}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                {isPlaying ? (t?.pause || 'Pausar') : (timeIndex >= results.t.length - 1 ? (t?.restart || 'Reiniciar') : (t?.play || 'Play'))}
              </Button>

              {/* Timeline Slider */}
              <div className="flex-1 flex flex-col justify-center px-2">
                <input
                  type="range"
                  min="0"
                  max={results.t.length - 1}
                  value={timeIndex}
                  onChange={(e) => {
                    setTimeIndex(Number(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>0.000s</span>
                  <span className="font-bold text-white text-xs drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]">
                    T+ {currentT.toFixed(3)}s / {(results.summary.t_quemado || results.t[results.t.length - 1]).toFixed(3)}s
                  </span>
                  <span>{(results.summary.t_quemado || results.t[results.t.length - 1]).toFixed(3)}s</span>
                </div>
              </div>

              {/* Speed Selector */}
              <div className="flex items-center gap-1.5 w-[110px]">
                <span className="text-[10px] text-slate-400 font-mono uppercase">{t?.speed_label || t?.playback_speed || 'Vel:'}</span>
                <Select value={String(speed)} onValueChange={(v) => setSpeed(Number(v))}>
                  <SelectTrigger className="h-7 text-[10px] border-slate-700 bg-slate-950 text-sky-300 font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 text-sky-200 font-mono text-[10px] border-slate-700">
                    <SelectItem value="0.25">0.25x</SelectItem>
                    <SelectItem value="0.5">0.5x</SelectItem>
                    <SelectItem value="1">1.0x ({t?.real_time || 'Real'})</SelectItem>
                    <SelectItem value="2">2.0x</SelectItem>
                    <SelectItem value="4">4.0x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
