/**
 * Spin Chain Dynamics Examples
 * 
 * Demonstrates:
 * 1. Heisenberg chain evolution
 * 2. Magnetization dynamics
 * 3. Spin correlation functions
 * 4. Domain wall dynamics
 */

import { Hamiltonian } from '../../src/operators/hamiltonian';
import { StateVector } from '../../src/states/stateVector';
import { MatrixOperator } from '../../src/operators/operator';
import { PauliZ } from '../../src/operators/gates';
import { Complex } from '../../src/core/types';
import { composeOperators } from '../../src/states/composite';
import * as math from 'mathjs';

/**
 * Creates magnetization operator for a specific site in a spin chain
 */
function createSitemagnetization(site: number, numSites: number): MatrixOperator {
    const ops = Array(numSites).fill(null).map(() => 
        MatrixOperator.identity(2)
    );
    ops[site] = PauliZ;
    return composeOperators(ops) as MatrixOperator;
}

/**
 * Creates spin correlation operator between two sites
 */
function createSpinCorrelation(site1: number, site2: number, numSites: number): MatrixOperator {
    const sz1 = createSitemagnetization(site1, numSites);
    const sz2 = createSitemagnetization(site2, numSites);
    return sz1.compose(sz2) as MatrixOperator;
}

/**
 * Example 1: Basic Heisenberg Chain Evolution
 */
function demonstrateHeisenbergDynamics() {
    console.log('Example 1: Two-Spin Heisenberg Evolution');
    console.log('-------------------------------------');

    // Create 2-spin Heisenberg chain with J = 1
    const numSites = 2;
    const J = 1.0;
    const H = Hamiltonian.createHeisenbergHamiltonian(numSites, J);

    // Initialize |↑↓⟩ state
    const initialState = StateVector.computationalBasis(Math.pow(2, numSites), 0b01);
    
    // Calculate initial energy
    const initial_energy = H.expectationValue(initialState).re;
    console.log('Initial state |↑↓⟩');
    console.log('Energy:', initial_energy.toFixed(3));

    // Create 50 evenly spaced time points from 0 to 2π
    const numPoints = 50;
    const times = Array.from({length: numPoints}, (_, i) => i * 2 * Math.PI / (numPoints - 1));

    // Table header
    console.log('\nTime Evolution Data:');
    console.log('Time (π) | Energy(num) Energy(th) | ⟨σz₁⟩(num) ⟨σz₁⟩(th) | ⟨σz₂⟩(num) ⟨σz₂⟩(th) | ⟨σz₁σz₂⟩(num) ⟨σz₁σz₂⟩(th) | P↑↓(num) P↑↓(th)');
    console.log('-'.repeat(120));

    for (const t of times) {
        const evolved = H.evolveState(initialState, t);
        
        // Calculate numerical quantities
        const energy_num = H.expectationValue(evolved).re;
        
        // Calculate spin expectations
        const sz1 = createSitemagnetization(0, numSites);
        const sz2 = createSitemagnetization(1, numSites);
        const sz1_num = evolved.innerProduct(sz1.apply(evolved)).re;
        const sz2_num = evolved.innerProduct(sz2.apply(evolved)).re;
        
        // Calculate correlation
        const corr = createSpinCorrelation(0, 1, numSites);
        const corr_num = evolved.innerProduct(corr.apply(evolved)).re;
        
        // Calculate probability of being in |↑↓⟩ state
        const complexProb = math.multiply(evolved.amplitudes[1], math.conj(evolved.amplitudes[1])) as Complex;
        const absValue = math.abs(complexProb);
        const prob_updown = typeof absValue === 'number' ? absValue : absValue.re;
        
        // Theoretical values
        const energy_th = initial_energy;  // Energy is conserved
        const sz1_th = Math.cos(2*J*t);    // Theoretical z-magnetization of first spin
        const sz2_th = -Math.cos(2*J*t);   // Theoretical z-magnetization of second spin
        const corr_th = -1;                // Theoretical spin correlation (constant for singlet-triplet oscillation)
        const prob_updown_th = Math.cos(J*t)*Math.cos(J*t);  // Theoretical probability of |↑↓⟩
        
        // Print in table format
        console.log(
            `${(t/Math.PI).toFixed(3).padStart(8)} |` +
            `${energy_num.toFixed(6).padStart(11)} ${energy_th.toFixed(6).padStart(11)} |` +
            `${sz1_num.toFixed(6).padStart(11)} ${sz1_th.toFixed(6).padStart(11)} |` +
            `${sz2_num.toFixed(6).padStart(11)} ${sz2_th.toFixed(6).padStart(11)} |` +
            `${corr_num.toFixed(6).padStart(13)} ${corr_th.toFixed(6).padStart(13)} |` +
            `${prob_updown.toFixed(6).padStart(9)} ${prob_updown_th.toFixed(6).padStart(9)}`
        );
    }

    // Add summary of maximum deviations
    console.log('\nMaximum Deviations from Theory:');
    console.log(`Energy: ${math.max(...times.map(t => {
        const evolved = H.evolveState(initialState, t);
        return Math.abs(H.expectationValue(evolved).re - initial_energy);
    })).toExponential(3)}`);
}

