// Quantum library entry point
// This file will export all public APIs from the quantum package

// Export types from core
export * from './core/types';
export type { ISparseMatrix, ISparseEntry } from './operators/sparse';

// Export from states
export { StateVector } from './states/stateVector';
export * from './states/stateVector';
export * from './states/states';
export * from './states/composite';
export * from './states/densityMatrix';

// Export from operators
export * from './operators/operator';
export * from './operators/algebra';
export * from './operators/gates';
export * from './operators/measurement';
export * from './operators/hamiltonian';
export * from './operators/circuit';
export * from './operators/sparse';
export * from './operators/sparseOperator';

// Export utilities (excluding conflicting exports)
export type { 
    ComplexMatrix, 
    IMatrixDimensions, 
    IValidationResult
} from './utils/matrixOperations';
export { 
    multiplyMatrices,
    transpose,
    tensorProduct,
    eigenDecomposition,
    addMatrices,
    scaleMatrix,
    normalizeMatrix,
    isHermitian,
    isUnitary,
    orthogonalizeStateVectors
} from './utils/matrixOperations';
export * from './utils/matrixFunctions';
export * from './utils/information';
export * from './utils/oscillator';

// Export angular momentum module
export * from './angularMomentum';

// Export geometry module
export * from './geometry';
