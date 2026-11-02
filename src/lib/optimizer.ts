import { GrainInput, MotorInput, NozzleInput, SimulationInputs, SimulationResults, CustomPropellant, DEFAULT_PROPELLANTS } from './types';
import { runSimulation } from './simulator';

export type SmartSearchGoal = 'max_impulse' | 'fast_speed' | 'flat_thrust' | 'progressive' | 'target_impulse';

export type VariableConstraintMode = 'free' | 'fixed' | 'range';

export type SearchPrecisionMode = 'basic' | 'advanced';

export interface SmartSearchConfig {
  // Search precision mode: 'basic' (fast standard search) vs 'advanced' (deep multi-neighborhood exploration around optimal)
  searchPrecision?: SearchPrecisionMode;

  // Phase 1: Hardware & Chamber Limits & Efficiencies
  Dc: number; // Chamber inner diameter (mm)
  Lc: number; // Chamber usable length (mm)
  Pmax_lim: number; // Maximum allowable safe chamber pressure (MPa) - default 6.0
  etac?: number; // Combustion chamber efficiency (e.g., 0.85)
  Gstar?: number;
  kv?: number;
  Pamb?: number; // Atmospheric pressure (MPa, default 0.101325)
  
  // Fixed Nozzle Data from Phase 1
  Dt0: number; // Throat diameter (mm)
  Ds: number;  // Exit diameter (mm)
  alpha: number; // Divergence angle (deg)
  etanoz?: number; // Nozzle efficiency (e.g., 0.75)
  e?: number; // Throat variation / erosion (mm)
  propellantId: number; // Selected propellant
  
  // Phase 2: Grain Constraints & Free vs Locked variables
  shape: 1 | 2 | 3 | 4; // 1: Cylindrical/BATES, 2: Star, 3: Solid, 4: Finocyl
  grainCountMode: 'range' | 'fixed';
  maxGrainCount: number; // Maximum grain count when mode is 'range' (1 to X)
  fixedGrainCount: number; // Exact grain count when mode is 'fixed'
  
  // Outer Diameter (D0)
  modeD0?: VariableConstraintMode;
  lockD0?: boolean;
  valD0?: number; // Grain outer diameter when fixed
  minD0?: number; // Minimum D0 when range
  maxD0?: number; // Maximum D0 when range
  
  // Core Diameter (d0)
  moded0?: VariableConstraintMode;
  lockd0?: boolean;
  vald0?: number; // Grain core diameter when fixed
  mind0?: number; // Minimum d0 when range
  maxd0?: number; // Maximum d0 when range
  
  // Grain Length (L0)
  modeL0?: VariableConstraintMode;
  lockL0?: boolean;
  valL0?: number; // Grain segment length when fixed
  minL0?: number; // Minimum L0 when range
  maxL0?: number; // Maximum L0 when range

  // Total Propellant Mass Constraint (Mprop)
  modeMprop?: VariableConstraintMode;
  valMprop?: number; // Total propellant mass when fixed (g)
  minMprop?: number; // Minimum propellant mass (g)
  maxMprop?: number; // Maximum propellant mass (g)
  
  // Burn Surfaces: 1 = Burns (active), 0 = Inhibited
  osi: number; // Outer surface (1: burns, 0: inhibited)
  ci: number;  // Core (1: burns, 0: inhibited)
  ei: number;  // Ends (1: burns, 0: inhibited)
  
  // Phase 3: Mission Goal
  goal: SmartSearchGoal;
  targetAltitudeVal?: number; // Target Apogee in meters (e.g., 1000m, 2000m, 3000m)
  rocketDryMassKg?: number;   // Rocket dry mass in kg for apogee calculation (default 1.5 kg)
  targetImpulseVal?: number;  // Optional legacy fallback
  customPropellants?: CustomPropellant[];
}

export interface CandidateResult {
  id: string;
  rank: number;
  config: {
    grainCount: number;
    D0: number;
    d0: number;
    L0: number;
    totalGrainLength: number;
    shape: number;
    Dt0: number;
    Ds: number;
    propellantId: number;
    propellantName: string;
    grainSummary: string;
    osi: number;
    ci: number;
    ei: number;
  };
  simulation: SimulationResults;
  score: number;
  isSafe: boolean;
  metrics: {
    totalImpulse: number;
    maxPressure: number;
    avgPressure: number;
    maxThrust: number;
    avgThrust: number;
    initialThrust: number;
    burnTime: number;
    actionTime: number;
    isp: number;
    motorClass: string;
    thrustFlatness: number; // Ratio Fmed / Fmax (100% is perfectly flat)
    chamberFillFraction: number; // Total grain length / Lc (100% is full)
    propellantMassKg: number;
    predictedApogeeMeters?: number;
  };
  inputs: SimulationInputs;
}

export interface EvaluatedPoint {
  id: string;
  order: number;
  totalImpulse: number;
  maxPressure: number;
  avgPressure: number;
  burnTime: number;
  maxThrust: number;
  avgThrust: number;
  initialThrust: number;
  grainCount: number;
  D0: number;
  d0: number;
  L0: number;
  isSafe: boolean;
  score: number;
  bestScoreSoFar: number;
  configLabel: string;
}

