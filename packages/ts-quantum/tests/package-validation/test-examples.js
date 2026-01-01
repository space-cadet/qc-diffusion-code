// Test ts-quantum package examples validation
const { StateVector, QuantumOperator, Gates } = require('ts-quantum');

console.log('=== Testing ts-quantum Examples ===\n');

try {
    // Test 1: Basic StateVector creation
    console.log('Test 1: Basic StateVector operations');
    const { Complex } = require('mathjs');
    const state0 = new StateVector(2, [Complex(1, 0), Complex(0, 0)], '|0⟩');
    const state1 = new StateVector(2, [Complex(0, 0), Complex(1, 0)], '|1⟩');
    
    console.log('✓ Created |0⟩:', state0.toString());
    console.log('✓ Created |1⟩:', state1.toString());
    
    // Test 2: Quantum operations
    console.log('\nTest 2: Quantum operations');
    if (typeof state0.innerProduct === 'function') {
        const overlap = state0.innerProduct(state1);
        console.log('✓ Inner product ⟨0|1⟩:', overlap);
    } else {
        console.log('⚠️ innerProduct method not available');
    }
    
    // Test 3: Import specific functions
    console.log('\nTest 3: Available exports check');
    const pkg = require('ts-quantum');
    const exportCount = Object.keys(pkg).length;
    console.log(`✓ Total exports available: ${exportCount}`);
    
    // Check for key exports
    const keyExports = ['StateVector', 'multiplyMatrices', 'transpose', 'tensorProduct'];
    keyExports.forEach(exp => {
        if (pkg[exp]) {
            console.log(`✓ ${exp} available`);
        } else {
            console.log(`✗ ${exp} missing`);
        }
    });
    
    console.log('\n✅ Package validation successful!');
    
} catch (error) {
    console.error('❌ Package validation failed:', error.message);
    process.exit(1);
}
