export type Dimension = '1D' | '2D';

export type InitialDistType = 'uniform' | 'gaussian' | 'ring' | 'stripe' | 'grid' | 'origin' | 'centered' | 'bimodal' | 'asymmetric';

export interface PositionSamplerParams {
  canvasWidth: number;
  canvasHeight: number;
  dimension: Dimension;
  initialDistType: InitialDistType;
  distSigmaX: number;
  distSigmaY: number;
  distR0: number;
  distDR: number;
  distThickness: number;
  distNx: number;
  distNy: number;
  distJitter: number;
}

export function sampleCanvasPosition(
  i: number,
  params: PositionSamplerParams,
  random: () => number = Math.random
): { x: number; y: number } {
  const cx = params.canvasWidth / 2;
  const cy = params.canvasHeight / 2;

  if (params.dimension === '1D') {
    switch (params.initialDistType) {
      case 'origin': return { x: cx, y: cy };
      case 'centered': return { x: cx + sampleBump(random, 0, 0.7) * params.canvasWidth / 12, y: cy };
      case 'bimodal': return { x: cx + sampleBump(random, random() < 0.5 ? -0.65 : 0.65, 0.35) * params.canvasWidth / 12, y: cy };
      case 'asymmetric': return { x: cx + sampleBump(random, -0.2, 0.85) * params.canvasWidth / 12, y: cy };
      case 'gaussian': {
        const bm = () => boxMuller(random);
        const x = cx + bm() * params.distSigmaX;
        return { x: clamp(x, 0, params.canvasWidth), y: cy };
      }
      case 'stripe': {
        const half = params.distThickness / 2;
        const x = cx + (random() * 2 - 1) * half;
        return { x: clamp(x, 0, params.canvasWidth), y: cy };
      }
      case 'grid': {
        const nx = Math.max(1, params.distNx);
        const gx = i % nx;
        const cellW = params.canvasWidth / nx;
        const jitterX = (random() * 2 - 1) * params.distJitter;
        const x = (gx + 0.5) * cellW + jitterX;
        return { x: clamp(x, 0, params.canvasWidth), y: cy };
      }
      case 'uniform':
      default:
        return { x: random() * params.canvasWidth, y: cy };
    }
  }

  switch (params.initialDistType) {
    case 'origin': return { x: cx, y: cy };
    case 'centered': return { x: cx, y: cy };
    case 'bimodal': return { x: cx, y: cy };
    case 'asymmetric': return { x: cx, y: cy };
    case 'gaussian': {
      const bm = () => boxMuller(random);
      const x = cx + bm() * params.distSigmaX;
      const y = cy + bm() * params.distSigmaY;
      return { x: clamp(x, 0, params.canvasWidth), y: clamp(y, 0, params.canvasHeight) };
    }
    case 'ring': {
      const r0 = params.distR0;
      const dr = params.distDR;
      const r = r0 + (random() - 0.5) * 2 * dr;
      const theta = random() * 2 * Math.PI;
      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);
      return { x: clamp(x, 0, params.canvasWidth), y: clamp(y, 0, params.canvasHeight) };
    }
    case 'stripe': {
      const half = params.distThickness / 2;
      const x = cx + (random() * 2 - 1) * half;
      const y = random() * params.canvasHeight;
      return { x: clamp(x, 0, params.canvasWidth), y };
    }
    case 'grid': {
      const nx = Math.max(1, params.distNx);
      const ny = Math.max(1, params.distNy);
      const gx = i % nx;
      const gy = Math.floor(i / nx) % ny;
      const cellW = params.canvasWidth / nx;
      const cellH = params.canvasHeight / ny;
      const jitterX = (random() * 2 - 1) * params.distJitter;
      const jitterY = (random() * 2 - 1) * params.distJitter;
      const x = (gx + 0.5) * cellW + jitterX;
      const y = (gy + 0.5) * cellH + jitterY;
      return { x: clamp(x, 0, params.canvasWidth), y: clamp(y, 0, params.canvasHeight) };
    }
    case 'uniform':
    default:
      return { x: random() * params.canvasWidth, y: random() * params.canvasHeight };
  }
}

function sampleBump(random: () => number, center: number, width: number): number {
  while (true) {
    const z = random() * 2 - 1;
    if (random() <= Math.exp(1 - 1 / (1 - z * z))) return center + width * z;
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function boxMuller(random: () => number): number {
  let u = 0, v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
