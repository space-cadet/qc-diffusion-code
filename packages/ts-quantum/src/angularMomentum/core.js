/**
 * Angular momentum operators implementation
 * Implements J₊, J₋, Jz, and J² operators for arbitrary angular momentum j
 */
import { MatrixOperator } from '../operators/operator';
import { expectationValue } from '../operators/measurement';
import { StateVector } from '../states/stateVector';
import { matrixExponential } from '../utils/matrixOperations';
import * as math from 'mathjs';
/**
 * Creates an angular momentum state |j,m⟩
 *
 * @param j Total angular momentum quantum number
 * @param m Magnetic quantum number
 * @returns The state |j,m⟩ as a StateVector
 */
export function createJmState(j, m) {
    validateJ(j);
    if (!isValidM(j, m)) {
        throw new Error(`Invalid m=${m} for j=${j}`);
    }
    const dim = Math.floor(2 * j + 1);
    const amplitudes = Array(dim).fill(null).map(() => math.complex(0, 0));
    const idx = dim - 1 - (j + m);
    amplitudes[idx] = math.complex(1, 0);
    const state = new StateVector(dim, amplitudes, `|${j},${m}⟩`);
    // Add angular momentum metadata
    const metadata = {
        type: 'angular_momentum',
        j: j,
        mRange: [-j, j],
        couplingHistory: [{
                operation: 'single',
                j1: j,
                j2: 0,
                resultJ: [j],
                timestamp: Date.now()
            }],
        jComponents: new Map([[j, {
                    j: j,
                    startIndex: 0,
                    dimension: dim,
                    normalizationFactor: 1
                }]]),
        isComposite: false
    };
    state.setAngularMomentumMetadata(metadata);
    return state;
}
/**
 * Converts a state vector from computational basis to angular momentum basis
 * For j=1/2: |0⟩ -> |1/2,-1/2⟩, |1⟩ -> |1/2,1/2⟩
 *
 * @param state State vector in computational basis
 * @param j Total angular momentum quantum number
 * @returns State vector in angular momentum basis
 */
export function computationalToAngularBasis(state, j) {
    validateJ(j);
    const dim = Math.floor(2 * j + 1);
    // Check input dimension matches 2j+1
    if (state.dimension !== dim) {
        throw new Error(`State dimension ${state.dimension} does not match 2j+1 = ${dim}`);
    }
    // Create new array for amplitudes in angular momentum basis
    const newAmplitudes = Array(dim).fill(null).map(() => math.complex(0, 0));
    // Map each computational basis state to angular momentum basis
    // |n⟩ maps to |j,m⟩ where m = -j + n
    for (let n = 0; n < dim; n++) {
        const m = -j + n;
        // Use consistent indexing convention: higher m values get lower indices
        const angularIndex = dim - 1 - (j + m);
        newAmplitudes[angularIndex] = state.amplitudes[n];
    }
    // Create labels for basis states
    const labels = [];
    for (let m = -j; m <= j; m++) {
        labels.push(`|${j},${m}⟩`);
    }
    return new StateVector(dim, newAmplitudes, 'angular');
}
/**
 * Converts a state vector from angular momentum basis to computational basis
 * For j=1/2: |1/2,-1/2⟩ -> |0⟩, |1/2,1/2⟩ -> |1⟩
 *
 * @param state State vector in angular momentum basis
 * @param j Total angular momentum quantum number
 * @returns State vector in computational basis
 */
