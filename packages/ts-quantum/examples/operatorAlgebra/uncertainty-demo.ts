/**
 * Demonstrates quantum uncertainty principles and relations
 * 
 * Shows how the Heisenberg uncertainty principle emerges from
 * operator algebra and can be quantitatively verified.
 */

import { 
  uncertaintyProduct, 
  commutatorExpectation, 
  projectionOperator,
  isNormalOperator,
  operatorFromGenerator 
} from '../../src/operators/algebra';
import { PauliX, PauliY, PauliZ, Hadamard } from '../../src/operators/gates';
import { StateVector } from '../../src/states/stateVector';
import { MatrixOperator } from '../../src/operators/operator';
import * as math from 'mathjs';

// Create various test states
function createTestStates() {
  // |0⟩ state
  const zeroState = new StateVector(2, [
    math.complex(1,  0),
    math.complex(0,  0)
  ]);
  
  // |1⟩ state
  const oneState = new StateVector(2, [
    math.complex(0,  0),
    math.complex(1,  0)
  ]);
  
  // |+⟩ = (|0⟩ + |1⟩)/√2 state (X eigenstate)
  const plusState = new StateVector(2, [
    math.complex(1/Math.sqrt(2),  0),
    math.complex(1/Math.sqrt(2),  0)
  ]);
  
  // |-⟩ = (|0⟩ - |1⟩)/√2 state (X eigenstate)
  const minusState = new StateVector(2, [
    math.complex(1/Math.sqrt(2),  0),
    math.complex(-1/Math.sqrt(2),  0)
  ]);
  
  // |+i⟩ = (|0⟩ + i|1⟩)/√2 state (Y eigenstate)
  const plusIState = new StateVector(2, [
    math.complex(1/Math.sqrt(2),  0),
    math.complex(0,  1/Math.sqrt(2))
  ]);
  
  // |-i⟩ = (|0⟩ - i|1⟩)/√2 state (Y eigenstate)
  const minusIState = new StateVector(2, [
    math.complex(1/Math.sqrt(2),  0),
    math.complex(0,  -1/Math.sqrt(2))
  ]);
  
  return {
    zeroState,
    oneState,
    plusState,
    minusState,
    plusIState,
    minusIState
  };
}

// Demonstrate uncertainty principle for various states
function demoUncertaintyPrinciple() {
  console.log('=== Uncertainty Principle Demonstration ===\n');
  
  const states = createTestStates();
  
  // Calculate uncertainties for different states and operator pairs
  console.log('Uncertainty products for different states:');
  console.log('----------------------------------------');
  
  // For each state
  for (const [stateName, state] of Object.entries(states)) {
    console.log(`\nState: ${stateName}`);
    
    // Test X,Y uncertainty
    const uncertaintyXY = uncertaintyProduct(state, PauliX, PauliY);
    console.log(`ΔX·ΔY = ${uncertaintyXY.toFixed(6)}`);
    
    // Calculate lower bound from commutator expectation
    const commXY = commutatorExpectation(state, PauliX, PauliY);
    const lowerBoundXY = Math.abs(commXY.re) / 2 + Math.abs(commXY.im) / 2;
    console.log(`Lower bound |⟨[X,Y]⟩|/2 = ${lowerBoundXY.toFixed(6)}`);
    console.log(`Satisfies uncertainty principle: ${uncertaintyXY >= lowerBoundXY - 1e-10}`);
    
    // Test X,Z uncertainty
    const uncertaintyXZ = uncertaintyProduct(state, PauliX, PauliZ);
    console.log(`ΔX·ΔZ = ${uncertaintyXZ.toFixed(6)}`);
    
    // Calculate lower bound from commutator expectation
    const commXZ = commutatorExpectation(state, PauliX, PauliZ);
    const lowerBoundXZ = Math.abs(commXZ.re) / 2 + Math.abs(commXZ.im) / 2;
    console.log(`Lower bound |⟨[X,Z]⟩|/2 = ${lowerBoundXZ.toFixed(6)}`);
    console.log(`Satisfies uncertainty principle: ${uncertaintyXZ >= lowerBoundXZ - 1e-10}`);
    
    // Test Y,Z uncertainty
    const uncertaintyYZ = uncertaintyProduct(state, PauliY, PauliZ);
    console.log(`ΔY·ΔZ = ${uncertaintyYZ.toFixed(6)}`);
    
    // Calculate lower bound from commutator expectation
    const commYZ = commutatorExpectation(state, PauliY, PauliZ);
    const lowerBoundYZ = Math.abs(commYZ.re) / 2 + Math.abs(commYZ.im) / 2;
    console.log(`Lower bound |⟨[Y,Z]⟩|/2 = ${lowerBoundYZ.toFixed(6)}`);
    console.log(`Satisfies uncertainty principle: ${uncertaintyYZ >= lowerBoundYZ - 1e-10}`);
  }
}

