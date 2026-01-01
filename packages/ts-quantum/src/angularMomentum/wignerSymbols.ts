/**
 * Wigner symbols implementation
 * Includes 3j, 6j, and 9j symbols for angular momentum coupling
 */

import { Complex } from '../core/types';
import { clebschGordan } from './composition';
import { logFactorial, triangleCoefficient } from '../utils/math';
import * as math from 'mathjs';

/**
 * Validates triangle inequality for three angular momenta
 * 
 * @param j1 First angular momentum
 * @param j2 Second angular momentum
 * @param j3 Third angular momentum
 * @returns true if triangle inequality is satisfied
 */
export function isValidTriangle(j1: number, j2: number, j3: number): boolean {
  return (
    Math.abs(j1 - j2) <= j3 && j3 <= j1 + j2 &&
    Math.abs(j2 - j3) <= j1 && j1 <= j2 + j3 &&
    Math.abs(j3 - j1) <= j2 && j2 <= j3 + j1
  );
}

/**
 * Validates all four triangle conditions for Wigner 6j symbols
 * 
 * @param j1 Angular momentum j1
 * @param j2 Angular momentum j2
 * @param j3 Angular momentum j3
 * @param l1 Angular momentum l1
 * @param l2 Angular momentum l2
 * @param l3 Angular momentum l3
 * @returns true if all triangle conditions are satisfied
 */
function validate6jTriangles(j1: number, j2: number, j3: number, l1: number, l2: number, l3: number): boolean {
  return (
    isValidTriangle(j1, j2, j3) &&
    isValidTriangle(j1, l2, l3) &&
    isValidTriangle(l1, j2, l3) &&
    isValidTriangle(l1, l2, j3)
  );
}

/**
 * Calculates phase factor (-1)^n
 * 
 * @param n Power for phase factor
 * @returns 1 or -1
 */
function phaseFactor(n: number): number {
  return Math.pow(-1, Math.round(n));
}

/**
 * Validates Wigner 3j symbol quantum numbers
 * 
 * @param j1 First angular momentum
 * @param j2 Second angular momentum
 * @param j3 Third angular momentum
 * @param m1 First magnetic quantum number
 * @param m2 Second magnetic quantum number
 * @param m3 Third magnetic quantum number
 * @returns true if all quantum numbers are valid
 */
function validateWigner3j(j1: number, j2: number, j3: number, m1: number, m2: number, m3: number): boolean {
  // Check that j values are non-negative
  if (j1 < 0 || j2 < 0 || j3 < 0) {
    return false;
  }
  
  // Check that m values are within bounds
  if (Math.abs(m1) > j1 || Math.abs(m2) > j2 || Math.abs(m3) > j3) {
    return false;
  }
  
  // Check triangle inequality
  if (!isValidTriangle(j1, j2, j3)) {
    return false;
  }
  
  // Check magnetic quantum number conservation
  if (Math.abs(m1 + m2 + m3) > 1e-10) {
    return false;
  }
  
  return true;
}

/**
 * Calculates Wigner 3j symbol using Clebsch-Gordan coefficients
 * 
 * The Wigner 3j symbol is related to Clebsch-Gordan coefficients by:
 * (j1  j2  j3) = (-1)^(j1-j2-m3) / sqrt(2*j3+1) * ⟨j1,m1;j2,m2|j3,-m3⟩
 * (m1  m2  m3)
 * 
 * Based on verified formula from Sage/SymPy documentation:
 * ⟨j₁ m₁ j₂ m₂ | j₃ m₃⟩ = (-1)^(j₁-j₂+m₃) * √(2j₃+1) * Wigner3j(j₁, j₂, j₃, m₁, m₂, -m₃)
 * 
 * @param j1 First angular momentum
 * @param j2 Second angular momentum
 * @param j3 Third angular momentum
 * @param m1 First magnetic quantum number
 * @param m2 Second magnetic quantum number
 * @param m3 Third magnetic quantum number
 * @returns Wigner 3j symbol value
 */
export function wigner3j(
  j1: number, j2: number, j3: number,
  m1: number, m2: number, m3: number
): Complex {
  // Validate quantum numbers
  if (!validateWigner3j(j1, j2, j3, m1, m2, m3)) {
    return math.complex(0, 0);
  }
  
  // Get Clebsch-Gordan coefficient ⟨j1,m1;j2,m2|j3,-m3⟩
  // NOTE: Critical fix - using -m3 as the last argument
  const cgCoeff = clebschGordan(j1, m1, j2, m2, j3, -m3);
  
  // Phase factor: (-1)^(j1-j2+m3)
  const phase = phaseFactor(j1 - j2 + m3);
  
  // Normalization factor: 1/sqrt(2*j3+1)
  const normalization = 1 / Math.sqrt(2 * j3 + 1);
  
  // Combine all factors: phase * normalization * CG coefficient
  const result = math.multiply(phase * normalization, cgCoeff);
  
  return result as Complex;
}

/**
 * Applies symmetry operation to Wigner 3j symbol
 * There are 12 symmetry operations for 3j symbols
 * 
 * @param j1 First angular momentum
 * @param j2 Second angular momentum
 * @param j3 Third angular momentum
 * @param m1 First magnetic quantum number
 * @param m2 Second magnetic quantum number
 * @param m3 Third magnetic quantum number
 * @param operation Symmetry operation index (0-11)
 * @returns Transformed 3j symbol with phase factor
 */
