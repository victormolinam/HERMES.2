export function fzero(
  fun: (x: number) => number,
  interval: [number, number],
  tol: number = 1e-7
): number {
  let [a, b] = interval;
  let fa = fun(a);
  let fb = fun(b);

  if (Math.sign(fa) === Math.sign(fb)) {
    // If no zero crossing, fallback or return nearest
    if (Math.abs(fa) < Math.abs(fb)) return a;
    return b;
  }

  let c = a;
  while ((b - a) / 2 > tol) {
    c = (a + b) / 2;
    const fc = fun(c);
    if (fc === 0) break;
    if (Math.sign(fc) === Math.sign(fa)) {
      a = c;
      fa = fc;
    } else {
      b = c;
      fb = fc;
    }
  }
  return c;
}

// Bisection method without requiring initial sign flip (simple search to find a region with sign flip)
export function fzeroSearch(
  fun: (x: number) => number,
  searchInterval: [number, number],
  steps: number = 100,
  tol: number = 1e-7
): number {
  const [min, max] = searchInterval;
  const step = (max - min) / steps;
  let prevX = min;
  let prevV = fun(min);

  for (let i = 1; i <= steps; i++) {
    const curX = min + i * step;
    const curV = fun(curX);
    if (Math.sign(curV) !== Math.sign(prevV)) {
      return fzero(fun, [prevX, curX], tol);
    }
    prevX = curX;
    prevV = curV;
  }
  // Fallback
  return fzero(fun, searchInterval, tol);
}
