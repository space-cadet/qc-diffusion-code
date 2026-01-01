/**
 * Sparse matrix utilities for quantum operators
 */

import * as math from 'mathjs';
import { Complex } from 'mathjs';
import { ISparseMatrix, ISparseEntry } from '../core/types';

export { ISparseMatrix, ISparseEntry };

/**
 * Create an empty sparse matrix
 */
export function createSparseMatrix(rows: number, cols: number): ISparseMatrix {
  return {
    rows,
    cols,
    entries: [],
    nnz: 0
  };
}

/**
 * Add entry to sparse matrix
 */
export function setSparseEntry(matrix: ISparseMatrix, row: number, col: number, value: Complex): void {
  // Remove existing entry if present
  const existingIndex = matrix.entries.findIndex(entry => entry.row === row && entry.col === col);
  if (existingIndex !== -1) {
    matrix.entries.splice(existingIndex, 1);
    matrix.nnz--;
  }

  // Add new entry if non-zero
  if (!isZeroComplex(value)) {
    matrix.entries.push({ row, col, value });
    matrix.nnz++;
  }
}

/**
 * Get entry from sparse matrix
 */
export function getSparseEntry(matrix: ISparseMatrix, row: number, col: number): Complex {
  const entry = matrix.entries.find(e => e.row === row && e.col === col);
  return entry ? entry.value : math.complex(0, 0);
}

/**
 * Multiply sparse matrix by dense vector
 */
export function sparseVectorMultiply(matrix: ISparseMatrix, vector: Complex[]): Complex[] {
  if (matrix.cols !== vector.length) {
    throw new Error(`Matrix columns (${matrix.cols}) must match vector length (${vector.length})`);
  }

  const result: Complex[] = Array.from(
    { length: matrix.rows }, 
    () => math.complex(0, 0)
  );
  
  for (const entry of matrix.entries) {
    const product = math.multiply(entry.value, vector[entry.col]);
    if (typeof product !== 'object' || !('re' in product) || !('im' in product)) {
      throw new Error('Invalid complex multiplication result');
    }
    result[entry.row] = math.add(result[entry.row], product) as Complex;
  }

  return result;
}

/**
 * Multiply two sparse matrices
 */
export function sparseMatrixMultiply(a: ISparseMatrix, b: ISparseMatrix): ISparseMatrix {
  if (a.cols !== b.rows) {
    throw new Error(`Matrix A columns (${a.cols}) must match matrix B rows (${b.rows})`);
  }

  const result = createSparseMatrix(a.rows, b.cols);
  
  // Create column index for matrix B for efficient access
  const bCols: { [col: number]: ISparseEntry[] } = {};
  for (const entry of b.entries) {
    if (!bCols[entry.row]) {
      bCols[entry.row] = [];
    }
    bCols[entry.row].push(entry);
  }

  // Multiply
  for (const aEntry of a.entries) {
    const bCol = bCols[aEntry.col];
    if (bCol) {
      for (const bEntry of bCol) {
        const row = aEntry.row;
        const col = bEntry.col;
        const product = math.multiply(aEntry.value, bEntry.value) as Complex;
        
        const existing = getSparseEntry(result, row, col);
        const sum = math.add(existing, product) as Complex;
        setSparseEntry(result, row, col, sum);
      }
    }
  }

  return result;
}

/**
 * Convert sparse matrix to dense
 */
export function sparseToDense(matrix: ISparseMatrix): Complex[][] {
  const dense: Complex[][] = Array.from(
    { length: matrix.rows },
    () => Array.from(
      { length: matrix.cols },
      () => math.complex(0, 0)
    )
  );

  for (const entry of matrix.entries) {
    dense[entry.row][entry.col] = entry.value;
  }

  return dense;
}

/**
 * Convert dense matrix to sparse
 */
export function denseToSparse(dense: Complex[][]): ISparseMatrix {
  if (dense.length === 0) {
    return createSparseMatrix(0, 0);
  }

  const rows = dense.length;
  const cols = dense[0].length;

  // Validate matrix is rectangular
  if (!dense.every(row => row.length === cols)) {
    throw new Error('Input matrix must be rectangular (all rows must have same length)');
  }

  const matrix = createSparseMatrix(rows, cols);

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!isZeroComplex(dense[i][j])) {
        setSparseEntry(matrix, i, j, dense[i][j]);
      }
    }
  }

  return matrix;
}

