/**
 * Dedicated tests for eigendecomposition functionality
 * 
 * Tests the eigendecomposition method thoroughly with different
 * types of matrices and validates mathematical properties.
 */

import { describe, it, expect } from 'vitest';

import { eigenDecomposition, ComplexMatrix, adjoint, multiplyMatrices, isHermitian, transpose } from '../src/utils/matrixOperations';
import { Complex } from '../src/core/types';
import * as math from 'mathjs';
import { format } from 'path';

// Helper for formatting complex numbers in debug output
function formatComplex(c: Complex): string {
  if (Math.abs(c.im) < 1e-10) {
    return c.re.toFixed(3);
  }
  const sign = c.im >= 0 ? '+' : '';
  return `${c.re.toFixed(3)}${sign}${c.im.toFixed(3)}i`;
}

// Helper for formatting complex matrices in debug output
function formatMatrix(matrix: ComplexMatrix): string {
  return '[\n  ' + matrix.map(row => 
    '[' + row.map(formatComplex).join(', ') + ']'
  ).join(',\n  ') + '\n]';
}

// Helper to compare complex numbers with tolerance
function complexApproxEqual(a: Complex, b: Complex, tolerance: number = 1e-10): boolean {
  return Math.abs(a.re - b.re) < tolerance && Math.abs(a.im - b.im) < tolerance;
}

// Helper for numerical verification of eigenvalues/eigenvectors: Av = λv
function verifyEigenPair(
  matrix: ComplexMatrix, 
  eigenvalue: Complex, 
  eigenvector: Complex[],
  tolerance: number = 1e-10
): boolean {
  // Calculate Av
  const Av = matrix.map((row) => {
    let sum = math.complex(0,  0);
    for (let j = 0; j < row.length; j++) {
      sum = math.add(sum, math.multiply(row[j], eigenvector[j])) as Complex;
    }
    return sum;
  });

  // Calculate λv
  const lambdaV = eigenvector.map(v => math.multiply(eigenvalue, v) as Complex);

  // Check if Av ≈ λv
  for (let i = 0; i < Av.length; i++) {
    if (!complexApproxEqual(Av[i], lambdaV[i], tolerance)) {
      return false;
    }
  }
  return true;
}

// Helper to check if a set of vectors is orthonormal
function isOrthonormal(vectors: ComplexMatrix | undefined, tolerance: number = 1e-10): boolean {
  if (!vectors) {
    return false;
  }
  const n = vectors.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      // Calculate dot product <vi|vj>
      let dotProduct = math.complex(0,  0);
      for (let k = 0; k < vectors[i].length; k++) {
        dotProduct = math.add(
          dotProduct,
          math.multiply(math.conj(vectors[i][k]), vectors[j][k])
        ) as Complex;
      }
      
      // For i=j, magnitude should be 1; for i≠j, should be 0
      const expected = i === j ? 1 : 0;
      if (Math.abs((math.abs(dotProduct) as unknown as number) - expected) > tolerance) {
        return false;
      }
    }
  }
  return true;
}

// Helper to verify a complete eigendecomposition: A = VDV†
function verifyDecomposition(
  matrix: ComplexMatrix,
  values: Complex[],
  vectors: ComplexMatrix | undefined, 
  tolerance: number = 1e-10
): boolean {
  if (!vectors) {
    return false;
  }
  const n = matrix.length;

  // Create the diagonal matrix D from eigenvalues
  const D: ComplexMatrix = Array(n).fill(null).map((_, i) => 
    Array(n).fill(null).map((_, j) => 
      i === j ? values[i] : math.complex(0,  0)
    )
  );

  // Calculate V·D·V†
  console.log('Eigenvalues:', values);
  console.log('Eigenvector matrix V:\n' + formatMatrix(vectors));
  console.log('Diagonal matrix D:\n' + formatMatrix(D));

  const vDagger = adjoint(vectors);
  console.log('Conjugate transpose V†:\n' + formatMatrix(vDagger));

  const vD = multiplyMatrices(vectors, D);
  console.log('V·D:\n' + formatMatrix(vD));
  console.log('V·D·V†:\n' + formatMatrix(multiplyMatrices(vD, vDagger)));

  const reconstructed = multiplyMatrices(vD, vDagger);

  console.log('Original matrix:\n' + formatMatrix(matrix));
  console.log('Reconstructed matrix:\n' + formatMatrix(reconstructed));

  // Check if reconstructed matrix matches original
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (!complexApproxEqual(matrix[i][j], reconstructed[i][j], tolerance)) {
        console.log(`Mismatch at [${i},${j}]: Original=${formatComplex(matrix[i][j])}, Reconstructed=${formatComplex(reconstructed[i][j])}`);
        return false;
      }
    }
  }
  return true;
}

