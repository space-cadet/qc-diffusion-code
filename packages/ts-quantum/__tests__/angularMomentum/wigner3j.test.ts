/**
 * Tests for Wigner 3j symbols implementation
 */

import { describe, it, expect } from 'vitest';
import { wigner3j, isValidTriangle, wigner3jSymmetry } from '../../src/angularMomentum/wignerSymbols';
import { Complex } from '../../src/core/types';
import * as math from 'mathjs';

describe('Wigner 3j Symbols', () => {
  describe('Triangle inequality validation', () => {
    it('should validate correct triangles', () => {
      expect(isValidTriangle(1, 1, 2)).toBe(true);
      expect(isValidTriangle(1, 1, 1)).toBe(true);
      expect(isValidTriangle(0.5, 0.5, 1)).toBe(true);
      expect(isValidTriangle(1, 2, 3)).toBe(true);
    });
    
    it('should reject invalid triangles', () => {
      expect(isValidTriangle(1, 1, 3)).toBe(false);
      expect(isValidTriangle(1, 2, 4)).toBe(false);
      expect(isValidTriangle(0.5, 0.5, 2)).toBe(false);
      expect(isValidTriangle(2, 1, 0)).toBe(false);
    });
  });

  describe('Selection rules', () => {
    it('should return zero for invalid magnetic quantum number sum', () => {
      // m1 + m2 + m3 ≠ 0
      const result = wigner3j(1, 1, 2, 1, 0, 0);
      expect(math.abs(result.re)).toBeCloseTo(0, 10);
      expect(math.abs(result.im)).toBeCloseTo(0, 10);
    });
    
    it('should return zero for invalid triangle inequality', () => {
      // j1 + j2 < j3
      const result = wigner3j(1, 1, 3, 0, 0, 0);
      expect(math.abs(result.re)).toBeCloseTo(0, 10);
      expect(math.abs(result.im)).toBeCloseTo(0, 10);
    });
    
    it('should return zero for |m| > j', () => {
      // m1 > j1
      const result = wigner3j(1, 1, 2, 2, 0, -2);
      expect(math.abs(result.re)).toBeCloseTo(0, 10);
      expect(math.abs(result.im)).toBeCloseTo(0, 10);
    });
  });

  describe('Known values validation', () => {
    it('should calculate (1 1 2; 0 0 0) = √(2/15)', () => {
      const result = wigner3j(1, 1, 2, 0, 0, 0);
      expect(result.re).toBeCloseTo(Math.sqrt(2/15), 6);
      expect(math.abs(result.im)).toBeCloseTo(0, 10);
    });

    it('should calculate (1/2 1/2 1; 1/2 -1/2 0) = -1/sqrt(6)', () => {
      const result = wigner3j(0.5, 0.5, 1, 0.5, -0.5, 0);
      expect(result.re).toBeCloseTo(-1 / Math.sqrt(6), 6);
      expect(math.abs(result.im)).toBeCloseTo(0, 10);
    });
  });

  describe('Symmetry properties', () => {
    it('should be invariant under cyclic permutations', () => {
      const j1 = 1, j2 = 1, j3 = 2;
      const m1 = 0, m2 = 0, m3 = 0;
      
      const original = wigner3j(j1, j2, j3, m1, m2, m3);
      const cyclic1 = wigner3j(j2, j3, j1, m2, m3, m1);
      const cyclic2 = wigner3j(j3, j1, j2, m3, m1, m2);
      
      expect(original.re).toBeCloseTo(cyclic1.re, 6);
      expect(original.re).toBeCloseTo(cyclic2.re, 6);
    });

    it('should transform correctly under odd permutations', () => {
      const j1 = 1, j2 = 1, j3 = 2;
      const m1 = 1, m2 = -1, m3 = 0;
      
      const original = wigner3j(j1, j2, j3, m1, m2, m3);
      const odd1 = wigner3j(j2, j1, j3, m2, m1, m3);
      
      // Odd permutation should give phase (-1)^(j1+j2+j3)
      const phase = Math.pow(-1, j1 + j2 + j3);
      expect(original.re).toBeCloseTo(phase * odd1.re, 6);
    });

    it('should be invariant under sign reversal of all m values', () => {
      const j1 = 1, j2 = 1, j3 = 2;
      const m1 = 1, m2 = 0, m3 = -1;
      
      const original = wigner3j(j1, j2, j3, m1, m2, m3);
      const signReversed = wigner3j(j1, j2, j3, -m1, -m2, -m3);
      const J = j1 + j2 + j3;
      const expectedPhase = math.complex(Math.pow(-1, J));
      const expectedValue = math.multiply(signReversed, expectedPhase) as Complex;
      
      expect(original.re).toBeCloseTo(expectedValue.re, 6);
      expect(original.im).toBeCloseTo(expectedValue.im, 6);
    });
  });

  describe('Error handling', () => {
    it('should handle negative angular momentum', () => {
      const result = wigner3j(-1, 1, 2, 0, 0, 0);
      expect(math.abs(result.re)).toBeCloseTo(0, 10);
      expect(math.abs(result.im)).toBeCloseTo(0, 10);
    });
    
    it('should handle non-physical quantum numbers gracefully', () => {
      const result = wigner3j(1, 1, 1, 5, -5, 0);
      expect(math.abs(result.re)).toBeCloseTo(0, 10);
      expect(math.abs(result.im)).toBeCloseTo(0, 10);
    });
  });
});
