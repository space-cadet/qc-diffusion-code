/**
 * Test helpers for quantum module tests
 */

import { Complex, IStateVector } from '../../src/core/types';
import { StateVector } from '../../src/states/stateVector';
import { HilbertSpace } from '../../src/core/hilbertSpace';
import { ComplexMatrix } from '../../src/utils/matrixOperations';
import * as math from 'mathjs';

// Helper for formatting complex numbers
export function formatComplex(c: Complex): string {
  if (Math.abs(c.im) < 1e-10) {
    return c.re.toFixed(4);
  }
  const sign = c.im >= 0 ? '+' : '';
  return `${c.re.toFixed(4)}${sign}${c.im.toFixed(4)}i`;
}

// Helper for formatting matrices
export function formatMatrix(matrix: ComplexMatrix): string {
  return '[\n  ' + matrix.map(row => 
    '[' + row.map(formatComplex).join(', ') + ']'
  ).join(',\n  ') + '\n]';
}

/**
 * Checks if two complex numbers are approximately equal
 */
export function complexApproxEqual(a: Complex, b: Complex, tolerance: number = 1e-10): boolean {
  // Ensure we're working with proper math.js complex numbers
  const ca = typeof a === 'number' ? math.complex(a, 0) : math.complex(a.re, a.im);
  const cb = typeof b === 'number' ? math.complex(b, 0) : math.complex(b.re, b.im);
  // console.log(typeof math.abs(math.subtract(ca, cb)).re, typeof tolerance);
  // console.log(math.abs(math.subtract(ca, cb)));
  return math.smaller(math.abs(math.subtract(ca, cb)), tolerance) as boolean;
}

/**
 * Checks if two state vectors are approximately equal
 */
export function stateVectorApproxEqual(a: IStateVector, b: IStateVector, tolerance: number = 1e-10): boolean {
  if (a.dimension !== b.dimension) return false;
  const aAmps = a.getAmplitudes();
  const bAmps = b.getAmplitudes();
  // console.log(aAmps, bAmps);
  return aAmps.every((amp, i) => complexApproxEqual(amp, bAmps[i], tolerance));
}

/**
 * Creates a normalized random state vector in given Hilbert space
 */
export function createRandomState(space: HilbertSpace): IStateVector {
  const amplitudes = Array(space.dimension).fill(null).map(() => 
    math.complex(Math.random() - 0.5, Math.random() - 0.5)
  );
  // Create a StateVector instance and let it handle normalization
  return new StateVector(space.dimension, amplitudes, 'random').normalize();
}
  
/**
 * Creates a random unitary matrix of given dimension
 */
export function createRandomUnitary(dim: number): Complex[][] {
  // Use QR decomposition to generate random unitary matrix
  const realMatrix = Array(dim).fill(null).map(() => 
    Array(dim).fill(null).map(() => Math.random() - 0.5)
  );
  
  // Simple Gram-Schmidt process
  for (let i = 0; i < dim; i++) {
    // Normalize column i
    let norm = Math.sqrt(realMatrix.reduce((sum, row) => 
      sum + row[i] * row[i], 0));
    for (let j = 0; j < dim; j++) {
      realMatrix[j][i] /= norm;
    }
    
    // Make orthogonal to remaining columns
    for (let k = i + 1; k < dim; k++) {
      const dot = realMatrix.reduce((sum, row) => 
        sum + row[i] * row[k], 0);
      for (let j = 0; j < dim; j++) {
        realMatrix[j][k] -= dot * realMatrix[j][i];
      }
    }
  }

  // Convert to complex matrix
  return realMatrix.map(row => 
    row.map(x => math.complex(x,  0))
  );
}

/**
 * Creates random Hermitian matrix of given dimension
 */
export function createRandomHermitian(dim: number): Complex[][] {
  const matrix = Array(dim).fill(null).map(() => 
    Array(dim).fill(null).map(() => 
      math.complex(Math.random() - 0.5, Math.random() - 0.5)
    )
  );

  // Make Hermitian
  for (let i = 0; i < dim; i++) {
    for (let j = i + 1; j < dim; j++) {
      matrix[j][i] = math.complex(
        matrix[i][j].re,
        -matrix[i][j].im
      );
    }
    // Diagonal elements should be real
    matrix[i][i] = math.complex(matrix[i][i].re, 0);
  }

  return matrix;
}