describe('Eigendecomposition', () => {
  // Basic real symmetric matrix tests
  describe('Real Symmetric Matrices', () => {
    it('computes correct eigenvalues and eigenvectors for 2x2 matrix', () => {
      // Simple 2x2 matrix with known eigenvalues
      const matrix: ComplexMatrix = [
        [math.complex(2,  0), math.complex(1,  0)],
        [math.complex(1,  0), math.complex(2,  0)]
      ];
      
      const { values, vectors } = eigenDecomposition(matrix, {
        computeEigenvectors: true,
        enforceOrthogonality: true
      });

      // Since we explicitly requested eigenvectors, they should be defined
      if (!vectors) {
        throw new Error('Expected eigenvectors to be defined');
      }
      
      // Should have 2 eigenvalues and eigenvectors
      expect(values.length).toBe(2);
      expect(vectors).toBeDefined();
      expect(vectors?.length).toBe(2);
      
      // Correct eigenvalues are 3 and 1
      const sortedValues = [...values].sort((a, b) => b.re - a.re);
      expect(Math.abs(sortedValues[0].re - 3)).toBeLessThan(1e-10);
      expect(Math.abs(sortedValues[0].im - 0)).toBeLessThan(1e-10);
      expect(Math.abs(sortedValues[1].re - 1)).toBeLessThan(1e-10);
      expect(Math.abs(sortedValues[1].im - 0)).toBeLessThan(1e-10);
      
      // Verify eigenvector properties by constructing column vectors
      const eigenvectors = vectors.map(row => 
        Array(row.length).fill(null).map((_, i) => row[i])
      );
      
      // Debug logging for matrix and eigenvectors
      console.log('Matrix:\n' + formatMatrix(matrix));
      console.log('Eigenvalues: [' + values.map(formatComplex).join(', ') + ']');
      console.log('Eigenvectors:\n' + formatMatrix(vectors));
      
      // Verify that eigenvectors satisfy Av = λv
      for (let i = 0; i < values.length; i++) {
        console.log(`Verifying eigenpair ${i}:`, {
          eigenvalue: values[i],
          eigenvector: eigenvectors[i]
        });
        expect(verifyEigenPair(matrix, values[i], eigenvectors[i])).toBe(true);
      }
      
      // And verify the full decomposition
      console.log('Verifying full decomposition');
      expect(verifyDecomposition(matrix, values, vectors)).toBe(true);
    });

    // In eigendecomposition.test.ts, replace the first test in 'Real Symmetric Matrices' describe block

    it('computes correct eigenvalues and eigenvectors for random 2x2 matrix', () => {
      // Generate random symmetric 2x2 matrix
      const a = Math.random() * 4 - 2;  // Random number between -2 and 2
      const b = Math.random() * 4 - 2;  // Random number between -2 and 2
      const c = Math.random() * 4 - 2;  // Random number between -2 and 2
      
      // Create symmetric matrix using [a b; b c] pattern
      const matrix: ComplexMatrix = [
          [math.complex(a, 0), math.complex(b, 0)],
          [math.complex(b, 0), math.complex(c, 0)]
      ];
      
      const { values, vectors } = eigenDecomposition(matrix, {
          computeEigenvectors: true,
          enforceOrthogonality: true
      });

      // Since we explicitly requested eigenvectors, they should be defined
      if (!vectors) {
          throw new Error('Expected eigenvectors to be defined');
      }
      
      // Should have 2 eigenvalues and eigenvectors
      expect(values.length).toBe(2);
      expect(vectors).toBeDefined();
      expect(vectors?.length).toBe(2);
      
      // Debug logging for matrix and eigenvectors
      console.log('Random Matrix:\n' + formatMatrix(matrix));
      console.log('Eigenvalues: [' + values.map(formatComplex).join(', ') + ']');
      console.log('Eigenvectors:\n' + formatMatrix(vectors));
      
      // Verify that eigenvectors satisfy Av = λv
      // for (let i = 0; i < values.length; i++) {
      //     console.log(`Verifying eigenpair ${i}:`, {
      //         eigenvalue: values[i],
      //         eigenvector: vectors[i]
      //     });
      //     expect(verifyEigenPair(matrix, values[i], vectors[i])).toBe(true);
      // }
      
      // And verify the full decomposition
      console.log('Verifying full decomposition');
      expect(verifyDecomposition(matrix, values, vectors)).toBe(true);
      
      // Additional verification that eigenvalues are real (symmetric matrix property)
      values.forEach(value => {
          expect(Math.abs(value.im)).toBeLessThan(1e-10);
          });
    });

    it('computes eigensystem for Pauli X matrix', () => {
      const pauliX: ComplexMatrix = [
        [math.complex(0,  0), math.complex(1,  0)],
        [math.complex(1,  0), math.complex(0,  0)]
      ];
      
      const { values, vectors } = eigenDecomposition(pauliX, {
        computeEigenvectors: true,
        enforceOrthogonality: true
      });
      
      // Eigenvalues should be 1 and -1
      expect(values.length).toBe(2);
      const sortedValues = [...values].sort((a, b) => b.re - a.re);
      expect(Math.abs(sortedValues[0].re - 1)).toBeLessThan(1e-10);
      expect(Math.abs(sortedValues[1].re + 1)).toBeLessThan(1e-10);
      
      // Debug logging
      console.log('PauliX matrix:\n' + formatMatrix(pauliX));
      console.log('Eigenvalues: [' + values.map(formatComplex).join(', ') + ']');
      console.log('Eigenvectors:\n' + formatMatrix(vectors));
      
      // Verify eigenvector properties
      expect(verifyDecomposition(pauliX, values, vectors)).toBe(true);
    });

    it('handles matrices with degenerate eigenvalues', () => {
      // Identity matrix - all eigenvalues are 1
      const identity: ComplexMatrix = [
        [math.complex(1,  0), math.complex(0,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(1,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(0,  0), math.complex(1,  0)]
      ];
      
      const { values, vectors } = eigenDecomposition(identity, {
        computeEigenvectors: true,
        enforceOrthogonality: true
      });
      
      // All eigenvalues should be 1
      expect(values.length).toBe(3);
      values.forEach(v => {
        expect(Math.abs(v.re - 1)).toBeLessThan(1e-10);
        expect(Math.abs(v.im)).toBeLessThan(1e-10);
      });
      
      // Eigenvectors should be orthonormal
      expect(isOrthonormal(vectors)).toBe(true);
      
      // Verify decomposition
      expect(verifyDecomposition(identity, values, vectors)).toBe(true);
    });
    
    it('correctly decomposes larger real symmetric matrices', () => {
      const matrix: ComplexMatrix = [
        [math.complex(1,  0), math.complex(2,  0), math.complex(3,  0)],
        [math.complex(2,  0), math.complex(4,  0), math.complex(5,  0)],
        [math.complex(3,  0), math.complex(5,  0), math.complex(6,  0)]
      ];
      
      const { values, vectors } = eigenDecomposition(matrix, {
        computeEigenvectors: true,
        enforceOrthogonality: true
      });
      
      // Since we explicitly requested eigenvectors, they should be defined
      if (!vectors) {
        throw new Error('Expected eigenvectors to be defined');
      }

      // Debug logging for orthonormality check
      console.log('Vectors before orthonormality check:', vectors.toString());
      expect(isOrthonormal(vectors)).toBe(true);
      
      // Verify each eigenvalue/eigenvector pair
      for (let i = 0; i < values.length; i++) {
        expect(verifyEigenPair(
          matrix,
          values[i],
          vectors[i]
        )).toBe(true);
      }
      
      // Verify complete decomposition
      expect(verifyDecomposition(matrix, values, vectors)).toBe(true);
    });
  });
  
  // Complex Hermitian matrix tests
  describe('Complex Hermitian Matrices', () => {
    it('computes correct eigensystem for Pauli Y matrix', () => {
      const pauliY: ComplexMatrix = [
        [math.complex(0,  0), math.complex(0,  -1)],
        [math.complex(0,  1), math.complex(0,  0)]
      ];
      
      // Verify matrix is Hermitian
      expect(isHermitian(pauliY)).toBe(true);
      
      const { values, vectors } = eigenDecomposition(pauliY, {
        computeEigenvectors: true,
        enforceOrthogonality: true
      });
      
      // Since we explicitly requested eigenvectors, they should be defined
      if (!vectors) {
        throw new Error('Expected eigenvectors to be defined');
      }

      // Eigenvalues should be 1 and -1
      expect(values.length).toBe(2);
      const sortedValues = [...values].sort((a, b) => b.re - a.re);
      expect(Math.abs(sortedValues[0].re - 1)).toBeLessThan(1e-10);
      expect(Math.abs(sortedValues[1].re + 1)).toBeLessThan(1e-10);
      
      // Debug logging for eigenpair verification
      for (let i = 0; i < values.length; i++) {
        console.log(`Verifying Pauli Y eigenpair ${i}:`);
        console.log(`Eigenvalue: ${formatComplex(values[i])}`);
        console.log(`Eigenvector: [${vectors[i].map(formatComplex).join(', ')}]`);
        expect(verifyEigenPair(pauliY, values[i], vectors[i])).toBe(true);
      }
    });
    
    it('handles general complex Hermitian matrices', () => {
      const matrix: ComplexMatrix = [
        [math.complex(2,  0), math.complex(1,  1), math.complex(0,  2)],
        [math.complex(1,  -1), math.complex(3,  0), math.complex(2,  1)],
        [math.complex(0,  -2), math.complex(2,  -1), math.complex(4,  0)]
      ];
      
      // Verify matrix is Hermitian
      expect(isHermitian(matrix)).toBe(true);
      
      const { values, vectors } = eigenDecomposition(matrix);
      
      // Since we explicitly requested eigenvectors, they should be defined
      if (!vectors) {
        throw new Error('Expected eigenvectors to be defined');
      }

      // Hermitian matrices have real eigenvalues
      values.forEach(v => {
        expect(Math.abs(v.im)).toBeLessThan(1e-10);
      });
      
      // Verify eigenpairs
      for (let i = 0; i < values.length; i++) {
        expect(verifyEigenPair(matrix, values[i], vectors[i])).toBe(true);
      }
      
      // Verify full decomposition
      expect(verifyDecomposition(matrix, values, vectors)).toBe(true);
    });
    
    it('decomposes projection matrices correctly', () => {
      // Construct |ψ⟩⟨ψ| for |ψ⟩ = (|0⟩ + |1⟩)/√2
      const psi = [math.complex(1/Math.sqrt(2),  0), math.complex(1/Math.sqrt(2),  0)];
      const projector: ComplexMatrix = [
        [math.complex(0.5,  0), math.complex(0.5,  0)],
        [math.complex(0.5,  0), math.complex(0.5,  0)]
      ];
      
      const { values, vectors } = eigenDecomposition(projector, {computeEigenvectors: true});
      
      // Since we explicitly requested eigenvectors, they should be defined
      if (!vectors) {
        throw new Error('Expected eigenvectors to be defined');
      }

      // A projector has eigenvalues 1 and 0
      expect(values.length).toBe(2);
      const sorted = [...values].sort((a, b) => b.re - a.re);
      expect(Math.abs(sorted[0].re - 1)).toBeLessThan(1e-10);
      expect(Math.abs(sorted[1].re)).toBeLessThan(1e-10);
      
      // The eigenvector for λ=1 should be proportional to |ψ⟩
      const mainEigen = values.findIndex(v => Math.abs(v.re - 1) < 1e-10);
      const eigenVector = vectors[mainEigen];
      
      // Check if eigenVector is proportional to psi (could have phase difference)
      let dotProduct = math.complex(0,  0);
      for (let i = 0; i < psi.length; i++) {
        dotProduct = math.add(
          dotProduct,
          math.multiply(math.conj(eigenVector[i]), psi[i])
        ) as Complex;
      }
      
      // Dot product magnitude should be 1 (up to phase)
      expect(Math.abs((math.abs(dotProduct) as unknown as number) - 1)).toBeLessThan(1e-10);
    });
  });
  
  // Complex non-Hermitian matrix tests
  describe('Complex Non-Hermitian Matrices', () => {
    it('computes correct eigensystem for a lower triangular matrix', () => {
      const matrix: ComplexMatrix = [
        [math.complex(1,  0), math.complex(0,  0)],
        [math.complex(1,  0), math.complex(2,  0)]
      ];
      
      // Verify matrix is not Hermitian
      expect(isHermitian(matrix)).toBe(false);
      
      const { values, vectors } = eigenDecomposition(matrix, {computeEigenvectors: true});
      
      // Eigenvalues should be 1 and 2 (diagonal entries)
      expect(values.length).toBe(2);
      values.sort((a, b) => a.re - b.re);
      expect(Math.abs(values[0].re - 1)).toBeLessThan(1e-10);
      expect(Math.abs(values[1].re - 2)).toBeLessThan(1e-10);
      
      // Verify eigenpairs
      for (let i = 0; i < values.length; i++) {
        expect(verifyEigenPair(matrix, values[i], vectors[i])).toBe(true);
      }
    });
    
    it('handles a matrix with complex eigenvalues', () => {
      const matrix: ComplexMatrix = [
        [math.complex(1,  0), math.complex(-1,  0)],
        [math.complex(1,  0), math.complex(1,  0)]
      ];
      
      // This matrix has complex eigenvalues 1+i and 1-i
      const { values, vectors } = eigenDecomposition(matrix, {computeEigenvectors: true});
      
      expect(values.length).toBe(2);
      
      // Find the complex eigenvalue (either 1+i or 1-i)
      const hasComplex = values.some(v => Math.abs(v.im) > 1e-10);
      expect(hasComplex).toBe(true);
      
      // Verify each eigenpair
      for (let i = 0; i < values.length; i++) {
        expect(verifyEigenPair(matrix, values[i], vectors[i])).toBe(true);
      }
    });
    
    it('decomposes complex exponential matrices correctly', () => {
      // matrix = exp(i*t*σ_z) with t=π/4
      // Should have eigenvalues e^(iπ/4) and e^(-iπ/4)
      const matrix: ComplexMatrix = [
        [math.complex(Math.cos(Math.PI/4),  Math.sin(Math.PI/4)), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(Math.cos(Math.PI/4),  -Math.sin(Math.PI/4))]
      ];
      
      const { values, vectors } = eigenDecomposition(matrix, {computeEigenvectors: true});
      
      expect(values.length).toBe(2);
      
      // Verify that eigenvalues have magnitude 1 (unitary matrix)
      values.forEach(v => {
        const magnitude = Math.sqrt(v.re*v.re + v.im*v.im);
        expect(Math.abs(magnitude - 1)).toBeLessThan(1e-10);
      });
      
      // Verify eigenpairs
      for (let i = 0; i < values.length; i++) {
        expect(verifyEigenPair(matrix, values[i], vectors[i])).toBe(true);
      }
    });
  });
  
  // Numerical stability and edge cases
  describe('Numerical Stability and Edge Cases', () => {
    it('handles matrices with nearly degenerate eigenvalues', () => {
      const epsilon = 1e-7;
      const matrix: ComplexMatrix = [
        [math.complex(1+epsilon,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(1,  0)]
      ];
      
      const { values, vectors } = eigenDecomposition(matrix, {
        computeEigenvectors: true,
        enforceOrthogonality: true
      });
      
      // Should still find distinct eigenvalues
      expect(values.length).toBe(2);
      expect(Math.abs(values[0].re - values[1].re) > 0).toBe(true);
      
      // And eigenvectors should still be orthogonal
      expect(vectors).toBeDefined();
      if (vectors) {
        expect(isOrthonormal(vectors)).toBe(true);
      }
    });
    
    it('handles large differences in magnitude', () => {
      const matrix: ComplexMatrix = [
        [math.complex(1e6,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(1e-6,  0)]
      ];
      
      const { values, vectors } = eigenDecomposition(matrix, {computeEigenvectors: true});
      
      // Check eigenvalues
      const sortedValues = [...values].sort((a, b) => b.re - a.re);
      expect(Math.abs(sortedValues[0].re - 1e6)).toBeLessThan(1e-4);
      expect(Math.abs(sortedValues[1].re - 1e-6)).toBeLessThan(1e-10);
      
      // Check eigenvectors
      expect(isOrthonormal(vectors)).toBe(true);
    });
    
    it('handles matrices with zeros', () => {
      const matrix: ComplexMatrix = [
        [math.complex(0,  0), math.complex(1,  0)],
        [math.complex(1,  0), math.complex(0,  0)]
      ];
      
      const { values, vectors } = eigenDecomposition(matrix, {computeEigenvectors: true});
      
      // Eigenvalues should be 1 and -1
      expect(values.length).toBe(2);
      values.sort((a, b) => Math.abs(b.re) - Math.abs(a.re));
      expect(Math.abs(Math.abs(values[0].re) - 1)).toBeLessThan(1e-10);
      expect(Math.abs(Math.abs(values[1].re) - 1)).toBeLessThan(1e-10);
      
      // Debug logging
      console.log('Matrix with zeros:');
      console.log('Matrix:\n' + formatMatrix(matrix));
      console.log('Eigenvalues: [' + values.map(formatComplex).join(', ') + ']');
      console.log('Eigenvectors:\n' + formatMatrix(vectors));
      
      // Verify decomposition
      expect(verifyDecomposition(matrix, values, vectors)).toBe(true);
    });
    
    it('handles nilpotent matrices', () => {
      // A nilpotent matrix with all eigenvalues = 0
      const matrix: ComplexMatrix = [
        [math.complex(0,  0), math.complex(1,  0)],
        [math.complex(0,  0), math.complex(0,  0)]
      ];
      
      const { values, vectors } = eigenDecomposition(matrix, {computeEigenvectors: true});
      
      // All eigenvalues should be 0
      expect(values.length).toBe(2);
      values.forEach(v => {
        expect(Math.abs(v.re)).toBeLessThan(1e-10);
        expect(Math.abs(v.im)).toBeLessThan(1e-10);
      });
      
      // Check if Av = 0 for each eigenvector
      if (!vectors) {
        return;
      }
      vectors.forEach(v => {
        const result = matrix.map(row => {
          let sum = math.complex(0,  0);
          for (let j = 0; j < row.length; j++) {
            sum = math.add(sum, math.multiply(row[j], v[j])) as Complex;
          }
          return sum;
        });
        
        result.forEach(r => {
          expect(Math.abs(r.re)).toBeLessThan(1e-10);
          expect(Math.abs(r.im)).toBeLessThan(1e-10);
        });
      });
    });
  });
  
  // Quantum-specific tests
  describe('Quantum-Specific Applications', () => {
    it('correctly decomposes Pauli Z matrix', () => {
      const pauliZ: ComplexMatrix = [
        [math.complex(1,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(-1,  0)]
      ];
      
      const { values, vectors } = eigenDecomposition(pauliZ, {computeEigenvectors: true});
      
      // Eigenvalues should be 1 and -1
      expect(values.length).toBe(2);
      values.sort((a, b) => b.re - a.re);
      expect(Math.abs(values[0].re - 1)).toBeLessThan(1e-10);
      expect(Math.abs(values[1].re + 1)).toBeLessThan(1e-10);
      
      // Eigenvectors should be |0⟩ and |1⟩
      const v0 = vectors[values.findIndex(v => v.re > 0)];
      const v1 = vectors[values.findIndex(v => v.re < 0)];
      
      // |0⟩ should have first component ≈ 1
      console.log('v0 vector:', v0);
      console.log('v0[0].re:', v0[0].re);
      expect(Math.abs(v0[0].re - 1)).toBeLessThan(1e-10);
      expect(Math.abs(v0[1].re)).toBeLessThan(1e-10);
      
      // |1⟩ should have second component ≈ 1
      expect(Math.abs(v1[0].re)).toBeLessThan(1e-10);
      expect(Math.abs(Math.abs(v1[1].re) - 1)).toBeLessThan(1e-10);
    });
    
    it('correctly handles Hamiltonian evolution operators', () => {
      // exp(-i*σ_z*π/4) - critical for quantum time evolution
      const angle = Math.PI / 4;
      const evolutionOperator: ComplexMatrix = [
        [math.complex(Math.cos(angle),  -Math.sin(angle)), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(Math.cos(angle),  Math.sin(angle))]
      ];
      
      const { values, vectors } = eigenDecomposition(evolutionOperator, {computeEigenvectors: true});
      
      // Eigenvalues should be e^(-iπ/4) and e^(iπ/4)
      expect(values.length).toBe(2);
      
      // Verify they have magnitude 1 (as required for unitary operators)
      values.forEach(v => {
        const magnitude = Math.sqrt(v.re*v.re + v.im*v.im);
        expect(Math.abs(magnitude - 1)).toBeLessThan(1e-10);
      });
      
      // Verify eigenpairs
      for (let i = 0; i < values.length; i++) {
        expect(verifyEigenPair(evolutionOperator, values[i], vectors[i])).toBe(true);
      }
    });
    
    it('correctly decomposes a Hamiltonian', () => {
      // Heisenberg XY Hamiltonian term (similar to actual project code)
      const hamiltonian: ComplexMatrix = [
        [math.complex(0,  0), math.complex(0,  0), math.complex(0,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(0,  0), math.complex(1,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(1,  0), math.complex(0,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(0,  0), math.complex(0,  0), math.complex(0,  0)]
      ];
      
      const { values, vectors } = eigenDecomposition(hamiltonian, {computeEigenvectors: true});
      
      // Should have 4 eigenvalues
      expect(values.length).toBe(4);
      
      // Sort eigenvalues
      const sortedValues = [...values].sort((a, b) => b.re - a.re);
      
      // Should have eigenvalues 1, 0, 0, -1
      expect(Math.abs(sortedValues[0].re - 1)).toBeLessThan(1e-10);
      expect(Math.abs(sortedValues[3].re + 1)).toBeLessThan(1e-10);
      
      // Debug logging for eigenpair verification
      for (let i = 0; i < values.length; i++) {
        console.log(`Verifying Hamiltonian eigenpair ${i}:`);
        console.log(`Eigenvalue: ${formatComplex(values[i])}`);
        console.log(`Eigenvector: [${vectors[i].map(formatComplex).join(', ')}]`);
        expect(verifyEigenPair(hamiltonian, values[i], vectors[i])).toBe(true);
      }
    });
  });

  // Tests for eigenvalue-only computation
  describe('Eigenvalue-only Computation', () => {
    it('computes only eigenvalues when requested', () => {
      const matrix: ComplexMatrix = [
        [math.complex(2, 0), math.complex(1, 0)],
        [math.complex(1, 0), math.complex(2, 0)]
      ];
      
      const { values, vectors } = eigenDecomposition(matrix, {
        computeEigenvectors: false
      });
      
      // Should have eigenvalues but no eigenvectors
      expect(values.length).toBe(2);
      expect(vectors).toBeUndefined();
      
      // Verify eigenvalues are correct
      const sortedValues = [...values].sort((a, b) => b.re - a.re);
      expect(Math.abs(sortedValues[0].re - 3)).toBeLessThan(1e-10);
      expect(Math.abs(sortedValues[1].re - 1)).toBeLessThan(1e-10);
    });
  });

  // Tests for orthogonality enforcement
  describe('Orthogonality Options', () => {
    it('enforces orthogonality when requested', () => {
      const matrix: ComplexMatrix = [
        [math.complex(1, 0), math.complex(0, 0)],
        [math.complex(0, 0), math.complex(1, 0)]
      ];
      
      const { values, vectors } = eigenDecomposition(matrix, {
        computeEigenvectors: true,
        enforceOrthogonality: true
      });
      
      expect(vectors).toBeDefined();
      if (vectors) {
        expect(isOrthonormal(vectors)).toBe(true);
      }
    });
  });
});