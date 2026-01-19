/**
 * Math utilities for quantum operations
 */

import { Complex } from '../core/types';
import * as math from 'mathjs';

// Cache for factorial computations
const factorialCache = new Map<number, number>();
const logFactorialCache = new Map<number, number>();
const doubleFactorialCache = new Map<number, number>();

/**
 * Computes log(n!) avoiding overflow using summation of logs
 * Uses caching for efficiency
 * 
 * @param n Input number (must be non-negative integer)
 * @returns log(n!)
 */
export function logFactorial(n: number): number {
  if (n < 0) return -Infinity;
  if (Math.abs(Math.round(n) - n) > 1e-10) {
    throw new Error('Factorial only defined for integers');
  }
  n = Math.round(n); // Ensure integer

  // Check cache
  const cached = logFactorialCache.get(n);
  if (cached !== undefined) return cached;

  // Compute using summation of logs
  let result = 0;
  for (let i = 2; i <= n; i++) {
    result += Math.log(i);
  }

  // Cache result
  logFactorialCache.set(n, result);
  return result;
}

/**
 * Computes n! using cached log factorial
 * 
 * @param n Input number (must be non-negative integer)
 * @returns n!
 */
export function factorial(n: number): number {
  if (n < 0) throw new Error('Factorial not defined for negative numbers');
  if (n > 170) throw new Error('Factorial too large for direct computation');
  
  // Check cache
  const cached = factorialCache.get(n);
  if (cached !== undefined) return cached;

  const result = Math.exp(logFactorial(n));
  factorialCache.set(n, result);
  return result;
}

/**
 * Computes double factorial n!! = n * (n-2) * (n-4) * ...
 * Uses caching for efficiency
 * 
 * @param n Input number (must be non-negative integer)
 * @returns n!!
 */
export function doubleFactorial(n: number): number {
  if (n < 0) throw new Error('Double factorial not defined for negative numbers');
  if (n > 300) throw new Error('Double factorial too large for direct computation');

  // Check cache
  const cached = doubleFactorialCache.get(n);
  if (cached !== undefined) return cached;

  // Base cases
  if (n <= 1) return 1;

  const result = n * doubleFactorial(n - 2);
  doubleFactorialCache.set(n, result);
  return result;
}

/**
 * Computes Legendre polynomial P_n(x) using recursion
 * 
 * @param n Degree of polynomial (must be non-negative integer)
 * @param x Argument (-1 <= x <= 1)
 * @returns P_n(x)
 */
/**
 * Calculates triangle coefficient for three angular momenta
 * Delta(a,b,c) = sqrt((a+b-c)!(a-b+c)!(-a+b+c)!/(a+b+c+1)!)
 * 
 * @param a First angular momentum
 * @param b Second angular momentum
 * @param c Third angular momentum
 * @returns Triangle coefficient
 */
export function triangleCoefficient(a: number, b: number, c: number): number {
  // Check triangle inequality
  if (c > a + b || c < Math.abs(a - b)) {
    return 0;
  }

  // Calculate using log factorials to avoid overflow
  const sum = logFactorial(Math.round(a + b - c)) +
              logFactorial(Math.round(a - b + c)) +
              logFactorial(Math.round(-a + b + c)) -
              logFactorial(Math.round(a + b + c + 1));
              
  return Math.exp(sum/2); // sqrt of exp(sum)
}

/**
 * Computes Legendre polynomial P_n(x) using recursion
 * 
 * @param n Degree of polynomial (must be non-negative integer)
 * @param x Argument (-1 <= x <= 1)
 * @returns P_n(x)
 */
export function legendrePolynomial(n: number, x: number): number {
  if (n < 0 || Math.abs(Math.round(n) - n) > 1e-10) {
    throw new Error('Degree must be non-negative integer');
  }
  if (Math.abs(x) > 1) {
    throw new Error('Argument must be in [-1,1]');
  }

  // Base cases
  if (n === 0) return 1;
  if (n === 1) return x;

  // Bonnet's recursion formula
  let p0 = 1;    // P_0(x)
  let p1 = x;    // P_1(x)
  let pn = 0;    // P_n(x)

  for (let k = 2; k <= n; k++) {
    pn = ((2 * k - 1) * x * p1 - (k - 1) * p0) / k;
    p0 = p1;
    p1 = pn;
  }

  return pn;
}

/**
 * Computes matrix exponential using Taylor series
 */
export function matrixExponential(
  matrix: Complex[][],
  terms: number = 10
): Complex[][] {
  const dim = matrix.length;
  
  // Initialize result to identity matrix
  const result = Array(dim).fill(null).map((_, i) => 
    Array(dim).fill(null).map((_, j) => 
      i === j ? math.complex(1, 0) : math.complex(0, 0)
    )
  );

  // Initialize term to identity
  let term = Array(dim).fill(null).map((_, i) => 
    Array(dim).fill(null).map((_, j) => 
      i === j ? math.complex(1, 0) : math.complex(0, 0)
    )
  );

  // Compute sum of terms
  for (let n = 1; n <= terms; n++) {
    // Multiply term by matrix and divide by n
    term = multiplyMatrices(term, matrix).map(row =>
      row.map(element => math.complex(element.re / n, element.im / n))
    );
    
    // Add to result
    result.forEach((row, i) =>
      row.forEach((_, j) => {
        result[i][j] = math.add(result[i][j], term[i][j]) as Complex;
      })
    );
  }

  return result;
}

/**
 * Multiplies two complex matrices
 */
export function multiplyMatrices(a: Complex[][], b: Complex[][]): Complex[][] {
  const dim = a.length;
  const result = Array(dim).fill(null).map(() => 
    Array(dim).fill(null).map(() => math.complex(0, 0))
  );

  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      for (let k = 0; k < dim; k++) {
        const prod = math.multiply(a[i][k], b[k][j]) as Complex;
        result[i][j] = math.add(result[i][j], prod) as Complex;
      }
    }
  }

  return result;
}

/**
 * Computes the singular value decomposition of a matrix
 * Note: This is a placeholder for a proper SVD implementation
 */
export function singularValueDecomposition(
  matrix: Complex[][]
): {U: Complex[][], S: number[], V: Complex[][]} {
  const dim = matrix.length;
  
  // Placeholder implementation
  return {
    U: Array(dim).fill(null).map((_, i) => 
      Array(dim).fill(null).map((_, j) => 
        i === j ? math.complex(1, 0) : math.complex(0, 0)
      )
    ),
    S: Array(dim).fill(1),
    V: Array(dim).fill(null).map((_, i) => 
      Array(dim).fill(null).map((_, j) => 
        i === j ? math.complex(1, 0) : math.complex(0, 0)
      )
    )
  };
}