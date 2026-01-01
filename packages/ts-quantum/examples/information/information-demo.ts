/**
 * Demonstrates quantum information theory metrics and measures
 * 
 * Shows how to quantify and analyze information-theoretic properties
 * of quantum states, useful for quantum computing and communication.
 */

import {
  fidelity,
  traceFidelity,
  traceDistance,
  vonNeumannEntropy,
  linearEntropy,
  quantumRelativeEntropy,
  quantumMutualInformation
} from '../../src/utils/information';
import { StateVector } from '../../src/states/stateVector';
import { DensityMatrixOperator } from '../../src/states/densityMatrix';
import { multiplyMatrices } from '../../src/utils/matrixOperations';
import * as math from 'mathjs';

// Helper to create density matrices from state vectors
function createDensityMatrix(state: StateVector): DensityMatrixOperator {
  const dim = state.dimension;
  const matrix = Array(dim).fill(null).map(() => Array(dim).fill(null).map(() => math.complex(0,  0)));
  
  // Construct density matrix |Ψ⟩⟨Ψ|
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      const re = state.amplitudes[i].re * state.amplitudes[j].re + 
                 state.amplitudes[i].im * state.amplitudes[j].im;
      const im = state.amplitudes[i].re * state.amplitudes[j].im - 
                 state.amplitudes[i].im * state.amplitudes[j].re;
      matrix[i][j] = math.complex(re,  im);
    }
  }
  
  return new DensityMatrixOperator(matrix);
}

// Create a variety of quantum states for testing
function createTestStates() {
  // Pure states
  
  // |0⟩ state
  const zeroState = new StateVector(2, [
    math.complex(1,  0),
    math.complex(0,  0)
  ]);
  
  // |1⟩ state
  const oneState = new StateVector(2, [
    math.complex(0,  0),
    math.complex(1,  0)
  ]);
  
  // |+⟩ = (|0⟩ + |1⟩)/√2 state
  const plusState = new StateVector(2, [
    math.complex(1/Math.sqrt(2),  0),
    math.complex(1/Math.sqrt(2),  0)
  ]);
  
  // Mixed states (density matrices)
  
  // Pure state density matrices
  const zeroDensity = createDensityMatrix(zeroState);
  const oneDensity = createDensityMatrix(oneState);
  const plusDensity = createDensityMatrix(plusState);
  
  // Maximally mixed state I/2
  const mixedMatrix = [
    [math.complex(0.5,  0), math.complex(0,  0)],
    [math.complex(0,  0), math.complex(0.5,  0)]
  ];
  const mixedDensity = new DensityMatrixOperator(mixedMatrix);
  
  // Partially mixed state
  const partialMixedMatrix = [
    [math.complex(0.7,  0), math.complex(0,  0)],
    [math.complex(0,  0), math.complex(0.3,  0)]
  ];
  const partialMixedDensity = new DensityMatrixOperator(partialMixedMatrix);
  
  return {
    // Pure states
    zeroState,
    oneState,
    plusState,
    
    // Density matrices
    zeroDensity,
    oneDensity,
    plusDensity,
    mixedDensity,
    partialMixedDensity
  };
}

// Demonstrate fidelity measures for pure states
function demoPureStateFidelity() {
  console.log('=== Pure State Fidelity Demonstration ===\n');
  
  const { zeroState, oneState, plusState } = createTestStates();
  
  // Calculate fidelities between different pairs of states
  console.log('Fidelity between identical states |0⟩ and |0⟩:');
  console.log(fidelity(zeroState, zeroState));
  console.log('Should be 1 (identical states have fidelity 1)\n');
  
  console.log('Fidelity between orthogonal states |0⟩ and |1⟩:');
  console.log(fidelity(zeroState, oneState));
  console.log('Should be 0 (orthogonal states have fidelity 0)\n');
  
  console.log('Fidelity between |0⟩ and |+⟩:');
  console.log(fidelity(zeroState, plusState));
  console.log('Should be 0.5 (|⟨0|+⟩|² = |1/√2|² = 1/2)\n');
  
  console.log('Fidelity between |1⟩ and |+⟩:');
  console.log(fidelity(oneState, plusState));
  console.log('Should be 0.5 (|⟨1|+⟩|² = |1/√2|² = 1/2)\n');
}

// Demonstrate fidelity measures for mixed states
function demoMixedStateFidelity() {
  console.log('\n=== Mixed State Fidelity Demonstration ===\n');
  
  const { zeroDensity, oneDensity, plusDensity, mixedDensity, partialMixedDensity } = createTestStates();
  
  // Calculate fidelities between different pairs of density matrices
  console.log('Trace fidelity between pure states |0⟩⟨0| and |0⟩⟨0|:');
  console.log(traceFidelity(zeroDensity, zeroDensity));
  console.log('Should be 1 (identical states have fidelity 1)\n');
  
  console.log('Trace fidelity between pure states |0⟩⟨0| and |1⟩⟨1|:');
  console.log(traceFidelity(zeroDensity, oneDensity));
  console.log('Should be 0 (orthogonal pure states have fidelity 0)\n');
  
  console.log('Trace fidelity between pure state |0⟩⟨0| and mixed state I/2:');
  console.log(traceFidelity(zeroDensity, mixedDensity));
  console.log('Should be 0.5 (Tr(|0⟩⟨0|·I/2) = 0.5)\n');
  
  console.log('Trace fidelity between pure state |+⟩⟨+| and mixed state I/2:');
  console.log(traceFidelity(plusDensity, mixedDensity));
  console.log('Should be 0.5 (any pure state has fidelity 0.5 with I/2)\n');
  
  console.log('Trace fidelity between two different mixed states:');
  console.log(traceFidelity(mixedDensity, partialMixedDensity));
}

