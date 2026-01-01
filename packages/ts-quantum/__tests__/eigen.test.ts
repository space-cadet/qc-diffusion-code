/**
 * Focused Test for eigenDecomposition
 * 
 * This test demonstrates the eigenDecomposition method with clear 
 * console logging of all relevant quantities.
 */

import { describe, it, expect } from 'vitest';
import * as math from 'mathjs';

import {
  eigenDecomposition,
  ComplexMatrix,
  multiplyMatrices
} from '../src/utils/matrixOperations';
import { Complex } from '../src/core/types';
import { formatComplex, formatMatrix } from './utils/testHelpers';

// Verify that Av = λv for each eigenpair
function verifyEigenpairs(matrix: ComplexMatrix, values: Complex[], vectors: ComplexMatrix): void {
  for (let i = 0; i < values.length; i++) {
    const v = vectors?.[i];
    const λ = values[i];
    
    console.log(`\nVerifying eigenpair ${i+1}:`);
    console.log(`λ = ${formatComplex(λ)}`);
    
    // Handle case where vector is undefined or null (deficient case)
    if (!v) {
      console.log('Skipping undefined eigenvector (deficient case)');
      continue;
    }

    // Skip verification if the eigenvector is all zeros
    const isZeroVector = v.every(component => 
      Math.abs(component.re) < 1e-10 && Math.abs(component.im) < 1e-10
    );
    if (isZeroVector) {
      console.log('Skipping zero eigenvector (deficient case)');
      continue;
    }

    console.log(`v = [${v.map(formatComplex).join(', ')}]`);
    
    // Calculate Av
    const Av = matrix.map(row => {
      let sum = math.complex(0, 0);
      for (let j = 0; j < row.length; j++) {
        sum = math.add(sum, math.multiply(row[j], v[j])) as Complex;
      }
      return sum;
    });
    
    // Calculate λv
    const λv = v.map(val => math.multiply(λ, val) as Complex);
    
    console.log(`A·v = [${Av.map(formatComplex).join(', ')}]`);
    console.log(`λ·v = [${λv.map(formatComplex).join(', ')}]`);
    
    // Check if Av ≈ λv
    const isValid = Av.every((val, j) => {
      const diff = math.subtract(val, λv[j]) as Complex;
      const error = Math.sqrt(diff.re * diff.re + diff.im * diff.im);
      return error < 1e-10;
    });
    
    console.log(`Verification: ${isValid ? 'PASSED ✓' : 'FAILED ✗'}`);
    expect(isValid).toBe(true);
  }
}

// Additional helper function to check if matrices are approximately equal
function matricesApproxEqual(A: ComplexMatrix, B: ComplexMatrix, tolerance: number = 1e-10): boolean {
  if (A.length !== B.length || A[0].length !== B[0].length) return false;
  
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < A[0].length; j++) {
      const diff = math.subtract(A[i][j], B[i][j]) as Complex;
      const error = Math.sqrt(diff.re * diff.re + diff.im * diff.im);
      if (error > tolerance) return false;
    }
  }
  return true;
}

