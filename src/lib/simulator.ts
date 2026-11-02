import { GrainInput, MotorInput, NozzleInput, SimulationInputs, SimulationResults, getPropellantData, getBurnRate, classifyMotor } from './types';
import { fzeroSearch } from './math';
import { buildFinocylGrain } from './fmmFinocyl';

/**
 * Calcula la variación del diámetro y área de garganta debido a erosión (e > 0)
 * o acumulación de escoria / slag (e < 0) según el modelo de progresión seleccionado.
 * 
 * Modelos disponibles (iero):
 * 1: Lineal: y = x
 * 2: Exponencial normalizada: y = (exp(x) - 1) / (exp(1) - 1)
 * 3: Cuadrática: y = x^2
 * 4: Raíz cuadrada: y = sqrt(x)
 * 5: Parábola cóncava (máx en x=1): y = -x^2 + 2x
 * 6: Senoidal: y = sin((pi/2)*x)
 */
export function calculateThroatErosion(
  Dt0: number,
  ero: number = 0,
  xdero: number = 0,
  iero: number = 1
): { Dt: number; At: number; ydero: number } {
  if (!ero || ero === 0) {
    const At = (Math.PI / 4) * Math.pow(Dt0, 2);
    return { Dt: Dt0, At, ydero: 0 };
  }

  // xdero representa la fracción de alma quemada x / eweb (0 a 1)
  const x = Math.min(1, Math.max(0, xdero));
  let ydero = x;

  switch (iero) {
    case 1: // lineal
      ydero = x;
      break;
    case 2: // Exponencial normalizada
      ydero = (Math.exp(x) - 1) / (Math.E - 1);
      break;
    case 3: // Cuadrática
      ydero = Math.pow(x, 2);
      break;
    case 4: // Raíz cuadrada
      ydero = Math.sqrt(x);
      break;
    case 5: // Parábola con máximo en x=1
      ydero = -Math.pow(x, 2) + 2 * x;
      break;
    case 6: // Senoidal
      ydero = Math.sin((Math.PI / 2) * x);
      break;
    default:
      ydero = x;
      break;
  }

  // Asegurar rango [0, 1]
  ydero = Math.min(1, Math.max(0, ydero));

  // Limitación física estricta: el diámetro de garganta nunca puede ser 0 o menor que 0
  // Establecemos un límite físico mínimo (al menos 0.5 mm o 5% de Dt0)
  const minPhysicalDt = Math.max(0.5, Dt0 * 0.05);
  const Dt = Math.max(minPhysicalDt, Dt0 + ero * ydero);
  const At = (Math.PI / 4) * Math.pow(Dt, 2);

  return { Dt, At, ydero };
}

