import { describe, expect, test } from 'vitest';
import { comparableSetups, fitGrowthExponent, StrategyDiagnosticsRecorder } from '../diagnostics/strategyDiagnostics';
import { CircularBuffer } from '../utils/CircularBuffer';
import type { DiagnosticsConfig, StrategyDiagnosticsSnapshot } from '../diagnostics/strategyDiagnostics';
import type { Particle, TrajectoryPoint } from '../types/Particle';
import type { StrategyEvent } from '../types/PhysicsContext';

const config: DiagnosticsConfig = {
  strategy: 'kac-goldstein', dimension: '2D', boundary: 'unbounded', seed: 42,
  particleCount: 1, initialDistribution: 'centered',
  parameters: { velocity: 1, flipRate: 0.75, kacGoldsteinOrdering: 1 },
};

function particle(x = 0, y = 0): Particle {
  return {
    id: 'walker-1', position: { x, y }, velocity: { vx: 1, vy: 0 },
    lastCollisionTime: 0, nextCollisionTime: Infinity, collisionCount: 0, waitingTime: 0,
    trajectory: new CircularBuffer<TrajectoryPoint>(10), isActive: true, lastUpdate: 0,
    initial: { position: { x: 0, y: 0 }, velocity: { vx: 1, vy: 0 }, timestamp: 0 },
  };
}

function snapshot(overrides: Partial<DiagnosticsConfig> = {}): StrategyDiagnosticsSnapshot {
  return {
    config: { ...config, ...overrides, parameters: overrides.parameters ?? config.parameters },
    time: 0, totalEvents: 0, activeParticles: 1, spread: [], radialDensity: [],
    waitSamples: [], jumpSamples: [], trails: [],
  };
}

describe('strategy diagnostics recorder', () => {
  test('records spread, normalized radial density, event samples, and marked trails', () => {
    const recorder = new StrategyDiagnosticsRecorder(config);
    const walker = particle();
    recorder.recordFrame([walker], 0);
    const event: StrategyEvent = {
      particleId: walker.id, time: 0.25, kind: 'turn', position: { x: 0.75, y: 1 },
      waitPosition: { x: 0.5, y: 0.5 }, waitTime: 0.25, jumpLength: 1.25,
    };
    recorder.recordEvent(event);
    walker.position = { x: 3, y: 4 };
    walker.velocity = { vx: -1, vy: 0 };
    recorder.recordFrame([walker], 0.5);

    const result = recorder.snapshot();
    expect(result.spread.at(-1)).toMatchObject({ time: 0.5, msd: 25, medianR2: 25, eventsPerParticle: 1 });
    expect(result.totalEvents).toBe(1);
    expect(result.waitSamples).toEqual([0.25]);
    expect(result.jumpSamples).toEqual([1.25]);
    expect(result.trails[0].points.map((point) => point.event)).toContain('wait');
    expect(result.trails[0].points.map((point) => point.event)).toContain('turn');
    const density = result.radialDensity[0];
    const binWidth = density.radii[1] - density.radii[0];
    const integratedMass = density.density.reduce((sum, value, index) => {
      const inner = index * binWidth;
      const outer = (index + 1) * binWidth;
      return sum + value * Math.PI * (outer ** 2 - inner ** 2);
    }, 0);
    expect(integratedMass).toBeCloseTo(1);
  });

  test('throttles publishes and clears recorded state on reset', () => {
    const recorder = new StrategyDiagnosticsRecorder(config);
    recorder.recordFrame([particle()], 0);
    expect(recorder.shouldPublish(1000)).toBe(true);
    expect(recorder.shouldPublish(1100)).toBe(false);
    recorder.reset();
    expect(recorder.snapshot()).toMatchObject({ time: 0, totalEvents: 0, spread: [], radialDensity: [], trails: [] });
  });
});

describe('diagnostic comparison and spread fit', () => {
  test('rejects snapshots whose run setup or strategy parameters differ', () => {
    const baseline = snapshot();
    expect(comparableSetups(baseline, snapshot())).toBe(true);
    expect(comparableSetups(baseline, snapshot({ seed: 43 }))).toBe(false);
    expect(comparableSetups(baseline, snapshot({ dimension: '1D' }))).toBe(false);
    expect(comparableSetups(baseline, snapshot({ parameters: { ...config.parameters, velocity: 2 } }))).toBe(false);
    expect(comparableSetups(baseline, snapshot({ parameters: { ...config.parameters, kacGoldsteinOrdering: 0 } }))).toBe(false);
  });

  test('fits power-law slopes from later positive-time samples', () => {
    const samples = [1, 2, 4, 8].map((time) => ({
      time, msd: time ** 2, medianR2: time, p90Radius: time,
      velocityCorrelation: 1, eventsPerParticle: 0,
    }));
    expect(fitGrowthExponent(samples, 'msd')).toBeCloseTo(2);
    expect(fitGrowthExponent(samples, 'medianR2')).toBeCloseTo(1);
    expect(fitGrowthExponent(samples.slice(0, 2), 'msd')).toBeNull();
  });
});
