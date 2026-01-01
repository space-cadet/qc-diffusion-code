/**
 * Tests for density matrix operations
 */

import { describe, it, expect } from 'vitest';

import { 
  DensityMatrixOperator,
  KrausChannel,
  createDepolarizingChannel,
  createAmplitudeDampingChannel,
  createPhaseDampingChannel,
  createBitFlipChannel,
  createPhaseFlipChannel,
  traceFidelity,
  concurrence,
  negativity
} from '../src/states/densityMatrix';
import { StateVector } from '../src/states/stateVector';

import { formatMatrix, formatComplex } from './utils/testHelpers';

import * as math from 'mathjs';
import { format } from 'path';

describe('DensityMatrix', () => {
  describe('Constructor', () => {
    it('creates valid density matrix from pure state', () => {
      const state = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(state);
      
      expect(rho.dimension).toBe(2);
      const matrix = rho.toMatrix();
      expect(matrix[0][0]).toEqual(math.complex(1,  0));
      expect(matrix[1][1]).toEqual(math.complex(0,  0));
    });

    it('validates hermiticity', () => {
      const invalidMatrix = [
        [math.complex(1,  0), math.complex(1,  0)],
        [math.complex(0,  1), math.complex(0,  0)]
      ];
      expect(() => new DensityMatrixOperator(invalidMatrix)).toThrow();
    });

    it('validates positive semidefiniteness via purity', () => {
      const invalidMatrix = [
        [math.complex(2,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(-1,  0)]
      ];
      expect(() => new DensityMatrixOperator(invalidMatrix)).toThrow();
    });
  });

  describe('Basic Operations', () => {
    it('applies operator to state correctly', () => {
      const state = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(state);
      const result = rho.apply(state);
      
      // Should preserve state since ρ|ψ⟩ = |ψ⟩ for pure states
      expect(result.amplitudes[0].re).toBeCloseTo(1);
      expect(result.amplitudes[1].re).toBeCloseTo(0);
    });

    it('composes density matrices correctly', () => {
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(state);
      const composed = rho.compose(rho);
      
      // For pure states, ρ² = ρ
      const matrix = composed.toMatrix();
      const originalMatrix = rho.toMatrix();
      expect(matrix[0][0].re).toBeCloseTo(originalMatrix[0][0].re);
      expect(matrix[0][1].re).toBeCloseTo(originalMatrix[0][1].re);
      expect(matrix[1][0].re).toBeCloseTo(originalMatrix[1][0].re);
      expect(matrix[1][1].re).toBeCloseTo(originalMatrix[1][1].re);
    });

    it('calculates adjoint correctly', () => {
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  1/Math.sqrt(2)),
        math.complex(0,  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(state);
      const adjoint = rho.adjoint();
      
      // Density matrices are Hermitian, so ρ† = ρ
      const matrix = adjoint.toMatrix();
      const originalMatrix = rho.toMatrix();
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          expect(matrix[i][j].re).toBeCloseTo(originalMatrix[i][j].re);
          expect(matrix[i][j].im).toBeCloseTo(originalMatrix[i][j].im);
        }
      }
    });

    it('performs partial trace correctly', () => {
      // Create a Bell state
      const state = new StateVector(4, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(0,  0),
        math.complex(0,  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(state);
      
      // Partial trace should give maximally mixed state
      const reduced = rho.partialTrace([2, 2], [1]);
      const matrix = new DensityMatrixOperator(reduced.toMatrix());

      // console.log('State:', state.toString());

      // console.log('Rho:', formatMatrix(rho.toMatrix()));

      // console.log('Reduced density matrix:', formatMatrix(matrix.toMatrix()));

      // console.log('Trace:', rho.trace());

      // Access the matrix data properly through the toMatrix() method
      const matrixData = matrix.toMatrix();
      // console.log(matrixData[0][0].re, matrixData[1][1].re);

      expect(matrixData[0][0].re).toBeCloseTo(0.5);
      expect(matrixData[1][1].re).toBeCloseTo(0.5);
      expect(matrixData[0][1].re).toBeCloseTo(0);
      expect(matrixData[1][0].re).toBeCloseTo(0);
    });

    it('calculates von Neumann entropy correctly', () => {
      // Pure state should have zero entropy
      const pureState = new StateVector(2, [math.complex(1,  0), math.complex(0,  0)]);
      const pureDensity = DensityMatrixOperator.fromPureState(pureState);
      expect(pureDensity.vonNeumannEntropy()).toBeCloseTo(0);

      // Maximally mixed state should have maximum entropy
      const mixedState = DensityMatrixOperator.mixedState(
        [
          new StateVector(2, [math.complex(1,  0), math.complex(0,  0)]),
          new StateVector(2, [math.complex(0,  0), math.complex(1,  0)])
        ],
        [0.5, 0.5]
      );
      expect(mixedState.vonNeumannEntropy()).toBeCloseTo(Math.log(2));
    });

    it('performs tensor product correctly', () => {
      const state1 = new StateVector(2, [math.complex(1,  0), math.complex(0,  0)]);
      const state2 = new StateVector(2, [math.complex(1/Math.sqrt(2),  0), math.complex(1/Math.sqrt(2),  0)]);
      
      const rho1 = DensityMatrixOperator.fromPureState(state1);
      const rho2 = DensityMatrixOperator.fromPureState(state2);
      
      const product = rho1.tensorProduct(rho2);
      expect(product.dimension).toBe(4);
      
      // Check specific elements of the tensor product
      const matrix = product.toMatrix();
      expect(matrix[0][0].re).toBeCloseTo(0.5);
      expect(matrix[1][1].re).toBeCloseTo(0.5);
      expect(matrix[2][2].re).toBeCloseTo(0);
      expect(matrix[3][3].re).toBeCloseTo(0);
    });
  });

  describe('Mixed States', () => {
    it('creates valid mixed state', () => {
      const states = [
        new StateVector(2, [math.complex(1,  0), math.complex(0,  0)]),
        new StateVector(2, [math.complex(0,  0), math.complex(1,  0)])
      ];
      const probs = [0.6, 0.4];
      
      const rho = DensityMatrixOperator.mixedState(states, probs);
      expect(rho.dimension).toBe(2);
      
      const matrix = rho.toMatrix();
      expect(matrix[0][0].re).toBeCloseTo(0.6);
      expect(matrix[1][1].re).toBeCloseTo(0.4);
    });

    it('validates probability sum equals 1', () => {
      const states = [
        new StateVector(2, [math.complex(1,  0), math.complex(0,  0)]),
        new StateVector(2, [math.complex(0,  0), math.complex(1,  0)])
      ];
      const probs = [0.5, 0.6];
      
      expect(() => DensityMatrixOperator.mixedState(states, probs)).toThrow();
    });

    it('validates matching dimensions', () => {
      const states = [
        new StateVector(2, [math.complex(1,  0), math.complex(0,  0)]),
        new StateVector(3, [math.complex(1,  0), math.complex(0,  0), math.complex(0,  0)])
      ];
      const probs = [0.5, 0.5];
      
      expect(() => DensityMatrixOperator.mixedState(states, probs)).toThrow();
    });
  });

  describe('Operations', () => {
    it('calculates purity correctly', () => {
      const state = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(state);
      
      expect(rho.purity()).toBeCloseTo(1);
    });

    it('calculates trace correctly', () => {
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(state);
      
      const tr = rho.trace();
      expect(tr.re).toBeCloseTo(1);
      expect(tr.im).toBeCloseTo(0);
    });
  });
});

describe('Quantum Channels', () => {
  describe('Kraus Channel Implementation', () => {
    it('applies quantum channel correctly', () => {
      // Create a depolarizing channel
      const channel = createDepolarizingChannel(2, 0.5);
      
      // Create a pure state density matrix
      const state = new StateVector(2, [math.complex(1,  0), math.complex(0,  0)]);
      const rho = DensityMatrixOperator.fromPureState(state);
      
      // Apply channel
      const result = channel.apply(rho);
      
      // Should be a mixed state
      expect(result.purity()).toBeLessThan(1);
      expect(result.trace().re).toBeCloseTo(1);
    });

    it('preserves trace and hermiticity', () => {
      const channel = createAmplitudeDampingChannel(0.3);
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(state);
      
      const result = channel.apply(rho);
      expect(result.trace().re).toBeCloseTo(1);
      
      // Check hermiticity
      const resultMatrix = result.toMatrix();
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          expect(resultMatrix[i][j].re).toBeCloseTo(resultMatrix[j][i].re);
          expect(resultMatrix[i][j].im).toBeCloseTo(-resultMatrix[j][i].im);
        }
      }
    });
  });

  describe('Specific Channels', () => {
    it('implements bit flip channel correctly', () => {
      const channel = createBitFlipChannel(1.0); // Complete bit flip
      const state = new StateVector(2, [math.complex(1,  0), math.complex(0,  0)]);
      const rho = DensityMatrixOperator.fromPureState(state);
      
      const result = channel.apply(rho);
      const matrix = result.toMatrix();
      
      // Should flip |0⟩ to |1⟩
      expect(matrix[0][0].re).toBeCloseTo(0);
      expect(matrix[1][1].re).toBeCloseTo(1);
    });

    it('implements phase flip channel correctly', () => {
      const channel = createPhaseFlipChannel(1.0); // Complete phase flip
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(state);
      
      // Should flip the sign of the off-diagonal elements
      const result = channel.apply(rho);
    
      const matrix = result.toMatrix();

      console.log('Channel:', channel.getOperators().toString());
      console.log('State:', state.toString());
      console.log('Rho:', formatMatrix(rho.toMatrix()));

      console.log('Phase flip result:', formatMatrix(matrix));

      expect(matrix[0][1].re).toBeCloseTo(-0.5);
      expect(matrix[1][0].re).toBeCloseTo(-0.5);
    });

    it('implements phase damping channel correctly', () => {
      const channel = createPhaseDampingChannel(0.5);
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(state);
      
      const result = channel.apply(rho);
      
      // Should reduce coherence (off-diagonal elements)
      const matrix = result.toMatrix();
      expect(Math.abs(matrix[0][1].re)).toBeLessThan(0.5);
      expect(Math.abs(matrix[1][0].re)).toBeLessThan(0.5);
    });
  });
  describe('KrausChannel', () => {
    // TODO: Add tests once Kraus operators are implemented
    it('validates completeness relation', () => {
      // Placeholder test - implement once Kraus operators are added
      expect(true).toBe(true);
    });
  });

  describe('Channel Creation', () => {
    it('validates probability parameters', () => {
      expect(() => createDepolarizingChannel(2, -0.1)).toThrow();
      expect(() => createDepolarizingChannel(2, 1.1)).toThrow();
      
      expect(() => createBitFlipChannel(-0.1)).toThrow();
      expect(() => createBitFlipChannel(1.1)).toThrow();
      
      expect(() => createPhaseFlipChannel(-0.1)).toThrow();
      expect(() => createPhaseFlipChannel(1.1)).toThrow();
    });

    it('validates damping parameters', () => {
      expect(() => createAmplitudeDampingChannel(-0.1)).toThrow();
      expect(() => createAmplitudeDampingChannel(1.1)).toThrow();
      
      expect(() => createPhaseDampingChannel(-0.1)).toThrow();
      expect(() => createPhaseDampingChannel(1.1)).toThrow();
    });
  });
});

