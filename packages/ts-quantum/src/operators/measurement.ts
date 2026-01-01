/**
 * Measurement operations for quantum states
 */

import { Complex, IOperator, IStateVector, IMeasurementOutcome } from '../core/types';
import { MatrixOperator } from './operator';
import { StateVector } from '../states/stateVector';
import * as math from 'mathjs';

/**
 * Implementation of a projection operator for quantum measurements
 */
export class ProjectionOperator implements IOperator {
    private _operator: MatrixOperator;
    private _dimension: number;

    constructor(state: StateVector) {
        this._dimension = state.dimension;
        
        // Create projection matrix |ψ⟩⟨ψ| with proper complex number initialization
        const matrix: Complex[][] = Array(state.dimension).fill(null)
            .map(() => Array(state.dimension).fill(null).map(() => math.complex(0, 0)));
        
        for (let i = 0; i < state.dimension; i++) {
            for (let j = 0; j < state.dimension; j++) {
                // |ψ⟩⟨ψ| = ψi * ψj*
                matrix[i][j] = math.multiply(
                    math.complex(state.amplitudes[i].re, state.amplitudes[i].im),
                    math.conj(state.amplitudes[j])
                ) as Complex;
            }
        }
        
        // Create operator without validation since we know it's a valid projection
        this._operator = new MatrixOperator(matrix, 'projection', false);
    }

    get objectType(): 'operator' {
        return 'operator';
    }

    get dimension(): number {
        return this._dimension;
    }

    get type(): 'projection' {
        return 'projection';
    }

    /**
     * Tests whether the density matrix is identically zero
     */
    isZero(tolerance?: number): boolean {
        return this._operator.isZero(tolerance);
    }

    norm(): number {
        return this._operator.norm();
    }

    apply(state: StateVector): StateVector {
        return this._operator.apply(state);
    }

    compose(other: IOperator): IOperator {
        return this._operator.compose(other);
    }

    adjoint(): IOperator {
        // Create new MatrixOperator since projection operators are Hermitian
        return new MatrixOperator(this.toMatrix(), 'projection');
    }

    toMatrix(): Complex[][] {
        return this._operator.toMatrix();
    }

    tensorProduct(other: IOperator): IOperator {
        return this._operator.tensorProduct(other);
    }

    partialTrace(dims: number[], traceOutIndices: number[]): IOperator {
        return this._operator.partialTrace(dims, traceOutIndices);
    }

    scale(scalar: Complex): IOperator {
        return this._operator.scale(scalar);
    }

    add(other: IOperator): IOperator {
        return this._operator.add(other);
    }

    eigenDecompose(): { values: Complex[]; vectors: IOperator[] } {
        return this._operator.eigenDecompose();
    }
}

/**
 * Calculate expectation value of an operator for a given state
 */
export function expectationValue(state: StateVector, operator: IOperator): Complex {
    const resultState = operator.apply(state);
    let result = math.complex(0, 0);

    for (let i = 0; i < state.dimension; i++) {
        // ⟨ψ|A|ψ⟩ = Σ ψi* (A|ψ⟩)i
        result = math.add(
            result,
            math.multiply(
                math.conj(state.amplitudes[i]),
                resultState.amplitudes[i]
            )
        ) as Complex;
    }

    return result;
}

/**
 * Perform a measurement on a quantum state with a given observable
 */
export function measureState(state: StateVector, operator: IOperator): IMeasurementOutcome {
    // For a projective measurement, the eigenvalue is 1 for the measured state
    const eigenvalue = 1;
    
    // Apply measurement operator
    const resultState = operator.apply(state);
    
    // Calculate probability from norm squared of resulting state
    const probability = resultState.amplitudes.reduce((sum, amp) => 
        sum + (math.abs(amp) as unknown as number) ** 2, 0
    );
    
    // Normalize the post-measurement state
    const normalizedAmplitudes = resultState.amplitudes.map(amp => 
        math.divide(amp, math.sqrt(probability)) as Complex
    );
    
    // Create new StateVector instance
    return {
        value: eigenvalue,
        probability,
        state: new StateVector(state.dimension, normalizedAmplitudes, state.basis)
    };
}

/**
 * Create a measurement operator for a given observable and eigenvalue
 */
export function createMeasurementOperator(
    observable: IOperator, 
    eigenvalue: number
): IOperator {
    // This would involve eigendecomposition of the observable
    // For now, we'll just implement projection measurements
    throw new Error('General measurement operators not yet implemented');
}
