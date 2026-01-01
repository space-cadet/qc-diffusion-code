/**
 * Tests for quantum gates
 */

import { describe, it, expect } from 'vitest';

import { 
  PauliX,   // NOT gate
  PauliY,
  PauliZ,  // Phase flip
  Hadamard,
  CNOT
} from '../src/operators/gates';
import { StateVector } from '../src/states/stateVector';
// import { math.complex } from '../complex';
import * as math from 'mathjs';

describe('Quantum Gates', () => {
  describe('Pauli X (NOT) Gate', () => {
    it('flips basis states', () => {
      const state0 = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const state1 = PauliX.apply(state0);
      
      expect(state1.amplitudes[0]).toEqual(math.complex(0,  0));
      expect(state1.amplitudes[1]).toEqual(math.complex(1,  0));
    });

    it('is self-inverse (X² = I)', () => {
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      
      const X2 = PauliX.compose(PauliX);
      const result = X2.apply(state);
      
      // Should return to original state
      expect(result.amplitudes[0].re).toBeCloseTo(state.amplitudes[0].re);
      expect(result.amplitudes[1].re).toBeCloseTo(state.amplitudes[1].re);
    });

    it('is unitary', () => {
      const adjoint = PauliX.adjoint();
      const product = PauliX.compose(adjoint);
      const matrix = product.toMatrix();
      
      // XX† = I
      expect(matrix[0][0]).toEqual(math.complex(1,  0));
      expect(matrix[1][1]).toEqual(math.complex(1,  0));
      expect(matrix[0][1]).toEqual(math.complex(0,  0));
      expect(matrix[1][0]).toEqual(math.complex(0,  0));
    });
  });

  describe('Pauli Y Gate', () => {
    it('rotates basis states with imaginary phase', () => {
      const state0 = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const result = PauliY.apply(state0);
      
      expect(result.amplitudes[0]).toEqual(math.complex(0,  0));
      expect(result.amplitudes[1]).toEqual(math.complex(0,  1));
    });

    it('is self-inverse (Y² = I)', () => {
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      
      const Y2 = PauliY.compose(PauliY);
      const result = Y2.apply(state);
      
      expect(result.amplitudes[0].re).toBeCloseTo(state.amplitudes[0].re);
      expect(result.amplitudes[1].re).toBeCloseTo(state.amplitudes[1].re);
    });

    it('is unitary', () => {
      const adjoint = PauliY.adjoint();
      const product = PauliY.compose(adjoint);
      const matrix = product.toMatrix();
      
      expect(matrix[0][0]).toEqual(math.complex(1,  0));
      expect(matrix[1][1]).toEqual(math.complex(1,  0));
      expect(matrix[0][1]).toEqual(math.complex(0,  0));
      expect(matrix[1][0]).toEqual(math.complex(0,  0));
    });
  });

  describe('Pauli Z Gate', () => {
    it('applies phase flip to |1⟩', () => {
      const state1 = new StateVector(2, [
        math.complex(0,  0),
        math.complex(1,  0)
      ]);
      const result = PauliZ.apply(state1);
      
      expect(result.amplitudes[0]).toEqual(math.complex(0,  0));
      expect(result.amplitudes[1]).toEqual(math.complex(-1,  0));
    });

    it('leaves |0⟩ unchanged', () => {
      const state0 = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const result = PauliZ.apply(state0);
      
      expect(result.amplitudes[0]).toEqual(math.complex(1,  0));
      expect(result.amplitudes[1]).toEqual(math.complex(0,  0));
    });

    it('is self-inverse (Z² = I)', () => {
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      
      const Z2 = PauliZ.compose(PauliZ);
      const result = Z2.apply(state);
      
      expect(result.amplitudes[0].re).toBeCloseTo(state.amplitudes[0].re);
      expect(result.amplitudes[1].re).toBeCloseTo(state.amplitudes[1].re);
    });

    it('is unitary', () => {
      const adjoint = PauliZ.adjoint();
      const product = PauliZ.compose(adjoint);
      const matrix = product.toMatrix();
      
      expect(matrix[0][0]).toEqual(math.complex(1,  0));
      expect(matrix[1][1]).toEqual(math.complex(1,  0));
      expect(matrix[0][1]).toEqual(math.complex(0,  0));
      expect(matrix[1][0]).toEqual(math.complex(0,  0));
    });
  });

  describe('Hadamard Gate', () => {
    it('creates equal superposition from |0⟩', () => {
      const state0 = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const result = Hadamard.apply(state0);
      
      expect(result.amplitudes[0].re).toBeCloseTo(1/Math.sqrt(2));
      expect(result.amplitudes[1].re).toBeCloseTo(1/Math.sqrt(2));
    });

    it('creates opposite phase superposition from |1⟩', () => {
      const state1 = new StateVector(2, [
        math.complex(0,  0),
        math.complex(1,  0)
      ]);
      const result = Hadamard.apply(state1);
      
      expect(result.amplitudes[0].re).toBeCloseTo(1/Math.sqrt(2));
      expect(result.amplitudes[1].re).toBeCloseTo(-1/Math.sqrt(2));
    });

    it('is self-inverse (H² = I)', () => {
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      
      const H2 = Hadamard.compose(Hadamard);
      const result = H2.apply(state);
      
      expect(result.amplitudes[0].re).toBeCloseTo(state.amplitudes[0].re);
      expect(result.amplitudes[1].re).toBeCloseTo(state.amplitudes[1].re);
    });

    it('is unitary', () => {
      const adjoint = Hadamard.adjoint();
      const product = Hadamard.compose(adjoint);
      const matrix = product.toMatrix();
      
      expect(matrix[0][0].re).toBeCloseTo(1);
      expect(matrix[1][1].re).toBeCloseTo(1);
      expect(matrix[0][1].re).toBeCloseTo(0);
      expect(matrix[1][0].re).toBeCloseTo(0);
    });
  });

  describe('CNOT Gate', () => {
    it('flips target qubit when control is |1⟩', () => {
      // |11⟩ -> |10⟩
      const state = new StateVector(4, [
        math.complex(0,  0),
        math.complex(0,  0),
        math.complex(0,  0),
        math.complex(1,  0)
      ]);
      const result = CNOT.apply(state);
      
      expect(result.amplitudes[2]).toEqual(math.complex(1,  0));
      expect(result.amplitudes[3]).toEqual(math.complex(0,  0));
    });

    it('leaves target unchanged when control is |0⟩', () => {
      // |01⟩ -> |01⟩
      const state = new StateVector(4, [
        math.complex(0,  0),
        math.complex(1,  0),
        math.complex(0,  0),
        math.complex(0,  0)
      ]);
      const result = CNOT.apply(state);
      
      expect(result.amplitudes[1]).toEqual(math.complex(1,  0));
    });

    it('is self-inverse (CNOT² = I)', () => {
      const state = new StateVector(4, [
        math.complex(1/2,  0),
        math.complex(1/2,  0),
        math.complex(1/2,  0),
        math.complex(1/2,  0)
      ]);
      
      const CNOT2 = CNOT.compose(CNOT);
      const result = CNOT2.apply(state);
      
      for (let i = 0; i < 4; i++) {
        expect(result.amplitudes[i].re).toBeCloseTo(state.amplitudes[i].re);
      }
    });

    it('is unitary', () => {
      const adjoint = CNOT.adjoint();
      const product = CNOT.compose(adjoint);
      const matrix = product.toMatrix();
      
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const expected = i === j ? math.complex(1,  0) : math.complex(0,  0);
          expect(matrix[i][j]).toEqual(expected);
        }
      }
    });
  });
});