export interface DiagnosticDetail {
  code: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface SmartSearchOutcome {
  bestCandidates: CandidateResult[];
  allEvaluatedPoints: EvaluatedPoint[];
  convergenceHistory: Array<{
    iteration: number;
    score: number;
    bestScore: number;
    candidateLabel: string;
    totalImpulse: number;
    maxPressure: number;
  }>;
  totalEvaluated: number;
  viableCount: number;
  safeCount: number;
  executionTimeMs: number;
  hasOverpressureWarning: boolean;
  message?: string;
  diagnostics?: DiagnosticDetail[];
}

export interface OptimizationProgress {
  generation?: number;
  maxGenerations?: number;
  evaluatedCount?: number;
  elapsedSeconds?: number;
  bestScoreSoFar?: number;
  currentBestConfig?: string;
  statusText?: string;
  phase?: string;
  stepDescription?: string;
  currentEvaluations?: number;
  totalEstimated?: number;
  percent?: number;
  elapsedMs?: number;
  bestConfigSummary?: string;
}

/**
 * Deterministic pseudo-random number generator (Mulberry32)
 * Ensures 100% repeatable results for identical input configurations
 */
function createDeterministicRng(seed: number = 0x8675309) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Analytical interior ballistics calculations to guide search space intelligently
 */
function computeBallisticLimits(
  prop: CustomPropellant,
  etac: number,
  Pmax_lim: number,
  Pmin_safe: number = 0.8
) {
  const gamma = prop.k || 1.15;
  const M_kg_mol = (prop.M || 40) / 1000;
  const R_univ = 8314.46;
  const T0 = prop.T0 || 1600;
  const a_val = prop.a || 5.0;
  const n = Math.max(0.1, Math.min(0.9, prop.n || 0.35));
  const rho_val = prop.rho || 1.7; // g/cm³

  const Gamma = Math.sqrt(gamma) * Math.pow(2 / (gamma + 1), (gamma + 1) / (2 * (gamma - 1)));
  const cStar = Math.sqrt(R_univ * T0 / (M_kg_mol * Math.pow(Gamma, 2))); // m/s
  
  // Steady state: P_MPa^(1-n) = Kn * (rho_g_cm3 * a_mm_s * 1e-6 * cStar * etac)
  const C_bal = rho_val * a_val * 1e-6 * cStar * Math.max(0.1, etac);
  const Kn_max_safe = Math.pow(Math.max(0.5, Pmax_lim), 1 - n) / Math.max(1e-9, C_bal);
  const Kn_min_safe = Math.pow(Math.max(0.3, Pmin_safe), 1 - n) / Math.max(1e-9, C_bal);

  return { Kn_max_safe, Kn_min_safe, C_bal, cStar, n };
}

/**
 * Objective evaluation function with strict interior ballistics and physical constraints
 */
function evaluateCandidate(
  N: number,
  L0: number,
  D0: number,
  d0: number,
  config: SmartSearchConfig,
  customProps: CustomPropellant[],
  Pmax_lim: number,
  Dc: number,
  Lc: number,
  Dt0: number,
  Ds: number,
  alpha: number
): { score: number; isSafe: boolean; simResult: SimulationResults | null; metrics: any } {
  // Geometric feasibility check
  if (L0 * N > Lc || D0 >= Dc || (config.shape !== 3 && d0 >= D0 - 2) || L0 < 5 || D0 < 10) {
    return { score: -999999, isSafe: false, simResult: null, metrics: null };
  }

  const etacVal = config.etac !== undefined ? config.etac : 0.85;
  const etanozVal = config.etanoz !== undefined ? config.etanoz : 0.75;
  const pambVal = config.Pamb !== undefined ? config.Pamb : 0.101325;
  const gstarVal = config.Gstar !== undefined ? config.Gstar : 1.0;
  const kvVal = config.kv !== undefined ? config.kv : 0.1;
  const eVal = config.e !== undefined ? config.e : 0;

  const simMotor: MotorInput = {
    Dc: Dc,
    Lc: Lc,
    Gstar: gstarVal,
    kv: kvVal,
    etac: etacVal,
    paso_de_tiempo: 0.005, // High-performance fast solver for smart search
    Pamb: pambVal
  };

  const simNozzle: NozzleInput = {
    Dt0: Dt0,
    Ds: Ds,
    e: eVal,
    alpha: alpha,
    etanoz: etanozVal
  };

  const simGrains: GrainInput[] = [{
    id: '1',
    shape: config.shape,
    propellantType: config.propellantId,
    D0: D0,
    d0: config.shape === 3 ? 0 : d0,
    d0mayor: config.shape === 2 ? Math.min(D0 - 1, d0 * 1.45) : 0,
    L0: L0,
    N: N,
    Np: 5,
    osi: config.osi,
    ci: config.shape === 3 ? 0 : config.ci,
    ei: config.ei,
    rhorat: 1.0
  }];

  const simInputs: SimulationInputs = {
    motor: simMotor,
    grains: simGrains,
    nozzle: simNozzle,
    customPropellants: customProps
  };

  try {
    const simResult = runSimulation(simInputs);
    if (!simResult || !simResult.summary || simResult.summary.t_quemado <= 0) {
      return { score: -999999, isSafe: false, simResult: null, metrics: null };
    }

    const summary = simResult.summary;
    const Pmax = summary.Pmax_MPa;
    const It = summary.It_total_N_s;
    const Fmax = summary.Fmax_N;
    const Fmed = summary.Fmed_N;
    const tb = summary.t_quemado;
    const isp = summary.Isp_total_s;
    const propMassKg = (summary.initial_mass_g && summary.initial_mass_g > 0)
      ? summary.initial_mass_g / 1000
      : (simResult.mgra_total && simResult.mgra_total[0] ? simResult.mgra_total[0] / 1000 : 0.2);
    const propMassGrams = propMassKg * 1000;

    const isSafe = Pmax <= Pmax_lim && Pmax >= 0.4;
    const thrustFlatness = Fmax > 0 ? (Fmed / Fmax) : 0;
    const fillFraction = (N * L0) / Lc;
    const initialF = simResult.F_N[1] || simResult.F_N[0] || Fmed;

    // Rocket ballistic apogee estimation (Suborbital 1D physics)
    const dryMassKg = Math.max(0.2, config.rocketDryMassKg || 1.5);
    const avgFlightMassKg = dryMassKg + 0.5 * propMassKg;
    const rocketDiamM = Math.max(0.05, (Dc * 1.15) / 1000);
    const dragArea = Math.PI * Math.pow(rocketDiamM / 2, 2);
    const Cd = 0.45;
    const g = 9.80665;
    const avgNetAccel = Math.max(0, (Fmed / avgFlightMassKg) - g);
    const burnoutVel = avgNetAccel * tb * 0.94; // approx drag loss during boost
    const burnoutAlt = 0.5 * avgNetAccel * Math.pow(tb, 2);
    const dragFactor = (0.5 * 1.225 * burnoutVel * Cd * dragArea) / dryMassKg;
    const coastAlt = Math.pow(burnoutVel, 2) / (2 * g * (1 + dragFactor));
    const predictedApogeeMeters = Math.max(0, Math.round(burnoutAlt + coastAlt));

    // Penalties for overpressure and unstable low pressure
    const overpressurePenalty = Pmax > Pmax_lim ? Math.pow(Pmax - Pmax_lim, 2) * 220 + (Pmax - Pmax_lim) * 100 : 0;
    const chuffingPenalty = Pmax < 0.8 ? Math.pow(0.8 - Pmax, 2) * 120 : 0;

    // Propellant mass constraint penalty
    let massConstraintPenalty = 0;
    if (config.modeMprop === 'fixed' && config.valMprop && config.valMprop > 0) {
      const targetMassG = config.valMprop;
      const massDiffG = Math.abs(propMassGrams - targetMassG);
      const relativeDiff = massDiffG / targetMassG;
      if (relativeDiff > 0.01) { // 1% tolerance
        massConstraintPenalty = Math.pow(relativeDiff, 1.3) * 1800;
      }
    } else if (config.modeMprop === 'range') {
      const minM = config.minMprop !== undefined ? config.minMprop : 0;
      const maxM = config.maxMprop !== undefined ? config.maxMprop : 999999;
      if (propMassGrams < minM && minM > 0) {
        const underFrac = (minM - propMassGrams) / minM;
        massConstraintPenalty = Math.pow(underFrac, 1.3) * 2200;
      } else if (propMassGrams > maxM) {
        const overFrac = (propMassGrams - maxM) / maxM;
        massConstraintPenalty = Math.pow(overFrac, 1.3) * 2200;
      }
    }

    let score = 0;

    switch (config.goal) {
      case 'max_impulse': {
        // Max altitude & total impulse: Maximize energy with efficient volumetric filling and safe chamber pressure
        const pressureEfficiency = Math.min(1.15, Math.max(0.7, (Pmax / Pmax_lim)));
        score = (It * 3.0) * (1 + 0.35 * thrustFlatness) * pressureEfficiency + (fillFraction * 45) - overpressurePenalty - chuffingPenalty - massConstraintPenalty;
        break;
      }
      case 'fast_speed': {
        // Cómo va más rápido el cohete / Salida Rápida de Rampa:
        // Busca una curva que tenga una subida rápida de fuerza al inicio (pico inicial temprano), 
        // y que a partir de ese punto comience a descender (perfil regresivo).
        const peakIdx = simResult.F_N.indexOf(Fmax);
        const peakFraction = peakIdx >= 0 ? peakIdx / Math.max(1, simResult.F_N.length) : 0;
        
        // El pico debe ocurrir muy temprano (en el primer 15-20% del quemado)
        const earlyPeakBonus = peakFraction <= 0.20 
          ? (1.0 - peakFraction * 2.5) 
          : -Math.pow(peakFraction - 0.20, 2) * 60;
        
        // Empuje inicial cercano o igual al pico máximo
        const initialThrustRatio = Fmax > 0 ? (initialF / Fmax) : 0.5;
        
        // Regresividad: la fuerza tras el pico desciende progresivamente hacia el final
        const endF = simResult.F_N[Math.floor(simResult.F_N.length * 0.85)] || (Fmed * 0.5);
        const isRegressive = (initialF - endF) / Math.max(1, Fmed);
        const regressiveBonus = Math.max(0, isRegressive) * 0.45;
        
        // Garantizar aprovechamiento volumétrico de la cámara de combustión
        const fillBonus = Math.pow(fillFraction, 1.3) * 55;
        const fillPenalty = fillFraction < 0.70 ? Math.pow(0.70 - fillFraction, 2) * 450 : 0;
        
        score = (initialF * 2.6 + Fmax * 1.5) * (1 + 0.4 * initialThrustRatio) * (1 + regressiveBonus) * (1 + 0.25 * Math.max(0, earlyPeakBonus)) + fillBonus - fillPenalty - overpressurePenalty - chuffingPenalty - massConstraintPenalty;
        break;
      }
      case 'target_impulse': {
        // Impulso Total Objetivo Específico (N·s)
        const targetIt = config.targetImpulseVal || 250;
        const diffIt = Math.abs(It - targetIt);
        const impulseCloseness = Math.max(0, 2500 - Math.pow(diffIt, 1.2) * 5);
        score = impulseCloseness + (thrustFlatness * 35) + (fillFraction * 30) - overpressurePenalty - chuffingPenalty - massConstraintPenalty;
        break;
      }
      case 'flat_thrust': {
        // Pure neutral BATES burning: minimize variance and maximize Fmed/Fmax ratio close to 1.0
        score = (It * 1.8) * Math.pow(thrustFlatness, 1.8) * 120 + (fillFraction * 20) - overpressurePenalty - chuffingPenalty - massConstraintPenalty;
        break;
      }
      case 'progressive': {
        // Progressive burn: thrust ramps up towards burnout
        const midF = simResult.F_N[Math.floor(simResult.F_N.length * 0.75)] || Fmed;
        const progressivity = (midF - initialF) / Math.max(1, Fmed);
        score = (It * 1.4) * (1 + 3.0 * Math.max(0, progressivity)) + (fillFraction * 20) - overpressurePenalty - chuffingPenalty - massConstraintPenalty;
        break;
      }
    }

    const actionTime = parseFloat((tb * 1.04).toFixed(2));

    const metrics = {
      totalImpulse: parseFloat(It.toFixed(1)),
      maxPressure: parseFloat(Pmax.toFixed(2)),
      avgPressure: parseFloat(summary.Pmed_MPa.toFixed(2)),
      maxThrust: parseFloat(Fmax.toFixed(1)),
      avgThrust: parseFloat(Fmed.toFixed(1)),
      initialThrust: parseFloat(initialF.toFixed(1)),
      burnTime: parseFloat(tb.toFixed(2)),
      actionTime,
      isp: parseFloat(isp.toFixed(1)),
      motorClass: summary.motorClass || 'N/A',
      thrustFlatness: parseFloat((thrustFlatness * 100).toFixed(0)),
      chamberFillFraction: parseFloat((fillFraction * 100).toFixed(0)),
      propellantMassKg: parseFloat(propMassKg.toFixed(3)),
      propellantMassGrams: parseFloat(propMassGrams.toFixed(1)),
      predictedApogeeMeters
    };

    return { score, isSafe, simResult, metrics };
  } catch (err) {
    return { score: -999999, isSafe: false, simResult: null, metrics: null };
  }
}

/**
 * Asynchronous Intelligent Evolutionary & Adaptive Search Algorithm
 * Runs in non-blocking batches and emits real-time progress events.
 */
export async function runSmartSearchAsync(
  config: SmartSearchConfig,
  onProgress?: (progress: OptimizationProgress) => void
): Promise<SmartSearchOutcome> {
  const startTime = performance.now();
  const rng = createDeterministicRng(0x8675309); // Deterministic seed for reproducible optima
  const allPoints: EvaluatedPoint[] = [];
  const convergenceHistory: SmartSearchOutcome['convergenceHistory'] = [];
  const evaluatedMap = new Map<string, CandidateResult>();

  const customProps = config.customPropellants || [];
  const propellantObj = customProps.find(p => p.id === config.propellantId) ||
    DEFAULT_PROPELLANTS.find(p => p.id === config.propellantId) ||
    DEFAULT_PROPELLANTS[0];

  const Dc = Math.max(15, config.Dc || 50);
  const Lc = Math.max(30, config.Lc || 250);
  const Pmax_lim = Math.max(1.0, config.Pmax_lim || 6.0);
  const Dt0 = Math.max(1.5, config.Dt0 || 8.0);
  const Ds = Math.max(Dt0, config.Ds || Dt0 * 2.2);
  const alpha = config.alpha || 15;
  
  const etacVal = config.etac !== undefined ? config.etac : 0.85;
  const etanozVal = config.etanoz !== undefined ? config.etanoz : 0.75;
  const pambVal = config.Pamb !== undefined ? config.Pamb : 0.101325;
  const gstarVal = config.Gstar !== undefined ? config.Gstar : 1.0;
  const kvVal = config.kv !== undefined ? config.kv : 0.1;
  const eVal = config.e !== undefined ? config.e : 0;

  const modeD0 = config.modeD0 || (config.lockD0 ? 'fixed' : 'free');
  const moded0 = config.moded0 || (config.lockd0 ? 'fixed' : 'free');
  const modeL0 = config.modeL0 || (config.lockL0 ? 'fixed' : 'free');
  const modeMprop = config.modeMprop || 'free';

  // Analytical interior ballistics pre-filter to drastically reduce invalid/overpressure samples
  const { Kn_max_safe, Kn_min_safe } = computeBallisticLimits(propellantObj, etacVal, Pmax_lim, 0.7);
  const At_mm2 = (Math.PI / 4) * Math.pow(Dt0, 2);

  // 1. Determine N values (Segment counts to explore)
  let N_values: number[] = [];
  if (config.grainCountMode === 'fixed') {
    N_values = [Math.max(1, Math.min(8, config.fixedGrainCount || 3))];
  } else {
    const maxN = Math.max(1, Math.min(8, config.maxGrainCount || 5));
    for (let i = 1; i <= maxN; i++) {
      N_values.push(i);
    }
  }

  // 2. Determine D0 options
  let D0_options: number[] = [];
  if (modeD0 === 'fixed') {
    D0_options = [Math.min(Dc - 0.5, Math.max(10, config.valD0 || (Dc - 1)))];
  } else if (modeD0 === 'range') {
    const minD = Math.max(10, config.minD0 !== undefined ? config.minD0 : (Dc - 3));
    const maxD = Math.min(Dc - 0.5, config.maxD0 !== undefined ? config.maxD0 : (Dc - 0.5));
    if (minD >= maxD) {
      D0_options = [minD];
    } else {
      const step = (maxD - minD) / 3;
      D0_options = [
        parseFloat(maxD.toFixed(1)),
        parseFloat((maxD - step).toFixed(1)),
        parseFloat((minD + step).toFixed(1)),
        parseFloat(minD.toFixed(1))
      ];
    }
  } else {
    // Standard casing clearance options: 1.0mm, 1.5mm, 2.0mm, 2.5mm
    D0_options = [
      Math.max(10, Dc - 1.0),
      Math.max(10, Dc - 1.5),
      Math.max(10, Dc - 2.0),
      Math.max(10, Dc - 2.5)
    ];
  }

  const isAdvancedMode = config.searchPrecision === 'advanced';
  let totalEvaluations = 0;
  let candidateCounter = 0;
  let currentBestScore = -999999;
  let currentBestLabel = '';

  const estimatedTotalEvaluations = isAdvancedMode
    ? Math.max(300, N_values.length * D0_options.length * 72)
    : Math.max(160, N_values.length * D0_options.length * 44);

  const reportProgress = (statusText: string, customPercent?: number) => {
    if (onProgress) {
      const calculatedPercent = customPercent !== undefined 
        ? customPercent 
        : Math.min(98, Math.max(6, Math.round((totalEvaluations / estimatedTotalEvaluations) * 90) + 6));
      
      const elapsedMs = Math.round(performance.now() - startTime);
      const elapsedSeconds = parseFloat((elapsedMs / 1000).toFixed(1));

      onProgress({
        phase: 'optimizing',
        stepDescription: statusText,
        currentEvaluations: totalEvaluations,
        totalEstimated: estimatedTotalEvaluations,
        percent: calculatedPercent,
        elapsedMs: elapsedMs,
        elapsedSeconds: elapsedSeconds,
        bestScoreSoFar: parseFloat(currentBestScore.toFixed(1)),
        bestConfigSummary: currentBestLabel,
        statusText
      });
    }
  };

  reportProgress(
    isAdvancedMode 
      ? 'Iniciando optimizador avanzado: Fase exploratoria inicial...' 
      : 'Iniciando exploración inteligente del espacio balístico...',
    6
  );
  await new Promise(r => setTimeout(r, 10));

  // Helper evaluator
  const runEvaluation = (N: number, sL0: number, D0: number, sd0: number) => {
    const key = `${N}_${D0.toFixed(1)}_${sL0.toFixed(1)}_${sd0.toFixed(1)}`;
    if (evaluatedMap.has(key)) {
      return evaluatedMap.get(key)!;
    }

    totalEvaluations++;
    const evalRes = evaluateCandidate(N, sL0, D0, sd0, config, customProps, Pmax_lim, Dc, Lc, Dt0, Ds, alpha);
    if (!evalRes.simResult || evalRes.score <= -9999) {
      return null;
    }

    const shapeName = config.shape === 1 ? 'BATES' : config.shape === 2 ? 'Star' : config.shape === 4 ? 'Finocyl' : 'Solid';
    const candLabel = `${N}x ${shapeName} D${D0}/d${sd0} L${sL0}mm`;

    if (evalRes.score > currentBestScore) {
      currentBestScore = evalRes.score;
      currentBestLabel = `${candLabel} (${evalRes.metrics.totalImpulse} N·s | Pmax: ${evalRes.metrics.maxPressure} MPa)`;
    }

    const candId = `cand_${++candidateCounter}`;
    const candObj: CandidateResult = {
      id: candId,
      rank: 0,
      config: {
        grainCount: N,
        D0: D0,
        d0: sd0,
        L0: sL0,
        totalGrainLength: N * sL0,
        shape: config.shape,
        Dt0: Dt0,
        Ds: Ds,
        propellantId: config.propellantId,
        propellantName: propellantObj.name,
        grainSummary: `${N}x ${shapeName} D=${D0}mm, d=${sd0}mm, L=${sL0}mm (Total: ${N * sL0}mm)`,
        osi: config.osi,
        ci: config.ci,
        ei: config.ei
      },
      simulation: evalRes.simResult,
      score: evalRes.score,
      isSafe: evalRes.isSafe,
      metrics: evalRes.metrics,
      inputs: {
        motor: { Dc, Lc, Gstar: gstarVal, kv: kvVal, etac: etacVal, paso_de_tiempo: 0.005, Pamb: pambVal },
        grains: [{
          id: '1',
          shape: config.shape,
          propellantType: config.propellantId,
          D0,
          d0: config.shape === 3 ? 0 : sd0,
          d0mayor: config.shape === 2 ? Math.min(D0 - 1, sd0 * 1.45) : 0,
          L0: sL0,
          N,
          Np: 5,
          osi: config.osi,
          ci: config.shape === 3 ? 0 : config.ci,
          ei: config.ei,
          rhorat: 1.0
        }],
        nozzle: { Dt0, Ds, e: eVal, alpha, etanoz: etanozVal },
        customPropellants: customProps
      }
    };

    evaluatedMap.set(key, candObj);

    const pt: EvaluatedPoint = {
      id: candId,
      order: totalEvaluations,
      totalImpulse: evalRes.metrics.totalImpulse,
      maxPressure: evalRes.metrics.maxPressure,
      avgPressure: evalRes.metrics.avgPressure,
      burnTime: evalRes.metrics.burnTime,
      maxThrust: evalRes.metrics.maxThrust,
      avgThrust: evalRes.metrics.avgThrust,
      initialThrust: evalRes.metrics.initialThrust,
      grainCount: N,
      D0: D0,
      d0: sd0,
      L0: sL0,
      isSafe: evalRes.isSafe,
      score: parseFloat(evalRes.score.toFixed(1)),
      bestScoreSoFar: parseFloat(currentBestScore.toFixed(1)),
      configLabel: candLabel
    };
    allPoints.push(pt);

    convergenceHistory.push({
      iteration: totalEvaluations,
      score: parseFloat(evalRes.score.toFixed(1)),
      bestScore: parseFloat(currentBestScore.toFixed(1)),
      candidateLabel: pt.configLabel,
      totalImpulse: evalRes.metrics.totalImpulse,
      maxPressure: evalRes.metrics.maxPressure
    });

    return candObj;
  };

  // For each discrete segment count N and outer diameter D0:
  for (const N of N_values) {
    for (const D0 of D0_options) {
      const maxL0_possible = Math.floor((Lc - (N * 1.2)) / N);
      if (maxL0_possible < 8) continue;

      let minL0 = 8;
      let maxL0 = maxL0_possible;

      if (modeL0 === 'fixed') {
        minL0 = Math.min(maxL0_possible, Math.max(8, config.valL0 || 50));
        maxL0 = minL0;
      } else if (modeL0 === 'range') {
        minL0 = Math.max(8, config.minL0 !== undefined ? Math.min(maxL0_possible, config.minL0) : Math.floor(maxL0_possible * 0.35));
        maxL0 = Math.min(maxL0_possible, config.maxL0 !== undefined ? Math.max(minL0, config.maxL0) : maxL0_possible);
      } else {
        minL0 = Math.max(8, Math.floor(maxL0_possible * 0.25));
        maxL0 = maxL0_possible;
      }

      let mind0 = 0;
      let maxd0 = 0;

      if (config.shape === 3) {
        mind0 = 0;
        maxd0 = 0;
      } else if (moded0 === 'fixed') {
        mind0 = Math.min(D0 - 2, Math.max(2, config.vald0 !== undefined ? config.vald0 : 10));
        maxd0 = mind0;
      } else if (moded0 === 'range') {
        mind0 = Math.max(2, config.mind0 !== undefined ? Math.min(D0 - 2, config.mind0) : Math.round(D0 * 0.12));
        maxd0 = Math.min(D0 - 2, config.maxd0 !== undefined ? Math.max(mind0, config.maxd0) : Math.round(D0 * 0.75));
      } else {
        mind0 = Math.max(2.5, Math.round(D0 * 0.10));
        maxd0 = Math.max(mind0 + 1, Math.min(D0 - 2, Math.round(D0 * 0.78)));
      }

      // Ballistic pre-filtering for core diameter d0:
      // For BATES / tubular grains, ensure initial Kn does not heavily exceed Kn_max_safe
      if (config.shape === 1 && config.ci === 1 && moded0 !== 'fixed') {
        // Approximate burn area: Ab_init = N * (pi * d0 * L0 + (ei ? 2 * pi/4 * (D0^2 - d0^2) : 0))
        // If d0 is too small, port area is tiny and burning area can be high, but more importantly, Kn must not exceed 1.15 * Kn_max_safe
        const Ab_target_max = Kn_max_safe * At_mm2;
        // Solving for minimum safe d0 at maxL0
        const approxMinCore = Math.max(mind0, Math.min(maxd0, (Ab_target_max / (N * Math.PI * maxL0)) * 0.65));
        mind0 = parseFloat(approxMinCore.toFixed(1));
      }

      // Mass constraint guidance: if fixed mass, calculate nominal L0 for given d0
      if (modeMprop === 'fixed' && config.valMprop && config.valMprop > 0 && modeL0 !== 'fixed') {
        const rho_g_mm3 = (propellantObj.rho || 1.7) * 1e-3;
        const avg_d0 = (mind0 + maxd0) / 2;
        const grain_cross_area_mm2 = (Math.PI / 4) * (Math.pow(D0, 2) - Math.pow(avg_d0, 2));
        const estimated_L0_target = config.valMprop / (N * grain_cross_area_mm2 * rho_g_mm3);
        if (estimated_L0_target >= 8 && estimated_L0_target <= maxL0_possible) {
          minL0 = Math.max(8, Math.floor(estimated_L0_target * 0.75));
          maxL0 = Math.min(maxL0_possible, Math.ceil(estimated_L0_target * 1.25));
        }
      }

      const isCompletelyFixed = (modeL0 === 'fixed') && (config.shape === 3 || moded0 === 'fixed');
      type Individual = { L0: number; d0: number; score: number; isSafe: boolean };
      let population: Individual[] = [];

      // Step A: Seed population across the ballistic-safe region
      let L0_seeds: number[] = [];
      if (modeL0 === 'fixed' || minL0 >= maxL0) {
        L0_seeds = [minL0];
      } else {
        const numL = 10;
        const stepL = (maxL0 - minL0) / numL;
        for (let i = 0; i <= numL; i++) {
          L0_seeds.push(parseFloat((maxL0 - i * stepL).toFixed(1)));
        }
      }

      let d0_seeds: number[] = [];
      if (config.shape === 3 || moded0 === 'fixed' || mind0 >= maxd0) {
        d0_seeds = [mind0];
      } else {
        const numD = 10;
        const stepD = (maxd0 - mind0) / numD;
        for (let i = 0; i <= numD; i++) {
          d0_seeds.push(parseFloat((mind0 + i * stepD).toFixed(1)));
        }
      }

      for (const sL0 of L0_seeds) {
        for (const sd0 of d0_seeds) {
          const cand = runEvaluation(N, sL0, D0, sd0);
          if (cand && cand.score > -9999) {
            population.push({
              L0: sL0,
              d0: sd0,
              score: cand.score,
              isSafe: cand.isSafe
            });
          }

          if (totalEvaluations % 10 === 0) {
            reportProgress(`Fase 1/3: Muestreando espacio balístico (${totalEvaluations} simulaciones)...`);
            await new Promise(r => setTimeout(r, 0));
          }
        }
      }

      // Step B: Deterministic Differential Evolution & Adaptive Swarm
      if (!isCompletelyFixed && population.length >= 4) {
        const generations = 20;
        for (let gen = 0; gen < generations; gen++) {
          population.sort((a, b) => b.score - a.score);
          const topSub = population.slice(0, Math.max(4, Math.floor(population.length * 0.45)));
          const newPop: Individual[] = [...topSub];

          const numTrials = 16;
          for (let i = 0; i < numTrials; i++) {
            const idx1 = Math.floor(rng() * population.length);
            let idx2 = Math.floor(rng() * population.length);
            while (idx2 === idx1) idx2 = Math.floor(rng() * population.length);
            let idx3 = Math.floor(rng() * population.length);
            while (idx3 === idx1 || idx3 === idx2) idx3 = Math.floor(rng() * population.length);

            const best = population[0];
            const p1 = population[idx1];
            const p2 = population[idx2];

            const F = 0.65;
            let trialL0 = modeL0 === 'fixed'
              ? minL0
              : parseFloat((best.L0 + F * (p1.L0 - p2.L0) + (rng() - 0.5) * 4.0).toFixed(1));
            trialL0 = Math.max(minL0, Math.min(maxL0, trialL0));

            let triald0 = (config.shape === 3 || moded0 === 'fixed')
              ? mind0
              : parseFloat((best.d0 + F * (p1.d0 - p2.d0) + (rng() - 0.5) * 2.5).toFixed(1));
            triald0 = Math.max(mind0, Math.min(maxd0, triald0));

            const cand = runEvaluation(N, trialL0, D0, triald0);
            if (cand && cand.score > -9999) {
              newPop.push({
                L0: trialL0,
                d0: triald0,
                score: cand.score,
                isSafe: cand.isSafe
              });
            }

            if (totalEvaluations % 10 === 0) {
              reportProgress(`Fase 2/3: Enjambre evolutivo balístico (${totalEvaluations} simulaciones)...`);
              await new Promise(r => setTimeout(r, 0));
            }
          }
          population = newPop;
        }

        // Step C: High-Precision Local Polish around top solutions
        population.sort((a, b) => b.score - a.score);
        const elite = population.slice(0, Math.min(4, population.length));

        for (const el of elite) {
          const lDeltas = modeL0 === 'fixed' ? [0] : [-1.5, -0.8, -0.4, 0.4, 0.8, 1.5];
          const dDeltas = (config.shape === 3 || moded0 === 'fixed') ? [0] : [-1.0, -0.5, -0.2, 0.2, 0.5, 1.0];

          for (const dl of lDeltas) {
            for (const dd of dDeltas) {
              const polL0 = parseFloat(Math.max(minL0, Math.min(maxL0, el.L0 + dl)).toFixed(1));
              const pold0 = parseFloat(Math.max(mind0, Math.min(maxd0, el.d0 + dd)).toFixed(1));
              runEvaluation(N, polL0, D0, pold0);

              if (totalEvaluations % 10 === 0) {
                reportProgress(`Fase 3/3: Calibración de alta resolución (${totalEvaluations} simulaciones)...`);
                await new Promise(r => setTimeout(r, 0));
              }
            }
          }
        }
      }
    }
  }

  // =========================================================================
  // FASE 4: BÚSQUEDA PROFUNDA AVANZADA ALREDEDOR DEL ÓPTIMO (ADVANCED MODE ONLY)
  // Re-exploración ultra precisa con micro-muestreo exhaustivo alrededor del óptimo previo
  // =========================================================================
  if (isAdvancedMode) {
    reportProgress('Fase 4/4: Búsqueda avanzada profunda alrededor del óptimo previo...', 82);
    await new Promise(r => setTimeout(r, 20));

    const initialPool = Array.from(evaluatedMap.values());
    const safeInitial = initialPool.filter(c => c.isSafe);
    safeInitial.sort((a, b) => b.score - a.score);
    initialPool.sort((a, b) => b.score - a.score);

    const eliteCandidates = (safeInitial.length > 0 ? safeInitial : initialPool).slice(0, 3);

    for (const elite of eliteCandidates) {
      const N_opt = elite.config.grainCount;
      const baseD0 = elite.config.D0;
      const baseL0 = elite.config.L0;
      const based0 = elite.config.d0;

      const maxL0_opt = Math.floor((Lc - (N_opt * 1.2)) / N_opt);
      const minL0_opt = Math.max(8, modeL0 === 'range' ? (config.minL0 || 10) : 8);
      const effMaxL0 = Math.min(maxL0_opt, modeL0 === 'range' ? (config.maxL0 || maxL0_opt) : maxL0_opt);

      const mind0_opt = Math.max(2.5, moded0 === 'range' ? (config.mind0 || 4) : 2.5);
      const maxd0_opt = Math.min(baseD0 - 2, moded0 === 'range' ? (config.maxd0 || (baseD0 - 2)) : (baseD0 - 2));

      // 1. Ultra-fine micro-grid perturbations around the best (L0, d0, D0)
      const fineL0Deltas = modeL0 === 'fixed' 
        ? [0] 
        : [-3.0, -2.2, -1.6, -1.1, -0.7, -0.4, -0.2, 0.2, 0.4, 0.7, 1.1, 1.6, 2.2, 3.0];
      
      const fined0Deltas = (config.shape === 3 || moded0 === 'fixed') 
        ? [0] 
        : [-2.5, -1.8, -1.3, -0.9, -0.6, -0.3, -0.1, 0.1, 0.3, 0.6, 0.9, 1.3, 1.8, 2.5];

      const fineD0Deltas = modeD0 === 'fixed'
        ? [0]
        : [-0.4, -0.2, 0, 0.2, 0.4];

      for (const dD of fineD0Deltas) {
        const testD0 = parseFloat(Math.max(10, Math.min(Dc - 0.5, baseD0 + dD)).toFixed(1));

        for (const dL of fineL0Deltas) {
          for (const dd of fined0Deltas) {
            const microL0 = parseFloat(Math.max(minL0_opt, Math.min(effMaxL0, baseL0 + dL)).toFixed(1));
            const microd0 = parseFloat(Math.max(mind0_opt, Math.min(Math.min(maxd0_opt, testD0 - 2), based0 + dd)).toFixed(1));

            runEvaluation(N_opt, microL0, testD0, microd0);

            if (totalEvaluations % 12 === 0) {
              reportProgress(`Fase 4/4: Búsqueda avanzada ultra precisa (${totalEvaluations} simulaciones)...`);
              await new Promise(r => setTimeout(r, 0));
            }
          }
        }
      }

      // 2. High-density localized stochastic perturbations (Cauchy / Gaussian micro-radius)
      const targetedTrials = (modeL0 === 'fixed' && moded0 === 'fixed') ? 0 : 36;
      for (let t = 0; t < targetedTrials; t++) {
        const radius = (rng() * 2.2) + 0.1;
        const angle = rng() * 2 * Math.PI;
        const dL = modeL0 === 'fixed' ? 0 : Math.cos(angle) * radius;
        const dd = (config.shape === 3 || moded0 === 'fixed') ? 0 : Math.sin(angle) * (radius * 0.7);

        const stochL0 = parseFloat(Math.max(minL0_opt, Math.min(effMaxL0, baseL0 + dL)).toFixed(1));
        const stochd0 = parseFloat(Math.max(mind0_opt, Math.min(baseD0 - 2, based0 + dd)).toFixed(1));

        runEvaluation(N_opt, stochL0, baseD0, stochd0);

        if (totalEvaluations % 12 === 0) {
          reportProgress(`Fase 4/4: Búsqueda avanzada ultra precisa (${totalEvaluations} simulaciones)...`);
          await new Promise(r => setTimeout(r, 0));
        }
      }
    }
  }

  reportProgress('Finalizando selección de configuraciones óptimas...', 100);
  await new Promise(r => setTimeout(r, 30));

  const allCandidatesList = Array.from(evaluatedMap.values());
  const safeCandidates = allCandidatesList.filter(c => c.isSafe);
  const hasOverpressureWarning = safeCandidates.length === 0 && allCandidatesList.length > 0;

  // Sorting
  safeCandidates.sort((a, b) => b.score - a.score);
  allCandidatesList.sort((a, b) => b.score - a.score);

  const primaryPool = safeCandidates.length > 0 ? safeCandidates : allCandidatesList;

  // Diversity Niching: Pick top 6-8 solutions ensuring diverse grain counts and physical geometries
  const maxOutputCandidates = 6;
  const selectedTopCandidates: CandidateResult[] = [];
  const usedNicheKeys = new Set<string>();

  for (const cand of primaryPool) {
    const nicheKey = `${cand.config.grainCount}_${Math.round(cand.config.L0 / 6)}_${Math.round(cand.config.d0 / 2.5)}`;
    if (!usedNicheKeys.has(nicheKey) || selectedTopCandidates.length >= maxOutputCandidates - 1) {
      usedNicheKeys.add(nicheKey);
      selectedTopCandidates.push({
        ...cand,
        rank: selectedTopCandidates.length + 1
      });
      if (selectedTopCandidates.length >= maxOutputCandidates) break;
    }
  }

  // If still fewer than max and pool has more, fill remaining
  if (selectedTopCandidates.length < maxOutputCandidates) {
    for (const cand of primaryPool) {
      if (!selectedTopCandidates.some(s => s.id === cand.id)) {
        selectedTopCandidates.push({
          ...cand,
          rank: selectedTopCandidates.length + 1
        });
        if (selectedTopCandidates.length >= maxOutputCandidates) break;
      }
    }
  }

  const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(1));

