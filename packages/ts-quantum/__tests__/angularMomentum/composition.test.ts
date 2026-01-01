/**
 * Tests for angular momentum composition
*/

import { describe, it, expect } from 'vitest';
import { clebschGordan, isZeroCG, addAngularMomenta, decomposeAngularState } from '../../src/angularMomentum/composition';
import { createJmState } from '../../src/angularMomentum/core';
import * as math from 'mathjs';

describe('Angular Momentum Composition', () => {
  describe('Clebsch-Gordan Coefficients', () => {
    it('should return zero for coefficients that violate selection rules', () => {
      // m ≠ m1 + m2
      const cg1 = clebschGordan(1, 1, 1, 0, 2, 0);
      console.log('CG Rule Violation (m ≠ m1 + m2): j1=1, m1=1, j2=1, m2=0, j=2, m=0 => CG =', cg1);
      expect(math.abs((cg1 as any).re ?? cg1)).toBeLessThan(1e-10);
      
      // j > j1 + j2
      const cg2 = clebschGordan(1, 1, 1, 1, 3, 2);
      console.log('CG Rule Violation (j > j1 + j2): j1=1, m1=1, j2=1, m2=1, j=3, m=2 => CG =', cg2);
      expect(math.abs((cg2 as any).re ?? cg2)).toBeLessThan(1e-10);
      
      // j < |j1 - j2|
      const cg3 = clebschGordan(2, 1, 1, 0, 0, 1);
      console.log('CG Rule Violation (j < |j1 - j2|): j1=2, m1=1, j2=1, m2=0, j=0, m=1 => CG =', cg3);
      expect(math.abs((cg3 as any).re ?? cg3)).toBeLessThan(1e-10);
    });
    
    it('should correctly calculate coefficients for two spin-1/2 particles', () => {
      // Singlet state (j=0)
      const c1 = clebschGordan(0.5, 0.5, 0.5, -0.5, 0, 0);
      console.log('CG Singlet state: j1=1/2, m1=1/2, j2=1/2, m2=-1/2, j=0, m=0 => CG =', c1, 'Expected: -1/√2 =', -1/Math.sqrt(2));
      expect(math.abs(math.subtract((c1 as any).re ?? c1, -1/Math.sqrt(2)))).toBeLessThan(1e-10);
      
      const c2 = clebschGordan(0.5, -0.5, 0.5, 0.5, 0, 0);
      console.log('CG Singlet state: j1=1/2, m1=-1/2, j2=1/2, m2=1/2, j=0, m=0 => CG =', c2, 'Expected: 1/√2 =', 1/Math.sqrt(2));
      expect(math.abs(math.subtract((c2 as any).re ?? c2, 1/Math.sqrt(2)))).toBeLessThan(1e-10);
      
      // Triplet states (j=1)
      const c3 = clebschGordan(0.5, 0.5, 0.5, 0.5, 1, 1);
      console.log('CG Triplet state (m=1): j1=1/2, m1=1/2, j2=1/2, m2=1/2, j=1, m=1 => CG =', c3, 'Expected: 1');
      expect(math.abs(math.subtract((c3 as any).re ?? c3, 1))).toBeLessThan(1e-10);
      
      const c4 = clebschGordan(0.5, 0.5, 0.5, -0.5, 1, 0);
      console.log('CG Triplet state (m=0): j1=1/2, m1=1/2, j2=1/2, m2=-1/2, j=1, m=0 => CG =', c4, 'Expected: 1/√2 =', 1/Math.sqrt(2));
      expect(math.abs(math.subtract((c4 as any).re ?? c4, 1/Math.sqrt(2)))).toBeLessThan(1e-10);
      
      const c5 = clebschGordan(0.5, -0.5, 0.5, -0.5, 1, -1);
      console.log('CG Triplet state (m=-1): j1=1/2, m1=-1/2, j2=1/2, m2=-1/2, j=1, m=-1 => CG =', c5, 'Expected: 1');
      expect(math.abs(math.subtract((c5 as any).re ?? c5, 1))).toBeLessThan(1e-10);
    });
    
    it('should correctly calculate coefficients for j1=1, j2=1/2 case', () => {
      // This is another common case in physics
      // |3/2, 3/2⟩ = |1, 1⟩|1/2, 1/2⟩
      const c1 = clebschGordan(1, 1, 0.5, 0.5, 1.5, 1.5);
      console.log('CG j1=1, j2=1/2 case: j1=1, m1=1, j2=1/2, m2=1/2, j=3/2, m=3/2 => CG =', c1, 'Expected: 1');
      expect(math.abs(math.subtract((c1 as any).re ?? c1, 1))).toBeLessThan(1e-10);
      
      // |3/2, 1/2⟩ = √(2/3)|1, 1⟩|1/2, -1/2⟩ + √(1/3)|1, 0⟩|1/2, 1/2⟩
      const c2 = clebschGordan(1, 1, 0.5, -0.5, 1.5, 0.5);
      console.log('CG j1=1, j2=1/2 case: j1=1, m1=1, j2=1/2, m2=-1/2, j=3/2, m=1/2 => CG =', c2, 'Expected: √(2/3) =', Math.sqrt(2/3));
      expect(math.abs(math.subtract((c2 as any).re ?? c2, Math.sqrt(2/3)))).toBeLessThan(1e-10);
      
      const c3 = clebschGordan(1, 0, 0.5, 0.5, 1.5, 0.5);
      console.log('CG j1=1, j2=1/2 case: j1=1, m1=0, j2=1/2, m2=1/2, j=3/2, m=1/2 => CG =', c3, 'Expected: √(1/3) =', Math.sqrt(1/3));
      expect(math.abs(math.subtract((c3 as any).re ?? c3, Math.sqrt(1/3)))).toBeLessThan(1e-10);
    });
  });
  
  describe('Angular Momentum Addition', () => {
    // Create the test states once for all test cases
    const state1 = createJmState(0.5, 0.5);
    const state2 = createJmState(0.5, 0.5);
    const state3 = createJmState(0.5, -0.5);
    const combined = addAngularMomenta(state1, 0.5, state2, 0.5);

    const combined2 = addAngularMomenta(state1, 0.5, state3, 0.5);

    console.log('state1:', state1);
    console.log('state2:', state2);
    console.log('state3:', state3);
    console.log('Combined state:', combined);
    console.log('Dimension:', combined.dimension);
    console.log('Combined state 2:', combined2);
    console.log('Dimension 2:', combined2.dimension);

    it('should create combined state with correct dimension', () => {
      // The result should be of dimension 4 (2*(0+1)+1 = 3 for j=1 + 1 for j=0)
      expect(combined.dimension).toBe(4);
    });

    it('should have correct amplitude for |j=1, m=1⟩ component', () => {
      // The first element should be 1 (|j=1, m=1⟩ component)
      const diff = math.subtract(combined.amplitudes[0], math.complex(1, 0));

      console.log(diff);

      expect(math.abs(diff.re) + math.abs(diff.im)).toBeLessThan(1e-10);
    });

    it('should have zero amplitude for second component', () => {
      expect(math.abs(combined.amplitudes[1])).toBeLessThan(1e-10);
    });

    it('should have zero amplitude for third component', () => {
      expect(math.abs(combined.amplitudes[2])).toBeLessThan(1e-10);
    });

    it('should have zero amplitude for fourth component', () => {
      expect(math.abs(combined.amplitudes[3])).toBeLessThan(1e-10);
    });
  });
});
