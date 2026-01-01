/**
 * Basic quantum distance examples from Provost-Vallee paper
 * Demonstrates Phase 1: Simple distance calculations and Bloch sphere geometry
 */

import { 
  quantumDistance, 
  quantumFidelity, 
  TwoLevelSystem, 
  BlochSphere 
} from '../../../src/geometry/quantumDistance';

/**
 * Example 1: Basic two-level system distances
 * Demonstrates fundamental quantum distance calculations
 */
export function basicTwoLevelDistances() {
  console.log('=== Basic Two-Level System Distances ===');
  
  // Create basic states
  const ground = TwoLevelSystem.ground();     // |0⟩
  const excited = TwoLevelSystem.excited();   // |1⟩
  const plus = TwoLevelSystem.plus();        // |+⟩ = (|0⟩ + |1⟩)/√2
  const minus = TwoLevelSystem.minus();      // |-⟩ = (|0⟩ - |1⟩)/√2
  
  // Calculate distances
  const orthogonalDistance = quantumDistance(ground, excited);
  const superpositionDistance = quantumDistance(plus, minus);
  const groundToPlus = quantumDistance(ground, plus);
  
  console.log(`Distance |0⟩ to |1⟩ (orthogonal): ${orthogonalDistance.toFixed(6)}`);
  console.log(`Expected: ${Math.sqrt(2).toFixed(6)} (√2 for orthogonal states)`);
  console.log();
  
  console.log(`Distance |+⟩ to |-⟩ (orthogonal): ${superpositionDistance.toFixed(6)}`);
  console.log(`Expected: ${Math.sqrt(2).toFixed(6)} (√2 for orthogonal states)`);
  console.log();
  
  console.log(`Distance |0⟩ to |+⟩: ${groundToPlus.toFixed(6)}`);
  console.log(`Expected: ${1.0.toFixed(6)} (45° on Bloch sphere)`);
  console.log();
  
  // Verify identical states have zero distance
  const identicalDistance = quantumDistance(ground, ground);
  console.log(`Distance |0⟩ to |0⟩ (identical): ${identicalDistance.toFixed(6)}`);
  console.log(`Expected: ${0.0.toFixed(6)} (identical states)`);
  console.log();
}

/**
 * Example 2: Bloch sphere geometry verification
 * Shows that quantum distance matches geodesic distance on Bloch sphere
 */
export function blochSphereGeometry() {
  console.log('=== Bloch Sphere Geometry Verification ===');
  
  // Test various state pairs
  const testCases = [
    { theta1: 0, phi1: 0, theta2: Math.PI, phi2: 0, description: 'North to South pole' },
    { theta1: 0, phi1: 0, theta2: Math.PI/2, phi2: 0, description: 'North pole to equator' },
    { theta1: Math.PI/2, phi1: 0, theta2: Math.PI/2, phi2: Math.PI, description: 'Opposite points on equator' },
    { theta1: Math.PI/4, phi1: 0, theta2: Math.PI/4, phi2: Math.PI/2, description: 'Same latitude, different longitude' }
  ];
  
  testCases.forEach(({ theta1, phi1, theta2, phi2, description }) => {
    const state1 = TwoLevelSystem.blochState(theta1, phi1);
    const state2 = TwoLevelSystem.blochState(theta2, phi2);
    
    const quantumDist = quantumDistance(state1, state2);
    const blochDist = BlochSphere.geodesicDistance(theta1, phi1, theta2, phi2);
    const matches = BlochSphere.verifyQuantumDistance(theta1, phi1, theta2, phi2);
    
    console.log(`${description}:`);
    console.log(`  Quantum distance: ${quantumDist.toFixed(6)}`);
    console.log(`  Bloch distance: ${blochDist.toFixed(6)}`);
    console.log(`  Match: ${matches ? '✓' : '✗'}`);
    console.log();
  });
}

/**
 * Example 3: Fidelity and distance relationship
 * Shows connection between quantum fidelity and geometric distance
 */
export function fidelityDistanceRelation() {
  console.log('=== Fidelity and Distance Relationship ===');
  
  // Create states with varying overlaps
  const angles = [0, Math.PI/6, Math.PI/4, Math.PI/3, Math.PI/2, Math.PI];
  const reference = TwoLevelSystem.ground();
  
  console.log('Angle\tFidelity\tDistance\tRelation Check');
  console.log('-----\t--------\t--------\t--------------');
  
  angles.forEach(theta => {
    const state = TwoLevelSystem.blochState(theta, 0);
    const fidelity = quantumFidelity(reference, state);
    const distance = quantumDistance(reference, state);
    
    // For pure states: D² = 2(1 - √F)
    const expectedDistance = Math.sqrt(2 * (1 - Math.sqrt(fidelity)));
    const relationCheck = Math.abs(distance - expectedDistance) < 1e-10;
    
    console.log(
      `${(theta * 180 / Math.PI).toFixed(0)}°\t` +
      `${fidelity.toFixed(4)}\t\t` +
      `${distance.toFixed(4)}\t\t` +
      `${relationCheck ? '✓' : '✗'}`
    );
  });
  console.log();
}

/**
 * Example 4: Physical interpretation
 * Demonstrates how distance relates to quantum distinguishability
 */
export function physicalInterpretation() {
  console.log('=== Physical Interpretation ===');
  
  const reference = TwoLevelSystem.ground();
  
  // States with different overlaps
  const closeState = TwoLevelSystem.blochState(0.1, 0);      // Close to |0⟩
  const perpendicularState = TwoLevelSystem.blochState(Math.PI/2, 0); // Perpendicular
  const oppositeState = TwoLevelSystem.excited();           // Opposite |1⟩
  
  const distances = [
    { state: reference, name: 'Identical |0⟩', distance: quantumDistance(reference, reference) },
    { state: closeState, name: 'Close state', distance: quantumDistance(reference, closeState) },
    { state: perpendicularState, name: 'Perpendicular |+⟩', distance: quantumDistance(reference, perpendicularState) },
    { state: oppositeState, name: 'Opposite |1⟩', distance: quantumDistance(reference, oppositeState) }
  ];
  
  console.log('Distance from |0⟩ to various states:');
  distances.forEach(({ name, distance }) => {
    const distinguishability = distance / Math.sqrt(2); // Normalize by max distance
    console.log(`  ${name}: ${distance.toFixed(4)} (${(distinguishability * 100).toFixed(1)}% distinguishable)`);
  });
  console.log();
  
  console.log('Physical meaning:');
  console.log('• Distance = 0: States are identical (no distinguishability)');
  console.log('• Distance = √2: States are orthogonal (perfect distinguishability)');
  console.log('• Intermediate distances reflect partial distinguishability');
  console.log('• Distance relates to measurement discrimination capability');
  console.log();
}

/**
 * Run all basic distance examples
 */
export function runBasicDistanceExamples() {
  console.log('PROVOST-VALLEE QUANTUM STATE GEOMETRY');
  console.log('Phase 1: Basic Distance Calculations');
  console.log('=====================================');
  console.log();
  
  basicTwoLevelDistances();
  blochSphereGeometry();
  fidelityDistanceRelation();
  physicalInterpretation();
  
  console.log('Examples completed successfully!');
  console.log('Next: Phase 2 - Coherent state manifolds with curvature analysis');
}

// Run examples if this file is executed directly
// if (require.main === module) {
runBasicDistanceExamples();
// }
