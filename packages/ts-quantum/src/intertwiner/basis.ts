/**
 * Intertwiner Basis Construction
 * 
 * This module constructs orthonormal basis states for intertwiner spaces using
 * Clebsch-Gordan coefficients and the StateVector framework. It handles the
 * coupling of angular momentum at spin network nodes.
 */

import { StateVector } from '../states/stateVector';
import { clebschGordan } from '../angularMomentum/composition';
import { orthogonalizeStateVectors } from '../utils/matrixOperations';
import { IntertwinerBasisState, IntertwinerSpace } from './types';
import { triangleInequality, allowedIntermediateSpins, calculateDimension } from './core';
import { Complex, toComplex } from '../core/types';
import * as math from 'mathjs';

/**
 * Construct complete orthonormal basis for intertwiner space
 * 
 * @param edgeSpins Array of angular momentum quantum numbers for node edges
 * @returns Complete intertwiner space with orthonormal basis
 * @throws Error if edge spins are invalid or unsupported valence
 */
export function constructBasis(edgeSpins: number[]): IntertwinerSpace {
  validateEdgeSpins(edgeSpins);
  
  const valence = edgeSpins.length;
  const dimension = calculateDimension(edgeSpins);
  
  if (dimension === 0) {
    return {
      dimension: 0,
      basisStates: [],
      edgeSpins: [...edgeSpins],
      totalJ: 0
    };
  }

  let basisStates: IntertwinerBasisState[] = [];

  switch (valence) {
    case 2:
      basisStates = constructTwoValentBasis(edgeSpins);
      break;
    case 3:
      basisStates = constructThreeValentBasis(edgeSpins);
      break;
    case 4:
      basisStates = constructFourValentBasis(edgeSpins);
      break;
    default:
      throw new Error(`Basis construction for ${valence}-valent nodes not implemented`);
  }

  // Orthonormalize basis states
  const orthonormalBasis = orthonormalizeBasis(basisStates);

  return {
    dimension: orthonormalBasis.length,
    basisStates: orthonormalBasis,
    edgeSpins: [...edgeSpins],
    totalJ: 0
  };
}

/**
 * Construct single basis vector for 4-valent node with given intermediate coupling
 * 
 * @param j1 First edge angular momentum
 * @param j2 Second edge angular momentum  
 * @param j3 Third edge angular momentum
 * @param j4 Fourth edge angular momentum
 * @param intermediateJ Intermediate angular momentum coupling
 * @returns Basis state or null if coupling is invalid
 */
export function constructBasisVector(
  j1: number, j2: number, j3: number, j4: number, 
  intermediateJ: number
): IntertwinerBasisState | null {
  
  // Validate intermediate coupling is allowed
  const j12_values = allowedIntermediateSpins(j1, j2);
  const j34_values = allowedIntermediateSpins(j3, j4);
  
  if (!j12_values.includes(intermediateJ) || !j34_values.includes(intermediateJ)) {
    return null;
  }

  // Calculate dimensions
  const dims = [j1, j2, j3, j4].map(j => Math.floor(2 * j + 1));
  const totalDim = dims.reduce((prod, dim) => prod * dim, 1);

  // Generate m-value arrays for each edge
  const mValues = [j1, j2, j3, j4].map(j => generateMValues(j));
  
  // Build coefficient array using CG coefficients
  const coefficients: number[] = new Array(totalDim).fill(0);

  // Iterate over all m-value combinations
  for (const m1 of mValues[0]) {
    for (const m2 of mValues[1]) {
      // First coupling: j1 ⊗ j2 → intermediateJ
      const m12 = m1 + m2;
      if (Math.abs(m12) > intermediateJ + 1e-10) continue;
      
      const cg1 = clebschGordan(j1, m1, j2, m2, intermediateJ, m12);
      if (math.abs(cg1).re < 1e-10) continue;

      for (const m3 of mValues[2]) {
        for (const m4 of mValues[3]) {
          // Second coupling: j3 ⊗ j4 → intermediateJ  
          const m34 = m3 + m4;
          if (math.abs(m34) > intermediateJ + 1e-10) continue;
          
          // For total J=0, need m12 + m34 = 0
          if (math.abs(m12 + m34) > 1e-10) continue;
          
          const cg2 = clebschGordan(j3, m3, j4, m4, intermediateJ, m34);
          if (math.abs(cg2).re < 1e-10) continue;

          // Final coupling: intermediateJ ⊗ intermediateJ → 0
          const cgFinal = clebschGordan(intermediateJ, m12, intermediateJ, m34, 0, 0);
          if (math.abs(cgFinal).re < 1e-10) continue;

          // Calculate tensor product index
          const index = calculateTensorIndex([m1, m2, m3, m4], [j1, j2, j3, j4]);
          
          if (index >= 0 && index < totalDim) {
            coefficients[index] += cg1.re * cg2.re * cgFinal.re;
          }
        }
      }
    }
  }

  // Check if vector is non-zero
  const norm = Math.sqrt(coefficients.reduce((sum, c) => sum + c * c, 0));
  if (norm < 1e-10) {
    return null;
  }

  // Create StateVector with normalized coefficients
  const complexCoeffs = coefficients.map(c => math.complex(c / norm, 0));
  const stateVector = buildStateVector(complexCoeffs, dims);
  
  return {
    intermediateJ,
    stateVector,
    recouplingScheme: createRecouplingScheme(j1, j2, j3, j4),
    normalization: norm
  };
}

