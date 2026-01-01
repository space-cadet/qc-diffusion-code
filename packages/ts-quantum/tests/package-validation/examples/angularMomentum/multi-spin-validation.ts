/**
 * Essential validation components extracted from multi-spin-demo.ts
 * Provides manual coefficient calculation and intertwiner analysis for validation
 */

import { clebschGordan } from '../../src/angularMomentum';
import * as math from 'mathjs';

interface CouplingResult {
  m1: number;
  m2: number;
  m3: number;
  j12: number;
  J: number;
  M: number;
  coefficient: math.MathType;
  magnitude: number;
}

/**
 * Manual calculation of three-spin coupling coefficients for validation
 */
function calculateThreeSpinCoefficients(): CouplingResult[] {
  const results: CouplingResult[] = [];
  const m_values = [0.5, -0.5];
  
  for (const m1 of m_values) {
    for (const m2 of m_values) {
      for (const m3 of m_values) {
        const M = m1 + m2 + m3;
        
        for (const j12 of [0, 1]) {
          const J_min = Math.abs(j12 - 0.5);
          const J_max = j12 + 0.5;
          
          for (let J = J_min; J <= J_max; J += 0.5) {
            if (Math.abs(M) <= J) {
              const cg1 = clebschGordan(0.5, m1, 0.5, m2, j12, m1 + m2);
              const cg2 = clebschGordan(j12, m1 + m2, 0.5, m3, J, M);
              
              const coeff = math.multiply(cg1, cg2);
              const magnitude = math.abs(coeff);
              
              if (Number(magnitude) > 1e-10) {
                results.push({ m1, m2, m3, j12, J, M, coefficient: coeff, magnitude: Number(magnitude) });
              }
            }
          }
        }
      }
    }
  }
  
  return results;
}

/**
 * Calculate allowed J values for different vertex types
 */
function analyzeIntertwiners() {
  // Two-valent vertex (j1=j2=1/2)
  const two_valent: number[] = [];
  for (let J = 0; J <= 1; J += 0.5) {
    two_valent.push(J);
  }
  
  // Three-valent vertex (j1=j2=j3=1/2)
  const three_valent: number[] = [];
  for (const j12 of [0, 1]) {
    for (let J = Math.abs(j12 - 0.5); J <= j12 + 0.5; J += 0.5) {
      if (!three_valent.includes(J)) {
        three_valent.push(J);
      }
    }
  }
  
  return { two_valent, three_valent };
}

export { calculateThreeSpinCoefficients, analyzeIntertwiners, type CouplingResult };

// Run validation when called directly
console.log('=== Multi-Spin Validation Results ===');

const coefficients = calculateThreeSpinCoefficients();
console.log(`Three-spin coefficients found: ${coefficients.length}`);
coefficients.forEach((result, i) => {
  console.log(`${i+1}. |1/2,${result.m1}⟩|1/2,${result.m2}⟩|1/2,${result.m3}⟩ → |${result.J},${result.M}⟩ (j12=${result.j12}, coeff=${result.magnitude.toFixed(4)})`);
});

const intertwiners = analyzeIntertwiners();
console.log(`\nIntertwiner spaces:`);
console.log(`Two-valent allowed J: [${intertwiners.two_valent.join(', ')}]`);
console.log(`Three-valent allowed J: [${intertwiners.three_valent.join(', ')}]`);
