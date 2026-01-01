/**
 * Demonstrates quantum composition operations for multi-system quantum mechanics
 * 
 * Shows how to work with composite quantum systems by exploring tensor product
 * structure, bipartite decompositions, and partial trace operations.
 */

import {
  composeSpaces,
  composeStates,
  composeOperators,
  bipartiteSplit,
  partialTrace
} from '../../src/states/composite';
import { HilbertSpace } from '../../src/core/hilbertSpace';
import { StateVector } from '../../src/states/stateVector';
import { MatrixOperator } from '../../src/operators/operator';
import { PauliX, PauliY, PauliZ, Hadamard } from '../../src/operators/gates';
import { createBellState, createBasisState } from '../../src/states/states';
import * as math from 'mathjs';
import { copy } from 'fs-extra';

// Demonstrate composition of Hilbert spaces
function demoHilbertSpaceComposition() {
  console.log('=== Hilbert Space Composition ===\n');
  
  // Create individual spaces
  const qubitSpace = new HilbertSpace(2, ['|0⟩', '|1⟩']);
  const qutritSpace = new HilbertSpace(3, ['|0⟩', '|1⟩', '|2⟩']);
  
  // Compose spaces
  console.log('Creating composite Hilbert spaces:');
  
  // Two qubits: 2 × 2 = 4
  const twoQubitSpace = composeSpaces([qubitSpace, qubitSpace]);
  console.log('Two-qubit space dimension:', twoQubitSpace.dimension);
  console.log('Two-qubit basis states:', twoQubitSpace.basis);
  
  // Qubit + qutrit: 2 × 3 = 6
  const hybridSpace = composeSpaces([qubitSpace, qutritSpace]);
  console.log('\nQubit-qutrit hybrid space dimension:', hybridSpace.dimension);
  console.log('Hybrid space basis states:', hybridSpace.basis);
  
  // Three qubits: 2 × 2 × 2 = 8
  const threeQubitSpace = composeSpaces([qubitSpace, qubitSpace, qubitSpace]);
  console.log('\nThree-qubit space dimension:', threeQubitSpace.dimension);
  console.log('Three-qubit basis states:', threeQubitSpace.basis);
}

// Demonstrate composition of quantum states
function demoStateComposition() {
  console.log('\n\n=== Quantum State Composition ===\n');
  
  // Create individual states
  const zero = createBasisState(2, 0); // |0⟩
  const one = createBasisState(2, 1);  // |1⟩
  
  // Create superposition state |+⟩ = (|0⟩ + |1⟩)/√2
  const plus = Hadamard.apply(zero);
  
  console.log('Composing quantum states:');
  
  // |0⟩ ⊗ |0⟩ = |00⟩
  const state00 = composeStates([zero, zero]);
  console.log('\n|0⟩ ⊗ |0⟩ = |00⟩:');
  console.log('Dimension:', state00.dimension);
  console.log('Amplitudes:', state00.amplitudes);
  
  // |0⟩ ⊗ |1⟩ = |01⟩
  const state01 = composeStates([zero, one]);
  console.log('\n|0⟩ ⊗ |1⟩ = |01⟩:');
  console.log('Dimension:', state01.dimension);
  console.log('Amplitudes:', state01.amplitudes);
  
  // |+⟩ ⊗ |0⟩ = (|00⟩ + |10⟩)/√2
  const statePlus0 = composeStates([plus, zero]);
  console.log('\n|+⟩ ⊗ |0⟩ = (|00⟩ + |10⟩)/√2:');
  console.log('Dimension:', statePlus0.dimension);
  console.log('Amplitudes:', statePlus0.amplitudes);
  
  // |+⟩ ⊗ |+⟩ = (|00⟩ + |01⟩ + |10⟩ + |11⟩)/2
  const statePlusPlus = composeStates([plus, plus]);
  console.log('\n|+⟩ ⊗ |+⟩ = (|00⟩ + |01⟩ + |10⟩ + |11⟩)/2:');
  console.log('Dimension:', statePlusPlus.dimension);
  console.log('Amplitudes:', statePlusPlus.amplitudes);
  
  // Compare with entangled Bell state
  const bell = createBellState('Phi+');
  console.log('\nBell state (|00⟩ + |11⟩)/√2:');
  console.log('Dimension:', bell.dimension);
  console.log('Amplitudes:', bell.amplitudes);
  console.log('Note: Bell state cannot be written as a tensor product of individual states!');
}

// Demonstrate composition of quantum operators
function demoOperatorComposition() {
  console.log('\n\n=== Quantum Operator Composition ===\n');
  
  console.log('Composing quantum operators:');
  
  // X ⊗ Z
  const XZ = composeOperators([PauliX, PauliZ]);
  console.log('\nX ⊗ Z:');
  console.log('Dimension:', XZ.dimension);
  console.log('Matrix:');
  console.log(XZ.toMatrix());
  
  // Z ⊗ X
  const ZX = composeOperators([PauliZ, PauliX]);
  console.log('\nZ ⊗ X:');
  console.log('Dimension:', ZX.dimension);
  console.log('Matrix:');
  console.log(ZX.toMatrix());
  
  // H ⊗ H (important for creating Bell states)
  const HH = composeOperators([Hadamard, Hadamard]);
  console.log('\nH ⊗ H:');
  console.log('Dimension:', HH.dimension);
  console.log('Matrix:');
  console.log(HH.toMatrix());
  
  // Three-operator composition: X ⊗ Y ⊗ Z
  const XYZ = composeOperators([PauliX, PauliY, PauliZ]);
  console.log('\nX ⊗ Y ⊗ Z:');
  console.log('Dimension:', XYZ.dimension);
}

