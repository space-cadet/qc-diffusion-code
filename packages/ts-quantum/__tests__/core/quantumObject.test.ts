/**
 * Tests for QuantumObject union type and utility functions
 */

import { describe, it, expect } from 'vitest';
import * as math from 'mathjs';
import { 
  QuantumObject, 
  isState, 
  isOperator, 
  isDensityMatrix,
  adjoint,
  norm,
  getObjectType
} from '../../src/core/types';
import { StateVector } from '../../src/states/stateVector';
import { MatrixOperator } from '../../src/operators/operator';
import { DensityMatrixOperator } from '../../src/states/densityMatrix';

describe('QuantumObject Type System', () => {
  // Test objects
  const state = new StateVector(2, [math.complex(1, 0), math.complex(0, 0)], '|0⟩');
  const operator = MatrixOperator.identity(2);
  const densityMatrix = DensityMatrixOperator.fromPureState(state);

  describe('Type Guards', () => {
    it('should identify states correctly', () => {
      expect(isState(state)).toBe(true);
      expect(isState(operator)).toBe(false);
      expect(isState(densityMatrix)).toBe(false);
    });

    it('should identify operators correctly', () => {
      expect(isOperator(state)).toBe(false);
      expect(isOperator(operator)).toBe(true);
      expect(isOperator(densityMatrix)).toBe(true);
    });

    it('should identify density matrices correctly', () => {
      expect(isDensityMatrix(operator)).toBe(false);
      expect(isDensityMatrix(densityMatrix)).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    it('should calculate norm for states', () => {
      const stateNorm = norm(state);
      expect(stateNorm).toBeCloseTo(1, 10);
    });

    it('should calculate norm for operators', () => {
      const opNorm = norm(operator);
      expect(opNorm).toBeCloseTo(Math.sqrt(2), 10); // Frobenius norm of 2x2 identity
    });

    it('should get object type correctly', () => {
      expect(getObjectType(state)).toBe('state');
      expect(getObjectType(operator)).toBe('operator');
      expect(getObjectType(densityMatrix)).toBe('operator');
    });

    it('should compute adjoint for operators', () => {
      const adj = adjoint(operator);
      expect(adj).toBeDefined();
      expect(adj.dimension).toBe(2);
    });

    it('should throw error for state adjoint', () => {
      expect(() => adjoint(state)).toThrow('Adjoint of state vector not implemented');
    });
  });

  describe('Polymorphic Operations', () => {
    it('should work with arrays of quantum objects', () => {
      const objects: QuantumObject[] = [state, operator];
      
      objects.forEach(obj => {
        expect(obj.dimension).toBe(2);
        expect(typeof norm(obj)).toBe('number');
      });
    });

    it('should filter by type', () => {
      const objects: QuantumObject[] = [state, operator, densityMatrix];
      
      const states = objects.filter(isState);
      const operators = objects.filter(isOperator);
      
      expect(states).toHaveLength(1);
      expect(operators).toHaveLength(2);
    });
  });
});
