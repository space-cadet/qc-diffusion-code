/**
 * Core type definitions for quantum operations
 */

import { Complex } from 'mathjs';

import * as math from 'mathjs';

// Direct export of math.js Complex type
export type { Complex } from 'mathjs';

import { StateVector } from '../states/stateVector';

/**
 * Helper functions for complex number handling
 */
export function toComplex(value: number | Complex | {re: number, im: number}): Complex {
  if (typeof value === 'number') {
    return math.complex(value, 0);
  }
  if ('re' in value && 'im' in value) {
    return math.complex(value.re, value.im);
  }
  return value as Complex;
}

export function ensureComplex(value: Complex): Complex {
  return toComplex(value);
}

/**
 * Represents a quantum state vector
 */
export interface IStateVector {
  readonly objectType: 'state';  // Discriminator property
  dimension: number;      // Hilbert space dimension
  amplitudes: Complex[];  // State vector amplitudes in computational basis
  basis?: string;        // Optional basis label
  properties?: Record<string, any>;  // Optional properties bag

  // State manipulation
  setState(index: number, value: Complex): void;
  getState(index: number): Complex;
  getAmplitudes(): Complex[];

  // Quantum operations
  innerProduct(other: IStateVector): Complex;
  norm(): number;
  normalize(): IStateVector;
  tensorProduct(other: IStateVector): IStateVector;
  scale(factor: Complex): IStateVector;
  add(other: IStateVector): IStateVector;
  equals(other: IStateVector, tolerance?: number): boolean;
  
  // Utility methods
  isZero(tolerance?: number): boolean;
  toArray(): Complex[];
  toString(): string;
}

/**
 * Type of quantum operator (unitary, hermitian, etc)
 */
export type OperatorType = 'unitary' | 'hermitian' | 'projection' | 'general' | 'identity' | 'diagonal' | 'Jplus' | 'Jminus' | 'Jz' | 'J2';

/**
 * Base interface for quantum operators
 */
export interface IOperator {
  readonly objectType: 'operator';  // Discriminator property
  dimension: number;      // Hilbert space dimension  
  type: OperatorType;    // Type of operator
  
  // Core operations
  apply(state: IStateVector): StateVector;  // Apply operator to state
  compose(other: IOperator): IOperator;      // Compose with another operator  
  adjoint(): IOperator;                     // Hermitian conjugate
  toMatrix(): Complex[][];                 // Matrix representation
  tensorProduct(other: IOperator): IOperator; // Tensor product with another operator
  partialTrace(dims: number[], traceOutIndices: number[]): IOperator; // Partial trace over subsystems
  
  // Added operations
  scale(scalar: Complex): IOperator;        // Scale operator by complex number
  add(other: IOperator): IOperator;          // Add two operators
  eigenDecompose(): { values: Complex[]; vectors: IOperator[] };
  norm(): number;                          // Calculate operator norm
  
  // Utility methods
  isZero(tolerance?: number): boolean;      // Test if operator is identically zero
}

/**
 * Type for measurement outcomes
 */
export interface IMeasurementOutcome {
  value: number;          // Measured eigenvalue
  state: IStateVector;     // Post-measurement state
  probability: number;    // Measurement probability
}

/**
 * Interface for density matrix operations
 */
export interface IDensityMatrix extends IOperator {
  trace(): Complex;                                    // Calculate trace
  partialTrace(dims: number[], traceOutIndices: number[]): IOperator;  // Partial trace
  purity(): number;                                    // Calculate purity
  vonNeumannEntropy(): number;                        // Calculate entropy
}

/**
 * Interface for quantum channels
 */
export interface IQuantumChannel {
  apply(state: IDensityMatrix): IDensityMatrix;         // Apply channel to state
  getOperators(): IOperator[];                            // Get operator representation
}

/**
 * Sparse matrix entry representation
 */
export interface ISparseEntry {
  row: number;
  col: number;
  value: Complex;
}

/**
 * Sparse matrix representation
 */
export interface ISparseMatrix {
  rows: number;
  cols: number;
  entries: ISparseEntry[];
  nnz: number;  // Number of non-zero entries
}

/**
 * Interface for sparse operator operations
 */
export interface ISparseOperator extends IOperator {
  readonly sparse: true;
  getSparseMatrix(): ISparseMatrix;
  toSparse(): ISparseMatrix;
  fromSparse(sparse: ISparseMatrix): ISparseOperator;
}

/**
 * Unified quantum object type - union of all quantum objects
 */
export type QuantumObject = IStateVector | IOperator;

/**
 * Type guards for runtime discrimination
 */
export function isState(obj: QuantumObject): obj is IStateVector {
  return obj.objectType === 'state';
}

export function isOperator(obj: QuantumObject): obj is IOperator {
  return obj.objectType === 'operator';
}

export function isDensityMatrix(obj: IOperator): obj is IDensityMatrix {
  return 'purity' in obj && 'vonNeumannEntropy' in obj;
}

/**
 * Utility functions for unified operations
 */
export function adjoint(obj: QuantumObject): QuantumObject {
  if (isState(obj)) {
    // For states, adjoint creates a bra (conceptually - return conjugate transpose as operator)
    throw new Error('Adjoint of state vector not implemented - use innerProduct instead');
  }
  return obj.adjoint();
}

export function norm(obj: QuantumObject): number {
  return obj.norm();
}

export function getObjectType(obj: QuantumObject): 'state' | 'operator' {
  return obj.objectType;
}
