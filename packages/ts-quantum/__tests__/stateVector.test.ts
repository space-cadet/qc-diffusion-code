/**
 * Tests for quantum state vector implementation
 */

import { describe, it, expect } from 'vitest';

import { StateVector } from '../src/states/stateVector';
import * as math from 'mathjs';

// Helper function to verify state normalization
const expectNormalized = (state: StateVector) => {
  const normSquared = state.amplitudes.reduce((sum, amp) => 
    sum + amp.re * amp.re + amp.im * amp.im, 
    0
  );
  expect(Math.abs(normSquared - 1)).toBeLessThan(1e-10);
};

describe('StateVector', () => {
  describe('Constructor', () => {
    it('creates zero state of given dimension', () => {
      const state = new StateVector(2);
      expect(state.dimension).toBe(2);
      expect(state.amplitudes).toHaveLength(2);
      state.amplitudes.forEach(amp => {
        expect(amp.re).toBe(0);
        expect(amp.im).toBe(0);
      });
    });

    it('creates state with given amplitudes', () => {
      const amps: math.Complex[] = [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ];
      const state = new StateVector(2, amps);
      expect(state.dimension).toBe(2);
      expect(state.amplitudes).toEqual(amps);
    });

    it('creates state with basis label', () => {
      const state = new StateVector(2, undefined, '|+⟩');
      expect(state.basis).toBe('|+⟩');
    });

    it('validates dimension', () => {
      expect(() => new StateVector(0)).toThrow();
      expect(() => new StateVector(-1)).toThrow();
    });

    it('validates amplitudes length', () => {
      const amps = [math.complex(1,  0)];
      expect(() => new StateVector(2, amps)).toThrow();
    });
  });

  describe('State Methods', () => {
    describe('setState/getState', () => {
      it('sets and gets state amplitudes', () => {
        const state = new StateVector(2);
        const amp = math.complex(1,  0);
        
        state.setState(0, amp);
        expect(state.getState(0)).toEqual(amp);
      });

      it('validates index bounds', () => {
        const state = new StateVector(2);
        const amp = math.complex(1,  0);
        
        expect(() => state.setState(-1, amp)).toThrow();
        expect(() => state.setState(2, amp)).toThrow();
        expect(() => state.getState(-1)).toThrow();
        expect(() => state.getState(2)).toThrow();
      });
    });

    describe('innerProduct', () => {
      it('computes inner product correctly', () => {
        const state1 = new StateVector(2, [
          math.complex(1,  0),
          math.complex(0,  0)
        ]);
        const state2 = new StateVector(2, [
          math.complex(0,  0),
          math.complex(1,  0)
        ]);
        
        const product = state1.innerProduct(state2);
        expect(product).toEqual(math.complex(0,  0));
      });

      it('computes self inner product', () => {
        const state = new StateVector(2, [
          math.complex(1/Math.sqrt(2),  0),
          math.complex(1/Math.sqrt(2),  0)
        ]);
        
        const product = state.innerProduct(state);
        expect(product.re).toBeCloseTo(1);
        expect(product.im).toBeCloseTo(0);
      });

      it('throws error for mismatched dimensions', () => {
        const state1 = new StateVector(2);
        const state2 = new StateVector(3);
        expect(() => state1.innerProduct(state2)).toThrow();
      });
    });

    describe('norm', () => {
      it('computes norm correctly', () => {
        const state = new StateVector(2, [
          math.complex(1/Math.sqrt(2),  0),
          math.complex(1/Math.sqrt(2),  0)
        ]);
        expect(state.norm()).toBeCloseTo(1);
      });

      it('computes norm of zero state', () => {
        const state = new StateVector(2);
        expect(state.norm()).toBe(0);
      });
    });

    describe('normalize', () => {
      it('normalizes state vector', () => {
        const state = new StateVector(2, [
          math.complex(2,  0),
          math.complex(2,  0)
        ]);
        
        const normalized = state.normalize();
        expectNormalized(normalized);
      });

      it('throws error for zero state', () => {
        const state = new StateVector(2);
        expect(() => state.normalize()).toThrow();
      });
    });

    describe('tensorProduct', () => {
      it('computes tensor product correctly', () => {
        const state1 = new StateVector(2, [
          math.complex(1,  0),
          math.complex(0,  0)
        ]);
        const state2 = new StateVector(2, [
          math.complex(1,  0),
          math.complex(0,  0)
        ]);
        
        const product = state1.tensorProduct(state2);
        expect(product.dimension).toBe(4);
        expect(product.amplitudes[0]).toEqual(math.complex(1,  0));
        expect(product.amplitudes.slice(1).every(amp => 
          amp.re === 0 && amp.im === 0
        )).toBe(true);
      });

      it('handles basis labels in tensor product', () => {
        const state1 = new StateVector(2, undefined, '|0⟩');
        const state2 = new StateVector(2, undefined, '|1⟩');
        
        const product = state1.tensorProduct(state2);
        expect(product.basis).toBe('|0⟩⊗|1⟩');
      });
    });

    describe('isZero', () => {
      it('identifies zero state', () => {
        const state = new StateVector(2);
        expect(state.isZero()).toBe(true);
      });

      it('identifies non-zero state', () => {
        const state = new StateVector(2, [
          math.complex(1,  0),
          math.complex(0,  0)
        ]);
        expect(state.isZero()).toBe(false);
      });

      it('handles numerical tolerance', () => {
        const state = new StateVector(2, [
          math.complex(1e-11,  1e-11),
          math.complex(0,  0)
        ]);
        expect(state.isZero(1e-10)).toBe(true);
        expect(state.isZero(1e-12)).toBe(false);
      });
    });
  });

  describe('Static Methods', () => {
    describe('computationalBasis', () => {
      it('creates valid computational basis state', () => {
        const state = StateVector.computationalBasis(2, 0);
        expect(state.amplitudes[0]).toEqual(math.complex(1,  0));
        expect(state.amplitudes[1]).toEqual(math.complex(0,  0));
        expectNormalized(state);
      });

      it('creates correct basis label', () => {
        const state = StateVector.computationalBasis(2, 1);
        expect(state.basis).toBe('|1⟩');
      });

      it('validates index bounds', () => {
        expect(() => StateVector.computationalBasis(2, -1)).toThrow();
        expect(() => StateVector.computationalBasis(2, 2)).toThrow();
      });
    });

    describe('computationalBasisStates', () => {
      it('creates all basis states', () => {
        const states = StateVector.computationalBasisStates(2);
        expect(states).toHaveLength(2);
        states.forEach(state => expectNormalized(state));
      });

      it('creates orthogonal states', () => {
        const states = StateVector.computationalBasisStates(2);
        const product = states[0].innerProduct(states[1]);
        expect(product.re).toBeCloseTo(0);
        expect(product.im).toBeCloseTo(0);
      });
    });

    describe('superposition', () => {
      it('creates normalized superposition state', () => {
        const coeffs = [
          math.complex(1,  0),
          math.complex(1,  0)
        ];
        const state = StateVector.superposition(coeffs);
        expectNormalized(state);
      });

      it('validates coefficient dimensions', () => {
        expect(() => StateVector.superposition([])).toThrow();
      });
    });

    describe('equalSuperposition', () => {
      it('creates equal superposition state', () => {
        const state = StateVector.equalSuperposition(2);
        expectNormalized(state);
        
        const expectedAmp = math.complex(1/Math.sqrt(2),  0);
        state.amplitudes.forEach(amp => {
          expect(amp).toEqual(expectedAmp);
        });
      });

      it('creates correct basis label', () => {
        const state = StateVector.equalSuperposition(2);
        expect(state.basis).toBe('|+⟩');
      });

      it('validates dimension', () => {
        expect(() => StateVector.equalSuperposition(0)).toThrow();
        expect(() => StateVector.equalSuperposition(-1)).toThrow();
      });
    });
  });
});