describe('Entanglement Measures', () => {
  describe('Comprehensive Entanglement Tests', () => {
    it('correctly measures Bell state entanglement', () => {
      // Create Bell state density matrix
      const bellState = new StateVector(4, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(0,  0),
        math.complex(0,  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(bellState);
      
      // Concurrence should be 1 for maximally entangled state
      expect(concurrence(rho)).toBeCloseTo(1);
      
      // Negativity should be 0.5 for maximally entangled state
      expect(negativity(rho, 2, 2)).toBeCloseTo(0.5);
    });

    it('measures entanglement in mixed states', () => {
      // Create Werner state: p|Φ⁺⟩⟨Φ⁺| + (1-p)I/4
      const p = 0.7;
      const bellState = new StateVector(4, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(0,  0),
        math.complex(0,  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      const bellDensity = DensityMatrixOperator.fromPureState(bellState);
      
      // Create maximally mixed state
      const identityMatrix = Array(4).fill(null).map((_, i) => 
        Array(4).fill(null).map((_, j) => 
          i === j ? math.complex(0.25,  0) : math.complex(0,  0)
        )
      );
      const mixedState = new DensityMatrixOperator(identityMatrix);
      
      // Create Werner state
      const wernerMatrix = bellDensity.toMatrix().map((row, i) => 
        row.map((elem, j) => 
          math.complex(
            p * elem.re + (1-p) * (i === j ? 0.25 : 0),
            p * elem.im
          )
        )
      );
      const wernerState = new DensityMatrixOperator(wernerMatrix);
      
      // Check entanglement measures
      const c = concurrence(wernerState);
      const n = negativity(wernerState, 2, 2);
      
      // Werner state is entangled for p > 1/3
      expect(c).toBeGreaterThan(0);
      expect(n).toBeGreaterThan(0);
    });

    it('detects separable states', () => {
      // Create separable product state
      const state1 = new StateVector(2, [math.complex(1,  0), math.complex(0,  0)]);
      const state2 = new StateVector(2, [math.complex(1,  0), math.complex(0,  0)]);
      
      const productState = state1.tensorProduct(state2);
      const rho = DensityMatrixOperator.fromPureState(productState);
      
      // Separable states should have zero entanglement
      expect(concurrence(rho)).toBeCloseTo(0);
      expect(negativity(rho, 2, 2)).toBeCloseTo(0);
    });
  });
  describe('Trace Fidelity', () => {
    it('equals 1 for identical states', () => {
      const state = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const rho = DensityMatrixOperator.fromPureState(state);
      
      expect(traceFidelity(rho, rho)).toBeCloseTo(1);
    });
  });

  describe('Concurrence', () => {
    it('validates two-qubit requirement', () => {
      const state = new StateVector(3, [
        math.complex(1,  0),
        math.complex(0,  0),
        math.complex(0,  0)
      ]).normalize();
      const rho = DensityMatrixOperator.fromPureState(state);
      
      expect(() => concurrence(rho)).toThrow();
    });
  });

  describe('Negativity', () => {
    it('validates bipartite requirement', () => {
      // Create a 3-dimensional state - this can't be split into a bipartite system
      const state = new StateVector(3, [
        math.complex(1,  0),
        math.complex(0,  0),
        math.complex(0,  0)
      ]).normalize();
      const rho = DensityMatrixOperator.fromPureState(state);
      
      // Try to split it into 2x2 dimensions which won't work
      expect(() => negativity(rho, 2, 2)).toThrow();
    });
  });
});