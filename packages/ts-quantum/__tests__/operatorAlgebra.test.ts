/**
 * Tests for quantum operator algebra functionality
 */

import { describe, it, expect } from 'vitest';

import { zeroMatrix } from '../src/utils/matrixOperations';

import { 
  commutator, 
  antiCommutator, 
  nestedCommutator,
  lieDerivative,
  BCHFormula,
  operatorsCommute,
  commutatorExpectation,
  uncertaintyProduct,
  isNormalOperator,
  operatorFromGenerator,
  projectionOperator
} from '../src/operators/algebra';
import { MatrixOperator } from '../src/operators/operator';
import { StateVector } from '../src/states/stateVector';
import { PauliX, PauliY, PauliZ } from '../src/operators/gates';
import * as math from 'mathjs';
import { isEqual } from 'lodash';

describe('Operator Algebra', () => {
  describe('commutator', () => {
    it('calculates commutator of two operators', () => {
      // [X, Y] = 2iZ
      const result = commutator(PauliX, PauliY);
      const matrix = result.toMatrix();
      
      // Should be 2i times Pauli Z
      expect(matrix[0][0].re).toBeCloseTo(0);
      expect(matrix[0][0].im).toBeCloseTo(2);
      expect(matrix[0][1].re).toBeCloseTo(0);
      expect(matrix[0][1].im).toBeCloseTo(0);
      expect(matrix[1][0].re).toBeCloseTo(0);
      expect(matrix[1][0].im).toBeCloseTo(0);
      expect(matrix[1][1].re).toBeCloseTo(0);
      expect(matrix[1][1].im).toBeCloseTo(-2);
    });

    it('returns zero for commuting operators', () => {
      // [X, X] = 0
      const result = commutator(PauliX, PauliX);
      const matrix = result.toMatrix();
      
      // Should be zero matrix
      expect(matrix[0][0].re).toBeCloseTo(0);
      expect(matrix[0][0].im).toBeCloseTo(0);
      expect(matrix[1][1].re).toBeCloseTo(0);
      expect(matrix[1][1].im).toBeCloseTo(0);
    });

    it('throws error for dimension mismatch', () => {
      const op1 = MatrixOperator.identity(2);
      const op2 = MatrixOperator.identity(3);
      expect(() => commutator(op1, op2)).toThrow();
    });
  });

  describe('antiCommutator', () => {
    it('calculates anti-commutator of two operators', () => {
      // {X, Y} = 0
      const result = antiCommutator(PauliX, PauliY);
      const matrix = result.toMatrix();
      
      // Should be zero matrix
      expect(matrix[0][0].re).toBeCloseTo(0);
      expect(matrix[0][0].im).toBeCloseTo(0);
      expect(matrix[1][1].re).toBeCloseTo(0);
      expect(matrix[1][1].im).toBeCloseTo(0);
    });

    it('calculates anti-commutator for same operator', () => {
      // {X, X} = 2X²
      const result = antiCommutator(PauliX, PauliX);
      const matrix = result.toMatrix();
      
      // Should be 2 * identity
      expect(matrix[0][0].re).toBeCloseTo(2);
      expect(matrix[0][0].im).toBeCloseTo(0);
      expect(matrix[1][1].re).toBeCloseTo(2);
      expect(matrix[1][1].im).toBeCloseTo(0);
    });
  });

  describe('nestedCommutator', () => {
    it('calculates nested commutator structure', () => {
      // [X, [Y, Z]]
      const ops = [PauliX, PauliY, PauliZ];
      const indices = [[0, 1], [1, 2]];
      
      const result = nestedCommutator(ops, indices);
      
      // The result should be proportional to PauliY, but the exact structure 
      // depends on the implementation details of the nested commutator
      // const matrix = result.toMatrix();

      console.log('Matrix representation:', result);

      // console.log('Zero matrix:', zeroMatrix(2, 2));
      
      // Matrix should be zero
      expect(result.isZero()).toBe(true);
    });

    it('throws error for invalid indices', () => {
      const ops = [PauliX, PauliY];
      const indices = [[0, 2]]; // Invalid index 2
      expect(() => nestedCommutator(ops, indices)).toThrow();
    });
  });

  describe('operatorsCommute', () => {
    it('returns true for commuting operators', () => {
      // X and X commute
      expect(operatorsCommute(PauliX, PauliX)).toBe(true);
      
      // Z and Z commute
      expect(operatorsCommute(PauliZ, PauliZ)).toBe(true);
    });

    it('returns false for non-commuting operators', () => {
      // X and Y don't commute
      console.log(commutator(PauliX, PauliY).toMatrix());
      console.log(operatorsCommute(PauliX, PauliY));
      expect(operatorsCommute(PauliX, PauliY)).toBe(false);
      
      // Y and Z don't commute
      expect(operatorsCommute(PauliY, PauliZ)).toBe(false);
    });
  });

  describe('uncertaintyProduct', () => {
    it('calculates uncertainty product for a state', () => {
      // Create a state |+⟩ = (|0⟩ + |1⟩)/√2
      const plusState = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      
      // For |+⟩, ΔY·ΔZ ≥ |⟨[Y,Z]⟩|/2 = |⟨X⟩|/2 = 1/2
      const uncertainty = uncertaintyProduct(plusState, PauliY, PauliZ);
      
      // The uncertainty should be at least 0.5
      expect(uncertainty).toBeGreaterThanOrEqual(0.5 - 1e-10);
    });

    it('follows uncertainty principle', () => {
      // Create |0⟩ state
      const state = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      
      // Calculate uncertainty and commutator expectation
      const uncertainty = uncertaintyProduct(state, PauliX, PauliY);
      const commExp = commutatorExpectation(state, PauliX, PauliY);
      const lowerBound = Math.abs(commExp.re) / 2 + Math.abs(commExp.im) / 2;
      
      // Uncertainty relation: ΔX·ΔY ≥ |⟨[X,Y]⟩|/2
      expect(uncertainty).toBeGreaterThanOrEqual(lowerBound - 1e-10);
    });
  });

  describe('isNormalOperator', () => {
    it('identifies normal operators', () => {
      // Hermitian operators are normal
      expect(isNormalOperator(PauliX)).toBe(true);
      expect(isNormalOperator(PauliY)).toBe(true);
      expect(isNormalOperator(PauliZ)).toBe(true);
      
      // Identity is normal
      const identity = MatrixOperator.identity(2);
      expect(isNormalOperator(identity)).toBe(true);
    });

    it('identifies non-normal operators', () => {
      // Example of non-normal operator: upper triangular but not diagonal
      const nonNormal = new MatrixOperator([
        [math.complex(1,  0), math.complex(1,  0)],
        [math.complex(0,  0), math.complex(2,  0)]
      ]);
      
      expect(isNormalOperator(nonNormal)).toBe(false);
    });
  });

  describe('operatorFromGenerator', () => {
    it('creates unitary operator from hermitian generator', () => {
      // e^(iZ) should be a unitary operator
      const unitary = operatorFromGenerator(PauliZ);
      
      // Check unitary property: U†U = I
      const adjoint = unitary.adjoint();
      const product = unitary.compose(adjoint);
      const matrix = product.toMatrix();
      
      // Should be approximately identity
      expect(matrix[0][0].re).toBeCloseTo(1);
      expect(matrix[0][0].im).toBeCloseTo(0);
      expect(matrix[1][1].re).toBeCloseTo(1);
      expect(matrix[1][1].im).toBeCloseTo(0);
      expect(matrix[0][1].re).toBeCloseTo(0);
      expect(matrix[0][1].im).toBeCloseTo(0);
      expect(matrix[1][0].re).toBeCloseTo(0);
      expect(matrix[1][0].im).toBeCloseTo(0);
    });
  });

  describe('projectionOperator', () => {
    it('creates projection operator from state', () => {
      // Create |0⟩ state
      const state = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      
      // Create projection operator |0⟩⟨0|
      const projection = projectionOperator(state);
      const matrix = projection.toMatrix();
      
      // Should be |0⟩⟨0|
      expect(matrix[0][0].re).toBeCloseTo(1);
      expect(matrix[0][0].im).toBeCloseTo(0);
      expect(matrix[0][1].re).toBeCloseTo(0);
      expect(matrix[0][1].im).toBeCloseTo(0);
      expect(matrix[1][0].re).toBeCloseTo(0);
      expect(matrix[1][0].im).toBeCloseTo(0);
      expect(matrix[1][1].re).toBeCloseTo(0);
      expect(matrix[1][1].im).toBeCloseTo(0);
      
      // A projection operator should satisfy P² = P
      const squared = projection.compose(projection);
      const squaredMatrix = squared.toMatrix();
      
      expect(squaredMatrix[0][0].re).toBeCloseTo(matrix[0][0].re);
      expect(squaredMatrix[0][1].re).toBeCloseTo(matrix[0][1].re);
      expect(squaredMatrix[1][0].re).toBeCloseTo(matrix[1][0].re);
      expect(squaredMatrix[1][1].re).toBeCloseTo(matrix[1][1].re);
    });
  });

  describe('BCHFormula', () => {
    it('approximates exp(A+B) when A and B commute', () => {
      // When A and B commute, BCH formula gives A + B
      const A = PauliZ;
      const B = MatrixOperator.identity(2);
      
      // A and B commute
      expect(operatorsCommute(A, B)).toBe(true);
      
      // First order BCH should be exact for commuting operators
      const result = BCHFormula(A, B, 1);
      
      // Check result against A + B
      const sum = A.add(B);
      const resultMatrix = result.toMatrix();
      const sumMatrix = sum.toMatrix();
      
      expect(resultMatrix[0][0].re).toBeCloseTo(sumMatrix[0][0].re);
      expect(resultMatrix[0][0].im).toBeCloseTo(sumMatrix[0][0].im);
      expect(resultMatrix[1][1].re).toBeCloseTo(sumMatrix[1][1].re);
      expect(resultMatrix[1][1].im).toBeCloseTo(sumMatrix[1][1].im);
    });
    
    it('includes commutator correction when A and B do not commute', () => {
      // When A and B don't commute, first order correction is [A,B]/2
      const A = PauliX.scale(math.complex(0.1,  0)); // small value for better approximation
      const B = PauliY.scale(math.complex(0.1,  0));
      
      // A and B don't commute
      expect(operatorsCommute(A, B)).toBe(false);
      
      // First order BCH should include correction
      const result = BCHFormula(A, B, 1);
      
      // Calculate A + B
      const sum = A.add(B);
      
      // Calculate [A,B]/2
      const comm = commutator(A, B).scale(math.complex(0.5,  0));
      
      // Expected: A + B + [A,B]/2
      const expected = sum.add(comm);
      
      const resultMatrix = result.toMatrix();
      const expectedMatrix = expected.toMatrix();
      
      // Compare matrices (approximately)
      expect(resultMatrix[0][0].re).toBeCloseTo(expectedMatrix[0][0].re);
      expect(resultMatrix[0][0].im).toBeCloseTo(expectedMatrix[0][0].im);
      expect(resultMatrix[0][1].re).toBeCloseTo(expectedMatrix[0][1].re);
      expect(resultMatrix[0][1].im).toBeCloseTo(expectedMatrix[0][1].im);
      expect(resultMatrix[1][0].re).toBeCloseTo(expectedMatrix[1][0].re);
      expect(resultMatrix[1][0].im).toBeCloseTo(expectedMatrix[1][0].im);
      expect(resultMatrix[1][1].re).toBeCloseTo(expectedMatrix[1][1].re);
      expect(resultMatrix[1][1].im).toBeCloseTo(expectedMatrix[1][1].im);
    });
  });
});
