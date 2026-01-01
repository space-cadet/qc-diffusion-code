/**
 * Tests for quantum measurement operations
 */

import { describe, it, expect } from 'vitest';

import { 
  ProjectionOperator, 
  expectationValue, 
  measureState 
} from '../src/operators/measurement';
import { StateVector } from '../src/states/stateVector';
import { MatrixOperator } from '../src/operators/operator';
import * as math from 'mathjs';

describe('Quantum Measurements', () => {
  describe('ProjectionOperator', () => {
    it('creates valid projection operator from state', () => {
      const state = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const projector = new ProjectionOperator(state);
      
      expect(projector.dimension).toBe(2);
      expect(projector.type).toBe('projection');
      
      const matrix = projector.toMatrix();
      expect(matrix[0][0]).toEqual(math.complex(1,  0));
      expect(matrix[0][1]).toEqual(math.complex(0,  0));
      expect(matrix[1][0]).toEqual(math.complex(0,  0));
      expect(matrix[1][1]).toEqual(math.complex(0,  0));
    });

    it('projects state correctly', () => {
      const basis = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const projector = new ProjectionOperator(basis);
      
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      
      const projected = projector.apply(state);
      expect(projected.amplitudes[0].re).toBeCloseTo(1/Math.sqrt(2));
      expect(projected.amplitudes[1].re).toBeCloseTo(0);
    });

    it('is idempotent (P² = P)', () => {
      const state = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const projector = new ProjectionOperator(state);
      
      const squared = projector.compose(projector);
      const matrix = squared.toMatrix();
      const originalMatrix = projector.toMatrix();
      
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          expect(matrix[i][j].re).toBeCloseTo(originalMatrix[i][j].re);
          expect(matrix[i][j].im).toBeCloseTo(originalMatrix[i][j].im);
        }
      }
    });

    it('is hermitian (P† = P)', () => {
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      const projector = new ProjectionOperator(state);
      
      const adjoint = projector.adjoint();
      const matrix = adjoint.toMatrix();
      const originalMatrix = projector.toMatrix();
      
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          expect(matrix[i][j].re).toBeCloseTo(originalMatrix[i][j].re);
          expect(matrix[i][j].im).toBeCloseTo(originalMatrix[i][j].im);
        }
      }
    });
  });

  describe('expectationValue', () => {
    it('calculates expectation value correctly', () => {
      const state = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      
      const operator = new MatrixOperator([
        [math.complex(1,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(-1,  0)]
      ], 'hermitian');
      
      const result = expectationValue(state, operator);
      expect(result.re).toBeCloseTo(1);
      expect(result.im).toBeCloseTo(0);
    });

    it('gives real expectation values for hermitian operators', () => {
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      
      const operator = new MatrixOperator([
        [math.complex(1,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(1,  0)]
      ], 'hermitian');
      
      const result = expectationValue(state, operator);
      expect(result.im).toBeCloseTo(0);
    });
  });

  describe('measureState', () => {
    it('performs projective measurement correctly', () => {
      const basis = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const projector = new ProjectionOperator(basis);
      
      const state = new StateVector(2, [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ]);
      
      const result = measureState(state, projector);
      expect(result.value).toBe(1);
      expect(result.probability).toBeCloseTo(0.5);
      
      // Post-measurement state should be normalized
      const normSquared = result.state.amplitudes.reduce((sum, amp) =>
        sum + math.abs(amp) ** 2, 0
      );
      expect(normSquared).toBeCloseTo(1);
    });

    it('preserves measurement statistics', () => {
      const basis = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      const projector = new ProjectionOperator(basis);
      
      const state = new StateVector(2, [
        math.complex(1,  0),
        math.complex(0,  0)
      ]);
      
      const result = measureState(state, projector);
      expect(result.probability).toBeCloseTo(1);
      expect(result.state.amplitudes[0]).toEqual(math.complex(1,  0));
      expect(result.state.amplitudes[1]).toEqual(math.complex(0,  0));
    });
  });
});