/**
 * Example 2: Domain Wall Dynamics
 */
function demonstrateDomainWall() {
    console.log('\nExample 2: Domain Wall Dynamics');
    console.log('----------------------------');

    // Create 6-site chain
    const numSites = 6;
    const J = 1.0;
    const H = Hamiltonian.createHeisenbergHamiltonian(numSites, J);

    // Initialize domain wall state |↑↑↑↓↓↓⟩
    const domainState = StateVector.computationalBasis(
        Math.pow(2, numSites), 
        0b111000  // First three up, last three down
    );

    console.log('Initial domain wall state |↑↑↑↓↓↓⟩');
    console.log('Energy:', H.expectationValue(domainState).re.toFixed(3));

    // Measure initial profile
    const initialMags = Array(numSites).fill(0).map((_,i) => {
        const sz = createSitemagnetization(i, numSites);
        return domainState.innerProduct(sz.apply(domainState)).re;
    });
    console.log('Initial magnetization profile:', initialMags.map(m => m.toFixed(3)));

    // Time evolution
    const times = [0.5, 1.0, 2.0, 4.0];
    for (const t of times) {
        const evolved = H.evolveState(domainState, t);
        console.log(`\nt = ${t.toFixed(2)}:`);
        
        // Measure magnetization profile
        const mags = Array(numSites).fill(0).map((_,i) => {
            const sz = createSitemagnetization(i, numSites);
            return evolved.innerProduct(sz.apply(evolved)).re;
        });
        console.log('Magnetization profile:', mags.map(m => m.toFixed(3)));
        
        // Calculate domain wall width
        const width = calculateDomainWidth(mags);
        console.log('Approximate domain width:', width.toFixed(2));
    }
}

/**
 * Helper function to estimate domain wall width
 * Uses the spread of the transition region where magnetization changes sign
 */
function calculateDomainWidth(magnetizations: number[]): number {
    // Find points where magnetization crosses zero
    const crossings: number[] = [];
    for (let i = 0; i < magnetizations.length - 1; i++) {
        if (magnetizations[i] * magnetizations[i+1] <= 0) {
            crossings.push(i + Math.abs(magnetizations[i]) / 
                (Math.abs(magnetizations[i]) + Math.abs(magnetizations[i+1])));
        }
    }
    
    // Use the spread of the transition region
    if (crossings.length >= 2) {
        return crossings[crossings.length-1] - crossings[0];
    }
    return magnetizations.length; // If no clear crossings, assume maximally spread
}

// Run the demonstrations
console.log('Spin Chain Dynamics Demonstrations\n');
demonstrateHeisenbergDynamics();
demonstrateDomainWall();