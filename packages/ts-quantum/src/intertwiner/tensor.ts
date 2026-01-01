/**
 * Intertwiner Tensor Representation
 * 
 * This module provides tensor representations of intertwiner basis states,
 * integrating with the StateVector framework for efficient sparse storage.
 */

import { StateVector } from '../states/stateVector';
import { IntertwinerBasisState, IntertwinerTensor } from './types';
import { constructBasisVector } from './basis';
import { Complex } from '../core/types';
import * as math from 'mathjs';

/**
 * Convert basis state to sparse tensor representation
 * 
 * @param basis Intertwiner basis state to convert
 * @returns Tensor representation with StateVector storage
 */
export function basisToTensor(basis: IntertwinerBasisState): IntertwinerTensor {
  const stateVector = basis.stateVector;
  const dimensions = extractDimensions(stateVector);
  
  validateTensorDimensions(dimensions);
  
  // Create sparse representation (already handled by StateVector)
  const sparseTensor = createSparseTensorRepresentation(stateVector);
  
  return {
    dimensions,
    stateVector: sparseTensor,
    basisState: basis
  };
}

/**
 * Create intertwiner tensor from edge spins and intermediate J
 * 
 * @param edgeSpins Array of edge angular momentum values
 * @param intermediateJ Intermediate coupling value
 * @returns Tensor representation or null if invalid coupling
 * @throws Error if not 4-valent node
 */
export function createIntertwinerTensor(
  edgeSpins: number[], 
  intermediateJ: number
): IntertwinerTensor | null {
  
  if (edgeSpins.length !== 4) {
    throw new Error('Tensor creation currently supports only 4-valent nodes');
  }
  
  const [j1, j2, j3, j4] = edgeSpins;
  const basisState = constructBasisVector(j1, j2, j3, j4, intermediateJ);
  
  if (!basisState) {
    return null;
  }
  
  return basisToTensor(basisState);
}

// ==================== Helper Functions ====================

/**
 * Validate tensor dimensions
 */
function validateTensorDimensions(dimensions: number[]): void {
  if (!Array.isArray(dimensions) || dimensions.length === 0) {
    throw new Error('Dimensions must be non-empty array');
  }
  
  for (const [i, dim] of dimensions.entries()) {
    if (!Number.isInteger(dim) || dim < 1) {
      throw new Error(`Invalid dimension at index ${i}: ${dim}`);
    }
  }
}

/**
 * Create sparse tensor representation using StateVector
 */
function createSparseTensorRepresentation(stateVector: StateVector): StateVector {
  // StateVector already provides efficient sparse storage
  // Filter out near-zero coefficients for true sparsity
  const threshold = 1e-10;
  const amplitudes = stateVector.getAmplitudes();
  
  // Create new amplitudes with true zeros for sparse elements
  const sparseAmplitudes = amplitudes.map(amp => {
    const magnitude = math.abs(amp) as unknown as number;
    return magnitude < threshold ? math.complex(0, 0) : amp;
  });
  
  return new StateVector(
    stateVector.dimension,
    sparseAmplitudes,
    `sparse(${stateVector.basis || 'intertwiner'})`,
    { 
      ...stateVector.properties,
      sparse: true,
      threshold
    }
  );
}

/**
 * Extract dimensions from StateVector properties
 */
function extractDimensions(stateVector: StateVector): number[] {
  const properties = stateVector.properties;
  
  if (properties?.dimensions) {
    return properties.dimensions as number[];
  }
  
  // Fallback: assume single dimension
  return [stateVector.dimension];
}