// Demonstrate bipartite splitting of quantum systems
function demoBipartiteSplit() {
  console.log('\n\n=== Bipartite System Splitting ===\n');
  
  // Create a 4-dimensional space (equivalent to two qubits)
  const space4d = new HilbertSpace(4, ['|00⟩', '|01⟩', '|10⟩', '|11⟩']);
  
  // Split into two 2-dimensional spaces
  const [spaceA, spaceB] = bipartiteSplit(space4d, 2);
  
  console.log('Split 4-dimensional space into 2×2:');
  console.log('Original space dimension:', space4d.dimension);
  console.log('Original space basis:', space4d.basis);
  console.log('Subsystem A dimension:', spaceA.dimension);
  console.log('Subsystem A basis:', spaceA.basis);
  console.log('Subsystem B dimension:', spaceB.dimension);
  console.log('Subsystem B basis:', spaceB.basis);
  
  // Create a 6-dimensional space (qubit + qutrit)
  const space6d = new HilbertSpace(6);
  
  // Split into 2 and 3
  const [space2d, space3d] = bipartiteSplit(space6d, 2);
  
  console.log('\nSplit 6-dimensional space into 2×3:');
  console.log('Original space dimension:', space6d.dimension);
  console.log("Original space basis:", space6d.basis);
  console.log('Subsystem A dimension:', space2d.dimension);
  console.log('subsystem A basis:', space2d.basis);
  console.log('Subsystem B dimension:', space3d.dimension);
  console.log('subsystem B basis:', space3d.basis);
  
  // Create an 8-dimensional space (three qubits)
  const space8d = new HilbertSpace(8);
  
  // Split into 2 and 4 (single qubit vs two qubits)
  const [space2d_3q, space4d_3q] = bipartiteSplit(space8d, 2);
  
  console.log('\nSplit 8-dimensional space into 2×4:');
  console.log('Original space dimension:', space8d.dimension);
  console.log('Subsystem A dimension:', space2d_3q.dimension);
  console.log('Subsystem B dimension:', space4d_3q.dimension);
}

// Demonstrate partial trace operations
function demoPartialTrace() {
  console.log('\n\n=== Partial Trace Operations ===\n');
  
  // Create tensor product operators
  console.log('Using partial trace on tensor product operators:');
  
  // Identity operator for 2×2 system
  const identityMatrix4 = MatrixOperator.identity(4);
  
  // Partial trace over first subsystem
  console.log('\nPartial trace of I_4 over first qubit:');
  const reducedId1 = partialTrace(identityMatrix4, [2, 2], [0]);
  console.log('Result dimension:', reducedId1.dimension);
  console.log('Result matrix:');
  console.log(reducedId1.toMatrix());
  console.log('Result should be 2·I_2 where I_2 is 2×2 identity');
  
  // Partial trace over second subsystem
  console.log('\nPartial trace of I_4 over second qubit:');
  const reducedId2 = partialTrace(identityMatrix4, [2, 2], [1]);
  console.log('Result dimension:', reducedId2.dimension);
  console.log('Result matrix:');
  console.log(reducedId2.toMatrix());
  console.log('Result should be 2·I_2 where I_2 is 2×2 identity');
  
  // X ⊗ Z operator
  const XZ = composeOperators([PauliX, PauliZ]);
  
  // Partial trace over first subsystem (X)
  console.log('\nPartial trace of X⊗Z over first qubit:');
  const reducedXZ1 = partialTrace(XZ, [2, 2], [0]);
  console.log('Result dimension:', reducedXZ1.dimension);
  console.log('Result matrix:');
  console.log(reducedXZ1.toMatrix());
  console.log('Result should be Tr(X)·Z = 0·Z = 0');
  
  // Partial trace over second subsystem (Z)
  console.log('\nPartial trace of X⊗Z over second qubit:');
  const reducedXZ2 = partialTrace(XZ, [2, 2], [1]);
  console.log('Result dimension:', reducedXZ2.dimension);
  console.log('Result matrix:');
  console.log(reducedXZ2.toMatrix());
  console.log('Result should be Tr(Z)·X = 0·X = 0');
  
  // Demonstrate on Bell state density matrix
  console.log('\nPartial trace of Bell state density matrix:');
  const bell = createBellState('Phi+');
  
  // Create density matrix for Bell state
  const bellMatrix = Array(4).fill(null).map(() => 
    Array(4).fill(null).map(() => math.complex(0,  0))
  );
  
  // Construct |Ψ⟩⟨Ψ| for Bell state
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const re = bell.amplitudes[i].re * bell.amplitudes[j].re + 
                 bell.amplitudes[i].im * bell.amplitudes[j].im;
      const im = bell.amplitudes[i].re * bell.amplitudes[j].im - 
                 bell.amplitudes[i].im * bell.amplitudes[j].re;
      bellMatrix[i][j] = math.complex(re,  im);
    }
  }
  
  const bellDensity = new MatrixOperator(bellMatrix);
  
  // Trace out first qubit
  const reducedBell1 = partialTrace(bellDensity, [2, 2], [0]);
  console.log('Result from tracing out first qubit:');
  console.log(reducedBell1.toMatrix());
  console.log('Should be maximally mixed state I/2');
  
  // Trace out second qubit
  const reducedBell2 = partialTrace(bellDensity, [2, 2], [1]);
  console.log('\nResult from tracing out second qubit:');
  console.log(reducedBell2.toMatrix());
  console.log('Should be maximally mixed state I/2');
  
  console.log('\nThis confirms that each qubit in a Bell state is maximally mixed!');
}

// Run all demonstrations
demoHilbertSpaceComposition();
demoStateComposition();
demoOperatorComposition();
demoBipartiteSplit();
demoPartialTrace();
