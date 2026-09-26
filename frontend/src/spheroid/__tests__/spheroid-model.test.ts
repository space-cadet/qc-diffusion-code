import { describe, expect, it } from 'vitest';
import { makeReference, runPersistentEnsemble, spheroidGeometry, transformToAxisRatio } from '../spheroid-model.mjs';

describe('spheroid geometry-space model', () => {
  it('satisfies fixed-volume, sphere, and pole/equator curvature identities', () => {
    const R = 1.7;
    for (const q of [-0.7, 0, 0.8]) {
      const pole = spheroidGeometry(q, 0, R);
      const equator = spheroidGeometry(q, Math.PI / 2, R);
      expect(pole.a ** 2 * pole.c).toBeCloseTo(R ** 3, 12);
      expect(pole.volume).toBeCloseTo((4 * Math.PI / 3) * R ** 3, 11);
      expect(pole.gaussianCurvature).toBeCloseTo(R ** -2 * Math.exp(-8 * q), 11);
      expect(equator.gaussianCurvature).toBeCloseTo(R ** -2 * Math.exp(4 * q), 11);
    }
    const sphere = spheroidGeometry(0, Math.PI / 3, R);
    expect(sphere.E).toBeCloseTo(R ** 2, 12);
    expect(sphere.G).toBeCloseTo(R ** 2 * Math.sin(Math.PI / 3) ** 2, 12);
    expect(sphere.gaussianCurvature).toBeCloseTo(R ** -2, 12);
  });

  it('replays seeded paths and respects probability, current, and finite-speed accounting', () => {
    const config = { kind: 'bimodal-current', eta: 0.35, seed: 39001, population: 6000, finalTime: 2 };
    const a = runPersistentEnsemble(config), b = runPersistentEnsemble(config);
    expect(a.representativePath).toEqual(b.representativePath);
    expect(a.eventLog).toEqual(b.eventLog);
    expect(a.frames.at(-1)!.mass).toBe(1);
    for (const frame of a.frames) {
      for (let i = 0; i < frame.density.length; i++) {
        expect(frame.density[i]).toBeGreaterThanOrEqual(0);
        expect(Math.abs(frame.current[i])).toBeLessThanOrEqual(0.6 * frame.density[i] + 1e-12);
      }
    }
    for (const point of a.representativePath) expect(Math.abs(point.q - a.representativePath[0].q)).toBeLessThanOrEqual(0.6 * point.time + 1e-10);
  });

  it('conserves mass in the independent reflecting-boundary reference', () => {
    const reference = makeReference({ kind: 'bimodal-current', eta: 0.35, cells: 300, outputStep: 0.1 });
    expect(Math.max(...reference.mass.map((mass: number) => Math.abs(mass - 1)))).toBeLessThan(1e-12);
    for (const frame of reference.frames) for (let i = 0; i < frame.density.length; i++) {
      expect(frame.density[i]).toBeGreaterThanOrEqual(-1e-12);
      expect(Math.abs(frame.current[i])).toBeLessThanOrEqual(0.6 * frame.density[i] + 1e-12);
    }
  });

  it('transforms the same q path and density with the axis-ratio Jacobian', () => {
    const q = [-0.5, 0.1, 0.7];
    const density = [0.2, 0.5, 0.3];
    const dq = 0.01;
    const massQ = density.reduce((sum, value) => sum + value * dq, 0);
    const massR = q.reduce((sum, value, index) => {
      const mapped = transformToAxisRatio(value, 1);
      expect(mapped.drdt).toBeCloseTo(-1.8 * mapped.r, 12);
      return sum + (density[index] * mapped.densityJacobian) * (3 * mapped.r * dq);
    }, 0);
    expect(massR).toBeCloseTo(massQ, 12);
  });
});
