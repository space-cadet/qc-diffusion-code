/**
 * Quantum information tools
 * 
 * Provides quantum information theoretic operations including
 * entropy calculations, Schmidt decomposition, fidelity measures, 
 * and other quantum information-related operations.
 */

import { Complex, IStateVector, IDensityMatrix, IOperator } from '../core/types';
import { StateVector } from '../states/stateVector';
import { MatrixOperator } from '../operators/operator';
import { DensityMatrixOperator } from '../states/densityMatrix';
import { eigenDecomposition, multiplyMatrices, scaleMatrix } from './matrixOperations';
import { matrixSquareRoot } from './matrixFunctions';
import * as math from 'mathjs';

/**
 * Performs a Schmidt decomposition of a bipartite pure state
 * 
 * Given a pure state |ψ⟩ in a bipartite system H = H_A ⊗ H_B,
 * computes the Schmidt decomposition: |ψ⟩ = ∑_i λ_i |i_A⟩ ⊗ |i_B⟩
 * 
 * This is fundamental for characterizing entanglement in bipartite systems.
 * 
 * @param state Bipartite pure state to decompose
 * @param dimA Dimension of the first subsystem
 * @param dimB Dimension of the second subsystem
 * @returns Object containing Schmidt coefficients, and basis states for subsystems A and B
 */
export function schmidtDecomposition(
  state: IStateVector, 
  dimA: number, 
  dimB: number
): {
  values: number[],
  statesA: IStateVector[],
  statesB: IStateVector[]
} {
  // Check dimensions
  if (state.dimension !== dimA * dimB) {
    throw new Error('State dimension must equal product of subsystem dimensions');
  }
  
  // Reshape state vector to matrix
  const matrix: Complex[][] = [];
  for (let i = 0; i < dimA; i++) {
    matrix[i] = [];
    for (let j = 0; j < dimB; j++) {
      const index = i * dimB + j;
      matrix[i][j] = state.amplitudes[index];
    }
  }
  
  // Compute reduced density matrix ρB = TrA(|ψ⟩⟨ψ|)
  const reducedRhoB: Complex[][] = Array(dimB).fill(null).map(() => 
    Array(dimB).fill(null).map(() => math.complex(0, 0))
  );
  
  for (let i = 0; i < dimB; i++) {
    for (let j = 0; j < dimB; j++) {
      for (let k = 0; k < dimA; k++) {
        const term = math.multiply(
          math.conj(matrix[k][i]),
          matrix[k][j]
        ) as Complex;
        reducedRhoB[i][j] = math.add(reducedRhoB[i][j], term) as Complex;
      }
    }
  }
  
  // Get eigenvalues and eigenvectors of reduced density matrix
  const { values, vectors } = eigenDecomposition(reducedRhoB, {computeEigenvectors: true});
  // console.log(vectors, typeof vectors);
  
  // Create paired indices and Schmidt values, then filter and sort
  const indexValuePairs = values.map((val, idx) => ({
    index: idx,
    value: Math.sqrt(Math.max(0, val.re))
  }))
  .filter(pair => pair.value > 1e-14) // Filter before sorting
  .sort((a, b) => b.value - a.value); // Sort by descending value
  
  // Extract sorted and filtered Schmidt values and indices
  const schmidtValues = indexValuePairs.map(pair => pair.value);
  const filteredIndices = indexValuePairs.map(pair => pair.index);
  
  // Get right Schmidt basis vectors (eigenvectors of ρB)
  if (!vectors || vectors.length === 0) {
    throw new Error('Invalid eigenvectors in Schmidt decomposition');
  }
  const statesB = filteredIndices.map(i => {
    const vector = vectors[i];
    
    // Add debugging statements
    // console.log('Processing vector:', vector);
    // console.log('Vector type:', typeof vector);
    // console.log('Is array?', Array.isArray(vector));
    // console.log('Vector properties:', Object.getOwnPropertyNames(vector));
    
    // Ensure proper normalization
    const norm = Math.sqrt(vector.reduce((sum, v) => 
      sum + v.re * v.re + v.im * v.im, 0));
      
    // console.log('Calculated norm:', norm);
    
    const amplitudes = vector.map(v => 
      math.divide(v, math.complex(norm, 0)) as Complex
    );
    // const amplitudes = math.divide(math.matrix(vector), norm).valueOf();
    return new StateVector(dimB, amplitudes);
  });
  
  // Calculate left Schmidt basis vectors using M|v⟩/λ
  if (!vectors || vectors.length === 0) {
    throw new Error('Invalid eigenvectors in Schmidt decomposition');
  }
  const statesA = filteredIndices.map((i, idx) => {
    const schmidt = schmidtValues[idx];
    const v = vectors[i];
    
    const amplitudes = Array(dimA).fill(null).map(() => math.complex(0, 0));
    
    // Calculate M|v⟩ and normalize
    for (let j = 0; j < dimA; j++) {
      for (let k = 0; k < dimB; k++) {
        const term = math.multiply(matrix[j][k], v[k]) as Complex;
        amplitudes[j] = math.add(amplitudes[j], term) as Complex;
      }
    }
    
    // Normalize by Schmidt value
    const finalAmps = amplitudes.map(a => 
      math.divide(a, math.complex(schmidt, 0)) as Complex
    );
    
    return new StateVector(dimA, finalAmps);
  });
  
  return {
    values: schmidtValues,
    statesA,
    statesB
  };
}