export function wigner3jSymmetry(
  j1: number, j2: number, j3: number,
  m1: number, m2: number, m3: number,
  operation: number
): { value: Complex; phase: number } {
  
  const base = wigner3j(j1, j2, j3, m1, m2, m3);
  
  switch (operation) {
    case 0: // Identity
      return { value: base, phase: 1 };
      
    case 1: // Cyclic permutation (j1,j2,j3) → (j2,j3,j1)
      return {
        value: wigner3j(j2, j3, j1, m2, m3, m1),
        phase: phaseFactor(j1 + j2 + j3)
      };
      
    case 2: // Cyclic permutation (j1,j2,j3) → (j3,j1,j2)
      return {
        value: wigner3j(j3, j1, j2, m3, m1, m2),
        phase: phaseFactor(j1 + j2 + j3)
      };
      
    case 3: // Exchange first two: (j1,j2,j3) → (j2,j1,j3)
      return {
        value: wigner3j(j2, j1, j3, m2, m1, m3),
        phase: phaseFactor(j1 + j2 + j3)
      };
      
    case 4: // Sign reversal: (m1,m2,m3) → (-m1,-m2,-m3)
      return {
        value: wigner3j(j1, j2, j3, -m1, -m2, -m3),
        phase: phaseFactor(j1 + j2 + j3)
      };
      
    default:
      return { value: base, phase: 1 };
  }
}

/**
 * Calculates Wigner 6j symbol using Racah's formula
 * 
 * Uses the explicit sum formula:
 * {j1 j2 j3} = Delta(j1,j2,j3)Delta(j1,l2,l3)Delta(l1,j2,l3)Delta(l1,l2,j3) ×
 * {l1 l2 l3}   Σ_z (-1)^z [(z-j1-j2-j3)!(z-j1-l2-l3)!(z-l1-j2-l3)!(z-l1-l2-j3)! ×
 *                         (j1+j2+l1+l2-z)!(j2+j3+l2+l3-z)!(j3+j1+l3+l1-z)!]^(-1)
 * 
 * where Delta(a,b,c) is the triangle coefficient.
 * 
 * @param j1 Angular momentum j1
 * @param j2 Angular momentum j2
 * @param j3 Angular momentum j3
 * @param l1 Angular momentum l1
 * @param l2 Angular momentum l2
 * @param l3 Angular momentum l3
 * @returns Wigner 6j symbol value
 */
export function wigner6j(
  j1: number, j2: number, j3: number,
  l1: number, l2: number, l3: number
): Complex {
  // Validate all triangle conditions
  if (!validate6jTriangles(j1, j2, j3, l1, l2, l3)) {
    return math.complex(0, 0);
  }

  // Check for negative angular momenta
  if (j1 < 0 || j2 < 0 || j3 < 0 || l1 < 0 || l2 < 0 || l3 < 0) {
    return math.complex(0, 0);
  }

  // Calculate triangle coefficients
  const delta1 = triangleCoefficient(j1, j2, j3);
  const delta2 = triangleCoefficient(j1, l2, l3);
  const delta3 = triangleCoefficient(l1, j2, l3);
  const delta4 = triangleCoefficient(l1, l2, j3);

  // If any triangle coefficient is zero, the 6j symbol is zero
  if (delta1 === 0 || delta2 === 0 || delta3 === 0 || delta4 === 0) {
    return math.complex(0, 0);
  }

  // Calculate sum limits
  const zMin = Math.max(
    j1 + j2 + j3,
    j1 + l2 + l3,
    l1 + j2 + l3,
    l1 + l2 + j3
  );
  const zMax = Math.min(
    j1 + j2 + l1 + l2,
    j2 + j3 + l2 + l3,
    j3 + j1 + l3 + l1
  );

  // Calculate sum using log factorials for numerical stability
  let sumLog = -Infinity;
  for (let z = Math.round(zMin); z <= Math.round(zMax); z++) {
    // Calculate log of denominator terms
    const logDenom = (
      logFactorial(z - Math.round(j1 + j2 + j3)) +
      logFactorial(z - Math.round(j1 + l2 + l3)) +
      logFactorial(z - Math.round(l1 + j2 + l3)) +
      logFactorial(z - Math.round(l1 + l2 + j3)) +
      logFactorial(Math.round(j1 + j2 + l1 + l2 - z)) +
      logFactorial(Math.round(j2 + j3 + l2 + l3 - z)) +
      logFactorial(Math.round(j3 + j1 + l3 + l1 - z))
    );

    // Add term to sum (in log space)
    const logTerm = -logDenom;
    if (sumLog === -Infinity) {
      sumLog = logTerm;
    } else {
      // Use log sum exp trick for numerical stability
      const maxLog = Math.max(sumLog, logTerm);
      sumLog = maxLog + Math.log(Math.exp(sumLog - maxLog) + Math.exp(logTerm - maxLog));
    }
  }

  // Calculate final result
  const phaseFactor = Math.pow(-1, Math.round(j1 + j2 + j3 + l1 + l2 + l3));
  const result = phaseFactor * delta1 * delta2 * delta3 * delta4 * Math.exp(sumLog);

  return math.complex(result, 0);
}

export function wigner9j(
  j1: number, j2: number, j3: number,
  l1: number, l2: number, l3: number,
  k1: number, k2: number, k3: number
): Complex {
  // TODO: Implement in Phase 3
  return math.complex(0, 0);
}
