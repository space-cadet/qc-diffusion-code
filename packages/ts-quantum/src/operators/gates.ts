/**
 * Core quantum gates implementation
 */

import { MatrixOperator } from './operator';
import * as math from 'mathjs';

// Pauli X (bit flip) gate
export const PauliX = new MatrixOperator([
    [math.complex(0,  0), math.complex(1,  0)],
    [math.complex(1,  0), math.complex(0,  0)]
], 'unitary');

// Pauli Y gate
export const PauliY = new MatrixOperator([
    [math.complex(0,  0), math.complex(0,  -1)],
    [math.complex(0,  1), math.complex(0,  0)]
], 'unitary');

// Pauli Z (phase flip) gate
export const PauliZ = new MatrixOperator([
    [math.complex(1,  0), math.complex(0,  0)],
    [math.complex(0,  0), math.complex(-1,  0)]
], 'unitary');

// Hadamard gate
export const Hadamard = new MatrixOperator([
    [math.complex(1/Math.sqrt(2),  0), math.complex(1/Math.sqrt(2),  0)],
    [math.complex(1/Math.sqrt(2),  0), math.complex(-1/Math.sqrt(2),  0)]
], 'unitary');

// CNOT (Controlled-NOT) gate for 2-qubit system
export const CNOT = new MatrixOperator([
    [math.complex(1,  0), math.complex(0,  0), math.complex(0,  0), math.complex(0,  0)],
    [math.complex(0,  0), math.complex(1,  0), math.complex(0,  0), math.complex(0,  0)],
    [math.complex(0,  0), math.complex(0,  0), math.complex(0,  0), math.complex(1,  0)],
    [math.complex(0,  0), math.complex(0,  0), math.complex(1,  0), math.complex(0,  0)]
], 'unitary');