import React, { useState, useMemo } from 'react';
import { 
  SimulationResults, 
  MotorInput, 
  NozzleInput,
  CustomPropellant,
  getBurnRate,
  getPropellantData 
} from '../lib/types';
import { translations, Language } from '../lib/i18n';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  AreaChart,
  Area,
  Label as ChartLabel
} from 'recharts';
import { 
  Layers, 
  Activity, 
  Flame, 
  Weight, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  Gauge
} from 'lucide-react';

interface DetailedAnalysisViewProps {
  results: SimulationResults;
  lang: Language;
  motor?: MotorInput;
  nozzle?: NozzleInput;
  customPropellants?: CustomPropellant[];
}

type SubTab = 'areas' | 'kn' | 'burn_rate' | 'mass_flow';

export const DetailedAnalysisView: React.FC<DetailedAnalysisViewProps> = ({
  results,
  lang,
  motor,
  nozzle,
  customPropellants
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('areas');
  const [selectedGrainIdx, setSelectedGrainIdx] = useState<number | 'all'>('all');
  const [showTheoryInfo, setShowTheoryInfo] = useState<boolean>(false);

  const t = translations[lang] || translations.en;

  // ── Preparación y estructuración de datos para gráficas (Optimizado con muestreo ágil) ────
  const timeSeriesData = useMemo(() => {
    if (!results || !results.t || results.t.length === 0) return [];
    
    const initialMass_kg = (results.summary.initial_mass_g || 0) / 1000 || (results.mgra_total?.[0] || 0.001);
    const at0_mm2 = (nozzle?.Dt0 ? (Math.PI / 4) * Math.pow(nozzle.Dt0, 2) : 1);

    const totalPoints = results.t.length;
    // Factor de muestreo si hay miles de pasos para garantizar 60 FPS y carga instantánea
    const stride = totalPoints > 350 ? Math.ceil(totalPoints / 300) : 1;

    const sampledIndices: number[] = [];
    for (let i = 0; i < totalPoints; i += stride) {
      sampledIndices.push(i);
    }
    // Asegurar que el último punto siempre esté presente
    if (sampledIndices[sampledIndices.length - 1] !== totalPoints - 1) {
      sampledIndices.push(totalPoints - 1);
    }

    return sampledIndices.map(i => {
      const time = results.t[i] ?? 0;
      const pGage = results.P0_gage?.[i] ?? 0;
      const pAbs = results.P0_MPa?.[i] ?? (pGage + 0.1013);
      
      const at_mm2 = results.At_mm2?.[i] || at0_mm2;
      
      // Cálculo robusto de Ab total y Kn con fallback garantizado
      let totalAb_mm2 = results.Ab_total?.[i];
      if (totalAb_mm2 === undefined || isNaN(totalAb_mm2)) {
        totalAb_mm2 = results.grains.reduce((acc, _, gIdx) => acc + (results.grains_Ab?.[gIdx]?.[i] ?? 0), 0);
      }
      
      let knVal = results.Kn?.[i];
      if (knVal === undefined || isNaN(knVal) || knVal === 0) {
        knVal = at_mm2 > 0 ? totalAb_mm2 / at_mm2 : 0;
      }

      const rVal = results.r_burn?.[i] ?? 0;
      const mdotGen_gs = (results.mdot_gen?.[i] ?? 0) * 1000; // Convert to g/s
      const mdotNoz_gs = (results.mdot_noz?.[i] ?? 0) * 1000; // Convert to g/s
      const currentMass_g = (results.mgra_total?.[i] ?? 0) * 1000; // g
      const massPercent = initialMass_kg > 0 ? Math.max(0, Math.min(100, ((results.mgra_total?.[i] ?? 0) / initialMass_kg) * 100)) : 0;
      const totalAb_cm2 = totalAb_mm2 / 100; // mm² to cm²

      const entry: Record<string, any> = {
        time: Number(time.toFixed(4)),
        P0_gage: Number(pGage.toFixed(3)),
        P0_MPa: Number(pAbs.toFixed(3)),
        Kn: Number(knVal.toFixed(1)),
        r_burn: Number(rVal.toFixed(2)),
        mdot_gen: Number(mdotGen_gs.toFixed(2)),
        mdot_noz: Number(mdotNoz_gs.toFixed(2)),
        mass_g: Number(currentMass_g.toFixed(1)),
        mass_percent: Number(massPercent.toFixed(1)),
        Ab_total: Number(totalAb_cm2.toFixed(2)),
        At_mm2: Number(at_mm2.toFixed(2)),
      };

      // Incluir áreas de cada grano individual
      results.grains.forEach((_, gIdx) => {
        entry[`g${gIdx}_Abc`] = Number(((results.grains_Abc?.[gIdx]?.[i] ?? 0) / 100).toFixed(2));
        entry[`g${gIdx}_Abe`] = Number(((results.grains_Abe?.[gIdx]?.[i] ?? 0) / 100).toFixed(2));
        entry[`g${gIdx}_Abs`] = Number(((results.grains_Abs?.[gIdx]?.[i] ?? 0) / 100).toFixed(2));
        entry[`g${gIdx}_Ab`] = Number(((results.grains_Ab?.[gIdx]?.[i] ?? 0) / 100).toFixed(2));
      });

      return entry;
    });
  }, [results, nozzle]);

  // ── Curva teórica de Saint-Robert / Vieille (r vs P) ─────────────────────────
  const saintRobertCurveData = useMemo(() => {
    const pType = results.propellantType || 1;
    const pMax = Math.max(7, Math.ceil(results.summary.Pmax_MPa * 1.25));
    const points: Array<{ pressure: number; r: number }> = [];
    
    for (let p = 0.1; p <= pMax; p += 0.2) {
      const { a, n } = getBurnRate(p, pType, results.customPropellants || customPropellants);
      const r = a * Math.pow(p, n);
      points.push({
        pressure: Number(p.toFixed(2)),
        r: Number(r.toFixed(2))
      });
    }
    return points;
  }, [results, customPropellants]);

  // ── Diagnóstico y clasificación de perfiles ─────────────────────────────────
  const knAnalysis = useMemo(() => {
    const knMax = results.summary.Kn_max ?? 0;
    const knAvg = results.summary.Kn_avg ?? 0;
    const knInit = results.summary.Kn_initial ?? 0;
    const knFinal = results.summary.Kn_final ?? 0;

    let regimeBadge = {
      label: t.kn_regime_optimal,
      color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2
    };

    if (knAvg < 150) {
      regimeBadge = {
        label: t.kn_regime_chuffing,
        color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        icon: AlertTriangle
      };
    } else if (knMax > 450) {
      regimeBadge = {
        label: t.kn_regime_critical,
        color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
        icon: AlertTriangle
      };
    }

    return { knMax, knAvg, knInit, knFinal, regimeBadge };
  }, [results, t]);

  const burnRateAnalysis = useMemo(() => {
    const rMax = results.summary.r_max ?? 0;
    const rAvg = results.summary.r_avg ?? 0;
    const rInit = results.summary.r_initial ?? 0;
    
    const { a, n } = getBurnRate(Math.max(0.5, results.summary.Pmed_MPa || 3), results.propellantType || 1, results.customPropellants || customPropellants);

    // Determinar si es progresivo, regresivo o neutro
    let profileType = {
      label: t.neutral_burning,
      color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      icon: Minus
    };

    const delta = rMax - rInit;
    if (delta > 1.2) {
      profileType = {
        label: t.progressive_burning,
        color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
        icon: TrendingUp
      };
    } else if (delta < -1.2) {
      profileType = {
        label: t.regressive_burning,
        color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
        icon: TrendingDown
      };
    }

    const activePropellant = getPropellantData(results.propellantType || 1, results.customPropellants || customPropellants);

    return { rMax, rAvg, rInit, a, n, profileType, activePropellant };
  }, [results, t, customPropellants]);

  const massFlowAnalysis = useMemo(() => {
    const mdotMax_gs = (results.summary.mdot_max ?? 0) * 1000;
    const mdotAvg_gs = (results.summary.mdot_avg ?? 0) * 1000;
    const initialMass_g = results.summary.initial_mass_g ?? 0;

    return { mdotMax_gs, mdotAvg_gs, initialMass_g };
  }, [results]);

  return (
    <div id="detailed-analysis-container" className="flex flex-col h-full w-full gap-3 pb-8">
      {/* ── Sub-navigation Switcher Header ── */}
      <div id="detailed-subtabs-nav" className="flex flex-wrap items-center justify-between gap-2 p-1.5 rounded-xl bg-card border border-border shrink-0 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            id="subtab-btn-areas"
            onClick={() => setActiveSubTab('areas')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all ${
              activeSubTab === 'areas'
                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Layers size={15} />
            <span>{t.subtab_areas}</span>
          </button>

          <button
            id="subtab-btn-kn"
            onClick={() => setActiveSubTab('kn')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all ${
              activeSubTab === 'kn'
                ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Activity size={15} />
            <span>{t.subtab_kn}</span>
          </button>

          <button
            id="subtab-btn-burnrate"
            onClick={() => setActiveSubTab('burn_rate')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all ${
              activeSubTab === 'burn_rate'
                ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Flame size={15} />
            <span>{t.subtab_burn_rate}</span>
          </button>

          <button
            id="subtab-btn-massflow"
            onClick={() => setActiveSubTab('mass_flow')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg transition-all ${
              activeSubTab === 'mass_flow'
                ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Weight size={15} />
            <span>{t.subtab_mass_flow}</span>
          </button>
        </div>

        <button
          id="theory-info-toggle-btn"
          onClick={() => setShowTheoryInfo(!showTheoryInfo)}
          className={`flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono rounded-lg border transition-all ${
            showTheoryInfo
              ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/40'
              : 'bg-muted/50 text-muted-foreground border-border hover:text-foreground hover:bg-muted'
          }`}
        >
          <Info size={14} />
          <span>{t.more_info}</span>
        </button>
      </div>

      {/* ── Optional Theoretical Explanation Box ── */}
      {showTheoryInfo && (
        <div id="theory-info-banner" className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs leading-relaxed border border-slate-700 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-blue-400 mb-1.5 text-sm">
            <Sparkles size={16} />
            <span>
              {activeSubTab === 'areas' && t.areas_title}
              {activeSubTab === 'kn' && t.kn_title}
              {activeSubTab === 'burn_rate' && t.burn_rate_title}
              {activeSubTab === 'mass_flow' && t.mass_flow_title}
            </span>
          </div>
          <p className="text-slate-300 font-sans text-[12px] leading-relaxed">
            {activeSubTab === 'areas' && t.areas_desc}
            {activeSubTab === 'kn' && t.kn_desc}
            {activeSubTab === 'burn_rate' && t.burn_rate_desc}
            {activeSubTab === 'mass_flow' && t.mass_flow_desc}
          </p>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          SUB-TAB 1: BURNING AREAS (Ab)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'areas' && (
        <div id="subtab-content-areas" className="flex flex-col gap-4">
          {/* Controls: Grain selector filter */}
          <div className="flex items-center justify-between gap-3 bg-card p-2 px-3 rounded-lg border border-border">
            <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">{t.grain_selector}:</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedGrainIdx('all')}
                className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
                  selectedGrainIdx === 'all'
                    ? 'bg-purple-600 text-white border-purple-500 font-bold'
                    : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {t.all_grains_sum}
              </button>
              {results.grains.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedGrainIdx(idx)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all ${
                    selectedGrainIdx === idx
                      ? 'bg-purple-600 text-white border-purple-500 font-bold'
                      : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {t.grains} {idx + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Cards for Area Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Total Combined Area Chart */}
            {(selectedGrainIdx === 'all' || results.grains.length === 1) && (
              <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[420px]">
                <div className="py-2.5 px-4 bg-muted/40 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers size={16} className="text-purple-500" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                      {t.total_area} ({t.all_grains_sum})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">cm² vs Time</span>
                </div>
                <div className="p-2 pt-4 h-[380px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeriesData} margin={{ top: 15, right: 30, left: 20, bottom: 30 }}>
                      <defs>
                        <linearGradient id="areaGradientTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="2 4" stroke="currentColor" className="text-border" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        type="number" 
                        domain={[0, 'dataMax']}
                        tickFormatter={(v) => Number(v).toFixed(2)}
                        tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                        className="text-muted-foreground"
                        height={40}
                      >
                        <ChartLabel value={t.axis_time} position="insideBottom" offset={-10} className="fill-muted-foreground font-mono text-[11px]" />
                      </XAxis>
                      <YAxis 
                        tickFormatter={(v) => Number(v).toFixed(0)}
                        tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                        className="text-muted-foreground"
                        width={55}
                      >
                        <ChartLabel value={t.axis_area} angle={-90} position="insideLeft" offset={10} className="fill-muted-foreground font-mono text-[11px]" />
                      </YAxis>
                      <Tooltip 
                        formatter={(val: any) => [`${val} cm²`, t.total_area]}
                        labelFormatter={(lbl) => `T+ ${Number(lbl).toFixed(3)}s`}
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '8px' }} />
                      <Area isAnimationActive={false} type="monotone" dataKey="Ab_total" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#areaGradientTotal)" name={t.total_area} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Individual Grain Area Breakdown */}
            {results.grains.map((g, idx) => {
              if (selectedGrainIdx !== 'all' && selectedGrainIdx !== idx) return null;
              return (
                <div key={g.id || idx} className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[420px]">
                  <div className="py-2.5 px-4 bg-muted/40 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-purple-400" />
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                        {t.grains} {idx + 1} • {g.shape === 1 ? 'BATES / Cyl' : g.shape === 2 ? 'Star Core' : g.shape === 4 ? 'Finocyl (FMM)' : 'Solid End'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">cm² vs Time</span>
                  </div>
                  <div className="p-2 pt-4 h-[380px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeSeriesData} margin={{ top: 15, right: 30, left: 20, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke="currentColor" className="text-border" vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          type="number" 
                          domain={[0, 'dataMax']}
                          tickFormatter={(v) => Number(v).toFixed(2)}
                          tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                          className="text-muted-foreground"
                          height={40}
                        >
                          <ChartLabel value={t.axis_time} position="insideBottom" offset={-10} className="fill-muted-foreground font-mono text-[11px]" />
                        </XAxis>
                        <YAxis 
                          tickFormatter={(v) => Number(v).toFixed(0)}
                          tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                          className="text-muted-foreground"
                          width={55}
                        >
                          <ChartLabel value={t.axis_area} angle={-90} position="insideLeft" offset={10} className="fill-muted-foreground font-mono text-[11px]" />
                        </YAxis>
                        <Tooltip 
                          formatter={(val: any, name: any) => [`${val} cm²`, name]}
                          labelFormatter={(lbl) => `T+ ${Number(lbl).toFixed(3)}s`}
                          contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                        />
                        <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '8px' }} />
                        {g.ci === 1 && g.shape !== 3 && (
                          <Line isAnimationActive={false} type="monotone" dataKey={`g${idx}_Abc`} stroke="#ef4444" strokeWidth={2} dot={false} name={t.internal} />
                        )}
                        {g.ei === 1 && (
                          <Line isAnimationActive={false} type="monotone" dataKey={`g${idx}_Abe`} stroke="#3b82f6" strokeWidth={2} dot={false} name={t.ends} />
                        )}
                        {g.osi === 1 && (
                          <Line isAnimationActive={false} type="monotone" dataKey={`g${idx}_Abs`} stroke="#eab308" strokeWidth={2} dot={false} name={t.external} />
                        )}
                        <Line isAnimationActive={false} type="monotone" dataKey={`g${idx}_Ab`} stroke="#10b981" strokeWidth={2.5} strokeDasharray="3 3" dot={false} name={t.total_area} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          SUB-TAB 2: Kn (KNUDSEN) & PRESSURE REGIME
      ────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'kn' && (
        <div id="subtab-content-kn" className="flex flex-col gap-4">
          {/* KPI Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.kn_initial}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-indigo-500">{knAnalysis.knInit.toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">Ab/At</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.kn_max}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-rose-500">{knAnalysis.knMax.toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">Ab/At</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.kn_avg}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-foreground">{knAnalysis.knAvg.toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">Ab/At</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.burn_regime_type}</span>
              <div className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${knAnalysis.regimeBadge.color}`}>
                <knAnalysis.regimeBadge.icon size={14} />
                <span>{knAnalysis.regimeBadge.label}</span>
              </div>
            </div>
          </div>

          {/* Main Kn(t) and Pressure vs Time Synchronized Dual Chart */}
          <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[460px]">
            <div className="py-2.5 px-4 bg-muted/40 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge size={16} className="text-indigo-500" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                  {t.kn_vs_time} & {t.pressure_vs_time}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Kn</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> P0 (MPa)</span>
              </div>
            </div>
            <div className="p-2 pt-4 h-[440px] w-full min-h-[440px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData} margin={{ top: 20, right: 45, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="currentColor" className="text-border" vertical={false} />

                  <XAxis 
                    dataKey="time" 
                    type="number" 
                    domain={[0, 'dataMax']}
                    tickFormatter={(v) => Number(v).toFixed(2)}
                    tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                    className="text-muted-foreground"
                    height={40}
                  >
                    <ChartLabel value={t.axis_time} position="insideBottom" offset={-10} className="fill-muted-foreground font-mono text-[11px]" />
                  </XAxis>
                  
                  {/* Left Y Axis: Kn */}
                  <YAxis 
                    yAxisId="left"
                    domain={[0, (dataMax: number) => Math.max(250, Math.ceil(dataMax * 1.15))]}
                    tickFormatter={(v) => Number(v).toFixed(0)}
                    tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#6366f1' }}
                    width={55}
                  >
                    <ChartLabel value="Kn (Ab/At)" angle={-90} position="insideLeft" offset={10} fill="#6366f1" style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, textAnchor: 'middle' }} />
                  </YAxis>

                  {/* Right Y Axis: Chamber Pressure P0 */}
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    domain={[0, (dataMax: number) => Math.max(1, Number((dataMax * 1.2).toFixed(1)))]}
                    tickFormatter={(v) => Number(v).toFixed(1)}
                    tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#f43f5e' }}
                    width={55}
                  >
                    <ChartLabel value="P0 (MPa)" angle={90} position="insideRight" offset={10} fill="#f43f5e" style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 600, textAnchor: 'middle' }} />
                  </YAxis>

                  <Tooltip 
                    formatter={(val: any, name: any) => {
                      if (name === t.kn_legend_kn || name === 'Kn' || String(name).includes('Kn')) return [`${val} Ab/At`, t.kn_legend_kn];
                      return [`${val} MPa`, t.kn_legend_p];
                    }}
                    labelFormatter={(lbl) => `T+ ${Number(lbl).toFixed(3)}s`}
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                  />
                  
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '8px' }} />
                  
                  <Line isAnimationActive={false} yAxisId="left" type="monotone" dataKey="Kn" stroke="#6366f1" strokeWidth={2.5} dot={false} name={t.kn_legend_kn} />
                  <Line isAnimationActive={false} yAxisId="right" type="monotone" dataKey="P0_MPa" stroke="#f43f5e" strokeWidth={2.5} dot={false} name={t.kn_legend_p} />
                  
                  {/* Reference Critical Line for Chuffing */}
                  <ReferenceLine yAxisId="left" y={150} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Chuffing (150)', position: 'insideTopLeft', fill: '#f59e0b', fontSize: 10, fontFamily: 'monospace' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          SUB-TAB 3: BURN RATE (r) & SAINT-ROBERT / VIEILLE'S LAW
      ────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'burn_rate' && (
        <div id="subtab-content-burnrate" className="flex flex-col gap-4">
          {/* KPI Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.r_initial}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-amber-500">{burnRateAnalysis.rInit.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{t.r_unit}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.r_max}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-rose-500">{burnRateAnalysis.rMax.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{t.r_unit}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.r_avg}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-foreground">{burnRateAnalysis.rAvg.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{t.r_unit}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.burn_regime_type}</span>
              <div className={`mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${burnRateAnalysis.profileType.color}`}>
                <burnRateAnalysis.profileType.icon size={14} />
                <span>{burnRateAnalysis.profileType.label}</span>
              </div>
            </div>
          </div>

          {/* Grid of 2 Charts: Burn Rate r(t) vs Time AND Saint-Robert Characteristic Law Curve r(P) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Chart 1: r(t) vs Time */}
            <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[420px]">
              <div className="py-2.5 px-4 bg-muted/40 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-amber-500" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                    {t.burn_rate_vs_time}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">mm/s vs Time</span>
              </div>
              <div className="p-2 pt-4 h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData} margin={{ top: 15, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="currentColor" className="text-border" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      type="number" 
                      domain={[0, 'dataMax']}
                      tickFormatter={(v) => Number(v).toFixed(2)}
                      tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                      className="text-muted-foreground"
                      height={40}
                    >
                      <ChartLabel value={t.axis_time} position="insideBottom" offset={-10} className="fill-muted-foreground font-mono text-[11px]" />
                    </XAxis>
                    <YAxis 
                      domain={[0, 'auto']}
                      tickFormatter={(v) => Number(v).toFixed(1)}
                      tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                      className="text-muted-foreground"
                      width={55}
                    >
                      <ChartLabel value="r (mm/s)" angle={-90} position="insideLeft" offset={10} className="fill-muted-foreground font-mono text-[11px]" />
                    </YAxis>
                    <Tooltip 
                      formatter={(val: any) => [`${val} mm/s`, t.subtab_burn_rate]}
                      labelFormatter={(lbl) => `T+ ${Number(lbl).toFixed(3)}s`}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                    />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '8px' }} />
                    <Line isAnimationActive={false} type="monotone" dataKey="r_burn" stroke="#f59e0b" strokeWidth={2.5} dot={false} name="r (mm/s)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Saint-Robert's Law Curve: r(P) = a * P^n */}
            <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[420px]">
              <div className="py-2.5 px-4 bg-muted/40 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-amber-500" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                    {t.burn_rate_law_curve}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground font-mono">
                  a={burnRateAnalysis.a.toFixed(3)}, n={burnRateAnalysis.n.toFixed(3)}
                </span>
              </div>
              <div className="p-2 pt-4 h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={saintRobertCurveData} margin={{ top: 15, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="currentColor" className="text-border" vertical={false} />
                    <XAxis 
                      dataKey="pressure" 
                      type="number" 
                      domain={[0, 'dataMax']}
                      tickFormatter={(v) => Number(v).toFixed(1)}
                      tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                      className="text-muted-foreground"
                      height={40}
                    >
                      <ChartLabel value="Chamber Pressure P0 (MPa)" position="insideBottom" offset={-10} className="fill-muted-foreground font-mono text-[11px]" />
                    </XAxis>
                    <YAxis 
                      domain={[0, 'auto']}
                      tickFormatter={(v) => Number(v).toFixed(1)}
                      tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                      className="text-muted-foreground"
                      width={55}
                    >
                      <ChartLabel value="Burn Rate r (mm/s)" angle={-90} position="insideLeft" offset={10} className="fill-muted-foreground font-mono text-[11px]" />
                    </YAxis>
                    <Tooltip 
                      formatter={(val: any) => [`${val} mm/s`, "r (Saint-Robert)"]}
                      labelFormatter={(lbl) => `P: ${Number(lbl).toFixed(2)} MPa`}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                    />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '8px' }} />
                    <Line isAnimationActive={false} type="monotone" dataKey="r" stroke="#d97706" strokeWidth={2.5} dot={false} name="r = a · P^n" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table of Burn Rate vs Pressure Ranges for the simulated propellant */}
          {burnRateAnalysis.activePropellant && (
            <div className="p-4 rounded-xl bg-card border border-border shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-amber-500" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                    {lang === 'es' ? 'Tabla de Tasa de Quemado del Propulsor Seleccionado' : 'Selected Propellant Burn Rate Table'}: {burnRateAnalysis.activePropellant.name}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  r = a · Pⁿ [mm/s] (P en MPa)
                </span>
              </div>

              <div className="rounded-lg border border-border overflow-hidden bg-background">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-[11px] text-muted-foreground font-semibold">
                      <th className="py-2 px-3 text-left">{lang === 'es' ? 'Rango de Presión P [MPa]' : 'Pressure Range P [MPa]'}</th>
                      <th className="py-2 px-3 text-right">{lang === 'es' ? 'Coeficiente a' : 'Coefficient a'}</th>
                      <th className="py-2 px-3 text-right">{lang === 'es' ? 'Exponente n' : 'Exponent n'}</th>
                      <th className="py-2 px-3 text-right">{lang === 'es' ? 'Tasa a Pmed (mm/s)' : 'Rate at Pavg (mm/s)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(burnRateAnalysis.activePropellant.pressureRanges && burnRateAnalysis.activePropellant.pressureRanges.length > 0) ? (
                      burnRateAnalysis.activePropellant.pressureRanges.map((range, rIdx) => {
                        const pSample = Math.max(0.5, results.summary.Pmed_MPa || 3.0);
                        const isInRange = pSample >= range.pMin && pSample <= range.pMax;
                        const rAtPmed = (range.a * Math.pow(pSample, range.n)).toFixed(2);
                        return (
                          <tr key={rIdx} className={`hover:bg-muted/30 transition-colors ${isInRange ? 'bg-amber-500/10 font-bold' : ''}`}>
                            <td className="py-1.5 px-3 text-foreground font-medium">
                              {range.pMin.toFixed(3)} – {range.pMax >= 90 ? '∞' : range.pMax.toFixed(3)} MPa
                              {isInRange && <span className="ml-2 text-[10px] text-amber-500 font-bold uppercase">{lang === 'es' ? '(Régimen Actual)' : '(Current Regime)'}</span>}
                            </td>
                            <td className="py-1.5 px-3 text-right text-primary font-bold">{range.a.toFixed(4).replace(/\.?0+$/, '')}</td>
                            <td className="py-1.5 px-3 text-right text-amber-500 font-bold">{range.n.toFixed(3)}</td>
                            <td className="py-1.5 px-3 text-right text-foreground">{rAtPmed} mm/s</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="hover:bg-muted/30 transition-colors bg-amber-500/10 font-bold">
                        <td className="py-1.5 px-3 text-foreground font-medium">0.101 – ∞ MPa</td>
                        <td className="py-1.5 px-3 text-right text-primary font-bold">{burnRateAnalysis.activePropellant.a}</td>
                        <td className="py-1.5 px-3 text-right text-amber-500 font-bold">{burnRateAnalysis.activePropellant.n}</td>
                        <td className="py-1.5 px-3 text-right text-foreground">
                          {(burnRateAnalysis.activePropellant.a * Math.pow(Math.max(0.5, results.summary.Pmed_MPa || 3), burnRateAnalysis.activePropellant.n)).toFixed(2)} mm/s
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          SUB-TAB 4: MASS FLOW (ṁ) & PROPELLANT CONSUMPTION
      ────────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'mass_flow' && (
        <div id="subtab-content-massflow" className="flex flex-col gap-4">
          {/* KPI Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.initial_propellant_mass}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-emerald-500">{massFlowAnalysis.initialMass_g.toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">g</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.mdot_max}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-teal-500">{massFlowAnalysis.mdotMax_gs.toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">g/s</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.mdot_avg}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-foreground">{massFlowAnalysis.mdotAvg_gs.toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground font-mono">g/s</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-card border border-border shadow-sm flex flex-col">
              <span className="text-[11px] font-mono text-muted-foreground uppercase">{t.consumed_mass}</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">100.0</span>
                <span className="text-[10px] text-muted-foreground font-mono">%</span>
              </div>
            </div>
          </div>

          {/* Grid of 2 Charts: Dual Mass Flow (ṁ_gen vs ṁ_noz) and Propellant Consumption (%) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Chart 1: Dual Mass Flow (ṁ_gen vs ṁ_noz) */}
            <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[420px]">
              <div className="py-2.5 px-4 bg-muted/40 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Weight size={16} className="text-emerald-500" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                    {t.mass_flow_vs_time}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">g/s vs Time</span>
              </div>
              <div className="p-2 pt-4 h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData} margin={{ top: 15, right: 30, left: 20, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="2 4" stroke="currentColor" className="text-border" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      type="number" 
                      domain={[0, 'dataMax']}
                      tickFormatter={(v) => Number(v).toFixed(2)}
                      tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                      className="text-muted-foreground"
                      height={40}
                    >
                      <ChartLabel value={t.axis_time} position="insideBottom" offset={-10} className="fill-muted-foreground font-mono text-[11px]" />
                    </XAxis>
                    <YAxis 
                      domain={[0, 'auto']}
                      tickFormatter={(v) => Number(v).toFixed(0)}
                      tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                      className="text-muted-foreground"
                      width={55}
                    >
                      <ChartLabel value="ṁ (g/s)" angle={-90} position="insideLeft" offset={10} className="fill-muted-foreground font-mono text-[11px]" />
                    </YAxis>
                    <Tooltip 
                      formatter={(val: any, name: any) => [`${val} g/s`, name]}
                      labelFormatter={(lbl) => `T+ ${Number(lbl).toFixed(3)}s`}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                    />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '8px' }} />
                    <Line isAnimationActive={false} type="monotone" dataKey="mdot_gen" stroke="#10b981" strokeWidth={2.5} dot={false} name={t.mdot_gen} />
                    <Line isAnimationActive={false} type="monotone" dataKey="mdot_noz" stroke="#06b6d4" strokeWidth={2} strokeDasharray="4 4" dot={false} name={t.mdot_noz} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Propellant Mass Consumption vs Time (g & %) */}
            <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden min-h-[420px]">
              <div className="py-2.5 px-4 bg-muted/40 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Weight size={16} className="text-teal-500" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                    {t.mass_consumption_vs_time}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">g & % vs Time</span>
              </div>
              <div className="p-2 pt-4 h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData} margin={{ top: 15, right: 30, left: 20, bottom: 30 }}>
                    <defs>
                      <linearGradient id="propellantMassGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="currentColor" className="text-border" vertical={false} />
                    <XAxis 
                      dataKey="time" 
                      type="number" 
                      domain={[0, 'dataMax']}
                      tickFormatter={(v) => Number(v).toFixed(2)}
                      tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                      className="text-muted-foreground"
                      height={40}
                    >
                      <ChartLabel value={t.axis_time} position="insideBottom" offset={-10} className="fill-muted-foreground font-mono text-[11px]" />
                    </XAxis>
                    <YAxis 
                      domain={[0, 'auto']}
                      tickFormatter={(v) => Number(v).toFixed(0)}
                      tick={{ fontSize: 11, fontFamily: 'monospace', fill: 'currentColor' }}
                      className="text-muted-foreground"
                      width={55}
                    >
                      <ChartLabel value="Masa (g)" angle={-90} position="insideLeft" offset={10} className="fill-muted-foreground font-mono text-[11px]" />
                    </YAxis>
                    <Tooltip 
                      formatter={(val: any, name: any) => [name === t.mass_percentage ? `${val}%` : `${val} g`, name]}
                      labelFormatter={(lbl) => `T+ ${Number(lbl).toFixed(3)}s`}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }}
                    />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingBottom: '8px' }} />
                    <Area isAnimationActive={false} type="monotone" dataKey="mass_g" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#propellantMassGrad)" name={t.remaining_mass} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
