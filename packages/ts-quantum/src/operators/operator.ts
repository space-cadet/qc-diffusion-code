/**
 * Quantum operator implementations using math.js for enhanced numerical stability
 */

import type { Complex, IStateVector, OperatorType, IOperator } from '../core/types';
import { StateVector } from '../states/stateVector';
import { validateMatDims, validateMatchDims, validatePartialTrace } from '../utils/validation';
import { eigenDecomposition } from '../utils/matrixOperations';
import { IdentityOperator, DiagonalOperator, isDiagonalMatrix } from './specialized';
import { SparseOperator } from './sparseOperator';
import { denseToSparse } from './sparse';
import * as math from 'mathjs';

// Define ComplexMatrix type using math.js Complex type
type ComplexMatrix = Complex[][];

// Ensure proper type compatibility with math.js matrix operations
type MathMatrix = math.Matrix;

// Helper function to ensure math.js output is converted to Complex type
function ensureComplex(value: math.MathType): Complex {
  if (typeof value === 'number') {
    return math.complex(value, 0);
  }
  if (math.typeOf(value) === 'Complex') {
    return value as Complex;
  }
  if (typeof value === 'object' && value !== null && 're' in value && 'im' in value) {
    return math.complex((value as any).re, (value as any).im);
  }
  throw new Error(`Cannot convert ${math.typeOf(value)} to Complex`);
}

/**
 * Creates a zero matrix of the specified dimension
 * @param dimension The dimension of the square matrix
 * @returns A dimension x dimension matrix filled with complex zeros
 */
export function createZeroMatrix(dimension: number): Complex[][] {
  if (dimension <= 0 || !Number.isInteger(dimension)) {
    throw new Error('Dimension must be a positive integer');
  }
  
  return Array(dimension).fill(null)
    .map(() => Array(dimension).fill(null)
      .map(() => math.complex(0, 0))
    );
}

/** 
 * Implementation of operator using matrix representation
 */
export class MatrixOperator implements IOperator {
  readonly objectType: 'operator' = 'operator';  // Discriminator property
  readonly dimension: number;
  readonly type: OperatorType;
  private matrix: ComplexMatrix;
  private validateTypeConstraints: boolean;

  constructor(
    matrix: ComplexMatrix, 
    type: OperatorType = 'general', 
    validateTypeConstraints: boolean = true,
    additionalProps: Record<string, any> = {}
  ) {
    validateMatDims(matrix);
    
    const dim = matrix.length;
    // Validate operator type
    if (type !== 'general' && type !== 'unitary' && type !== 'hermitian' && type !== 'projection') {
      throw new Error('Invalid operator type');
    }
    
    this.dimension = dim;
    this.type = type;
    // Deep clone the matrix using math.js
    this.matrix = matrix.map(row => row.map(elem => math.clone(elem)));
    this.validateTypeConstraints = validateTypeConstraints;

    // Add any additional properties
    Object.assign(this, additionalProps);
    
    // Validate type constraints only if requested
    if (validateTypeConstraints) {
      if (type === 'hermitian' && !this.isHermitian()) {
        throw new Error('Matrix is not Hermitian');
      } else if (type === 'projection' && !this.isProjection()) {
        throw new Error('Matrix is not a projection');
      } else if (type === 'unitary') {
        // Direct unitary check without recursion
        const adjointMatrix = Array(this.dimension).fill(null)
          .map((_, i) => Array(this.dimension).fill(null)
            .map((_, j) => math.conj(this.matrix[j][i]) as Complex));

        // Compute product manually without creating new operators
        const productMatrix = Array(dim).fill(null)
          .map(() => Array(dim).fill(null)
            .map(() => math.complex()));

        for (let i = 0; i < dim; i++) {
          for (let j = 0; j < dim; j++) {
            for (let k = 0; k < dim; k++) {
              const term = math.multiply(this.matrix[i][k], adjointMatrix[k][j]);
              productMatrix[i][j] = ensureComplex(math.add(productMatrix[i][j], term));
            }
          }
        }

        // Check if product is identity
        for (let i = 0; i < dim; i++) {
          for (let j = 0; j < dim; j++) {
            const expected = i === j ? math.complex(1, 0) : math.complex(0, 0);
            const diff = math.subtract(productMatrix[i][j], expected);
            if (Number(math.abs(ensureComplex(diff))) > 1e-10) {
              throw new Error('Matrix is not unitary');
            }
          }
        }
      }
    }
  }

