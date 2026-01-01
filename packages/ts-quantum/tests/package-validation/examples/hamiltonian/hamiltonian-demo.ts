/**
 * Examples of using the Hamiltonian class for quantum simulations
 */

import { Hamiltonian } from '../../src/operators/hamiltonian';
import { StateVector } from '../../src/states/stateVector';
import { PauliX, PauliY, PauliZ } from '../../src/operators/gates';
import { MatrixOperator } from '../../src/operators/operator';
import { composeOperators } from '../../src/states/composite';
import * as math from 'mathjs';

/**
 * Example 1: Single Spin in a Magnetic Field
 * Shows basic Hamiltonian construction and time evolution
 */
function singleSpinExample() {
  console.log('Example 1: Single Spin in a Magnetic Field');
  console.log('----------------------------------------');

  // Arbitrary magnetic field B (can be changed to any values)
  const B: [number, number, number] = [1, 1, 1];  // Example: B along (1,1,1)
  const B_magnitude = Math.sqrt(B[0]*B[0] + B[1]*B[1] + B[2]*B[2]);
  const B_normalized = B.map(x => x/B_magnitude) as [number, number, number];
  
  console.log(`Magnetic field B = (${B[0]}, ${B[1]}, ${B[2]})`);
  console.log(`|B| = ${B_magnitude}`);
  
  const H = Hamiltonian.createSpinHamiltonian(B);

  // Create initial state |+⟩ = (|0⟩ + |1⟩)/√2
  const initialState = new StateVector(2, [
    math.complex(1/Math.sqrt(2), 0),
    math.complex(1/Math.sqrt(2), 0)
  ]);

  // New: Create 50 evenly spaced time points from 0 to π
  const numPoints = 50;
  const times = Array.from({length: numPoints}, (_, i) => i * Math.PI / (numPoints - 1));

  function theoreticalExpectations(t: number): [number, number, number] {
    const ωt = 2 * B_magnitude * t;  // Note: frequency is still 2|B| despite sign convention
    const cosωt = Math.cos(ωt);
    const sinωt = Math.sin(ωt);
    
    const [nx, ny, nz] = B_normalized;
    
    // Adjusted for H = +B·σ convention
    const sx = nx*nx*(1-cosωt) + cosωt;
    const sy = nx*ny*(1-cosωt) + nz*sinωt;  // Note sign change
    const sz = nx*nz*(1-cosωt) - ny*sinωt;  // Note sign change
    
    return [sx, sy, sz];
  }

  console.log('Initial state:', initialState.toString());
  const energy = H.expectationValue(initialState);
  console.log('Energy expectation value:', energy.re.toFixed(3));
  console.log('\nTime evolution:');

  // Calculate theoretical initial energy
  // Correct theoretical energy for |+⟩ state
  // For B = (Bx,By,Bz), |+⟩ is eigenstate of σx with eigenvalue +1
  // and has expectation value 0 for σy and σz
  // So ⟨H⟩ = Bx⟨σx⟩ + By⟨σy⟩ + Bz⟨σz⟩ = Bx
  const theoretical_energy = B[0];  // = 1 for B = (1,1,1)
  console.log('Theoretical initial energy:', theoretical_energy.toFixed(3));

  // Table header with energy columns
  console.log('\nTime Evolution of Spin Components and Energy:');
  console.log('Time (π) |    σx (num)    σx (theory)  |    σy (num)    σy (theory)  |    σz (num)    σz (theory)  |    E (num)    E (theory)');
  console.log('-'.repeat(125));

  for (const t of times) {
    const evolved = H.evolveState(initialState, t);
    
    // Calculate expectation values for all Pauli operators
    const sx_numerical = evolved.innerProduct(PauliX.apply(evolved)).re;
    const sy_numerical = evolved.innerProduct(PauliY.apply(evolved)).re;
    const sz_numerical = evolved.innerProduct(PauliZ.apply(evolved)).re;

    // Calculate numerical energy
    const energy_numerical = H.expectationValue(evolved).re;

    // Get theoretical values for arbitrary B
    const [sx_theoretical, sy_theoretical, sz_theoretical] = theoreticalExpectations(t);

    // Print in table format with fixed decimal places
    console.log(
      `${(t/Math.PI).toFixed(3).padStart(8)} |` +
      `${sx_numerical.toFixed(6).padStart(12)} ${sx_theoretical.toFixed(6).padStart(12)} |` +
      `${sy_numerical.toFixed(6).padStart(12)} ${sy_theoretical.toFixed(6).padStart(12)} |` +
      `${sz_numerical.toFixed(6).padStart(12)} ${sz_theoretical.toFixed(6).padStart(12)} |` +
      `${energy_numerical.toFixed(6).padStart(12)} ${theoretical_energy.toFixed(6).padStart(12)}`
    );
  }

  // Add summary of maximum deviations
  const maxDeviations = times.map(t => {
    const evolved = H.evolveState(initialState, t);
    const sx_num = evolved.innerProduct(PauliX.apply(evolved)).re;
    const sy_num = evolved.innerProduct(PauliY.apply(evolved)).re;
    const sz_num = evolved.innerProduct(PauliZ.apply(evolved)).re;
    
    const [sx_theory, sy_theory, sz_theory] = theoreticalExpectations(t);
    
    return {
      x: Math.abs(sx_num - sx_theory),
      y: Math.abs(sy_num - sy_theory),
      z: Math.abs(sz_num - sz_theory)
    };
  });

  const max_x_dev = Math.max(...maxDeviations.map(d => d.x));
  const max_y_dev = Math.max(...maxDeviations.map(d => d.y));
  const max_z_dev = Math.max(...maxDeviations.map(d => d.z));

  console.log('\nMaximum Deviations from Theory:');
  console.log(`σx: ${max_x_dev.toExponential(3)}`);
  console.log(`σy: ${max_y_dev.toExponential(3)}`);
  console.log(`σz: ${max_z_dev.toExponential(3)}`);
}

