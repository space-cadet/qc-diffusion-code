/**
 * Tests for HilbertSpace class
 */

import { describe, it, expect } from 'vitest';

import { HilbertSpace } from '../src/core/hilbertSpace';
import { TEST_DIMS, TEST_SPACES, BASIS_STATES } from './utils/testFixtures';
import { stateVectorApproxEqual } from './utils/testHelpers';
import { StateVector } from '../src/states/stateVector';
import * as math from 'mathjs';

describe('HilbertSpace', () => {
  describe('Constructor', () => {
    it('creates space with given dimension', () => {
      const space = new HilbertSpace(TEST_DIMS.QUBIT);
      expect(space.dimension).toBe(TEST_DIMS.QUBIT);
    });

    it('creates default basis labels', () => {
      const space = new HilbertSpace(TEST_DIMS.QUTRIT);
      expect(space.basis).toHaveLength(TEST_DIMS.QUTRIT);
      expect(space.basis).toEqual(['|0⟩', '|1⟩', '|2⟩']);
    });

    it('accepts custom basis labels', () => {
      const labels = ['|↑⟩', '|↓⟩'];
      const space = new HilbertSpace(TEST_DIMS.QUBIT, labels);
      expect(space.basis).toEqual(labels);
    });

    it('throws error for invalid dimension', () => {
      expect(() => new HilbertSpace(0)).toThrow();
      expect(() => new HilbertSpace(-1)).toThrow();
    });

    it('throws error for mismatched basis labels', () => {
      expect(() => new HilbertSpace(2, ['|0⟩'])).toThrow();
      expect(() => new HilbertSpace(2, ['|0⟩', '|1⟩', '|2⟩'])).toThrow();
    });
  });

  describe('Composition Methods', () => {
    it('composes two spaces with tensor product', () => {
      const space1 = TEST_SPACES.QUBIT;
      const space2 = TEST_SPACES.QUBIT;
      const composed = space1.tensorProduct(space2);
      
      expect(composed.dimension).toBe(space1.dimension * space2.dimension);
      expect(composed.basis).toHaveLength(composed.dimension);
      expect(composed.basis[0]).toBe('|0⟩⊗|0⟩');
    });

    it('decomposes space into tensor factors', () => {
      const original = TEST_SPACES.TWO_QUBIT;
      const factors = original.decompose([2, 2]);
      
      expect(factors).toHaveLength(2);
      expect(factors[0].dimension).toBe(2);
      expect(factors[1].dimension).toBe(2);
    });

    it('throws error for invalid decomposition dimensions', () => {
      const space = TEST_SPACES.TWO_QUBIT;
      expect(() => space.decompose([2, 3])).toThrow();
    });
  });

  describe('Instance Methods', () => {
    describe('tensorProduct', () => {
      it('creates tensor product with another space', () => {
        const result = TEST_SPACES.QUBIT.tensorProduct(TEST_SPACES.QUBIT);
        expect(result.dimension).toBe(4);
        expect(result.basis).toHaveLength(4);
      });
    });

    describe('partialTrace', () => {
      it('performs partial trace over subsystems', () => {
        const space = TEST_SPACES.TWO_QUBIT;
        const reduced = space.partialTrace([2]);
        expect(reduced.dimension).toBe(2);
      });

      it('throws error for invalid subsystem dimensions', () => {
        const space = TEST_SPACES.TWO_QUBIT;
        expect(() => space.partialTrace([3])).toThrow();
        expect(() => space.partialTrace([2, 2])).toThrow();
      });
    });

    describe('computationalBasisState', () => {
      it('creates valid basis states', () => {
        const space = TEST_SPACES.QUBIT;
        const state0 = space.computationalBasisState(0);
        console.log(space, "\n", state0, "\n", BASIS_STATES.QUBIT_0);
        console.log(stateVectorApproxEqual(state0, BASIS_STATES.QUBIT_0))
        expect(stateVectorApproxEqual(state0, BASIS_STATES.QUBIT_0)).toBe(true);
      });

      it('throws error for invalid basis index', () => {
        const space = TEST_SPACES.QUBIT;
        expect(() => space.computationalBasisState(-1)).toThrow();
        expect(() => space.computationalBasisState(2)).toThrow();
      });
    });

    describe('computationalBasis', () => {
      it('returns all basis states', () => {
        const space = TEST_SPACES.QUBIT;
        const basis = space.computationalBasis();
        expect(basis).toHaveLength(2);
        expect(stateVectorApproxEqual(basis[0], BASIS_STATES.QUBIT_0)).toBe(true);
        expect(stateVectorApproxEqual(basis[1], BASIS_STATES.QUBIT_1)).toBe(true);
      });
    });

    describe('superposition', () => {
      it('creates normalized superposition state', () => {
        const space = TEST_SPACES.QUBIT;
        const coeffs = [math.complex(1,  0), math.complex(1,  0)];
        const state = space.superposition(coeffs);
        
        expect(state.dimension).toBe(2);
        
        // Check normalization
        const normSquared = state.amplitudes.reduce((sum, amp) => {
          // Calculate |z|² = re² + im²
          const absSquared = math.add(
            math.multiply(amp.re, amp.re),
            math.multiply(amp.im, amp.im)
          );
          return sum + absSquared;
        }, 0);
        expect(Math.abs(normSquared - 1)).toBeLessThan(1e-10);
      });

      it('throws error for invalid coefficients', () => {
        const space = TEST_SPACES.QUBIT;
        expect(() => space.superposition([math.complex(1,  0)])).toThrow();
      });
    });

    describe('equalSuperposition', () => {
      it('creates equal superposition state', () => {
        const space = TEST_SPACES.QUBIT;
        const state = space.equalSuperposition();
        
        const expectedAmplitude = 1 / Math.sqrt(2);
        state.amplitudes.forEach(amp => {
          expect(Math.abs(amp.re - expectedAmplitude)).toBeLessThan(1e-10);
          expect(Math.abs(amp.im)).toBeLessThan(1e-10);
        });
      });
    });

    describe('extendToLargerSpace', () => {
      it('extends space by tensoring with auxiliary space', () => {
        const space = TEST_SPACES.QUBIT;
        const extended = space.extendToLargerSpace(3);
        expect(extended.dimension).toBe(6);
      });

      it('handles different positions for extension', () => {
        const space = TEST_SPACES.QUBIT;
        const left = space.extendToLargerSpace(3, 0);
        const right = space.extendToLargerSpace(3, 1);
        expect(left.dimension).toBe(right.dimension);
        expect(left.basis).not.toEqual(right.basis);
      });
    });
  });

  describe('State Management', () => {
    it('validates states belong to space', () => {
      const space = TEST_SPACES.QUBIT;
      expect(space.containsState(BASIS_STATES.QUBIT_0)).toBe(true);
      expect(space.containsState(BASIS_STATES.QUTRIT_0)).toBe(false);
    });
  });
});