import { HilbertSpace } from '../../src/core/hilbertSpace';
import { MatrixOperator } from '../../src/operators/operator';
import { PauliX, PauliY, PauliZ } from '../../src/operators/gates';
import { createBasisState } from '../../src/states/states';
import { Complex, IOperator } from '../../src/core/types';

// Demonstrates basic quantum operator operations
function demoOperators() {
    // Create operators
    const X = PauliX;
    const Y = PauliY;
    const Z = PauliZ;
    
    // Show basic properties
    console.log('Pauli X matrix:');
    console.log(X.toMatrix());
    
    // Create and apply adjoint
    const Xadj = X.adjoint();
    console.log('\nX adjoint equals X:', 
        matrixEquals(X.toMatrix(), Xadj.toMatrix()));
    
    // Compose operators
    const XY = X.compose(Y);
    console.log('\nX⋅Y = iZ:', XY.toMatrix());
    
    // Tensor product
    const X2 = X.tensorProduct(X);
    console.log('\nX⊗X:', X2.toMatrix());
    
    // Apply to states
    const state0 = createBasisState(2, 0);
    const flipped = X.apply(state0);
    console.log('\nX|0⟩ = |1⟩:', flipped.amplitudes);
}

// Helper to compare matrices
function matrixEquals(m1: Complex[][], m2: Complex[][]): boolean {
    return m1.every((row, i) =>
        row.every((val, j) =>
            Math.abs(val.re - m2[i][j].re) < 1e-10 &&
            Math.abs(val.im - m2[i][j].im) < 1e-10
        )
    );
}

// Run the demonstration
console.log('=== Quantum Operator Demo ===\n');
demoOperators();