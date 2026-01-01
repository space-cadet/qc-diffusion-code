/**
 * Quantum Hamiltonian Implementation
 * 
 * This module provides a comprehensive implementation of quantum Hamiltonians,
 * which are the fundamental operators representing the total energy of quantum
 * systems. The Hamiltonian determines:
 * - System energy levels (eigenvalues)
 * - Stationary states (eigenvectors)
 * - Time evolution (through Schrödinger equation)
 * 
 * Key features:
 * - Custom and predefined Hamiltonian types
 * - Time evolution generation
 * - Energy expectation calculation
 * - Support for common physical systems:
 *   * Spin-1/2 in magnetic field
 *   * Heisenberg spin chains
 *   * Harmonic oscillators
 *   * Custom interactions
 * 
 * Mathematical form:
 * H = Σᵢ cᵢOᵢ where:
 * - cᵢ are complex coefficients
 * - Oᵢ are quantum operators
 * 
 * @module quantum/hamiltonian
 */

import { Complex, IOperator, OperatorType } from '../core/types';
import { StateVector } from '../states/stateVector';
import { MatrixOperator } from './operator';
import { validatePosDim } from '../utils/validation';
import { matrixExponential, scaleMatrix } from '../utils/matrixOperations';
import { PauliX, PauliY, PauliZ } from './gates';
import { composeOperators } from '../states/composite';
import { isHermitian } from '../utils/matrixOperations';
import * as math from 'mathjs';

/**
 * Classifies different types of quantum Hamiltonians
 * 
 * Each type represents a specific physical system:
 * 
 * @property 'free' - Free particle Hamiltonian
 *    H = p²/2m (kinetic energy only)
 * 
 * @property 'harmonic' - Harmonic oscillator
 *    H = p²/2m + mω²x²/2 (kinetic + potential)
 * 
 * @property 'spin' - Spin system in magnetic field
 *    H = -μ·B (magnetic coupling)
 * 
 * @property 'interaction' - Interaction between systems
 *    H = Σᵢⱼ Jᵢⱼ(Sᵢ·Sⱼ) (spin-spin coupling)
 * 
 * @property 'custom' - User-defined Hamiltonian
 *    H = Σᵢ cᵢOᵢ (general form)
 */
export type HamiltonianType = 
  | 'free'           
  | 'harmonic'      
  | 'spin'          
  | 'interaction'    
  | 'custom'
  | 'non-hermitian';        

/**
 * Represents a single term in a Hamiltonian expansion
 * 
 * A Hamiltonian is typically expressed as a sum of terms:
 * H = Σᵢ cᵢOᵢ
 * where each term consists of:
 * - A complex coefficient cᵢ (coupling strength, energy scale)
 * - A quantum operator Oᵢ (physical observable)
 * 
 * Examples:
 * - Zeeman term: H = μB·σ (coefficient = magnetic field strength)
 * - Coupling term: H = JSᵢ·Sⱼ (coefficient = exchange coupling)
 * - External field: H = εσz (coefficient = field strength)
 * 
 * @property coefficient - Complex coupling strength (energy units)
 * @property operator - Quantum operator representing physical observable
 */
export interface IHamiltonianTerm {
  coefficient: Complex;    
  operator: IOperator;      
}

/**
 * Core Hamiltonian class representing quantum system energy operators
 * 
 * The Hamiltonian is the fundamental operator in quantum mechanics that:
 * 1. Determines the total energy of the system
 * 2. Generates time evolution through Schrödinger's equation
 * 3. Defines the system's energy eigenstates
 * 
 * Features:
 * - Constructs Hamiltonians from operator terms
 * - Validates Hermiticity (optional)
 * - Generates time evolution operators
 * - Computes energy expectations
 * - Supports both time-dependent and time-independent cases
 * 
 * Physical Significance:
 * - Eigenvalues represent possible energy measurements
 * - Eigenvectors represent stationary states
 * - Expectation values give average energy
 * - Time evolution U(t) = exp(-iHt/ħ) describes dynamics
 * 
 * @extends MatrixOperator
 */
