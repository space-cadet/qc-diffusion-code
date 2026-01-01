/**
 * Tests for Hamiltonian implementation
 */

import { describe, it, expect, beforeEach, test } from 'vitest';

import { Hamiltonian, IHamiltonianTerm } from '../src/operators/hamiltonian';
// import { math.complex } from '../complex';
import { PauliX, PauliY, PauliZ } from '../src/operators/gates';
import { MatrixOperator } from '../src/operators/operator';
import { StateVector } from '../src/states/stateVector';
import * as math from 'mathjs';
import { createPlusState } from '../src/states/states';
import { stateVectorApproxEqual } from './utils/testHelpers';
import { isHermitian } from '../src/utils/matrixOperations';

describe('Hamiltonian', () => {
  describe('Basic Hamiltonian operations', () => {
    let H: Hamiltonian;
    
    beforeEach(() => {
      // Create a simple Hamiltonian H = σz
      H = new Hamiltonian(2, [{
        coefficient: math.complex(1,  0),
        operator: PauliZ
      }], 'spin');
    });

    test('should construct correctly', () => {
      expect(H.dimension).toBe(2);
      expect(H.hamiltonianType).toBe('spin');
      expect(H.terms.length).toBe(1);
    });

    test('should compute correct expectation values', () => {
      // Test with |0⟩ state (eigenstate of σz with +1)
      const state0 = StateVector.computationalBasis(2, 0);
      const exp0 = H.expectationValue(state0);
      expect(exp0.re).toBeCloseTo(1);
      expect(exp0.im).toBeCloseTo(0);

      // Test with |1⟩ state (eigenstate of σz with -1)
      const state1 = StateVector.computationalBasis(2, 1);
      const exp1 = H.expectationValue(state1);
      expect(exp1.re).toBeCloseTo(-1);
      expect(exp1.im).toBeCloseTo(0);
    });

    test('should correctly evolve states', () => {
      // Create |+⟩ state = (|0⟩ + |1⟩)/√2
      const statePlus = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);

      // console.log(statePlus.toString());

      // console.log(H.toString());

      // Evolve for t = π/2 (quarter rotation)
      const evolved = H.evolveState(statePlus, Math.PI/2);

      // console.log(evolved.toString());
      
      // Should be (|0⟩ + i|1⟩)/√2
      expect(evolved.amplitudes[0].re).toBeCloseTo(0);
      expect(evolved.amplitudes[0].im).toBeCloseTo(-1/Math.sqrt(2));
      expect(evolved.amplitudes[1].re).toBeCloseTo(0);
      expect(evolved.amplitudes[1].im).toBeCloseTo(1/Math.sqrt(2));
    });
  });

  describe('Spin Hamiltonian', () => {
    test('should create correct spin Hamiltonian', () => {
      const B = [1, 0, 0] as [number, number, number];  // Field in x direction
      const H = Hamiltonian.createSpinHamiltonian(B);

      console.log("Spin Hamiltonian");

      console.log(H.toString());

      // Should be equivalent to σx
      // const state = StateVector.computationalBasis(2, 1);
      const state = createPlusState();
      const evolved = H.evolveState(state, Math.PI);  // Rotate by π

      console.log("Initial state: ", state.toString());

      console.log("Evolved state: ", evolved.toString());
      
      // Should flip to |1⟩
      console.log(stateVectorApproxEqual(state, evolved.scale(math.complex(-1,0)), 1e-10));
      expect(stateVectorApproxEqual(state, evolved.scale(math.complex(-1,0)), 1e-10)).toBe(true);
    });

    test('should give correct energy levels', () => {
      const B = [0, 0, 1] as [number, number, number];  // Field in z direction
      const H = Hamiltonian.createSpinHamiltonian(B);

      // Ground state |0⟩ should have energy +1
      const ground = StateVector.computationalBasis(2, 0);
      const E0 = H.expectationValue(ground);
      expect(E0.re).toBeCloseTo(1);

      // Excited state |1⟩ should have energy -1
      const excited = StateVector.computationalBasis(2, 1);
      const E1 = H.expectationValue(excited);
      expect(E1.re).toBeCloseTo(-1);
    });
  });

  describe('Heisenberg Hamiltonian', () => {
    test('should create correct Heisenberg Hamiltonian', () => {
      const H = Hamiltonian.createHeisenbergHamiltonian(2, 1);  // Two spins, J=1
      
      // Test with |↑↑⟩ state
      const upup = StateVector.computationalBasis(4, 0);
      const E_upup = H.expectationValue(upup);

      console.log("Heisenberg Hamiltonian");

      console.log(H.toString());
      console.log("Up up state: ", upup.toString());
      console.log("Expectation value: ", E_upup);

      expect(E_upup.re).toBeCloseTo(1.0);  // Eigenstate with E = 3J/4

      // Test with singlet state (|↑↓⟩ - |↓↑⟩)/√2
      const singlet = new StateVector(4, [
        math.complex(0,  0),
        math.complex(1/Math.sqrt(2),  0),
        math.complex(-1/Math.sqrt(2),  0),
        math.complex(0,  0)
      ]);
      const E_singlet = H.expectationValue(singlet);

      console.log("Singlet state: ", singlet.toString());

      console.log("Singlet Expectation Value: ", E_singlet);

      expect(E_singlet.re).toBeCloseTo(-3.0);  // Eigenstate with E = -3J/4
    });

    test('should conserve total spin and energy', () => {
      const H = Hamiltonian.createHeisenbergHamiltonian(2, 1);

      // Start with |↑↓⟩ state
      const updown = StateVector.computationalBasis(4, 1);
      const initialEnergy = H.expectationValue(updown).re;
      
      // Evolve for various times
      const times = [0.1, 0.5, 1.0, 2.0];
      for (const t of times) {
        const evolved = H.evolveState(updown, t);
        
        // Should only evolve within Sz=0 subspace
        const prob0 = math.abs(math.multiply(evolved.amplitudes[0], math.conj(evolved.amplitudes[0])));
        const prob3 = math.abs(math.multiply(evolved.amplitudes[3], math.conj(evolved.amplitudes[3])));
        expect(prob0).toBeCloseTo(0);
        expect(prob3).toBeCloseTo(0);
        
        // Energy should be conserved
        const energy = H.expectationValue(evolved).re;
        expect(energy).toBeCloseTo(initialEnergy);
        
        // Verify |↑↓⟩ evolves to mix with |↓↑⟩ only 
        const totalProb = math.add(
          math.abs(math.multiply(evolved.amplitudes[1], math.conj(evolved.amplitudes[1]))),
          math.abs(math.multiply(evolved.amplitudes[2], math.conj(evolved.amplitudes[2])))
        );
        expect(totalProb).toBeCloseTo(1);
      }
    });

    test('evolves product and entangled states correctly', () => {
      const H = Hamiltonian.createHeisenbergHamiltonian(2, 1);

      console.log("Heisenberg Hamiltonian: ", H.toString());
      
      // Test evolution of |↑↑⟩ state (energy eigenstate)
      const upup = StateVector.computationalBasis(4, 0);
      const evolved_upup = H.evolveState(upup, Math.PI);

      const evolve_op = H.getEvolutionOperator(Math.PI);

      console.log("Up up state: ", upup.toString());
      console.log("Evolved up up state: ", evolved_upup.toString());
      console.log("Evolution operator: ", evolve_op.toString());

      expect(evolved_upup.innerProduct(upup)).toBeCloseTo(-1.0);  // Should return to negative of itself
      
      // Test evolution of |↑↓⟩ state
      const updown = StateVector.computationalBasis(4, 1);
      const evolved_updown = H.evolveState(updown, Math.PI);

      console.log("Up down state: ", updown.toString());
      console.log("Evolved up down state: ", evolved_updown.toString());
      console.log(evolved_updown);
      
      // At t = π, should have maximum overlap with |↓↑⟩
      // const downup = StateVector.computationalBasis(4, 2);
      const overlap = evolved_updown.innerProduct(updown);

      // console.log("Down Up state: ", downup.toString());
      console.log("Overlap with up down state: ", overlap);

      expect(overlap).toBeCloseTo(-1);
    });
  });

  describe('Error handling', () => {
    test('should throw on dimension mismatch', () => {
      const H = new Hamiltonian(2, [{
        coefficient: math.complex(1,  0),
        operator: PauliZ
      }]);

      const wrongState = new StateVector(3, [
        math.complex(1,  0),
        math.complex(0,  0),
        math.complex(0,  0)
      ]);

      expect(() => H.evolveState(wrongState, 1)).toThrow();
      expect(() => H.expectationValue(wrongState)).toThrow();
    });

    test('should throw on non-Hermitian terms when required', () => {
      const nonHermitian = new MatrixOperator([
        [math.complex(1,  0), math.complex(1,  1)],
        [math.complex(1,  +1), math.complex(1,  0)]
      ]);

      console.log("Is Hermitian?: ",isHermitian(nonHermitian.toMatrix()));

      // const ham = new Hamiltonian(2, [{coefficient: math.complex(1,  0), operator: nonHermitian }], 'custom', false, true);
      // console.log(ham.toString());
      expect(() => new Hamiltonian(2, [{
        coefficient: math.complex(1,  0),
        operator: nonHermitian
      }], 'custom', false, true)).toThrow();  // requireHermitian = true
    });
  });
});
