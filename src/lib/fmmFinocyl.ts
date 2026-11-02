/**
 * Fast Marching Method (FMM) Finocyl Grain Engine for HERMES Rocket Simulator
 * Replicates OpenMotor ballistic modeling with exact Eikonal equation solver,
 * Savitzky-Golay filter, and Marching Squares perimeter calculation.
 * 
 * Based on technical documentation by:
 * Departamento de Propulsión, Asociación de Cohetería Experimental de la Universidad de Sevilla (Coheteros)
 * and OpenMotor (github.com/reilleya/openMotor)
 */

export interface FinocylParams {
  Dg: number; // Grain outer diameter [mm]
  L: number;  // Grain length [mm]
  Dc: number; // Core diameter [mm]
  Nf: number; // Number of fins (0..64)
  w: number;  // Fin width [mm]
  l: number;  // Fin length from core wall [mm]
  invertedFins: boolean;
  mapDim?: number; // Grid resolution (default 251, range 101..1001)
  
  // Burn inhibition flags
  ei?: number; // Ends: 1 = burn (both), 0 = inhibited
  osi?: number; // Outer surface: 1 = burn, 0 = inhibited (standard finocyl is 0)
  ci?: number;  // Core / fins: 1 = burn, 0 = inhibited (standard finocyl is 1)
}

export interface FinocylValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the finocyl geometry according to Table 4 of the specification.
 */
