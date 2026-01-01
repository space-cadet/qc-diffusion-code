// Modified example using ts-quantum package imports
const { 
    StateVector,
    createPlusState,
    createBasisState,
    HilbertSpace
} = require('ts-quantum');
const math = require('mathjs');

// Demonstrates quantum state operations using installed package
function demoStates() {
    console.log('Testing package imports...');
    
    // Check what's available
    const pkg = require('ts-quantum');
    console.log('Available createBasisState:', typeof pkg.createBasisState);
    console.log('Available createPlusState:', typeof pkg.createPlusState);
    console.log('Available HilbertSpace:', typeof pkg.HilbertSpace);
    
    // Create basic states manually since package exports may differ
    const state0 = new StateVector(2, [math.complex(1, 0), math.complex(0, 0)], '|0⟩');
    const state1 = new StateVector(2, [math.complex(0, 0), math.complex(1, 0)], '|1⟩');
    
    console.log('State |0⟩:', state0.amplitudes);
    console.log('State |1⟩:', state1.amplitudes);
    
    // Create superposition manually
    const plusState = new StateVector(2, [
        math.complex(1/Math.sqrt(2), 0),
        math.complex(1/Math.sqrt(2), 0)
    ], '|+⟩');
    
    console.log('\nPlus state |+⟩:', plusState.amplitudes);
    console.log('Plus state string:', plusState.toString());
    
    // Calculate inner product between |0⟩ and |+⟩
    const overlap = state0.innerProduct(plusState);
    console.log('\nOverlap ⟨0|+⟩:', overlap);
    
    // Test probability calculations
    const prob0 = Math.pow(Math.abs(plusState.amplitudes[0].re), 2);
    const prob1 = Math.pow(Math.abs(plusState.amplitudes[1].re), 2);
    console.log(`P(|0⟩) = ${prob0.toFixed(3)}`);
    console.log(`P(|1⟩) = ${prob1.toFixed(3)}`);
}

// Run the demonstration
console.log('=== Quantum State Demo (Package Version) ===\n');
try {
    demoStates();
    console.log('\n✅ Example completed successfully!');
} catch (error) {
    console.error('❌ Example failed:', error.message);
    console.error('Stack:', error.stack);
}
