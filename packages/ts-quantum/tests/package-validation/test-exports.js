// Test ts-quantum exports accessibility
console.log('Testing ts-quantum exports...');

try {
    // Test default import
    const tsQuantum = require('ts-quantum');
    console.log('✓ Default import successful');
    console.log('Available exports:', Object.keys(tsQuantum).length);
    console.log('First 15 exports:', Object.keys(tsQuantum).slice(0, 15));
    
    // Test some key exports that should exist based on the built package
    const availableExports = Object.keys(tsQuantum);
    const coreExports = ['StateVector', 'DensityMatrix', 'QuantumOperator', 'QuantumCircuit'];
    
    const found = [];
    const missing = [];
    coreExports.forEach(exportName => {
        if (availableExports.includes(exportName)) {
            console.log(`✓ ${exportName} available`);
            found.push(exportName);
        } else {
            console.log(`✗ ${exportName} missing`);
            missing.push(exportName);
        }
    });
    
    console.log(`Found ${found.length}/${coreExports.length} expected core exports`);
    
    // Test instantiation of available classes
    if (tsQuantum.StateVector) {
        console.log('✓ StateVector class available for instantiation');
    }
    
    // Show all exports for reference
    console.log('\nAll available exports:');
    availableExports.forEach((exp, i) => {
        if (i < 50) { // Limit output
            console.log(`  ${exp}`);
        }
    });
    if (availableExports.length > 50) {
        console.log(`  ... and ${availableExports.length - 50} more`);
    }
    
} catch (error) {
    console.error('✗ Export test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}
