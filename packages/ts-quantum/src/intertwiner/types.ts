/**
 * Intertwiner Module Type Definitions
 * 
 * TypeScript interfaces for intertwiner spaces, basis states, and tensor representations
 * in Loop Quantum Gravity and spin network theory.
 */

import { StateVector } from '../states/stateVector';

/**
 * Represents a single basis state in an intertwiner space
 */
export interface IntertwinerBasisState {
  /** Intermediate angular momentum quantum number */
  intermediateJ: number;
  
  /** State vector in the tensor product space */
  stateVector: StateVector;
  
  /** Recoupling scheme used (e.g., "(j1,j2)(j3,j4)") */
  recouplingScheme: string;
  
  /** Normalization factor */
  normalization: number;
}

/**
 * Complete intertwiner space for a given set of edge spins
 */
export interface IntertwinerSpace {
  /** Dimension of the intertwiner space */
  dimension: number;
  
  /** Orthonormal basis states */
  basisStates: IntertwinerBasisState[];
  
  /** Input edge spin quantum numbers */
  edgeSpins: number[];
  
  /** Total angular momentum (always 0 for intertwiners) */
  totalJ: number;
}

/**
 * Tensor representation of an intertwiner
 */
export interface IntertwinerTensor {
  /** Edge dimensions (2j+1 for each edge) */
  dimensions: number[];
  
  /** Sparse tensor representation as state vector */
  stateVector: StateVector;
  
  /** Associated basis state information */
  basisState: IntertwinerBasisState;
}
