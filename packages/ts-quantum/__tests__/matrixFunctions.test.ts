import { describe, it, expect } from 'vitest';

import { matrixFunction, matrixSquareRoot, matrixLogarithm, matrixPower, matrixSin, matrixCos } from '../src/utils/matrixFunctions';
import { Complex } from '../src/core/types';
import * as math from 'mathjs';
import { formatMatrix } from './utils/testHelpers';

// Helper to compare complex numbers with tolerance
function complexEqual(
  a: Complex,
  b: Complex,
  tolerance: number = 1e-10
): boolean {
  return Math.abs(a.re - b.re) < tolerance && Math.abs(a.im - b.im) < tolerance;
}

// Helper to compare complex matrices with tolerance
function matricesEqual(
  a: Complex[][],
  b: Complex[][],
  tolerance: number = 1e-10
): boolean {
  if (a.length !== b.length || a[0].length !== b[0].length) return false;
  
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a[0].length; j++) {
      if (!complexEqual(a[i][j], b[i][j], tolerance)) {
        return false;
      }
    }
  }
  return true;
}

describe('matrixFunction', () => {
  // Test 1: Identity function should return the original matrix
  it('applies identity function to return the same matrix', () => {
    const matrix = [
      [math.complex(2,  0), math.complex(1,  0)],
      [math.complex(1,  0), math.complex(2,  0)]
    ];
    
    const identityFn = (x: Complex): Complex => x;
    
    console.log(formatMatrix(matrix));

    const result = matrixFunction(matrix, identityFn);
    console.log(formatMatrix(result));
    expect(matricesEqual(result, matrix)).toBe(true);
  });
  
  // Test 2: Square function on a simple matrix
  it('applies square function to eigenvalues correctly', () => {
    const matrix = [
      [math.complex(2,  0), math.complex(1,  0)],
      [math.complex(1,  0), math.complex(2,  0)]
    ];
    
    const squareFn = (x: Complex): Complex => {
      return math.multiply(x, x) as Complex;
    };
    console.log(formatMatrix(matrix));
    const result = matrixFunction(matrix, squareFn);
    console.log(formatMatrix(result));
    const expected = [
      [math.complex(5,  0), math.complex(4,  0)],
      [math.complex(4,  0), math.complex(5,  0)]
    ];
    
    expect(matricesEqual(result, expected, 1e-9)).toBe(true);
  });
  
  // Test 5: Consistency between matrixFunction and specific implementations
  it('is consistent with specific matrix function implementations', () => {
    const hermitianMatrix = [
      [math.complex(2,  0), math.complex(1,  0)],
      [math.complex(1,  0), math.complex(2,  0)]
    ];
    
    // Test square root consistency
    const sqrtFunc = (x: Complex): Complex => {
      const r = Math.sqrt(Math.sqrt(x.re * x.re + x.im * x.im));
      const theta = Math.atan2(x.im, x.re) / 2;
      return math.complex(r * Math.cos(theta),  r * Math.sin(theta));
    };
    
    const sqrtResult = matrixFunction(hermitianMatrix, sqrtFunc);
    const directSqrt = matrixSquareRoot(hermitianMatrix);
    expect(matricesEqual(sqrtResult, directSqrt)).toBe(true);
    
    // Test logarithm consistency
    const logFunc = (x: Complex): Complex => {
      const r = Math.sqrt(x.re * x.re + x.im * x.im);
      const theta = Math.atan2(x.im, x.re);
      return math.complex(Math.log(r),  theta);
    };
    
    const logResult = matrixFunction(hermitianMatrix, logFunc);
    const directLog = matrixLogarithm(hermitianMatrix);
    expect(matricesEqual(logResult, directLog)).toBe(true);
    
    // Test power consistency
    const power = 2;
    const powerFunc = (x: Complex): Complex => {
      const r = Math.pow(Math.sqrt(x.re * x.re + x.im * x.im), power);
      const theta = Math.atan2(x.im, x.re) * power;
      return math.complex(r * Math.cos(theta),  r * Math.sin(theta));
    };
    
    const powerResult = matrixFunction(hermitianMatrix, powerFunc);
    const directPower = matrixPower(hermitianMatrix, power);
    expect(matricesEqual(powerResult, directPower)).toBe(true);
  });
  
  // Test 7: Test with higher dimensional matrix
  it('works with 3x3 matrices', () => {
    const matrix = [
      [math.complex(1,  0), math.complex(0,  0), math.complex(0,  0)],
      [math.complex(0,  0), math.complex(2,  0), math.complex(0,  0)],
      [math.complex(0,  0), math.complex(0,  0), math.complex(3,  0)]
    ];
    
    const cubeFn = (x: Complex): Complex => {
      return math.multiply(math.multiply(x, x), x) as Complex;
    };
    
    const result = matrixFunction(matrix, cubeFn);
    const expected = [
      [math.complex(1,  0), math.complex(0,  0), math.complex(0,  0)],
      [math.complex(0,  0), math.complex(8,  0), math.complex(0,  0)],
      [math.complex(0,  0), math.complex(0,  0), math.complex(27,  0)]
    ];
    
    expect(matricesEqual(result, expected, 1e-9)).toBe(true);
  });
  
  // Test 8: Verify that matrixFunction works correctly with trigonometric functions
  it('correctly applies trigonometric functions to matrices', () => {
    const matrix = [
      [math.complex(Math.PI/4,  0), math.complex(0,  0)],
      [math.complex(0,  0), math.complex(Math.PI/2,  0)]
    ];
    
    const sinFn = (x: Complex): Complex => {
      return math.complex(
        Math.sin(x.re) * Math.cosh(x.im),
        Math.cos(x.re) * Math.sinh(x.im)
      );
    };
    
    const sinResult = matrixFunction(matrix, sinFn);
    const sinDirect = matrixSin(matrix);
    
    const expectedSin = [
      [math.complex(Math.sin(Math.PI/4),  0), math.complex(0,  0)],
      [math.complex(0,  0), math.complex(Math.sin(Math.PI/2),  0)]
    ];
    
    expect(matricesEqual(sinResult, expectedSin, 1e-9)).toBe(true);
    expect(matricesEqual(sinResult, sinDirect, 1e-9)).toBe(true);
  });
});