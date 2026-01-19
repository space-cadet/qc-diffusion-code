/**
 * Quantum state vector implementation
 */
import { toComplex } from '../core/types';
import * as math from 'mathjs';
import { validatePosDim, validateIdx, validateAmps } from '../utils/validation';
export class StateVector {
    constructor(dimension, amplitudes, basis, properties) {
        this.objectType = 'state'; // Discriminator property
        validatePosDim(dimension);
        this.dimension = dimension;
        this.amplitudes = amplitudes || Array(dimension).fill(null)
            .map(() => math.complex(0, 0));
        this.basis = basis;
        this.properties = properties;
        if (amplitudes) {
            validateAmps(amplitudes, dimension);
        }
    }
    /**
     * Sets amplitude at specified index
     */
    setState(index, value) {
        validateIdx(index, this.dimension);
        this.amplitudes[index] = value;
    }
    /**
     * Gets amplitude at specified index
     */
    getState(index) {
        validateIdx(index, this.dimension);
        return this.amplitudes[index];
    }
    /**
     * Calculates inner product ⟨ψ|φ⟩ with another state
     */
    innerProduct(other) {
        if (this.dimension !== other.dimension) {
            throw new Error('States must have same dimension for inner product');
        }
        let result = math.complex(0, 0);
        for (let i = 0; i < this.dimension; i++) {
            const conj = math.conj(toComplex(this.amplitudes[i]));
            const prod = math.multiply(conj, toComplex(other.amplitudes[i]));
            result = math.add(result, prod);
        }
        return result;
    }
    /**
     * Calculates norm of state vector
     */
    norm() {
        const innerProd = this.innerProduct(this);
        const abs = math.abs(innerProd);
        return Math.sqrt(abs);
    }
    /**
     * Returns normalized version of state vector
     */
    normalize() {
        const currentNorm = this.norm();
        if (currentNorm < 1e-10) {
            throw new Error('Cannot normalize zero state vector');
        }
        const normalizedAmplitudes = this.amplitudes.map(amp => math.divide(toComplex(amp), math.complex(currentNorm, 0)));
        return new StateVector(this.dimension, normalizedAmplitudes, this.basis, this.properties);
    }
    /**
     * Computes tensor product with another state vector
     */
    tensorProduct(other) {
        const newDimension = this.dimension * other.dimension;
        const newAmplitudes = [];
        for (let i = 0; i < this.dimension; i++) {
            for (let j = 0; j < other.dimension; j++) {
                newAmplitudes.push(math.multiply(this.amplitudes[i], other.amplitudes[j]));
            }
        }
        // Generate new basis label if both states have basis labels
        let newBasis;
        if (this.basis && other.basis) {
            newBasis = `${this.basis}⊗${other.basis}`;
        }
        return new StateVector(newDimension, newAmplitudes, newBasis, this.properties);
    }
    /**
     * Returns true if state is zero vector
     */
    isZero(tolerance = 1e-10) {
        return this.amplitudes.every(amp => math.abs(amp) < tolerance);
    }
    /**
     * Get a copy of the amplitudes array
     */
    getAmplitudes() {
        return [...this.amplitudes];
    }
    /**
     * Check if this state vector equals another within tolerance
     */
    equals(other, tolerance = 1e-10) {
        if (this.dimension !== other.dimension) {
            return false;
        }
        return this.amplitudes.every((amp, i) => {
            const diff = math.subtract(amp, other.getState(i));
            const absDiff = math.abs(diff);
            return absDiff < tolerance;
        });
    }
    /**
     * Scale the state vector by a complex number
     * @param factor Complex scaling factor
     * @returns New scaled state vector
     */
    scale(factor) {
        const scaledAmplitudes = this.amplitudes.map(amp => math.multiply(toComplex(amp), toComplex(factor)));
        return new StateVector(this.dimension, scaledAmplitudes, this.basis, this.properties ? { ...this.properties } : undefined);
    }
    /**
     * Add another state vector to this one
     * @param other The state vector to add
     * @returns New state vector representing the sum
     */
    add(other) {
        if (this.dimension !== other.dimension) {
            throw new Error(`Cannot add state vectors with different dimensions: ${this.dimension} vs ${other.dimension}`);
        }
        const sumAmplitudes = this.amplitudes.map((amp, i) => math.add(toComplex(amp), toComplex(other.getState(i))));
        // Generate new basis label if appropriate
        let newBasis;
        if (this.basis && other.basis) {
            newBasis = `(${this.basis}) + (${other.basis})`;
        }
        return new StateVector(this.dimension, sumAmplitudes, newBasis, this.properties ? { ...this.properties } : undefined);
    }
    /**
     * Returns array representation of state vector
     */
    toArray() {
        return [...this.amplitudes];
    }
    /**
     * Returns string representation of state vector
     */
    toString() {
        const components = this.amplitudes
            .map((amp, i) => {
            if (math.abs(amp) < 1e-10) {
                return '';
            }
            const sign = i === 0 ? '' : ' + ';
            return `${sign}${amp.toString()}|${i}⟩`;
        })
            .filter(s => s !== '')
            .join('');
        return components || '0';
    }
    /**
     * Returns string representation in computational basis |n⟩
     */
    toComputationalString() {
        const components = this.amplitudes
            .map((amp, i) => {
            if (math.abs(amp) < 1e-10) {
                return '';
            }
            const sign = i === 0 ? '' : ' + ';
            return `${sign}${amp.toString()}|${i}⟩`;
        })
            .filter(s => s !== '')
            .join('');
        return components || '0';
    }
    /**
     * Returns string representation in angular momentum basis |j,m⟩
     * @param j Total angular momentum quantum number
     */
    toAngularString(j) {
        const dim = Math.floor(2 * j + 1);
        if (this.dimension !== dim) {
            throw new Error(`State dimension ${this.dimension} does not match 2j+1 = ${dim}`);
        }
        const components = this.amplitudes
            .map((amp, n) => {
            if (math.abs(amp) < 1e-10) {
                return '';
            }
            const m = -j + n; // Convert index to m value
            const sign = n === 0 ? '' : ' + ';
            return `${sign}${amp.toString()}|${j},${m}⟩`;
        })
            .filter(s => s !== '')
            .join('');
        return components || '0';
    }
    /**
     * Creates a computational basis state |i⟩
     */
    static computationalBasis(dimension, index) {
        validatePosDim(dimension);
        validateIdx(index, dimension);
        const amplitudes = Array(dimension).fill(null)
            .map((_, i) => i === index ? math.complex(1, 0) : math.complex(0, 0));
        return new StateVector(dimension, amplitudes, `|${index}⟩`);
    }
    /**
     * Returns array of all computational basis states
     */
    static computationalBasisStates(dimension) {
        validatePosDim(dimension);
        return Array(dimension).fill(null)
            .map((_, i) => StateVector.computationalBasis(dimension, i));
    }
    /**
     * Creates normalized superposition of basis states with given coefficients
     */
    static superposition(coefficients) {
        const dimension = coefficients.length;
        validatePosDim(dimension);
        return new StateVector(dimension, coefficients, 'superposition').normalize();
    }
    /**
     * Creates an equally weighted superposition of all basis states
     */
    static equalSuperposition(dimension) {
        validatePosDim(dimension);
        const coefficient = math.complex(1 / Math.sqrt(dimension), 0);
        const coefficients = Array(dimension).fill(coefficient);
        return new StateVector(dimension, coefficients, '|+⟩');
    }
    /**
    * Sets angular momentum metadata for this state
    */
    setAngularMomentumMetadata(metadata) {
        if (!this.properties) {
            this.properties = {};
        }
        this.properties.angularMomentumMetadata = metadata;
    }
    /**
     * Gets angular momentum metadata if present
     */
    getAngularMomentumMetadata() {
        return this.properties?.angularMomentumMetadata || null;
    }
    /**
     * Checks if this state has angular momentum structure
     */
    hasAngularMomentumStructure() {
        const metadata = this.getAngularMomentumMetadata();
        return metadata?.type === 'angular_momentum';
    }
}
