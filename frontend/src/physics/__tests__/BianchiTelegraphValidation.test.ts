import { describe, expect, test } from 'vitest';
import {
  runBianchiIValidation,
  runPersistentWalk,
  runRefinementStudy,
  bianchiIXMisnerPotential,
  solveBianchiIXTelegraph,
  validateBianchiParameters,
} from '../../../../scripts/bianchi-telegraph-validation.mjs';

const config = {
  seed: 17,
  particleCount: 1_200,
  gridSize: 24,
  domainHalfWidth: 3,
  initialRadius: 0.2,
  velocity: 1,
  lambda: 1,
  alphaFinal: 0.6,
  alphaStep: 0.01,
};

describe('Bianchi-I telegraph validation', () => {
  test('is reproducible for a fixed seed', () => {
    const first = runPersistentWalk(config);
    const second = runPersistentWalk(config);
    expect(first.walkers).toEqual(second.walkers);
  });

  test('enforces the stochastic factor-ordering range', () => {
    expect(() => validateBianchiParameters({ velocity: 1, lambda: 1, B: 1 })).toThrow('B <= 0');
    expect(() => validateBianchiParameters({ velocity: 1, lambda: 1, B: -1 })).toThrow('B must equal');
  });

  test('reports finite density errors and a causal front', () => {
    const result = runBianchiIValidation(config);
    expect(result.errors.l1).toBeGreaterThanOrEqual(0);
    expect(result.errors.l2).toBeGreaterThanOrEqual(0);
    expect(result.monteCarlo.front.violations).toBe(0);
  });

  test('Bianchi IX has both source and sink regions, requiring branching or weights', () => {
    expect(bianchiIXMisnerPotential(0, 0)).toBeLessThan(0);
    expect(bianchiIXMisnerPotential(-1, 0)).toBeGreaterThan(0);
    const result = solveBianchiIXTelegraph({ gridSize: 24, alphaFinal: -1.6, alphaStep: 0.01 });
    expect(result.sourceTerm.minimum).toBeLessThan(0);
    expect(result.sourceTerm.maximum).toBeGreaterThan(0);
    expect(result.ensemble.positiveFixedPopulation).toBe(false);
    expect(result.ensemble.positiveBranchingPopulation).toBe(false);
    expect(result.ensemble.representation).toContain('signed weighted');
    expect(result.densityDiagnostics.nonnegative).toBe(false);
  });

  test('produces a refinement curve', () => {
    const refinement = runRefinementStudy({ ...config, particleCount: 500, gridSize: 16 });
    expect(refinement).toHaveLength(3);
    expect(refinement.every((level) => Number.isFinite(level.l1) && Number.isFinite(level.l2))).toBe(true);
  });
});
