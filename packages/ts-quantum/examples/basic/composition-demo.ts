import { HilbertSpace } from 'ts-quantum';

// Simple demonstration of Hilbert space composition
function demoHilbertComposition() {
    // Create two simple qubit spaces
    const qubit1 = new HilbertSpace(2, ['|0⟩', '|1⟩']);
    const qubit2 = new HilbertSpace(2, ['|0⟩', '|1⟩']);
    
    console.log('Qubit 1 dimension:', qubit1.dimension);
    console.log('Qubit 1 basis:', qubit1.basis);
    
    // Compose the spaces using tensor product
    const twoQubitSpace = qubit1.tensorProduct(qubit2);
    
    console.log('\nComposed space dimension:', twoQubitSpace.dimension);
    console.log('Composed space basis:', twoQubitSpace.basis);
    
    // Demonstrate decomposition
    const [space1, space2] = twoQubitSpace.decompose([2, 2]);
    
    console.log('\nDecomposed space 1 dimension:', space1.dimension);
    console.log('Decomposed space 2 dimension:', space2.dimension);
}

// Run the demonstration
console.log('=== Hilbert Space Composition Demo ===\n');
demoHilbertComposition();