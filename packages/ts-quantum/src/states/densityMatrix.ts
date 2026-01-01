/**
 * Density matrix implementation for mixed quantum states and operations
 */

import { Complex, IStateVector, OperatorType, IDensityMatrix, IQuantumChannel, IOperator } from '../core/types';
import { MatrixOperator } from '../operators/operator';
import { multiplyMatrices } from '../utils/matrixOperations';
import * as math from 'mathjs';
import { StateVector } from './stateVector';
import { normalizeMatrix } from '../utils/matrixOperations';

/**
 * Implementation of density matrix operations
 */
export class DensityMatrixOperator implements IDensityMatrix {
  readonly objectType: 'operator' = 'operator';  // Inherits from IOperator
  readonly dimension: number;
  readonly type: OperatorType = 'hermitian';
  private operator: MatrixOperator;

  constructor(matrix: Complex[][]) {
    // Validate matrix dimensions
    if (!matrix || matrix.length === 0) {
      throw new Error('Empty matrix provided');
    }
    
    const dim = matrix.length;
    if (!matrix.every(row => row.length === dim)) {
      throw new Error('Matrix must be square');
    }

    // Normalize matrix and create operator
    const normalizedMatrix = normalizeMatrix(matrix);
    this.operator = new MatrixOperator(normalizedMatrix, 'hermitian');
    this.dimension = dim;

    // Validate trace = 1
    const tr = this.trace();
    // console.log("Trace: ", tr);
    // console.log("Trace real part: ", tr.re);
    // console.log("Trace imaginary part: ", tr.im);
    if (Math.abs(tr.re - 1) > 1e-10 || Math.abs(tr.im) > 1e-10) {
      throw new Error('Density matrix must have trace 1');
    }

    // Validate positive semidefinite (simplified check via purity ≤ 1)
    if (this.purity() > 1 + 1e-10) {
      throw new Error('Density matrix must be positive semidefinite');
    }
  }

  /**
   * Applies density matrix to state vector
   */
  apply(state: IStateVector): StateVector {
    return this.operator.apply(state);
  }

  /**
   * Composes with another operator
   */
  compose(other: IOperator): IOperator {
    return this.operator.compose(other);
  }

  /**
   * Returns adjoint (same as original for density matrix)
   */
  adjoint(): IDensityMatrix {
    return this;  // Density matrices are Hermitian
  }

  /**
   * Returns matrix representation
   */
  toMatrix(): Complex[][] {
    return this.operator.toMatrix();
  }

  /**
   * Calculates trace of density matrix
   */
  trace(): Complex {
    const matrix = this.toMatrix();
    return matrix.reduce((sum, row, i) => 
      math.add(sum, row[i]) as Complex, 
      math.complex(0, 0)
    );
  }

  /**
   * Calculates purity Tr(ρ²)
   */
  purity(): number {
    // Calculate Tr(ρ²) by squaring the matrix and taking trace
    const matrix = this.toMatrix();
    const matSquared = multiplyMatrices(matrix, matrix);
    
    // Sum diagonal elements
    let trace = math.complex(0, 0);
    for (let i = 0; i < this.dimension; i++) {
      trace = math.add(trace, matSquared[i][i]) as Complex;
    }
    
    // The purity should be real for a valid density matrix
    return trace.re;
  }

  /**
   * Calculates von Neumann entropy -Tr(ρ ln ρ)
   */
  vonNeumannEntropy(): number {
    const { values } = this.eigenDecompose();
    let entropy = 0;
    
    for (const value of values) {
      if (value.re > 1e-10) {  // Only consider non-zero eigenvalues
        entropy -= value.re * Math.log(value.re);
      }
    }
    
    return entropy;
  }

  /**
   * Performs partial trace over specified subsystems
   */
  partialTrace(dims: number[], traceOutIndices: number[]): IOperator {
    return this.operator.partialTrace(dims, traceOutIndices);
  }

  /**
   * Scales density matrix by a complex number
   */
  scale(scalar: Complex): IOperator {
    return this.operator.scale(scalar);
  }

