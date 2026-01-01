/**
 * Basic angular momentum operations examples
 * Demonstrates fundamental angular momentum concepts using |j,m⟩ states
 */

import {
  createJmState,
  createJplus,
  createJminus,
  createJz,
  createJ2,
  jmExpectationValue,
  getValidM
} from '../../src/angularMomentum/core';
import * as math from 'mathjs';

console.log('=== Angular Momentum Basic Demo ===\n');

// Example 1: Creating Angular Momentum States
console.log('1. Creating Angular Momentum States |j,m⟩');
console.log('=====================================');

// j = 1/2 system (spin-1/2)
console.log('\nSpin-1/2 system (j = 1/2):');
const spin_up = createJmState(1/2, 1/2);
const spin_down = createJmState(1/2, -1/2);

console.log('|1/2, +1/2⟩ (spin up):', spin_up.amplitudes);
console.log('|1/2, -1/2⟩ (spin down):', spin_down.amplitudes);
console.log('Valid m values for j=1/2:', getValidM(1/2));

// j = 1 system 
console.log('\nSpin-1 system (j = 1):');
const j1_states = getValidM(1).map(m => {
  const state = createJmState(1, m);
  console.log(`|1, ${m}⟩:`, state.amplitudes);
  return state;
});
console.log('Valid m values for j=1:', getValidM(1));

// Example 2: Angular Momentum Operators
console.log('\n\n2. Angular Momentum Operators');
console.log('=============================');

// j = 1/2 operators
console.log('\nOperators for j = 1/2:');
const J_plus_half = createJplus(1/2);
const J_minus_half = createJminus(1/2);
const J_z_half = createJz(1/2);
const J2_half = createJ2(1/2);

console.log('J₊ matrix:');
console.log(J_plus_half.toMatrix().map(row => 
  row.map(elem => `${math.re(elem).toFixed(3)} + ${math.im(elem).toFixed(3)}i`)
));

console.log('\nJ₋ matrix:');
console.log(J_minus_half.toMatrix().map(row => 
  row.map(elem => `${math.re(elem).toFixed(3)} + ${math.im(elem).toFixed(3)}i`)
));

console.log('\nJz matrix:');
console.log(J_z_half.toMatrix().map(row => 
  row.map(elem => `${math.re(elem).toFixed(3)} + ${math.im(elem).toFixed(3)}i`)
));

console.log('\nJ² matrix:');
console.log(J2_half.toMatrix().map(row => 
  row.map(elem => `${math.re(elem).toFixed(3)} + ${math.im(elem).toFixed(3)}i`)
));

// Example 3: Operator Actions on States
console.log('\n\n3. Operator Actions on States');
console.log('=============================');

console.log('\nFor j = 1/2 system:');

// Apply J₊ to |1/2, -1/2⟩ (should give |1/2, +1/2⟩)
const J_plus_on_down = J_plus_half.apply(spin_down);
console.log('J₊|1/2, -1/2⟩ =', J_plus_on_down.amplitudes);
console.log('Expected: should be proportional to |1/2, +1/2⟩');

// Apply J₋ to |1/2, +1/2⟩ (should give |1/2, -1/2⟩)
const J_minus_on_up = J_minus_half.apply(spin_up);
console.log('J₋|1/2, +1/2⟩ =', J_minus_on_up.amplitudes);
console.log('Expected: should be proportional to |1/2, -1/2⟩');

// Apply Jz to eigenstates
const Jz_on_up = J_z_half.apply(spin_up);
const Jz_on_down = J_z_half.apply(spin_down);
console.log('Jz|1/2, +1/2⟩ =', Jz_on_up.amplitudes);
console.log('Jz|1/2, -1/2⟩ =', Jz_on_down.amplitudes);

// Example 4: Expectation Values
console.log('\n\n4. Expectation Values ⟨j,m|J|j,m⟩');
console.log('=================================');

console.log('\nFor j = 1/2 states:');

// ⟨1/2, +1/2|Jz|1/2, +1/2⟩ should be +1/2
const exp_Jz_up = jmExpectationValue(J_z_half, 1/2, 1/2);
console.log('⟨1/2, +1/2|Jz|1/2, +1/2⟩ =', math.re(exp_Jz_up));
console.log('Expected: +0.5');

// ⟨1/2, -1/2|Jz|1/2, -1/2⟩ should be -1/2
const exp_Jz_down = jmExpectationValue(J_z_half, 1/2, -1/2);
console.log('⟨1/2, -1/2|Jz|1/2, -1/2⟩ =', math.re(exp_Jz_down));
console.log('Expected: -0.5');

// ⟨j,m|J²|j,m⟩ should be j(j+1) = 0.75 for j=1/2
const exp_J2_up = jmExpectationValue(J2_half, 1/2, 1/2);
const exp_J2_down = jmExpectationValue(J2_half, 1/2, -1/2);
console.log('⟨1/2, +1/2|J²|1/2, +1/2⟩ =', math.re(exp_J2_up));
console.log('⟨1/2, -1/2|J²|1/2, -1/2⟩ =', math.re(exp_J2_down));
console.log('Expected: 0.75 for both (j(j+1) = 1/2 × 3/2)');

// Example 5: j = 1 System Demonstration
console.log('\n\n5. j = 1 System Example');
console.log('=======================');

const J_z_1 = createJz(1);
console.log('\nJz eigenvalues for j = 1:');
for (const m of [-1, 0, 1]) {
  const exp_val = jmExpectationValue(J_z_1, 1, m);
  console.log(`⟨1, ${m}|Jz|1, ${m}⟩ = ${math.re(exp_val)}`);
}

const J2_1 = createJ2(1);
console.log('\nJ² eigenvalue for j = 1:');
const exp_J2_1 = jmExpectationValue(J2_1, 1, 0);
console.log(`⟨1, 0|J²|1, 0⟩ = ${math.re(exp_J2_1)}`);
console.log('Expected: 2.0 (j(j+1) = 1 × 2)');

console.log('\n=== Demo Complete ===');
console.log('\nKey Takeaways:');
console.log('- |j,m⟩ states are eigenstates of Jz with eigenvalue m');
console.log('- |j,m⟩ states are eigenstates of J² with eigenvalue j(j+1)');
console.log('- J₊ raises m by 1, J₋ lowers m by 1');
console.log('- Operators connect different m states within the same j manifold');
