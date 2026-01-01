/**
 * Tests for quantum states implementation
 */

import { describe, it, expect } from 'vitest';

import { 
  computationalBasis,
  createBasisState,
  createBellState,
  createGHZState,
  createWState,
  createPlusState,
  createMinusState
} from '../src/states/states';
// import { math.complex } from '../complex';
import * as math from 'mathjs';

const expectStateNormalized = (state: any) => {
  const normSquared = state.amplitudes.reduce((sum: number, amp: any) => 
    sum + amp.re * amp.re + amp.im * amp.im, 
    0
  );
  expect(Math.abs(normSquared - 1)).toBeLessThan(1e-10);
};

describe('Quantum States', () => {
  describe('computationalBasis', () => {
    it('creates valid basis for single qubit', () => {
      const basis = computationalBasis(1);
      expect(basis).toHaveLength(2);
      expectStateNormalized(basis[0]);
      expectStateNormalized(basis[1]);
      
      // |0⟩ state
      expect(basis[0].amplitudes[0]).toEqual(math.complex(1,  0));
      expect(basis[0].amplitudes[1]).toEqual(math.complex(0,  0));
      
      // |1⟩ state
      expect(basis[1].amplitudes[0]).toEqual(math.complex(0,  0));
      expect(basis[1].amplitudes[1]).toEqual(math.complex(1,  0));
    });

    it('creates valid basis for two qubits', () => {
      const basis = computationalBasis(2);
      expect(basis).toHaveLength(4);
      basis.forEach(state => expectStateNormalized(state));
    });

    it('throws error for invalid number of qubits', () => {
      expect(() => computationalBasis(0)).toThrow();
      expect(() => computationalBasis(-1)).toThrow();
    });
  });

  describe('createBasisState', () => {
    it('creates valid computational basis states', () => {
      const state0 = createBasisState(2, 0);
      expect(state0.amplitudes[0]).toEqual(math.complex(1,  0));
      expect(state0.amplitudes[1]).toEqual(math.complex(0,  0));
      expectStateNormalized(state0);

      const state1 = createBasisState(2, 1);
      expect(state1.amplitudes[0]).toEqual(math.complex(0,  0));
      expect(state1.amplitudes[1]).toEqual(math.complex(1,  0));
      expectStateNormalized(state1);
    });

    it('throws error for invalid index', () => {
      expect(() => createBasisState(2, -1)).toThrow();
      expect(() => createBasisState(2, 2)).toThrow();
    });
  });

  describe('Bell States', () => {
    it('creates normalized Phi+ Bell state', () => {
      const state = createBellState('Phi+');
      expectStateNormalized(state);
      
      expect(state.amplitudes[0]).toEqual(math.complex(1/Math.sqrt(2),  0));
      expect(state.amplitudes[1]).toEqual(math.complex(0,  0));
      expect(state.amplitudes[2]).toEqual(math.complex(0,  0));
      expect(state.amplitudes[3]).toEqual(math.complex(1/Math.sqrt(2),  0));
    });

    it('creates normalized Phi- Bell state', () => {
      const state = createBellState('Phi-');
      expectStateNormalized(state);
      
      expect(state.amplitudes[0]).toEqual(math.complex(1/Math.sqrt(2),  0));
      expect(state.amplitudes[3]).toEqual(math.complex(-1/Math.sqrt(2),  0));
    });

    it('creates normalized Psi+ Bell state', () => {
      const state = createBellState('Psi+');
      expectStateNormalized(state);
      
      expect(state.amplitudes[1]).toEqual(math.complex(1/Math.sqrt(2),  0));
      expect(state.amplitudes[2]).toEqual(math.complex(1/Math.sqrt(2),  0));
    });

    it('creates normalized Psi- Bell state', () => {
      const state = createBellState('Psi-');
      expectStateNormalized(state);
      
      expect(state.amplitudes[1]).toEqual(math.complex(1/Math.sqrt(2),  0));
      expect(state.amplitudes[2]).toEqual(math.complex(-1/Math.sqrt(2),  0));
    });
  });

  describe('GHZ States', () => {
    it('creates valid 2-qubit GHZ state', () => {
      const state = createGHZState(2);
      expectStateNormalized(state);
      
      expect(state.amplitudes[0]).toEqual(math.complex(1/Math.sqrt(2),  0));
      expect(state.amplitudes[3]).toEqual(math.complex(1/Math.sqrt(2),  0));
    });

    it('creates valid 3-qubit GHZ state', () => {
      const state = createGHZState(3);
      expectStateNormalized(state);
      
      expect(state.amplitudes[0]).toEqual(math.complex(1/Math.sqrt(2),  0));
      expect(state.amplitudes[7]).toEqual(math.complex(1/Math.sqrt(2),  0));
    });

    it('throws error for invalid number of qubits', () => {
      expect(() => createGHZState(1)).toThrow();
      expect(() => createGHZState(0)).toThrow();
      expect(() => createGHZState(-1)).toThrow();
    });
  });

  describe('W States', () => {
    it('creates valid 2-qubit W state', () => {
      const state = createWState(2);
      expectStateNormalized(state);
      
      const expectedAmp = math.complex(1/Math.sqrt(2),  0);
      expect(state.amplitudes[1]).toEqual(expectedAmp);
      expect(state.amplitudes[2]).toEqual(expectedAmp);
    });

    it('creates valid 3-qubit W state', () => {
      const state = createWState(3);
      expectStateNormalized(state);
      
      const expectedAmp = math.complex(1/Math.sqrt(3),  0);
      expect(state.amplitudes[1]).toEqual(expectedAmp);
      expect(state.amplitudes[2]).toEqual(expectedAmp);
      expect(state.amplitudes[4]).toEqual(expectedAmp);
    });

    it('throws error for invalid number of qubits', () => {
      expect(() => createWState(1)).toThrow();
      expect(() => createWState(0)).toThrow();
      expect(() => createWState(-1)).toThrow();
    });
  });

  describe('Plus/Minus States', () => {
    it('creates normalized |+⟩ state', () => {
      const state = createPlusState();
      expectStateNormalized(state);
      
      const expectedAmp = math.complex(1/Math.sqrt(2),  0);
      expect(state.amplitudes[0]).toEqual(expectedAmp);
      expect(state.amplitudes[1]).toEqual(expectedAmp);
    });

    it('creates normalized |-⟩ state', () => {
      const state = createMinusState();
      expectStateNormalized(state);
      
      expect(state.amplitudes[0]).toEqual(math.complex(1/Math.sqrt(2),  0));
      expect(state.amplitudes[1]).toEqual(math.complex(-1/Math.sqrt(2),  0));
    });
  });
});