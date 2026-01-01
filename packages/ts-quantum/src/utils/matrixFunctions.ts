/**
 * Advanced matrix function implementations for quantum operations
 * 
 * Provides higher-level matrix functions building on core matrix operations.
 * Implements functions like matrix logarithm, square root, and arbitrary
 * function application using eigendecomposition.
 */

import { Complex } from '../core/types';
import { 
  eigenDecomposition, 
  isHermitian, 
  adjoint, 
  multiplyMatrices,
  scaleMatrix,
  ComplexMatrix 
} from './matrixOperations';
import * as math from 'mathjs';

/**
 * Applies an arbitrary function to a diagonalizable matrix
 * 
 * For a matrix A with eigendecomposition A = UDU†, computes f(A) = Uf(D)U†
 * where f(D) applies the function to each eigenvalue on the diagonal.
 * 
 * @param matrix Matrix to apply function to
 * @param func Function to apply to eigenvalues
 * @returns Matrix with function applied to eigenvalues
 */
export function matrixFunction(
  matrix: Complex[][],
  func: (x: Complex) => Complex
): Complex[][] {
  const dim = matrix.length;
  
  // For Hermitian matrices, use eigendecomposition
  if (isHermitian(matrix)) {
    const { values, vectors } = eigenDecomposition(matrix, {computeEigenvectors: true});
    
    if (!vectors) {
      throw new Error('Failed to compute eigenvectors');
    }

    // Apply function to eigenvalues
    const funcValues = values.map(v => func(v));
    
    // Construct the diagonal matrix of f(D)
    const fD = Array(dim).fill(null).map((_, i) => 
      Array(dim).fill(null).map((_, j) => 
        i === j ? funcValues[i] : math.complex(0, 0)
      )
    );
    
    // The vectors are already in the correct format
    const U = vectors;
    
    // Calculate U†
    const UDagger = adjoint(U);
    
    // Multiply: result = U * f(D) * U†
    const temp = multiplyMatrices(U, fD);
    return multiplyMatrices(temp, UDagger);
  } else {
    // For non-Hermitian matrices, use Jordan normal form or other methods
    throw new Error('Matrix function for non-Hermitian matrices not implemented');
  }
}

/**
 * Calculates the matrix logarithm
 * 
 * For a positive definite matrix A, computes log(A) such that exp(log(A)) = A
 * 
 * @param matrix Matrix to calculate logarithm of (must be positive definite)
 * @returns The matrix logarithm
 */
export function matrixLogarithm(matrix: Complex[][]): Complex[][] {
  return matrixFunction(matrix, (x) => {
    // Natural logarithm of complex number
    const r = Math.sqrt(x.re * x.re + x.im * x.im);
    const theta = Math.atan2(x.im, x.re);
    
    return math.complex(Math.log(r),  theta);
  });
}

/**
 * Calculates the matrix square root
 * 
 * For a matrix A, computes √A such that √A × √A = A
 * 
 * @param matrix Matrix to calculate square root of
 * @returns The matrix square root
 */
export function matrixSquareRoot(matrix: ComplexMatrix): ComplexMatrix {
  // Verify matrix structure
  matrix.forEach((row, i) => {
      row.forEach((elem, j) => {
          if (!math.isComplex(elem)) {
              // console.log(`Invalid element at [${i}][${j}]:`, elem);
          }
      });
  });
  
  try {
      const result = matrixFunction(matrix, x => math.sqrt(x));
      // console.log('Square root calculation successful');
      return result;
  } catch (e: unknown) {
      console.error('Error in matrix square root:', e);
      if (e instanceof Error) {
          console.error('Stack:', e.stack);
      }
      throw e;
  }
}

/**
 * Calculates an arbitrary power of a matrix
 * 
 * For a matrix A and a number p, computes A^p
 * 
 * @param matrix Base matrix
 * @param power Power to raise matrix to
 * @returns The matrix raised to the specified power
 */
export function matrixPower(matrix: Complex[][], power: number): Complex[][] {
  return matrixFunction(matrix, (x) => {
    // Complex number raised to real power
    const r = Math.pow(Math.sqrt(x.re * x.re + x.im * x.im), power);
    const theta = Math.atan2(x.im, x.re) * power;
    
    return math.complex(r * Math.cos(theta),  r * Math.sin(theta))});
  };


/**
 * Calculates the matrix sine function
 * 
 * @param matrix Input matrix
 * @returns The matrix sine
 */
export function matrixSin(matrix: Complex[][]): Complex[][] {
  return matrixFunction(matrix, (x) => {
    // Sine of complex number
    return math.complex(
      Math.sin(x.re) * Math.cosh(x.im),
      Math.cos(x.re) * Math.sinh(x.im)
    );
  });
}

/**
 * Calculates the matrix cosine function
 * 
 * @param matrix Input matrix
 * @returns The matrix cosine
 */
export function matrixCos(matrix: Complex[][]): Complex[][] {
  return matrixFunction(matrix, (x) => {
    // Cosine of complex number
    return math.complex(
      Math.cos(x.re) * Math.cosh(x.im),
      -Math.sin(x.re) * Math.sinh(x.im)
    );
  });
}