  // Diagnostics
  const diagnostics: DiagnosticDetail[] = [];
  if (selectedTopCandidates.length === 0) {
    if (modeL0 === 'fixed' && config.valL0 && config.valL0 * (config.fixedGrainCount || 1) > Lc) {
      diagnostics.push({
        code: 'CHAMBER_TOO_SHORT',
        title: 'Longitud de grano bloqueada excede la cámara',
        description: `Has fijado L0 = ${config.valL0} mm con ${config.fixedGrainCount || 1} segmentos (${(config.valL0 * (config.fixedGrainCount || 1))} mm total), superando la longitud útil de la cámara (Lc = ${Lc} mm).`,
        recommendation: `Reduce la longitud L0 a un valor inferior a ${Math.floor(Lc / (config.fixedGrainCount || 1))} mm o desbloquea L0 para que el optimizador la calcule automáticamente.`
      });
    } else if (moded0 === 'fixed' && modeD0 === 'fixed' && config.vald0 && config.valD0 && config.vald0 >= config.valD0 - 2) {
      diagnostics.push({
        code: 'CORE_TOO_LARGE',
        title: 'Diámetro de núcleo bloqueado incompatible',
        description: `El núcleo d0 (${config.vald0} mm) es mayor o igual que el diámetro exterior D0 (${config.valD0} mm), dejando espesor de pared nulo o negativo.`,
        recommendation: `Reduce el núcleo d0 o desbloquea d0 para buscar espesores óptimos.`
      });
    } else {
      diagnostics.push({
        code: 'GENERAL_GEOMETRY',
        title: 'No se encontraron soluciones viables',
        description: `El espacio paramétrico no generó configuraciones válidas con las restricciones actuales (Cámara: Dc=${Dc}mm, Lc=${Lc}mm, Tobera: Dt=${Dt0}mm).`,
        recommendation: 'Prueba liberando bloqueos de variables (D0, d0 o L0) o ajustando la garganta de tobera Dt.'
      });
    }
  } else if (hasOverpressureWarning) {
    diagnostics.push({
      code: 'OVERPRESSURE_ALL',
      title: 'Sobrepresión por garganta de tobera reducida',
      description: `Todas las configuraciones evaluadas alcanzan presiones pico superiores al límite fijado (${Pmax_lim} MPa) debido al área reducida de garganta (Dt = ${Dt0} mm).`,
      recommendation: `Aumenta el diámetro de garganta Dt a ${Math.round(Dt0 * 1.25)} mm o incrementa el diámetro del núcleo d0.`
    });
  }

