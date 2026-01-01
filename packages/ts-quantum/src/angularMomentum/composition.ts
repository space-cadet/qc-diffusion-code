/**
 * Angular momentum composition implementation
 * Includes Clebsch-Gordan coefficients and angular momentum addition
 */

import { Complex, IOperator, toComplex } from '../core/types';
import { StateVector } from '../states/stateVector';
import { createJmState, validateJ, isValidM } from './core';
import { logFactorial } from '../utils/math';
import * as math from 'mathjs';

// Core type for Clebsch-Gordan coefficients (sparse map)
type CGSparseMap = Map<string, number>;

// Cache for computed coefficients (sparse map)
const cgCache: Map<string, CGSparseMap> = new Map();

/**
 * Helper to create a key for the sparse map
 */
function cgKey(j1: number, m1: number, j2: number, m2: number, j: number, m: number): string {
  return `${j1},${m1},${j2},${m2},${j},${m}`;
}

/**
 * Validates angular momentum quantum numbers for Clebsch-Gordan coefficient
 * 
 * @param j1 First angular momentum
 * @param m1 Magnetic quantum number for j1
 * @param j2 Second angular momentum
 * @param m2 Magnetic quantum number for j2
 * @param j Total angular momentum
 * @param m Total magnetic quantum number
 * @throws Error if constraints are violated
 */
function validateAngularMomentum(j1: number, m1: number, j2: number, m2: number, j: number, m: number): void {
  // Validate each individual angular momentum
  validateJ(j1);
  validateJ(j2);
  validateJ(j);
  
  // Validate magnetic quantum numbers
  if (!isValidM(j1, m1)) {
    throw new Error(`Invalid m1=${m1} for j1=${j1}`);
  }
  if (!isValidM(j2, m2)) {
    throw new Error(`Invalid m2=${m2} for j2=${j2}`);
  }
  if (!isValidM(j, m)) {
    throw new Error(`Invalid m=${m} for j=${j}`);
  }
  
  // Triangle inequality: |j1-j2| ≤ j ≤ j1+j2
  if (j < Math.abs(j1 - j2) || j > j1 + j2) {
    throw new Error(`Total angular momentum j=${j} must satisfy |j1-j2| ≤ j ≤ j1+j2, where j1=${j1}, j2=${j2}`);
  }
  
  // m = m1 + m2 (conservation of angular momentum)
  if (Math.abs(m - (m1 + m2)) > 1e-10) {
    throw new Error(`m=${m} must equal m1+m2=${m1}+${m2}=${m1+m2}`);
  }
}

/**
 * Checks if a Clebsch-Gordan coefficient is zero based on selection rules
 * 
 * @param j1 First angular momentum
 * @param m1 Magnetic quantum number for j1
 * @param j2 Second angular momentum
 * @param m2 Magnetic quantum number for j2
 * @param j Total angular momentum
 * @param m Total magnetic quantum number
 * @returns true if coefficient is zero
 */
function isZeroCG(j1: number, m1: number, j2: number, m2: number, j: number, m: number): boolean {
  // Check the three selection rules for zero coefficients
  
  // 1. m ≠ m1 + m2 (magnetic quantum number conservation)
  if (Math.abs(m - (m1 + m2)) > 1e-10) {
    return true;
  }
  
  // 2. j > j1 + j2 (triangle inequality upper bound)
  if (j > j1 + j2) {
    return true;
  }
  
  // 3. j < |j1 - j2| (triangle inequality lower bound)
  if (j < Math.abs(j1 - j2)) {
    return true;
  }
  
  // Also check if individual m values are valid
  if (Math.abs(m1) > j1 || Math.abs(m2) > j2 || Math.abs(m) > j) {
    return true;
  }
  
  return false;
}

/**
 * Calculates a single Clebsch-Gordan coefficient
 *
 * @param j1 First angular momentum
 * @param m1 Magnetic quantum number for j1
 * @param j2 Second angular momentum
 * @param m2 Magnetic quantum number for j2
 * @param j Total angular momentum
 * @param m Total magnetic quantum number
 * @returns Complex number representing the coefficient
 */
function clebschGordan(j1: number, m1: number, j2: number, m2: number, j: number, m: number): Complex {
  try {
    validateAngularMomentum(j1, m1, j2, m2, j, m);
  } catch (error) {
    return math.complex(0, 0);
  }
  if (isZeroCG(j1, m1, j2, m2, j, m)) {
    return math.complex(0, 0);
  }
  // if (Math.abs(j1 - 0.5) < 1e-10 && Math.abs(j2 - 0.5) < 1e-10) {
  //   return clebschGordanSpinHalf(j1, m1, j2, m2, j, m);
  // }
  const cacheKey = `${j1},${j2}`;
  let table: CGSparseMap;
  if (cgCache.has(cacheKey)) {
    table = cgCache.get(cacheKey)!;
  } else {
    table = generateCGSparseMap(j1, j2);
    cgCache.set(cacheKey, table);
  }
  const key = cgKey(j1, m1, j2, m2, j, m);
  if (table.has(key)) {
    return math.complex(table.get(key)!, 0);
  }
  return math.complex(0, 0);
}

