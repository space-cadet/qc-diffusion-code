/**
 * Tests for quantum distance calculations
 * Based on Provost-Vallee "Riemannian structure on manifolds of quantum states" (1980)
 */

import { describe, test, expect } from 'vitest';
import { 
  quantumDistance, 
  quantumDistanceUnnormalized,
  quantumFidelity, 
  TwoLevelSystem, 
  BlochSphere 
} from '../../src/geometry/quantumDistance';
import { StateVector } from '../../src/states/stateVector';
import * as math from 'mathjs';

describe('Quantum Distance', () => {
  test('identical states have zero distance', () => {
    const state = TwoLevelSystem.ground();
    const distance = quantumDistance(state, state);
    expect(distance).toBeCloseTo(0, 10);
  });

  test('orthogonal states have distance √2', () => {
    const ground = TwoLevelSystem.ground();
    const excited = TwoLevelSystem.excited();
    const distance = quantumDistance(ground, excited);
    expect(distance).toBeCloseTo(Math.sqrt(2), 10);
  });

  test('plus and minus states are orthogonal', () => {
    const plus = TwoLevelSystem.plus();
    const minus = TwoLevelSystem.minus();
    const distance = quantumDistance(plus, minus);
    expect(distance).toBeCloseTo(Math.sqrt(2), 10);
  });

  test('ground to plus state distance', () => {
    const ground = TwoLevelSystem.ground();
    const plus = TwoLevelSystem.plus();
    const distance = quantumDistance(ground, plus);
    // |⟨0|+⟩| = 1/√2, so D² = 2 - 2/√2 = 2 - √2, D = √(2 - √2)
    const expected = Math.sqrt(2 - Math.sqrt(2));
    expect(distance).toBeCloseTo(expected, 10);
  });

  test('throws error for different dimensions', () => {
    const state2 = TwoLevelSystem.ground();
    const state3 = StateVector.computationalBasis(3, 0);
    expect(() => quantumDistance(state2, state3)).toThrow();
  });
});

describe('Quantum Fidelity', () => {
  test('identical states have fidelity 1', () => {
    const state = TwoLevelSystem.ground();
    const fidelity = quantumFidelity(state, state);
    expect(fidelity).toBeCloseTo(1, 10);
  });

  test('orthogonal states have fidelity 0', () => {
    const ground = TwoLevelSystem.ground();
    const excited = TwoLevelSystem.excited();
    const fidelity = quantumFidelity(ground, excited);
    expect(fidelity).toBeCloseTo(0, 10);
  });

  test('ground and plus states have fidelity 1/2', () => {
    const ground = TwoLevelSystem.ground();
    const plus = TwoLevelSystem.plus();
    const fidelity = quantumFidelity(ground, plus);
    expect(fidelity).toBeCloseTo(0.5, 10);
  });
});

describe('Two-Level System', () => {
  test('ground state is |0⟩', () => {
    const ground = TwoLevelSystem.ground();
    expect(ground.getState(0)).toEqual(math.complex(1, 0));
    expect(ground.getState(1)).toEqual(math.complex(0, 0));
  });

  test('excited state is |1⟩', () => {
    const excited = TwoLevelSystem.excited();
    expect(excited.getState(0)).toEqual(math.complex(0, 0));
    expect(excited.getState(1)).toEqual(math.complex(1, 0));
  });

  test('plus state is normalized', () => {
    const plus = TwoLevelSystem.plus();
    expect(plus.norm()).toBeCloseTo(1, 10);
  });

  test('Bloch state is normalized', () => {
    const state = TwoLevelSystem.blochState(Math.PI/3, Math.PI/4);
    expect(state.norm()).toBeCloseTo(1, 10);
  });
});

describe('Bloch Sphere Geometry', () => {
  test('quantum distance matches Bloch sphere calculation', () => {
    const testCases = [
      [0, 0, Math.PI, 0],           // North to South pole
      [0, 0, Math.PI/2, 0],         // North pole to equator  
      [Math.PI/2, 0, Math.PI/2, Math.PI], // Opposite points on equator
      [Math.PI/4, 0, Math.PI/3, Math.PI/2] // General case
    ];

    testCases.forEach(([theta1, phi1, theta2, phi2]) => {
      const matches = BlochSphere.verifyQuantumDistance(theta1, phi1, theta2, phi2);
      console.log(`Bloch sphere verification: `, matches);
      expect(matches).toBe(true);
    });
  });

  test('antipodal points have maximum distance', () => {
    // North and South poles should have distance √2
    const distance = BlochSphere.geodesicDistance(0, 0, Math.PI, 0);
    expect(distance).toBeCloseTo(Math.sqrt(2), 10);
  });

  test('same point has zero distance', () => {
    const distance = BlochSphere.geodesicDistance(Math.PI/4, Math.PI/3, Math.PI/4, Math.PI/3);
    expect(distance).toBeCloseTo(0, 10);
  });
});
