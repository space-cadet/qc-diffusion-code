import { HilbertSpace } from '../../src/core/hilbertSpace';
import { IStateVector } from '../../src/core/types';
import { createPlusState, createBasisState } from '../../src/states/states';
import { Hadamard } from '../../src/operators/gates';
import * as math from 'mathjs';

// Demonstrates quantum state operations
function demoStates() {
    // Create a simple qubit space
    const qubitSpace = new HilbertSpace(2, ['|0⟩', '|1⟩']);
    
    // Initialize basis states
    const state0 = createBasisState(2, 0); // |0⟩
    const state1 = createBasisState(2, 1); // |1⟩
    
    console.log('State |0⟩:', state0.amplitudes);
    console.log('State |1⟩:', state1.amplitudes);
    
    // Create superposition using both methods
    const plusState = createPlusState();
    const hadamardState = Hadamard.apply(state0);
    
    console.log('\nPlus state |+⟩:', plusState.amplitudes);
    console.log('Hadamard |0⟩:', hadamardState.amplitudes);
    
    // Calculate inner product between |0⟩ and |+⟩
    const overlap = state0.innerProduct(plusState);
    console.log('\nOverlap ⟨0|+⟩:', overlap);
}

// Run the demonstration
console.log('=== Quantum State Demo ===\n');
demoStates();