/**
 * Generates a sparse map of Clebsch-Gordan coefficients for given j1, j2
 */
function generateCGSparseMap(j1: number, j2: number): CGSparseMap {
  const map: CGSparseMap = new Map();
  const jMin = Math.abs(j1 - j2);
  const jMax = j1 + j2;
  for (let j = jMin; j <= jMax; j++) {
    for (let m = -j; m <= j; m++) {
      for (let m1 = -j1; m1 <= j1; m1++) {
        const m2 = m - m1;
        if (m2 < -j2 || m2 > j2) continue;
        if (isZeroCG(j1, m1, j2, m2, j, m)) continue;
        // Use the existing recursive or special-case logic
        let coeff: number = generateCGTableCoeff(j1, m1, j2, m2, j, m);
        if (Math.abs(coeff) > 1e-12) {
          map.set(cgKey(j1, m1, j2, m2, j, m), coeff);
        }
      }
    }
  }
  return map;
}

function generateCGTableCoeff(j1: number, m1: number, j2: number, m2: number, j: number, m: number): number {
  // We already have selection rules checks in isZeroCG, but let's add a safety check
  if (isZeroCG(j1, m1, j2, m2, j, m)) {
    return 0;
  }

  // Special case for j=0 coupling of two spin-1/2 particles
  if (Math.abs(j1 - 0.5) < 1e-10 && Math.abs(j2 - 0.5) < 1e-10 && Math.abs(j) < 1e-10) {
    // For singlet state, coefficient is -1/√2 for m1=1/2,m2=-1/2 and +1/√2 for m1=-1/2,m2=1/2
    if (Math.abs(m1 - 0.5) < 1e-10 && Math.abs(m2 + 0.5) < 1e-10) {
      return -1/Math.sqrt(2);
    }
    if (Math.abs(m1 + 0.5) < 1e-10 && Math.abs(m2 - 0.5) < 1e-10) {
      return 1/Math.sqrt(2);
    }
  }

  // Special case for maximum m value where coefficient should be exactly 1
  if (Math.abs(m - (j1 + j2)) < 1e-10 && Math.abs(m1 - j1) < 1e-10 && Math.abs(m2 - j2) < 1e-10) {
    return 1;
  }

  // Calculate log of terms to avoid overflow
  const logPrefactor = Math.log(2 * j + 1);

  // Log of delta (triangle condition)
  const logDelta = 0.5 * (
    logFactorial(Math.round(j + j1 - j2)) +
    logFactorial(Math.round(j - j1 + j2)) +
    logFactorial(Math.round(j1 + j2 - j)) -
    logFactorial(Math.round(j1 + j2 + j + 1))
  );

  // Log of term1
  const logTerm1 = 0.5 * (
    logFactorial(Math.round(j + m)) +
    logFactorial(Math.round(j - m)) +
    logFactorial(Math.round(j1 - m1)) +
    logFactorial(Math.round(j1 + m1)) +
    logFactorial(Math.round(j2 - m2)) +
    logFactorial(Math.round(j2 + m2))
  );

  // Calculate the sum term (Racah formula)
  let sum = 0;
  const kMin = Math.max(0, j2 - j - m1, j1 - j + m2);
  const kMax = Math.min(j1 + j2 - j, j1 - m1, j2 + m2);

  for (let k = Math.ceil(kMin); k <= Math.floor(kMax); k++) {
    const sign = (k % 2 === 0) ? 1 : -1;
    
    // Calculate log of all 6 denominator terms
    const logDenominatorTerms = 
      logFactorial(k) +
      logFactorial(Math.round(j1 + j2 - j - k)) +
      logFactorial(Math.round(j1 - m1 - k)) +
      logFactorial(Math.round(j2 + m2 - k)) +
      logFactorial(Math.round(j - j1 + m2 + k)) +
      logFactorial(Math.round(j - j2 - m1 + k));

    // Add the term using exp(log) to avoid overflow
    const termValue = Math.exp(-logDenominatorTerms); // It's 1/denominator
    if (!isNaN(termValue) && isFinite(termValue)) {
      sum += sign * termValue;
    }
  }

  const result = Math.exp(0.5 * logPrefactor + logDelta + logTerm1) * sum;
  return result;
}