  /**
   * Adds this density matrix with another operator
   */
  add(other: IOperator): IOperator {
    return this.operator.add(other);
  }

  /**
   * Returns eigenvalues and eigenvectors
   */
  eigenDecompose(): { values: Complex[]; vectors: IOperator[] } {
    return this.operator.eigenDecompose();
  }

  /**
   * Creates density matrix from pure state
   */
  static fromPureState(state: IStateVector): IDensityMatrix {
    const dim = state.dimension;
    const matrix = Array(dim).fill(null).map(() => 
      Array(dim).fill(null).map(() => math.complex(0, 0))
    );

    // Compute |ψ⟩⟨ψ|
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        matrix[i][j] = math.multiply(
          state.amplitudes[i],
          math.conj(state.amplitudes[j])
        ) as Complex;
      }
    }

    return new DensityMatrixOperator(matrix);
  }

  /**
   * Creates density matrix from mixed state
   */
  static mixedState(states: IStateVector[], probabilities: number[]): IDensityMatrix {
    if (states.length !== probabilities.length) {
      throw new Error('Number of states must match number of probabilities');
    }

    if (Math.abs(probabilities.reduce((a, b) => a + b, 0) - 1) > 1e-10) {
      throw new Error('Probabilities must sum to 1');
    }

    const dim = states[0].dimension;
    if (!states.every(s => s.dimension === dim)) {
      throw new Error('All states must have same dimension');
    }

    // Compute Σᵢ pᵢ|ψᵢ⟩⟨ψᵢ|
    const matrix = Array(dim).fill(null).map(() => 
      Array(dim).fill(null).map(() => math.complex(0, 0))
    );

    for (let k = 0; k < states.length; k++) {
      const state = states[k];
      const prob = probabilities[k];

      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
          const term = math.multiply(
            math.multiply(
              state.amplitudes[i],
              math.conj(state.amplitudes[j])
            ) as Complex,
            math.complex(prob, 0)
          ) as Complex;
          matrix[i][j] = math.add(matrix[i][j], term) as Complex;
        }
      }
    }

    return new DensityMatrixOperator(matrix);
  }

  /**
   * Returns tensor product with another operator
   */
  tensorProduct(other: IOperator): IOperator {
    return this.operator.tensorProduct(other);
  }

  /**
   * Calculates the operator norm
   */
  norm(): number {
    return this.operator.norm();
  }

  /**
   * Tests whether the density matrix is identically zero
   */
  isZero(tolerance?: number): boolean {
    return this.operator.isZero(tolerance);
  }
}

/**
 * Implementation of quantum channels using Kraus operators
 */
export class KrausChannel implements IQuantumChannel {
  constructor(private krausOperators: IOperator[]) {
    // Validate non-empty array of operators
    if (!krausOperators || krausOperators.length === 0) {
      throw new Error('At least one Kraus operator is required');
    }

    // Validate completeness relation Σᵢ Eᵢ†Eᵢ = I
    const dim = krausOperators[0].dimension;
    if (!krausOperators.every(op => op.dimension === dim)) {
      throw new Error('All Kraus operators must have same dimension');
    }

    // Check completeness relation
    const sum = krausOperators.reduce((sum, Ei) => {
      const EiDagger = Ei.adjoint();
      return addOperators(sum, EiDagger.compose(Ei));
    }, createZeroOperator(dim));

    const identity = createIdentityOperator(dim);
    const diff = subtractOperators(sum, identity);
    
    if (!diff.isZero()) {
      throw new Error('Kraus operators must satisfy completeness relation');
    }
  }

  public getOperators(): IOperator[] {
    return [...this.krausOperators];
  }

  apply(state: IDensityMatrix): IDensityMatrix {
    const dim = this.krausOperators[0].dimension;
    const result = Array(dim).fill(null).map(() => 
      Array(dim).fill(null).map(() => math.complex(0, 0))
    );

    // Apply channel: ρ' = Σᵢ EᵢρEᵢ†
    for (const Ei of this.krausOperators) {
      const EiDagger = Ei.adjoint();
      const term = Ei.compose(state).compose(EiDagger);
      const termMatrix = term.toMatrix();

      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
          result[i][j] = math.add(result[i][j], termMatrix[i][j]) as Complex;
        }
      }
    }

    return new DensityMatrixOperator(result);
  }
}

