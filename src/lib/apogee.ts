export interface ApogeeResult {
   t: number[];
   h: number[];
   v: number[];
   a: number[];
   mach: number[];
   maxApogee: number;
   maxVelocity: number;
   maxAcceleration: number;
   apogeeTime: number;
}

// Minimal Mach-Cd reference data (If not provided by Excel, we use a basic curve)
const DEFAULT_MACH_REF = [0, 0.2, 0.4, 0.6, 0.8, 0.9, 1.0, 1.1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3.0, 3.5, 4.0];
const DEFAULT_CD_REF = [0.45, 0.45, 0.44, 0.44, 0.46, 0.52, 0.61, 0.65, 0.66, 0.61, 0.55, 0.51, 0.48, 0.42, 0.38, 0.35, 0.33]; // Sample empirical Cd curve for typical rockets

function interp1(x: number[], y: number[], xi: number): number {
    if (!x || x.length === 0 || !y || y.length === 0) return 0.45;
    if (x.length === 1) return y[0];
    if (xi <= x[0]) return y[0];
    if (xi >= x[x.length - 1]) return y[y.length - 1];
    
    for (let i = 0; i < x.length - 1; i++) {
        if (xi >= x[i] && xi <= x[i + 1]) {
            const dx = x[i + 1] - x[i];
            if (dx === 0) return y[i];
            const dy = y[i + 1] - y[i];
            return y[i] + dy * (xi - x[i]) / dx;
        }
    }
    return y[y.length - 1];
}

/**
 * Calculates the exact supersonic exit Mach number from area expansion ratio
 */
export function getExitMach(epsilon: number, k: number): number {
  if (epsilon <= 1) return 1.0;
  let low = 1.0;
  let high = 10.0;
  const f = (M: number) => {
    const term = (2 / (k + 1)) * (1 + ((k - 1) / 2) * M * M);
    return (1 / M) * Math.pow(term, (k + 1) / (2 * (k - 1)));
  };
  
  if (f(high) < epsilon) {
    high = 20.0; // expand search if needed
  }
  
  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    const val = f(mid);
    if (Math.abs(val - epsilon) < 1e-6) return mid;
    if (val > epsilon) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return (low + high) / 2;
}

/**
 * Calculates the exact TTI thrust coefficient CF
 */
export function getTTIThrustCoefficient(
  P_Pa: number,
  Pa_atm: number,
  k: number,
  epsilon: number,
  alpha_deg: number,
  etanoz: number
): number {
  if (P_Pa <= Pa_atm) return 0;
  
  const Me = getExitMach(epsilon, k);
  const Pe = P_Pa / Math.pow(1 + ((k - 1) / 2) * Me * Me, k / (k - 1));
  
  const alpha_rad = (alpha_deg * Math.PI) / 180;
  const lambda = (1 + Math.cos(alpha_rad)) / 2;
  
  const t1 = (2 * k * k) / (k - 1);
  const t2 = Math.pow(2 / (k + 1), (k + 1) / (k - 1));
  const t3 = 1 - Math.pow(Pe / P_Pa, (k - 1) / k);
  const momentum_CF = Math.sqrt(t1 * t2 * t3);
  
  const pressure_CF = ((Pe - Pa_atm) / P_Pa) * epsilon;
  
  // Divergence factor (lambda) only applies to the momentum component.
  // Nozzle efficiency (etanoz) is typically applied to the whole CF in Nakka/Ideal 1D analysis.
  let CF = etanoz * (lambda * momentum_CF + pressure_CF);
  
  return Math.max(0, CF);
}

