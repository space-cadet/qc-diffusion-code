/**
 * Multi-Spin Coupling Test Prototype
 * 
 * This is experimental code to test the capabilities of the current quantum module
 * for handling coupling of 2, 3, or more spins using existing infrastructure.
 */

import { 
  createJmState, 
  clebschGordan, 
  addAngularMomenta 
} from '../../src/angularMomentum';
import { StateVector } from '../../src/states/stateVector';
import * as math from 'mathjs';

// Define the interface for the coupling result
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

interface TestResults {
    twoSpin: StateVector | null;
    threeSpin: StateVector | null;
    threeSpinAlt: StateVector | CouplingResult[] | null;
    fourSpin: StateVector | null;
    intertwiners: IntertwinerAnalysis | null;
}

interface IntertwinerAnalysis {
    two_valent: number[];
    three_valent: string;
    four_valent: string;
}

// ============================================================================
// TEST 1: Two-Spin Coupling (Baseline)
// ============================================================================

function testTwoSpinCoupling() {
  console.log('\n=== TWO-SPIN COUPLING TEST ===');
  
  // Create two spin-1/2 states
  const spin1 = createJmState(0.5, 0.5);   // |1/2, +1/2⟩
  const spin2 = createJmState(0.5, -0.5);  // |1/2, -1/2⟩
  
  console.log('Spin 1:', spin1.toString());
  console.log('Spin 2:', spin2.toString());
  
  // Couple them
  const coupled = addAngularMomenta(spin1, 0.5, spin2, 0.5);
  console.log('Coupled state:', coupled.toString());
  console.log('Dimension:', coupled.dimension);
  
  // Check normalization
  const norm = coupled.norm();
  console.log('Norm:', norm);
  
  return coupled;
}

// ============================================================================
// TEST 2: Three-Spin Coupling (Sequential)
// ============================================================================

function testThreeSpinCoupling() {
  console.log('\n=== THREE-SPIN COUPLING TEST (Sequential) ===');
  
  // Create three spin-1/2 states
  const spin1 = createJmState(0.5, 0.5);   // |1/2, +1/2⟩
  const spin2 = createJmState(0.5, 0.5);   // |1/2, +1/2⟩
  const spin3 = createJmState(0.5, -0.5);  // |1/2, -1/2⟩
  
  console.log('Individual spins:');
  console.log('Spin 1:', spin1.toString());
  console.log('Spin 2:', spin2.toString());
  console.log('Spin 3:', spin3.toString());
  
  // First coupling: (spin1 ⊗ spin2)
  const intermediate = addAngularMomenta(spin1, 0.5, spin2, 0.5);
  console.log('\nAfter coupling spins 1&2:', intermediate.toString());
  console.log('Intermediate dimension:', intermediate.dimension);
  
  // Question: What is the effective j for the intermediate state?
  // For two j=1/2 particles, we get j=0 (singlet) or j=1 (triplet)
  // Since we coupled |1/2,+1/2⟩ ⊗ |1/2,+1/2⟩, we should get |1,1⟩
  
  try {
    // Second coupling: intermediate ⊗ spin3
    // This is where we need to figure out the effective j of intermediate
    const final = addAngularMomenta(intermediate, 1.0, spin3, 0.5);
    console.log('\nFinal three-spin state:', final.toString());
    console.log('Final dimension:', final.dimension);
    
    const norm = final.norm();
    console.log('Final norm:', norm);
    
    return final;
  } catch (error) {
    console.log('\nERROR in three-spin coupling:', error.message);
    console.log('This reveals a limitation of the current implementation');
    return null;
  }
}

// ============================================================================
// TEST 3: Alternative Three-Spin Approach
// ============================================================================

function testThreeSpinAlternative() {
  console.log('\n=== THREE-SPIN COUPLING TEST (Alternative) ===');
  
  // Try a different approach: manual Clebsch-Gordan coefficients
  console.log('Testing manual coefficient calculation...');
  
  // For three spin-1/2 particles, we need to consider all possible couplings
  // (j1 ⊗ j2) ⊗ j3 with intermediate angular momentum j12
  
  const results: CouplingResult[] = [];
  
  // All possible m values for three spin-1/2 particles
  const m_values = [0.5, -0.5];
  
  for (const m1 of m_values) {
    for (const m2 of m_values) {
      for (const m3 of m_values) {
        const M = m1 + m2 + m3; // Total M quantum number
        
        // Possible intermediate j12 values for j1=j2=1/2
        for (const j12 of [0, 1]) {
          // Calculate possible final J values
          const J_min = Math.abs(j12 - 0.5);
          const J_max = j12 + 0.5;
          
          for (let J = J_min; J <= J_max; J += 0.5) {
            if (Math.abs(M) <= J) {
              // Calculate coupling coefficients
              const cg1 = clebschGordan(0.5, m1, 0.5, m2, j12, m1 + m2);
              const cg2 = clebschGordan(j12, m1 + m2, 0.5, m3, J, M);
              
              const coeff = math.multiply(cg1, cg2);
              const magnitude = math.abs(coeff);
              
              if (Number(magnitude) > 1e-10) {
                results.push({
                  m1, m2, m3, j12, J, M,
                  coefficient: coeff,
                  magnitude: Number(magnitude)
                });
              }
            }
          }
        }
      }
    }
  }
  
  console.log('Non-zero coupling coefficients:');
  results.forEach((result: CouplingResult, i: number) => {
    console.log(`${i+1}. |1/2,${result.m1}⟩|1/2,${result.m2}⟩|1/2,${result.m3}⟩ → |${result.J},${result.M}⟩`);
    console.log(`   via j12=${result.j12}, coeff=${result.coefficient}, |coeff|=${result.magnitude.toFixed(6)}`);
  });
  
  return results;
}

