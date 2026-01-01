/**
 * Comprehensive indexing consistency tests for Angular Momentum module
 * 
 * These tests verify that all angular momentum functions use consistent indexing
 * conventions throughout the module, preventing the type of indexing bugs that
 * were identified and fixed in the core implementation.
 */

import { describe, it, expect } from 'vitest';
import * as math from 'mathjs';

import {
  createJmState,
  createJplus,
  createJminus,
  createJz,
  computationalToAngularBasis,
  angularToComputationalBasis
} from '../../src/angularMomentum/core';

import {
  addAngularMomenta,
  clebschGordan
} from '../../src/angularMomentum/composition';

import {
  analyzeAngularState,
  extractJComponent
} from '../../src/angularMomentum/stateAnalysis';

import { StateVector } from '../../src/states/stateVector';

import { formatComplex, formatMatrix } from '../utils/testHelpers'

describe('Angular Momentum Indexing Consistency', () => {
  
  describe('State Creation Indexing', () => {
    it('should place j=1/2 states at correct indices', () => {
      // Convention: idx = dim - 1 - (j + m)
      // For j=1/2: |1/2,1/2⟩ at idx=0, |1/2,-1/2⟩ at idx=1
      
      const state_up = createJmState(0.5, 0.5);
      const state_down = createJmState(0.5, -0.5);
      
      // |1/2,1/2⟩ should be [1,0]
      expect(Number(math.abs(state_up.amplitudes[0]))).toBeCloseTo(1, 10);
      expect(Number(math.abs(state_up.amplitudes[1]))).toBeCloseTo(0, 10);
      
      // |1/2,-1/2⟩ should be [0,1]
      expect(Number(math.abs(state_down.amplitudes[0]))).toBeCloseTo(0, 10);
      expect(Number(math.abs(state_down.amplitudes[1]))).toBeCloseTo(1, 10);
    });

    it('should place j=1 states at correct indices', () => {
      // For j=1: |1,1⟩ at idx=0, |1,0⟩ at idx=1, |1,-1⟩ at idx=2
      
      const state_up = createJmState(1, 1);
      const state_zero = createJmState(1, 0);
      const state_down = createJmState(1, -1);
      
      // |1,1⟩ should be [1,0,0]
      expect(Number(math.abs(state_up.amplitudes[0]))).toBeCloseTo(1, 10);
      expect(Number(math.abs(state_up.amplitudes[1]))).toBeCloseTo(0, 10);
      expect(Number(math.abs(state_up.amplitudes[2]))).toBeCloseTo(0, 10);
      
      // |1,0⟩ should be [0,1,0]
      expect(Number(math.abs(state_zero.amplitudes[0]))).toBeCloseTo(0, 10);
      expect(Number(math.abs(state_zero.amplitudes[1]))).toBeCloseTo(1, 10);
      expect(Number(math.abs(state_zero.amplitudes[2]))).toBeCloseTo(0, 10);
      
      // |1,-1⟩ should be [0,0,1]
      expect(Number(math.abs(state_down.amplitudes[0]))).toBeCloseTo(0, 10);
      expect(Number(math.abs(state_down.amplitudes[1]))).toBeCloseTo(0, 10);
      expect(Number(math.abs(state_down.amplitudes[2]))).toBeCloseTo(1, 10);
    });

    it('should create normalized states', () => {
      const states = [
        createJmState(0.5, 0.5),
        createJmState(0.5, -0.5),
        createJmState(1, 1),
        createJmState(1, 0),
        createJmState(1, -1),
        createJmState(1.5, 1.5),
        createJmState(1.5, -1.5)
      ];

      states.forEach(state => {
        expect(state.norm()).toBeCloseTo(1, 10);
      });
    });
  });

  describe('Operator Action Indexing', () => {
    it('should correctly apply J+ for j=1/2', () => {
      const j = 0.5;
      const jplus = createJplus(j);
      
      // J+|-1/2⟩ = |1/2⟩
      const state_down = createJmState(j, -0.5);
      const raised = jplus.apply(state_down);
      const expected = createJmState(j, 0.5);

      // console.log("State Down: ", state_down.toString());
      // console.log("Raised: ", raised.toString());
      // console.log("Expected: ", expected.toString());
      
      expect(raised.equals(expected, 1e-10)).toBe(true);
      
      // J+|1/2⟩ = 0
      const state_up = createJmState(j, 0.5);
      const raised_max = jplus.apply(state_up);
      expect(raised_max.norm()).toBeCloseTo(0, 10);
    });

    it('should correctly apply J- for j=1/2', () => {
      const j = 0.5;
      const jminus = createJminus(j);
      
      // J-|1/2⟩ = |-1/2⟩
      const state_up = createJmState(j, 0.5);
      const lowered = jminus.apply(state_up);
      const expected = createJmState(j, -0.5);
      
      expect(lowered.equals(expected, 1e-10)).toBe(true);
      
      // J-|-1/2⟩ = 0
      const state_down = createJmState(j, -0.5);
      const lowered_min = jminus.apply(state_down);
      expect(lowered_min.norm()).toBeCloseTo(0, 10);
    });

    it('should correctly apply Jz for j=1/2', () => {
      const j = 0.5;
      const jz = createJz(j);
      
      // Jz|1/2⟩ = (1/2)|1/2⟩
      const state_up = createJmState(j, 0.5);
      const jz_up = jz.apply(state_up);
      const expected_up = state_up.scale(math.complex(0.5, 0));
      
      expect(jz_up.equals(expected_up, 1e-10)).toBe(true);
      
      // Jz|-1/2⟩ = (-1/2)|-1/2⟩
      const state_down = createJmState(j, -0.5);
      const jz_down = jz.apply(state_down);
      const expected_down = state_down.scale(math.complex(-0.5, 0));
      
      expect(jz_down.equals(expected_down, 1e-10)).toBe(true);
    });

    it('should correctly apply operators for j=1', () => {
      const j = 1;
      const jplus = createJplus(j);
      const jminus = createJminus(j);
      const jz = createJz(j);
      
      // Test J+ ladder operations
      const state_down = createJmState(j, -1);
      const state_zero = createJmState(j, 0);
      const state_up = createJmState(j, 1);
      
      // J+|-1⟩ = √2|0⟩
      const raised_from_down = jplus.apply(state_down);
      const expected_zero_scaled = state_zero.scale(math.complex(Math.sqrt(2), 0));

      // console.log(raised_from_down);
      // console.log(expected_zero_scaled);

      expect(raised_from_down.equals(expected_zero_scaled, 1e-10)).toBe(true);
      
      // J+|0⟩ = √2|1⟩  
      const raised_from_zero = jplus.apply(state_zero);
      const expected_up_scaled = state_up.scale(math.complex(Math.sqrt(2), 0));
      expect(raised_from_zero.equals(expected_up_scaled, 1e-10)).toBe(true);
      
      // Test Jz eigenvalues
      const jz_up = jz.apply(state_up);
      const jz_zero = jz.apply(state_zero);
      const jz_down = jz.apply(state_down);
      
      expect(jz_up.equals(state_up.scale(math.complex(1, 0)), 1e-10)).toBe(true);
      expect(jz_zero.equals(state_zero.scale(math.complex(0, 0)), 1e-10)).toBe(true);
      expect(jz_down.equals(state_down.scale(math.complex(-1, 0)), 1e-10)).toBe(true);
    });
  });

  describe('Matrix Element Verification', () => {
    it('should have correct J+ matrix elements for j=1/2', () => {
      const j = 0.5;
      const jplus = createJplus(j);
      const matrix = jplus.toMatrix();

      console.log(formatMatrix(matrix));
      
      // With our indexing: |1/2⟩ at idx=0, |-1/2⟩ at idx=1
      // J+ should connect |-1/2⟩ to |1/2⟩, so matrix[1][0] should be non-zero
      expect(matrix[0][0].re).toBeCloseTo(0, 10);
      expect(matrix[0][1].re).toBeCloseTo(1, 10);
      expect(matrix[1][0].re).toBeCloseTo(0, 10);
      expect(matrix[1][1].re).toBeCloseTo(0, 10);
    });

    it('should have correct J- matrix elements for j=1/2', () => {
      const j = 0.5;
      const jminus = createJminus(j);
      const matrix = jminus.toMatrix();
      
      console.log(formatMatrix(matrix));

      // J- should connect |1/2⟩ to |-1/2⟩, so matrix[0][1] should be non-zero
      expect(matrix[0][0].re).toBeCloseTo(0, 10);
      expect(matrix[0][1].re).toBeCloseTo(0, 10);
      expect(matrix[1][0].re).toBeCloseTo(1, 10);
      expect(matrix[1][1].re).toBeCloseTo(0, 10);
    });

    it('should have correct Jz matrix elements for j=1/2', () => {
      const j = 0.5;
      const jz = createJz(j);
      const matrix = jz.toMatrix();

      console.log(formatMatrix(matrix));
      
      // Diagonal matrix with eigenvalues
      expect(matrix[0][0].re).toBeCloseTo(0.5, 10);
      expect(matrix[0][1].re).toBeCloseTo(0, 10);
      expect(matrix[1][0].re).toBeCloseTo(0, 10);
      expect(matrix[1][1].re).toBeCloseTo(-0.5, 10);
    });
  });

  describe('Basis Conversion Indexing', () => {
    it('should maintain consistency in round-trip conversions', () => {
      const testStates = [
        createJmState(0.5, 0.5),
        createJmState(0.5, -0.5),
        createJmState(1, 1),
        createJmState(1, 0),
        createJmState(1, -1)
      ];

      testStates.forEach(original => {
        const j = (original.dimension - 1) / 2;
        
        // Angular → Computational → Angular
        const computational = angularToComputationalBasis(original, j);
        const backToAngular = computationalToAngularBasis(computational, j);
        
        expect(backToAngular.equals(original, 1e-10)).toBe(true);
      });
    });

    it('should correctly map computational basis states', () => {
      const j = 0.5;
      const dim = 2;
      
      // Create computational basis states [1,0] and [0,1]
      const comp_0 = new StateVector(dim, [math.complex(1, 0), math.complex(0, 0)], '|0⟩');
      const comp_1 = new StateVector(dim, [math.complex(0, 0), math.complex(1, 0)], '|1⟩');
      
      // Convert to angular basis
      const ang_from_0 = computationalToAngularBasis(comp_0, j);
      const ang_from_1 = computationalToAngularBasis(comp_1, j);
      
      // Should map to proper angular momentum states
      // |0⟩ → |1/2,-1/2⟩, |1⟩ → |1/2,1/2⟩
      const expected_down = createJmState(j, -0.5);
      const expected_up = createJmState(j, 0.5);
      
      expect(ang_from_0.equals(expected_down, 1e-10)).toBe(true);
      expect(ang_from_1.equals(expected_up, 1e-10)).toBe(true);
    });
  });

  describe('Angular Momentum Coupling Indexing', () => {
    it('should correctly couple two j=1/2 states', () => {
      const j1 = 0.5, j2 = 0.5;
      
      // Create individual states
      const state1_up = createJmState(j1, 0.5);
      const state1_down = createJmState(j1, -0.5);
      const state2_up = createJmState(j2, 0.5);
      const state2_down = createJmState(j2, -0.5);
      
      // Test coupling of aligned spins
      const coupled_up_up = addAngularMomenta(state1_up, j1, state2_up, j2);
      expect(coupled_up_up.norm()).toBeCloseTo(1, 10);
      
      // Test coupling of anti-aligned spins
      const coupled_up_down = addAngularMomenta(state1_up, j1, state2_down, j2);
      expect(coupled_up_down.norm()).toBeCloseTo(1, 10);
      
      // Verify the coupled states are different
      expect(coupled_up_up.equals(coupled_up_down, 1e-10)).toBe(false);
    });

    it('should produce correct Clebsch-Gordan coefficients', () => {
      // Test some known CG coefficients for j1=j2=1/2
      const j1 = 0.5, j2 = 0.5;
      
      // ⟨1/2,1/2;1/2,1/2|1,1⟩ = 1
      const cg1 = clebschGordan(j1, 0.5, j2, 0.5, 1, 1);
      expect(Number(math.abs(cg1))).toBeCloseTo(1, 10);
      
      // ⟨1/2,1/2;1/2,-1/2|1,0⟩ = 1/√2
      const cg2 = clebschGordan(j1, 0.5, j2, -0.5, 1, 0);
      expect(Number(math.abs(cg2))).toBeCloseTo(1/Math.sqrt(2), 10);
      
      // ⟨1/2,1/2;1/2,-1/2|0,0⟩ = -1/√2
      const cg3 = clebschGordan(j1, 0.5, j2, -0.5, 0, 0);

      console.log("CG Coefficients:");
      console.log("cg1: ", cg1);
      console.log("cg2: ", cg2);
      console.log("cg3: ", cg3);

      expect(Number(math.abs(cg3))).toBeCloseTo(1/Math.sqrt(2), 10);
    });
  });

  describe('State Analysis Indexing', () => {
    it('should correctly analyze single j states', () => {
      const states = [
        { state: createJmState(0.5, 0.5), j: 0.5 },
        { state: createJmState(1, 0), j: 1 },
        { state: createJmState(1.5, -1.5), j: 1.5 }
      ];

      states.forEach(({ state, j }) => {
        // Analysis should identify the state metadata correctly
        const metadata = state.getAngularMomentumMetadata();
        expect(metadata).toBeDefined();
        expect(metadata?.j).toBe(j);
        expect(metadata?.isComposite).toBe(false);
      });
    });

    it('should correctly analyze coupled states', () => {
      const j1 = 0.5, j2 = 0.5;
      const state1 = createJmState(j1, 0.5);
      const state2 = createJmState(j2, -0.5);
      
      const coupled = addAngularMomenta(state1, j1, state2, j2);
      
      // Analysis should detect composite nature
      const metadata = coupled.getAngularMomentumMetadata();
      expect(metadata).toBeDefined();
      expect(metadata?.isComposite).toBe(true);
      
      // Should contain both singlet and triplet components
      expect(metadata?.jComponents.size).toBeGreaterThan(0);
    });

    it('should correctly extract j-components', () => {
      const j1 = 0.5, j2 = 0.5;
      const state1 = createJmState(j1, 0.5);
      const state2 = createJmState(j2, -0.5);
      
      const coupled = addAngularMomenta(state1, j1, state2, j2);
      
      // Try to extract the j=1 component
      const j1_component = extractJComponent(coupled, 1);
      expect(j1_component).toBeDefined();
      if (j1_component) {
        expect(j1_component.j).toBe(1);
        expect(j1_component.state.norm()).toBeCloseTo(1, 10);
      }
      
      // Try to extract the j=0 component
      const j0_component = extractJComponent(coupled, 0);
      expect(j0_component).toBeDefined();
      if (j0_component) {
        expect(j0_component.j).toBe(0);
        expect(j0_component.state.norm()).toBeCloseTo(1, 10);
      }
    });
  });

  describe('Cross-Consistency Checks', () => {
    it('should maintain orthogonality of different m states', () => {
      const j = 1;
      const states = [
        createJmState(j, 1),
        createJmState(j, 0), 
        createJmState(j, -1)
      ];

      // All pairs should be orthogonal
      for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
          const overlap = states[i].innerProduct(states[j]);
          expect(Number(math.abs(overlap))).toBeCloseTo(0, 10);
        }
      }
    });

    it('should satisfy completeness relation', () => {
      const j = 0.5;
      const state_up = createJmState(j, 0.5);
      const state_down = createJmState(j, -0.5);
      
      // Any state should be expressible as a linear combination
      const arbitrary = new StateVector(2, [
        math.complex(0.6, 0.2),
        math.complex(0.3, -0.7)
      ]).normalize();
      
      const c1 = state_up.innerProduct(arbitrary);
      const c2 = state_down.innerProduct(arbitrary);
      
      const reconstructed = state_up.scale(c1).add(state_down.scale(c2));
      expect(reconstructed.equals(arbitrary, 1e-10)).toBe(true);
    });

    it('should satisfy angular momentum commutation relations', () => {
      const j = 1;
      const jplus = createJplus(j);
      const jminus = createJminus(j);
      const jz = createJz(j);
      
      // [Jz, J+] = J+
      const commutator1 = jz.compose(jplus).add(jplus.compose(jz).scale(math.complex(-1, 0)));
      const expected1 = jplus;
      
      // Check if matrices are approximately equal (within tolerance)
      const matrix1 = commutator1.toMatrix();
      const expectedMatrix1 = expected1.toMatrix();
      
      for (let i = 0; i < matrix1.length; i++) {
        for (let k = 0; k < matrix1[i].length; k++) {
          expect(Number(math.abs(math.subtract(matrix1[i][k], expectedMatrix1[i][k])))).toBeLessThan(1e-10);
        }
      }
    });
  });
});
