/**
 * Specialized quantum operator implementations for performance optimization
 */

import type { Complex, IStateVector, OperatorType, IOperator } from '../core/types';
import { StateVector } from '../states/stateVector';
import { validateMatchDims } from '../utils/validation';
import { MatrixOperator } from "./operator";
import { SparseOperator } from "./sparseOperator";
import { denseToSparse } from "./sparse";
import * as math from 'mathjs';

/**
 * Identity operator with no matrix storage - optimal performance
 */
export class IdentityOperator implements IOperator {
  readonly objectType: 'operator' = 'operator';
  readonly dimension: number;
  readonly type: OperatorType = 'identity';

  constructor(dimension: number) {
    if (dimension <= 0 || !Number.isInteger(dimension)) {
      throw new Error('Dimension must be a positive integer');
    }
    this.dimension = dimension;
  }

  /**
   * Apply identity operator - returns cloned state
   */
  apply(state: IStateVector): StateVector {
    validateMatchDims(state.dimension, this.dimension);
    return new StateVector(state.dimension, [...state.amplitudes], state.basis);
  }

  /**
   * Compose with another operator - returns other operator
   */
  compose(other: IOperator): IOperator {
    validateMatchDims(other.dimension, this.dimension);
    return other;
  }

  /**
   * Adjoint of identity is identity
   */
  adjoint(): IOperator {
    return new IdentityOperator(this.dimension);
  }

  /**
   * Generate identity matrix on demand
   */
  toMatrix(): Complex[][] {
    return Array(this.dimension).fill(null)
      .map((_, i) => Array(this.dimension).fill(null)
        .map((_, j) => i === j ? math.complex(1, 0) : math.complex(0, 0))
      );
  }

  tensorProduct(other: IOperator): IOperator {
    const sparseId = new SparseOperator(denseToSparse(this.toMatrix()), 'unitary');
    return sparseId.tensorProduct(other);
  }

  partialTrace(dims: number[], traceOutIndices: number[]): IOperator {
    return new MatrixOperator(this.toMatrix()).partialTrace(dims, traceOutIndices);
  }

  scale(scalar: Complex): IOperator {
    const diagonal = Array(this.dimension).fill(scalar);
    return new DiagonalOperator(diagonal);
  }

  add(other: IOperator): IOperator {
    const { MatrixOperator } = require('./operator');
    return new MatrixOperator(this.toMatrix()).add(other);
  }

  eigenDecompose(): { values: Complex[]; vectors: IOperator[] } {
    const { MatrixOperator } = require('./operator');
    return new MatrixOperator(this.toMatrix()).eigenDecompose();
  }

  norm(): number {
    return Math.sqrt(this.dimension);
  }

  isZero(): boolean {
    return false;
  }
}

/**
 * Diagonal operator with compressed storage
 */
export class DiagonalOperator implements IOperator {
  readonly objectType: 'operator' = 'operator';
  readonly dimension: number;
  readonly type: OperatorType = 'diagonal';
  private diagonal: Complex[];

  constructor(diagonal: Complex[]) {
    if (diagonal.length === 0) {
      throw new Error('Diagonal cannot be empty');
    }
    this.dimension = diagonal.length;
    this.diagonal = diagonal.map(val => math.clone(val));
  }

  /**
   * Apply diagonal operator - element-wise multiplication
   */
  apply(state: IStateVector): StateVector {
    validateMatchDims(state.dimension, this.dimension);
    
    const newAmplitudes = state.amplitudes.map((amp, i) => 
      math.multiply(amp, this.diagonal[i]) as Complex
    );
    
    return new StateVector(this.dimension, newAmplitudes, state.basis);
  }

  /**
   * Compose with another operator
   */
  compose(other: IOperator): IOperator {
    validateMatchDims(other.dimension, this.dimension);
    
    if (other.type === 'diagonal') {
      const otherDiagonal = (other as DiagonalOperator).getDiagonal();
      const resultDiagonal = this.diagonal.map((val, i) => 
        math.multiply(val, otherDiagonal[i]) as Complex
      );
      return new DiagonalOperator(resultDiagonal);
    }
    
    const { MatrixOperator } = require('./operator');
    return new MatrixOperator(this.toMatrix()).compose(other);
  }

  /**
   * Adjoint of diagonal operator
   */
  adjoint(): IOperator {
    const conjugateDiagonal = this.diagonal.map(val => math.conj(val) as Complex);
    return new DiagonalOperator(conjugateDiagonal);
  }

  /**
   * Generate full matrix on demand
   */
  toMatrix(): Complex[][] {
    return Array(this.dimension).fill(null)
      .map((_, i) => Array(this.dimension).fill(null)
        .map((_, j) => i === j ? math.clone(this.diagonal[i]) : math.complex(0, 0))
      );
  }

  tensorProduct(other: IOperator): IOperator {
    const sparseDiag = new SparseOperator(denseToSparse(this.toMatrix()), 'diagonal');
    return sparseDiag.tensorProduct(other);
  }

  partialTrace(dims: number[], traceOutIndices: number[]): IOperator {
    return new MatrixOperator(this.toMatrix()).partialTrace(dims, traceOutIndices);
  }

  scale(scalar: Complex): IOperator {
    const scaledDiagonal = this.diagonal.map(val => math.multiply(val, scalar) as Complex);
    return new DiagonalOperator(scaledDiagonal);
  }

  add(other: IOperator): IOperator {
    if (other.type === 'diagonal') {
      const otherDiagonal = (other as DiagonalOperator).getDiagonal();
      const sumDiagonal = this.diagonal.map((val, i) => 
        math.add(val, otherDiagonal[i]) as Complex
      );
      return new DiagonalOperator(sumDiagonal);
    }
    
    const { MatrixOperator } = require('./operator');
    return new MatrixOperator(this.toMatrix()).add(other);
  }

  eigenDecompose(): { values: Complex[]; vectors: IOperator[] } {
    const { MatrixOperator } = require('./operator');
    return new MatrixOperator(this.toMatrix()).eigenDecompose();
  }

  norm(): number {
    return Math.sqrt(this.diagonal.reduce((sum, val) => {
      const magnitude = Number(math.abs(val));
      return sum + magnitude * magnitude;
    }, 0));
  }

  isZero(tolerance: number = 1e-12): boolean {
    return this.diagonal.every(val => 
      Math.abs(val.re) < tolerance && Math.abs(val.im) < tolerance
    );
  }

  /**
   * Get diagonal elements
   */
  getDiagonal(): Complex[] {
    return this.diagonal.map(val => math.clone(val));
  }
}

/**
 * Factory function to create identity operator
 */
export function createIdentityOperator(dimension: number): IdentityOperator {
  return new IdentityOperator(dimension);
}

/**
 * Factory function to create diagonal operator
 */
export function createDiagonalOperator(diagonal: Complex[]): DiagonalOperator {
  return new DiagonalOperator(diagonal);
}

/**
 * Check if matrix is diagonal
 */
export function isDiagonalMatrix(matrix: Complex[][], tolerance: number = 1e-12): boolean {
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[i].length; j++) {
      if (i !== j) {
        const element = matrix[i][j];
        if (Math.abs(element.re) > tolerance || Math.abs(element.im) > tolerance) {
          return false;
        }
      }
    }
  }
  return true;
}