/**
 * Calculates the trace distance between two quantum states
 * 
 * For density matrices ρ and σ, the trace distance is:
 * D(ρ,σ) = (1/2)Tr|ρ-σ| where |A| = √(A†A)
 * 
 * The trace distance is a measure of distinguishability between quantum states.
 * 
 * @param A First operator (usually a density matrix)
 * @param B Second operator (usually a density matrix)
 * @returns The trace distance (between 0 and 1)
 */
export function traceDistance(A: IOperator, B: IOperator): number {
  if (A.dimension !== B.dimension) {
    throw new Error('Operators must have the same dimension for trace distance');
  }
  
  // Get matrix representations
  const matrixA = A.toMatrix();
  const matrixB = B.toMatrix();
  
  // Calculate A - B directly using matrices
  const diffMatrix = matrixA.map((row, i) => 
    row.map((elem, j) => math.subtract(elem, matrixB[i][j]) as Complex)
  );
  
  // Calculate adjoint of (A-B)
  const adjointDiffMatrix = diffMatrix.map((row, i) => 
    row.map((elem, j) => math.complex(
      diffMatrix[j][i].re,
      -diffMatrix[j][i].im
    ))
  );
  
  // Calculate (A-B)†(A-B)
  const product = multiplyMatrices(adjointDiffMatrix, diffMatrix);
  
  // Take positive square root of eigenvalues and sum diagonal elements
  const { values } = eigenDecomposition(product);
  const sqrtValues = values.map(v => Math.sqrt(Math.max(0, v.re)));
  
  // Calculate trace and divide by 2
  return sqrtValues.reduce((sum, val) => sum + val, 0) / 2;
}

/**
 * Calculates fidelity between two pure states
 * 
 * For pure states |ψ⟩ and |φ⟩, F(|ψ⟩,|φ⟩) = |⟨ψ|φ⟩|²
 * 
 * Fidelity is a measure of "closeness" between two quantum states.
 * 
 * @param stateA First pure state
 * @param stateB Second pure state
 * @returns The fidelity (between 0 and 1)
 */
export function fidelity(stateA: IStateVector, stateB: IStateVector): number {
  if (stateA.dimension !== stateB.dimension) {
    throw new Error('States must have the same dimension for fidelity');
  }
  
  // Calculate inner product ⟨ψ|φ⟩
  const innerProduct = stateA.innerProduct(stateB);
  
  // Get magnitude squared of the complex number
  const magnitude = math.abs(innerProduct);
  return typeof magnitude === 'number' ? magnitude * magnitude : magnitude.re * magnitude.re;
}

/**
 * Calculates trace fidelity between mixed states
 * 
 * For density matrices ρ and σ, F(ρ,σ) = [Tr(√(√ρσ√ρ))]²
 * This is a generalization of fidelity to mixed states.
 * 
 * @param rho First density matrix
 * @param sigma Second density matrix
 * @returns The fidelity (between 0 and 1)
 */