  reportProgress('¡Optimización completada exitosamente!', 100);

  return {
    bestCandidates: selectedTopCandidates,
    allEvaluatedPoints: allPoints,
    convergenceHistory,
    totalEvaluated: allCandidatesList.length,
    viableCount: allCandidatesList.length,
    safeCount: safeCandidates.length,
    executionTimeMs,
    hasOverpressureWarning,
    diagnostics
  };
}

/**
 * Synchronous wrapper for backwards compatibility
 */
export function runSmartSearch(
  config: SmartSearchConfig,
  onProgress?: (progress: OptimizationProgress) => void
): SmartSearchOutcome {
  let outcome: SmartSearchOutcome | null = null;
  // Use async runner
  runSmartSearchAsync(config, onProgress).then(res => { outcome = res; });
  // If needed synchronous, we can run synchronous logic or return
  return outcome || runSmartSearchSyncInternal(config);
}

function runSmartSearchSyncInternal(config: SmartSearchConfig): SmartSearchOutcome {
  // Synchronous fallback
  const startTime = performance.now();
  const allPoints: EvaluatedPoint[] = [];
  const convergenceHistory: SmartSearchOutcome['convergenceHistory'] = [];
  const evaluatedMap = new Map<string, CandidateResult>();
  const customProps = config.customPropellants || [];
  const propellantObj = customProps.find(p => p.id === config.propellantId) ||
    DEFAULT_PROPELLANTS.find(p => p.id === config.propellantId) ||
    DEFAULT_PROPELLANTS[0];

  const Dc = Math.max(15, config.Dc || 50);
  const Lc = Math.max(30, config.Lc || 250);
  const Pmax_lim = Math.max(1.0, config.Pmax_lim || 6.0);
  const Dt0 = Math.max(1.5, config.Dt0 || 8.0);
  const Ds = Math.max(Dt0, config.Ds || Dt0 * 2.2);
  const alpha = config.alpha || 15;

  const etacVal = config.etac !== undefined ? config.etac : 0.85;
  const etanozVal = config.etanoz !== undefined ? config.etanoz : 0.75;
  const pambVal = config.Pamb !== undefined ? config.Pamb : 0.101325;
  const gstarVal = config.Gstar !== undefined ? config.Gstar : 1.0;
  const kvVal = config.kv !== undefined ? config.kv : 0.1;
  const eVal = config.e !== undefined ? config.e : 0;

  const modeD0 = config.modeD0 || (config.lockD0 ? 'fixed' : 'free');
  const moded0 = config.moded0 || (config.lockd0 ? 'fixed' : 'free');
  const modeL0 = config.modeL0 || (config.lockL0 ? 'fixed' : 'free');

  let N_values: number[] = [];
  if (config.grainCountMode === 'fixed') {
    N_values = [Math.max(1, Math.min(8, config.fixedGrainCount || 3))];
  } else {
    const maxN = Math.max(1, Math.min(8, config.maxGrainCount || 5));
    for (let i = 1; i <= maxN; i++) {
      N_values.push(i);
    }
  }

  let D0_options: number[] = [];
  if (modeD0 === 'fixed') {
    D0_options = [Math.min(Dc - 0.5, Math.max(10, config.valD0 || (Dc - 1)))];
  } else if (modeD0 === 'range') {
    const minD = Math.max(10, config.minD0 !== undefined ? config.minD0 : (Dc - 3));
    const maxD = Math.min(Dc - 0.5, config.maxD0 !== undefined ? config.maxD0 : (Dc - 0.5));
    D0_options = minD >= maxD ? [minD] : [maxD, (maxD + minD) / 2, minD];
  } else {
    D0_options = [Math.max(10, Dc - 1.0), Math.max(10, Dc - 2.0)];
  }

  let totalEvaluations = 0;
  let candidateCounter = 0;
  let currentBestScore = -999999;

  for (const N of N_values) {
    for (const D0 of D0_options) {
      const maxL0_possible = Math.floor((Lc - (N * 1.2)) / N);
      if (maxL0_possible < 8) continue;
      const minL0 = modeL0 === 'fixed' ? Math.min(maxL0_possible, config.valL0 || 50) : 8;
      const maxL0 = modeL0 === 'fixed' ? minL0 : maxL0_possible;
      const mind0 = config.shape === 3 ? 0 : (moded0 === 'fixed' ? config.vald0 || 10 : Math.round(D0 * 0.15));
      const maxd0 = config.shape === 3 ? 0 : (moded0 === 'fixed' ? mind0 : Math.round(D0 * 0.7));

      for (let sL0 = minL0; sL0 <= maxL0; sL0 += Math.max(2, (maxL0 - minL0) / 8)) {
        for (let sd0 = mind0; sd0 <= maxd0; sd0 += Math.max(1.5, (maxd0 - mind0) / 8)) {
          const key = `${N}_${D0}_${sL0.toFixed(1)}_${sd0.toFixed(1)}`;
          if (evaluatedMap.has(key)) continue;
          totalEvaluations++;
          const evalRes = evaluateCandidate(N, sL0, D0, sd0, config, customProps, Pmax_lim, Dc, Lc, Dt0, Ds, alpha);
          if (evalRes.simResult && evalRes.score > -9999) {
            if (evalRes.score > currentBestScore) currentBestScore = evalRes.score;
            const candId = `cand_${++candidateCounter}`;
            const candObj: CandidateResult = {
              id: candId,
              rank: 0,
              config: {
                grainCount: N,
                D0,
                d0: sd0,
                L0: sL0,
                totalGrainLength: N * sL0,
                shape: config.shape,
                Dt0,
                Ds,
                propellantId: config.propellantId,
                propellantName: propellantObj.name,
                grainSummary: `${N}x D=${D0}mm, d=${sd0}mm, L=${sL0}mm`,
                osi: config.osi,
                ci: config.ci,
                ei: config.ei
              },
              simulation: evalRes.simResult,
              score: evalRes.score,
              isSafe: evalRes.isSafe,
              metrics: evalRes.metrics,
              inputs: {
                motor: { Dc, Lc, Gstar: gstarVal, kv: kvVal, etac: etacVal, paso_de_tiempo: 0.005, Pamb: pambVal },
                grains: [{
                  id: '1',
                  shape: config.shape,
                  propellantType: config.propellantId,
                  D0,
                  d0: config.shape === 3 ? 0 : sd0,
                  d0mayor: config.shape === 2 ? Math.min(D0 - 1, sd0 * 1.45) : 0,
                  L0: sL0,
                  N,
                  Np: 5,
                  osi: config.osi,
                  ci: config.shape === 3 ? 0 : config.ci,
                  ei: config.ei,
                  rhorat: 1.0
                }],
                nozzle: { Dt0, Ds, e: eVal, alpha, etanoz: etanozVal },
                customPropellants: customProps
              }
            };
            evaluatedMap.set(key, candObj);
            allPoints.push({
              id: candId,
              order: totalEvaluations,
              totalImpulse: evalRes.metrics.totalImpulse,
              maxPressure: evalRes.metrics.maxPressure,
              avgPressure: evalRes.metrics.avgPressure,
              burnTime: evalRes.metrics.burnTime,
              maxThrust: evalRes.metrics.maxThrust,
              avgThrust: evalRes.metrics.avgThrust,
              initialThrust: evalRes.metrics.initialThrust,
              grainCount: N,
              D0,
              d0: sd0,
              L0: sL0,
              isSafe: evalRes.isSafe,
              score: evalRes.score,
              bestScoreSoFar: currentBestScore,
              configLabel: `${N}x D${D0}/d${sd0} L${sL0}`
            });
          }
        }
      }
    }
  }

  const allCandidatesList = Array.from(evaluatedMap.values());
  const safeCandidates = allCandidatesList.filter(c => c.isSafe);
  safeCandidates.sort((a, b) => b.score - a.score);
  allCandidatesList.sort((a, b) => b.score - a.score);
  const primaryPool = safeCandidates.length > 0 ? safeCandidates : allCandidatesList;

  return {
    bestCandidates: primaryPool.slice(0, 6).map((c, idx) => ({ ...c, rank: idx + 1 })),
    allEvaluatedPoints: allPoints,
    convergenceHistory,
    totalEvaluated: allCandidatesList.length,
    viableCount: allCandidatesList.length,
    safeCount: safeCandidates.length,
    executionTimeMs: parseFloat((performance.now() - startTime).toFixed(1)),
    hasOverpressureWarning: safeCandidates.length === 0 && allCandidatesList.length > 0
  };
}
