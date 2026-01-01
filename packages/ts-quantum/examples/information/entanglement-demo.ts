/**
 * Demonstrates quantum entanglement measures and properties
 * 
 * Explores various metrics for quantifying entanglement in
 * quantum systems, a key resource for quantum information processing.
 */

import { 
  schmidtDecomposition,
  entanglementEntropy,
  concurrence,
  negativity
} from '../../src/utils/information';
import { StateVector } from '../../src/states/stateVector';
import { DensityMatrixOperator } from '../../src/states/densityMatrix';
import { createBellState, createGHZState, createWState } from '../../src/states/states';
import { Complex } from '../../src/core/types';
import { eigenDecomposition } from '../../src/utils/matrixOperations';
import * as math from 'mathjs';

// Demonstrate Schmidt decomposition
function demoSchmidtDecomposition() {
  console.log('=== Schmidt Decomposition Demonstration ===\n');
  
  // Create a product state |00⟩
  const productState = new StateVector(4, [
    math.complex(1,  0),
    math.complex(0,  0),
    math.complex(0,  0),
    math.complex(0,  0)
  ]);
  
  console.log('Schmidt decomposition of product state |00⟩:');
  const productResult = schmidtDecomposition(productState, 2, 2);
  console.log('Schmidt coefficients:', productResult.values);
  console.log('Number of terms:', productResult.values.length);
  console.log('This is a product state (1 Schmidt coefficient)\n');
  
  // Create a Bell state (|00⟩ + |11⟩)/√2
  const bellState = createBellState('Phi+');
  
  console.log('Schmidt decomposition of Bell state (|00⟩ + |11⟩)/√2:');
  const bellResult = schmidtDecomposition(bellState, 2, 2);
  console.log('Schmidt coefficients:', bellResult.values);
  console.log('Number of terms:', bellResult.values.length);
  console.log('This is maximally entangled (2 equal Schmidt coefficients)\n');
  
  // Create a partially entangled state
  const partialState = new StateVector(4, [
    math.complex(Math.sqrt(0.7),  0),
    math.complex(0,  0),
    math.complex(0,  0),
    math.complex(Math.sqrt(0.3),  0)
  ]);
  
  console.log('Schmidt decomposition of partially entangled state:');
  console.log('√0.7|00⟩ + √0.3|11⟩:');
  const partialResult = schmidtDecomposition(partialState, 2, 2);
  console.log('Schmidt coefficients:', partialResult.values);
  console.log('Number of terms:', partialResult.values.length);
  console.log('This is partially entangled (unequal coefficients)\n');
}

// Demonstrate entanglement entropy
function demoEntanglementEntropy() {
  console.log('\n=== Entanglement Entropy Demonstration ===\n');
  
  // Create a product state |00⟩
  const productState = new StateVector(4, [
    math.complex(1,  0),
    math.complex(0,  0),
    math.complex(0,  0),
    math.complex(0,  0)
  ]);
  
  // Create a Bell state (|00⟩ + |11⟩)/√2
  const bellState = createBellState('Phi+');
  
  // Create a partially entangled state
  const partialState = new StateVector(4, [
    math.complex(Math.sqrt(0.7),  0),
    math.complex(0,  0),
    math.complex(0,  0),
    math.complex(Math.sqrt(0.3),  0)
  ]);
  
  // Calculate entanglement entropy for each state
  const productEntropy = entanglementEntropy(productState, 2, 2);
  const bellEntropy = entanglementEntropy(bellState, 2, 2);
  const partialEntropy = entanglementEntropy(partialState, 2, 2);
  
  console.log('Entanglement entropy of product state |00⟩:', productEntropy);
  console.log('Entanglement entropy of Bell state:', bellEntropy);
  console.log('Should be ln(2) =', Math.log(2));
  console.log('Entanglement entropy of partially entangled state:', partialEntropy);
  console.log('Should be -0.7·ln(0.7) - 0.3·ln(0.3) =', -0.7 * Math.log(0.7) - 0.3 * Math.log(0.3));
  
  // Compare with multi-qubit states
  const ghz3 = createGHZState(3);
  const w3 = createWState(3);
  
  // Split into 1 qubit vs 2 qubits
  const ghzEntropy = entanglementEntropy(ghz3, 2, 4);
  const wEntropy = entanglementEntropy(w3, 2, 4);
  
  console.log('\nEntanglement entropy of 3-qubit GHZ state (1:2 split):', ghzEntropy);
  console.log('Entanglement entropy of 3-qubit W state (1:2 split):', wEntropy);
}

