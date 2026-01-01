/**
 * Quantum state geometry - distances and metrics on quantum state manifolds
 * Based on Provost & Vallee (1980) "Riemannian structure on manifolds of quantum states"
 */

import { StateVector } from '../states/stateVector';
import { IStateVector, Complex } from '../core/types';
import * as math from 'mathjs';

/**
 * Calculates the quantum distance between two normalized state vectors
 * Formula: D²(ψ₁,ψ₂) = 2 - 2|⟨ψ₁|ψ₂⟩| (Provost-Vallee Eq. 2.14)
 * 
 * This distance is gauge-invariant and represents the geometric distance
 * on the projective Hilbert space of quantum states.
 * 
 * @param state1 First quantum state (should be normalized)
 * @param state2 Second quantum state (should be normalized)
 * @returns Quantum distance between the states
 */
export function quantumDistance(state1: IStateVector, state2: IStateVector): number {
  if (state1.dimension !== state2.dimension) {
    throw new Error(`States must have same dimension: ${state1.dimension} vs ${state2.dimension}`);
  }

  // Calculate inner product ⟨ψ₁|ψ₂⟩
  const innerProduct = state1.innerProduct(state2);
  
  // Calculate |⟨ψ₁|ψ₂⟩|
  const overlapMagnitude = math.abs(innerProduct) as unknown as number;
  
  // D²(ψ₁,ψ₂) = 2 - 2|⟨ψ₁|ψ₂⟩|
  const distanceSquared = 2 - 2 * overlapMagnitude;
  
  // Return distance (not distance squared)
  return Math.sqrt(Math.max(0, distanceSquared)); // max ensures non-negative for numerical precision
}

/**
 * Calculates quantum distance for states that may not be normalized
 * Automatically normalizes before computing distance
 * 
 * @param state1 First quantum state
 * @param state2 Second quantum state  
 * @returns Quantum distance between normalized states
 */
export function quantumDistanceUnnormalized(state1: IStateVector, state2: IStateVector): number {
  const norm1 = state1.norm();
  const norm2 = state2.norm();
  
  if (norm1 < 1e-10 || norm2 < 1e-10) {
    throw new Error('Cannot compute distance for zero states');
  }
  
  const normalized1 = state1.normalize();
  const normalized2 = state2.normalize();
  
  return quantumDistance(normalized1, normalized2);
}

/**
 * Calculates the quantum fidelity between two states
 * Fidelity F = |⟨ψ₁|ψ₂⟩|²
 * Related to distance by: D² = 2(1 - √F)
 * 
 * @param state1 First quantum state (should be normalized)
 * @param state2 Second quantum state (should be normalized) 
 * @returns Fidelity between states (0 to 1)
 */
export function quantumFidelity(state1: IStateVector, state2: IStateVector): number {
  if (state1.dimension !== state2.dimension) {
    throw new Error(`States must have same dimension: ${state1.dimension} vs ${state2.dimension}`);
  }

  const innerProduct = state1.innerProduct(state2);
  const overlapMagnitude = math.abs(innerProduct) as unknown as number;
  
  return overlapMagnitude * overlapMagnitude;
}

/**
 * Creates a simple two-level quantum system for testing
 * |0⟩ and |1⟩ basis states
 */
export class TwoLevelSystem {
  /**
   * Ground state |0⟩
   */
  static ground(): StateVector {
    return StateVector.computationalBasis(2, 0);
  }
  
  /**
   * Excited state |1⟩
   */
  static excited(): StateVector {
    return StateVector.computationalBasis(2, 1);
  }
  
  /**
   * Plus state |+⟩ = (|0⟩ + |1⟩)/√2
   */
  static plus(): StateVector {
    const coeffs = [math.complex(1/Math.sqrt(2), 0), math.complex(1/Math.sqrt(2), 0)];
    return new StateVector(2, coeffs, '|+⟩');
  }
  
  /**
   * Minus state |-⟩ = (|0⟩ - |1⟩)/√2
   */
  static minus(): StateVector {
    const coeffs = [math.complex(1/Math.sqrt(2), 0), math.complex(-1/Math.sqrt(2), 0)];
    return new StateVector(2, coeffs, '|-⟩');
  }
  
  /**
   * General qubit state cos(θ/2)|0⟩ + e^(iφ)sin(θ/2)|1⟩
   * @param theta Polar angle (0 to π)
   * @param phi Azimuthal angle (0 to 2π)
   */
  static blochState(theta: number, phi: number): StateVector {
    const cosHalfTheta = Math.cos(theta / 2);
    const sinHalfTheta = Math.sin(theta / 2);
    const eiPhi = math.complex(Math.cos(phi), Math.sin(phi));
    
    const coeffs = [
      math.complex(cosHalfTheta, 0),
      math.multiply(eiPhi, sinHalfTheta) as Complex
    ];
    
    return new StateVector(2, coeffs, `|θ=${theta.toFixed(2)},φ=${phi.toFixed(2)}⟩`);
  }
}

/**
 * Bloch sphere geometry utilities
 */
export class BlochSphere {
  /**
   * Calculates the quantum distance on the Bloch sphere
   * This matches the Provost-Vallee quantum distance for qubit states
   * 
   * The relationship is: D_quantum = √2 * sin(θ_bloch/2)
   * where θ_bloch is the angle between Bloch vectors
   * 
   * @param theta1 Polar angle of first state
   * @param phi1 Azimuthal angle of first state
   * @param theta2 Polar angle of second state
   * @param phi2 Azimuthal angle of second state
   * @returns Quantum distance between states
   */
  static geodesicDistance(theta1: number, phi1: number, theta2: number, phi2: number): number {
    // Convert to Bloch vectors (Cartesian coordinates on unit sphere)
    const x1 = Math.sin(theta1) * Math.cos(phi1);
    const y1 = Math.sin(theta1) * Math.sin(phi1);
    const z1 = Math.cos(theta1);
    
    const x2 = Math.sin(theta2) * Math.cos(phi2);
    const y2 = Math.sin(theta2) * Math.sin(phi2);
    const z2 = Math.cos(theta2);
    
    // Dot product of Bloch vectors
    const dotProduct = x1*x2 + y1*y2 + z1*z2;
    
    // Angle between Bloch vectors
    const clampedDot = Math.max(-1, Math.min(1, dotProduct));
    const blochAngle = Math.acos(clampedDot);
    
    // Convert to quantum distance: D = √2 * sin(θ_bloch/2)
    return Math.sqrt(2) * Math.sin(blochAngle / 2);
  }
  
  /**
   * Verifies that quantum distance matches Bloch sphere calculation
   * @param theta1 Polar angle of first state
   * @param phi1 Azimuthal angle of first state  
   * @param theta2 Polar angle of second state
   * @param phi2 Azimuthal angle of second state
   * @param tolerance Numerical tolerance for comparison
   * @returns True if distances match within tolerance
   */
  static verifyQuantumDistance(
    theta1: number, phi1: number, 
    theta2: number, phi2: number, 
    tolerance: number = 1e-10
  ): boolean {
    const state1 = TwoLevelSystem.blochState(theta1, phi1);
    const state2 = TwoLevelSystem.blochState(theta2, phi2);

    console.log("State1: ", state1);
    console.log("State2: ", state2);
    
    const quantumDist = quantumDistance(state1, state2);
    const blochDist = this.geodesicDistance(theta1, phi1, theta2, phi2);

    console.log("Quantum Distance: ", quantumDist);
    console.log("Bloch Distance: ", blochDist);
    
    return Math.abs(quantumDist - blochDist) < tolerance;
  }
}