/**
 * Example 2: Heisenberg Spin Chain
 * Shows how to work with multi-spin systems
 */
function heisenbergChainExample() {
  console.log('Example 2: Heisenberg Spin Chain');
  console.log('------------------------------');

  // Create Heisenberg Hamiltonian for 3 spins with J = 1
  const H = Hamiltonian.createHeisenbergHamiltonian(3, 1);

  // Create initial Néel state |↑↓↑⟩
  const initialState = StateVector.computationalBasis(8, 0b101);

  console.log('Initial state: |↑↓↑⟩');
  const initialEnergy = H.expectationValue(initialState);
  console.log('Energy:', initialEnergy.re.toFixed(3));

  // Evolve for different times
  const times = [0.1, 0.5, 1.0, 2.0];
  
  console.log('\nTime evolution:');
  for (const t of times) {
    const evolved = H.evolveState(initialState, t);
    
    // Compute magnetization for each site
    const magnetization = computeMagnetization(evolved, 3);
    const energy = H.expectationValue(evolved);
    
    console.log(`\nt = ${t.toFixed(2)}:`);
    console.log('Magnetization per site:', magnetization.map(m => m.toFixed(3)));
    console.log('Total energy:', energy.re.toFixed(3));
  }
}

/**
 * Helper function to compute magnetization (⟨σz⟩) for each site
 */
function computeMagnetization(state: StateVector, numSites: number): number[] {
  const magnetization: number[] = [];
  
  for (let site = 0; site < numSites; site++) {
    // Create σz operator for this site
    const ops = Array(numSites).fill(null).map(() => 
      MatrixOperator.identity(2)
    );
    ops[site] = PauliZ;
    
    const sz = composeOperators(ops);
    
    // Compute expectation value
    const mz = sz.apply(state).innerProduct(state);
    magnetization.push(mz.re);
  }
  
  return magnetization;
}

// Run the examples
console.log('Running Hamiltonian Examples\n');
  
singleSpinExample();
console.log('\n' + '='.repeat(50) + '\n');
heisenbergChainExample();