import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PhysicsEngine } from "../../physics/core/PhysicsEngine";
import type { Particle } from "../../physics/types/Particle";
import { CircularBuffer } from "../../physics/utils/CircularBuffer";
import { SeededRandom } from "../../physics/utils/SeededRandom";
import { createT15PhysicsRuntime } from "../t15PhysicsRuntime";
import { calculateT15Diagnostics, type T15RunConfig } from "../t15RandomWalk";
import { t15aSpectralReference } from "../t15aReference";

const bounds = { type: "unbounded" as const, xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
const baseConfig: T15RunConfig = {
  walkers: 1,
  seed: 15026,
  profile: "centered",
  ordering: "derivative",
  speed: 1,
  resetRate: 1,
};
const savedT15bReference = JSON.parse(readFileSync(
  resolve(process.cwd(), "public/research/t15b-euclidean-v1.json"),
  "utf8",
)) as {
  radialSnapshots: Array<{ time: number; radius: number[]; radialProbabilityDensity: number[] }>;
  momentResults: Array<{ time: number; meanDisplacementSquared: number; standardError: number }>;
};

function makeParticle(overrides: Partial<Particle> = {}): Particle {
  return {
    id: "test",
    position: { x: 0, y: 0 },
    velocity: { vx: 1, vy: 0 },
    radius: 1,
    lastCollisionTime: 0,
    nextCollisionTime: Infinity,
    collisionCount: 0,
    waitingTime: 0,
    trajectory: new CircularBuffer(100),
    isActive: true,
    lastUpdate: 0,
    ...overrides,
  };
}

function runSeeded(mode: "t15a" | "t15b", config: T15RunConfig, endTime: number): Particle[] {
  const random = new SeededRandom(config.seed);
  const engineParams = {
    particleCount: config.walkers,
    dimension: mode === "t15a" ? "1D" as const : "2D" as const,
    canvasWidth: 800,
    canvasHeight: 600,
    velocity: config.speed,
    dt: 0.01,
    temperature: 0,
    boundaryCondition: "unbounded" as const,
    interparticleCollisions: false,
    collisionRate: config.resetRate,
    collisionRadius: 0,
    initialDistType: "uniform",
    seed: config.seed,
    levyAlpha: 1,
    levyScale: 1,
    fractionalBeta: 0.5,
    fractionalWaitingScale: 1,
    fractionalJumpLength: 1,
  };
  const runtime = createT15PhysicsRuntime(mode, config);
  const engine = new PhysicsEngine({
    timeStep: 0.01,
    boundaries: bounds,
    canvasSize: { width: 800, height: 600 },
    dimension: engineParams.dimension,
    strategies: runtime.createStrategies(engineParams, bounds),
    random: () => random.next(),
  });
  const particles = runtime.initializeParticles(engineParams, () => random.next());

  const steps = Math.round(endTime / 0.01);
  for (let step = 0; step < steps; step += 1) engine.step(particles);
  engine.dispose();
  return particles;
}

describe("T15 PhysicsEngine strategies", () => {
  test("integrates T15a reversals at event time and ignores viewport boundaries", () => {
    const particle = makeParticle({
      position: { x: 0.98, y: 0 },
      nextCollisionTime: 0.045,
    });
    const strategy = createT15PhysicsRuntime("t15a", baseConfig).createStrategies({
      particleCount: 1,
      dimension: "1D",
      canvasWidth: 2,
      canvasHeight: 2,
      velocity: 1,
      dt: 0.05,
      temperature: 0,
      boundaryCondition: "unbounded",
      interparticleCollisions: false,
      collisionRate: 0.75,
      collisionRadius: 0,
      initialDistType: "uniform",
      seed: 1,
      levyAlpha: 1,
      levyScale: 1,
      fractionalBeta: 0.5,
      fractionalWaitingScale: 1,
      fractionalJumpLength: 1,
    }, bounds);
    const engine = new PhysicsEngine({
      timeStep: 0.05,
      boundaries: bounds,
      canvasSize: { width: 2, height: 2 },
      dimension: "1D",
      strategies: strategy,
      random: () => 0.5,
    });

    engine.step([particle]);

    expect(particle.position.x).toBeCloseTo(1.02, 12);
    expect(particle.velocity).toEqual({ vx: -1, vy: 0 });
    expect(particle.collisionCount).toBe(1);
    expect(particle.nextCollisionTime).toBeGreaterThan(0.05);
  });

  test("integrates T15b heading resets at event time and preserves speed", () => {
    const particle = makeParticle({ velocity: { vx: 2, vy: 0 }, nextCollisionTime: 0.025 });
    const strategy = createT15PhysicsRuntime("t15b", { ...baseConfig, speed: 2, resetRate: 1 }).createStrategies({
      particleCount: 1,
      dimension: "2D",
      canvasWidth: 2,
      canvasHeight: 2,
      velocity: 2,
      dt: 0.05,
      temperature: 0,
      boundaryCondition: "unbounded",
      interparticleCollisions: false,
      collisionRate: 1,
      collisionRadius: 0,
      initialDistType: "uniform",
      seed: 1,
      levyAlpha: 1,
      levyScale: 1,
      fractionalBeta: 0.5,
      fractionalWaitingScale: 1,
      fractionalJumpLength: 1,
    }, bounds);
    const engine = new PhysicsEngine({
      timeStep: 0.05,
      boundaries: bounds,
      canvasSize: { width: 2, height: 2 },
      dimension: "2D",
      strategies: strategy,
      random: () => 0.25,
    });

    engine.step([particle]);

    expect(particle.position.x).toBeCloseTo(0.05, 12);
    expect(particle.position.y).toBeCloseTo(0.05, 12);
    expect(Math.hypot(particle.velocity.vx, particle.velocity.vy)).toBeCloseTo(2, 12);
    expect(particle.collisionCount).toBe(1);
  });

  test("replays the engine-backed T15a and T15b ensembles with the same seed", () => {
    const config = { ...baseConfig, walkers: 500 };
    for (const mode of ["t15a", "t15b"] as const) {
      const first = runSeeded(mode, config, 0.5);
      const second = runSeeded(mode, config, 0.5);
      expect(first.map(({ position, velocity, collisionCount }) => ({ position, velocity, collisionCount })))
        .toEqual(second.map(({ position, velocity, collisionCount }) => ({ position, velocity, collisionCount })));
    }
  });

  test("engine-backed T15a density and current remain comparable with the Fourier reference", () => {
    const particles = runSeeded("t15a", { ...baseConfig, walkers: 50000, profile: "asymmetric" }, 0.5);
    const diagnostics = calculateT15Diagnostics("t15a", baseConfig, 0.5, particles);
    const reference = t15aSpectralReference("asymmetric", "derivative", 0.5, diagnostics.density.length);
    const dx = 12 / diagnostics.density.length;
    const densityL1 = diagnostics.density.reduce((sum, value, index) => sum + Math.abs(value - reference.density[index]), 0) * dx;
    const currentL1 = (diagnostics.current ?? []).reduce((sum, value, index) => sum + Math.abs(value - reference.current[index]), 0) * dx;

    expect(diagnostics.mass).toBeGreaterThan(0.999);
    expect(densityL1).toBeLessThan(0.12);
    expect(currentL1).toBeLessThan(0.18);
  });

  test("engine-backed T15b keeps the saved-reference causal front and MSD", () => {
    const config = { ...baseConfig, walkers: 10000, speed: 1, resetRate: 1 };
    const particles = runSeeded("t15b", config, 4);
    const diagnostics = calculateT15Diagnostics("t15b", config, 4, particles);
    const maxRadius = Math.max(...particles.map(({ position }) => Math.hypot(position.x, position.y)));

    expect(maxRadius).toBeLessThanOrEqual(4 + 1e-10);
    expect(diagnostics.frontRadius).toBe(4);
    expect(diagnostics.mass).toBe(1);

    const savedMoment = savedT15bReference.momentResults.find((row) => row.time === 4)!;
    expect(Math.abs(diagnostics.meanSquareDisplacement! - savedMoment.meanDisplacementSquared)).toBeLessThan(0.1);

    const savedSnapshot = savedT15bReference.radialSnapshots.find((row) => row.time === 4)!;
    const binWidth = savedSnapshot.radius[1] - savedSnapshot.radius[0];
    let savedCdf = 0;
    let maximumCdfError = 0;
    for (let bin = 0; bin < savedSnapshot.radius.length; bin += 1) {
      savedCdf += savedSnapshot.radialProbabilityDensity[bin] * binWidth;
      const edge = savedSnapshot.radius[bin] + binWidth / 2;
      const liveCdf = particles.reduce((total, particle) =>
        total + (Math.hypot(particle.position.x, particle.position.y) <= edge ? 1 : 0), 0) / particles.length;
      maximumCdfError = Math.max(maximumCdfError, Math.abs(liveCdf - savedCdf));
    }
    expect(maximumCdfError).toBeLessThan(0.035);
  });
});