/**
 * Optimized basis for four spin-1/2 edges (2-dimensional space)
 * 
 * @returns Complete intertwiner space for four spin-1/2 edges
 */
export function getFourSpinHalfBasis(): IntertwinerSpace {
  const edgeSpins = [0.5, 0.5, 0.5, 0.5];
  
  // First basis state: (j12=0) ⊗ (j34=0) → j=0
  const basis1 = constructBasisVector(0.5, 0.5, 0.5, 0.5, 0);
  
  // Second basis state: (j12=1) ⊗ (j34=1) → j=0  
  const basis2 = constructBasisVector(0.5, 0.5, 0.5, 0.5, 1);
  
  const basisStates = [basis1, basis2].filter(state => state !== null) as IntertwinerBasisState[];
  
  // Orthonormalize basis
  const orthonormalBasis = orthonormalizeBasis(basisStates);
  
  return {
    dimension: orthonormalBasis.length,
    basisStates: orthonormalBasis,
    edgeSpins,
    totalJ: 0
  };
}

// ==================== Helper Functions ====================

/**
 * Build StateVector from coefficient array and dimensions
 */
function buildStateVector(coefficients: Complex[], dimensions: number[]): StateVector {
  const totalDim = dimensions.reduce((prod, dim) => prod * dim, 1);
  
  if (coefficients.length !== totalDim) {
    throw new Error(`Coefficient array length ${coefficients.length} does not match total dimension ${totalDim}`);
  }
  
  return new StateVector(
    totalDim,
    coefficients,
    'intertwiner',
    { dimensions, tensorProduct: true }
  );
}

/**
 * Generate array of m-values for given angular momentum j
 */
function generateMValues(j: number): number[] {
  const dim = Math.floor(2 * j + 1);
  const mValues: number[] = [];
  
  for (let i = 0; i < dim; i++) {
    mValues.push(j - i);
  }
  
  return mValues;
}

/**
 * Calculate linear index in tensor product space from m-value tuple
 */
function calculateTensorIndex(mValues: number[], jValues: number[]): number {
  if (mValues.length !== jValues.length) {
    throw new Error('mValues and jValues arrays must have same length');
  }
  
  let index = 0;
  let stride = 1;
  
  // Calculate index in reverse order (rightmost varies fastest)
  for (let i = jValues.length - 1; i >= 0; i--) {
    const j = jValues[i];
    const m = mValues[i];
    const mIndex = Math.floor(j - m);  // Convert m to array index
    
    index += mIndex * stride;
    stride *= Math.floor(2 * j + 1);
  }
  
  return index;
}

/**
 * Orthonormalize basis states using existing quantum module infrastructure
 */
function orthonormalizeBasis(basisStates: IntertwinerBasisState[]): IntertwinerBasisState[] {
  if (basisStates.length === 0) {
    return [];
  }
  
  // Extract StateVectors
  const stateVectors = basisStates.map(state => state.stateVector);
  
  // Orthogonalize using validated algorithm
  const orthogonalizedVectors = orthogonalizeStateVectors(stateVectors);
  
  // Reconstruct basis states with orthogonalized vectors
  return orthogonalizedVectors.map((vector, i) => ({
    ...basisStates[i],
    stateVector: vector as StateVector,
    normalization: 1.0  // Vectors are now normalized
  }));
}

/**
 * Validate input edge spins
 */
