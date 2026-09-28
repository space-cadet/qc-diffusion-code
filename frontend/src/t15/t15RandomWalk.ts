import { CircularBuffer } from "../physics/utils/CircularBuffer";
import type { Particle } from "../physics/types/Particle";

export type T15Mode = "t15a" | "t15b";
export type T15Profile = "centered" | "bimodal" | "asymmetric";
export type T15Ordering = "reduced" | "derivative";

export interface T15RunConfig {
  walkers: number;
  seed: number;
  profile: T15Profile;
  ordering: T15Ordering;
  speed: number;
  resetRate: number;
}

export interface T15Diagnostics {
  mode: T15Mode;
  time: number;
  walkers: number;
  eventCount: number;
  mass: number;
  mean: number;
  variance: number;
  meanAx?: number;
  meanAz?: number;
  meanSquareDisplacement?: number;
  covarianceXX?: number;
  covarianceYY?: number;
  covarianceXY?: number;
  frontRadius?: number;
  radii: number[];
  density: number[];
  current?: number[];
  domain: [number, number];
}

export function createT15RunExport(mode: T15Mode, config: T15RunConfig, diagnostics: T15Diagnostics) {
  return {
    schemaVersion: 1,
    model: mode,
    config: { ...config, walkers: diagnostics.walkers },
    diagnostics,
    scientificNote: mode === "t15b"
      ? "The exact model is the position-heading reset process; telegraph behavior is only a long-scale approximation."
      : "The displayed beta interval is a viewport, not a physical boundary.",
  };
}

export const DEFAULT_T15_RUN_CONFIG: T15RunConfig = {
  walkers: 10000,
  seed: 20260926,
  profile: "centered",
  ordering: "reduced",
  speed: 1,
  resetRate: 1,
};

export const T15_REFERENCE_SEEDS: Record<T15Mode, number> = {
  t15a: 20260926,
  t15b: 15026,
};

export function normalizeT15RunConfig(config: T15RunConfig): T15RunConfig {
  const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
  return {
    ...config,
    walkers: Math.min(50000, Math.max(500, Math.floor(finite(config.walkers, 10000)))),
    seed: Math.min(0xffffffff, Math.max(0, Math.floor(finite(config.seed, T15_REFERENCE_SEEDS.t15a)))),
    speed: Math.min(3, Math.max(0.1, finite(config.speed, 1))),
    resetRate: Math.min(5, Math.max(0, finite(config.resetRate, 1))),
  };
}

const T15A_DOMAIN: [number, number] = [-6, 6];
const HISTOGRAM_BINS = 120;

export function sampleT15Wait(random: () => number, rate: number): number {
  if (rate <= 0) return Number.POSITIVE_INFINITY;
  return -Math.log(Math.max(1 - random(), Number.EPSILON)) / rate;
}

function sampleBump(random: () => number, center: number, width: number): number {
  while (true) {
    const z = random() * 2 - 1;
    if (random() <= Math.exp(1 - 1 / (1 - z * z))) return center + width * z;
  }
}

export function sampleT15Profile(random: () => number, profile: T15Profile): number {
  if (profile === "bimodal") {
    return random() < 0.5
      ? sampleBump(random, -0.65, 0.35)
      : sampleBump(random, 0.65, 0.35);
  }
  if (profile === "asymmetric") return sampleBump(random, -0.2, 0.85);
  return sampleBump(random, 0, 0.7);
}

export function createT15Particles(
  mode: T15Mode,
  inputConfig: T15RunConfig,
  random: () => number,
): Particle[] {
  const config = normalizeT15RunConfig(inputConfig);
  const flipRate = config.ordering === "derivative" ? 0.75 : 0;
  return Array.from({ length: config.walkers }, (_, index) => {
    const x = mode === "t15a" ? sampleT15Profile(random, config.profile) : 0;
    const angle = mode === "t15b" ? random() * 2 * Math.PI : 0;
    const speed = mode === "t15a" ? 1 : config.speed;
    const direction = mode === "t15a"
      ? (random() < (config.profile === "asymmetric" ? 0.7 : 0.5) ? 1 : -1)
      : 1;
    const velocity = mode === "t15a"
      ? { vx: direction * speed, vy: 0 }
      : { vx: speed * Math.cos(angle), vy: speed * Math.sin(angle) };
    const position = { x, y: 0 };
    const eventRate = mode === "t15a" ? flipRate : config.resetRate;
    return {
      id: `t15-${index}`,
      position,
      velocity,
      radius: 3,
      lastCollisionTime: 0,
      lastEventTime: 0,
      nextCollisionTime: sampleT15Wait(random, eventRate),
      collisionCount: 0,
      waitingTime: 0,
      trajectory: new CircularBuffer(100),
      isActive: true,
      lastUpdate: 0,
      initial: { position: { ...position }, velocity: { ...velocity }, timestamp: 0 },
    };
  });
}

