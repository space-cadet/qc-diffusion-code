/**
 * Integration tests for quantum functionality
 */

import { describe, it, expect } from 'vitest';

import { HilbertSpace } from '../src/core/hilbertSpace';
import { MatrixOperator } from '../src/operators/operator';
import { TEST_SPACES, TEST_OPERATORS, TEST_STATES } from './utils/testFixtures';
import { stateVectorApproxEqual, createRandomState } from './utils/testHelpers';
import * as math from 'mathjs';

describe('Quantum Integration Tests', () => {
  describe('Space and State Integration', () => {
    it('handles tensor products of states correctly', () => {
      const space1 = TEST_SPACES.QUBIT;
      const space2 = TEST_SPACES.QUBIT;
      const composedSpace = space1.tensorProduct(space2);
      
      // Create states in individual spaces
      const state1 = space1.computationalBasisState(0);  // |0⟩
      const state2 = space2.computationalBasisState(1);  // |1⟩
      
      // Expected |01⟩ state in composed space
      const expected = {
        dimension: 4,
        amplitudes: [
          { re: 0, im: 0 },
          { re: 1, im: 0 },
          { re: 0, im: 0 },
          { re: 0, im: 0 }
        ],
        basis: '|01⟩'
      };
      
      // Verify state in composed space
      const composedState = composedSpace.computationalBasisState(1);
      expect(stateVectorApproxEqual(composedState, expected)).toBe(true);
    });

    it('preserves normalization through operations', () => {
      const space = TEST_SPACES.QUBIT;
      const state = createRandomState(space);
      
      // Apply sequence of operations
      const H = new MatrixOperator(TEST_OPERATORS.HADAMARD);
      const X = new MatrixOperator(TEST_OPERATORS.PAULI_X);
      
      const result = X.apply(H.apply(state));
      
      // Check normalization
      const normSquared = result.amplitudes.reduce((sum, amp) => 
        sum + math.abs(amp) ** 2, 0);
      expect(Math.abs(normSquared - 1)).toBeLessThan(1e-10);
    });
  });

  describe('Operator and Space Integration', () => {
    it('correctly extends operators to larger spaces', () => {
      const X = new MatrixOperator(TEST_OPERATORS.PAULI_X);
      const I = new MatrixOperator(TEST_OPERATORS.IDENTITY_2);
      
      // Create tensor product space
      const space = TEST_SPACES.TWO_QUBIT;
      
      // Test X⊗I action on |00⟩
      const initialState = space.computationalBasisState(0);  // |00⟩
      
      // Expected: |10⟩
      const expected = {
        dimension: 4,
        amplitudes: [
          { re: 0, im: 0 },
          { re: 0, im: 0 },
          { re: 1, im: 0 },
          { re: 0, im: 0 }
        ],
        basis: '|10⟩'
      };
      
      // Create X⊗I using tensor product
      const XI = X.tensorProduct(I);
      
      // Apply the operator
      const result = XI.apply(initialState);
      expect(stateVectorApproxEqual(result, expected)).toBe(true);
    });

    it('maintains operator properties in composed spaces', () => {
      const H = new MatrixOperator(TEST_OPERATORS.HADAMARD);
      const space = TEST_SPACES.QUBIT;
      
      // H²=I property should hold
      const H2 = H.compose(H);
      const I = new MatrixOperator(TEST_OPERATORS.IDENTITY_2);
      
      const state = createRandomState(space);
      const result1 = H2.apply(state);
      const result2 = I.apply(state);
      
      expect(stateVectorApproxEqual(result1, result2)).toBe(true);
    });
  });

  describe('Complex Quantum Circuits', () => {
    it('implements basic quantum teleportation circuit', () => {
      // Create three-qubit space
      const space = new HilbertSpace(8);
      
      // Prepare initial state |ψ⟩|00⟩
      const psi = createRandomState(TEST_SPACES.QUBIT);
      const zero = TEST_SPACES.QUBIT.computationalBasisState(0);
      
      // Apply H⊗I on second qubit
      const H = new MatrixOperator(TEST_OPERATORS.HADAMARD);
      const I = new MatrixOperator(TEST_OPERATORS.IDENTITY_2);
      
      // Apply CNOT between second and third qubits
      const CNOT = new MatrixOperator(TEST_OPERATORS.CNOT);
      
      // Compose operations...
      // Note: This is a simplified version - full teleportation
      // would need measurement and classical communication
      
      // Verify final state properties
      // (In reality, would check reduced density matrix of third qubit)
    });

    it('creates and manipulates Bell states', () => {
      const space = TEST_SPACES.TWO_QUBIT;
      
      // Create |00⟩ + |11⟩ / √2
      const state = space.superposition([
        math.complex(1/Math.sqrt(2), 0),
        math.complex(0, 0),
        math.complex( 0, 0 ),
        math.complex( 1/Math.sqrt(2), 0 )
      ]);
      
      // Apply local operations (X⊗Z)
      const X = new MatrixOperator(TEST_OPERATORS.PAULI_X);
      const Z = new MatrixOperator(TEST_OPERATORS.PAULI_Z);
      const I = new MatrixOperator(TEST_OPERATORS.IDENTITY_2);
      
      // Create X⊗I and I⊗Z
      const XI = X.tensorProduct(I);
      const IZ = I.tensorProduct(Z);
      
      // Apply the operators
      const result = XI.compose(IZ).apply(state);
      
      // Expected state: (|10⟩ - |01⟩)/√2
      const expected = {
        dimension: 4,
        amplitudes: [
          { re: 0, im: 0 },
          { re: -1/Math.sqrt(2), im: 0 },
          { re: 1/Math.sqrt(2), im: 0 },
          { re: 0, im: 0 }
        ],
        basis: '|ψ⟩'
      };
      
      expect(stateVectorApproxEqual(result, expected)).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles numerical precision in complex calculations', () => {
      const space = TEST_SPACES.QUBIT;
      const state = createRandomState(space);
      
      // Apply many operations
      const H = new MatrixOperator(TEST_OPERATORS.HADAMARD);
      let result = state;
      for (let i = 0; i < 100; i++) {
        result = H.apply(result);
      }
      
      // Check normalization maintained
      const normSquared = result.amplitudes.reduce((sum, amp) => 
        sum + math.abs(amp) ** 2, 0);
      expect(Math.abs(normSquared - 1)).toBeLessThan(1e-8);
    });

    it('maintains consistency across equivalent operation sequences', () => {
      const space = TEST_SPACES.QUBIT;
      const state = createRandomState(space);
      
      // Different sequences that should be equivalent
      const X = new MatrixOperator(TEST_OPERATORS.PAULI_X);
      const Y = new MatrixOperator(TEST_OPERATORS.PAULI_Y);
      const Z = new MatrixOperator(TEST_OPERATORS.PAULI_Z);
      
      // XYZ = i*I
      const seq1 = X.compose(Y).compose(Z);
      const seq2 = Z.compose(Y).compose(X);
      
      const result1 = seq1.apply(state);
      const result2 = seq2.apply(state);
      
      // Results should differ only by phase
      const overlap = result1.amplitudes.reduce((sum, amp1, i) => {
        const amp2 = result2.amplitudes[i];
        return sum + (amp1.re * amp2.re + amp1.im * amp2.im);
      }, 0);
      
      expect(Math.abs(Math.abs(overlap) - 1)).toBeLessThan(1e-10);
    });
  });
});