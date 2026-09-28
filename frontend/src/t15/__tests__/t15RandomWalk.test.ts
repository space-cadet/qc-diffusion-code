import { describe, expect, test } from "vitest";
import { SeededRandom } from "../../physics/utils/SeededRandom";
import {
  calculateT15Diagnostics,
  createT15Particles,
  createT15RunExport,
  normalizeT15RunConfig,
  T15_REFERENCE_SEEDS,
  type T15RunConfig,
} from "../t15RandomWalk";

const config: T15RunConfig = {
  walkers: 5000,
  seed: 15026,
  profile: "centered",
  ordering: "derivative",
  speed: 1,
  resetRate: 1,
};

function initialize(mode: "t15a" | "t15b", runConfig: T15RunConfig) {
  const random = new SeededRandom(runConfig.seed);
  return createT15Particles(mode, runConfig, () => random.next());
}

describe("T15 model initialization and diagnostics", () => {
  test("repeats seeded T15a and T15b initial states exactly", () => {
    for (const mode of ["t15a", "t15b"] as const) {
      const first = initialize(mode, config);
      const second = initialize(mode, config);
      expect(first).toEqual(second);
    }
  });

  test("preserves the three T15a profiles and asymmetric initial current", () => {
    const centered = initialize("t15a", { ...config, ordering: "reduced", profile: "centered" });
    expect(centered.every(({ position }) => Math.abs(position.x) <= 0.7)).toBe(true);
    expect(centered.every(({ nextCollisionTime }) => nextCollisionTime === Infinity)).toBe(true);

    const bimodal = initialize("t15a", { ...config, profile: "bimodal" });
    expect(bimodal.every(({ position }) => Math.abs(position.x) >= 0.3 && Math.abs(position.x) <= 1)).toBe(true);

    const asymmetric = initialize("t15a", { ...config, profile: "asymmetric" });
    const meanBeta = asymmetric.reduce((sum, { position }) => sum + position.x, 0) / asymmetric.length;
    const meanCurrent = asymmetric.reduce((sum, { velocity }) => sum + velocity.vx, 0) / asymmetric.length;
    expect(meanBeta).toBeCloseTo(-0.2, 1);
    expect(meanCurrent).toBeCloseTo(0.4, 1);
  });

  test("initializes T15b at the origin with uniform headings and requested speed", () => {
    const speed = 1.7;
    const particles = initialize("t15b", { ...config, speed, resetRate: 0 });
    expect(particles.every(({ position }) => position.x === 0 && position.y === 0)).toBe(true);
    expect(particles.every(({ nextCollisionTime }) => nextCollisionTime === Infinity)).toBe(true);
    expect(particles.every(({ velocity }) => Math.abs(Math.hypot(velocity.vx, velocity.vy) - speed) < 1e-12)).toBe(true);
    expect(particles.reduce((sum, { velocity }) => sum + velocity.vx, 0) / particles.length).toBeCloseTo(0, 1);
  });

  test("normalizes controls and selects each paper protocol seed", () => {
    expect(T15_REFERENCE_SEEDS).toEqual({ t15a: 20260926, t15b: 15026 });
    expect(normalizeT15RunConfig({ ...config, walkers: 100000, seed: -4, speed: 8, resetRate: -1 })).toMatchObject({
      walkers: 50000,
      seed: 0,
      speed: 3,
      resetRate: 0,
    });
  });

  test("exports the effective configuration, model time, and diagnostics", () => {
    const particles = initialize("t15b", config);
    const diagnostics = calculateT15Diagnostics("t15b", config, 0, particles);
    const exported = createT15RunExport("t15b", normalizeT15RunConfig(config), diagnostics);
    const decoded = JSON.parse(JSON.stringify(exported));

    expect(decoded.model).toBe("t15b");
    expect(decoded.config).toMatchObject({ seed: 15026, walkers: 5000, speed: 1, resetRate: 1 });
    expect(decoded.diagnostics.time).toBe(0);
    expect(decoded.diagnostics.meanSquareDisplacement).toBe(0);
    expect(decoded.scientificNote).toContain("position-heading reset process");
  });
});
