import type { Particle } from "../physics/types/Particle";
import type { InitialDistType } from "../physics/utils/InitDistributions";
import type { BoundaryType } from "../physics/types/BoundaryConfig";

export type PersistentWalkMode = "kac-goldstein" | "masoliver-lindenbergh";
export type PersistentWalkProfile = "centered" | "bimodal" | "asymmetric";
export type PersistentWalkOrdering = "reduced" | "derivative";

/** Values collected from the shared Random Walk controls for model diagnostics and export. */
export interface PersistentWalkRunConfig {
  walkers: number;
  seed: number;
  profile: PersistentWalkProfile;
  ordering: PersistentWalkOrdering;
  flipRate: number;
  speed: number;
  resetRate: number;
  boundaryCondition: BoundaryType;
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

export interface PersistentWalkDiagnostics {
  mode: PersistentWalkMode;
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

export function createPersistentWalkRunExport(
  mode: PersistentWalkMode,
  config: PersistentWalkRunConfig,
  diagnostics: PersistentWalkDiagnostics,
) {
  return {
    schemaVersion: 1,
    model: mode,
    config: { ...config, walkers: diagnostics.walkers },
    diagnostics,
    scientificNote: mode === "masoliver-lindenbergh"
      ? "The exact model is the position-heading reset process; telegraph behavior is only a long-scale approximation."
      : "The displayed beta interval is a viewport, not a physical boundary.",
  };
}

const KAC_GOLDSTEIN_DOMAIN: [number, number] = [-6, 6];
const HISTOGRAM_BINS = 120;

export function calculatePersistentWalkDiagnostics(
  mode: PersistentWalkMode,
  config: PersistentWalkRunConfig,
  time: number,
  particles: Particle[],
): PersistentWalkDiagnostics {
  const liveParticles = particles.filter((particle) => particle.isActive);
  const totalWalkers = Math.max(1, particles.length);
  if (mode === "kac-goldstein") {
    const density = new Float64Array(HISTOGRAM_BINS);
    const current = new Float64Array(HISTOGRAM_BINS);
    const dx = (KAC_GOLDSTEIN_DOMAIN[1] - KAC_GOLDSTEIN_DOMAIN[0]) / HISTOGRAM_BINS;
    let sum = 0;
    let sumSquares = 0;
    let meanAx = 0;
    let meanAz = 0;
    let inDomain = 0;
    for (const particle of liveParticles) {
      const beta = particle.position.x;
      sum += beta;
      sumSquares += beta * beta;
      meanAx += Math.exp(time + beta);
      meanAz += Math.exp(time - 2 * beta);
      const bin = Math.floor((beta - KAC_GOLDSTEIN_DOMAIN[0]) / dx);
      if (bin >= 0 && bin < HISTOGRAM_BINS) {
        inDomain += 1;
        density[bin] += 1 / (particles.length * dx);
        current[bin] += Math.sign(particle.velocity.vx) / (particles.length * dx);
      }
    }
    const count = Math.max(1, liveParticles.length);
    const mean = sum / count;
    return {
      mode,
      time,
      walkers: liveParticles.length,
      eventCount: particles.reduce((total, particle) => total + particle.collisionCount, 0),
      mass: inDomain / totalWalkers,
      mean,
      variance: Math.max(0, sumSquares / count - mean * mean),
      meanAx: meanAx / count,
      meanAz: meanAz / count,
      radii: Array.from({ length: HISTOGRAM_BINS }, (_, i) => KAC_GOLDSTEIN_DOMAIN[0] + (i + 0.5) * dx),
      density: Array.from(density),
      current: Array.from(current),
      domain: KAC_GOLDSTEIN_DOMAIN,
    };
  }

  const count = Math.max(1, liveParticles.length);
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
  for (const particle of liveParticles) {
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
    walkers: liveParticles.length,
    eventCount: particles.reduce((total, particle) => total + particle.collisionCount, 0),
    mass: liveParticles.length / totalWalkers,
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
