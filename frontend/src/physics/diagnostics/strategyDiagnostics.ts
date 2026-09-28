import type { Particle } from '../types/Particle';
import type { StrategyEvent } from '../types/PhysicsContext';

export interface DiagnosticsConfig {
  strategy: string;
  dimension: '1D' | '2D';
  boundary: string;
  seed: number;
  particleCount: number;
  initialDistribution: string;
  parameters: Record<string, number>;
}

export interface SpreadSample {
  time: number;
  msd: number;
  medianR2: number;
  p90Radius: number;
  velocityCorrelation: number | null;
  eventsPerParticle: number;
}

export interface RadialDensitySnapshot {
  time: number;
  radii: number[];
  density: number[];
}

export interface TrailPoint {
  x: number;
  y: number;
  event?: 'turn' | 'jump' | 'wait';
}

export interface StrategyDiagnosticsSnapshot {
  config: DiagnosticsConfig;
  time: number;
  totalEvents: number;
  activeParticles: number;
  spread: SpreadSample[];
  radialDensity: RadialDensitySnapshot[];
  waitSamples: number[];
  jumpSamples: number[];
  trails: Array<{ id: string; points: TrailPoint[] }>;
}

export function comparableSetups(a: StrategyDiagnosticsSnapshot, b: StrategyDiagnosticsSnapshot): boolean {
  const configA = a.config;
  const configB = b.config;
  const speedA = configA.parameters.velocity ?? configA.parameters.speed ?? 1;
  const speedB = configB.parameters.velocity ?? configB.parameters.speed ?? 1;
  const rateA = configA.parameters.collisionRate ?? configA.parameters.flipRate ?? configA.parameters.resetRate ?? 0;
  const rateB = configB.parameters.collisionRate ?? configB.parameters.flipRate ?? configB.parameters.resetRate ?? 0;
  const strategyParameters: Record<string, string[]> = {
    levy: ['levyAlpha', 'levyScale'],
    fractional: ['fractionalBeta', 'fractionalWaitingScale', 'fractionalJumpLength'],
    'kac-goldstein': ['kacGoldsteinOrdering'],
  };
  const sameStrategyParameters = configA.strategy !== configB.strategy
    || (strategyParameters[configA.strategy] ?? []).every((key) => {
      const valueA = configA.parameters[key];
      const valueB = configB.parameters[key];
      return valueA !== undefined && valueB !== undefined && Math.abs(valueA - valueB) < 1e-9;
    });
  return configA.seed === configB.seed
    && configA.dimension === configB.dimension
    && configA.particleCount === configB.particleCount
    && configA.initialDistribution === configB.initialDistribution
    && configA.boundary === configB.boundary
    && Math.abs(speedA - speedB) < 1e-9
    && Math.abs(rateA - rateB) < 1e-9
    && sameStrategyParameters;
}

const SAMPLE_LIMIT = 1200;
const EVENT_SAMPLE_LIMIT = 24000;
const TRAIL_PARTICLE_COUNT = 8;
const TRAIL_POINT_LIMIT = 500;
const RADIAL_BINS = 36;
const MAX_RADIAL_SNAPSHOTS = 8;

function reservoirAdd(samples: number[], value: number, seen: number): void {
  if (!(value > 0) || !Number.isFinite(value)) return;
  if (samples.length < EVENT_SAMPLE_LIMIT) {
    samples.push(value);
    return;
  }
  // Deterministic reservoir sampling keeps long runs representative without
  // consuming the physics engine's seeded random stream.
  const mixed = Math.imul((seen + 1) >>> 0, 0x9e3779b1) >>> 0;
  const slot = mixed % (seen + 1);
  if (slot < EVENT_SAMPLE_LIMIT) samples[slot] = value;
}

function quantile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * fraction;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

export class StrategyDiagnosticsRecorder {
  private readonly spread: SpreadSample[] = [];
  private readonly radialDensity: RadialDensitySnapshot[] = [];
  private readonly waitSamples: number[] = [];
  private readonly jumpSamples: number[] = [];
  private readonly trails = new Map<string, TrailPoint[]>();
  private selectedIds: Set<string> | null = null;
  private totalEvents = 0;
  private waitSeen = 0;
  private jumpSeen = 0;
  private nextSampleTime = 0;
  private sampleInterval = 0.1;
  private nextDensityTime = 0;
  private densityInterval = 0.25;
  private currentTime = 0;
  private activeParticles = 0;
  private lastPublishAt = 0;
  private hasUnpublishedData = false;