/**
 * Combines two quantum states using Clebsch-Gordan coefficients
 * 
 * @param state1 First quantum state
 * @param j1 Angular momentum of first state
 * @param state2 Second quantum state
 * @param j2 Angular momentum of second state
 * @returns Combined quantum state
 */
function addAngularMomenta(state1: StateVector, j1: number, state2: StateVector, j2: number): StateVector {
  // Check dimensions
  const dim1 = Math.floor(2 * j1 + 1);
  const dim2 = Math.floor(2 * j2 + 1);
  
  if (state1.dimension !== dim1) {
    throw new Error(`State 1 dimension ${state1.dimension} does not match angular momentum j1=${j1} (expected ${dim1})`);
  }
  
  if (state2.dimension !== dim2) {
    throw new Error(`State 2 dimension ${state2.dimension} does not match angular momentum j2=${j2} (expected ${dim2})`);
  }
  
  // Total angular momentum can range from |j1-j2| to j1+j2
  const jMin = Math.abs(j1 - j2);
  const jMax = j1 + j2;
  
  // Initialize the result as an empty object
  const resultStates: { [j: string]: { [m: string]: Complex } } = {};
  
  // For each possible value of j
  for (let j = jMin; j <= jMax; j++) {
    resultStates[j.toString()] = {};
    
    // For each possible value of m
    for (let m = -j; m <= j; m++) {
      resultStates[j.toString()][m.toString()] = math.complex(0, 0);
      
      // For each possible value of m1 and m2
      for (let m1 = -j1; m1 <= j1; m1++) {
        const m2 = m - m1;
        
        // Skip invalid m2 values
        if (m2 < -j2 || m2 > j2) {
          continue;
        }
        
        // Get the Clebsch-Gordan coefficient
        const cg = clebschGordan(j1, m1, j2, m2, j, m);
        
        // Skip zero coefficients
        if (math.abs((cg as any).re ?? cg) < 1e-10) {
          continue;
        }
        
        // Get the amplitude of the |j1,m1⟩ state
        const dim1 = Math.floor(2 * j1 + 1);
        const idx1 = dim1 - 1 - Math.floor(j1 + m1);
        const amp1 = state1.amplitudes[idx1];
        
        // Get the amplitude of the |j2,m2⟩ state
        const dim2 = Math.floor(2 * j2 + 1);
        const idx2 = dim2 - 1 - Math.floor(j2 + m2);
        const amp2 = state2.amplitudes[idx2];
        
        // Multiply by the coefficient and add to the result
        const term = math.multiply(math.multiply(amp1, amp2), cg);
        resultStates[j.toString()][m.toString()] = math.add(
          resultStates[j.toString()][m.toString()],
          term
        ) as Complex;
      }
    }
  }
  
  // Convert to a single state vector
  const totalDim = Math.floor(Math.pow(j1 + j2 + 1, 2) - Math.pow(Math.abs(j1 - j2), 2));
  const resultAmplitudes: Complex[] = [];
  
  // Find the dominant j and m values from the state amplitudes
  let maxJ = jMin;
  let maxM = -maxJ;
  let maxAmplitude = 0;
  
  // First pass: find the maximum amplitude and its j,m values
  for (let j = jMax; j >= jMin; j--) {
    for (let m = j; m >= -j; m--) {
      const amp = resultStates[j.toString()][m.toString()];
      const magnitude = math.abs((amp as any).re ?? amp);
      if (magnitude > maxAmplitude) {
        maxAmplitude = magnitude;
        maxJ = j;
        maxM = m;
      }
    }
  }
  
  // Second pass: build the state vector in order of decreasing j and decreasing m
  for (let j = jMax; j >= jMin; j--) {
    for (let m = j; m >= -j; m--) {
      const amp = resultStates[j.toString()][m.toString()];
      if (math.abs((amp as any).re ?? amp) > 1e-12 || math.abs((amp as any).im ?? 0) > 1e-12) {
        resultAmplitudes.push(amp);
      } else {
        resultAmplitudes.push(math.complex(0, 0));
      }
    }
  }
  
  // Create basis label with actual j,m values
  const basisLabel = `|(${j1},${j2}),${maxJ},${maxM}⟩`;
  
  // Create the result state and normalize it
  const unnormalizedResult = new StateVector(totalDim, resultAmplitudes, basisLabel);
  const result = unnormalizedResult.normalize();
  
  // Get coupling history from input states
  const history1 = state1.getAngularMomentumMetadata()?.couplingHistory || [];
  const history2 = state2.getAngularMomentumMetadata()?.couplingHistory || [];
  
  // Calculate J component layout based on ACTUAL non-zero amplitudes
  const jComponents = new Map();
  let amplitudeIndex = 0;
  
  // Build metadata only for J components that actually have non-zero amplitudes
  for (let j = jMax; j >= jMin; j -= 0.5) {
    const dimension = Math.floor(2 * j + 1);
    
    // Check if this J component has any non-zero amplitudes
    let hasNonZeroAmplitudes = false;
    for (let mIndex = 0; mIndex < dimension; mIndex++) {
      if (amplitudeIndex + mIndex < resultAmplitudes.length) {
        const amp = resultAmplitudes[amplitudeIndex + mIndex];
        if (math.abs((amp as any).re ?? amp) > 1e-12 || math.abs((amp as any).im ?? 0) > 1e-12) {
          hasNonZeroAmplitudes = true;
          break;
        }
      }
    }
    
    // Only add to metadata if component exists
    if (hasNonZeroAmplitudes) {
      jComponents.set(j, {
        j: j,
        startIndex: amplitudeIndex,
        dimension: dimension,
        normalizationFactor: 1
      });
    }
    
    amplitudeIndex += dimension;
  }
  
  // Create comprehensive angular momentum metadata
  const metadata = {
    type: 'angular_momentum' as const,
    j: jMax, // Maximum possible J
    mRange: [-jMax, jMax] as [number, number],
    couplingHistory: [
      ...history1,
      ...history2,
      {
        operation: 'coupling' as const,
        j1: j1,
        j2: j2,
        resultJ: Array.from({ length: Math.floor(2 * (jMax - jMin) + 1) }, (_, i) => jMin + i * 0.5),
        timestamp: Date.now()
      }
    ],
    jComponents: jComponents,
    isComposite: true
  };
  
  result.setAngularMomentumMetadata(metadata);
  return result;
}

