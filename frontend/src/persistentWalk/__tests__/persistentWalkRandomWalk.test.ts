import { describe, expect, test } from "vitest";
import type { Particle } from "../../physics/types/Particle";
import {
  calculatePersistentWalkDiagnostics,
  createPersistentWalkRunExport,
  type PersistentWalkRunConfig,
} from "../persistentWalkRandomWalk";

const config: PersistentWalkRunConfig = {
  walkers: 2,
  seed: 15026,
  profile: "centered",
  ordering: "derivative",
  flipRate: 0.75,
  speed: 1,
  resetRate: 1,
  boundaryCondition: "unbounded",
  initialDistType: "origin",
  distSigmaX: 80,
  distSigmaY: 80,
  distR0: 150,
  distDR: 20,
  distThickness: 40,
  distNx: 20,
  distNy: 15,
  distJitter: 4,
  interparticleCollisions: false,
};

function particle(x: number, y: number, vx: number, vy: number): Particle {
  return {
    id: `p-${x}-${y}-${vx}`,
    position: { x, y },
    velocity: { vx, vy },
    radius: 3,
    lastCollisionTime: 0,
    lastEventTime: 0,
    nextCollisionTime: Infinity,
    collisionCount: 0,
    waitingTime: 0,
    trajectory: [] as any,
    isActive: true,
    lastUpdate: 0,
    initial: { position: { x, y }, velocity: { vx, vy }, timestamp: 0 },
  };
}

describe("Persistent walk diagnostics", () => {
  test("calculates Kac-Goldstein density and signed current", () => {
    const diagnostics = calculatePersistentWalkDiagnostics("kac-goldstein", config, 0.25, [
      particle(-0.5, 0, 1, 0),
      particle(0.5, 0, -1, 0),
    ]);
    expect(diagnostics.mass).toBe(1);
    expect(diagnostics.walkers).toBe(2);
    expect(diagnostics.current?.some((value) => value > 0)).toBe(true);
    expect(diagnostics.current?.some((value) => value < 0)).toBe(true);
  });

  test("exports ML settings and model diagnostics", () => {
    const diagnostics = calculatePersistentWalkDiagnostics("masoliver-lindenbergh", config, 1, [
      particle(0, 0, 1, 0),
      particle(0, 0, -1, 0),
    ]);
    const decoded = JSON.parse(JSON.stringify(createPersistentWalkRunExport("masoliver-lindenbergh", config, diagnostics)));
    expect(decoded.model).toBe("masoliver-lindenbergh");
    expect(decoded.config).toMatchObject({ seed: 15026, walkers: 2, speed: 1, resetRate: 1 });
    expect(decoded.diagnostics.meanSquareDisplacement).toBe(0);
    expect(decoded.scientificNote).toContain("position-heading reset process");
  });

  test("computes displacement statistics relative to each walker's initial position", () => {
    const first = particle(11, 20, 1, 0);
    first.initial = { position: { x: 10, y: 20 }, velocity: { vx: 1, vy: 0 }, timestamp: 0 };
    const second = particle(8, 24, 0, 1);
    second.initial = { position: { x: 10, y: 20 }, velocity: { vx: 0, vy: 1 }, timestamp: 0 };

    const diagnostics = calculatePersistentWalkDiagnostics("masoliver-lindenbergh", config, 1, [first, second]);

    expect(diagnostics.meanSquareDisplacement).toBe(10.5);
    expect(diagnostics.covarianceXX).toBe(2.25);
    expect(diagnostics.covarianceYY).toBe(4);
    expect(diagnostics.telegraphModes).toBeDefined();
    expect(diagnostics.telegraphModes?.modes).toHaveLength(3);
    expect(diagnostics.telegraphModes?.modes.every((mode) => Number.isFinite(mode.telegraph))).toBe(true);
  });

  test("omits the fluid-limit comparison when boundaries alter the process", () => {
    const diagnostics = calculatePersistentWalkDiagnostics("masoliver-lindenbergh", {
      ...config,
      boundaryCondition: "reflective",
    }, 1, [particle(0.1, 0, 1, 0)]);

    expect(diagnostics.telegraphModes).toBeUndefined();
  });
});