// Demonstrate projection operators 
function demoProjectionOperators() {
  console.log('\n\n=== Projection Operators ===\n');
  
  const states = createTestStates();
  
  // Create projection operators
  console.log('Creating and testing projection operators:');
  console.log('----------------------------------------');
  
  // Project onto |0⟩
  const P0 = projectionOperator(states.zeroState);
  console.log('\nProjection onto |0⟩:');
  console.log(P0.toMatrix());
  
  // Test idempotence (P² = P)
  const P0squared = P0.compose(P0);
  console.log('\nTesting P² = P:');
  console.log(P0squared.toMatrix());
  
  // Create projector onto |+⟩
  const Pplus = projectionOperator(states.plusState);
  console.log('\nProjection onto |+⟩:');
  console.log(Pplus.toMatrix());
  
  // Apply projectors to states
  console.log('\nApplying projectors to states:');
  
  // |0⟩⟨0| applied to |0⟩
  const P0_on_0 = P0.apply(states.zeroState);
  console.log('\n|0⟩⟨0||0⟩ should give |0⟩:');
  console.log(P0_on_0.amplitudes);
  
  // |0⟩⟨0| applied to |1⟩
  const P0_on_1 = P0.apply(states.oneState);
  console.log('\n|0⟩⟨0||1⟩ should give 0:');
  console.log(P0_on_1.amplitudes);
  
  // |+⟩⟨+| applied to |0⟩
  const Pplus_on_0 = Pplus.apply(states.zeroState);
  console.log('\n|+⟩⟨+||0⟩ should give (1/√2)|+⟩:');
  console.log(Pplus_on_0.amplitudes);
}

// Demonstrate operator generation from generators
function demoOperatorGeneration() {
  console.log('\n\n=== Operator Generation ===\n');
  
  // Generate rotation operators from Pauli matrices
  console.log('Generating rotation operators:');
  console.log('----------------------------');
  
  // Rx(π/2) = e^(-iX·π/4)
  const X_generator = PauliX.scale(math.complex(-Math.PI/4,  0));
  const Rx = operatorFromGenerator(X_generator);
  console.log('\nRotation around X by π/2:');
  console.log(Rx.toMatrix());
  
  // Rz(π/2) = e^(-iZ·π/4)
  const Z_generator = PauliZ.scale(math.complex(-Math.PI/4,  0));
  const Rz = operatorFromGenerator(Z_generator);
  console.log('\nRotation around Z by π/2:');
  console.log(Rz.toMatrix());
  
  // Test properties of generated operators
  console.log('\nTesting properties of generated operators:');
  
  // Check if normal
  console.log('\nIs Rx normal operator?', isNormalOperator(Rx));
  
  // Check if unitary
  const RxDagger = Rx.adjoint();
  const RxProduct = Rx.compose(RxDagger);
  console.log('\nIs Rx unitary? Rx·Rx† should be identity:');
  console.log(RxProduct.toMatrix());
}

// Run the demonstrations
demoUncertaintyPrinciple();
demoProjectionOperators();
demoOperatorGeneration();