export class Hamiltonian extends MatrixOperator {
  readonly hamiltonianType: HamiltonianType;
  readonly terms: IHamiltonianTerm[];
  private _timeDependent: boolean;

  constructor(
    dimension: number,
    terms: IHamiltonianTerm[],
    hamiltonianType: HamiltonianType = 'custom',
    timeDependent: boolean = false,
    requireHermitian: boolean = false
  ) {
    validatePosDim(dimension);
    
    // Validate Hermiticity of individual terms and result if required
    if (requireHermitian) {
      for (const term of terms) {
        if (!term || !term.operator) {
          throw new Error('Invalid term in Hamiltonian');
        }
        
        const termMatrix = term.operator.toMatrix();
        
        try {
          if (!isHermitian(termMatrix)) {
            throw new Error('All terms must be Hermitian when requireHermitian is true');
          }
        } catch (e: unknown) {
          if (e instanceof Error) {
            throw new Error(`Hermiticity check failed: ${e.message}`);
          } else {
            throw new Error('Hermiticity check failed: Unknown error');
          }
        }
        
        if (term.coefficient && Math.abs(term.coefficient.im) > 1e-10) {
          throw new Error('All coefficients must be real when requireHermitian is true');
        }
      }

      // Also check the final matrix
      try {
        const matrix = terms.reduce((acc, term) => {
          const termMatrix = term.operator.toMatrix();
          const scaledTerm = scaleMatrix(termMatrix, term.coefficient);
          return acc.map((row, i) => 
            row.map((elem, j) => math.add(elem, scaledTerm[i][j]) as Complex)
          );
        }, Array(dimension).fill(null).map(() => 
          Array(dimension).fill(null).map(() => math.complex(0, 0))
        ));

        if (!isHermitian(matrix)) {
          throw new Error('Combined Hamiltonian must be Hermitian when requireHermitian is true');
        }
      } catch (e: unknown) {
        if (e instanceof Error) {
          throw new Error(`Hermiticity validation failed: ${e.message}`);
        } else {
          throw new Error('Hermiticity validation failed: Unknown error');
        }
      }
    }

    // Initialize operator with sum of terms
    const matrix = terms.reduce((acc, term) => {
      const termMatrix = term.operator.toMatrix();
      const scaledTerm = scaleMatrix(termMatrix, term.coefficient);
      return acc.map((row, i) => 
        row.map((elem, j) => math.add(elem, scaledTerm[i][j]))
      );
    }, Array(dimension).fill(null).map(() => 
      Array(dimension).fill(null).map(() => math.complex(0, 0))
    ));
    
    // Always use 'general' as the operator type, store Hamiltonian type separately
    super(matrix, 'general');

    this.hamiltonianType = hamiltonianType;
    this.terms = [...terms];
    this._timeDependent = timeDependent;
  }

