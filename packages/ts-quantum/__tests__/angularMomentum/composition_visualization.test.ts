/**
 * Visual tests for angular momentum addition
 * These tests provide detailed visual output to help understand the physics
 */

import { describe, it, expect } from 'vitest';
import { addAngularMomenta } from '../../src/angularMomentum/composition';
import { createJmState } from '../../src/angularMomentum/core';
import * as math from 'mathjs';

// Helper function to format complex numbers nicely
function formatComplex(c: any): string {
  const re = (c.re ?? c).toFixed(3);
  const im = (c.im ?? 0).toFixed(3);
  if (Math.abs(c.im ?? 0) < 1e-10) return re;
  return `${re} ${im >= 0 ? '+' : ''}${im}i`;
}

// Helper function to create a visual representation of a state vector
function visualizeState(state: any, label: string = ''): void {
  console.log('\n' + '='.repeat(60));
  console.log(`${label}:`);
  console.log('State vector:',state);
  console.log(`Dimension: ${state.dimension}`);
  console.log(`Basis: ${state.basis}`);
  console.log('='.repeat(60));
}

describe('Angular Momentum Addition Visualization', () => {
  describe('Two spin-1/2 particles', () => {
    it('should show addition of parallel spins (↑↑)', () => {
      const spin1Up = createJmState(0.5, 0.5);
      const spin2Up = createJmState(0.5, 0.5);
      
      console.log('\n📊 Adding two spin-1/2 particles with m₁ = m₂ = +1/2 (↑↑)');
      visualizeState(spin1Up, 'First spin-1/2');
      visualizeState(spin2Up, 'Second spin-1/2');
      
      const combined = addAngularMomenta(spin1Up, 0.5, spin2Up, 0.5);
      visualizeState(combined, 'Combined state');
      
      // This should be pure triplet state |1,1⟩
      expect(combined.basis).toBe('|(0.5,0.5),1,1⟩');
    });

    it('should show addition of antiparallel spins (↑↓)', () => {
      const spinUp = createJmState(0.5, 0.5);
      const spinDown = createJmState(0.5, -0.5);
      
      console.log('\n📊 Adding two spin-1/2 particles with m₁ = +1/2, m₂ = -1/2 (↑↓)');
      visualizeState(spinUp, 'Spin up');
      visualizeState(spinDown, 'Spin down');
      
      const combined = addAngularMomenta(spinUp, 0.5, spinDown, 0.5);
      visualizeState(combined, 'Combined state');
      
      // Should be a superposition of |1,0⟩ and |0,0⟩
      expect(combined.dimension).toBe(4);
    });
  });

  describe('Spin-1 and spin-1/2 particles', () => {
    it('should show addition of maximum m states', () => {
      const spin1 = createJmState(1, 1);    // |1,1⟩
      const spinHalf = createJmState(0.5, 0.5);  // |1/2,1/2⟩
      
      console.log('\n📊 Adding spin-1 (m=1) and spin-1/2 (m=1/2) particles');
      visualizeState(spin1, 'Spin-1');
      visualizeState(spinHalf, 'Spin-1/2');
      
      const combined = addAngularMomenta(spin1, 1, spinHalf, 0.5);
      visualizeState(combined, 'Combined state');
      
      // Should be pure |3/2,3/2⟩ state
      expect(combined.basis).toBe('|(1,0.5),1.5,1.5⟩');
    });

    it('should show addition with intermediate m states', () => {
      const spin1 = createJmState(1, 0);    // |1,0⟩
      const spinHalf = createJmState(0.5, 0.5);  // |1/2,1/2⟩
      
      console.log('\n📊 Adding spin-1 (m=0) and spin-1/2 (m=1/2) particles');
      visualizeState(spin1, 'Spin-1');
      visualizeState(spinHalf, 'Spin-1/2');
      
      const combined = addAngularMomenta(spin1, 1, spinHalf, 0.5);
      visualizeState(combined, 'Combined state');
      
      // Should be a superposition of |3/2,1/2⟩ and |1/2,1/2⟩
      expect(combined.dimension).toBe(6);
    });
  });

  describe('Two spin-1 particles', () => {
    it('should show addition of maximum aligned spins', () => {
      const spin1A = createJmState(1, 1);
      const spin1B = createJmState(1, 1);
      
      console.log('\n📊 Adding two spin-1 particles with maximum m values');
      visualizeState(spin1A, 'First spin-1');
      visualizeState(spin1B, 'Second spin-1');
      
      const combined = addAngularMomenta(spin1A, 1, spin1B, 1);
      visualizeState(combined, 'Combined state');
      
      // Should be pure |2,2⟩ state
      expect(combined.basis).toBe('|(1,1),2,2⟩');
    });

    it('should show addition of orthogonal spins', () => {
      const spin1A = createJmState(1, 1);
      const spin1B = createJmState(1, 0);
      
      console.log('\n📊 Adding two spin-1 particles with m₁=1, m₂=0');
      visualizeState(spin1A, 'First spin-1');
      visualizeState(spin1B, 'Second spin-1');
      
      const combined = addAngularMomenta(spin1A, 1, spin1B, 1);
      visualizeState(combined, 'Combined state');
      
      // Should be a superposition of multiple states
      expect(combined.dimension).toBe(9);
    });
  });
});