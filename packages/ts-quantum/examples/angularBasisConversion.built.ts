/**
 * Examples demonstrating conversion between computational and angular momentum bases
 * Using the built package
 */

import { 
  StateVector,
  createJmState, 
  computationalToAngularBasis, 
  angularToComputationalBasis,
  identifyBasis,
  createCoherentState,
  getValidM
} from '../dist';
import * as math from 'mathjs';

/**
 * Prints all basis states for a given j value in both computational and angular bases
 */
function printAllStates(j: number) {
  const dim = Math.floor(2 * j + 1);
  console.log(`\nAll states for j = ${j}:`);
  console.log('----------------------------------------');
  
  // Print computational basis states and their angular momentum representations
  console.log('Computational → Angular:');
  for (let n = 0; n < dim; n++) {
    // Create computational basis state
    const compBasis = new StateVector(dim, 
      Array(dim).fill(null).map((_, i) => math.complex(i === n ? 1 : 0, 0)),
      `|${n}⟩`
    );
    
    // Convert and print in angular momentum basis
    const angularState = computationalToAngularBasis(compBasis, j);
    console.log(`|${n}⟩ = ${angularState.toAngularString(j)}`);
  }

  // Print angular momentum basis states and their computational representations
  console.log('\nAngular → Computational:');
  const mValues = getValidM(j);
  for (const m of mValues.reverse()) { // reverse to show in order from lowest to highest m
    const angularState = createJmState(j, m);
    const computationalState = angularToComputationalBasis(angularState, j);
    console.log(`|${j},${m}⟩ = ${computationalState.toComputationalString()}`);
  }
}

// Example 1: Basic j=1/2 states
console.log('\nExample 1: j=1/2 states');

// Create computational basis state |0⟩ for j=1/2 system
const comp0 = new StateVector(2, [math.complex(1, 0), math.complex(0, 0)], 'computational');
console.log('Computational |0⟩:', comp0.toString());

// Convert to angular momentum basis (|1/2,-1/2⟩)
const ang0 = computationalToAngularBasis(comp0, 1/2);
console.log('Angular basis:', ang0.toString());

// Example 2: j=1 states
console.log('\nExample 2: j=1 states');

// Create angular momentum state |1,0⟩
const j1m0 = createJmState(1, 0);
console.log('Angular |1,0⟩:', j1m0.toString());

// Convert to computational basis
const comp1 = angularToComputationalBasis(j1m0, 1);
console.log('Computational basis:', comp1.toString());

// Example 3: Superposition states
console.log('\nExample 3: Superposition states');

// Create superposition in computational basis
const superComp = new StateVector(2, [
  math.complex(1/Math.SQRT2, 0),
  math.complex(1/Math.SQRT2, 0)
], 'computational');
console.log('Computational (|0⟩ + |1⟩)/√2:', superComp.toString());

// Convert to angular momentum basis
const superAng = computationalToAngularBasis(superComp, 1/2);
console.log('Angular basis (|1/2,-1/2⟩ + |1/2,1/2⟩)/√2:', superAng.toString());

// Example 4: Basis identification
console.log('\nExample 4: Basis identification');

// Create states in different bases
const compState = new StateVector(2, [math.complex(1, 0), math.complex(0, 0)], 'computational');
const angState = createJmState(1/2, -1/2);
const coherentState = createCoherentState(1/2, Math.PI/4, 0);

console.log('Computational state basis:', identifyBasis(compState));
console.log('Angular state basis:', identifyBasis(angState));
console.log('Coherent state basis:', identifyBasis(coherentState));

// Example 5: j=3/2 system
console.log('\nExample 5: j=3/2 system');

// Create |3/2,3/2⟩ state
const j32m32 = createJmState(3/2, 3/2);
console.log('Angular |3/2,3/2⟩:', j32m32.toString());

// Convert to computational basis
const comp32 = angularToComputationalBasis(j32m32, 3/2);
console.log('Computational basis:', comp32.toString());

// Convert back to angular
const ang32 = computationalToAngularBasis(comp32, 3/2);
console.log('Back to angular:', ang32.toString());

// Example 6: Print all states for different j values
console.log('\nExample 6: Complete basis mappings');

// j = 1/2 system (2 states)
printAllStates(1/2);

// j = 1 system (3 states)
printAllStates(1);

// j = 3/2 system (4 states)
printAllStates(3/2);