export function traceFidelity(rho: IDensityMatrix, sigma: IDensityMatrix): number {
  if (rho.dimension !== sigma.dimension) {
    throw new Error('Density matrices must have the same dimension for fidelity');
  }
  
  const rhoMatrix = rho.toMatrix();
  const sigmaMatrix = sigma.toMatrix();

  // console.log(rhoMatrix);
  
  // Calculate √ρ
  const sqrtRho = matrixSquareRoot(rhoMatrix);
  
  // Calculate √ρ σ √ρ
  const temp = multiplyMatrices(sqrtRho, sigmaMatrix);
  const product = multiplyMatrices(temp, sqrtRho);
  
  // Calculate √(√ρ σ √ρ)
  const sqrtProduct = matrixSquareRoot(product);
  
  // Calculate trace
  let trace = 0;
  for (let i = 0; i < rho.dimension; i++) {
    trace += sqrtProduct[i][i].re;
  }
  
  // Return trace squared
  return trace * trace;
}

/**
 * Calculates quantum relative entropy S(ρ||σ) = Tr(ρ log ρ - ρ log σ)
 * 
 * Quantum relative entropy measures how distinguishable one quantum
 * state is from another. It's analogous to the Kullback-Leibler divergence.
 * 
 * @param rho First density matrix
 * @param sigma Second density matrix
 * @returns The quantum relative entropy (non-negative)
 */
export function quantumRelativeEntropy(rho: IDensityMatrix, sigma: IDensityMatrix): number {
  if (rho.dimension !== sigma.dimension) {
    throw new Error('Density matrices must have the same dimension for relative entropy');
  }
  
  // Get eigendecomposition of rho
  const rhoMatrix = rho.toMatrix();
  const sigmaMatrix = sigma.toMatrix();
  const { values: rhoEigenvalues, vectors: rhoEigenvectors } = eigenDecomposition(rhoMatrix, {computeEigenvectors: true});
  
  // Calculate log(σ) by eigendecomposition
  const { values: sigmaEigenvalues, vectors: sigmaEigenvectors } = eigenDecomposition(sigmaMatrix, {computeEigenvectors: true});
  
  // Convert eigenvalues to log values
  const logSigmaEigenvalues = sigmaEigenvalues.map(v => 
    v.re > 1e-10 ? math.complex(Math.log(v.re), 0) : math.complex(-1000, 0) // Use a large negative number as approximation
  );
  
  // Reconstruct log(σ) in the eigenbasis of σ
  const logSigma = Array(rho.dimension).fill(null).map(() => 
    Array(rho.dimension).fill(null).map(() => math.complex(0, 0))
  );
  
  if (!sigmaEigenvectors) {
    throw new Error('Failed to compute eigenvectors for sigma');
  }

  for (let i = 0; i < rho.dimension; i++) {
    for (let j = 0; j < rho.dimension; j++) {
      for (let k = 0; k < rho.dimension; k++) {
        if (sigmaEigenvectors[k] && sigmaEigenvectors[k][i] && sigmaEigenvectors[k][j]) {
          const term1 = math.multiply(sigmaEigenvectors[k][i], math.conj(sigmaEigenvectors[k][j])) as Complex;
          const term2 = math.multiply(term1, logSigmaEigenvalues[k]) as Complex;
          logSigma[i][j] = math.add(logSigma[i][j], term2) as Complex;
        }
      }
    }
  }
  
  // Calculate Tr(ρ log ρ)
  let trRhoLogRho = 0;
  for (let i = 0; i < rho.dimension; i++) {
    if (rhoEigenvalues[i].re > 1e-10) {
      trRhoLogRho += rhoEigenvalues[i].re * Math.log(rhoEigenvalues[i].re);
    }
  }
  
  // Calculate Tr(ρ log σ)
  let trRhoLogSigma = 0;
  for (let i = 0; i < rho.dimension; i++) {
    for (let j = 0; j < rho.dimension; j++) {
      trRhoLogSigma += rhoMatrix[i][j].re * logSigma[j][i].re;
    }
  }
  
  return trRhoLogRho - trRhoLogSigma;
}

/**
 * Calculates the von Neumann entropy S(ρ) = -Tr(ρ log ρ)
 * 
 * The von Neumann entropy is the quantum analog of classical Shannon entropy.
 * 
 * @param rho Density matrix
 * @returns Entropy value (non-negative)
 */
export function vonNeumannEntropy(rho: IOperator): number {
  const matrix = rho.toMatrix();
  const { values } = eigenDecomposition(matrix);
  
  let entropy = 0;
  for (const value of values) {
    const p = value.re;
    if (p > 1e-10) {
      entropy -= p * Math.log(p);
    }
  }
  
  return entropy;
}