  // Add this method to the MatrixOperator class
  /**
   * Returns a string representation of the operator in matrix form
   * @param precision Number of decimal places (default: 3)
   */
  toString(precision: number = 3): string {
    const rows = this.matrix.map(row => {
      return row.map(element => {
        const re = element.re.toFixed(precision);
        const im = element.im.toFixed(precision);
        if (Math.abs(element.im) < Math.pow(10, -precision)) {
          return `${re}`;
        }
        return `${re}${Number(im) >= 0 ? '+' : ''}${im}i`;
      }).join('\t');
    });

    // Find the maximum width of any element for padding
    const maxWidth = Math.max(...rows.map(row => 
      Math.max(...row.split('\t').map(el => el.length))
    ));

    // Add padding and format with brackets
    const paddedRows = rows.map(row => 
      '│ ' + row.split('\t')
        .map(el => el.padStart(maxWidth))
        .join('  ') + ' │'
    );

    // Create top and bottom borders
    const borderLine = '─'.repeat(maxWidth * this.dimension + 2 * this.dimension + 1);
    const topBorder = `┌${borderLine}┐`;
    const bottomBorder = `└${borderLine}┘`;

    return [topBorder, ...paddedRows, bottomBorder].join('\n');
  }

  /**
   * Applies operator to state vector: |ψ'⟩ = O|ψ⟩
   */
  apply(state: IStateVector): StateVector {
    validateMatchDims(state.dimension, this.dimension);

    const newAmplitudes = new Array(this.dimension).fill(null)
      .map(() => math.complex(0, 0));

    // Apply matrix multiplication
    for (let i = 0; i < this.dimension; i++) {
      for (let j = 0; j < this.dimension; j++) {
        const term = math.multiply(this.matrix[i][j], state.amplitudes[j]);
        newAmplitudes[i] = ensureComplex(math.add(newAmplitudes[i], term));
      }
    }

    // Find the index of the non-zero amplitude to determine basis state
    const maxIndex = newAmplitudes.reduce((maxIdx, current, idx, arr) => {
      const currentMag = math.abs(current);
      const maxMag = math.abs(arr[maxIdx]);
      return currentMag > maxMag ? idx : maxIdx;
    }, 0);

    // Determine new basis label based on the operation
    let newBasis = state.basis;
    if (this.dimension === 2) {
      // Single qubit operations
      if (maxIndex === 1) {
        newBasis = '|1⟩';
      } else if (maxIndex === 0) {
        newBasis = '|0⟩';
      }
      // Special case for Hadamard creating superposition
      if (Math.abs(Math.abs(newAmplitudes[0].re) - 1/Math.sqrt(2)) < 1e-10 &&
          Math.abs(Math.abs(newAmplitudes[1].re) - 1/Math.sqrt(2)) < 1e-10) {
        newBasis = newAmplitudes[1].re > 0 ? '|+⟩' : '|-⟩';
      }
    } else if (this.dimension === 4) {
      // Two qubit operations
      const binaryStr = maxIndex.toString(2).padStart(2, '0');
      newBasis = `|${binaryStr}⟩`;
    }

    return new StateVector(this.dimension, newAmplitudes, newBasis);
  }

