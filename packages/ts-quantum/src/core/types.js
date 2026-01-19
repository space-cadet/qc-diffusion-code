/**
 * Core type definitions for quantum operations
 */
import * as math from 'mathjs';
/**
 * Helper functions for complex number handling
 */
export function toComplex(value) {
    if (typeof value === 'number') {
        return math.complex(value, 0);
    }
    if ('re' in value && 'im' in value) {
        return math.complex(value.re, value.im);
    }
    return value;
}
export function ensureComplex(value) {
    return toComplex(value);
}
/**
 * Type guards for runtime discrimination
 */
export function isState(obj) {
    return obj.objectType === 'state';
}
export function isOperator(obj) {
    return obj.objectType === 'operator';
}
export function isDensityMatrix(obj) {
    return 'purity' in obj && 'vonNeumannEntropy' in obj;
}
/**
 * Utility functions for unified operations
 */
export function adjoint(obj) {
    if (isState(obj)) {
        // For states, adjoint creates a bra (conceptually - return conjugate transpose as operator)
        throw new Error('Adjoint of state vector not implemented - use innerProduct instead');
    }
    return obj.adjoint();
}
export function norm(obj) {
    return obj.norm();
}
export function getObjectType(obj) {
    return obj.objectType;
}