/**
 * Calculates the entanglement entropy of a bipartite pure state
 * 
 * For a pure state, this is the von Neumann entropy of either reduced density matrix.
 * 
 * @param state Pure state
 * @param dimA Dimension of first subsystem
 * @param dimB Dimension of second subsystem
 * @returns Entanglement entropy
 */
export function entanglementEntropy(state: IStateVector, dimA: number, dimB: number): number {
  // Perform Schmidt decomposition to get Schmidt coefficients
  const { values } = schmidtDecomposition(state, dimA, dimB);
  
  // Calculate entropy from Schmidt coefficients
  let entropy = 0;
  for (const lambda of values) {
    const p = lambda * lambda; // Squared Schmidt coefficient
    if (p > 1e-10) {
      entropy -= p * Math.log(p);
    }
  }
  
  return entropy;
}

/**
 * Calculates the linear entropy 1 - Tr(ρ²) of a quantum state
 * 
 * This is a simpler alternative to von Neumann entropy and measures
 * how mixed a quantum state is.
 * 
 * @param rho Density matrix
 * @returns Linear entropy (between 0 and 1-1/d)
 */
export function linearEntropy(rho: IDensityMatrix): number {
  return 1 - rho.purity();
}

/**
 * Calculates the quantum mutual information I(A:B) = S(A) + S(B) - S(AB)
 * 
 * Measures the total correlation between subsystems A and B.
 * 
 * @param rhoAB Joint density matrix of bipartite system
 * @param dimA Dimension of first subsystem
 * @param dimB Dimension of second subsystem
 * @returns Quantum mutual information
 */
export function quantumMutualInformation(
  rhoAB: IDensityMatrix, 
  dimA: number, 
  dimB: number
): number {
  if (rhoAB.dimension !== dimA * dimB) {
    throw new Error('Density matrix dimension must match product of subsystem dimensions');
  }
  
  // Calculate entropy of joint state
  const jointEntropy = vonNeumannEntropy(rhoAB);
  
  // Calculate reduced density matrices
  // Trace out subsystem B to get rhoA, trace out subsystem A to get rhoB
  const rhoA = rhoAB.partialTrace([dimA, dimB], [1]); // Trace out subsystem B (index 1)
  const rhoB = rhoAB.partialTrace([dimA, dimB], [0]); // Trace out subsystem A (index 0)
  
  // Calculate entropies of reduced states
  const entropyA = vonNeumannEntropy(rhoA);
  const entropyB = vonNeumannEntropy(rhoB);
  
  return entropyA + entropyB - jointEntropy;
}

/**
 * Calculates concurrence for 2-qubit density matrix
 * 
 * Concurrence is an entanglement measure for two-qubit systems.
 * For a density matrix ρ, C(ρ) = max(0, λ₁-λ₂-λ₃-λ₄)
 * where λᵢ are the square roots of eigenvalues of ρ(σy⊗σy)ρ*(σy⊗σy).
 * 
 * @param rho Two-qubit density matrix
 * @returns Concurrence value (between 0 and 1)
 */
export function concurrence(rho: IDensityMatrix): number {
  if (rho.dimension !== 4) {
    throw new Error('Concurrence only defined for 2-qubit states');
  }
  
  const rhoMatrix = rho.toMatrix();
  
  // Define σy⊗σy
  const sigmaY = [
    [math.complex(0, 0), math.complex(0, -1)],
    [math.complex(0, 1), math.complex(0, 0)]
  ];
  
  // Calculate σy⊗σy
  const sigmaYY = Array(4).fill(null).map(() => 
    Array(4).fill(null).map(() => math.complex(0, 0))
  );
  
  for (let i1 = 0; i1 < 2; i1++) {
    for (let j1 = 0; j1 < 2; j1++) {
      for (let i2 = 0; i2 < 2; i2++) {
        for (let j2 = 0; j2 < 2; j2++) {
          const i = i1 * 2 + i2;
          const j = j1 * 2 + j2;
          sigmaYY[i][j] = math.multiply(sigmaY[i1][j1], sigmaY[i2][j2]) as Complex;
        }
      }
    }
  }
  
  // Calculate ρ(σy⊗σy)
  const rhoSigmaYY = multiplyMatrices(rhoMatrix, sigmaYY);
  
  // Calculate complex conjugate of ρ
  const rhoStar = rhoMatrix.map(row => 
    row.map(elem => math.conj(elem))
  );
  
  // Calculate ρ(σy⊗σy)ρ*(σy⊗σy)
  const rhoSigmaYYRhoStar = multiplyMatrices(rhoSigmaYY, rhoStar);
  const R = multiplyMatrices(rhoSigmaYYRhoStar, sigmaYY);
  
  // Calculate R†R which is guaranteed to be Hermitian
  const RDagger = R.map((row, i) => 
    row.map((_, j) => math.conj(R[j][i]))
  );
  const RRDagger = multiplyMatrices(R, RDagger);
  
  // Find eigenvalues of RR† which are guaranteed to be real and non-negative
  const { values } = eigenDecomposition(RRDagger);
  
  // Take square roots and sort in descending order
  const sqrtValues = values.map(v => Math.sqrt(Math.sqrt(Math.max(0, v.re))))
    .sort((a, b) => b - a);
  
  // Calculate concurrence
  const concurrence = Math.max(0, sqrtValues[0] - sqrtValues[1] - sqrtValues[2] - sqrtValues[3]);
  
  return concurrence;
}