export function runSimulation({ motor, grains, nozzle, customPropellants }: SimulationInputs): SimulationResults {
  const t: number[] = [];
  const P0_MPa: number[] = [];
  const P0_gage: number[] = [];
  const mgra_total: number[] = [];
  const F_N: number[] = [];
  const F_kg: number[] = [];
  const E_N: number[] = [];
  const E_kg: number[] = [];

  const Ntipos = grains.length;
  const Patm = motor.Pamb || 0.101325; // MPa (Presión ambiental de diseño)
  const Runiv = 8314; // J/(mol K) 
  
  if (Ntipos === 0) throw new Error("No grains defined");

  // Estructura de estado inicial para cada grano de propelente
  let state = grains.map(g => {
    let Vg = 0;
    let d0_mayor = g.shape === 2 ? g.d0mayor : 0;
    let tweb0 = 0;
    let Aduct = 0;
    let fmmModel: any = null;

    let pablo = 1;
    let miguel = 1;
    let alpha_deg = nozzle.alpha || 12;

    if (g.shape === 1) { // Geometría Cilíndrica
      Vg = (Math.PI / 4) * (Math.pow(g.D0, 2) - Math.pow(g.d0, 2)) * g.L0;
      tweb0 = (g.D0 - g.d0) / 2;
      Aduct = (Math.PI / 4) * Math.pow(motor.Dc, 2) - (Math.PI / 4) * (Math.pow(g.D0, 2) - Math.pow(g.d0, 2));
    } else if (g.shape === 2) { // Geometría en Estrella
      const Np = g.Np || 5;
      const Mx = g.d0mayor / 2;
      
      const term_pablo_atan = Math.atan( (Mx - (g.d0/2) * Math.cos(Math.PI / Np)) / ((g.d0/2) * Math.sin(Math.PI / Np)) );
      pablo = Math.cos(-Math.PI / Np + term_pablo_atan);
      
      const term_miguel_atan = Math.atan( ((g.d0/2) * Math.sin(Math.PI / Np)) / (Mx - (g.d0/2) * Math.cos(Math.PI / Np)) );
      miguel = Math.cos(Math.PI/2 - term_miguel_atan);

      const star_hole_area = Np * 0.5 * (g.d0mayor / 2 - g.d0 / 2 * Math.cos(Math.PI / Np)) * g.d0 * Math.sin(Math.PI / Np) + 
                            Np * 0.5 * Math.pow(g.d0 / 2, 2) * Math.sin(2 * Math.PI / Np);
      
      Vg = ( (Math.PI / 4) * Math.pow(g.D0, 2) - star_hole_area ) * g.L0;
      tweb0 = (g.D0 - g.d0) / 2; 
      Aduct = (Math.PI/4) * Math.pow(motor.Dc, 2) - ( (Math.PI/4)*Math.pow(g.D0, 2) - star_hole_area );
    } else if (g.shape === 4) { // Geometría Finocyl (Fast Marching Method - OpenMotor)
      const numFins = g.numFins !== undefined ? g.numFins : (g.Np > 0 ? g.Np : 4);
      const finLength = g.finLength !== undefined ? g.finLength : (g.d0mayor > 0 ? g.d0mayor : 15);
      const finWidth = g.finWidth !== undefined ? g.finWidth : 10;
      const invertedFins = !!g.invertedFins;

      fmmModel = buildFinocylGrain({
        Dg: g.D0,
        L: g.L0,
        Dc: g.d0,
        Nf: numFins,
        w: finWidth,
        l: finLength,
        invertedFins,
        mapDim: g.mapDim || 251,
        ei: g.ei,
        osi: g.osi,
        ci: g.ci,
      });

      Vg = fmmModel.Aface_0 * g.L0;
      tweb0 = fmmModel.wmax;
      Aduct = Math.max(1e-6, (Math.PI / 4) * Math.pow(motor.Dc, 2) - fmmModel.Aface_0);
    } else { // Grano Macizo (Solid)
      Vg = (Math.PI / 4) * Math.pow(g.D0, 2) * g.L0;
      tweb0 = g.D0 / 2;
      Aduct = (Math.PI / 4) * Math.pow(motor.Dc, 2) - (Math.PI / 4) * Math.pow(g.D0, 2);
    }
    
    // Dimensionado de masa y longitudes para el bloque completo (N bloques)
    let Lg0 = g.L0 * g.N;
    let Vg0 = Vg * g.N;
    
    const prop = getPropellantData(g.propellantType, customPropellants);
    const rhoreal = prop.rho * g.rhorat; // g/cm3 
    const mg0 = rhoreal * Vg0 / 1e6; // kg
    
    return {
      ...g,
      tweb0,
      d: g.d0,
      D: g.D0,
      L: Lg0,
      tweb: tweb0,
      Vg: Vg0,
      mg: mg0,
      dmayor: d0_mayor,
      dmenor: g.d0,
      Abe: 0,
      Abc: 0,
      Abs: 0,
      Ab: 0,
      prop,
      rhoreal,
      Aduct,
      xincp: 0,
      x: 0,
      betha: g.shape === 2 ? 2 * Math.PI / g.Np : 0,
      pablo,
      miguel,
      alpha_deg,
      fmmModel,
      At: (Math.PI / 4) * Math.pow(nozzle.Dt0, 2),
    };
  });

  // Cálculo preciso de áreas iniciales t=0 para cada grano
  for (let s of state) {
    if (s.shape === 1) {
      s.Abe = s.ei * 2 * s.N * (Math.PI / 4) * (Math.pow(s.D0, 2) - Math.pow(s.d0, 2));
      s.Abc = s.ci * Math.PI * s.d0 * s.L;
      s.Abs = s.osi * Math.PI * s.D0 * s.L;
      s.Ab = Math.max(0, s.Abe + s.Abc + s.Abs);
    } else if (s.shape === 2) {
      const Np = s.Np || 5;
      const star_hole_area = Np * 0.5 * (s.d0mayor / 2 - s.d0 / 2 * Math.cos(Math.PI / Np)) * s.d0 * Math.sin(Math.PI / Np) + 
                            Np * 0.5 * Math.pow(s.d0 / 2, 2) * Math.sin(2 * Math.PI / Np);
      const arm_length = Math.sqrt(Math.pow(s.d0mayor / 2 - s.d0 / 2 * Math.cos(Math.PI / Np), 2) + Math.pow(s.d0 / 2 * Math.sin(Math.PI / Np), 2));
      s.Abe = s.ei * 2 * s.N * ((Math.PI / 4) * Math.pow(s.D0, 2) - star_hole_area);
      s.Abc = s.ci * 2 * Np * s.N * arm_length * s.L;
      s.Abs = s.osi * Math.PI * s.D0 * s.L;
      s.Ab = Math.max(0, s.Abe + s.Abc + s.Abs);
    } else if (s.shape === 4 && s.fmmModel) {
      s.Abe = s.ei * 2 * s.N * s.fmmModel.Aface_0;
      s.Abc = s.ci * s.fmmModel.P_0 * s.L;
      s.Abs = s.osi * Math.PI * s.D0 * s.L;
      s.Ab = Math.max(0, s.Abe + s.Abc + s.Abs);
    } else {
      s.Abe = s.ei * 2 * s.N * (Math.PI / 4) * Math.pow(s.D0, 2);
      s.Abc = 0;
      s.Abs = s.osi * Math.PI * s.D0 * s.L;
      s.Ab = Math.max(0, s.Abe + s.Abc + s.Abs);
    }
  }

  const At0 = (Math.PI / 4) * Math.pow(nozzle.Dt0, 2); // mm2
  const Ae = (Math.PI / 4) * Math.pow(nozzle.Ds, 2); // mm2
  const exprat2 = Ae / At0;

  let current_t = 0;
  let mgra_total_val = state.reduce((sum, s) => sum + s.mg, 0);
  const initialMassTotal = mgra_total_val;
  let P0 = Patm; // Presión inicial en MPa (Absoluta)

  const Vc_m3 = (Math.PI / 4) * Math.pow(motor.Dc, 2) * motor.Lc / 1e9; 
  let msto_total_acc = 0;
  let P0_prod_Pa = 0; // Presión manométrica de gases de combustión
  let Vfree_total = Vc_m3;
  let R_total = state[0] ? 8314 / state[0].prop.M : 287; 
  let T0real_total = state[0] ? state[0].prop.T0 * motor.etac : 1710 * motor.etac;
  let k_total = state[0]?.prop.k || 1.13;

  let step = 0;
  const hist: any[] = [];
  let k_sum_steps = 0;
  let k_active_count = 0;
  
  const initial_total_Ab = state.reduce((sum, s) => sum + s.Ab, 0);
  const { a: a0, n: n0 } = getBurnRate(Patm, state[0]?.propellantType || 1, customPropellants);
  const initial_r = a0 * Math.pow(Patm, n0);

  // Guardar estado inicial en t=0
  hist.push({
    t: 0,
    P0_MPa: Patm,
    P0_gage: 0,
    mgra_total: mgra_total_val,
    T0real_total: (state[0]?.prop.T0 || 1710) * motor.etac,
    R_total: R_total,
    k_total: state[0]?.prop.k || 1.13,
    At_total_val: At0,
    mgen_kgs: 0,
    mnoz_kgs: 0,
    r_burn: initial_r,
    Kn: At0 > 0 ? initial_total_Ab / At0 : 0,
    Ab_total: initial_total_Ab,
    grains_x: state.map(s => 0),
    grains_Abc: state.map(s => s.Abc || 0),
    grains_Abe: state.map(s => s.Abe || 0),
    grains_Abs: state.map(s => s.Abs || 0),
    grains_Ab: state.map(s => s.Ab || 0)
  });
  while (mgra_total_val >= 0.00001 && step < 10000) {
    step++;
    const dt = motor.paso_de_tiempo;
    current_t += dt;

    let sum_mg = 0;
    let sum_k_moles = 0;
    let sum_M_moles = 0;
    let sum_T0_moles = 0;
    let total_mgen = 0;
    let total_molesb = 0;
    let min_Aduct = Infinity;

    for (let s of state) {
      if (s.D === 0 && s.L === 0) continue;

      const { a, n } = getBurnRate(P0, s.propellantType, customPropellants);
      const Aduct_At = Math.max(0, s.Aduct / At0);
      let Gg = Math.max(0, motor.Gstar - Aduct_At);
      
      const r = (1 + motor.kv * Gg) * a * Math.pow(P0, n);
      const dx = r * dt;
      s.xincp = dx;
      s.x += dx;

      let prev_mg = s.mg;

      // GEOMETRÍA Y QUEMADO DE GRANOS
      if (s.shape === 1) { // Grano Cilíndrico
        s.d = s.d0 + s.ci * 2 * s.x;
        s.D = s.D0 - s.osi * 2 * s.x;
        s.L = s.L0 * s.N - s.ei * 2 * s.N * s.x;
        
        s.tweb = (s.D - s.d) / 2;

        if (s.d >= s.D || s.L <= 0) { 
          s.D = 0; s.d = 0; s.L = 0; s.tweb = 0; 
          s.Vg = 0; s.Abe = 0; s.Abc = 0; s.Abs = 0; s.Ab = 1e-4;
          s.Aduct = (Math.PI / 4) * Math.pow(motor.Dc, 2);
          const { At } = calculateThroatErosion(nozzle.Dt0, nozzle.e, 1, nozzle.ero_model || 1);
          s.At = At;
        } else {
          s.Aduct = (Math.PI / 4) * Math.pow(motor.Dc, 2) - (Math.PI / 4) * (Math.pow(s.D, 2) - Math.pow(s.d, 2));
          s.Abe = s.ei * 2 * s.N * (Math.PI / 4) * (Math.pow(s.D, 2) - Math.pow(s.d, 2));
          s.Abc = s.ci * Math.PI * s.d * s.L;
          s.Abs = s.osi * Math.PI * s.D * s.L;
          s.Ab = Math.max(0, s.Abe + s.Abc + s.Abs);
          s.Vg = (Math.PI / 4) * (Math.pow(s.D, 2) - Math.pow(s.d, 2)) * s.L;
          const xdero = s.tweb0 > 0 ? (s.tweb0 - s.tweb) / s.tweb0 : 0;
          const { At } = calculateThroatErosion(nozzle.Dt0, nozzle.e, xdero, nozzle.ero_model || 1);
          s.At = At;
        }
      } else if (s.shape === 3) { // Grano Macizo (Solid)
        s.D = s.D0 - s.osi * 2 * s.x;
        s.L = s.L0 * s.N - s.ei * 2 * s.N * s.x;
        
        s.tweb = s.D / 2;

        if (s.D <= 0 || s.L <= 0) {
          s.D = 0; s.L = 0; s.tweb = 0;
          s.Vg = 0; s.Abe = 0; s.Abc = 0; s.Abs = 0; s.Ab = 1e-4;
          s.Aduct = (Math.PI / 4) * Math.pow(motor.Dc, 2);
          const { At } = calculateThroatErosion(nozzle.Dt0, nozzle.e, 1, nozzle.ero_model || 1);
          s.At = At;
        } else {
          s.Aduct = (Math.PI / 4) * Math.pow(motor.Dc, 2) - (Math.PI / 4) * Math.pow(s.D, 2);
          s.Abe = s.ei * 2 * s.N * (Math.PI / 4) * Math.pow(s.D, 2);
          s.Abs = s.osi * Math.PI * s.D * s.L;
          s.Abc = 0;
          s.Ab = Math.max(0, s.Abe + s.Abs);
          s.Vg = (Math.PI / 4) * Math.pow(s.D, 2) * s.L;
          const xdero = s.tweb0 > 0 ? (s.tweb0 - s.tweb) / s.tweb0 : 0;
          const { At } = calculateThroatErosion(nozzle.Dt0, nozzle.e, xdero, nozzle.ero_model || 1);
          s.At = At;
        }
      } else if (s.shape === 4 && s.fmmModel) { // Grano Finocyl (Fast Marching Method)
        const current_x = s.x;
        s.L = s.L0 * s.N - s.ei * 2 * s.N * current_x;
        s.D = s.D0 - s.osi * 2 * current_x;
        s.tweb = Math.max(0, s.fmmModel.wmax - current_x);

        if (current_x >= s.fmmModel.wmax || s.L <= 0 || s.D <= 0) {
          s.D = 0; s.d = 0; s.L = 0; s.tweb = 0;
          s.Vg = 0; s.Abe = 0; s.Abc = 0; s.Abs = 0; s.Ab = 1e-4;
          s.Aduct = (Math.PI / 4) * Math.pow(motor.Dc, 2);
          const { At } = calculateThroatErosion(nozzle.Dt0, nozzle.e, 1, nozzle.ero_model || 1);
          s.At = At;
        } else {
          const Aface = s.fmmModel.getAface(current_x);
          const P = s.fmmModel.getP(current_x);
          s.Aduct = Math.max(1e-6, (Math.PI / 4) * Math.pow(motor.Dc, 2) - Aface);
          s.Abe = s.ei * 2 * s.N * Aface;
          s.Abc = s.ci * P * s.L;
          s.Abs = s.osi * Math.PI * s.D * s.L;
          s.Ab = Math.max(0, s.Abe + s.Abc + s.Abs);
          s.Vg = Aface * s.L;
          const xdero = s.tweb0 > 0 ? (s.tweb0 - s.tweb) / s.tweb0 : 0;
          const { At } = calculateThroatErosion(nozzle.Dt0, nozzle.e, xdero, nozzle.ero_model || 1);
          s.At = At;
        }
      } else { // Grano en Estrella (2)
        const Np = s.Np || 5;
        s.D = s.D0 - s.osi * 2 * s.x;
        s.L = s.L0 * s.N - s.ei * 2 * s.N * s.x;
        
        s.dmenor = s.d0 + s.ci * (2 * s.x / s.pablo);
        s.dmayor = s.d0mayor + s.ci * (2 * s.x / s.miguel);
        s.d = s.dmenor; 

        let stopFlag = false;
        if (s.D <= 0 || s.L <= 0 || s.dmenor >= s.D) stopFlag = true;

        if (stopFlag) {
          s.dmenor = 0; s.dmayor = 0; s.D = 0; s.L = 0; s.tweb = 0;
          s.Vg = 0; s.Abe = 0; s.Abc = 0; s.Abs = 0; s.Ab = 1e-4;
          s.Aduct = (Math.PI / 4) * Math.pow(motor.Dc, 2);
          const { At } = calculateThroatErosion(nozzle.Dt0, nozzle.e, 1, nozzle.ero_model || 1);
          s.At = At;
        } else if (s.dmayor < s.D) {
          // Fase 1: Ambas puntas están dentro del límite exterior D
          s.tweb = (s.D - s.dmenor) / 2;
          const xdero = s.tweb0 > 0 ? (s.tweb0 - s.tweb) / s.tweb0 : 0;
          const { At } = calculateThroatErosion(nozzle.Dt0, nozzle.e, xdero, nozzle.ero_model || 1);
          s.At = At;
          
          const area_hole = Np * 0.5 * (s.dmayor/2 - s.dmenor/2 * Math.cos(Math.PI/Np)) * s.dmenor * Math.sin(Math.PI/Np) + 
                            Np * 0.5 * Math.pow(s.dmenor/2, 2) * Math.sin(2 * Math.PI/Np);
          const arm_length = Math.sqrt(Math.pow(s.dmayor/2 - s.dmenor/2 * Math.cos(Math.PI/Np), 2) + Math.pow(s.dmenor/2 * Math.sin(Math.PI/Np), 2));
          
          s.Vg = ((Math.PI/4) * Math.pow(s.D, 2) - area_hole) * s.L;
          s.Abe = s.ei * 2 * s.N * ((Math.PI/4) * Math.pow(s.D, 2) - area_hole);
          s.Abc = s.ci * 2 * Np * s.N * arm_length * s.L;
          s.Abs = s.osi * Math.PI * s.D * s.L;
          s.Ab = Math.max(0, s.Abe + s.Abc + s.Abs);
          if (s.Ab <= 0) s.Ab = 1e-4;
          
          s.Aduct = Math.max(1e-6, (Math.PI / 4) * Math.pow(motor.Dc, 2) - ((Math.PI/4)*Math.pow(s.D,2) - area_hole));
        } else {
          // Fase 2: Las puntas de la estrella alcanzan el límite D, pero dmenor sigue quemando por dentro
          s.tweb = (s.D - s.dmenor) / 2;
          const xdero = s.tweb0 > 0 ? (s.tweb0 - s.tweb) / s.tweb0 : 0;
          const { At } = calculateThroatErosion(nozzle.Dt0, nozzle.e, xdero, nozzle.ero_model || 1);
          s.At = At;
          
          const alpha_rad = s.alpha_deg * Math.PI / 180;
          const target_fun = (beta: number) => {
            return (s.D - s.dmenor)/2 - (s.D/2)*(1 - Math.cos(beta/2)) - (s.D/4)*Math.sqrt(Math.max(1e-12, 2*(1 - Math.cos(beta)))) / Math.tan(alpha_rad/2);
          };
          
          let betha = s.betha || (2 * Math.PI / Np);
          try {
            betha = fzeroSearch(target_fun, [1e-6, 2 * Math.PI / Np], 50);
            if (isNaN(betha) || betha <= 0) betha = s.betha || (2 * Math.PI / Np);
          } catch (err) {
            betha = s.betha || (2 * Math.PI / Np);
          }
          s.betha = betha;
          
          const clip_dmayor = s.D;
          const ae_val = (s.D / 2) * Math.sin(betha / 2) / Math.tan(alpha_rad / 2);
          const c_val = 2 * (clip_dmayor / 2) * Math.sin(betha / 2);
          const lado_val = ae_val / Math.cos(alpha_rad / 2);
          
          const term_segment = (s.D*s.D/8) * (betha - Math.sin(betha)) + (c_val * ae_val / 2);
          s.Vg = Np * term_segment * s.L;
          
          s.Abe = s.N * 2 * s.ei * Np * term_segment;
          s.Abc = s.N * s.ci * Np * 2 * lado_val * s.L;
          s.Abs = s.N * s.osi * Np * betha * (s.D / 2) * s.L;
          s.Ab = Math.max(0, s.Abe + s.Abc + s.Abs);
          if (s.Ab <= 0) s.Ab = 1e-4;
          
          s.Aduct = Math.max(1e-6, (Math.PI / 4) * Math.pow(motor.Dc, 2) - (Np * term_segment));
        }
      }

      s.mg = s.rhoreal * s.Vg / 1e6; // kg
      let mgen = (prev_mg - s.mg) / dt; // kg/s
      if (mgen < 0) mgen = 0;

      let molesb_s = s.prop.M > 0 ? (mgen * 1000) / s.prop.M : 0; 
      total_mgen += mgen;
      total_molesb += molesb_s;
      
      sum_mg += s.mg;
      sum_k_moles += molesb_s * s.prop.k;
      sum_M_moles += molesb_s * s.prop.M;
      sum_T0_moles += molesb_s * s.prop.T0;
      if (s.Aduct < min_Aduct) min_Aduct = s.Aduct;
    }

    mgra_total_val = sum_mg;

    // Propiedades medias ponderadas de los gases generados
    let M_total = total_molesb > 0 ? sum_M_moles / total_molesb : state[0].prop.M;
    k_total = total_molesb > 0 ? sum_k_moles / total_molesb : state[0].prop.k;
    let T0_total = total_molesb > 0 ? sum_T0_moles / total_molesb : state[0].prop.T0;

    R_total = M_total > 0 ? 8314 / M_total : 8314 / state[0].prop.M;
    T0real_total = T0_total * motor.etac;

    if (total_molesb > 0) {
      k_sum_steps += k_total;
      k_active_count++;
    }

    // Área media de la garganta en el paso actual
    const At_total_val = state.reduce((sum, s) => sum + (s.At || At0), 0) / Ntipos;
    const current_exprat2 = Ae / At_total_val;

    // Gasto másico que escapa por la tobera (mnoz_total)
    const mnoz_total = P0_prod_Pa * (At_total_val / 1e6) * Math.sqrt(k_total / (R_total * T0real_total)) * Math.pow(2 / (k_total + 1), (k_total + 1) / (2 * (k_total - 1)));
    
    const msto_total = total_mgen - mnoz_total;
    msto_total_acc += msto_total * dt;

    const Vgra_total = state.reduce((a,b) => a + b.Vg, 0) / 1e9;
    Vfree_total = Math.max(1e-9, Vc_m3 - Vgra_total);
    const rhoprod = Math.max(0, msto_total_acc / Vfree_total);

    // CORRECCIÓN FÍSICA APLICADA: Sumar Patm de manera rigurosa para obtener la presión absoluta real
    P0_prod_Pa = rhoprod * R_total * T0real_total;
    P0 = P0_prod_Pa / 1e6 + Patm; 

    const step_total_Ab = state.reduce((sum, s) => sum + s.Ab, 0);
    const step_dominant_r = state.reduce((sum, s) => sum + (s.xincp / dt), 0) / Math.max(1, state.length);
    const step_Kn = At_total_val > 0 ? step_total_Ab / At_total_val : 0;

    hist.push({
      t: current_t,
      P0_MPa: P0,
      P0_gage: P0 - Patm,
      mgra_total: mgra_total_val,
      T0real_total: T0real_total,
      R_total: R_total,
      k_total: k_total,
      At_total_val: At_total_val,
      mgen_kgs: total_mgen,
      mnoz_kgs: mnoz_total,
      r_burn: step_dominant_r,
      Kn: step_Kn,
      Ab_total: step_total_Ab,
      grains_x: state.map(s => s.x),
      grains_Abc: state.map(s => s.Abc),
      grains_Abe: state.map(s => s.Abe),
      grains_Abs: state.map(s => s.Abs),
      grains_Ab: state.map(s => s.Ab)
    });
  }
  // Post combustión (Vaciado de cámara tras el quemado de los granos)
  let tbout = current_t;
  let pbout = P0;
  let gauge_bout = pbout - Patm;
  let k_enfriamiento = 0.02;
  
  let T02real_total = T0real_total; 
  let Cstar_total = Math.sqrt(R_total * T02real_total) / 1.1; 
  
  const final_At_total_val = state.reduce((sum, s) => sum + (s.At || At0), 0) / Ntipos;

  while ((P0 - Patm) > 0.01 && step < 12000) {
    step++;
    const dt = motor.paso_de_tiempo;
    current_t += dt;
    T02real_total = T02real_total * Math.exp(-k_enfriamiento * dt);
    
    let gauge_current = gauge_bout * Math.exp(- (R_total * T02real_total * (final_At_total_val / 1e6) * (current_t - tbout) / Vfree_total) / Cstar_total );
    P0 = gauge_current + Patm;
    
    const post_mnoz = Math.max(0, (P0 - Patm) * 1e6 * (final_At_total_val / 1e6) / Math.max(1, Cstar_total));

    hist.push({
      t: current_t,
      P0_MPa: P0,
      P0_gage: P0 - Patm,
      mgra_total: 0,
      T0real_total: T02real_total,
      R_total: R_total,
      k_total: k_total,
      At_total_val: final_At_total_val,
      mgen_kgs: 0,
      mnoz_kgs: post_mnoz,
      r_burn: 0,
      Kn: 0,
      Ab_total: 0,
      grains_x: hist[hist.length-1]?.grains_x || grains.map(() => 0),
      grains_Abc: hist[hist.length-1]?.grains_Abc || grains.map(() => 0),
      grains_Abe: hist[hist.length-1]?.grains_Abe || grains.map(() => 0),
      grains_Abs: hist[hist.length-1]?.grains_Abs || grains.map(() => 0),
      grains_Ab: hist[hist.length-1]?.grains_Ab || grains.map(() => 0)
    });
  }
 
  // ── Variables de seguimiento de performance ──────────────────────────────
  let Pmax_MPa = 0;
  let P_sum = 0;
  let Fmax_N = 0;
  let F_sum = 0;
  let It_total_N_s = 0;
  let active_burn_steps = 0;
  let t_quemado = 0;
  let t_fin = 0;
 
  let Kn_max = 0;
  let Kn_sum = 0;
  let Kn_final = 0;
  let r_max = 0;
  let r_sum = 0;
  let mdot_max = 0;
  let mdot_sum = 0;

  const Kn_arr: number[] = [];
  const At_mm2_arr: number[] = [];
  const r_burn_arr: number[] = [];
  const mdot_gen_arr: number[] = [];
  const mdot_noz_arr: number[] = [];
  const Ab_total_arr: number[] = [];

  const grains_x: number[][] = grains.map(() => []);
  const grains_Abc: number[][] = grains.map(() => []);
  const grains_Abe: number[][] = grains.map(() => []);
  const grains_Abs: number[][] = grains.map(() => []);
  const grains_Ab: number[][] = grains.map(() => []);
 
  // ── Bucle principal de cálculo de performance (TTI y Nakka) ───────────────
  for (let i = 0; i < hist.length; i++) {
    const step = hist[i];
 
    const P0        = step.P0_MPa;          // presión cámara [MPa] (Absoluta)
    const T0r       = step.T0real_total;    // temperatura real [K]
    const R_tot     = step.R_total;         // constante de gas [J/(kg·K)]
    const k         = step.k_total;         // gamma
    const At_val    = step.At_total_val;    // área de garganta [mm²]
    const exprat_i  = Ae / At_val;          // relación de expansión geométrica actual
 
    // CASO ESPECIAL: presión de cámara en niveles atmosféricos iniciales o de parada
    if (i === 0 || P0 <= Patm + 0.0001) {
      t.push(step.t);
      P0_MPa.push(step.P0_MPa);
      P0_gage.push(step.P0_gage);
      mgra_total.push(step.mgra_total);
      F_N.push(0);
      F_kg.push(0);
      E_N.push(0);
      E_kg.push(0);

      Kn_arr.push(step.Kn ?? 0);
      At_mm2_arr.push(step.At_total_val ?? At0);
      r_burn_arr.push(step.r_burn ?? 0);
      mdot_gen_arr.push(step.mgen_kgs ?? 0);
      mdot_noz_arr.push(step.mnoz_kgs ?? 0);
      Ab_total_arr.push(step.Ab_total ?? 0);

      for (let g = 0; g < grains.length; g++) {
        grains_x[g].push(step.grains_x?.[g] ?? 0);
        grains_Abc[g].push(step.grains_Abc?.[g] ?? 0);
        grains_Abe[g].push(step.grains_Abe?.[g] ?? 0);
        grains_Abs[g].push(step.grains_Abs?.[g] ?? 0);
        grains_Ab[g].push(step.grains_Ab?.[g] ?? 0);
      }
      continue;
    }
 
    // ══════════════════════════════════════════════════════════════════════
    //  CÁLCULO TTI  —  Teoría de Toberas Ideales
    // ══════════════════════════════════════════════════════════════════════
 
    // Relación de área a Mach isentrópico
    const funMs = (Ms: number): number =>
      (1 / Math.max(1e-9, Ms)) *
      Math.pow(
        (1 + (k - 1) / 2 * Ms * Ms) / ((k + 1) / 2),
        (k + 1) / (2 * (k - 1))
      ) - exprat_i;
 
    let Ms1_tti = fzeroSearch(funMs, [0.01, 1.0], 100);
    let Ms2_tti = fzeroSearch(funMs, [1.0, 20.0], 100);
    if (isNaN(Ms1_tti) || Ms1_tti <= 0) Ms1_tti = 0.3;
    if (isNaN(Ms2_tti) || Ms2_tti <= 1) Ms2_tti = 2.0;
 
    // Límites críticos de expansión de presión
    const pis1 = Math.pow(1 + (k - 1) / 2 * Ms1_tti * Ms1_tti, -k / (k - 1));
    const pis2 = Math.pow(1 + (k - 1) / 2 * Ms2_tti * Ms2_tti, -k / (k - 1));
    const pich = (2 * k * Ms2_tti * Ms2_tti - (k - 1)) / (k + 1);
    
    // Corrección física: Límite correcto de presión para choque en salida (pich_correct)
    const pich_correct = pis2 * pich;
 
    const Pp = Patm / P0; 
 
    // Flujo crítico bloqueado (Choked)
    const mDot_choked =
      P0 * 1e6 *
      (At_val / 1e6) *
      Math.sqrt(k / (R_tot * T0r)) *
      Math.pow(2 / (k + 1), (k + 1) / (2 * (k - 1)));
 
    let Ps_tti   = Patm;     
    let vs_tti   = 0;        
    let GastoOut = 0;        
    let MachFactor = 1.0;    
 
    if (Pp >= pis1) {
      // ── Régimen subsónico ─────────────────────────────────────────────
      Ps_tti   = Patm;
      GastoOut = 0;       
      vs_tti   = 0;
      MachFactor = 1.0;
 
    } else if (Pp < pis1 && Pp >= pich_correct) {
      // ── Onda de choque normal (OCN) dentro de la tobera ───────────────
      Ps_tti   = Patm;
      GastoOut = mDot_choked;
      const funOCN = (Ms: number): number =>
        exprat_i * Pp *
        Math.pow((k + 1) / 2, (k + 1) / (2 * (k - 1))) *
        Ms *
        Math.pow(1 + (k - 1) / 2 * Ms * Ms, 0.5) - 1;
      let ms_ocn = fzeroSearch(funOCN, [0.01, 1.0], 100);
      if (isNaN(ms_ocn) || ms_ocn <= 0) ms_ocn = 0.5;
      const Ts_ocn = T0r / (1 + (k - 1) / 2 * ms_ocn * ms_ocn);
      vs_tti = Math.sqrt(k * R_tot * Ts_ocn) * ms_ocn;
      MachFactor = 1.0;
 
    } else if (Pp < pich_correct && Pp > pis2) {
      // ── Onda de choque oblicua a la salida (OCO) ─────────────────────
      const Ps_isentropic = P0 / Math.pow(1 + (k - 1) / 2 * Ms2_tti * Ms2_tti, k / (k - 1));
      Ps_tti   = Ps_isentropic;   
      GastoOut = mDot_choked;
      const Ts_out = T0r * Math.pow(Ps_isentropic / P0, (k - 1) / k);
      vs_tti = Math.sqrt(k * R_tot * Ts_out) * Ms2_tti;
 
      const Mn_s2_val = (Patm / (P0 * pis2) * (k + 1) + (k - 1)) / (2 * k);
      const Mn_s2 = Math.sqrt(Math.max(0, Mn_s2_val));
      const BetaOut_deg = Math.asin(Math.min(1, Math.max(0, Mn_s2 / Ms2_tti))) * 180 / Math.PI;
      const extCore = ((k - 1) * Mn_s2 * Mn_s2 + 2) / Math.max(1e-9, 2 * k * Mn_s2 * Mn_s2 - (k - 1));
      const Mn_ext = Math.sqrt(Math.max(0, extCore));
      const Alfa_OCO_deg =
        BetaOut_deg -
        Math.atan(Mn_ext / Ms2_tti / Math.cos(BetaOut_deg * Math.PI / 180)) * 180 / Math.PI;
 
      MachFactor = Math.cos(Alfa_OCO_deg * Math.PI / 180);
 
    } else if (Pp === pis2) {
      // ── Tobera adaptada ───────────────────────────────────────────────
      Ps_tti   = Patm;
      GastoOut = mDot_choked;
      const Ts_out = T0r * Math.pow(Patm / P0, (k - 1) / k);
      vs_tti = Math.sqrt(k * R_tot * Ts_out) * Ms2_tti;
      MachFactor = 1.0;
 
    } else {
      // ── Sub-expansión: abanico de expansión de Prandtl-Meyer ──────────
      const Ps_isentropic = P0 / Math.pow(1 + (k - 1) / 2 * Ms2_tti * Ms2_tti, k / (k - 1));
      Ps_tti   = Ps_isentropic;   
      GastoOut = mDot_choked;
      const Ts_out = T0r * Math.pow(Ps_isentropic / P0, (k - 1) / k);
      vs_tti = Math.sqrt(k * R_tot * Ts_out) * Ms2_tti;
 
      const coreMext = Math.pow(Patm / P0, (1 - k) / k) - 1;
      const MextOut  = Math.sqrt(Math.max(0, coreMext * 2 / (k - 1)));
 
      const nuPM = (M: number): number => {
        const term = Math.sqrt(Math.max(0, M * M - 1));
        return (
          Math.sqrt((k + 1) / (k - 1)) *
          Math.atan(Math.sqrt((k - 1) / (k + 1)) * term) -
          Math.atan(term)
        );
      };
 
      const Nu_Mext = nuPM(MextOut);
      const Nu_Ms2  = nuPM(Ms2_tti);
 
      // Réplica exacta del límite de Prandtl-Meyer con mismatch de unidades de MATLAB
      const TetaOut_deg   = (Nu_Mext - Nu_Ms2) * 180 / Math.PI;
      const Nu_max        = (Math.PI / 2) * (Math.sqrt((k + 1) / (k - 1)) - 1);
      const Teta_max_rad  = Nu_max - Nu_Ms2;   
 
      const TetaLimited_deg = TetaOut_deg > Teta_max_rad ? Teta_max_rad : TetaOut_deg;
 
      MachFactor = Math.cos(TetaLimited_deg * Math.PI / 180);
    }
 
    if (isNaN(GastoOut) || GastoOut < 0) GastoOut = 0;
    if (isNaN(vs_tti)   || vs_tti < 0)   vs_tti   = 0;
    if (isNaN(MachFactor))                MachFactor = 1.0;
    MachFactor = Math.min(1.0, Math.max(0.0, MachFactor));
 
    // Empuje TTI parcial (Momento y Diferencia de Presiones)
    const momentumThrust_TTI = GastoOut * vs_tti;                                       
    const pressureThrust_TTI = (Ps_tti - Patm) * 1e6 * (Math.PI * Math.pow(nozzle.Ds / 2000, 2)); 
 
    // Aplicación del factor de corrección de flujo al empuje neto completo
    const TTI_Thrust_N = nozzle.etanoz * (momentumThrust_TTI + pressureThrust_TTI) * MachFactor;
 
    // ══════════════════════════════════════════════════════════════════════
    //  CÁLCULO RICHARD NAKKA
    // ══════════════════════════════════════════════════════════════════════
 
    let Pe_RN = P0 / Math.pow(1 + (k - 1) / 2 * Ms2_tti * Ms2_tti, k / (k - 1)); 
 
    // Evitar presiones negativas limitando Pe_RN a Patm
    if (Pe_RN < Patm) {
      Pe_RN = Patm;
    }
 
    const Pe_P0 = Math.max(0, Math.min(1, Pe_RN / P0));
    const momentum_CF_RN =
      Math.sqrt(
        (2 * k * k / (k - 1)) *
        Math.pow(2 / (k + 1), (k + 1) / (k - 1)) *
        (1 - Math.pow(Pe_P0, (k - 1) / k))
      );
 
    const pressure_CF_RN = ((Pe_RN - Patm) / P0) * exprat_i;
 
    // Nozzle efficiency aplicada únicamente al término de momento cinético (Nakka estándar)
    const CF_RN = nozzle.etanoz * momentum_CF_RN + pressure_CF_RN;
 
    // Conversión de fuerza a Newtons
    const F_RN_N = isNaN(CF_RN) ? 0 : Math.max(0, CF_RN * (At_val / 1e6) * (P0 * 1e6));
 
    // ── Almacenar vectores de la serie temporal ───────────────────────────
    t.push(step.t);
    P0_MPa.push(step.P0_MPa);
    P0_gage.push(step.P0_gage);
    mgra_total.push(step.mgra_total);
    F_N.push(F_RN_N);
    F_kg.push(F_RN_N / 9.81);
    E_N.push(TTI_Thrust_N);
    E_kg.push(TTI_Thrust_N / 9.81);

    Kn_arr.push(step.Kn ?? 0);
    At_mm2_arr.push(step.At_total_val ?? At0);
    r_burn_arr.push(step.r_burn ?? 0);
    mdot_gen_arr.push(step.mgen_kgs ?? 0);
    mdot_noz_arr.push(step.mnoz_kgs ?? 0);
    Ab_total_arr.push(step.Ab_total ?? 0);
 
    for (let g = 0; g < grains.length; g++) {
      grains_x[g].push(step.grains_x?.[g] ?? 0);
      grains_Abc[g].push(step.grains_Abc?.[g] ?? 0);
      grains_Abe[g].push(step.grains_Abe?.[g] ?? 0);
      grains_Abs[g].push(step.grains_Abs?.[g] ?? 0);
      grains_Ab[g].push(step.grains_Ab?.[g] ?? 0);
    }
 
    // ── Integraciones métricas ────────────────────────────────────────────
    if (step.P0_MPa > Pmax_MPa)    Pmax_MPa = step.P0_MPa;
    if (TTI_Thrust_N > Fmax_N)     Fmax_N   = TTI_Thrust_N;
 
    if (step.mgra_total > 0) {
      P_sum += step.P0_gage;
      active_burn_steps++;
      t_quemado = step.t;
      if (step.Kn > Kn_max) Kn_max = step.Kn;
      if (step.r_burn > r_max) r_max = step.r_burn;
      if (step.mgen_kgs > mdot_max) mdot_max = step.mgen_kgs;
      Kn_sum += step.Kn;
      r_sum += step.r_burn;
      mdot_sum += step.mgen_kgs;
      Kn_final = step.Kn;
    }
    if (TTI_Thrust_N > 1) t_fin = step.t;
 
    if (i > 0) {
      const dt_i = step.t - hist[i - 1].t;
      It_total_N_s += ((TTI_Thrust_N + E_N[i - 1]) / 2) * dt_i;
    }
  }
 
  // ── Métricas resumidas y clasificación del motor ─────────────────────────
  const Pmed_MPa = active_burn_steps > 0 ? P_sum / active_burn_steps : 0;
  const Fmed_N = active_burn_steps > 0 ? It_total_N_s / t_quemado : 0;
  
  const Kn_avg = active_burn_steps > 0 ? Kn_sum / active_burn_steps : (Kn_arr[0] || 0);
  const r_avg = active_burn_steps > 0 ? r_sum / active_burn_steps : (r_burn_arr[0] || 0);
  const mdot_avg = active_burn_steps > 0 ? mdot_sum / active_burn_steps : 0;

  const Isp_total_s = initialMassTotal > 0 ? It_total_N_s / (9.806 * initialMassTotal) : 0;
  const motorClass = classifyMotor(It_total_N_s);
  const k_avg = k_active_count > 0 ? k_sum_steps / k_active_count : (state[0]?.prop.k || 1.13);

  // Determinar propelente dominante para el resumen
  const propTypes = grains.map(g => g.propellantType);
  const dominantPropellantType = propTypes.sort((a,b) =>
      propTypes.filter(v => v===a).length - propTypes.filter(v => v===b).length
  ).pop() || 1;

  return {
    t, P0_MPa, P0_gage, mgra_total, F_N, F_kg, E_N, E_kg,
    grains, grains_x, 
    grains_Abc, grains_Abe, grains_Abs, grains_Ab,
    propellantType: dominantPropellantType,
    customPropellants,
    Kn: Kn_arr,
    At_mm2: At_mm2_arr,
    r_burn: r_burn_arr,
    mdot_gen: mdot_gen_arr,
    mdot_noz: mdot_noz_arr,
    Ab_total: Ab_total_arr,
    summary: { 
      Pmax_MPa, 
      Pmed_MPa, 
      t_quemado, 
      t_fin, 
      Fmax_N, 
      Fmed_N, 
      It_total_N_s, 
      Isp_total_s, 
      motorClass, 
      k_avg,
      Kn_max,
      Kn_avg,
      Kn_initial: Kn_arr[0] || 0,
      Kn_final,
      r_max,
      r_avg,
      r_initial: r_burn_arr[0] || 0,
      mdot_max,
      mdot_avg,
      initial_mass_g: initialMassTotal * 1000
    }
  };
}