export function angularToComputationalBasis(state, j) {
    validateJ(j);
    const dim = Math.floor(2 * j + 1);
    // Check input dimension matches 2j+1
    if (state.dimension !== dim) {
        throw new Error(`State dimension ${state.dimension} does not match 2j+1 = ${dim}`);
    }
    // Create new array for amplitudes in computational basis
    const newAmplitudes = Array(dim).fill(null).map(() => math.complex(0, 0));
    // Map each angular momentum basis state to computational basis
    // |j,m⟩ maps to |n⟩ where n = m + j
    for (let m = -j; m <= j; m++) {
        const n = m + j;
        // Index in angular basis array goes from -j to +j
        const angularIndex = dim - 1 - (j + m);
        newAmplitudes[n] = state.amplitudes[angularIndex];
    }
    // Create computational basis labels
    const labels = [];
    for (let i = 0; i < dim; i++) {
        labels.push(`|${i}⟩`);
    }
    return new StateVector(dim, newAmplitudes, 'computational');
}
/**
 * Attempts to identify the basis of a state vector based on its label format
 *
 * @param state State vector to identify basis for
 * @returns 'angular' for angular momentum basis, 'computational' for computational basis,
 *          or 'unknown' if basis cannot be determined
 */
export function identifyBasis(state) {
    const str = state.toString();
    // Check for angular momentum basis format |j,m⟩
    if (str.match(/\|\d+\/?\d*,[-+]?\d+\/?\d*⟩/)) {
        return 'angular';
    }
    // Check for computational basis format |n⟩
    if (str.match(/\|\d+⟩/)) {
        return 'computational';
    }
    return 'unknown';
}
/**
 * Creates a zero complex matrix of given dimension
 */
function createZeroMatrix(dim) {
    return Array(dim).fill(null)
        .map(() => Array(dim).fill(null)
        .map(() => math.complex(0, 0)));
}
/**
 * Creates the raising operator J₊ for given angular momentum j
 * J₊|j,m⟩ = √(j(j+1) - m(m+1)) |j,m+1⟩
 *
 * @param j Total angular momentum quantum number
 * @returns The J₊ operator as a matrix
 */
export function createJplus(j) {
    validateJ(j);
    const dim = Math.floor(2 * j + 1);
    const matrix = createZeroMatrix(dim);
    // Fill matrix elements - use consistent indexing with states
    for (let m = -j; m < j; m++) {
        // States use: idx = dim - 1 - (j + m)
        const fromStateIdx = dim - 1 - (j + m); // |j,m⟩
        const toStateIdx = dim - 1 - (j + (m + 1)); // |j,m+1⟩
        const element = Math.sqrt(j * (j + 1) - m * (m + 1));
        // Matrix element: ⟨j,m+1| J₊ |j,m⟩ 
        matrix[toStateIdx][fromStateIdx] = math.complex(element, 0);
    }
    return new MatrixOperator(matrix, 'general', true, { j });
}
/**
 * Creates the lowering operator J₋ for given angular momentum j
 * J₋|j,m⟩ = √(j(j+1) - m(m-1)) |j,m-1⟩
 *
 * @param j Total angular momentum quantum number
 * @returns The J₋ operator as a matrix
 */
export function createJminus(j) {
    validateJ(j);
    const dim = Math.floor(2 * j + 1);
    const matrix = createZeroMatrix(dim);
    // Fill matrix elements - use consistent indexing with states  
    for (let m = -j + 1; m <= j; m++) {
        // States use: idx = dim - 1 - (j + m)
        const fromStateIdx = dim - 1 - (j + m); // |j,m⟩
        const toStateIdx = dim - 1 - (j + (m - 1)); // |j,m-1⟩
        const element = Math.sqrt(j * (j + 1) - m * (m - 1));
        // Matrix element: ⟨j,m-1| J₋ |j,m⟩
        matrix[toStateIdx][fromStateIdx] = math.complex(element, 0);
    }
    return new MatrixOperator(matrix, 'general', true, { j });
}
/**
 * Creates the z-component operator Jz for given angular momentum j
 * Jz|j,m⟩ = m|j,m⟩
 *
 * @param j Total angular momentum quantum number
 * @returns The Jz operator as a matrix
 */