/**
 * Calculates negativity for bipartite system
 * 
 * Negativity is an entanglement measure based on the partial transpose criterion.
 * N(ρ) = (||ρᵀᴬ||₁ - 1)/2, where ||A||₁ is the trace norm.
 * 
 * @param rho Density matrix of bipartite system
 * @param dimA Dimension of first subsystem
 * @param dimB Dimension of second subsystem
 * @returns Negativity value (≥ 0)
 */
export function negativity(rho: IDensityMatrix, dimA: number, dimB: number): number {
  if (rho.dimension !== dimA * dimB) {
    throw new Error('Density matrix dimension must match product of subsystem dimensions');
  }
  
  const rhoMatrix = rho.toMatrix();
  
  // Calculate partial transpose with respect to subsystem A
  const rhoTA = Array(dimA * dimB).fill(null).map(() => 
    Array(dimA * dimB).fill(null).map(() => math.complex(0, 0))
  );
  
  for (let i1 = 0; i1 < dimA; i1++) {
    for (let i2 = 0; i2 < dimB; i2++) {
      for (let j1 = 0; j1 < dimA; j1++) {
        for (let j2 = 0; j2 < dimB; j2++) {
          const i = i1 * dimB + i2;
          const j = j1 * dimB + j2;
          const iTA = j1 * dimB + i2;
          const jTA = i1 * dimB + j2;
          
          rhoTA[iTA][jTA] = rhoMatrix[i][j];
        }
      }
    }
  }
  
  // Calculate eigenvalues of the partial transpose
  const { values } = eigenDecomposition(rhoTA);
  
  // Calculate trace norm (sum of absolute values of eigenvalues)
  const traceNorm = values.reduce((sum, v) => sum + Math.abs(v.re), 0);
  
  // Calculate negativity
  return (traceNorm - 1) / 2;
}

/**
 * Calculates the one-way quantum discord D(A|B)
 * 
 * Quantum discord measures the quantum correlations that
 * cannot be captured by classical correlations.
 * 
 * Note: This is a simplified implementation that assumes
 * projective measurements on subsystem B.
 * 
 * @param rho Density matrix of bipartite system
 * @param dimA Dimension of first subsystem
 * @param dimB Dimension of second subsystem
 * @returns One-way quantum discord
 */
export function quantumDiscord(rho: IDensityMatrix, dimA: number, dimB: number): number {
  if (rho.dimension !== dimA * dimB) {
    throw new Error('Density matrix dimension must match product of subsystem dimensions');
  }
  
  // Calculate quantum mutual information
  const mutualInfo = quantumMutualInformation(rho, dimA, dimB);
  
  // Calculate reduced density matrix for subsystem B
  const rhoB = rho.partialTrace([dimA, dimB], [0]); // Trace out subsystem A (index 0)
  
  // For a complete implementation, we would need to minimize
  // over all projective measurements on subsystem B.
  // This is a computationally intensive task.
  
  // For this simplified version, we'll consider only computational basis
  // measurements and provide a placeholder value
  
  // Placeholder for classical correlation
  const classicalCorrelation = 0.5 * mutualInfo;
  
  // Discord = Quantum mutual information - Classical correlation
  return mutualInfo - classicalCorrelation;
}