// Demonstrate trace distance
function demoTraceDistance() {
  console.log('\n=== Trace Distance Demonstration ===\n');
  
  const { zeroDensity, oneDensity, plusDensity, mixedDensity } = createTestStates();
  
  // Calculate trace distances between different pairs of states
  console.log('Trace distance between identical states |0⟩⟨0| and |0⟩⟨0|:');
  console.log(traceDistance(zeroDensity, zeroDensity));
  console.log('Should be 0 (identical states have distance 0)\n');
  
  console.log('Trace distance between orthogonal pure states |0⟩⟨0| and |1⟩⟨1|:');
  console.log(traceDistance(zeroDensity, oneDensity));
  console.log('Should be 1 (orthogonal pure states have distance 1)\n');
  
  console.log('Trace distance between pure state |0⟩⟨0| and mixed state I/2:');
  console.log(traceDistance(zeroDensity, mixedDensity));
  console.log('Should be 0.5 (pure state to maximally mixed)\n');
  
  console.log('Trace distance between pure state |+⟩⟨+| and mixed state I/2:');
  console.log(traceDistance(plusDensity, mixedDensity));
  console.log('Should be 0.5 (pure state to maximally mixed)\n');
}

// Demonstrate entropy measures
function demoEntropyMeasures() {
  console.log('\n=== Entropy Measures Demonstration ===\n');
  
  const { zeroDensity, mixedDensity, partialMixedDensity } = createTestStates();
  
  // Von Neumann entropy
  console.log('Von Neumann entropy of pure state |0⟩⟨0|:');
  console.log(vonNeumannEntropy(zeroDensity));
  console.log('Should be 0 (pure states have zero entropy)\n');
  
  console.log('Von Neumann entropy of maximally mixed state I/2:');
  console.log(vonNeumannEntropy(mixedDensity));
  console.log('Should be ln(2) =', Math.log(2), '\n');
  
  console.log('Von Neumann entropy of partially mixed state:');
  console.log(vonNeumannEntropy(partialMixedDensity));
  console.log('Should be -0.7·ln(0.7) - 0.3·ln(0.3) =', -0.7 * Math.log(0.7) - 0.3 * Math.log(0.3), '\n');
  
  // Linear entropy (simpler measure)
  console.log('Linear entropy of pure state |0⟩⟨0|:');
  console.log(linearEntropy(zeroDensity));
  console.log('Should be 0 (pure states have zero linear entropy)\n');
  
  console.log('Linear entropy of maximally mixed state I/2:');
  console.log(linearEntropy(mixedDensity));
  console.log('Should be 0.5 (1 - 1/d for d=2)\n');
  
  console.log('Linear entropy of partially mixed state:');
  console.log(linearEntropy(partialMixedDensity));
  console.log('Should be 1 - (0.7² + 0.3²) = 1 - 0.58 = 0.42\n');
}

// Demonstrate relative entropy (quantum KL divergence)
function demoRelativeEntropy() {
  console.log('\n=== Quantum Relative Entropy Demonstration ===\n');
  
  const { zeroDensity, oneDensity, mixedDensity, partialMixedDensity } = createTestStates();
  
  // Calculate quantum relative entropy between different states
  console.log('Relative entropy S(ρ||σ) between identical states:');
  console.log(quantumRelativeEntropy(zeroDensity, zeroDensity));
  console.log('Should be 0 (identical states have zero relative entropy)\n');
  
  console.log('Relative entropy S(ρ||σ) from pure to mixed state:');
  console.log(quantumRelativeEntropy(zeroDensity, mixedDensity));
  console.log('Should be ln(2) =', Math.log(2), '\n');
  
  console.log('Relative entropy S(ρ||σ) from mixed to pure state:');
  try {
    console.log(quantumRelativeEntropy(mixedDensity, zeroDensity));
  } catch (error) {
    console.log('Error (expected): relative entropy is infinite when supp(ρ) is not contained in supp(σ)');
  }
  
  console.log('\nRelative entropy S(ρ||σ) between different mixed states:');
  console.log(quantumRelativeEntropy(mixedDensity, partialMixedDensity));
}

// Run all demonstrations
demoPureStateFidelity();
demoMixedStateFidelity();
demoTraceDistance();
demoEntropyMeasures();
demoRelativeEntropy();