// Helper functions for quantum channel creation

/**
 * Creates a depolarizing channel
 * For qubits: ρ → (1-p)ρ + p/3(XρX + YρY + ZρZ)
 */
export function createDepolarizingChannel(dimension: number, p: number): IQuantumChannel {
  if (p < 0 || p > 1) {
    throw new Error('Probability must be between 0 and 1');
  }

  if (dimension !== 2) {
    throw new Error('Depolarizing channel currently only implemented for qubits (dimension=2)');
  }

  // Kraus operators for depolarizing channel
  const krausOperators: IOperator[] = [];

  // E0 = √(1-p) * I
  const E0Matrix = [
    [math.complex(Math.sqrt(1 - p), 0), math.complex(0, 0)],
    [math.complex(0, 0), math.complex(Math.sqrt(1 - p), 0)]
  ];
  krausOperators.push(new MatrixOperator(E0Matrix));

  // E1 = √(p/3) * X
  const sqrt_p_3 = Math.sqrt(p / 3);
  const E1Matrix = [
    [math.complex(0, 0), math.complex(sqrt_p_3, 0)],
    [math.complex(sqrt_p_3, 0), math.complex(0, 0)]
  ];
  krausOperators.push(new MatrixOperator(E1Matrix));

  // E2 = √(p/3) * Y
  const E2Matrix = [
    [math.complex(0, 0), math.complex(0, -sqrt_p_3)],
    [math.complex(0, sqrt_p_3), math.complex(0, 0)]
  ];
  krausOperators.push(new MatrixOperator(E2Matrix));

  // E3 = √(p/3) * Z
  const E3Matrix = [
    [math.complex(sqrt_p_3, 0), math.complex(0, 0)],
    [math.complex(0, 0), math.complex(-sqrt_p_3, 0)]
  ];
  krausOperators.push(new MatrixOperator(E3Matrix));

  return new KrausChannel(krausOperators);
}

/**
 * Creates an amplitude damping channel
 * Models energy decay: |1⟩ → |0⟩ with probability γ
 */
export function createAmplitudeDampingChannel(gamma: number): IQuantumChannel {
  if (gamma < 0 || gamma > 1) {
    throw new Error('Damping parameter must be between 0 and 1');
  }

  // Kraus operators for amplitude damping
  const krausOperators: IOperator[] = [];

  // E0 = |0⟩⟨0| + √(1-γ)|1⟩⟨1|
  const E0Matrix = [
    [math.complex(1, 0), math.complex(0, 0)],
    [math.complex(0, 0), math.complex(Math.sqrt(1 - gamma), 0)]
  ];
  krausOperators.push(new MatrixOperator(E0Matrix));

  // E1 = √γ|0⟩⟨1|
  const E1Matrix = [
    [math.complex(0, 0), math.complex(Math.sqrt(gamma), 0)],
    [math.complex(0, 0), math.complex(0, 0)]
  ];
  krausOperators.push(new MatrixOperator(E1Matrix));

  return new KrausChannel(krausOperators);
}

/**
 * Creates a phase damping channel
 * Models pure dephasing without energy loss
 */
export function createPhaseDampingChannel(gamma: number): IQuantumChannel {
  if (gamma < 0 || gamma > 1) {
    throw new Error('Damping parameter must be between 0 and 1');
  }

  // Kraus operators for phase damping
  const krausOperators: IOperator[] = [];

  // E0 = |0⟩⟨0| + √(1-γ)|1⟩⟨1|
  const E0Matrix = [
    [math.complex(1, 0), math.complex(0, 0)],
    [math.complex(0, 0), math.complex(Math.sqrt(1 - gamma), 0)]
  ];
  krausOperators.push(new MatrixOperator(E0Matrix));

  // E1 = √γ|1⟩⟨1|
  const E1Matrix = [
    [math.complex(0, 0), math.complex(0, 0)],
    [math.complex(0, 0), math.complex(Math.sqrt(gamma), 0)]
  ];
  krausOperators.push(new MatrixOperator(E1Matrix));

  return new KrausChannel(krausOperators);
}

