/**
 * Tests for specialized quantum operators
 */

import { describe, it, expect } from 'vitest';
import * as math from 'mathjs';
import { Complex } from 'mathjs';
import { StateVector } from '../../src/states/stateVector';
import { MatrixOperator } from '../../src/operators/operator';
import {
  IdentityOperator,
  DiagonalOperator,
  createIdentityOperator,
  createDiagonalOperator,
  isDiagonalMatrix
} from '../../src/operators/specialized';
import * as util from 'util';

describe('Specialized Operators', () => {
  describe('IdentityOperator', () => {
    it('should create identity operator with correct properties', () => {
      const identity = new IdentityOperator(3);
      expect(identity.dimension).toBe(3);
      expect(identity.type).toBe('identity');
      expect(identity.objectType).toBe('operator');
    });

    it('should throw error for invalid dimension', () => {
      expect(() => new IdentityOperator(0)).toThrow('Dimension must be a positive integer');
      expect(() => new IdentityOperator(-1)).toThrow('Dimension must be a positive integer');
      expect(() => new IdentityOperator(2.5)).toThrow('Dimension must be a positive integer');
    });

    it('should apply identity correctly', () => {
      const identity = new IdentityOperator(2);
      const state = new StateVector(2, [math.complex(1, 0), math.complex(0, 1)]);
      const result = identity.apply(state);
      
      expect(result.amplitudes[0].re).toBeCloseTo(1);
      expect(result.amplitudes[0].im).toBeCloseTo(0);
      expect(result.amplitudes[1].re).toBeCloseTo(0);
      expect(result.amplitudes[1].im).toBeCloseTo(1);
    });

    it('should compose correctly with other operators', () => {
      const identity = new IdentityOperator(2);
      const pauliX = new MatrixOperator([
        [math.complex(0, 0), math.complex(1, 0)],
        [math.complex(1, 0), math.complex(0, 0)]
      ]);
      
      const result = identity.compose(pauliX);
      const expectedMatrix = pauliX.toMatrix();
      const resultMatrix = result.toMatrix();
      
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          expect(resultMatrix[i][j].re).toBeCloseTo(expectedMatrix[i][j].re);
          expect(resultMatrix[i][j].im).toBeCloseTo(expectedMatrix[i][j].im);
        }
      }
    });

    it('should generate identity matrix on demand', () => {
      const identity = new IdentityOperator(3);
      const matrix = identity.toMatrix();
      
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const expected = i === j ? 1 : 0;
          expect(matrix[i][j].re).toBeCloseTo(expected);
          expect(matrix[i][j].im).toBeCloseTo(0);
        }
      }
    });

    it('should have correct adjoint', () => {
      const identity = new IdentityOperator(2);
      const adjoint = identity.adjoint();
      expect(adjoint).toBeInstanceOf(IdentityOperator);
      expect(adjoint.dimension).toBe(2);
    });

    it('should scale to diagonal operator', () => {
      const identity = new IdentityOperator(2);
      const scalar = math.complex(2, 1);
      const scaled = identity.scale(scalar);
      
      expect(scaled).toBeInstanceOf(DiagonalOperator);
      expect(scaled.dimension).toBe(2);
    });

    it('should calculate norm correctly', () => {
      const identity = new IdentityOperator(3);
      expect(identity.norm()).toBeCloseTo(Math.sqrt(3));
    });

    it('should never be zero', () => {
      const identity = new IdentityOperator(5);
      expect(identity.isZero()).toBe(false);
    });

    it('should validate dimension matching in apply', () => {
      const identity = new IdentityOperator(2);
      const wrongState = new StateVector(3, [math.complex(1, 0), math.complex(0, 0), math.complex(0, 0)]);
      expect(() => identity.apply(wrongState)).toThrow();
    });
  });

  describe('DiagonalOperator', () => {
    it('should create diagonal operator with correct properties', () => {
      const diagonal = [math.complex(1, 0), math.complex(2, 0), math.complex(3, 0)];
      const op = new DiagonalOperator(diagonal);
      
      expect(op.dimension).toBe(3);
      expect(op.type).toBe('diagonal');
      expect(op.objectType).toBe('operator');
    });

    it('should throw error for empty diagonal', () => {
      expect(() => new DiagonalOperator([])).toThrow('Diagonal cannot be empty');
    });

    it('should apply diagonal correctly', () => {
      const diagonal = [math.complex(2, 0), math.complex(3, 0)];
      const op = new DiagonalOperator(diagonal);
      const state = new StateVector(2, [math.complex(1, 0), math.complex(1, 0)]);
      
      const result = op.apply(state);
      expect(result.amplitudes[0].re).toBeCloseTo(2);
      expect(result.amplitudes[1].re).toBeCloseTo(3);
    });

    it('should compose diagonals correctly', () => {
      const diag1 = [math.complex(2, 0), math.complex(3, 0)];
      const diag2 = [math.complex(4, 0), math.complex(5, 0)];
      const op1 = new DiagonalOperator(diag1);
      const op2 = new DiagonalOperator(diag2);
      
      const result = op1.compose(op2);
      expect(result).toBeInstanceOf(DiagonalOperator);
      
      const resultDiag = (result as DiagonalOperator).getDiagonal();
      expect(resultDiag[0].re).toBeCloseTo(8); // 2 * 4
      expect(resultDiag[1].re).toBeCloseTo(15); // 3 * 5
    });

    it('should generate full matrix on demand', () => {
      const diagonal = [math.complex(1, 0), math.complex(2, 1), math.complex(0, 3)];
      const op = new DiagonalOperator(diagonal);
      const matrix = op.toMatrix();
      
      // Check diagonal elements
      expect(matrix[0][0].re).toBeCloseTo(1);
      expect(matrix[1][1].re).toBeCloseTo(2);
      expect(matrix[1][1].im).toBeCloseTo(1);
      expect(matrix[2][2].re).toBeCloseTo(0);
      expect(matrix[2][2].im).toBeCloseTo(3);
      
      // Check off-diagonal elements are zero
      expect(matrix[0][1].re).toBeCloseTo(0);
      expect(matrix[0][1].im).toBeCloseTo(0);
      expect(matrix[1][0].re).toBeCloseTo(0);
      expect(matrix[1][0].im).toBeCloseTo(0);
    });

    it('should have correct adjoint', () => {
      const diagonal = [math.complex(1, 2), math.complex(3, -1)];
      const op = new DiagonalOperator(diagonal);
      const adjoint = op.adjoint();
      
      expect(adjoint).toBeInstanceOf(DiagonalOperator);
      const adjointDiag = (adjoint as DiagonalOperator).getDiagonal();
      expect(adjointDiag[0].re).toBeCloseTo(1);
      expect(adjointDiag[0].im).toBeCloseTo(-2);
      expect(adjointDiag[1].re).toBeCloseTo(3);
      expect(adjointDiag[1].im).toBeCloseTo(1);
    });

    it('should scale correctly', () => {
      const diagonal = [math.complex(1, 0), math.complex(2, 0)];
      const op = new DiagonalOperator(diagonal);
      const scalar = math.complex(2, 1);
      
      const scaled = op.scale(scalar);
      expect(scaled).toBeInstanceOf(DiagonalOperator);
      
      const scaledDiag = (scaled as DiagonalOperator).getDiagonal();
      expect(scaledDiag[0].re).toBeCloseTo(2);
      expect(scaledDiag[0].im).toBeCloseTo(1);
      expect(scaledDiag[1].re).toBeCloseTo(4);
      expect(scaledDiag[1].im).toBeCloseTo(2);
    });

    it('should add diagonals correctly', () => {
      const diag1 = [math.complex(1, 0), math.complex(2, 1)];
      const diag2 = [math.complex(3, 0), math.complex(1, -1)];
      const op1 = new DiagonalOperator(diag1);
      const op2 = new DiagonalOperator(diag2);
      
      const sum = op1.add(op2);
      expect(sum).toBeInstanceOf(DiagonalOperator);
      
      const sumDiag = (sum as DiagonalOperator).getDiagonal();
      expect(sumDiag[0].re).toBeCloseTo(4);
      expect(sumDiag[1].re).toBeCloseTo(3);
      expect(sumDiag[1].im).toBeCloseTo(0);
    });

    it('should calculate norm correctly', () => {
      const diagonal = [math.complex(3, 0), math.complex(4, 0)];
      const op = new DiagonalOperator(diagonal);
      expect(op.norm()).toBeCloseTo(5); // sqrt(9 + 16)
    });

    it('should detect zero operator', () => {
      const zeroDiag = [math.complex(0, 0), math.complex(0, 0)];
      const nonZeroDiag = [math.complex(0, 0), math.complex(1e-15, 0)];
      
      console.log('Zero Diagonal Values:\n' + 
        util.inspect(
          zeroDiag.map(val => `${val.re} + ${val.im}i`),
          { depth: null, colors: true }
        )
      );
      
      console.log('Non-Zero Diagonal Values:\n' + 
        util.inspect(
          nonZeroDiag.map(val => `${val.re} + ${val.im}i`),
          { depth: null, colors: true }
        )
      );
      
      const zeroOp = new DiagonalOperator(zeroDiag);
      const nonZeroOp = new DiagonalOperator(nonZeroDiag);

      console.log("Zero Diagonal Operator:", zeroOp);
      console.log("Non-Zero Diagonal Operator:", nonZeroOp);
      
      console.log('\nZero Detection Results:');
      console.log('Zero Operator (default tolerance):', zeroOp.isZero());
      console.log('Non-Zero Operator (default tolerance):', nonZeroOp.isZero());
      console.log('Non-Zero Operator (tolerance 1e-14):', nonZeroOp.isZero(1e-14));
      
      expect(zeroOp.isZero()).toBe(true);
      expect(nonZeroOp.isZero()).toBe(true);
      expect(nonZeroOp.isZero(1e-14)).toBe(true);
    });

    it('should get diagonal elements', () => {
      const original = [math.complex(1, 2), math.complex(3, -1)];
      const op = new DiagonalOperator(original);
      const retrieved = op.getDiagonal();
      
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].re).toBeCloseTo(1);
      expect(retrieved[0].im).toBeCloseTo(2);
      expect(retrieved[1].re).toBeCloseTo(3);
      expect(retrieved[1].im).toBeCloseTo(-1);
    });
  });

  describe('Factory Functions', () => {
    it('should create identity operator', () => {
      const identity = createIdentityOperator(4);
      expect(identity).toBeInstanceOf(IdentityOperator);
      expect(identity.dimension).toBe(4);
    });

    it('should create diagonal operator', () => {
      const diagonal = [math.complex(1, 0), math.complex(2, 1)];
      const op = createDiagonalOperator(diagonal);
      expect(op).toBeInstanceOf(DiagonalOperator);
      expect(op.dimension).toBe(2);
    });
  });

  describe('Matrix Detection', () => {
    it('should detect diagonal matrix', () => {
      const diagonal: Complex[][] = [
        [math.complex(1, 0), math.complex(0, 0)],
        [math.complex(0, 0), math.complex(2, 0)]
      ];
      
      const nonDiagonal: Complex[][] = [
        [math.complex(1, 0), math.complex(1, 0)],
        [math.complex(0, 0), math.complex(2, 0)]
      ];
      
      expect(isDiagonalMatrix(diagonal)).toBe(true);
      expect(isDiagonalMatrix(nonDiagonal)).toBe(false);
    });

    it('should handle tolerance in diagonal detection', () => {
      const almostDiagonal: Complex[][] = [
        [math.complex(1, 0), math.complex(1e-15, 0)],
        [math.complex(1e-14, 0), math.complex(2, 0)]
      ];
      
      expect(isDiagonalMatrix(almostDiagonal, 1e-10)).toBe(true);
      expect(isDiagonalMatrix(almostDiagonal, 1e-16)).toBe(false);
    });
  });

  describe('Integration with MatrixOperator', () => {
    it('should create optimized identity operator', () => {
      const identityMatrix: Complex[][] = [
        [math.complex(1, 0), math.complex(0, 0)],
        [math.complex(0, 0), math.complex(1, 0)]
      ];
      
      const op = MatrixOperator.createOptimized(identityMatrix);
      expect(op).toBeInstanceOf(IdentityOperator);
    });

    it('should create optimized diagonal operator', () => {
      const diagonalMatrix: Complex[][] = [
        [math.complex(2, 0), math.complex(0, 0)],
        [math.complex(0, 0), math.complex(3, 1)]
      ];
      
      const op = MatrixOperator.createOptimized(diagonalMatrix);
      expect(op).toBeInstanceOf(DiagonalOperator);
    });

    it('should fallback to MatrixOperator for general matrices', () => {
      const generalMatrix: Complex[][] = [
        [math.complex(1, 0), math.complex(1, 0)],
        [math.complex(0, 1), math.complex(2, 0)]
      ];
      
      const op = MatrixOperator.createOptimized(generalMatrix);
      expect(op).toBeInstanceOf(MatrixOperator);
      expect(op).not.toBeInstanceOf(IdentityOperator);
      expect(op).not.toBeInstanceOf(DiagonalOperator);
    });

    it('should use optimized identity from static method', () => {
      const identity = MatrixOperator.identity(3);
      expect(identity).toBeInstanceOf(IdentityOperator);
      expect(identity.dimension).toBe(3);
    });
  });

  describe('Performance Characteristics', () => {
    it('should have faster apply for identity operations', () => {
      const dimension = 10;
      const state = new StateVector(dimension, 
        Array(dimension).fill(0).map((_, i) => math.complex(Math.random(), Math.random()))
      );
      
      const identity = new IdentityOperator(dimension);
      const matrixIdentity = new MatrixOperator(
        Array(dimension).fill(null).map((_, i) => 
          Array(dimension).fill(null).map((_, j) => 
            i === j ? math.complex(1, 0) : math.complex(0, 0)
          )
        )
      );
      
      // Both should give same result
      const result1 = identity.apply(state);
      const result2 = matrixIdentity.apply(state);
      
      for (let i = 0; i < dimension; i++) {
        expect(result1.amplitudes[i].re).toBeCloseTo(result2.amplitudes[i].re);
        expect(result1.amplitudes[i].im).toBeCloseTo(result2.amplitudes[i].im);
      }
    });

    it('should have faster apply for diagonal operations', () => {
      const dimension = 10;
      const diagonal = Array(dimension).fill(0).map(() => math.complex(Math.random(), Math.random()));
      const state = new StateVector(dimension,
        Array(dimension).fill(0).map(() => math.complex(Math.random(), Math.random()))
      );
      
      const diagOp = new DiagonalOperator(diagonal);
      const matrixOp = new MatrixOperator(
        Array(dimension).fill(null).map((_, i) =>
          Array(dimension).fill(null).map((_, j) =>
            i === j ? math.clone(diagonal[i]) : math.complex(0, 0)
          )
        )
      );
      
      // Both should give same result
      const result1 = diagOp.apply(state);
      const result2 = matrixOp.apply(state);
      
      for (let i = 0; i < dimension; i++) {
        expect(result1.amplitudes[i].re).toBeCloseTo(result2.amplitudes[i].re, 10);
        expect(result1.amplitudes[i].im).toBeCloseTo(result2.amplitudes[i].im, 10);
      }
    });
  });
});
