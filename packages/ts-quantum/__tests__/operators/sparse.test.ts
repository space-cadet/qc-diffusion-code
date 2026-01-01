/**
 * Tests for sparse matrix utilities
 */

import { describe, it, expect } from 'vitest';
import * as math from 'mathjs';
import * as util from 'util';
import { Complex } from 'mathjs';
import {
  createSparseMatrix,
  setSparseEntry,
  getSparseEntry,
  sparseVectorMultiply,
  sparseMatrixMultiply,
  sparseToDense,
  denseToSparse,
  sparseTranspose,
  sparseConjugateTranspose,
  sparseTrace,
  sparseNorm,
  isIdentityMatrix,
  isSparseDiagonalMatrix,
  extractDiagonalEntries,
  validateSparseMatrix,
  removeSparseZeros,
} from '../../src/operators/sparse';

describe('Sparse Matrix Utilities', () => {
  const tolerance = 1e-12;

  describe('Basic Operations', () => {
    it('should create empty sparse matrix', () => {
      const matrix = createSparseMatrix(3, 4);
      expect(matrix.rows).toBe(3);
      expect(matrix.cols).toBe(4);
      expect(matrix.entries).toHaveLength(0);
      expect(matrix.nnz).toBe(0);
    });

    it('should set and get sparse entries', () => {
      const matrix = createSparseMatrix(3, 3);
      const value = math.complex(2, 1);
      
      setSparseEntry(matrix, 1, 2, value);
      expect(matrix.nnz).toBe(1);
      
      const retrieved = getSparseEntry(matrix, 1, 2);
      expect(retrieved.re).toBeCloseTo(2);
      expect(retrieved.im).toBeCloseTo(1);
      
      const zero = getSparseEntry(matrix, 0, 0);
      expect(zero.re).toBe(0);
      expect(zero.im).toBe(0);
    });

    it('should overwrite existing entries', () => {
      const matrix = createSparseMatrix(2, 2);
      
      setSparseEntry(matrix, 0, 0, math.complex(1, 0));
      setSparseEntry(matrix, 0, 0, math.complex(2, 0));
      
      expect(matrix.nnz).toBe(1);
      const value = getSparseEntry(matrix, 0, 0);
      expect(value.re).toBe(2);
    });
  });

  describe('Matrix-Vector Operations', () => {
    it('should multiply sparse matrix by vector', () => {
      const matrix = createSparseMatrix(2, 2);
      setSparseEntry(matrix, 0, 0, math.complex(1, 0));
      setSparseEntry(matrix, 1, 1, math.complex(2, 0));
      
      const vector = [math.complex(3, 0), math.complex(4, 0)];
      const result = sparseVectorMultiply(matrix, vector);
      
      expect(result[0].re).toBe(3);
      expect(result[1].re).toBe(8);
    });

    it('should handle complex multiplication', () => {
      const matrix = createSparseMatrix(2, 2);
      setSparseEntry(matrix, 0, 0, math.complex(1, 1));
      setSparseEntry(matrix, 1, 0, math.complex(0, 1));
      
      const vector = [math.complex(1, 0), math.complex(0, 0)];
      const result = sparseVectorMultiply(matrix, vector);
      
      expect(result[0].re).toBe(1);
      expect(result[0].im).toBe(1);
      expect(result[1].re).toBe(0);
      expect(result[1].im).toBe(1);
    });
  });

  describe('Matrix-Matrix Operations', () => {
    it('should multiply sparse matrices', () => {
      const a = createSparseMatrix(2, 2);
      setSparseEntry(a, 0, 0, math.complex(1, 0));
      setSparseEntry(a, 1, 1, math.complex(2, 0));
      
      const b = createSparseMatrix(2, 2);
      setSparseEntry(b, 0, 0, math.complex(3, 0));
      setSparseEntry(b, 1, 1, math.complex(4, 0));
      
      console.log('Matrix A:\n' + 
        util.inspect({
          entries: a.entries.map(e => ({
            row: e.row,
            col: e.col,
            value: `${e.value.re} + ${e.value.im}i`
          })),
          nnz: a.nnz
        }, { depth: null, colors: true })
      );
      
      console.log('Matrix B:\n' + 
        util.inspect({
          entries: b.entries.map(e => ({
            row: e.row,
            col: e.col,
            value: `${e.value.re} + ${e.value.im}i`
          })),
          nnz: b.nnz
        }, { depth: null, colors: true })
      );
      
      const result = sparseMatrixMultiply(a, b);
      
      console.log('Result Matrix:\n' + 
        util.inspect({
          entries: result.entries.map(e => ({
            row: e.row,
            col: e.col,
            value: `${e.value.re} + ${e.value.im}i`
          })),
          nnz: result.nnz
        }, { depth: null, colors: true })
      );
      
      expect(getSparseEntry(result, 0, 0).re).toBe(3);
      expect(getSparseEntry(result, 1, 1).re).toBe(8);
      expect(result.nnz).toBe(2);
    });
  });

  describe('Conversion Operations', () => {
    it('should convert sparse to dense', () => {
      const matrix = createSparseMatrix(2, 2);
      setSparseEntry(matrix, 0, 1, math.complex(3, 0));
      setSparseEntry(matrix, 1, 0, math.complex(4, 0));
      
      console.log('Sparse Matrix:\n' + 
        util.inspect({
          entries: matrix.entries.map(e => ({
            row: e.row,
            col: e.col,
            value: `${e.value.re} + ${e.value.im}i`
          })),
          nnz: matrix.nnz
        }, { depth: null, colors: true })
      );
      
      const dense = sparseToDense(matrix);
      
      console.log('Dense Matrix:\n' + 
        util.inspect(
          dense.map(row => 
            row.map(val => `${val.re} + ${val.im}i`)
          ),
          { depth: null, colors: true }
        )
      );
      
      expect(dense[0][1].re).toBe(3);
      expect(dense[1][0].re).toBe(4);
      expect(dense[0][0].re).toBe(0);
      expect(dense[1][1].re).toBe(0);
    });

    it('should convert dense to sparse', () => {
      const dense: Complex[][] = [
        [math.complex(0, 0), math.complex(3, 0)],
        [math.complex(4, 0), math.complex(0, 0)]
      ];
      
      const sparse = denseToSparse(dense);
      
      expect(sparse.nnz).toBe(2);
      expect(getSparseEntry(sparse, 0, 1).re).toBe(3);
      expect(getSparseEntry(sparse, 1, 0).re).toBe(4);
    });
  });

  describe('Matrix Transformations', () => {
    it('should transpose sparse matrix', () => {
      const matrix = createSparseMatrix(2, 3);
      setSparseEntry(matrix, 0, 1, math.complex(5, 0));
      setSparseEntry(matrix, 1, 2, math.complex(6, 0));
      
      const transposed = sparseTranspose(matrix);
      
      expect(transposed.rows).toBe(3);
      expect(transposed.cols).toBe(2);
      expect(getSparseEntry(transposed, 1, 0).re).toBe(5);
      expect(getSparseEntry(transposed, 2, 1).re).toBe(6);
    });

    it('should conjugate transpose sparse matrix', () => {
      const matrix = createSparseMatrix(2, 2);
      setSparseEntry(matrix, 0, 1, math.complex(1, 2));
      
      const conjugateTransposed = sparseConjugateTranspose(matrix);
      
      const value = getSparseEntry(conjugateTransposed, 1, 0);
      expect(value.re).toBe(1);
      expect(value.im).toBe(-2);
    });
  });

  describe('Matrix Properties', () => {
    it('should calculate trace', () => {
      const matrix = createSparseMatrix(3, 3);
      setSparseEntry(matrix, 0, 0, math.complex(1, 0));
      setSparseEntry(matrix, 1, 1, math.complex(2, 0));
      setSparseEntry(matrix, 2, 2, math.complex(3, 0));
      setSparseEntry(matrix, 0, 1, math.complex(4, 0)); // off-diagonal
      
      const trace = sparseTrace(matrix);
      expect(trace.re).toBe(6);
      expect(trace.im).toBe(0);
    });

    it('should calculate norm', () => {
      const matrix = createSparseMatrix(2, 2);
      setSparseEntry(matrix, 0, 0, math.complex(3, 0));
      setSparseEntry(matrix, 1, 1, math.complex(4, 0));
      
      const norm = sparseNorm(matrix);
      expect(norm).toBeCloseTo(5); // sqrt(9 + 16)
    });

    it('should identify identity matrix', () => {
      const identity = createSparseMatrix(3, 3);
      setSparseEntry(identity, 0, 0, math.complex(1, 0));
      setSparseEntry(identity, 1, 1, math.complex(1, 0));
      setSparseEntry(identity, 2, 2, math.complex(1, 0));
      
      console.log('Identity Matrix:\n' + 
        util.inspect({
          entries: identity.entries.map(e => ({
            row: e.row,
            col: e.col,
            value: `${e.value.re} + ${e.value.im}i`
          })),
          nnz: identity.nnz
        }, { depth: null, colors: true })
      );
      
      expect(isIdentityMatrix(identity)).toBe(true);
      
      setSparseEntry(identity, 0, 1, math.complex(0.1, 0));
      
      console.log('Non-Identity Matrix:\n' + 
        util.inspect({
          entries: identity.entries.map(e => ({
            row: e.row,
            col: e.col,
            value: `${e.value.re} + ${e.value.im}i`
          })),
          nnz: identity.nnz
        }, { depth: null, colors: true })
      );
      
      expect(isIdentityMatrix(identity)).toBe(false);
    });

    it('should identify diagonal matrix', () => {
      const diagonal = createSparseMatrix(3, 3);
      setSparseEntry(diagonal, 0, 0, math.complex(1, 0));
      setSparseEntry(diagonal, 2, 2, math.complex(3, 0));
      
      expect(isSparseDiagonalMatrix(diagonal)).toBe(true);
      
      setSparseEntry(diagonal, 0, 1, math.complex(1, 0));
      expect(isSparseDiagonalMatrix(diagonal)).toBe(false);
    });

    it('should extract diagonal entries', () => {
      const matrix = createSparseMatrix(3, 3);
      setSparseEntry(matrix, 0, 0, math.complex(1, 0));
      setSparseEntry(matrix, 1, 1, math.complex(2, 0));
      setSparseEntry(matrix, 0, 2, math.complex(99, 0)); // off-diagonal
      
      const diagonal = extractDiagonalEntries(matrix);
      
      expect(diagonal[0].re).toBe(1);
      expect(diagonal[1].re).toBe(2);
      expect(diagonal[2].re).toBe(0); // missing diagonal entry
    });
  });

  describe('Validation and Cleanup', () => {
    it('should validate sparse matrix', () => {
      const valid = createSparseMatrix(2, 2);
      setSparseEntry(valid, 0, 0, math.complex(1, 0));
      expect(validateSparseMatrix(valid)).toBe(true);
      
      // Invalid dimensions
      const invalid = createSparseMatrix(0, 2);
      expect(validateSparseMatrix(invalid)).toBe(false);
    });

    it('should remove zero entries', () => {
      const matrix = createSparseMatrix(2, 2);
      setSparseEntry(matrix, 0, 0, math.complex(1, 0));
      setSparseEntry(matrix, 0, 1, math.complex(1e-15, 0)); // effectively zero
      setSparseEntry(matrix, 1, 1, math.complex(2, 0));
      
      console.log('Matrix before removing zeros:\n' + 
        util.inspect({
          entries: matrix.entries.map(e => ({
            row: e.row,
            col: e.col,
            value: `${e.value.re} + ${e.value.im}i`
          })),
          nnz: matrix.nnz
        }, { depth: null, colors: true })
      );
      
      expect(matrix.nnz).toBe(2);
      
      removeSparseZeros(matrix);
      
      console.log('Matrix after removing zeros:\n' + 
        util.inspect({
          entries: matrix.entries.map(e => ({
            row: e.row,
            col: e.col,
            value: `${e.value.re} + ${e.value.im}i`
          })),
          nnz: matrix.nnz
        }, { depth: null, colors: true })
      );
      
      expect(matrix.nnz).toBe(2);
      expect(getSparseEntry(matrix, 0, 1)).toEqual(math.complex(0, 0));
    });
  });
});