/**
 * Creates a bit flip channel
 * Applies X gate with probability p: ρ → (1-p)ρ + pXρX
 */
export function createBitFlipChannel(p: number): IQuantumChannel {
  if (p < 0 || p > 1) {
    throw new Error('Probability must be between 0 and 1');
  }

  // Kraus operators for bit flip channel
  const krausOperators: IOperator[] = [];

  // E0 = √(1-p) * I
  const E0Matrix = [
    [math.complex(Math.sqrt(1 - p), 0), math.complex(0, 0)],
    [math.complex(0, 0), math.complex(Math.sqrt(1 - p), 0)]
  ];
  krausOperators.push(new MatrixOperator(E0Matrix));

  // E1 = √p * X
  const sqrtP = Math.sqrt(p);
  const E1Matrix = [
    [math.complex(0, 0), math.complex(sqrtP, 0)],
    [math.complex(sqrtP, 0), math.complex(0, 0)]
  ];
  krausOperators.push(new MatrixOperator(E1Matrix));

  return new KrausChannel(krausOperators);
}

/**
 * Creates a phase flip channel
 * Applies Z gate with probability p: ρ → (1-p)ρ + pZρZ
 */
export function createPhaseFlipChannel(p: number): IQuantumChannel {
  if (p < 0 || p > 1) {
    throw new Error('Probability must be between 0 and 1');
  }

  // Kraus operators for phase flip channel
  const krausOperators: IOperator[] = [];

  // E0 = √(1-p) * I
  const E0Matrix = [
    [math.complex(Math.sqrt(1 - p), 0), math.complex(0, 0)],
    [math.complex(0, 0), math.complex(Math.sqrt(1 - p), 0)]
  ];
  krausOperators.push(new MatrixOperator(E0Matrix));

  // E1 = √p * Z
  const sqrtP = Math.sqrt(p);
  const E1Matrix = [
    [math.complex(sqrtP, 0), math.complex(0, 0)],
    [math.complex(0, 0), math.complex(-sqrtP, 0)]
  ];
  krausOperators.push(new MatrixOperator(E1Matrix));

  return new KrausChannel(krausOperators);
}

// Helper functions for quantum operations

function addOperators(a: IOperator, b: IOperator): IOperator {
  if (a.dimension !== b.dimension) {
    throw new Error('Operator dimensions do not match');
  }

  const matrixA = a.toMatrix();
  const matrixB = b.toMatrix();
  const sumMatrix = matrixA.map((row, i) =>
    row.map((elem, j) => math.add(elem, matrixB[i][j]) as Complex)
  );

  return new MatrixOperator(sumMatrix);
}

function subtractOperators(a: IOperator, b: IOperator): IOperator {
  if (a.dimension !== b.dimension) {
    throw new Error('Operator dimensions do not match');
  }

  const matrixA = a.toMatrix();
  const matrixB = b.toMatrix();
  const diffMatrix = matrixA.map((row, i) =>
    row.map((elem, j) => math.subtract(elem, matrixB[i][j]) as Complex)
  );

  return new MatrixOperator(diffMatrix);
}

function createIdentityOperator(dimension: number): IOperator {
  const matrix = Array(dimension).fill(null).map((_, i) => 
    Array(dimension).fill(null).map((_, j) => 
      i === j ? math.complex(1, 0) : math.complex(0, 0)
    )
  );
  return new MatrixOperator(matrix, 'unitary');
}

function createZeroOperator(dimension: number): IOperator {
  const matrix = Array(dimension).fill(null).map(() => 
    Array(dimension).fill(null).map(() => math.complex(0, 0))
  );
  return new MatrixOperator(matrix);
}

// Note: Entanglement measures have been moved to information.ts
// This allows better organization of quantum information metrics

// Re-export entanglement measures from information.ts
export { traceFidelity, concurrence, negativity } from '../utils/information';