// Helper to create density matrices from state vectors
function createDensityMatrix(state: StateVector): DensityMatrixOperator {
  const dim = state.dimension;
  const matrix = Array(dim).fill(null).map(() => 
    Array(dim).fill(null).map(() => math.complex(0,  0))
  );
  
  // Normalize the state vector first
  const normalizedState = state.normalize();
  
  // Construct density matrix |Ψ⟩⟨Ψ| from normalized state
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      matrix[i][j] = math.multiply(
        normalizedState.amplitudes[i],
        math.conj(normalizedState.amplitudes[j])
      ) as Complex;
    }
  }
  
  return new DensityMatrixOperator(matrix);
}

// Demonstrate concurrence (entanglement measure for 2 qubits)
function demoConcurrence() {
  console.log('\n=== Concurrence Demonstration ===\n');
  
  // Create different 2-qubit states
  const states = {
    // Product state |00⟩ (ensure normalized)
    product: new StateVector(4, [
      math.complex(1,  0),
      math.complex(0,  0),
      math.complex(0,  0),
      math.complex(0,  0)
    ]),
    
    // Bell state (|00⟩ + |11⟩)/√2
    bell: createBellState('Phi+'),
    
    // Partially entangled state √0.7|00⟩ + √0.3|11⟩
    partial: new StateVector(4, [
      math.complex(Math.sqrt(0.7),  0),
      math.complex(0,  0),
      math.complex(0,  0),
      math.complex(Math.sqrt(0.3),  0)
    ])
  };
  
  // Calculate concurrence for each state
  for (const [name, state] of Object.entries(states)) {
    const rho = createDensityMatrix(state);
    const c = concurrence(rho);
    console.log(`Concurrence of ${name} state: ${c.toFixed(6)}`);
  }
  
  console.log('\nConcurrence properties:');
  console.log('- 0 for product states');
  console.log('- 1 for maximally entangled states (Bell states)');
  console.log('- Between 0 and 1 for partially entangled states');
}

// Demonstrate negativity (entanglement measure for bipartite systems)
function demoNegativity() {
  console.log('\n=== Negativity Demonstration ===\n');
  
  // Create different 2-qubit states
  const states = {
    // Product state |00⟩
    product: new StateVector(4, [
      math.complex(1,  0),
      math.complex(0,  0),
      math.complex(0,  0),
      math.complex(0,  0)
    ]),
    
    // Bell state (|00⟩ + |11⟩)/√2
    bell: createBellState('Phi+'),
    
    // Partially entangled state √0.7|00⟩ + √0.3|11⟩
    partial: new StateVector(4, [
      math.complex(Math.sqrt(0.7),  0),
      math.complex(0,  0),
      math.complex(0,  0),
      math.complex(Math.sqrt(0.3),  0)
    ])
  };
  
  // Calculate negativity for each state
  for (const [name, state] of Object.entries(states)) {
    const rho = createDensityMatrix(state);
    const n = negativity(rho, 2, 2);
    console.log(`Negativity of ${name} state: ${n.toFixed(6)}`);
  }
  
  console.log('\nNegativity properties:');
  console.log('- 0 for separable states');
  console.log('- 0.5 for maximally entangled two-qubit states');
  console.log('- Between 0 and 0.5 for partially entangled two-qubit states');
}

// Run all demonstrations
demoSchmidtDecomposition();
demoEntanglementEntropy();
demoConcurrence();
demoNegativity();
