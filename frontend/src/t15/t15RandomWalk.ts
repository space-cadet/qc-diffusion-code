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

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function exponentialSample(random: () => number, rate: number): number {
  if (rate <= 0) return Number.POSITIVE_INFINITY;
  return -Math.log(Math.max(1e-12, 1 - random())) / rate;
}

function sampleBump(random: () => number, center: number, width: number): number {
  while (true) {
    const z = random() * 2 - 1;
    if (random() <= Math.exp(1 - 1 / (1 - z * z))) return center + width * z;
  }
}

function sampleProfile(random: () => number, profile: T15Profile): number {
  if (profile === "bimodal") {
    return random() < 0.5
      ? sampleBump(random, -0.65, 0.35)
      : sampleBump(random, 0.65, 0.35);
  }
  if (profile === "asymmetric") return sampleBump(random, -0.2, 0.85);
  return sampleBump(random, 0, 0.7);
}

export class T15RandomWalkSimulation {
  readonly mode: T15Mode;
  readonly config: T15RunConfig;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly direction: Int8Array;
  readonly heading: Float64Array;

  private readonly nextEvent: Float64Array;
  private readonly eventCounts: Uint32Array;
  private readonly random: () => number;
  private timeValue = 0;
  private totalEvents = 0;
  private readonly flipRate: number;

  constructor(mode: T15Mode, config: T15RunConfig) {
    this.mode = mode;
    this.config = {
      ...config,
      walkers: Math.max(1, Math.min(50000, Math.floor(config.walkers) || 1)),
      seed: Math.floor(config.seed) >>> 0,
      speed: Math.max(0.01, config.speed),
      resetRate: Math.max(0, config.resetRate),
    };
    this.random = createRandom(this.config.seed);
    this.x = new Float64Array(this.config.walkers);
    this.y = new Float64Array(this.config.walkers);
    this.direction = new Int8Array(this.config.walkers);
    this.heading = new Float64Array(this.config.walkers);
    this.nextEvent = new Float64Array(this.config.walkers);
    this.eventCounts = new Uint32Array(this.config.walkers);
    this.flipRate = this.config.ordering === "derivative" ? 0.75 : 0;

    for (let i = 0; i < this.config.walkers; i += 1) {
      if (mode === "t15a") {
        this.x[i] = sampleProfile(this.random, this.config.profile);
        const plusProbability = this.config.profile === "asymmetric" ? 0.7 : 0.5;
        this.direction[i] = this.random() < plusProbability ? 1 : -1;
        this.nextEvent[i] = exponentialSample(this.random, this.flipRate);
      } else {
        this.heading[i] = this.random() * 2 * Math.PI;
        this.nextEvent[i] = exponentialSample(this.random, this.config.resetRate);
      }
    }
  }

  get time(): number {
    return this.timeValue;
  }

  get events(): number {
    return this.totalEvents;
  }

  advance(deltaTime: number): void {
    const dt = Math.max(0, deltaTime);
    if (dt === 0) return;
    const targetTime = this.timeValue + dt;

    if (this.mode === "t15a") {
      for (let i = 0; i < this.x.length; i += 1) {
        let walkerTime = this.timeValue;
        while (this.nextEvent[i] <= targetTime) {
          const eventTime = this.nextEvent[i];
          this.x[i] += this.direction[i] * (eventTime - walkerTime);
          this.direction[i] = -this.direction[i];
          this.eventCounts[i] += 1;
          this.totalEvents += 1;
          walkerTime = eventTime;
          this.nextEvent[i] += exponentialSample(this.random, this.flipRate);
        }
        this.x[i] += this.direction[i] * (targetTime - walkerTime);
      }
    } else {
      const speed = this.config.speed;
      for (let i = 0; i < this.x.length; i += 1) {
        let walkerTime = this.timeValue;
        while (this.nextEvent[i] <= targetTime) {
          const eventTime = this.nextEvent[i];
          const segment = eventTime - walkerTime;
          this.x[i] += speed * Math.cos(this.heading[i]) * segment;
          this.y[i] += speed * Math.sin(this.heading[i]) * segment;
          this.heading[i] = this.random() * 2 * Math.PI;
          this.eventCounts[i] += 1;
          this.totalEvents += 1;
          walkerTime = eventTime;
          this.nextEvent[i] += exponentialSample(this.random, this.config.resetRate);
        }
        const remainder = targetTime - walkerTime;
        this.x[i] += speed * Math.cos(this.heading[i]) * remainder;
        this.y[i] += speed * Math.sin(this.heading[i]) * remainder;
      }
    }

    this.timeValue = targetTime;
  }

  diagnostics(): T15Diagnostics {
    if (this.mode === "t15a") return this.t15aDiagnostics();
    return this.t15bDiagnostics();
  }

  private t15aDiagnostics(): T15Diagnostics {
    const density = new Float64Array(HISTOGRAM_BINS);
    const current = new Float64Array(HISTOGRAM_BINS);
    const dx = (T15A_DOMAIN[1] - T15A_DOMAIN[0]) / HISTOGRAM_BINS;
    const count = this.x.length;
    let sum = 0;
    let sumSquares = 0;
    let meanAx = 0;
    let meanAz = 0;

    for (let i = 0; i < count; i += 1) {
      const beta = this.x[i];
      sum += beta;
      sumSquares += beta * beta;
      meanAx += Math.exp(this.timeValue + beta);
      meanAz += Math.exp(this.timeValue - 2 * beta);
      const bin = Math.floor((beta - T15A_DOMAIN[0]) / dx);
      if (bin >= 0 && bin < HISTOGRAM_BINS) {
        density[bin] += 1 / (count * dx);
        current[bin] += this.direction[i] / (count * dx);
      }
    }
    const mean = sum / count;
    return {
      mode: this.mode,
      time: this.timeValue,
      walkers: count,
      eventCount: this.totalEvents,
      mass: 1,
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

  private t15bDiagnostics(): T15Diagnostics {
    const count = this.x.length;
    const speed = this.config.speed;
    const frontRadius = speed * this.timeValue;
    const maxRadius = Math.max(frontRadius, 0.1);
    const dr = maxRadius / HISTOGRAM_BINS;
    const radialCounts = new Float64Array(HISTOGRAM_BINS);
    let sumX = 0;
    let sumY = 0;
    let sumRadiusSquared = 0;
    let sumXX = 0;
    let sumYY = 0;
    let sumXY = 0;

    for (let i = 0; i < count; i += 1) {
      const x = this.x[i];
      const y = this.y[i];
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
      mode: this.mode,
      time: this.timeValue,
      walkers: count,
      eventCount: this.totalEvents,
      mass: 1,
      mean: Math.sqrt(meanX * meanX + meanY * meanY),
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
}
