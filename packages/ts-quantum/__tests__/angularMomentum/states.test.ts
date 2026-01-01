import { describe, it, expect } from 'vitest';

import { Complex } from '../../src/core/types';
import {
  createJmState as createJmState,
  createCoherentState,
  createJz,
  createJplus,
  createJminus,
  jmExpectationValue
} from '../../src/angularMomentum/core';
import * as math from 'mathjs';

describe('Angular Momentum States', () => {
  // Test basic state creation
  describe('State Creation', () => {
    it('should create valid states for j=1/2', () => {
      expect(() => createJmState(1/2, 1/2)).not.toThrow();
      expect(() => createJmState(1/2, -1/2)).not.toThrow();
    });

    it('should throw for invalid m values', () => {
      expect(() => createJmState(1/2, 3/2)).toThrow();
      expect(() => createJmState(1, 1.5)).toThrow();
    });

    it('should create normalized states', () => {
      const state = createJmState(1/2, 1/2);
      expect(math.abs(math.subtract(state.norm(), 1)) < 1e-10).toBe(true);
    });
  });

  // Test state vectors for j=1/2
  describe('j=1/2 State Vectors', () => {
    it('should have correct components for |1/2,1/2⟩', () => {
      const stateUp = createJmState(1/2, 1/2);
      const components = stateUp.getAmplitudes();

      expect(Number(math.abs(math.subtract(components[0], math.complex(1, 0)))) < 1e-10).toBe(true);
      expect(Number(math.abs(components[1])) < 1e-10).toBe(true);
    });

    it('should have correct components for |1/2,-1/2⟩', () => {
      const stateDown = createJmState(1/2, -1/2);
      const components = stateDown.getAmplitudes();

      // console.log('State:', stateDown.toString());
      // console.log('Components:', components);
      
      // console.log(Number(math.abs(math.subtract(components[0], math.complex(1, 0)))));
      
      expect(Number(math.abs(components[0])) < 1e-10).toBe(true);
      expect(Number(math.abs(math.subtract(components[1], math.complex(1, 0)))) < 1e-10).toBe(true);
    });
  });

  // Test raising and lowering operators on states
  describe('Raising and Lowering Operations', () => {
    const j = 0.5;
    const jplus = createJplus(j);
    const jminus = createJminus(j);

    it('should correctly raise states', () => {
      const state = createJmState(j, -0.5);
      const raised = jplus.apply(state);

      // Compare with |j,m+1⟩ scaled by √(j(j+1)-m(m+1))
      const expectedState = createJmState(j, 0.5);

      console.log('Expected state:', expectedState.toString());

      expect(raised.equals(expectedState)).toBe(true);
    });

    it('should correctly lower states', () => {
      const state = createJmState(j, 0.5);
      const lowered = jminus.apply(state);
    
      // Compare with |j,m-1⟩ scaled by √(j(j+1)-m(m-1))
      const expectedState = createJmState(j, -0.5);
      expect(lowered.equals(expectedState)).toBe(true);
    });

    it('should annihilate highest/lowest weight states', () => {
      const highest = createJmState(j, j);
      const lowest = createJmState(j, -j);
      
      const raisedHighest = jplus.apply(highest);
      const loweredLowest = jminus.apply(lowest);
      
      expect(raisedHighest.norm() < 1e-10).toBe(true);
      expect(loweredLowest.norm() < 1e-10).toBe(true);
    });
  });

  // Test coherent states
  describe('Coherent States', () => {
    const j = 1/2;

    it('should create normalized coherent states', () => {
      const state = createCoherentState(j, Math.PI/4, Math.PI/3);
      expect(Math.abs(state.norm() - 1) < 1e-10).toBe(true);
    });

    it('should give expected Jz expectation values', () => {
      // θ = 0 should give maximum Jz
      const stateUp = createCoherentState(j, 0, 0);
      const jz = createJz(j);
      // Add j property to the operator for type safety
      const jzWithJ = Object.assign(jz, { j });

      const expectValue = jmExpectationValue(jzWithJ, j, 1/2);
      expect(Number(math.abs(math.subtract(expectValue, math.complex(1/2, 0)))) < 1e-10).toBe(true);
    });
  });
});
