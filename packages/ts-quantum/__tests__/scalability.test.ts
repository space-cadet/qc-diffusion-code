/**
 * Scalability tests for quantum module
 * Tests memory and performance limits of core quantum operations
 */

import { describe, it, expect } from 'vitest';
import { StateVector } from '../src/states/stateVector';
import { MatrixOperator } from '../src/operators/operator';
import { PauliX } from '../src/operators/gates';
import * as math from 'mathjs';

describe('Quantum Module Scalability', () => {
  // Helper to measure memory usage (approximate)
  const getMemoryUsage = () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / 1024 / 1024; // MB
    }
    return 0; // Browser fallback
  };

  describe('State Vector Scaling', () => {
    it('should handle increasing qubit counts', () => {
      const results: Array<{qubits: number, dimension: number, memoryMB: number, timeMs: number}> = [];
      
      for (let qubits = 1; qubits <= 16; qubits++) {
        const dimension = Math.pow(2, qubits);
        const startMem = getMemoryUsage();
        const startTime = performance.now();
        
        try {
          // Create computational basis state
          const state = StateVector.computationalBasis(dimension, 0);
          
          // Basic operations
          const norm = state.norm();
          const normalized = state.normalize();
          
          const endTime = performance.now();
          const endMem = getMemoryUsage();
          
          results.push({
            qubits,
            dimension,
            memoryMB: endMem - startMem,
            timeMs: endTime - startTime
          });
          
          expect(norm).toBeCloseTo(1);
          console.log(`${qubits} qubits (dim ${dimension}): ${(endTime - startTime).toFixed(2)}ms, ~${(endMem - startMem).toFixed(1)}MB`);
          
        } catch (error) {
          console.log(`Failed at ${qubits} qubits: ${error.message}`);
          break;
        }
      }
      
      expect(results.length).toBeGreaterThan(10); // Should handle at least 10 qubits
    });
  });

  describe('Tensor Product Scaling', () => {
    it('should handle tensor products up to memory limits', () => {
      let maxQubits = 0;
      
      for (let qubits = 2; qubits <= 16; qubits += 2) {
        const singleQubitDim = 2;
        const startMem = getMemoryUsage();
        const startTime = performance.now();
        
        try {
          // Create two single-qubit states
          let state1 = StateVector.computationalBasis(singleQubitDim, 0);
          let state2 = StateVector.computationalBasis(singleQubitDim, 1);
          
          // Build up tensor product
          let result = state1;
          for (let i = 1; i < qubits / 2; i++) {
            result = result.tensorProduct(state2);
          }
          
          const endTime = performance.now();
          const endMem = getMemoryUsage();
          maxQubits = qubits;
          
          expect(result.dimension).toBe(Math.pow(2, qubits / 2));
          console.log(`Tensor product ${qubits/2} qubits: ${(endTime - startTime).toFixed(2)}ms, dim ${result.dimension}, ~${(endMem - startMem).toFixed(1)}MB`);
          
        } catch (error) {
          console.log(`Tensor product failed at ${qubits} qubits: ${error.message}`);
          break;
        }
      }
      
      expect(maxQubits).toBeGreaterThan(4);
    });
  });

  describe('Operator Scaling', () => {
    it('should handle operator creation and application', () => {
      for (let qubits = 1; qubits <= 8; qubits++) {
        const dimension = Math.pow(2, qubits);
        const startMem = getMemoryUsage();
        const startTime = performance.now();
        
        try {
          console.log(`Starting ${qubits} qubits (dim ${dimension})...`);
          
          const identity = MatrixOperator.identity(dimension);
          const state = StateVector.computationalBasis(dimension, 0);
          const result = identity.apply(state);
          
          const endTime = performance.now();
          const endMem = getMemoryUsage();
          
          expect(result.dimension).toBe(dimension);
          console.log(`Operator ${qubits} qubits: ${(endTime - startTime).toFixed(2)}ms, ~${(endMem - startMem).toFixed(1)}MB`);
          
        } catch (error) {
          console.log(`Operator failed at ${qubits} qubits: ${error.message}`);
          break;
        }
      }
    });
  });
});
