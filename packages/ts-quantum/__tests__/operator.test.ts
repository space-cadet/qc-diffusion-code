/**
 * Tests for quantum operator implementation
 */

import { describe, it, expect } from 'vitest';

import { MatrixOperator } from '../src/operators/operator';
import { StateVector } from '../src/states/stateVector';
import * as math from 'mathjs';

// Helper function to create test matrices
function createTestMatrix(dim: number): MatrixOperator {
  const matrix = Array(dim).fill(null).map((_, i) => 
    Array(dim).fill(null).map((_, j) => 
      i === j ? math.complex(1,  0) : math.complex(0,  0)
    )
  );
  return new MatrixOperator(matrix);
}

describe('MatrixOperator', () => {
  describe('Constructor', () => {
    it('creates valid operator with identity matrix', () => {
      const op = createTestMatrix(2);
      expect(op.dimension).toBe(2);
      expect(op.type).toBe('general');
    });

    it('validates matrix dimensions', () => {
      expect(() => new MatrixOperator([])).toThrow();
      expect(() => new MatrixOperator([[math.complex(1,  0)], [math.complex(1,  0), math.complex(0,  0)]])).toThrow();
    });

    it('validates operator types', () => {
      const matrix = [[math.complex(1,  0), math.complex(0,  0)], [math.complex(0,  0), math.complex(1,  0)]];
      expect(() => new MatrixOperator(matrix, 'invalid' as any)).toThrow();
    });

    it('validates hermitian property', () => {
      // Non-Hermitian matrix:
      // [1    1-i]
      // [1-i   2]  // Note: for Hermitian, this should be [1+i  2]
      const nonHermitianMatrix = [
        [math.complex(1,  0), math.complex(1,  -1)],
        [math.complex(1,  -1), math.complex(2,  0)]  // Wrong conjugate
      ];
      expect(() => new MatrixOperator(nonHermitianMatrix, 'hermitian')).toThrow();

      // This is a valid Hermitian matrix for reference:
      // [1    1-i]
      // [1+i   2]
      const validHermitianMatrix = [
        [math.complex(1,  0), math.complex(1,  -1)],
        [math.complex(1,  1), math.complex(2,  0)]
      ];
      expect(() => new MatrixOperator(validHermitianMatrix, 'hermitian')).not.toThrow();
    });

    it('validates unitary property', () => {
      // Non-unitary matrix
      const nonUnitaryMatrix = [
        [math.complex(2,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(2,  0)]
      ];
      expect(() => new MatrixOperator(nonUnitaryMatrix, 'unitary')).toThrow();
    });

    it('validates projection property', () => {
      // Non-projection matrix
      const nonProjectionMatrix = [
        [math.complex(2,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(2,  0)]
      ];
      expect(() => new MatrixOperator(nonProjectionMatrix, 'projection')).toThrow();
    });
  });

  describe('Operator Methods', () => {
    describe('apply', () => {
      it('applies operator to state vector', () => {
        const op = createTestMatrix(2);
        const state = new StateVector(2, [math.complex(1,  0), math.complex(0,  0)]);
        const result = op.apply(state);
        
        expect(result.amplitudes[0]).toEqual(math.complex(1,  0));
        expect(result.amplitudes[1]).toEqual(math.complex(0,  0));
      });

      it('throws error for dimension mismatch', () => {
        const op = createTestMatrix(2);
        const state = new StateVector(3, [
          math.complex(1,  0),
          math.complex(0,  0),
          math.complex(0,  0)
        ]);
        expect(() => op.apply(state)).toThrow();
      });
    });

    describe('compose', () => {
      it('composes two operators', () => {
        const op1 = createTestMatrix(2);
        const op2 = createTestMatrix(2);
        const result = op1.compose(op2);
        
        expect(result.dimension).toBe(2);
        const matrix = result.toMatrix();
        expect(matrix[0][0]).toEqual(math.complex(1,  0));
        expect(matrix[1][1]).toEqual(math.complex(1,  0));
      });

      it('throws error for dimension mismatch', () => {
        const op1 = createTestMatrix(2);
        const op2 = createTestMatrix(3);
        expect(() => op1.compose(op2)).toThrow();
      });
    });

    describe('adjoint', () => {
      it('computes adjoint of operator', () => {
        const matrix = [
          [math.complex(1,  1), math.complex(0,  0)],
          [math.complex(0,  0), math.complex(1,  -1)]
        ];
        const op = new MatrixOperator(matrix);
        const adjoint = op.adjoint();
        const adjointMatrix = adjoint.toMatrix();
        
        expect(adjointMatrix[0][0]).toEqual(math.complex(1,  -1));
        expect(adjointMatrix[1][1]).toEqual(math.complex(1,  1));
      });
    });

    describe('tensorProduct', () => {
      it('computes tensor product of operators', () => {
        const op1 = createTestMatrix(2);
        const op2 = createTestMatrix(2);
        const result = op1.tensorProduct(op2);
        
        expect(result.dimension).toBe(4);
        const matrix = result.toMatrix();
        expect(matrix[0][0]).toEqual(math.complex(1,  0));
        expect(matrix[3][3]).toEqual(math.complex(1,  0));
      });
    });

    describe('scale', () => {
      it('scales operator by complex number', () => {
        const op = createTestMatrix(2);
        const scalar = math.complex(2,  0);
        const scaled = op.scale(scalar);
        const matrix = scaled.toMatrix();
        
        expect(matrix[0][0]).toEqual(math.complex(2,  0));
        expect(matrix[1][1]).toEqual(math.complex(2,  0));
      });
    });

    describe('add', () => {
      it('adds two operators', () => {
        const op1 = createTestMatrix(2);
        const op2 = createTestMatrix(2);
        const sum = op1.add(op2);
        const matrix = sum.toMatrix();
        
        expect(matrix[0][0]).toEqual(math.complex(2,  0));
        expect(matrix[1][1]).toEqual(math.complex(2,  0));
      });

      it('throws error for dimension mismatch', () => {
        const op1 = createTestMatrix(2);
        const op2 = createTestMatrix(3);
        expect(() => op1.add(op2)).toThrow();
      });
    });

    describe('partialTrace', () => {
      it('computes partial trace for 2-qubit system', () => {
        const op = createTestMatrix(4);
        const result = op.partialTrace([2, 2], [1]);
        
        expect(result.dimension).toBe(2);
      });

      it('throws error for invalid dimensions', () => {
        const op = createTestMatrix(4);
        expect(() => op.partialTrace([3, 2], [1])).toThrow();
      });

      it('throws error for invalid trace indices', () => {
        const op = createTestMatrix(4);
        expect(() => op.partialTrace([2, 2], [2])).toThrow();
      });
    });
  });

  describe('Static Methods', () => {
    describe('identity', () => {
      it('creates identity operator', () => {
        const identity = MatrixOperator.identity(2);
        const matrix = identity.toMatrix();
        
        expect(matrix[0][0]).toEqual(math.complex(1,  0));
        expect(matrix[0][1]).toEqual(math.complex(0,  0));
        expect(matrix[1][0]).toEqual(math.complex(0,  0));
        expect(matrix[1][1]).toEqual(math.complex(1,  0));
      });
    });

    describe('zero', () => {
      it('creates zero operator', () => {
        const zero = MatrixOperator.zero(2);
        const matrix = zero.toMatrix();
        
        expect(matrix[0][0]).toEqual(math.complex(0,  0));
        expect(matrix[0][1]).toEqual(math.complex(0,  0));
        expect(matrix[1][0]).toEqual(math.complex(0,  0));
        expect(matrix[1][1]).toEqual(math.complex(0,  0));
      });
    });
  });
});