// ============================================================================
// TEST 4: Four-Spin Coupling (Push the limits)
// ============================================================================

function testFourSpinCoupling() {
  console.log('\n=== FOUR-SPIN COUPLING TEST ===');
  
  // Try to couple four spins sequentially
  const spins = [
    createJmState(0.5, 0.5),   // |1/2, +1/2⟩
    createJmState(0.5, 0.5),   // |1/2, +1/2⟩
    createJmState(0.5, -0.5),  // |1/2, -1/2⟩
    createJmState(0.5, -0.5)   // |1/2, -1/2⟩
  ];
  
  console.log('Attempting to couple 4 spins sequentially...');
  
  try {
    // First coupling: spin1 ⊗ spin2
    let result = addAngularMomenta(spins[0], 0.5, spins[1], 0.5);
    console.log('After coupling spins 1&2: dim =', result.dimension);
    
    // Second coupling: result ⊗ spin3 (assuming j=1 for result)
    result = addAngularMomenta(result, 1.0, spins[2], 0.5);
    console.log('After coupling with spin 3: dim =', result.dimension);
    
    // Third coupling: result ⊗ spin4 (need to determine j)
    // This will likely fail with current implementation
    result = addAngularMomenta(result, 1.5, spins[3], 0.5);
    console.log('After coupling with spin 4: dim =', result.dimension);
    
    console.log('Final four-spin state norm:', result.norm());
    
    return result;
  } catch (error) {
    console.log('ERROR in four-spin coupling:', error.message);
    console.log('This shows the limitations of sequential coupling without proper j tracking');
    return null;
  }
}

// ============================================================================
// TEST 5: Intertwiner Space Analysis
// ============================================================================

function analyzeIntertwiners() {
  console.log('\n=== INTERTWINER SPACE ANALYSIS ===');
  
  // For a vertex with n incident edges of spin j_i, we need to find
  // the allowed total angular momentum values J and their multiplicities
  
  console.log('Analyzing intertwiner spaces for different vertex configurations:');
  
  // Case 1: 2-valent vertex (trivial - identity intertwiner)
  console.log('\n1. Two-valent vertex (j1=1/2, j2=1/2):');
  const j_values_2: number[] = [];
  for (let J = Math.abs(0.5 - 0.5); J <= 0.5 + 0.5; J += 0.5) {
    j_values_2.push(J);
  }
  console.log('   Allowed J values:', j_values_2);
  console.log('   Intertwiner dimension:', j_values_2.length);
  
  // Case 2: 3-valent vertex
  console.log('\n2. Three-valent vertex (j1=j2=j3=1/2):');
  const j_values_3: number [] = [];
  // This requires more complex analysis - triangle inequalities for three spins
  // Temporary simplified analysis
  console.log('   Analysis requires solving triangle inequalities');
  console.log('   Expected J values: 1/2 (multiplicity 2)');
  
  // Case 3: 4-valent vertex (tetrahedral vertex)
  console.log('\n3. Four-valent vertex (tetrahedral):');
  console.log('   This requires 6j-symbols for proper analysis');
  console.log('   Current implementation cannot handle this directly');
  
  return {
    two_valent: j_values_2,
    three_valent: 'Requires advanced analysis',
    four_valent: 'Requires 6j-symbols'
  };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

function runMultiSpinTests() {
  console.log('MULTI-SPIN COUPLING CAPABILITY TEST');
  console.log('===================================');
  
  const results: TestResults = {
    twoSpin: null,
    threeSpin: null,
    threeSpinAlt: null,
    fourSpin: null,
    intertwiners: null
  };
  
  try {
    results.twoSpin = testTwoSpinCoupling();
    results.threeSpin = testThreeSpinCoupling();
    results.threeSpinAlt = testThreeSpinAlternative();
    results.fourSpin = testFourSpinCoupling();
    results.intertwiners = analyzeIntertwiners();
  } catch (error) {
    console.log('FATAL ERROR:', error.message);
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('Two-spin coupling:', results.twoSpin ? 'SUCCESS' : 'FAILED');
  console.log('Three-spin coupling:', results.threeSpin ? 'SUCCESS' : 'FAILED');
  console.log('Alternative three-spin:', results.threeSpinAlt ? 'SUCCESS' : 'FAILED');
  console.log('Four-spin coupling:', results.fourSpin ? 'SUCCESS' : 'FAILED');
  
  return results;
}

// Export for use in other test files
export {
  testTwoSpinCoupling,
  testThreeSpinCoupling,
  testThreeSpinAlternative,
  testFourSpinCoupling,
  analyzeIntertwiners,
  runMultiSpinTests
};

// If running directly, execute tests
// if (require.main === module) {
  runMultiSpinTests();
// }