  /**
   * Composes with another operator: O₁O₂
   */
  compose(other: IOperator): IOperator {
    validateMatchDims(other.dimension, this.dimension);

    // Get matrix representation of the other operator
    const otherMatrix = other.toMatrix();
    
    // Initialize result matrix with zeros
    const resultMatrix = Array(this.dimension).fill(null)
      .map(() => Array(this.dimension).fill(null)
        .map(() => math.complex(0, 0)));

    // Manual matrix multiplication with explicit complex number handling
    for (let i = 0; i < this.dimension; i++) {
      for (let j = 0; j < this.dimension; j++) {
        let sum = math.complex(0, 0);
        for (let k = 0; k < this.dimension; k++) {
          // Ensure proper complex multiplication
          const term = math.multiply(
            math.complex(this.matrix[i][k].re, this.matrix[i][k].im),
            math.complex(otherMatrix[k][j].re, otherMatrix[k][j].im)
          );
          sum = math.add(sum, term) as Complex;
        }
        resultMatrix[i][j] = sum;
      }
    }

    // Determine resulting operator type with proper inheritance
    let resultType: OperatorType = 'general';
    if (this.type === other.type) {
      if (this.type === 'hermitian' || this.type === 'unitary' || this.type === 'projection') {
        resultType = this.type;
      }
    } else if (this.type === 'hermitian' && other.type === 'unitary') {
      resultType = 'hermitian';
    } else if (this.type === 'unitary' && other.type === 'hermitian') {
      resultType = 'hermitian';
    }

    return new MatrixOperator(resultMatrix, resultType);
  }

  /**
   * Returns the adjoint (Hermitian conjugate) of the operator
   */
  adjoint(): IOperator {
    // Initialize adjoint matrix with proper dimensions
    const adjointMatrix = Array(this.dimension).fill(null)
      .map(() => Array(this.dimension).fill(null)
        .map(() => math.complex(0, 0)));

    // Calculate adjoint elements with proper complex conjugate
    for (let i = 0; i < this.dimension; i++) {
      for (let j = 0; j < this.dimension; j++) {
        // Take complex conjugate and transpose
        const elem = this.matrix[j][i];
        adjointMatrix[i][j] = math.complex(elem.re, -elem.im);
      }
    }

    // Determine adjoint type
    let adjointType: OperatorType = 'general';
    if (this.type === 'unitary') adjointType = 'unitary';
    if (this.type === 'hermitian') adjointType = 'hermitian';
    if (this.type === 'projection') adjointType = 'projection';

    // Create adjoint without validation to prevent recursion
    return new MatrixOperator(adjointMatrix, adjointType, false);
  }

  /**
   * Returns matrix representation
   */
  toMatrix(): ComplexMatrix {
    // Create new matrix with explicit positive zeros
  return this.matrix.map(row => 
    row.map(elem => 
      // Ensure positive zero in real and imaginary parts
      math.complex(
        elem.re === 0 ? 0 : elem.re,
        elem.im === 0 ? 0 : elem.im
      )
    )
  );
  }