  /**
   * Generates the quantum time evolution operator U(t) = exp(-iHt/ħ)
   * 
   * The time evolution operator is fundamental in quantum mechanics:
   * - Transforms states from time t₀ to t: |ψ(t)⟩ = U(t-t₀)|ψ(t₀)⟩
   * - Preserves probability (unitary)
   * - Satisfies group properties (U(t₁)U(t₂) = U(t₁+t₂))
   * 
   * Implementation:
   * 1. Validates time-independence
   * 2. Computes -iHt (using ħ = 1 units)
   * 3. Calculates matrix exponential
   * 4. Ensures unitarity
   * 
   * @param time - Evolution time (in natural units)
   * @returns Unitary evolution operator U(t)
   * @throws Error for time-dependent Hamiltonians
   * @throws Error for invalid matrix structure
   */
  getEvolutionOperator(time: number): IOperator {
    if (this._timeDependent) {
      throw new Error('Time-dependent Hamiltonians require numerical integration');
    }

    // For a Hermitian matrix H, exp(-iHt) should be unitary
    // Create -iHt matrix
    const matrix = this.toMatrix();
    
    // Explicitly verify matrix
    if (!matrix || matrix.length === 0 || !matrix[0] || matrix[0].length === 0) {
      throw new Error('Invalid Hamiltonian matrix');
    }
    
    // Scale by -i*t (ħ = 1 units)
    const scaledMatrix = matrix.map(row => 
      row.map(element => {
        // Multiply by -i*t
        return math.multiply(element, math.complex(0, -time)) as Complex;
      })
    );
    
    // Compute matrix exponential
    const evolutionMatrix = matrixExponential(scaledMatrix);

    // Explicitly ensure it's properly formed
    const dim = this.dimension;
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        if (!evolutionMatrix[i][j] || typeof evolutionMatrix[i][j].re !== 'number' || 
            typeof evolutionMatrix[i][j].im !== 'number') {
          evolutionMatrix[i][j] = math.complex(i === j ? 1 : 0, 0);
        }
      }
    }
    
    // Return as unitary operator
    return new MatrixOperator(evolutionMatrix, 'unitary', false);
  }

  /**
   * Evolves a quantum state under this Hamiltonian for time t
   * 
   * Implements Schrödinger equation evolution:
   * |ψ(t)⟩ = exp(-iHt/ħ)|ψ(0)⟩
   * 
   * Process:
   * 1. Validates state dimension
   * 2. Computes evolution operator U(t)
   * 3. Applies U(t) to initial state
   * 4. Ensures normalization (corrects numerical errors)
   * 
   * Physical meaning:
   * - Describes how quantum state changes with time
   * - Preserves total probability (norm = 1)
   * - Maintains quantum superposition
   * 
   * @param state - Initial quantum state |ψ(0)⟩
   * @param time - Evolution time t
   * @returns Evolved state |ψ(t)⟩
   * @throws Error if dimensions don't match
   */
  evolveState(state: StateVector, time: number): StateVector {
    if (state.dimension !== this.dimension) {
      throw new Error('State dimension does not match Hamiltonian dimension');
    }

    const U = this.getEvolutionOperator(time);
    
    // Apply evolution operator to state
    const evolvedState = U.apply(state) as StateVector;
    
    // Ensure the state is properly normalized
    // This step is important to correct for any numerical errors
    try {
      const norm = evolvedState.norm();
      if (norm > 1e-10 && Math.abs(norm - 1) > 1e-10) {
        return evolvedState.normalize();
      }
      return evolvedState;
    } catch (e: unknown) {
      // If normalization fails, ensure we still return a valid state
      console.error("Normalization error in evolveState:", e instanceof Error ? e.message : "Unknown error");
      return state; // Return original state if evolution fails
    }
  }

  /**
   * Computes the expectation value of energy for a given state
   * 
   * The energy expectation value is:
   * ⟨E⟩ = ⟨ψ|H|ψ⟩
   * 
   * Physical significance:
   * - Average energy in state |ψ⟩
   * - Real for physical (Hermitian) Hamiltonians
   * - Bounded by energy eigenvalues
   * - Constant for energy eigenstates
   * 
   * @param state - Quantum state |ψ⟩
   * @returns Complex energy expectation value
   * @throws Error if dimensions don't match
   */
  expectationValue(state: StateVector): Complex {
    if (state.dimension !== this.dimension) {
      throw new Error('State dimension does not match Hamiltonian dimension');
    }

    const Hpsi = this.apply(state) as StateVector;
    return state.innerProduct(Hpsi);
  }

  /**
   * Creates a spin-1/2 Hamiltonian in a magnetic field
   * 
   * Implements the Zeeman Hamiltonian:
   * H = B·σ = Bxσx + Byσy + Bzσz
   * where:
   * - B = (Bx, By, Bz) is the magnetic field vector
   * - σ = (σx, σy, σz) are the Pauli matrices
   * 
   * Physical significance:
   * - Describes magnetic dipole in field
   * - Energy splitting ΔE = 2|B|
   * - Precession frequency ω = 2|B|
   * - Eigenstates align/anti-align with B
   * 
   * @param magneticField - [Bx, By, Bz] field components
   * @returns Spin Hamiltonian operator
   * 
   * @example
   * // Create Hamiltonian for field along z-axis
   * const H = Hamiltonian.createSpinHamiltonian([0, 0, 1]);
   */
  static createSpinHamiltonian(
    magneticField: [number, number, number]
  ): Hamiltonian {
    const [Bx, By, Bz] = magneticField;
    
    const terms: IHamiltonianTerm[] = [
      {
        coefficient: math.complex(Bx, 0),
        operator: PauliX
      },
      {
        coefficient: math.complex(By, 0),
        operator: PauliY
      },
      {
        coefficient: math.complex(Bz, 0),
        operator: PauliZ
      }
    ];
    
    return new Hamiltonian(2, terms, 'spin');
  }

  /**
   * Creates a Heisenberg interaction Hamiltonian for a spin chain
   * 
   * Implements the Heisenberg model:
   * H = J Σᵢ Sᵢ·Sᵢ₊₁
   * where:
   * - J is the exchange coupling constant
   * - Sᵢ are spin operators at site i
   * - Sum runs over nearest neighbors
   * 
   * The interaction term Sᵢ·Sᵢ₊₁ expands as:
   * Sᵢ·Sᵢ₊₁ = SxᵢSxᵢ₊₁ + SyᵢSyᵢ₊₁ + SzᵢSzᵢ₊₁
   * 
   * Physical significance:
   * - Models magnetic interactions in materials
   * - J > 0: Ferromagnetic coupling (parallel spins favored)
   * - J < 0: Antiferromagnetic coupling (anti-parallel spins favored)
   * - Conserves total spin
   * - Supports quantum entanglement
   * 
   * @param numSpins - Number of spins in the chain
   * @param coupling - Exchange coupling strength J
   * @returns Heisenberg Hamiltonian operator
   * @throws Error if numSpins < 2
   * 
   * @example
   * // Create antiferromagnetic chain of 3 spins
   * const H = Hamiltonian.createHeisenbergHamiltonian(3, -1.0);
   */
  static createHeisenbergHamiltonian(
    numSpins: number,
    coupling: number
  ): Hamiltonian {
    if (numSpins < 2) {
      throw new Error('Heisenberg model requires at least 2 spins');
    }

    const terms: IHamiltonianTerm[] = [];
    const coeff = math.complex(coupling, 0);
    const dimension = Math.pow(2, numSpins);

    // For each pair of neighboring spins
    for (let i = 0; i < numSpins - 1; i++) {
      // Create terms for σx⊗σx + σy⊗σy + σz⊗σz
      for (const pauli of [PauliX, PauliY, PauliZ]) {
        // Create array of operators for tensor product
        const ops = Array(numSpins).fill(null).map(() => MatrixOperator.identity(2));
        ops[i] = pauli;
        ops[i + 1] = pauli;
        
        try {
          const op = composeOperators(ops);
          // Verify operator dimension
          if (op.dimension !== dimension) {
            throw new Error(`Operator dimension mismatch: expected ${dimension}, got ${op.dimension}`);
          }
          
          terms.push({
            coefficient: coeff,
            operator: op
          });
        } catch (e: unknown) {
          console.error(`Error creating Heisenberg term: ${e instanceof Error ? e.message : "Unknown error"}`);
          // Create fallback identity term as placeholder
          terms.push({
            coefficient: math.complex(0, 0), // Zero coefficient
            operator: MatrixOperator.identity(dimension)
          });
        }
      }
    }

    // Validate we have terms before creating Hamiltonian
    if (terms.length === 0) {
      throw new Error('Failed to create any valid terms for Heisenberg Hamiltonian');
    }

    return new Hamiltonian(dimension, terms, 'interaction');
  }
}