export function validateFinocylGeometry(p: FinocylParams): FinocylValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const Rc = p.Dc / 2;

  // 1. Dg = 0
  if (p.Dg <= 0) {
    errors.push('Grain diameter must not be 0');
  }
  // 2. L = 0
  if (p.L <= 0) {
    errors.push('Grain length must not be 0');
  }
  // 3. Dc = 0
  if (p.Dc <= 0) {
    errors.push('Core diameter must not be 0');
  }
  // 4. Dc >= Dg (OpenMotor rejects equality as noted in spec)
  if (p.Dc >= p.Dg) {
    errors.push('Core diameter must be less than grain diameter');
  }
  // 5. l = 0 (only if fins exist)
  if (p.Nf > 0 && p.l <= 0) {
    errors.push('Fin length must not be 0');
  }
  // 6. w = 0 (only if fins exist)
  if (p.Nf > 0 && p.w <= 0) {
    errors.push('Fin width must not be 0');
  }
  // 7. 2l > Dg warning
  if (p.Nf > 0 && 2 * p.l > p.Dg) {
    warnings.push('Fin length should be less than or equal to grain radius');
  }
  // 8. Normal fins and Dc + 2l > Dg warning
  if (!p.invertedFins && p.Nf > 0 && (p.Dc + 2 * p.l > p.Dg)) {
    warnings.push('Core radius plus fin length should be less than or equal to grain radius');
  }
  // 9. Inverted fins: check tips outside of core
  if (p.invertedFins && p.Nf > 0) {
    if (p.l > Rc) {
      const lengthPastCenter = p.l - Rc;
      const halfWidth = p.w / 2;
      const tipRadius = Math.sqrt(lengthPastCenter * lengthPastCenter + halfWidth * halfWidth);
      if (tipRadius > Rc) {
        errors.push('Fin tips outside of core');
      }
    }
  }
  // 10. Check if neighbouring fin tips touch/intersect
  if (p.Nf > 1) {
    if (p.Nf !== 2) { // For Nf = 2, tan(pi/2) is infinite
      const a = p.invertedFins ? (Rc - p.l) : (Rc + p.l);
      const sideLength = 2 * a * Math.tan(Math.PI / p.Nf);
      if (sideLength < p.w) {
        if (p.invertedFins) {
          errors.push('Fin tips intersect');
        } else {
          warnings.push('Fin tips intersect');
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Min-Heap for Fast Marching Method
 */
class MinHeap {
  private heap: { idx: number; dist: number }[] = [];

  get size(): number {
    return this.heap.length;
  }

  push(idx: number, dist: number): void {
    this.heap.push({ idx, dist });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): { idx: number; dist: number } | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }

  private bubbleUp(pos: number): void {
    const element = this.heap[pos];
    while (pos > 0) {
      const parentPos = (pos - 1) >> 1;
      const parent = this.heap[parentPos];
      if (element.dist >= parent.dist) break;
      this.heap[pos] = parent;
      pos = parentPos;
    }
    this.heap[pos] = element;
  }

  private bubbleDown(pos: number): void {
    const length = this.heap.length;
    const element = this.heap[pos];
    const halfLength = length >> 1;

    while (pos < halfLength) {
      let leftPos = (pos << 1) + 1;
      let rightPos = leftPos + 1;
      let bestPos = leftPos;

      if (rightPos < length && this.heap[rightPos].dist < this.heap[leftPos].dist) {
        bestPos = rightPos;
      }

      if (this.heap[bestPos].dist >= element.dist) break;

      this.heap[pos] = this.heap[bestPos];
      pos = bestPos;
    }
    this.heap[pos] = element;
  }
}

/**
 * Savitzky-Golay smoothing filter (order 5, window 31 or dynamically adjusted)
 */
export function savgolFilter(y: number[], windowSize: number = 31, polyOrder: number = 5): number[] {
  const n = y.length;
  if (n <= polyOrder) {
    return [...y];
  }

  let w = Math.min(windowSize, n);
  if (w % 2 === 0) w--;
  if (w <= polyOrder) {
    w = polyOrder + (polyOrder % 2 === 0 ? 1 : 2);
    if (w > n) {
      w = n % 2 === 1 ? n : n - 1;
    }
  }
  const order = Math.min(polyOrder, w - 1);
  const half = Math.floor(w / 2);

  const A: number[][] = [];
  for (let i = 0; i < w; i++) {
    const row: number[] = [];
    const t = i - half;
    let val = 1;
    for (let j = 0; j <= order; j++) {
      row.push(val);
      val *= t;
    }
    A.push(row);
  }

  const numCols = order + 1;
  const ATA: number[][] = Array.from({ length: numCols }, () => Array(numCols).fill(0));
  for (let r = 0; r < numCols; r++) {
    for (let c = 0; c < numCols; c++) {
      let sum = 0;
      for (let k = 0; k < w; k++) {
        sum += A[k][r] * A[k][c];
      }
      ATA[r][c] = sum;
    }
  }

  const invATA = invertMatrix(ATA);
  if (!invATA) {
    return [...y];
  }

  const centerWeights: number[] = [];
  for (let k = 0; k < w; k++) {
    let sum = 0;
    for (let c = 0; c < numCols; c++) {
      sum += invATA[0][c] * A[k][c];
    }
    centerWeights.push(sum);
  }

  const result = new Array(n);

  for (let i = 0; i < n; i++) {
    if (i >= half && i < n - half) {
      let sum = 0;
      for (let k = 0; k < w; k++) {
        sum += y[i - half + k] * centerWeights[k];
      }
      result[i] = sum;
    } else {
      const winStart = i < half ? 0 : n - w;
      const targetOffset = i < half ? i - half : (i - (n - half - 1)) + half;
      
      let sum = 0;
      for (let k = 0; k < w; k++) {
        let weight = 0;
        let tPower = 1;
        const t = targetOffset;
        for (let j = 0; j <= order; j++) {
          let cRowSum = 0;
          for (let m = 0; m <= order; m++) {
            cRowSum += invATA[j][m] * A[k][m];
          }
          weight += cRowSum * tPower;
          tPower *= t;
        }
        sum += y[winStart + k] * weight;
      }
      result[i] = sum;
    }
  }

  return result;
}

function invertMatrix(matrix: number[][]): number[][] | null {
  const n = matrix.length;
  const A = matrix.map(row => [...row]);
  const I: number[][] = Array.from({ length: n }, (_, r) => 
    Array.from({ length: n }, (_, c) => (r === c ? 1 : 0))
  );

  for (let i = 0; i < n; i++) {
    let pivot = A[i][i];
    let pivotRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(A[r][i]) > Math.abs(pivot)) {
        pivot = A[r][i];
        pivotRow = r;
      }
    }
    if (Math.abs(pivot) < 1e-12) return null;

    if (pivotRow !== i) {
      [A[i], A[pivotRow]] = [A[pivotRow], A[i]];
      [I[i], I[pivotRow]] = [I[pivotRow], I[i]];
    }

    const factor = A[i][i];
    for (let j = 0; j < n; j++) {
      A[i][j] /= factor;
      I[i][j] /= factor;
    }

    for (let r = 0; r < n; r++) {
      if (r !== i) {
        const f = A[r][i];
        for (let j = 0; j < n; j++) {
          A[r][j] -= f * A[i][j];
          I[r][j] -= f * I[i][j];
        }
      }
    }
  }

  return I;
}

/**
 * Marching Squares contour perimeter measurement (from OpenMotor / skimage)
 */
export function calculateMarchingSquaresPerimeter(
  Dt: Float64Array,
  M: number,
  level: number,
  Dg: number
): number {
  let perimeterPx = 0;
  const halfM = M / 2;
  const maxRadius = halfM - 3;

  for (let r0 = 3; r0 < M - 4; r0++) {
    const rowOffset0 = r0 * M;
    const rowOffset1 = (r0 + 1) * M;
    const dr = r0 + 0.5 - halfM;

    for (let c0 = 3; c0 < M - 4; c0++) {
      const dc = c0 + 0.5 - halfM;
      if (Math.hypot(dr, dc) > maxRadius) {
        continue;
      }

      const ul = Dt[rowOffset0 + c0];
      const ur = Dt[rowOffset0 + c0 + 1];
      const ll = Dt[rowOffset1 + c0];
      const lr = Dt[rowOffset1 + c0 + 1];

      const square_case = 
        (ul > level ? 1 : 0) + 
        (ur > level ? 2 : 0) + 
        (ll > level ? 4 : 0) + 
        (lr > level ? 8 : 0);

      if (square_case === 0 || square_case === 15) {
        continue;
      }

      const top = ur === ul ? 0 : (level - ul) / (ur - ul);
      const bottom = lr === ll ? 0 : (level - ll) / (lr - ll);
      const left = ul === ll ? 0 : (level - ll) / (ul - ll);
      const right = ur === lr ? 0 : (level - lr) / (ur - lr);

      let addVar = 0;

      switch (square_case) {
        case 1: // top to left
        case 14: // left to top
          addVar = Math.hypot(top, 1 - left);
          break;
        case 2: // right to top
        case 13: // top to right
          addVar = Math.hypot(1 - top, 1 - right);
          break;
        case 3: // right to left
        case 12: // left to right
          addVar = Math.hypot(right - left, 1);
          break;
        case 4: // left to bottom
        case 11: // bottom to left
          addVar = Math.hypot(left, bottom);
          break;
        case 5: // top to bottom
        case 10: // bottom to top
          addVar = Math.hypot(top - bottom, 1);
          break;
        case 6:
          addVar = Math.hypot(1 - top, 1 - right) + Math.hypot(left, bottom);
          break;
        case 7: // right to bottom
        case 8: // bottom to right
          addVar = Math.hypot(1 - bottom, right);
          break;
        case 9:
          addVar = Math.hypot(top, 1 - left) + Math.hypot(1 - bottom, right);
          break;
      }

      perimeterPx += addVar;
    }
  }

  return perimeterPx * (Dg / M);
}

export interface FinocylPrecomputedGrain {
  params: FinocylParams;
  M: number;
  wmax: number; // [mm]
  Aface_0: number; // [mm²]
  P_0: number; // [mm]
  V_0: number; // [mm³]
  
  // Regression tables
  d_table: number[];     // [mm]
  Aface_table: number[]; // [mm²]
  P_table: number[];     // [mm]
  
  // Normalized regression map for visual rendering
  DtMap: Float64Array;
  coreMap: Uint8Array;
  mask: Uint8Array;

  // Evaluation functions
  getAface: (d: number) => number;
  getP: (d: number) => number;
  getS: (d: number) => number;
  getV: (d: number) => number;
  getWebLeft: (d: number) => number;
  getPortArea: (d: number) => number;
  getRegressedLength: (d: number) => number;
}

// Global cache for precomputed finocyl grains to ensure instantaneous re-runs
const grainCache = new Map<string, FinocylPrecomputedGrain>();

function getParamsKey(p: FinocylParams): string {
  return `${p.Dg}_${p.L}_${p.Dc}_${p.Nf}_${p.w}_${p.l}_${p.invertedFins ? 1 : 0}_${p.mapDim || 251}_${p.ei ?? 1}_${p.osi ?? 0}_${p.ci ?? 1}`;
}

/**
 * Builds the complete FMM regression model for a Finocyl grain.
 */
export function buildFinocylGrain(params: FinocylParams): FinocylPrecomputedGrain {
  const key = getParamsKey(params);
  if (grainCache.has(key)) {
    return grainCache.get(key)!;
  }

  const M = params.mapDim || 251;
  const Dg = params.Dg;
  const L = params.L;
  const Dc = params.Dc;
  const Nf = params.Nf;
  const w = params.w;
  const l = params.l;
  const inverted = !!params.invertedFins;

  const Npx = M * M;
  const coreMap = new Uint8Array(Npx);
  const mask = new Uint8Array(Npx);

  const rc = Dc / Dg;
  const wn = (2 * w) / Dg;
  const ln = (2 * l) / Dg;

  const coords = new Float64Array(M);
  for (let i = 0; i < M; i++) {
    coords[i] = -1 + (2 * i) / (M - 1);
  }

  coreMap.fill(1);

  for (let r = 0; r < M; r++) {
    const y = coords[r];
    const rowOffset = r * M;
    for (let c = 0; c < M; c++) {
      const x = coords[c];
      const r2 = x * x + y * y;
      const idx = rowOffset + c;

      if (r2 > 1.0) {
        mask[idx] = 1;
      }

      if (r2 < rc * rc) {
        coreMap[idx] = 0;
      }
    }
  }

  if (Nf > 0 && w > 0 && l > 0) {
    const s0 = inverted ? rc - ln : 0;
    const s1 = inverted ? rc : rc + ln;
    const val = inverted ? 1 : 0;

    for (let i = 0; i < Nf; i++) {
      const th = (2 * Math.PI * i) / Nf;
      const cosTh = Math.cos(th);
      const sinTh = Math.sin(th);

      for (let r = 0; r < M; r++) {
        const y = coords[r];
        const rowOffset = r * M;
        for (let c = 0; c < M; c++) {
          const idx = rowOffset + c;
          if (mask[idx]) continue;

          const x = coords[c];
          const t = cosTh * x + sinTh * y;
          const s = sinTh * x - cosTh * y;

          if (Math.abs(t) < wn / 2 && s > s0 && s < s1) {
            coreMap[idx] = val;
          }
        }
      }
    }
  }

  const h = 2.0 / M;
  const Dt = new Float64Array(Npx);
  const state = new Uint8Array(Npx);

  Dt.fill(Infinity);
  const heap = new MinHeap();

  for (let i = 0; i < Npx; i++) {
    if (mask[i]) {
      state[i] = 3;
      Dt[i] = 0;
    } else if (coreMap[i] === 0) {
      state[i] = 2;
      Dt[i] = 0;
    }
  }

  const getD = (idx: number): number => {
    return state[idx] === 2 ? Dt[idx] : Infinity;
  };

  const solveEikonal = (r: number, c: number): number => {
    const leftD = c > 0 ? getD(r * M + (c - 1)) : Infinity;
    const rightD = c < M - 1 ? getD(r * M + (c + 1)) : Infinity;
    const upD = r > 0 ? getD((r - 1) * M + c) : Infinity;
    const downD = r < M - 1 ? getD((r + 1) * M + c) : Infinity;

    let a = Math.min(leftD, rightD);
    let b = Math.min(upD, downD);

    if (a > b) {
      const tmp = a;
      a = b;
      b = tmp;
    }

    if (a === Infinity) return Infinity;

    if (b === Infinity || Math.abs(a - b) >= h) {
      return a + h;
    }

    const diff = a - b;
    const discriminant = 2 * h * h - diff * diff;
    if (discriminant < 0) {
      return a + h;
    }
    return (a + b + Math.sqrt(discriminant)) / 2;
  };

  for (let r = 0; r < M; r++) {
    for (let c = 0; c < M; c++) {
      const idx = r * M + c;
      if (coreMap[idx] === 0 && !mask[idx]) {
        const neighbors = [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ];
        for (const [nr, nc] of neighbors) {
          if (nr >= 0 && nr < M && nc >= 0 && nc < M) {
            const nidx = nr * M + nc;
            if (state[nidx] === 0 && !mask[nidx] && coreMap[nidx] === 1) {
              const tentativeD = solveEikonal(nr, nc);
              Dt[nidx] = tentativeD;
              state[nidx] = 1;
              heap.push(nidx, tentativeD);
            }
          }
        }
      }
    }
  }

  while (heap.size > 0) {
    const item = heap.pop()!;
    const idx = item.idx;
    if (state[idx] === 2) continue;

    state[idx] = 2;
    Dt[idx] = item.dist;

    const r = Math.floor(idx / M);
    const c = idx % M;

    const neighbors = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];

    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < M && nc >= 0 && nc < M) {
        const nidx = nr * M + nc;
        if (state[nidx] !== 2 && state[nidx] !== 3) {
          const newD = solveEikonal(nr, nc);
          if (newD < Dt[nidx]) {
            Dt[nidx] = newD;
            state[nidx] = 1;
            heap.push(nidx, newD);
          }
        }
      }
    }
  }

  // Collect propellant distances
  const propellantDistances: number[] = [];
  let DtMax = 0;
  for (let i = 0; i < Npx; i++) {
    if (!mask[i] && coreMap[i] === 1 && Dt[i] !== Infinity) {
      const dist = Dt[i];
      propellantDistances.push(dist);
      if (dist > DtMax) DtMax = dist;
    }
  }

  // Sort propellant distances for O(log N) area lookups
  propellantDistances.sort((a, b) => a - b);
  const totalPropellantPixels = propellantDistances.length;

  const wmax = DtMax * (Dg / 2); // [mm]

  const K = Math.floor(DtMax * M) + 2;
  const d_table: number[] = [];
  const raw_Aface: number[] = [];
  const P_table: number[] = [];

  const pixelArea = Math.pow(Dg / M, 2);

  let propIdx = 0;
  for (let k = 0; k < K; k++) {
    const dn = k / M;
    const dPhys = dn * (Dg / 2);
    d_table.push(dPhys);

    // Using sorted array to find how many pixels are > dn
    while (propIdx < totalPropellantPixels && propellantDistances[propIdx] <= dn) {
      propIdx++;
    }
    const unburnedCount = totalPropellantPixels - propIdx;
    raw_Aface.push(unburnedCount * pixelArea);

    // Compute perimeter via marching squares
    const pVal = calculateMarchingSquaresPerimeter(Dt, M, dn, Dg);
    P_table.push(pVal);
  }

  const Aface_table = savgolFilter(raw_Aface, 31, 5);
  for (let k = 0; k < K; k++) {
    if (Aface_table[k] < 0) Aface_table[k] = 0;
  }

  const Aface_0 = Aface_table[0] || raw_Aface[0] || 0;
  const P_0 = P_table[0] || 0;
  const V_0 = Aface_0 * L;

  const getAface = (d: number): number => {
    if (d <= 0) return Aface_table[0];
    if (d >= wmax) return 0;
    const dn = (2 * d) / Dg;
    const k = dn * M;
    const idx = Math.floor(k);
    if (idx >= K - 1) return 0;
    const frac = k - idx;
    return Aface_table[idx] * (1 - frac) + Aface_table[idx + 1] * frac;
  };

  const getP = (d: number): number => {
    if (d <= 0) return P_table[0];
    if (d >= wmax) return 0;
    const dn = (2 * d) / Dg;
    const k = dn * M;
    const idx = Math.floor(k);
    if (idx >= K - 1) return 0;
    const frac = k - idx;
    return P_table[idx] * (1 - frac) + P_table[idx + 1] * frac;
  };

  const endsBurn = params.ei !== 0;
  const n_faces = endsBurn ? 2 : 0;

  const getRegressedLength = (d: number): number => {
    if (!endsBurn) return L;
    return Math.max(0, L - 2 * d);
  };

  const getS = (d: number): number => {
    const lReg = getRegressedLength(d);
    if (lReg <= 0) return 0;
    const p = getP(d);
    const af = getAface(d);
    return Math.max(0, p * lReg + n_faces * af);
  };

  const getV = (d: number): number => {
    const lReg = getRegressedLength(d);
    return Math.max(0, getAface(d) * lReg);
  };

  const getWebLeft = (d: number): number => {
    const radialWeb = Math.max(0, wmax - d);
    if (!endsBurn) return radialWeb;
    const axialWeb = Math.max(0, L - 2 * d);
    return Math.min(axialWeb, radialWeb);
  };

  const getPortArea = (d: number): number => {
    const casingArea = (Math.PI / 4) * Dg * Dg;
    return Math.max(0, casingArea - getAface(d));
  };

  const computed: FinocylPrecomputedGrain = {
    params,
    M,
    wmax,
    Aface_0,
    P_0,
    V_0,
    d_table,
    Aface_table,
    P_table,
    DtMap: Dt,
    coreMap,
    mask,
    getAface,
    getP,
    getS,
    getV,
    getWebLeft,
    getPortArea,
    getRegressedLength,
  };

  grainCache.set(key, computed);
  return computed;
}
