/**
 * Sparse matrix operator implementation
 */

import type { 
  Complex, 
  IStateVector, 
  OperatorType, 
  IOperator
} from '../core/types';
import { StateVector } from '../states/stateVector';
import type {
  ISparseMatrix
} from '../core/types';
import { 
  sparseVectorMultiply, 
  sparseMatrixMultiply, 
  sparseTranspose, 
  sparseConjugateTranspose,
  sparseToDense,
  sparseNorm,
  isIdentityMatrix,
  createSparseMatrix,
  setSparseEntry,
  getSparseEntry
} from './sparse';
import { validateMatchDims } from '../utils/validation';
import * as math from 'mathjs';

export class SparseOperator implements IOperator {
  readonly objectType: 'operator' = 'operator';
  readonly dimension: number;
  readonly type: OperatorType;
  private matrix: ISparseMatrix;

  constructor(
    matrix: ISparseMatrix,
    type: OperatorType = 'general'
  ) {
    this.dimension = matrix.rows;
    this.type = type;
    this.matrix = matrix;
  }

  /**
   * Applies operator to state vector: |ψ'⟩ = O|ψ⟩
   * O(nnz) complexity
   */
  apply(state: IStateVector): StateVector {
    validateMatchDims(state.dimension, this.dimension);
    const resultAmplitudes = sparseVectorMultiply(this.matrix, state.getAmplitudes());
    return new StateVector(this.dimension, resultAmplitudes, state.basis);
  }

  /**
   * Performs partial trace operation over specified quantum subsystems
   */
  partialTrace(dims: number[], traceOutIndices: number[]): IOperator {
    // Fallback to dense for complex partial trace logic for now
    return new MatrixOperator(this.toMatrix()).partialTrace(dims, traceOutIndices);
  }

  /**
   * Scales operator by a complex number
   */
  scale(scalar: Complex): IOperator {
    const scaledMatrix = createSparseMatrix(this.matrix.rows, this.matrix.cols);
    for (const entry of this.matrix.entries) {
      setSparseEntry(
        scaledMatrix, 
        entry.row, 
        entry.col, 
        math.multiply(entry.value, scalar) as unknown as Complex
      );
    }
    return new SparseOperator(scaledMatrix, this.type);
  }

  /**
   * Adds this operator with another operator
   */
  add(other: IOperator): IOperator {
    validateMatchDims(other.dimension, this.dimension);
    
    if (other instanceof SparseOperator) {
      const resultMatrix = createSparseMatrix(this.dimension, this.dimension);
      // Copy current entries
      for (const entry of this.matrix.entries) {
        setSparseEntry(resultMatrix, entry.row, entry.col, entry.value);
      }
      // Add other entries
      const otherMatrix = other.getSparseMatrix();
      for (const entry of otherMatrix.entries) {
        const existing = getSparseEntry(resultMatrix, entry.row, entry.col);
        setSparseEntry(resultMatrix, entry.row, entry.col, math.add(existing, entry.value) as Complex);
      }
      return new SparseOperator(resultMatrix);
    }

    return new MatrixOperator(this.toMatrix()).add(other);
  }

  /**
   * Returns eigenvalues and eigenvectors of the operator
   */
  eigenDecompose(): { values: Complex[]; vectors: IOperator[] } {
    return new MatrixOperator(this.toMatrix()).eigenDecompose();
  }

  /**
   * Composes with another operator: O₁O₂
   */
  compose(other: IOperator): IOperator {
    validateMatchDims(other.dimension, this.dimension);
    
    // If other is also sparse, use sparse multiplication
    if (other instanceof SparseOperator) {
      const resultMatrix = sparseMatrixMultiply(this.matrix, other.getSparseMatrix());
      return new SparseOperator(resultMatrix, this.type === other.type ? this.type : 'general');
    }

    // Fallback to dense for mixed types for now
    const denseResult = new MatrixOperator(this.toMatrix()).compose(other);
    return denseResult;
  }

  /**
   * Returns the adjoint (Hermitian conjugate) of the operator
   */
  adjoint(): IOperator {
    const adjointMatrix = sparseConjugateTranspose(this.matrix);
    return new SparseOperator(adjointMatrix, this.type);
  }

  /**
   * Returns dense matrix representation
   */
  toMatrix(): Complex[][] {
    return sparseToDense(this.matrix);
  }

  /**
   * Gets the underlying sparse matrix
   */
  getSparseMatrix(): ISparseMatrix {
    return this.matrix;
  }

  /**
   * Computes tensor product with another operator
   */
  tensorProduct(other: IOperator): IOperator {
    // If other is sparse, we can implement a sparse tensor product
    // For now, let's keep it simple and implement the logic
    const otherDim = other.dimension;
    const newDim = this.dimension * otherDim;
    const result = createSparseMatrix(newDim, newDim);
    const otherMat = other.toMatrix();

    for (const entry of this.matrix.entries) {
      for (let i2 = 0; i2 < otherDim; i2++) {
        for (let j2 = 0; j2 < otherDim; j2++) {
          const val = math.multiply(entry.value, otherMat[i2][j2]) as unknown as Complex;
          if (math.abs(val) as unknown as number > 1e-12) {
            setSparseEntry(
              result,
              entry.row * otherDim + i2,
              entry.col * otherDim + j2,
              val
            );
          }
        }
      }
    }

    return new SparseOperator(result);
  }

  norm(): number {
    return sparseNorm(this.matrix);
  }

  isZero(tolerance: number = 1e-12): boolean {
    return this.matrix.nnz === 0;
  }
}

// Circular dependency fix
import { MatrixOperator } from './operator';
