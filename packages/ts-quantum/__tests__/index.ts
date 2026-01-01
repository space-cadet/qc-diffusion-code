/**
 * @fileoverview Test suite documentation for quantum module
 * @module Tests
 * 
 * This module documents the comprehensive test suite for the quantum module,
 * providing examples of proper usage and expected behavior for all components.
 */

// Import test modules to include in documentation
export * from './core';
export * from './angularMomentum';
export * from './geometry';
export * from './graph';
export * from './intertwiner';
export * from './qgraph';
export * from './utils';

// Re-export individual test files for documentation
import './composition.test';
import './densityMatrix.test';
import './gates.test';
import './hamiltonian.test';
import './hilbertSpace.test';
import './information.test';
import './matrixFunctions.test';
import './matrixOperations.test';
import './measurement.test';
import './operator.test';
import './operatorAlgebra.test';
import './oscillator.test';
import './stateVector.test';
import './states.test';
import './validation.test';

/**
 * Test coverage overview for the quantum module.
 * 
 * The test suite covers:
 * - State vector operations and normalization
 * - Quantum gate applications
 * - Density matrix calculations
 * - Angular momentum algebra
 * - Wigner symbol computations
 * - Matrix operations and functions
 * - Information theory measures
 * - Geometric quantum operations
 * - Graph-based quantum systems
 * - Intertwiner calculations
 */
export const testCoverage = {
  stateVectors: 'Complete coverage of StateVector class and operations',
  operators: 'All quantum gates and operator algebra functions',
  angularMomentum: 'Comprehensive testing of J operators and Wigner symbols',
  information: 'Entropy, fidelity, and information-theoretic measures',
  geometry: 'Quantum distance and geometric measures',
  qgraph: 'Graph-based quantum system operations',
  intertwiner: 'Loop quantum gravity intertwiner calculations'
};
