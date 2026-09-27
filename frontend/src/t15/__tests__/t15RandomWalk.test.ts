import { describe, expect, test } from "vitest";
import {
  createT15RunExport,
  normalizeT15RunConfig,
  T15RandomWalkSimulation,
  T15_REFERENCE_SEEDS,
  type T15RunConfig,
} from "../t15RandomWalk";
import { t15aSpectralReference } from "../t15aReference";

const config: T15RunConfig = {
  walkers: 5000,
  seed: 15026,
  profile: "centered",
  ordering: "derivative",
  speed: 1,
  resetRate: 1,
};

describe("T15 seeded random-walk processes", () => {
  test("repeats T15a paths exactly for the same seed and settings", () => {
    const first = new T15RandomWalkSimulation("t15a", config);
    const second = new T15RandomWalkSimulation("t15a", config);
    first.advance(0.5);
    second.advance(0.5);

    expect(Array.from(first.x)).toEqual(Array.from(second.x));
    expect(Array.from(first.direction)).toEqual(Array.from(second.direction));
    expect(first.diagnostics()).toEqual(second.diagnostics());
  });

  test("keeps T15a ensemble mass and initial current in range", () => {
    const simulation = new T15RandomWalkSimulation("t15a", { ...config, profile: "asymmetric" });
    const initial = simulation.diagnostics();
    const binWidth = (initial.domain[1] - initial.domain[0]) / initial.density.length;
    const integratedMass = initial.density.reduce((sum, value) => sum + value * binWidth, 0);
    const integratedCurrent = initial.current?.reduce((sum, value) => sum + value * binWidth, 0) ?? 0;

    expect(initial.mass).toBe(1);
    expect(integratedMass).toBeCloseTo(1, 2);
    expect(integratedCurrent).toBeCloseTo(0.4, 1);
  });

  test("T15a velocity-flip events conserve unit speed", () => {
    const simulation = new T15RandomWalkSimulation("t15a", config);
    simulation.advance(0.25);
    expect(Array.from(simulation.direction).every((direction) => direction === -1 || direction === 1)).toBe(true);
  });

  test("matches the frozen T15a profiles, initial current, and ordering rates", () => {
    const centered = new T15RandomWalkSimulation("t15a", { ...config, ordering: "reduced", profile: "centered" });
    expect(Array.from(centered.x).every((beta) => Math.abs(beta) <= 0.7)).toBe(true);
    centered.advance(1);
    expect(centered.events).toBe(0);

    const bimodal = new T15RandomWalkSimulation("t15a", { ...config, profile: "bimodal" });
    expect(Array.from(bimodal.x).every((beta) => Math.abs(beta) >= 0.3 && Math.abs(beta) <= 1)).toBe(true);

    const asymmetric = new T15RandomWalkSimulation("t15a", { ...config, profile: "asymmetric" });
    expect(asymmetric.diagnostics().mean).toBeCloseTo(-0.2, 1);
    const initialCurrent = asymmetric.diagnostics().current ?? [];
    const binWidth = 12 / initialCurrent.length;
    expect(initialCurrent.reduce((sum, value) => sum + value * binWidth, 0)).toBeCloseTo(0.4, 1);
    asymmetric.advance(1);
    expect(asymmetric.events).toBeGreaterThan(0);
  });

  test("compares a live T15a ensemble with the paper's Fourier density/current reference", () => {
    const simulation = new T15RandomWalkSimulation("t15a", { ...config, walkers: 50000, profile: "asymmetric" });
    simulation.advance(0.5);
    const live = simulation.diagnostics();
    const reference = t15aSpectralReference("asymmetric", "derivative", simulation.time, live.density.length);
    const binWidth = (reference.domain[1] - reference.domain[0]) / live.density.length;
    const densityL1 = live.density.reduce((sum, value, index) => sum + Math.abs(value - reference.density[index]), 0) * binWidth;
    const currentL1 = (live.current ?? []).reduce((sum, value, index) => sum + Math.abs(value - reference.current[index]), 0) * binWidth;

    expect(reference.density.length).toBe(live.density.length);
    expect(reference.density.reduce((sum, value) => sum + value * binWidth, 0)).toBeCloseTo(1, 8);
    expect(densityL1).toBeLessThan(0.12);
    expect(currentL1).toBeLessThan(0.18);
  });

  test("normalizes UI run settings and uses each paper protocol seed", () => {
    expect(T15_REFERENCE_SEEDS).toEqual({ t15a: 20260926, t15b: 15026 });
    expect(normalizeT15RunConfig({ ...config, walkers: 100000, seed: -4, speed: 8, resetRate: -1 })).toMatchObject({
      walkers: 50000,
      seed: 0,
      speed: 3,
      resetRate: 0,
    });
  });

  test("T15b stays inside its causal front", () => {
    const speed = 1.7;
    const simulation = new T15RandomWalkSimulation("t15b", { ...config, speed, resetRate: 1.4 });
    simulation.advance(1.25);
    const causalRadius = speed * simulation.time;

    for (let i = 0; i < simulation.x.length; i += 1) {
      expect(Math.hypot(simulation.x[i], simulation.y[i])).toBeLessThanOrEqual(causalRadius + 1e-10);
    }
    expect(simulation.diagnostics().frontRadius).toBeCloseTo(causalRadius);
  });

  test("T15b with zero reset rate follows straight persistent paths", () => {
    const speed = 2;
    const simulation = new T15RandomWalkSimulation("t15b", { ...config, speed, resetRate: 0 });
    simulation.advance(0.75);
    const stats = simulation.diagnostics();

    expect(stats.eventCount).toBe(0);
    expect(stats.meanSquareDisplacement).toBeCloseTo(speed * speed * 0.75 * 0.75, 10);
    expect(stats.frontRadius).toBeCloseTo(speed * 0.75, 10);
  });

  test("exports the effective seed, settings, and diagnostics as JSON data", () => {
    const simulation = new T15RandomWalkSimulation("t15b", config);
    simulation.advance(0.25);
    const diagnostics = simulation.diagnostics();
    const exported = createT15RunExport("t15b", normalizeT15RunConfig(config), diagnostics);
    const decoded = JSON.parse(JSON.stringify(exported));

    expect(decoded.model).toBe("t15b");
    expect(decoded.config).toMatchObject({ seed: 15026, walkers: 5000, speed: 1, resetRate: 1 });
    expect(decoded.diagnostics.time).toBeCloseTo(0.25, 10);
    expect(decoded.diagnostics.meanSquareDisplacement).toBeGreaterThan(0);
    expect(decoded.scientificNote).toContain("position-heading reset process");
  });
});