export function createJz(j) {
    validateJ(j);
    const dim = Math.floor(2 * j + 1);
    const matrix = createZeroMatrix(dim);
    // Fill diagonal elements - m goes from j to -j as idx goes from 0 to 2j
    for (let idx = 0; idx < dim; idx++) {
        const m = -j + (dim - 1 - idx);
        matrix[idx][idx] = math.complex(m, 0);
    }
    return new MatrixOperator(matrix, 'hermitian', true, { j });
}
/**
 * Creates the x-component operator Jx for given angular momentum j
 * Jx = (J₊ + J₋)/2
 *
 * @param j Total angular momentum quantum number
 * @returns The Jx operator as a matrix
 */
export function createJx(j) {
    const jPlus = createJplus(j);
    const jMinus = createJminus(j);
    // Jx = (J₊ + J₋)/2
    const plusMatrix = jPlus.toMatrix();
    const minusMatrix = jMinus.toMatrix();
    const matrix = plusMatrix.map((row, i) => row.map((_, j) => math.multiply(math.add(plusMatrix[i][j], minusMatrix[i][j]), math.complex(0.5, 0))));
    return new MatrixOperator(matrix, 'hermitian', true, { j });
}
/**
 * Creates the y-component operator Jy for given angular momentum j
 * Jy = (J₊ - J₋)/(2i)
 *
 * @param j Total angular momentum quantum number
 * @returns The Jy operator as a matrix
 */
export function createJy(j) {
    const jPlus = createJplus(j);
    const jMinus = createJminus(j);
    // Jy = (J₊ - J₋)/(2i)
    const plusMatrix = jPlus.toMatrix();
    const minusMatrix = jMinus.toMatrix();
    const matrix = plusMatrix.map((row, i) => row.map((_, j) => math.multiply(math.subtract(plusMatrix[i][j], minusMatrix[i][j]), math.complex(0, -0.5) // multiply by 1/(2i)
    )));
    return new MatrixOperator(matrix, 'general', true, { j });
}
/**
 * Creates the total angular momentum operator J² for given j
 * J²|j,m⟩ = j(j+1)|j,m⟩
 *
 * @param j Total angular momentum quantum number
 * @returns The J² operator as a matrix
 */
export function createJ2(j) {
    validateJ(j);
    const dim = Math.floor(2 * j + 1);
    const eigenvalue = j * (j + 1);
    const matrix = createZeroMatrix(dim);
    // Fill diagonal elements with j(j+1)
    for (let i = 0; i < dim; i++) {
        matrix[i][i] = math.complex(eigenvalue, 0);
    }
    const op = new MatrixOperator(matrix);
    return Object.assign(op, { j });
}
/**
 * Creates total angular momentum operator J² from components
 * J² = Jx² + Jy² + Jz² = J₊J₋ + Jz² - Jz = J₋J₊ + Jz² + Jz
 *
 * This is an alternative implementation that constructs J² from its components.
 * Useful for verification against createJ2().
 *
 * @param j Total angular momentum quantum number
 * @returns The J² operator as a matrix
 */
export function createJ2FromComponents(j) {
    const jPlus = createJplus(j);
    const jMinus = createJminus(j);
    const jz = createJz(j);
    // Calculate J² = J₊J₋ + Jz² - Jz
    const jPlusJMinus = jPlus.compose(jMinus);
    const jzSquared = jz.compose(jz);
    const result = jPlusJMinus.add(jzSquared).add(jz.scale(math.complex(-1, 0)));
    return Object.assign(new MatrixOperator(result.toMatrix()), { j });
}
/**
 * Validates angular momentum quantum number j
 * j must be a non-negative integer or half-integer
 *
 * @param j Angular momentum quantum number to validate
 * @throws Error if j is invalid
 */
export function validateJ(j) {
    if (j < 0) {
        throw new Error('Angular momentum j must be non-negative');
    }
    // Check if j is integer or half-integer
    const isValid = Math.abs(j * 2 - Math.round(j * 2)) < 1e-10;
    if (!isValid) {
        throw new Error('Angular momentum j must be integer or half-integer');
    }
}
/**
 * Gets the valid m values for a given j
 * m ranges from -j to +j in integer steps
 *
 * @param j Total angular momentum quantum number
 * @returns Array of valid m values
 */