export function calculateT15Diagnostics(
  mode: T15Mode,
  config: T15RunConfig,
  time: number,
  particles: Particle[],
): T15Diagnostics {
  if (mode === "t15a") {
    const density = new Float64Array(HISTOGRAM_BINS);
    const current = new Float64Array(HISTOGRAM_BINS);
    const dx = (T15A_DOMAIN[1] - T15A_DOMAIN[0]) / HISTOGRAM_BINS;
    let sum = 0;
    let sumSquares = 0;
    let meanAx = 0;
    let meanAz = 0;
    let inDomain = 0;
    for (const particle of particles) {
      const beta = particle.position.x;
      sum += beta;
      sumSquares += beta * beta;
      meanAx += Math.exp(time + beta);
      meanAz += Math.exp(time - 2 * beta);
      const bin = Math.floor((beta - T15A_DOMAIN[0]) / dx);
      if (bin >= 0 && bin < HISTOGRAM_BINS) {
        inDomain += 1;
        density[bin] += 1 / (particles.length * dx);
        current[bin] += Math.sign(particle.velocity.vx) / (particles.length * dx);
      }
    }
    const count = Math.max(1, particles.length);
    const mean = sum / count;
    return {
      mode,
      time,
      walkers: particles.length,
      eventCount: particles.reduce((total, particle) => total + particle.collisionCount, 0),
      mass: inDomain / count,
      mean,
      variance: Math.max(0, sumSquares / count - mean * mean),
      meanAx: meanAx / count,
      meanAz: meanAz / count,
      radii: Array.from({ length: HISTOGRAM_BINS }, (_, i) => T15A_DOMAIN[0] + (i + 0.5) * dx),
      density: Array.from(density),
      current: Array.from(current),
      domain: T15A_DOMAIN,
    };
  }

  const count = Math.max(1, particles.length);
  const frontRadius = config.speed * time;
  const maxRadius = Math.max(frontRadius, 0.1);
  const dr = maxRadius / HISTOGRAM_BINS;
  const radialCounts = new Float64Array(HISTOGRAM_BINS);
  let sumX = 0;
  let sumY = 0;
  let sumRadiusSquared = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;
  for (const particle of particles) {
    const x = particle.position.x;
    const y = particle.position.y;
    const radiusSquared = x * x + y * y;
    sumX += x;
    sumY += y;
    sumRadiusSquared += radiusSquared;
    sumXX += x * x;
    sumYY += y * y;
    sumXY += x * y;
    const bin = Math.min(HISTOGRAM_BINS - 1, Math.floor(Math.sqrt(radiusSquared) / dr));
    radialCounts[bin] += 1;
  }
  const meanX = sumX / count;
  const meanY = sumY / count;
  return {
    mode,
    time,
    walkers: particles.length,
    eventCount: particles.reduce((total, particle) => total + particle.collisionCount, 0),
    mass: 1,
    mean: Math.hypot(meanX, meanY),
    variance: Math.max(0, sumRadiusSquared / count - meanX * meanX - meanY * meanY),
    meanSquareDisplacement: sumRadiusSquared / count,
    covarianceXX: sumXX / count - meanX * meanX,
    covarianceYY: sumYY / count - meanY * meanY,
    covarianceXY: sumXY / count - meanX * meanY,
    frontRadius,
    radii: Array.from({ length: HISTOGRAM_BINS }, (_, i) => (i + 0.5) * dr),
    density: Array.from(radialCounts, (n) => n / (count * dr)),
    domain: [0, maxRadius],
  };
}