function validateEdgeSpins(edgeSpins: number[]): void {
  if (!Array.isArray(edgeSpins) || edgeSpins.length < 2) {
    throw new Error('Edge spins must be array with at least 2 elements');
  }
  
  for (const [i, j] of edgeSpins.entries()) {
    if (typeof j !== 'number' || j < 0) {
      throw new Error(`Invalid edge spin at index ${i}: ${j}`);
    }
    
    // Check if j is integer or half-integer
    const doubleJ = 2 * j;
    if (Math.abs(doubleJ - Math.round(doubleJ)) > 1e-10) {
      throw new Error(`Edge spin at index ${i} must be integer or half-integer: ${j}`);
    }
  }
}

/**
 * Create recoupling scheme string for documentation
 */
function createRecouplingScheme(j1: number, j2: number, j3: number, j4: number): string {
  return `(${j1},${j2})⊗(${j3},${j4})→0`;
}

/**
 * Construct basis for 2-valent node (identity coupling)
 */
function constructTwoValentBasis(edgeSpins: number[]): IntertwinerBasisState[] {
  const [j1, j2] = edgeSpins;
  
  if (Math.abs(j1 - j2) > 1e-10) {
    return [];  // No intertwiner for different spins
  }
  
  // Create identity coupling state
  const dim = Math.floor(2 * j1 + 1);
  const coefficients = Array(dim * dim).fill(math.complex(0, 0));
  
  // Set diagonal elements
  for (let i = 0; i < dim; i++) {
    coefficients[i * dim + i] = math.complex(1 / Math.sqrt(dim), 0);
  }
  
  const stateVector = buildStateVector(coefficients, [dim, dim]);
  
  return [{
    intermediateJ: j1,
    stateVector,
    recouplingScheme: `(${j1},${j2})→0`,
    normalization: 1.0
  }];
}

/**
 * Construct basis for 3-valent node (single coupling)
 */
function constructThreeValentBasis(edgeSpins: number[]): IntertwinerBasisState[] {
  const [j1, j2, j3] = edgeSpins;
  
  if (!triangleInequality(j1, j2, j3)) {
    return [];
  }
  
  // For 3-valent node, there's exactly one basis state
  const dims = [j1, j2, j3].map(j => Math.floor(2 * j + 1));
  const totalDim = dims.reduce((prod, dim) => prod * dim, 1);
  const coefficients: Complex[] = new Array(totalDim).fill(math.complex(0, 0));
  
  // Generate m-values
  const mValues = [j1, j2, j3].map(j => generateMValues(j));
  
  // Build CG coefficient sum
  for (const m1 of mValues[0]) {
    for (const m2 of mValues[1]) {
      for (const m3 of mValues[2]) {
        // Check m-conservation
        if (math.abs(m1 + m2 + m3) > 1e-10) continue;
        
        const cg = clebschGordan(j1, m1, j2, m2, j3, m3);
        if (math.abs(cg).re < 1e-10) continue;
        
        const index = calculateTensorIndex([m1, m2, m3], [j1, j2, j3]);
        if (index >= 0 && index < totalDim) {
          coefficients[index] = math.complex(cg.re, 0);
        }
      }
    }
  }
  
  // Normalize
  const norm = Math.sqrt(coefficients.reduce((sum, c) => 
    sum + (math.abs(c) as unknown as number) ** 2, 0));
  
  if (norm < 1e-10) {
    return [];
  }
  
  const normalizedCoeffs = coefficients.map(c => 
    math.divide(c, math.complex(norm, 0)) as Complex);
  
  const stateVector = buildStateVector(normalizedCoeffs, dims);
  
  return [{
    intermediateJ: 0,  // 3-valent always couples to j=0
    stateVector,
    recouplingScheme: `(${j1},${j2},${j3})→0`,
    normalization: norm
  }];
}

/**
 * Construct basis for 4-valent node (main case)
 */
function constructFourValentBasis(edgeSpins: number[]): IntertwinerBasisState[] {
  const [j1, j2, j3, j4] = edgeSpins;
  
  // Get allowed intermediate spins
  const j12_values = allowedIntermediateSpins(j1, j2);
  const j34_values = allowedIntermediateSpins(j3, j4);
  
  // Find common intermediate values
  const commonJs = j12_values.filter(j12 => 
    j34_values.some(j34 => Math.abs(j12 - j34) < 1e-10));
  
  const basisStates: IntertwinerBasisState[] = [];
  
  for (const intermediateJ of commonJs) {
    const basisState = constructBasisVector(j1, j2, j3, j4, intermediateJ);
    if (basisState !== null) {
      basisStates.push(basisState);
    }
  }
  
  return basisStates;
}