  constructor(readonly config: DiagnosticsConfig) {}

  reset(): void {
    this.spread.length = 0;
    this.radialDensity.length = 0;
    this.waitSamples.length = 0;
    this.jumpSamples.length = 0;
    this.trails.clear();
    this.selectedIds = null;
    this.totalEvents = 0;
    this.waitSeen = 0;
    this.jumpSeen = 0;
    this.nextSampleTime = 0;
    this.sampleInterval = 0.1;
    this.nextDensityTime = 0;
    this.densityInterval = 0.25;
    this.currentTime = 0;
    this.activeParticles = 0;
    this.lastPublishAt = 0;
    this.hasUnpublishedData = false;
  }

  recordEvent(event: StrategyEvent): void {
    this.totalEvents++;
    if (event.waitTime > 0) {
      this.waitSeen++;
      reservoirAdd(this.waitSamples, event.waitTime, this.waitSeen);
    }
    if (event.jumpLength !== undefined && event.jumpLength > 0) {
      this.jumpSeen++;
      reservoirAdd(this.jumpSamples, event.jumpLength, this.jumpSeen);
    }
    if (!this.selectedIds?.has(event.particleId)) return;
    const points = this.trails.get(event.particleId) ?? [];
    if (event.waitPosition && event.waitTime > 0) points.push({ ...event.waitPosition, event: 'wait' });
    points.push({ ...event.position, event: event.kind });
    if (points.length > TRAIL_POINT_LIMIT) points.splice(0, points.length - TRAIL_POINT_LIMIT);
    this.trails.set(event.particleId, points);
  }

  recordFrame(particles: Particle[], time: number, force = false): boolean {
    if (!Number.isFinite(time)) return false;
    if (!force && time + 1e-9 < this.nextSampleTime) return false;
    if (force && this.spread.length > 0 && time <= this.currentTime + 1e-9) return false;
    this.currentTime = time;
    this.activeParticles = particles.reduce((count, particle) => count + Number(particle.isActive), 0);
    if (!this.selectedIds) {
      const selected = new Set<string>();
      const count = Math.min(TRAIL_PARTICLE_COUNT, particles.length);
      for (let i = 0; i < count; i++) {
        const index = Math.floor(((i + 0.5) * particles.length) / count);
        if (particles[index]) selected.add(particles[index].id);
      }
      this.selectedIds = selected;
      for (const id of selected) this.trails.set(id, []);
    }

    const squaredRadii: number[] = [];
    let squaredTotal = 0;
    let velocityCorrelation = 0;
    let velocityCount = 0;
    for (const particle of particles) {
      const initial = particle.initial;
      const dx = particle.position.x - (initial?.position.x ?? 0);
      const dy = this.config.dimension === '2D'
        ? particle.position.y - (initial?.position.y ?? 0)
        : 0;
      const radiusSquared = dx * dx + dy * dy;
      squaredRadii.push(radiusSquared);
      squaredTotal += radiusSquared;
      const initialVelocity = initial?.velocity;
      if (initialVelocity) {
        const initialSpeedSquared = initialVelocity.vx ** 2 + initialVelocity.vy ** 2;
        if (initialSpeedSquared > 0) {
          velocityCorrelation += (particle.velocity.vx * initialVelocity.vx + particle.velocity.vy * initialVelocity.vy) / initialSpeedSquared;
          velocityCount++;
        }
      }
      if (this.selectedIds.has(particle.id)) {
        const points = this.trails.get(particle.id) ?? [];
        const last = points[points.length - 1];
        if (!last || last.x !== particle.position.x || last.y !== particle.position.y) {
          points.push({ ...particle.position });
          if (points.length > TRAIL_POINT_LIMIT) points.splice(0, points.length - TRAIL_POINT_LIMIT);
        }
        this.trails.set(particle.id, points);
      }
    }

    squaredRadii.sort((a, b) => a - b);
    const sample: SpreadSample = {
      time,
      msd: particles.length ? squaredTotal / particles.length : 0,
      medianR2: quantile(squaredRadii, 0.5),
      p90Radius: Math.sqrt(quantile(squaredRadii, 0.9)),
      velocityCorrelation: velocityCount ? velocityCorrelation / velocityCount : null,
      eventsPerParticle: particles.length ? this.totalEvents / particles.length : 0,
    };
    if (this.spread.length && time <= this.spread[this.spread.length - 1].time + 1e-9) {
      this.spread[this.spread.length - 1] = sample;
    } else {
      this.spread.push(sample);
    }
    if (this.spread.length > SAMPLE_LIMIT) {
      const decimated = this.spread.filter((_point, index) => index % 2 === 0);
      this.spread.splice(0, this.spread.length, ...decimated);
      this.sampleInterval *= 2;
    }
    this.nextSampleTime = time + this.sampleInterval;
    this.hasUnpublishedData = true;

    if (time > 0 && (!this.radialDensity.length || time + 1e-9 >= this.nextDensityTime)) {
      this.radialDensity.push(this.buildRadialDensity(particles, time));
      if (this.radialDensity.length > MAX_RADIAL_SNAPSHOTS) this.radialDensity.shift();
      this.nextDensityTime = Math.max(time + this.densityInterval, this.nextDensityTime + this.densityInterval);
      this.densityInterval = Math.min(this.densityInterval * 1.35, 8);
    }
    return true;
  }

