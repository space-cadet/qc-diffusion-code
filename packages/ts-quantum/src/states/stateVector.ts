/**
 * Quantum state vector implementation
 */

import { Complex, IStateVector, toComplex } from '../core/types';
import * as math from 'mathjs';
import { 
  validatePosDim, 
  validateIdx, 
  validateAmps 
} from '../utils/validation';

export interface AngularMomentumMetadata {
  type: 'angular_momentum';
  j: number;                    // Total angular momentum
  mRange: [number, number];     // [mMin, mMax] range  
  couplingHistory: CouplingRecord[];
  jComponents: Map<number, JComponentMetadata>;
  isComposite: boolean;
}

export interface CouplingRecord {
  operation: 'single' | 'coupling';
  j1?: number;
  j2?: number;
  resultJ: number[];
  timestamp: number;
}

export interface JComponentMetadata {
  j: number;
  startIndex: number;           // Where this J component starts in amplitude array
  dimension: number;            // 2j+1
  normalizationFactor: number;
}

export class StateVector implements IStateVector {
  readonly objectType: 'state' = 'state';  // Discriminator property
  readonly dimension: number;
  readonly amplitudes: Complex[];
  readonly basis?: string;
  readonly properties?: Record<string, any>;

  constructor(
    dimension: number, 
    amplitudes?: Complex[], 
    basis?: string,
    properties?: Record<string, any>
  ) {
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
  setState(index: number, value: Complex): void {
    validateIdx(index, this.dimension);
    this.amplitudes[index] = value;
  }

  /**
   * Gets amplitude at specified index
   */
  getState(index: number): Complex {
    validateIdx(index, this.dimension);
    return this.amplitudes[index];
  }

  /**
   * Calculates inner product ⟨ψ|φ⟩ with another state
   */
  innerProduct(other: StateVector): Complex {
    if (this.dimension !== other.dimension) {
      throw new Error('States must have same dimension for inner product');
    }

    let result: Complex = math.complex(0, 0);
    for (let i = 0; i < this.dimension; i++) {
      const conj = math.conj(toComplex(this.amplitudes[i]));
      const prod = math.multiply(conj, toComplex(other.amplitudes[i]));
      result = math.add(result, prod) as Complex;
    }
    return result;
  }

  /**
   * Calculates norm of state vector
   */
  norm(): number {
    const innerProd = this.innerProduct(this);
    const abs = math.abs(innerProd) as unknown as number;
    return Math.sqrt(abs);
  }

  /**
   * Returns normalized version of state vector
   */
  normalize(): StateVector {
    const currentNorm = this.norm();
    if (currentNorm < 1e-10) {
      throw new Error('Cannot normalize zero state vector');
    }

    const normalizedAmplitudes = this.amplitudes.map(amp => 
      math.divide(toComplex(amp), math.complex(currentNorm, 0)) as Complex
    );

    return new StateVector(this.dimension, normalizedAmplitudes, this.basis, this.properties);
  }

  /**
   * Computes tensor product with another state vector
   */
  tensorProduct(other: StateVector): StateVector {
    const newDimension = this.dimension * other.dimension;
    const newAmplitudes: Complex[] = [];

    for (let i = 0; i < this.dimension; i++) {
      for (let j = 0; j < other.dimension; j++) {
        newAmplitudes.push(math.multiply(
          this.amplitudes[i],
          other.amplitudes[j]
        ) as Complex);
      }
    }

    // Generate new basis label if both states have basis labels
    let newBasis: string | undefined;
    if (this.basis && other.basis) {
      newBasis = `${this.basis}⊗${other.basis}`;
    }

    return new StateVector(newDimension, newAmplitudes, newBasis, this.properties);
  }

  /**
   * Returns true if state is zero vector
   */
  isZero(tolerance: number = 1e-10): boolean {
    return this.amplitudes.every(amp => 
      (math.abs(amp) as unknown as number) < tolerance
    );
  }

  /**
   * Get a copy of the amplitudes array
   */
  getAmplitudes(): Complex[] {
    return [...this.amplitudes];
  }

  /**
   * Check if this state vector equals another within tolerance
   */
  equals(other: IStateVector, tolerance: number = 1e-10): boolean {
    if (this.dimension !== other.dimension) {
      return false;
    }

    return this.amplitudes.every((amp, i) => {
      const diff = math.subtract(amp, other.getState(i)) as Complex;
      const absDiff = math.abs(diff) as unknown as number;
      return absDiff < tolerance;
    });
  }

  /**
   * Scale the state vector by a complex number
   * @param factor Complex scaling factor
   * @returns New scaled state vector
   */
  scale(factor: Complex): IStateVector {
    const scaledAmplitudes = this.amplitudes.map(amp =>
      math.multiply(toComplex(amp), toComplex(factor)) as Complex
    );
    return new StateVector(
      this.dimension, 
      scaledAmplitudes, 
      this.basis, 
      this.properties ? {...this.properties} : undefined
    );
  }

  /**
   * Add another state vector to this one
   * @param other The state vector to add
   * @returns New state vector representing the sum
   */
  add(other: IStateVector): IStateVector {
    if (this.dimension !== other.dimension) {
      throw new Error(`Cannot add state vectors with different dimensions: ${this.dimension} vs ${other.dimension}`);
    }

    const sumAmplitudes = this.amplitudes.map((amp, i) =>
      math.add(toComplex(amp), toComplex(other.getState(i))) as Complex
    );

    // Generate new basis label if appropriate
    let newBasis: string | undefined;
    if (this.basis && other.basis) {
      newBasis = `(${this.basis}) + (${other.basis})`;
    }

    return new StateVector(
      this.dimension, 
      sumAmplitudes, 
      newBasis, 
      this.properties ? {...this.properties} : undefined
    );
  }

  
  /**
   * Returns array representation of state vector
   */
  toArray(): Complex[] {
    return [...this.amplitudes];
  }
  
  /**
   * Returns string representation of state vector
   */
  toString(): string {
    const components = this.amplitudes
      .map((amp, i) => {
        if ((math.abs(amp) as unknown as number) < 1e-10) {
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
  toComputationalString(): string {
    const components = this.amplitudes
      .map((amp, i) => {
        if ((math.abs(amp) as unknown as number) < 1e-10) {
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
  toAngularString(j: number): string {
    const dim = Math.floor(2 * j + 1);
    if (this.dimension !== dim) {
      throw new Error(`State dimension ${this.dimension} does not match 2j+1 = ${dim}`);
    }

    const components = this.amplitudes
      .map((amp, n) => {
        if ((math.abs(amp) as unknown as number) < 1e-10) {
          return '';
        }
        const m = -j + n;  // Convert index to m value
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
  static computationalBasis(dimension: number, index: number): StateVector {
    validatePosDim(dimension);
    validateIdx(index, dimension);

    const amplitudes = Array(dimension).fill(null)
      .map((_, i) => i === index ? math.complex(1, 0) : math.complex(0, 0));
    
    return new StateVector(dimension, amplitudes, `|${index}⟩`);
  }

  /**
   * Returns array of all computational basis states
   */
  static computationalBasisStates(dimension: number): StateVector[] {
    validatePosDim(dimension);
    
    return Array(dimension).fill(null)
      .map((_, i) => StateVector.computationalBasis(dimension, i));
  }

  /**
   * Creates normalized superposition of basis states with given coefficients
   */
  static superposition(coefficients: Complex[]): StateVector {
    const dimension = coefficients.length;
    validatePosDim(dimension);

    return new StateVector(dimension, coefficients, 'superposition').normalize();
  }

  /**
   * Creates an equally weighted superposition of all basis states
   */
  static equalSuperposition(dimension: number): StateVector {
    validatePosDim(dimension);

    const coefficient = math.complex(1 / Math.sqrt(dimension), 0);
    const coefficients = Array(dimension).fill(coefficient);
    
    return new StateVector(dimension, coefficients, '|+⟩');
  }

  /**
  * Sets angular momentum metadata for this state
  */
  setAngularMomentumMetadata(metadata: AngularMomentumMetadata): void {
    if (!this.properties) {
      (this as any).properties = {};
    }
    (this as any).properties.angularMomentumMetadata = metadata;
  }

  /**
   * Gets angular momentum metadata if present
   */
  getAngularMomentumMetadata(): AngularMomentumMetadata | null {
    return this.properties?.angularMomentumMetadata || null;
  }

  /**
   * Checks if this state has angular momentum structure
   */
  hasAngularMomentumStructure(): boolean {
    const metadata = this.getAngularMomentumMetadata();
    return metadata?.type === 'angular_momentum';
  }
}