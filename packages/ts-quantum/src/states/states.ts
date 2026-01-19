/**
 * Common quantum states implementation
 */


import { StateVector } from './stateVector';
import * as math from 'mathjs';


/**
 * Creates computational basis states for multi-qubit system
 */
export function computationalBasis(numQubits: number): StateVector[] {
  if (numQubits < 1) {
    throw new Error('Number of qubits must be positive');
  }

  const dimension = 2 ** numQubits;
  const basis: StateVector[] = [];

  for (let i = 0; i < dimension; i++) {
    const state = new StateVector(dimension);
    state.setState(i, math.complex(1, 0));
    basis.push(state);
  }

  return basis;
}

/**
 * Creates a specific computational basis state |index⟩
 */
export function createBasisState(dimension: number, index: number): StateVector {
  if (index < 0 || index >= dimension) {
    throw new Error(`Index ${index} out of bounds for dimension ${dimension}`);
  }

  const state = new StateVector(dimension);
  state.setState(index, math.complex(1, 0));
  return state;
}

/**
 * Creates a Bell state
 */
export function createBellState(type: 'Phi+' | 'Phi-' | 'Psi+' | 'Psi-'): StateVector {
  // Create two-qubit state space
  const state = new StateVector(4);
  
  switch (type) {
    case 'Phi+': // |00⟩ + |11⟩)/√2
      state.setState(0, math.complex(1/Math.sqrt(2), 0));
      state.setState(3, math.complex(1/Math.sqrt(2), 0));
      break;
    case 'Phi-': // |00⟩ - |11⟩)/√2
      state.setState(0, math.complex(1/Math.sqrt(2), 0));
      state.setState(3, math.complex(-1/Math.sqrt(2), 0));
      break;
    case 'Psi+': // |01⟩ + |10⟩)/√2
      state.setState(1, math.complex(1/Math.sqrt(2), 0));
      state.setState(2, math.complex(1/Math.sqrt(2), 0));
      break;
    case 'Psi-': // |01⟩ - |10⟩)/√2
      state.setState(1, math.complex(1/Math.sqrt(2), 0));
      state.setState(2, math.complex(-1/Math.sqrt(2), 0));
      break;
  }

  return state;
}

/**
 * Creates a GHZ state (|000...0⟩ + |111...1⟩)/√2
 */
export function createGHZState(numQubits: number): StateVector {
  if (numQubits < 2) {
    throw new Error('GHZ state requires at least 2 qubits');
  }

  const dimension = 2 ** numQubits;
  const state = new StateVector(dimension);

  // Set first and last computational basis states
  state.setState(0, math.complex(1/Math.sqrt(2), 0));
  state.setState(dimension - 1, math.complex(1/Math.sqrt(2), 0));

  return state;
}

/**
 * Creates a W state |W_n⟩ = (|100...0⟩ + |010...0⟩ + ... + |000...1⟩)/√n
 */
export function createWState(numQubits: number): StateVector {
  if (numQubits < 2) {
    throw new Error('W state requires at least 2 qubits');
  }

  const dimension = 2 ** numQubits;
  const state = new StateVector(dimension);
  const amplitude = math.complex(1/Math.sqrt(numQubits), 0);

  // Set states with exactly one 1
  for (let i = 0; i < numQubits; i++) {
    const index = 2 ** i;  // Position of single 1 in binary representation
    state.setState(index, amplitude);
  }

  return state;
}

/**
 * Creates a single-qubit |+⟩ state (|0⟩ + |1⟩)/√2
 */
export function createPlusState(): StateVector {
  const state = new StateVector(2);
  const amplitude = math.complex(1/Math.sqrt(2), 0);
  state.setState(0, amplitude);
  state.setState(1, amplitude);
  return state;
}

/**
 * Creates a single-qubit |-⟩ state (|0⟩ - |1⟩)/√2
 */
export function createMinusState(): StateVector {
  const state = new StateVector(2);
  state.setState(0, math.complex(1/Math.sqrt(2), 0));
  state.setState(1, math.complex(-1/Math.sqrt(2), 0));
  return state;
}
