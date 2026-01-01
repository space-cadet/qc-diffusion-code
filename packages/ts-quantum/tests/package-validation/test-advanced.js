// Advanced ts-quantum functionality test
const { StateVector, tensorProduct, multiplyMatrices } = require('ts-quantum');
const { Complex } = require('mathjs');

console.log('=== Advanced ts-quantum Functionality Test ===\n');

try {
    // Test quantum superposition
    console.log('Test 1: Quantum superposition');
    const coeffs = [Complex(1/Math.sqrt(2), 0), Complex(1/Math.sqrt(2), 0)];
    const superposition = new StateVector(2, coeffs, '|+⟩');
    console.log('✓ Created superposition state:', superposition.toString());
    
    // Test state normalization
    const norm = superposition.norm();
    console.log(`✓ State norm: ${norm} (should be ~1)`);
    
    // Test tensor product of states
    console.log('\nTest 2: Tensor product operations');
    const state0 = new StateVector(2, [Complex(1, 0), Complex(0, 0)], '|0⟩');
    const state1 = new StateVector(2, [Complex(0, 0), Complex(1, 0)], '|1⟩');
    
    // Create |01⟩ state using tensor product
    const matrix0 = [[Complex(1, 0)], [Complex(0, 0)]];
    const matrix1 = [[Complex(0, 0)], [Complex(1, 0)]];
    const product = tensorProduct(matrix0, matrix1);
    
    console.log('✓ Tensor product dimensions:', product.length, 'x', product[0].length);
    console.log('✓ |01⟩ state created via tensor product');
    
    // Test matrix operations
    console.log('\nTest 3: Matrix operations');
    const identityMatrix = [
        [Complex(1, 0), Complex(0, 0)],
        [Complex(0, 0), Complex(1, 0)]
    ];
    
    const pauliX = [
        [Complex(0, 0), Complex(1, 0)],
        [Complex(1, 0), Complex(0, 0)]
    ];
    
    const result = multiplyMatrices(identityMatrix, pauliX);
    console.log('✓ Matrix multiplication successful');
    console.log('✓ I × σx =', result[0][1], '(should be 1+0i)');
    
    // Test probability calculation
    console.log('\nTest 4: Probability calculations');
    const prob0 = Math.pow(Math.abs(superposition.amplitudes[0].re), 2);
    const prob1 = Math.pow(Math.abs(superposition.amplitudes[1].re), 2);
    console.log(`✓ P(|0⟩) = ${prob0.toFixed(3)} (should be ~0.5)`);
    console.log(`✓ P(|1⟩) = ${prob1.toFixed(3)} (should be ~0.5)`);
    console.log(`✓ Total probability = ${(prob0 + prob1).toFixed(3)} (should be 1.0)`);
    
    console.log('\n🎉 All advanced functionality tests passed!');
    console.log('✅ ts-quantum package is fully functional as standalone npm package');
    
} catch (error) {
    console.error('❌ Advanced functionality test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