describe('eigenDecomposition Visual Test', () => {
  it('visualizes eigendecomposition of a 2×2 real symmetric matrix', () => {
    // Simple real symmetric 2×2 matrix
    const matrix: ComplexMatrix = [
      [math.complex(2, 0), math.complex(1, 0)],
      [math.complex(1, 0), math.complex(2, 0)]
    ];
    
    console.log('Input Matrix:');
    console.log(formatMatrix(matrix));
    
    // Compute eigendecomposition
    console.log('\nPerforming eigendecomposition...');
    const { values, vectors } = eigenDecomposition(matrix, {
      computeEigenvectors: true,
      enforceOrthogonality: true
    });
    
    // Display results
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    console.log('\nEigenvectors:');
    vectors?.forEach((v, i) => console.log(`v${i+1} = [${v.map(formatComplex).join(', ')}]`));
    
    // Verify eigenpairs
    if (vectors) {
      verifyEigenpairs(matrix, values, vectors);
    }
    
    // Demonstrate reconstruction of original matrix
    if (vectors) {
      console.log('\nReconstruction of original matrix:');
      
      // Create diagonal matrix D from eigenvalues
      const D: ComplexMatrix = [
        [values[0], math.complex(0, 0)],
        [math.complex(0, 0), values[1]]
      ];
      console.log('\nEigenvalue Matrix D:');
      console.log(formatMatrix(D));
      
      // Calculate V·D
      const VD = multiplyMatrices(vectors, D);
      console.log('\nV·D:');
      console.log(formatMatrix(VD));
      
      // Calculate V·D·V^T (for real symmetric matrices)
      const VT = vectors.map((_, j) => vectors.map(row => row[j]));
      const reconstructed = multiplyMatrices(VD, VT);
      console.log('\nReconstructed Matrix V·D·V^T:');
      console.log(formatMatrix(reconstructed));
      
      // Compare with original
      console.log('\nOriginal Matrix:');
      console.log(formatMatrix(matrix));
    }
  });
  
  it('visualizes eigendecomposition of the Pauli-X matrix', () => {
    // Pauli-X matrix
    const pauliX: ComplexMatrix = [
      [math.complex(0, 0), math.complex(1, 0)],
      [math.complex(1, 0), math.complex(0, 0)]
    ];
    
    console.log('Pauli-X Matrix:');
    console.log(formatMatrix(pauliX));
    
    // Compute eigendecomposition
    console.log('\nPerforming eigendecomposition...');
    const { values, vectors } = eigenDecomposition(pauliX, {
      computeEigenvectors: true,
      enforceOrthogonality: true
    });
    
    // Display results
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    console.log('\nEigenvectors:');
    vectors?.forEach((v, i) => console.log(`v${i+1} = [${v.map(formatComplex).join(', ')}]`));
    
    // Verify eigenpairs
    if (vectors) {
      verifyEigenpairs(pauliX, values, vectors);
    }
  });
  
  it('visualizes eigendecomposition of a complex Hermitian matrix', () => {
    // Complex Hermitian 2×2 matrix
    const matrix: ComplexMatrix = [
      [math.complex(1, 0), math.complex(1, 1)],
      [math.complex(1, -1), math.complex(2, 0)]
    ];
    
    console.log('Complex Hermitian Matrix:');
    console.log(formatMatrix(matrix));
    
    // Compute eigendecomposition
    console.log('\nPerforming eigendecomposition...');
    const { values, vectors } = eigenDecomposition(matrix, {
      computeEigenvectors: true,
      enforceOrthogonality: true
    });
    
    // Display results
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    console.log('\nEigenvectors:');
    vectors?.forEach((v, i) => console.log(`v${i+1} = [${v.map(formatComplex).join(', ')}]`));
    
    // Verify eigenpairs
    if (vectors) {
      verifyEigenpairs(matrix, values, vectors);
    }
  });
  
  it('handles matrices with degenerate eigenvalues', () => {
    // Identity matrix - all eigenvalues are 1
    const identity: ComplexMatrix = [
      [math.complex(1, 0), math.complex(0, 0)],
      [math.complex(0, 0), math.complex(1, 0)]
    ];
    
    console.log('Identity Matrix (Degenerate Case):');
    console.log(formatMatrix(identity));
    
    // Compute eigendecomposition
    console.log('\nPerforming eigendecomposition...');
    const { values, vectors } = eigenDecomposition(identity, {
      computeEigenvectors: true,
      enforceOrthogonality: true
    });
    
    // Display results
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    console.log('\nEigenvectors:');
    vectors?.forEach((v, i) => console.log(`v${i+1} = [${v.map(formatComplex).join(', ')}]`));
    
    // Verify eigenpairs
    if (vectors) {
      verifyEigenpairs(identity, values, vectors);
    }
    
    // Check orthogonality of eigenvectors
    if (vectors) {
      console.log('\nChecking orthogonality of eigenvectors:');
      const v1 = vectors[0];
      const v2 = vectors[1];
      
      let innerProduct = math.complex(0, 0);
      for (let k = 0; k < v1.length; k++) {
        innerProduct = math.add(
          innerProduct,
          math.multiply(math.conj(v1[k]), v2[k])
        ) as Complex;
      }
      
      console.log(`⟨v1|v2⟩ = ${formatComplex(innerProduct)}`);
      const isOrthogonal = Math.abs(innerProduct.re) < 1e-10 && Math.abs(innerProduct.im) < 1e-10;
      console.log(`Orthogonality: ${isOrthogonal ? 'PASSED ✓' : 'FAILED ✗'}`);
      expect(isOrthogonal).toBe(true);
    }
  });

  it('tests eigendecomposition of a 3×3 real symmetric matrix', () => {
    // 3×3 real symmetric matrix
    const matrix: ComplexMatrix = [
      [math.complex(1, 0), math.complex(2, 0), math.complex(3, 0)],
      [math.complex(2, 0), math.complex(2, 0), math.complex(1, 0)],
      [math.complex(3, 0), math.complex(1, 0), math.complex(3, 0)]
    ];
    
    console.log('3×3 Real Symmetric Matrix:');
    console.log(formatMatrix(matrix));
    
    // Compute eigendecomposition
    console.log('\nPerforming eigendecomposition...');
    const { values, vectors } = eigenDecomposition(matrix, {
      computeEigenvectors: true,
      enforceOrthogonality: true
    });
    
    // Display results
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    console.log('\nEigenvectors:');
    vectors?.forEach((v, i) => console.log(`v${i+1} = [${v.map(formatComplex).join(', ')}]`));
    
    // Verify eigenpairs
    if (vectors) {
      verifyEigenpairs(matrix, values, vectors);
    }

    // Assert eigenvalues are real for a real symmetric matrix
    values.forEach(v => {
      expect(Math.abs(v.im)).toBeLessThan(1e-10);
    });
  });

  it('computes eigenvalues only when requested', () => {
    const matrix: ComplexMatrix = [
      [math.complex(3, 0), math.complex(1, 0)],
      [math.complex(1, 0), math.complex(3, 0)]
    ];
    
    console.log('Computing eigenvalues only:');
    console.log(formatMatrix(matrix));
    
    const { values, vectors } = eigenDecomposition(matrix, {
      computeEigenvectors: false
    });
    
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    // Check that vectors are undefined
    console.log(`Eigenvectors computed: ${vectors !== undefined ? 'Yes' : 'No'}`);
    expect(vectors).toBeUndefined();
    
    // Verify eigenvalues are correct
    expect(values.length).toBe(2);
    
    // For this specific matrix, eigenvalues should be 4 and 2
    const sortedValues = [...values].sort((a, b) => b.re - a.re);
    expect(Math.abs(sortedValues[0].re - 4)).toBeLessThan(1e-10);
    expect(Math.abs(sortedValues[1].re - 2)).toBeLessThan(1e-10);
  });

  it('handles the Pauli-Y matrix correctly', () => {
    // Pauli-Y matrix (imaginary off-diagonal elements)
    const pauliY: ComplexMatrix = [
      [math.complex(0, 0), math.complex(0, -1)],
      [math.complex(0, 1), math.complex(0, 0)]
    ];
    
    console.log('Pauli-Y Matrix:');
    console.log(formatMatrix(pauliY));
    
    // Compute eigendecomposition
    console.log('\nPerforming eigendecomposition...');
    const { values, vectors } = eigenDecomposition(pauliY, {
      computeEigenvectors: true
    });
    
    // Display results
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    console.log('\nEigenvectors:');
    vectors?.forEach((v, i) => console.log(`v${i+1} = [${v.map(formatComplex).join(', ')}]`));
    
    // Verify eigenpairs
    if (vectors) {
      verifyEigenpairs(pauliY, values, vectors);
    }
    
    // Eigenvalues should be 1 and -1 for Pauli matrices
    const sortedValues = [...values].sort((a, b) => b.re - a.re);
    expect(Math.abs(sortedValues[0].re - 1)).toBeLessThan(1e-10);
    expect(Math.abs(sortedValues[1].re + 1)).toBeLessThan(1e-10);
  });

  it('handles the Pauli-Z matrix correctly', () => {
    // Pauli-Z matrix (diagonal with eigenvalues 1, -1)
    const pauliZ: ComplexMatrix = [
      [math.complex(1, 0), math.complex(0, 0)],
      [math.complex(0, 0), math.complex(-1, 0)]
    ];
    
    console.log('Pauli-Z Matrix:');
    console.log(formatMatrix(pauliZ));
    
    // Compute eigendecomposition
    console.log('\nPerforming eigendecomposition...');
    const { values, vectors } = eigenDecomposition(pauliZ, {
      computeEigenvectors: true,
      enforceOrthogonality: true
    });
    
    // Display results
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    console.log('\nEigenvectors:');
    vectors?.forEach((v, i) => console.log(`v${i+1} = [${v.map(formatComplex).join(', ')}]`));
    
    // Verify eigenpairs
    if (vectors) {
      verifyEigenpairs(pauliZ, values, vectors);
    }
    
    // Eigenvalues should be 1 and -1
    const sortedValues = [...values].sort((a, b) => b.re - a.re);
    expect(Math.abs(sortedValues[0].re - 1)).toBeLessThan(1e-10);
    expect(Math.abs(sortedValues[1].re + 1)).toBeLessThan(1e-10);
    
    // For Pauli-Z, the eigenvectors should be [1,0] and [0,1]
    // (or equivalent up to phase), which are the standard basis vectors
    if (vectors) {
      // Find which eigenvector corresponds to eigenvalue 1
      const eigenvalue1Index = values.findIndex(v => Math.abs(v.re - 1) < 1e-10);
      const v1 = vectors[eigenvalue1Index];
      
      // Find which eigenvector corresponds to eigenvalue -1
      const eigenvalueNeg1Index = values.findIndex(v => Math.abs(v.re + 1) < 1e-10);
      const v2 = vectors[eigenvalueNeg1Index];
      
      // Check that eigenvectors are approximately [1,0] and [0,1]
      // (Note: They could be rotated by a phase factor)
      const mag1 = Math.sqrt(v1[0].re * v1[0].re + v1[0].im * v1[0].im);
      const mag2 = Math.sqrt(v1[1].re * v1[1].re + v1[1].im * v1[1].im);
      const mag3 = Math.sqrt(v2[0].re * v2[0].re + v2[0].im * v2[0].im);
      const mag4 = Math.sqrt(v2[1].re * v2[1].re + v2[1].im * v2[1].im);
      
      console.log(`Magnitudes: |v1[0]|=${mag1.toFixed(4)}, |v1[1]|=${mag2.toFixed(4)}, |v2[0]|=${mag3.toFixed(4)}, |v2[1]|=${mag4.toFixed(4)}`);
      
      // One vector should have first component ≈ 1, other component ≈ 0
      // Other vector should have first component ≈ 0, other component ≈ 1
      const expectation1 = (Math.abs(mag1 - 1) < 1e-10 && mag2 < 1e-10) || 
                          (Math.abs(mag2 - 1) < 1e-10 && mag1 < 1e-10);
      const expectation2 = (Math.abs(mag3 - 1) < 1e-10 && mag4 < 1e-10) || 
                          (Math.abs(mag4 - 1) < 1e-10 && mag3 < 1e-10);
                          
      expect(expectation1).toBe(true);
      expect(expectation2).toBe(true);
    }
  });

  it('handles a nilpotent matrix correctly', () => {
    // Nilpotent matrix: A^2 = 0, all eigenvalues are 0
    const nilpotent: ComplexMatrix = [
      [math.complex(0, 0), math.complex(1, 0)],
      [math.complex(0, 0), math.complex(0, 0)]
    ];
    
    console.log('Nilpotent Matrix:');
    console.log(formatMatrix(nilpotent));
    
    // Compute eigendecomposition
    console.log('\nPerforming eigendecomposition...');
    const { values, vectors } = eigenDecomposition(nilpotent, {
      computeEigenvectors: true
    });
    
    // Display results
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    console.log('\nEigenvectors:');
    vectors?.forEach((v, i) => console.log(`v${i+1} = [${v.map(formatComplex).join(', ')}]`));
    
    // All eigenvalues should be 0
    values.forEach(v => {
      expect(Math.abs(v.re)).toBeLessThan(1e-10);
      expect(Math.abs(v.im)).toBeLessThan(1e-10);
    });
    
    // Verify eigenpairs
    if (vectors) {
      verifyEigenpairs(nilpotent, values, vectors);
    }
  });

  it('handles a matrix with complex eigenvalues', () => {
    // Matrix with complex eigenvalues
    const rotationMatrix: ComplexMatrix = [
      [math.complex(0, 0), math.complex(-1, 0)],
      [math.complex(1, 0), math.complex(0, 0)]
    ];
    
    console.log('Rotation Matrix (complex eigenvalues):');
    console.log(formatMatrix(rotationMatrix));
    
    // Compute eigendecomposition
    console.log('\nPerforming eigendecomposition...');
    const { values, vectors } = eigenDecomposition(rotationMatrix, {
      computeEigenvectors: true
    });
    
    // Display results
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    console.log('\nEigenvectors:');
    vectors?.forEach((v, i) => console.log(`v${i+1} = [${v.map(formatComplex).join(', ')}]`));
    
    // Eigenvalues should be i and -i
    const hasI = values.some(v => Math.abs(v.re) < 1e-10 && Math.abs(v.im - 1) < 1e-10);
    const hasNegI = values.some(v => Math.abs(v.re) < 1e-10 && Math.abs(v.im + 1) < 1e-10);
    
    expect(hasI).toBe(true);
    expect(hasNegI).toBe(true);
    
    // Verify eigenpairs
    if (vectors) {
      verifyEigenpairs(rotationMatrix, values, vectors);
    }
  });

  it('correctly handles a matrix with very different scales', () => {
    // Matrix with large difference in scales
    const scaleMatrix: ComplexMatrix = [
      [math.complex(1e6, 0), math.complex(0, 0)],
      [math.complex(0, 0), math.complex(1e-6, 0)]
    ];
    
    console.log('Matrix with different scales:');
    console.log(formatMatrix(scaleMatrix));
    
    // Compute eigendecomposition
    console.log('\nPerforming eigendecomposition...');
    const { values, vectors } = eigenDecomposition(scaleMatrix, {
      computeEigenvectors: true
    });
    
    // Display results
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    console.log('\nEigenvectors:');
    vectors?.forEach((v, i) => console.log(`v${i+1} = [${v.map(formatComplex).join(', ')}]`));
    
    // Eigenvalues should be 1e6 and 1e-6
    const sortedValues = [...values].sort((a, b) => b.re - a.re);
    expect(Math.abs(sortedValues[0].re - 1e6) / 1e6).toBeLessThan(1e-10);
    expect(Math.abs(sortedValues[1].re - 1e-6) / 1e-6).toBeLessThan(1e-10);
    
    // Verify eigenpairs
    if (vectors) {
      verifyEigenpairs(scaleMatrix, values, vectors);
    }
  });

  it('verifies full matrix reconstruction for a 3×3 Hermitian matrix', () => {
    // 3×3 Hermitian matrix
    const matrix: ComplexMatrix = [
      [math.complex(2, 0), math.complex(1, 1), math.complex(0, 0)],
      [math.complex(1, -1), math.complex(2, 0), math.complex(0, 1)],
      [math.complex(0, 0), math.complex(0, -1), math.complex(2, 0)]
    ];
    
    console.log('3×3 Hermitian Matrix:');
    console.log(formatMatrix(matrix));
    
    // Compute eigendecomposition
    console.log('\nPerforming eigendecomposition...');
    const { values, vectors } = eigenDecomposition(matrix, {
      computeEigenvectors: true,
      enforceOrthogonality: true
    });
    
    // Display results
    console.log('\nEigenvalues:');
    values.forEach((v, i) => console.log(`λ${i+1} = ${formatComplex(v)}`));
    
    console.log('\nEigenvectors:');
    vectors?.forEach((v, i) => console.log(`v${i+1} = [${v.map(formatComplex).join(', ')}]`));
    
    if (vectors) {
      // Create diagonal matrix D from eigenvalues
      const D: ComplexMatrix = Array(3).fill(null).map((_, i) => 
        Array(3).fill(null).map((_, j) => 
          i === j ? values[i] : math.complex(0, 0)
        )
      );
      console.log('\nEigenvalue Matrix D:');
      console.log(formatMatrix(D));
      
      // Calculate V·D
      const VD = multiplyMatrices(vectors, D);
      console.log('\nV·D:');
      console.log(formatMatrix(VD));
      
      // For Hermitian matrices, we use V·D·V† for reconstruction
      // Compute V† (conjugate transpose of V)
      const vDagger: ComplexMatrix = Array(3).fill(null).map((_, i) => 
        Array(3).fill(null).map((_, j) => 
          math.complex(vectors[j][i].re, -vectors[j][i].im)
        )
      );
      console.log('\nV† (Conjugate Transpose):');
      console.log(formatMatrix(vDagger));
      
      // Complete reconstruction V·D·V†
      const reconstructed = multiplyMatrices(VD, vDagger);
      console.log('\nReconstructed Matrix V·D·V†:');
      console.log(formatMatrix(reconstructed));
      
      // Compare original and reconstructed
      console.log('\nOriginal Matrix:');
      console.log(formatMatrix(matrix));
      
      // Verify they're approximately equal
      expect(matricesApproxEqual(matrix, reconstructed)).toBe(true);
    }
  });
});