export function getValidM(j) {
    validateJ(j);
    const mValues = [];
    for (let m = -j; m <= j; m++) {
        mValues.push(m);
    }
    return mValues;
}
/**
 * Checks if a given m value is valid for angular momentum j
 *
 * @param j Total angular momentum quantum number
 * @param m Magnetic quantum number to check
 * @returns true if m is valid for given j
 */
export function isValidM(j, m) {
    validateJ(j);
    // First check range
    if (m < -j || m > j) {
        return false;
    }
    // For integer j, m must be integer
    // For half-integer j, m must be half-integer
    const mValues = getValidM(j);
    return mValues.includes(m);
}
/**
 * Creates Wigner rotation operator D(α,β,γ) = exp(-iαJz)exp(-iβJy)exp(-iγJz)
 *
 * @param j Total angular momentum quantum number
 * @param alpha First Euler angle
 * @param beta Second Euler angle
 * @param gamma Third Euler angle
 * @returns The Wigner rotation operator
 */
export function createRotationOperator(j, alpha, beta, gamma) {
    // Get Jz and construct Jy = (J₊ - J₋)/(2i)
    const jz = createJz(j);
    const jPlus = createJplus(j);
    const jMinus = createJminus(j);
    // Create Jy from J₊ and J₋
    const jyMatrix = jPlus.toMatrix().map((row, i) => row.map((_, j) => {
        const plusElem = jPlus.toMatrix()[i][j];
        const minusElem = jMinus.toMatrix()[i][j];
        return math.multiply(math.subtract(plusElem, minusElem), math.complex(0, -0.5));
    }));
    const jy = new MatrixOperator(jyMatrix, 'general', true, { j });
    // Calculate rotation matrices
    const expAlpha = Object.assign(new MatrixOperator(matrixExponential(jz.scale(math.complex(0, -alpha)).toMatrix())), { j });
    const expBeta = Object.assign(new MatrixOperator(matrixExponential(jy.scale(math.complex(0, -beta)).toMatrix())), { j });
    const expGamma = Object.assign(new MatrixOperator(matrixExponential(jz.scale(math.complex(0, -gamma)).toMatrix())), { j });
    // Combine the rotations
    const result = expAlpha.compose(expBeta).compose(expGamma);
    return Object.assign(new MatrixOperator(result.toMatrix()), { j });
}
/**
 * Calculates expectation value ⟨j,m|O|j,m⟩ for an angular momentum operator
 *
 * @param operator Angular momentum operator to calculate expectation for
 * @param j Total angular momentum quantum number
 * @param m Magnetic quantum number
 * @returns Complex expectation value
 */
export function jmExpectationValue(operator, j, m) {
    // Create the angular momentum state |j,m⟩
    const state = createJmState(j, m);
    // Calculate ⟨j,m|O|j,m⟩ using the proper expectation value formula
    return expectationValue(state, operator);
}
/**
 * Creates a coherent angular momentum state |j,θ,φ⟩
 * This is an eigenstate of the angular momentum operator pointing in the direction (θ,φ)
 *
 * @param j Total angular momentum quantum number
 * @param theta Polar angle θ in radians
 * @param phi Azimuthal angle φ in radians
 * @returns The coherent state as a StateVector
 */
export function createCoherentState(j, theta, phi) {
    validateJ(j);
    // Create rotation operator to rotate from |j,j⟩ to desired direction
    const alpha = phi;
    const beta = theta;
    const gamma = 0;
    const D = createRotationOperator(j, alpha, beta, gamma);
    // Start with highest weight state |j,j⟩
    const highestState = createJmState(j, j);
    // Rotate to desired direction
    return D.apply(highestState);
}