export function calculateApogee(
   tt: number[],
   vec_thrust_N: number[],
   vec_mass: number[], // m_dry + mgra_total
   m_dry: number,
   d_rocket: number = 0.08,
   h_launch: number = 169,
   T_celcius: number = 28,
   mach_ref_raw: number[] = DEFAULT_MACH_REF,
   cd_ref_raw: number[] = DEFAULT_CD_REF
): ApogeeResult {
   // Sanitize and sort Mach-Cd pairs
   let mach_ref = DEFAULT_MACH_REF;
   let cd_ref = DEFAULT_CD_REF;
   if (mach_ref_raw && cd_ref_raw && mach_ref_raw.length > 0 && cd_ref_raw.length > 0) {
     const pairs: { m: number; cd: number }[] = [];
     const len = Math.min(mach_ref_raw.length, cd_ref_raw.length);
     for (let i = 0; i < len; i++) {
       if (!isNaN(mach_ref_raw[i]) && !isNaN(cd_ref_raw[i])) {
         pairs.push({ m: Math.max(0, mach_ref_raw[i]), cd: Math.max(0.01, cd_ref_raw[i]) });
       }
     }
     if (pairs.length > 0) {
       pairs.sort((a, b) => a.m - b.m);
       mach_ref = pairs.map(p => p.m);
       cd_ref = pairs.map(p => p.cd);
     }
   }

   const N = tt.length;
   const g0 = 9.80665;
   const R_earth = 6371000;
   const R_air = 287;
   const gamma = 1.4;
   
   const T_launch_K = 273.15 + T_celcius;
   const P_launch = 101325 * Math.pow(1 - 2.25577e-5 * h_launch, 5.25588);
   const rho_launch = P_launch / (R_air * T_launch_K);
   const area_ref = Math.PI * Math.pow(d_rocket, 2) / 4;

   let t = 0;
   let h = 0; // relative elevation above launch pad (m)
   let v = 0; // vertical velocity (m/s)
   const default_dt = (tt.length > 1) ? (tt[1] - tt[0]) : 0.001;
   
   const hist_t: number[] = [];
   const hist_h: number[] = [];
   const hist_v: number[] = [];
   const hist_a: number[] = [];
   const hist_mach: number[] = [];

   let idx = 0;
   let maxApogee = 0;
   let maxVelocity = 0;
   let maxAcceleration = 0;
   let apogeeTime = 0;

   while (true) {
       let thrust = 0;
       let mass = m_dry;
       let current_dt = default_dt;

       if (idx < N) {
           thrust = vec_thrust_N[idx];
           mass = vec_mass[idx];
           if (idx > 0) {
               current_dt = tt[idx] - tt[idx - 1];
               if (current_dt === 0) current_dt = 1e-6; // Prevent div zero or zero step
           }
       }

       const h_abs = h_launch + h;
       const g_local = g0 * Math.pow(R_earth / (R_earth + h_abs), 2);
       const T_local = T_launch_K - 0.0065 * h;
       
       // Calculate density dynamically relative to launch site conditions
       const rho = rho_launch * Math.pow(T_local / T_launch_K, (g0 / (0.0065 * R_air)) - 1);
       const v_sound = Math.sqrt(gamma * R_air * T_local);

       const mach = Math.abs(v) / v_sound;
       const current_cd = interp1(mach_ref, cd_ref, mach);

       const drag = 0.5 * Math.max(0, rho) * v * v * current_cd * area_ref; 
       const weight = mass * g_local;

       const F_net_real = thrust - weight - Math.sign(v) * drag;
       const acceleration_real = F_net_real / mass;

       let F_net = 0;
       let acceleration = 0;
       let dv = 0;
       let dx = 0;

       if (h <= 0 && acceleration_real <= 0) {
           F_net = 0;
           acceleration = 0;
           dv = 0;
       } else {
           F_net = F_net_real;
           acceleration = acceleration_real;
           dv = current_dt * acceleration;
       }

       v += dv;

       if (v <= 0 && h <= 0) {
           dx = 0;
       } else {
           dx = v * current_dt;
       }

       h += dx;
       if (h < 0 && Math.abs(h) < 1e-9) h = 0;

       t = (idx < N) ? tt[idx] : t + current_dt;

       hist_t.push(t);
       hist_h.push(h);
       hist_v.push(v);
       hist_a.push(acceleration);
       hist_mach.push(mach);

       if (h > maxApogee) {
           maxApogee = h;
           apogeeTime = t;
       }
       if (v > maxVelocity) maxVelocity = v;
       if (acceleration > maxAcceleration) maxAcceleration = acceleration;

       idx++;

       if (v <= 0 && idx > N) {
           break;
       }
       // Safeguard to prevent infinite loops
       if (idx > 1000000) break;
   }

   return { t: hist_t, h: hist_h, v: hist_v, a: hist_a, mach: hist_mach, maxApogee, maxVelocity, maxAcceleration, apogeeTime };
}