/**
 * Decomposes a coupled state into uncoupled basis states
 * 
 * @param state Coupled quantum state
 * @param j1 First angular momentum
 * @param j2 Second angular momentum
 * @returns Map of uncoupled states
 */
function decomposeAngularState(state: StateVector, j1: number, j2: number): Map<string, StateVector> {
  // Decompose a coupled state into uncoupled basis states
  const result = new Map<string, StateVector>();
  
  // Calculate dimensions
  const dim1 = Math.floor(2 * j1 + 1);
  const dim2 = Math.floor(2 * j2 + 1);
  const totalDim = dim1 * dim2;
  
  // Initialize the uncoupled state amplitudes
  const uncoupledAmplitudes = new Array(totalDim).fill(null).map(() => math.complex(0, 0));
  
  // Total angular momentum can range from |j1-j2| to j1+j2
  const jMin = Math.abs(j1 - j2);
  const jMax = j1 + j2;
  
  // For each possible value of j
  let stateIndex = 0;
  for (let j = jMax; j >= jMin; j--) {
    // For each possible value of m
    for (let m = j; m >= -j; m--) {
      // Get the amplitude for the |j,m⟩ state
      const amp = state.amplitudes[stateIndex++];
      
      // Skip zero amplitudes
      if (math.abs((amp as any).re ?? amp) < 1e-10) {
        continue;
      }
      
      // Decompose this state into uncoupled basis
      for (let m1 = -j1; m1 <= j1; m1++) {
        const m2 = m - m1;
        
        // Skip invalid m2 values
        if (m2 < -j2 || m2 > j2) {
          continue;
        }
        
        // Get the Clebsch-Gordan coefficient
        const cg = clebschGordan(j1, m1, j2, m2, j, m);
        
        // Skip zero coefficients
        if (math.abs((cg as any).re ?? cg) < 1e-10) {
          continue;
        }
        
        // Calculate index in uncoupled basis
        const idx1 = dim1 - 1 - Math.floor(j1 + m1);
        const idx2 = dim2 - 1 - Math.floor(j2 + m2);
        const uncoupledIdx = idx1 * dim2 + idx2;
        
        // Add contribution to the uncoupled state
        uncoupledAmplitudes[uncoupledIdx] = math.add(
          uncoupledAmplitudes[uncoupledIdx],
          math.multiply(amp, cg)
        ) as Complex;
      }
    }
  }
  
  // Create the uncoupled state
  const uncoupledState = new StateVector(totalDim, uncoupledAmplitudes, `|j1,m1⟩|j2,m2⟩`);
  result.set('uncoupled', uncoupledState);
  
  return result;
}

// Export the public API
export {
  clebschGordan,
  addAngularMomenta,
  decomposeAngularState,
  validateAngularMomentum,
  isZeroCG
};
