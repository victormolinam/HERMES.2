/**
 * Continuous Contour Generator for Finocyl Propellant Grains
 * Unifies circular core and rectangular fins into a single continuous boundary
 * for 2D SVG rendering and 3D Three.js extrusion.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface FinocylContourResult {
  pathD: string;
  points: Point2D[];
}

/**
 * Generates a single continuous closed contour for a Finocyl core (core + fins unified).
 * 
 * @param cx Center X
 * @param cy Center Y
 * @param rCore Radius of the circular core (Dc / 2)
 * @param numFins Number of fins Nf (0..64)
 * @param finWidth Width of each fin slot/rib w
 * @param finLength Radial length of each fin l (from core wall)
 * @param inverted Whether fins protrude into the core as ribs
 * @param yDownwards True for SVG (where Y is down), false for standard cartesian / Three.js
 */
export function getFinocylContinuousContour(
  cx: number,
  cy: number,
  rCore: number,
  numFins: number,
  finWidth: number,
  finLength: number,
  inverted: boolean = false,
  yDownwards: boolean = true
): FinocylContourResult {
  if (rCore <= 0) {
    return { pathD: '', points: [] };
  }

  // If no fins, return clean circle
  if (numFins <= 0 || finWidth <= 0 || finLength <= 0) {
    const pts: Point2D[] = [];
    const segments = 48;
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * 2 * Math.PI;
      pts.push({
        x: cx + rCore * Math.cos(a),
        y: cy + (yDownwards ? rCore * Math.sin(a) : -rCore * Math.sin(a)),
      });
    }
    const pathD = `M ${cx + rCore} ${cy} A ${rCore} ${rCore} 0 1 ${yDownwards ? 1 : 0} ${cx - rCore} ${cy} A ${rCore} ${rCore} 0 1 ${yDownwards ? 1 : 0} ${cx + rCore} ${cy} Z`;
    return { pathD, points: pts };
  }

  const w2 = Math.min(finWidth / 2, rCore * 0.99);
  const deltaTheta = Math.asin(w2 / rCore);
  const yCore = Math.sqrt(Math.max(0, rCore * rCore - w2 * w2));
  const rTip = inverted ? Math.max(1, rCore - finLength) : rCore + finLength;

  const points: Point2D[] = [];
  const arcSegments = Math.max(4, Math.floor(64 / numFins));

  for (let i = 0; i < numFins; i++) {
    // OpenMotor convention: fin 0 points along -y in physical coordinates
    // In SVG (yDownwards), angle offset = PI/2 (points downward)
    const th = (2 * Math.PI * i) / numFins + (yDownwards ? Math.PI / 2 : -Math.PI / 2);
    const cosTh = Math.cos(th);
    const sinTh = Math.sin(th);

    // Direction vector u and perpendicular vector v
    const ux = cosTh;
    const uy = sinTh;
    const vx = yDownwards ? -sinTh : sinTh;
    const vy = yDownwards ? cosTh : -cosTh;

    // 1. Left base on core circle
    const baseLx = cx + yCore * ux - w2 * vx;
    const baseLy = cy + yCore * uy - w2 * vy;

    // 2. Left tip corner
    const tipLx = cx + rTip * ux - w2 * vx;
    const tipLy = cy + rTip * uy - w2 * vy;

    // 3. Right tip corner
    const tipRx = cx + rTip * ux + w2 * vx;
    const tipRy = cy + rTip * uy + w2 * vy;

    // 4. Right base on core circle
    const baseRx = cx + yCore * ux + w2 * vx;
    const baseRy = cy + yCore * uy + w2 * vy;

    points.push({ x: baseLx, y: baseLy });
    points.push({ x: tipLx, y: tipLy });
    points.push({ x: tipRx, y: tipRy });
    points.push({ x: baseRx, y: baseRy });

    // 5. Arc from baseR to baseL of next fin
    const startAngle = th + (yDownwards ? deltaTheta : -deltaTheta);
    const nextTh = (2 * Math.PI * (i + 1)) / numFins + (yDownwards ? Math.PI / 2 : -Math.PI / 2);
    const endAngle = nextTh - (yDownwards ? deltaTheta : -deltaTheta);

    // Sample along the core circle between this fin and the next
    for (let step = 1; step < arcSegments; step++) {
      const frac = step / arcSegments;
      const angle = startAngle + frac * (endAngle - startAngle);
      points.push({
        x: cx + rCore * Math.cos(angle),
        y: cy + rCore * Math.sin(angle),
      });
    }
  }

  // Construct SVG Path string
  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} ` +
      points.slice(1).map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
      ' Z';
  }

  return { pathD, points };
}
