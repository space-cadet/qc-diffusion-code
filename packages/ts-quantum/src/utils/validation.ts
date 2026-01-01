/**
 * Validation utilities for quantum operations
 */

import { Complex } from '../core/types';

/**
 * Validates that a dimension is positive and an integer
 * @throws Error if dimension is not positive or not an integer
 */
export function validatePosDim(dim: number): void {
  if (!Number.isInteger(dim)) {
    throw new Error(`Dimension must be an integer, got ${dim}`);
  }
  if (dim <= 0) {
    throw new Error(`Dimension must be positive, got ${dim}`);
  }
}

/**
 * Validates array index is within bounds
 * @throws Error if index is out of bounds
 */
export function validateIdx(idx: number, length: number): void {
  if (!Number.isInteger(idx)) {
    throw new Error(`Index must be an integer, got ${idx}`);
  }
  if (idx < 0 || idx >= length) {
    throw new Error(`Index ${idx} out of bounds [0, ${length})`);
  }
}

/**
 * Validates quantum state amplitudes
 * @throws Error if amplitudes are invalid
 */
export function validateAmps(
  amplitudes: Complex[], 
  dimension: number
): void {
  if (amplitudes.length !== dimension) {
    throw new Error('Number of amplitudes must match dimension');
  }

  // Check all elements are complex numbers
  for (let i = 0; i < amplitudes.length; i++) {
    const amp = amplitudes[i];
    if (typeof amp !== 'object' || 
        !('re' in amp) || 
        !('im' in amp) ||
        typeof amp.re !== 'number' ||
        typeof amp.im !== 'number' ||
        !isFinite(amp.re) ||
        !isFinite(amp.im)) {
      throw new Error(`Invalid complex number at index ${i}`);
    }
  }
}

/**
 * Validates normalization of quantum state amplitudes
 * @throws Error if not normalized
 */
export function validateNorm(
  amplitudes: Complex[],
  tolerance: number = 1e-10
): void {
  const normSquared = amplitudes.reduce((sum, amp) => 
    sum + amp.re * amp.re + amp.im * amp.im, 
    0
  );
  
  if (Math.abs(normSquared - 1) > tolerance) {
    throw new Error('State vector must be normalized');
  }
}

/**
 * Validates matching dimensions
 */
export function validateMatchDims(dim1: number, dim2: number): void {
  if (dim1 !== dim2) {
    throw new Error(`Dimension mismatch: ${dim1} !== ${dim2}`);
  }
}

/**
 * Validates parameters for partial trace operation
 */
export function validatePartialTrace(
  dims: number[],
  totalDim: number,
  traceOutIndices: number[]
): void {
  // Validate total dimension
  const dimProduct = dims.reduce((a, b) => a * b, 1);
  if (dimProduct !== totalDim) {
    throw new Error('Product of subsystem dimensions must equal total dimension');
  }

  // Validate trace indices
  if (!traceOutIndices.every(i => i >= 0 && i < dims.length)) {
    throw new Error('Invalid trace out indices');
  }

  // Validate remaining dimension is non-zero
  const remainingDim = dims
    .filter((_, i) => !traceOutIndices.includes(i))
    .reduce((a, b) => a * b, 1);
  if (remainingDim === 0) {
    throw new Error('Cannot trace out all subsystems');
  }
}

/**
 * Validates matrix dimensions
 */
export function validateMatDims(matrix: any[][]): void {
  if (!matrix || !matrix[0]) {
    throw new Error('Invalid matrix: empty or undefined');
  }
  
  const rows = matrix.length;
  const cols = matrix[0].length;
  
  if (rows !== cols) {
    throw new Error('Matrix must be square');
  }
  
  for (const row of matrix) {
    if (row.length !== cols) {
      throw new Error('All rows must have same length');
    }
  }
}