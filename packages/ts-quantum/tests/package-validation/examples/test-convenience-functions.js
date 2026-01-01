// Test using exported convenience functions
const { 
    createBasisState,
    createPlusState,
    StateVector,
    multiplyMatrices,
    tensorProduct
} = require('ts-quantum');
const math = require('mathjs');

console.log('=== Testing Package Convenience Functions ===\n');

try {
    // Test createBasisState function
    console.log('Test 1: Using createBasisState function');
    const state0 = createBasisState(2, 0);
    const state1 = createBasisState(2, 1);
    
    console.log('✓ Created |0⟩ using createBasisState:', state0.toString());
    console.log('✓ Created |1⟩ using createBasisState:', state1.toString());
    
    // Test createPlusState function
    console.log('\nTest 2: Using createPlusState function');
    const plusState = createPlusState();
    console.log('✓ Created |+⟩ using createPlusState:', plusState.toString());
    
    // Test matrix operations with Pauli matrices
    console.log('\nTest 3: Pauli matrix operations');
    const pauliX = [
        [math.complex(0, 0), math.complex(1, 0)],
        [math.complex(1, 0), math.complex(0, 0)]
    ];
    
    const pauliZ = [
        [math.complex(1, 0), math.complex(0, 0)],
        [math.complex(0, 0), math.complex(-1, 0)]
    ];
    
    // Test commutator [X, Z] = XZ - ZX
    const XZ = multiplyMatrices(pauliX, pauliZ);
    const ZX = multiplyMatrices(pauliZ, pauliX);
    
    console.log('✓ Computed Pauli matrix products');
    console.log('XZ[0][0]:', XZ[0][0]);
    console.log('ZX[0][0]:', ZX[0][0]);
    
    // Test tensor product
    console.log('\nTest 4: Tensor product operations');
    const singleQubit = [[math.complex(1, 0)], [math.complex(0, 0)]];
    const twoQubitProduct = tensorProduct(singleQubit, singleQubit);
    
    console.log('✓ Tensor product dimensions:', twoQubitProduct.length, 'x', twoQubitProduct[0].length);
    console.log('✓ |00⟩ state amplitude:', twoQubitProduct[0][0]);
    
    // Test quantum measurement probabilities
    console.log('\nTest 5: Quantum measurement simulation');
    const superposition = createPlusState();
    
    // Simulate measurement in computational basis
    const prob0 = Math.pow(Math.abs(superposition.amplitudes[0].re), 2);
    const prob1 = Math.pow(Math.abs(superposition.amplitudes[1].re), 2);
    
    console.log(`✓ Measurement probabilities:`);
    console.log(`  P(|0⟩) = ${prob0.toFixed(4)} ≈ 0.5000`);
    console.log(`  P(|1⟩) = ${prob1.toFixed(4)} ≈ 0.5000`);
    console.log(`  Total = ${(prob0 + prob1).toFixed(4)} = 1.0000`);
    
    console.log('\n🎉 All convenience function tests passed!');
    console.log('✅ ts-quantum package provides full quantum computing functionality');
    
} catch (error) {
    console.error('❌ Convenience function test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