/**
 * Transpose sparse matrix
 */
export function sparseTranspose(matrix: ISparseMatrix): ISparseMatrix {
  const result = createSparseMatrix(matrix.cols, matrix.rows);
  
  for (const entry of matrix.entries) {
    setSparseEntry(result, entry.col, entry.row, entry.value);
  }

  return result;
}

/**
 * Conjugate transpose sparse matrix
 */
export function sparseConjugateTranspose(matrix: ISparseMatrix): ISparseMatrix {
  const result = createSparseMatrix(matrix.cols, matrix.rows);
  
  for (const entry of matrix.entries) {
    const conjugate = math.conj(entry.value) as Complex;
    setSparseEntry(result, entry.col, entry.row, conjugate);
  }

  return result;
}

/**
 * Calculate trace of sparse matrix
 */
export function sparseTrace(matrix: ISparseMatrix): Complex {
  if (matrix.rows !== matrix.cols) {
    throw new Error('Trace requires square matrix');
  }

  let trace = math.complex(0, 0);
  for (const entry of matrix.entries) {
    if (entry.row === entry.col) {
      trace = math.add(trace, entry.value) as Complex;
    }
  }

  return trace;
}

/**
 * Calculate Frobenius norm of sparse matrix
 */
export function sparseNorm(matrix: ISparseMatrix): number {
  let sum = 0;
  for (const entry of matrix.entries) {
    const magnitude = Number(math.abs(entry.value));
    sum += magnitude * magnitude;
  }
  return Math.sqrt(sum);
}

/**
 * Check if matrix is identity
 */
export function isIdentityMatrix(matrix: ISparseMatrix, tolerance: number = 1e-12): boolean {
  if (matrix.rows !== matrix.cols) {
    return false;
  }

  const n = matrix.rows;
  
  // Check if we have exactly n entries (diagonal)
  if (matrix.nnz !== n) {
    return false;
  }

  // Check each entry is on diagonal and equals 1
  for (const entry of matrix.entries) {
    if (entry.row !== entry.col) {
      return false;
    }
    const realPart = Number(entry.value.re);
    const imagPart = Number(entry.value.im);
    if (Math.abs(realPart - 1) > tolerance || Math.abs(imagPart) > tolerance) {
      return false;
    }
  }

  return true;
}

/**
 * Check if matrix is diagonal
 */
export function isSparseDiagonalMatrix(matrix: ISparseMatrix): boolean {
  for (const entry of matrix.entries) {
    if (entry.row !== entry.col) {
      return false;
    }
  }
  return true;
}

/**
 * Extract diagonal entries from sparse matrix
 */
export function extractDiagonalEntries(matrix: ISparseMatrix): Complex[] {
  const diagonal = new Array(Math.min(matrix.rows, matrix.cols)).fill(0).map(() => math.complex(0, 0));
  
  for (const entry of matrix.entries) {
    if (entry.row === entry.col) {
      diagonal[entry.row] = entry.value;
    }
  }

  return diagonal;
}

/**
 * Validate sparse matrix structure
 */
export function validateSparseMatrix(matrix: ISparseMatrix): boolean {
  // Check dimensions
  if (matrix.rows <= 0 || matrix.cols <= 0) {
    return false;
  }

  // Check entries are within bounds
  for (const entry of matrix.entries) {
    if (entry.row < 0 || entry.row >= matrix.rows || 
        entry.col < 0 || entry.col >= matrix.cols) {
      return false;
    }
  }

  // Check nnz matches entries length
  return matrix.nnz === matrix.entries.length;
}

/**
 * Remove entries that are effectively zero
 */
export function removeSparseZeros(matrix: ISparseMatrix, tolerance: number = 1e-12): void {
  matrix.entries = matrix.entries.filter(entry => !isZeroComplex(entry.value, tolerance));
  matrix.nnz = matrix.entries.length;
}

/**
 * Check if complex number is effectively zero
 */
function isZeroComplex(value: Complex, tolerance: number = 1e-12): boolean {
  if (typeof value !== 'object' || !('re' in value) || !('im' in value)) {
    throw new Error('Invalid complex number');
  }
  return Math.abs(value.re) < tolerance && Math.abs(value.im) < tolerance;
}
