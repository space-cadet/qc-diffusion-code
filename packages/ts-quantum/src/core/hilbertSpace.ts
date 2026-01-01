/**
 * Hilbert space implementation supporting composition and tensor products
 */

import { Complex, IStateVector } from './types';
import { StateVector } from '../states/stateVector';
import * as math from 'mathjs';

/**
 * Represents a quantum Hilbert space with dimension and optional basis labels
 */
export class HilbertSpace {
  readonly dimension: number;
  readonly basis: string[];

  constructor(dimension: number, basis?: string[]) {
    if (dimension < 1) {
      throw new Error('Hilbert space dimension must be positive');
    }
    
    this.dimension = dimension;
    this.basis = basis || Array(dimension).fill(null)
      .map((_, i) => `|${i}⟩`);

    if (basis && basis.length !== dimension) {
      throw new Error('Number of basis labels must match dimension');
    }
  }

  /**
   * Composes this Hilbert space with another via tensor product: this ⊗ other
   */
  compose(other: HilbertSpace): HilbertSpace {
    const newDimension = this.dimension * other.dimension;
    
    // Generate basis labels for product space
    const newBasis: string[] = [];
    for (let i = 0; i < this.dimension; i++) {
      for (let j = 0; j < other.dimension; j++) {
        newBasis.push(`${this.basis[i]}⊗${other.basis[j]}`);
      }
    }

    return new HilbertSpace(newDimension, newBasis);
  }

  /**
   * Decomposes this Hilbert space into tensor product factors
   * @param dims Array of dimensions that should multiply to space dimension
   */
  decompose(dims: number[]): HilbertSpace[] {
    // Validate dimensions
    const product = dims.reduce((a, b) => a * b, 1);
    if (product !== this.dimension) {
      throw new Error('Product of dimensions must equal space dimension');
    }

    // Create factor spaces
    return dims.map((dim, i) => {
      // Extract relevant basis labels if possible
      const basisStart = i * dim;
      const basis = this.basis.slice(basisStart, basisStart + dim);
      return new HilbertSpace(dim, basis);
    });
  }

  /**
   * Creates tensor product with another space: this ⊗ other
   */
  tensorProduct(other: HilbertSpace): HilbertSpace {
    return this.compose(other);
  }

  /**
   * Performs partial trace over specified subsystems
   * @param subsystemDims Dimensions of subsystems to trace out
   */
  partialTrace(subsystemDims: number[]): HilbertSpace {
    // Validate subsystem dimensions
    const subsystemProduct = subsystemDims.reduce((a, b) => a * b, 1);
    if (subsystemProduct >= this.dimension) {
      throw new Error('Cannot trace out entire space or more');
    }

    // Calculate remaining dimension
    const remainingDim = this.dimension / subsystemProduct;
    
    // Generate new basis labels
    const newBasis = this.basis.slice(0, remainingDim);

    return new HilbertSpace(remainingDim, newBasis);
  }

  /**
   * Checks if a state vector belongs to this Hilbert space
   */
  containsState(state: IStateVector): boolean {
    return state.dimension === this.dimension;
  }

  /**
   * Creates a computational basis state |i⟩
   */
  computationalBasisState(i: number): IStateVector {
    if (i < 0 || i >= this.dimension) {
      throw new Error('Basis state index out of range');
    }

    return StateVector.computationalBasis(this.dimension, i);
  }

  /**
   * Returns array of all computational basis states
   */
  computationalBasis(): IStateVector[] {
    return Array(this.dimension).fill(null)
      .map((_, i) => this.computationalBasisState(i));
  }

  /**
   * Creates normalized superposition of basis states with given coefficients
   */
  superposition(coefficients: Complex[]): IStateVector {
    if (coefficients.length !== this.dimension) {
      throw new Error('Number of coefficients must match dimension');
    }

    return StateVector.superposition(coefficients);
  }

  /**
   * Extends this space to a larger space by tensoring with auxiliary space
   * @param auxDimension Dimension of auxiliary space
   * @param position Position to insert this space (0 = leftmost)
   */
  extendToLargerSpace(auxDimension: number, position: number = 0): HilbertSpace {
    const auxSpace = new HilbertSpace(auxDimension);
    
    if (position === 0) {
      return this.tensorProduct(auxSpace);
    } else {
      return auxSpace.tensorProduct(this);
    }
  }

  /**
   * Creates an equally weighted superposition of all basis states
   */
  equalSuperposition(): IStateVector {
    return StateVector.equalSuperposition(this.dimension);
  }

  /**
   * Returns string representation of the Hilbert space
   */
  toString(): string {
    return `HilbertSpace(dim=${this.dimension}, basis=[${this.basis.join(', ')}])`;
  }
}