  shouldPublish(now: number, force = false): boolean {
    if (!this.hasUnpublishedData) return false;
    if (now - this.lastPublishAt < 350 && this.currentTime > 0 && !force) return false;
    this.lastPublishAt = now;
    this.hasUnpublishedData = false;
    return true;
  }

  snapshot(): StrategyDiagnosticsSnapshot {
    return {
      config: this.config,
      time: this.currentTime,
      totalEvents: this.totalEvents,
      activeParticles: this.activeParticles,
      spread: this.spread.map((point) => ({ ...point })),
      radialDensity: this.radialDensity.map((snapshot) => ({ ...snapshot, radii: [...snapshot.radii], density: [...snapshot.density] })),
      waitSamples: [...this.waitSamples],
      jumpSamples: [...this.jumpSamples],
      trails: [...this.trails].map(([id, points]) => ({ id, points: points.map((point) => ({ ...point })) })),
    };
  }

  private buildRadialDensity(particles: Particle[], time: number): RadialDensitySnapshot {
    const radii = particles.map((particle) => {
      const dx = particle.position.x - (particle.initial?.position.x ?? 0);
      const dy = this.config.dimension === '2D'
        ? particle.position.y - (particle.initial?.position.y ?? 0)
        : 0;
      return Math.hypot(dx, dy);
    });
    const maxRadius = Math.max(...radii, Number.EPSILON) * (1 + 1e-9);
    const counts = new Array<number>(RADIAL_BINS).fill(0);
    for (const radius of radii) {
      const index = Math.min(RADIAL_BINS - 1, Math.floor((radius / maxRadius) * RADIAL_BINS));
      counts[index]++;
    }
    const width = maxRadius / RADIAL_BINS;
    const centers = counts.map((_count, index) => (index + 0.5) * width);
    const density = counts.map((count, index) => {
      const fraction = radii.length ? count / radii.length : 0;
      if (this.config.dimension === '1D') return fraction / width;
      const inner = index * width;
      const outer = (index + 1) * width;
      return fraction / (Math.PI * (outer * outer - inner * inner));
    });
    return { time, radii: centers, density };
  }
}

export function fitGrowthExponent(samples: SpreadSample[], metric: 'msd' | 'medianR2'): number | null {
  const points = samples.filter((sample) => sample.time > 0 && sample[metric] > 0 && Number.isFinite(sample[metric]));
  if (points.length < 3) return null;
  const fitPoints = points.slice(Math.floor(points.length * 0.35));
  const xs = fitPoints.map((sample) => Math.log(sample.time));
  const ys = fitPoints.map((sample) => Math.log(sample[metric]));
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const numerator = xs.reduce((sum, value, index) => sum + (value - meanX) * (ys[index] - meanY), 0);
  const denominator = xs.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  return denominator > 0 ? numerator / denominator : null;
}
