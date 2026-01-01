import { HilbertSpace } from '../../src/core/hilbertSpace';
import { createPlusState, createBasisState } from '../../src/states/states';
import { ProjectionOperator } from '../../src/operators/measurement';
import { measureState } from '../../src/operators/measurement';
import { Complex, IMeasurementOutcome, IOperator } from '../../src/core/types';

// Demonstrates quantum measurement operations
function demoMeasurement() {
    // Create a qubit in superposition
    const qubitSpace = new HilbertSpace(2, ['|0⟩', '|1⟩']);
    const plusState = createPlusState();
    
    console.log('Initial state |+⟩:', plusState.amplitudes);
    
    // Create measurement operators
    const basis0 = createBasisState(2, 0);
    const basis1 = createBasisState(2, 1);
    
    const projector0 = new ProjectionOperator(basis0);
    const projector1 = new ProjectionOperator(basis1);
    
    // Perform measurement projections
    const outcome0 = projector0.apply(plusState);
    const outcome1 = projector1.apply(plusState);
    
    console.log('\nProjection onto |0⟩:', outcome0.amplitudes);
    console.log('\nProjection onto |1⟩:', outcome1.amplitudes);
    
    // Demonstrate complete measurement
    const result: IMeasurementOutcome = measureState(plusState, projector0);
    console.log('\nMeasurement result:', {
        value: result.value,
        probability: result.probability,
        state: result.state.amplitudes
    });
}

// Run the demonstration
console.log('=== Quantum Measurement Demo ===\n');
demoMeasurement();