  /**
   * Checks if matrix is Hermitian (self-adjoint)
   */
  private isHermitian(tolerance: number = 1e-10): boolean {
    // Only need to check upper triangle against lower triangle's conjugate
    for (let i = 0; i < this.dimension; i++) {
      // Check diagonal elements are real
      if (Math.abs(this.matrix[i][i].im) > tolerance) {
        return false;
      }
      
      // Check off-diagonal elements are conjugates
      for (let j = i + 1; j < this.dimension; j++) {
        const upper = this.matrix[i][j];
        const lower = this.matrix[j][i];
        
        // Check if upper[i][j] = conjugate(lower[j][i])
        if (Math.abs(upper.re - lower.re) > tolerance || 
            Math.abs(upper.im + lower.im) > tolerance) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Checks if matrix is unitary
   */
  private isUnitary(tolerance: number = 1e-10): boolean {
    // Convert to math.js matrix
    const matA = math.matrix(this.matrix);
    
    // Compute U†U
    const matAH = math.transpose(math.conj(matA));
    const product = math.multiply(matA, matAH);
    
    // Create identity matrix of same size
    const identity = math.identity(this.dimension, 'dense');
    
    // Subtract identity and check if difference is within tolerance
    const diff = math.subtract(product, identity);
    const maxDiffValue = math.max(math.abs(diff).valueOf() as number[]);
    
    return maxDiffValue < tolerance;
  }

  /**
   * Checks if matrix is a projection operator (P² = P)
   */
  private isProjection(tolerance: number = 1e-10): boolean {
    // Convert to math.js matrix
    const matP = math.matrix(this.matrix);
    
    // Compute P²
    const matP2 = math.multiply(matP, matP);
    
    // Subtract P² - P and check if difference is within tolerance
    const diff = math.subtract(matP2, matP);
    const maxDiffValue = math.max(math.abs(diff).valueOf() as number[]);
    
    return maxDiffValue < tolerance;
  }

  /**
   * Creates tensor product with another operator
   */
  tensorProduct(other: IOperator): IOperator {
    const otherMatrix = other.toMatrix();
    const newDim = this.dimension * other.dimension;
    const resultMatrix = Array(newDim).fill(null)
      .map(() => Array(newDim).fill(null)
        .map(() => math.complex()));

    // Compute tensor product matrix elements
    for (let i1 = 0; i1 < this.dimension; i1++) {
      for (let j1 = 0; j1 < this.dimension; j1++) {
        for (let i2 = 0; i2 < other.dimension; i2++) {
          for (let j2 = 0; j2 < other.dimension; j2++) {
            const i = i1 * other.dimension + i2;
            const j = j1 * other.dimension + j2;
            resultMatrix[i][j] = ensureComplex(math.multiply(
              this.matrix[i1][j1],
              otherMatrix[i2][j2]
            ));
          }
        }
      }
    }

    // Determine resulting operator type
    let resultType: OperatorType = 'general';
    if (this.type === 'unitary' && other.type === 'unitary') {
      resultType = 'unitary';
    }

    return new MatrixOperator(resultMatrix, resultType);
  }

  /**
   * Creates the identity operator of given dimension
   */
  static identity(dimension: number): IOperator {
    return new IdentityOperator(dimension);
  }

  /**
   * Creates a zero operator of given dimension
   */
  static zero(dimension: number): MatrixOperator {
    const matrix = Array(dimension).fill(null)
      .map(() => Array(dimension).fill(null)
        .map(() => math.complex(0, 0))
      );
    return new MatrixOperator(matrix);
  }

  /**
   * Create optimized operator based on matrix structure
   */
  static createOptimized(matrix: ComplexMatrix, type?: OperatorType): IOperator {
    const dimension = matrix.length;
    
    // Check for identity matrix
    let isIdentity = true;
    for (let i = 0; i < dimension && isIdentity; i++) {
      for (let j = 0; j < dimension && isIdentity; j++) {
        const expected = i === j ? 1 : 0;
        const element = matrix[i][j];
        if (Math.abs(element.re - expected) > 1e-12 || Math.abs(element.im) > 1e-12) {
          isIdentity = false;
        }
      }
    }
    if (isIdentity) {
      return new IdentityOperator(dimension);
    }
    
    // Check for diagonal matrix
    if (isDiagonalMatrix(matrix)) {
      const diagonal = matrix.map((row, i) => math.clone(row[i]));
      return new DiagonalOperator(diagonal);
    }
    
    // Check for high sparsity (e.g., density < 10%)
    const totalElements = dimension * dimension;
    let nonZeroCount = 0;
    for (let i = 0; i < dimension; i++) {
      for (let j = 0; j < dimension; j++) {
        if (math.abs(matrix[i][j]) as unknown as number > 1e-12) {
          nonZeroCount++;
        }
      }
    }
    
    if (nonZeroCount / totalElements < 0.1) {
      return new SparseOperator(denseToSparse(matrix), type);
    }
    
    // Default to standard matrix operator
    return new MatrixOperator(matrix, type);
  }

  /**
   * Scales operator by a complex number
   */
  scale(scalar: Complex): MatrixOperator {
    const scaledMatrix = this.matrix.map(row => 
      row.map(elem => ensureComplex(math.multiply(elem, scalar)))
    );
    return new MatrixOperator(scaledMatrix);
  }

  /**
   * Adds this operator with another operator
   */
  add(other: IOperator): MatrixOperator {
    validateMatchDims(other.dimension, this.dimension);

    const otherMatrix = other.toMatrix();
    const sumMatrix = Array(this.dimension).fill(null)
      .map((_, i) => Array(this.dimension).fill(null)
        .map((_, j) => math.add(
          math.complex(this.matrix[i][j].re, this.matrix[i][j].im),
          math.complex(otherMatrix[i][j].re, otherMatrix[i][j].im)
        ) as Complex)
      );

    return new MatrixOperator(sumMatrix);
  }

  /**
   * Performs partial trace operation over specified quantum subsystems
   * 
   * In quantum mechanics, the partial trace is an operation that reduces the dimensionality of
   * a quantum system by "tracing out" (removing) certain subsystems. This is a fundamental
   * operation used to obtain the reduced density matrix of a composite system.
   * 
   * @example
   * // For a 4-dimensional system (2⊗2) representing two qubits:
   * // Get reduced density matrix by tracing out the second qubit
   * const reducedOperator = operator.partialTrace([2, 2], [1]);
   * 
   * @example
   * // For an 8-dimensional system (2⊗2⊗2) representing three qubits:
   * // Trace out the first and third qubits
   * const reducedOperator = operator.partialTrace([2, 2, 2], [0, 2]);
   * 
   * @param dims - Array of dimensions for each subsystem. Product must equal this.dimension
   * @param traceOutIndices - Array of indices indicating which subsystems to trace out
   * @returns A new operator representing the reduced system after partial trace
   * @throws Error if dimensions are invalid or indices are out of bounds
   */
  partialTrace(dims: number[], traceOutIndices: number[]): IOperator {
    // Use standardized validation
    validatePartialTrace(dims, this.dimension, traceOutIndices);

    // Calculate remaining dimension after trace
    const remainingDim = dims.filter((_, i) => !traceOutIndices.includes(i))
      .reduce((a, b) => a * b, 1);

    // Initialize result matrix
    const resultMatrix = createZeroMatrix(remainingDim);
    
    // Array(remainingDim).fill(null)
    //   .map(() => Array(remainingDim).fill(null)
    //     .map(() => math.complex(0, 0)));

    // Perform partial trace
    const traceRange = Array(this.dimension).fill(0)
      .map((_, i) => i);

    // Implementation of partial trace operation
    for (let i = 0; i < remainingDim; i++) {
      for (let j = 0; j < remainingDim; j++) {
        for (const k of traceRange) {
          // Map indices to multi-dimensional coordinates
          const iCoords = indexToCoords(i, dims.filter((_, idx) => !traceOutIndices.includes(idx)));
          const jCoords = indexToCoords(j, dims.filter((_, idx) => !traceOutIndices.includes(idx)));
          const kCoords = indexToCoords(k, dims.filter((_, idx) => traceOutIndices.includes(idx)));
          
          // Combine coordinates
          const fullICoords = combineCoords(iCoords, kCoords, traceOutIndices);
          const fullJCoords = combineCoords(jCoords, kCoords, traceOutIndices);
          
          // Map back to flat indices
          const fullI = coordsToIndex(fullICoords, dims);
          const fullJ = coordsToIndex(fullJCoords, dims);
          
          // Add to result using math.js
          resultMatrix[i][j] = ensureComplex(math.add(
            resultMatrix[i][j],
            this.matrix[fullI][fullJ]
          ));
        }
      }
    }

    return new MatrixOperator(resultMatrix);
  }

  /**
   * Returns eigenvalues and eigenvectors of the operator
   * Only works for Hermitian operators
   */
  eigenDecompose(): { values: Complex[]; vectors: MatrixOperator[] } {
    const { values, vectors } = eigenDecomposition(this.matrix, { computeEigenvectors: true });
    
    // Create operators from eigenvectors
    if (!vectors || vectors.length === 0) {
      throw new Error('No eigenvectors found');
    }
    const vectorOperators = vectors.map(v => {
      // Create full matrix for the eigenvector operator
      const matrix: ComplexMatrix = Array(this.dimension).fill(null)
        .map((_, i) => Array(this.dimension).fill(null)
          .map((_, j) => i === j ? math.clone(v[i]) : math.complex(0, 0)));
      
      return new MatrixOperator(matrix, 'general');
    });
    
    return {
      values: values.map(v => math.clone(v)),
      vectors: vectorOperators
    };
  }

  /**
   * Projects onto eigenspace with given eigenvalue
   */
  projectOntoEigenspace(eigenvalue: Complex, tolerance: number = 1e-10): MatrixOperator {
    const { values, vectors } = this.eigenDecompose();
    
    // Find eigenvectors for this eigenvalue
    const matchingVectors = vectors.filter((_, i) => 
      Math.abs(values[i].re - eigenvalue.re) < tolerance &&
      Math.abs(values[i].im - eigenvalue.im) < tolerance
    );

    if (matchingVectors.length === 0) {
      throw new Error('No eigenvectors found for given eigenvalue');
    }

    // Construct projection operator
    return matchingVectors.reduce((sum, vector) => {
      const vectorMatrix = vector.toMatrix()[0]; // Get the first row since vector is 1xN matrix
      const proj = new MatrixOperator([vectorMatrix], 'projection');
      return sum ? sum.add(proj) : proj;
    });
  }

  /**
   * Calculates the operator norm (Frobenius norm)
   */
  norm(): number {
    let sum = 0;
    for (let i = 0; i < this.dimension; i++) {
      for (let j = 0; j < this.dimension; j++) {
        const element = this.matrix[i][j];
        sum += element.re * element.re + element.im * element.im;
      }
    }
    return Math.sqrt(sum);
  }

  /**
   * Tests whether the operator is identically zero
   * @param tolerance Numerical tolerance for zero comparison (default: 1e-12)
   * @returns true if all matrix elements are within tolerance of zero
   */
  isZero(tolerance: number = 1e-12): boolean {
    for (let i = 0; i < this.dimension; i++) {
      for (let j = 0; j < this.dimension; j++) {
        const element = this.matrix[i][j];
        if (Math.abs(element.re) > tolerance || Math.abs(element.im) > tolerance) {
          return false;
        }
      }
    }
    return true;
  }
}

// Helper functions for partial trace implementation
function indexToCoords(index: number, dims: number[]): number[] {
  const coords: number[] = [];
  let remainder = index;
  for (let i = dims.length - 1; i >= 0; i--) {
    coords.unshift(remainder % dims[i]);
    remainder = Math.floor(remainder / dims[i]);
  }
  return coords;
}

function coordsToIndex(coords: number[], dims: number[]): number {
  let index = 0;
  let factor = 1;
  for (let i = coords.length - 1; i >= 0; i--) {
    index += coords[i] * factor;
    factor *= dims[i];
  }
  return index;
}

function combineCoords(coords1: number[], coords2: number[], traceIndices: number[]): number[] {
  const result: number[] = [];
  let i1 = 0;
  let i2 = 0;
  for (let i = 0; i < coords1.length + coords2.length; i++) {
    if (traceIndices.includes(i)) {
      result.push(coords2[i2++]);
    } else {
      result.push(coords1[i1++]);
    }
  }
  return result;
}
