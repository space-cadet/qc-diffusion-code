/**
 * Quantum Harmonic Oscillator Examples
 * 
 * This file demonstrates:
 * 1. Creating the quantum harmonic oscillator Hamiltonian
 * 2. Ground state preparation and verification
 * 3. Coherent state evolution
 * 4. Energy level transitions
 * 5. Wavepacket dynamics
 */

import { Hamiltonian } from '../../src/operators/hamiltonian';
import { StateVector } from '../../src/states/stateVector';
import { MatrixOperator } from '../../src/operators/operator';
import { harmonicOscillator, positionOp, numberOp, destructionOp, creationOp } from '../../src/utils/oscillator';
import * as math from 'mathjs';

/**
 * Creates the quantum harmonic oscillator Hamiltonian with frequency ω
 */
function createOscillatorHamiltonian(dimension: number, omega: number = 1.0): Hamiltonian {
    const H = harmonicOscillator(dimension);
    const terms = [{
        operator: H.scale(math.complex(omega,  0)) as MatrixOperator,
        coefficient: math.complex(1,  0)
    }];

    return new Hamiltonian(dimension, terms, 'custom');
}

/**
 * Creates a coherent state |α⟩
 * |α⟩ = exp(-|α|²/2) Σ (α^n/√(n!)) |n⟩
 */
function createCoherentState(dimension: number, alpha: number): StateVector {
    const amplitudes = new Array(dimension).fill(0).map((_, n) => {
        const magnitude = Math.exp(-alpha*alpha/2) * Math.pow(alpha, n) / 
                         Math.sqrt(factorial(n));
        return math.complex(magnitude,  0);
    });
    return new StateVector(dimension, amplitudes);
}

/**
 * Helper function to compute factorial
 */
function factorial(n: number): number {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

/**
 * Example 1: Ground State Properties
 */
function demonstrateGroundState() {
    console.log('Example 1: Ground State Properties');
    console.log('--------------------------------');

    const dim = 10;
    const omega = 1.0;
    const H = createOscillatorHamiltonian(dim, omega);

    // Create ground state |0⟩
    const groundState = StateVector.computationalBasis(dim, 0);

    // Calculate energy
    const energy = H.expectationValue(groundState);
    console.log('Ground state energy:', energy.re.toFixed(3), 'ℏω');

    // Verify it's an eigenstate
    const evolved = H.evolveState(groundState, 2*Math.PI);
    const fidelity = evolved.innerProduct(groundState);
    console.log('Ground state fidelity after period:', 
                Math.abs(fidelity.re).toFixed(6));
}

/**
 * Example 2: Coherent State Evolution
 */
function demonstrateCoherentState() {
    console.log('\nExample 2: Coherent State Evolution');
    console.log('--------------------------------');

    const dim = 20;
    const omega = 1.0;
    const H = createOscillatorHamiltonian(dim, omega);

    // Create coherent state with α = 1
    const alpha = 1.0;
    const coherentState = createCoherentState(dim, alpha);

    // Time evolution
    const times = [0, Math.PI/2, Math.PI, 3*Math.PI/2, 2*Math.PI];
    
    for (const t of times) {
        const evolved = H.evolveState(coherentState, t);
        const energy = H.expectationValue(evolved);
        
        console.log(`\nt = ${(t/Math.PI).toFixed(2)}π:`);
        console.log('Energy:', energy.re.toFixed(3), 'ℏω');
        
        // Calculate occupation probabilities and number operator expectation
        const probs = evolved.amplitudes.slice(0, 5).map(amp => 
            amp.re * amp.re + amp.im * amp.im
        );
        const nOp = numberOp(dim);
        const nExpect = evolved.innerProduct(nOp.apply(evolved));
        
        console.log('First 5 state probabilities:', 
                    probs.map(p => p.toFixed(3)));
        console.log('Average photon number ⟨n⟩:', nExpect.re.toFixed(3));
    }
}

/**
 * Example 3: Wavepacket Dynamics
 */
function demonstrateWavepacket() {
    console.log('\nExample 3: Wavepacket Dynamics');
    console.log('----------------------------');

    const dim = 15;
    const omega = 1.0;
    const H = createOscillatorHamiltonian(dim, omega);

    // Create superposition of ground and first excited state
    const initialState = new StateVector(dim, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0),
        ...new Array(dim-2).fill(math.complex(0,  0))
    ]);

    // Evolution times covering oscillation period
    const times = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI];
    
    for (const t of times) {
        const evolved = H.evolveState(initialState, t);
        const energy = H.expectationValue(evolved);
        
        console.log(`\nt = ${(t/Math.PI).toFixed(2)}π:`);
        console.log('Energy:', energy.re.toFixed(3), 'ℏω');
        
        // Calculate position expectation value
        const x = positionOp(dim);
        const expectationX = evolved.innerProduct(x.apply(evolved));
        console.log('⟨x⟩:', expectationX.re.toFixed(3));
    }
}

// Run all demonstrations
console.log('Quantum Harmonic Oscillator Demonstrations\n');
demonstrateGroundState();
demonstrateCoherentState();
demonstrateWavepacket();