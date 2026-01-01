/**
 * Multi-type quantum composition operations
 */

import { HilbertSpace } from '../core/hilbertSpace';
import { IOperator } from '../core/types';
import { IStateVector } from '../core/types';
import { StateVector } from './stateVector';
import { validateMatchDims, validatePartialTrace } from '../utils/validation';

/**
 * Composes multiple Hilbert spaces via tensor product
 */
export function composeSpaces(spaces: HilbertSpace[]): HilbertSpace {
  if (spaces.length === 0) {
    throw new Error('Empty spaces array');
  }
  
  return spaces.reduce((acc, space) => acc.tensorProduct(space));
}

/**
 * Composes multiple state vectors via tensor product
 */
export function composeStates(states: IStateVector[]): IStateVector {
  if (states.length === 0) {
    throw new Error('Empty states array');
  }

  // Convert to StateVector instances if needed and use tensorProduct
  const stateVectors = states.map(state => 
    state instanceof StateVector ? state : new StateVector(state.dimension, state.amplitudes, state.basis)
  );
  
  return stateVectors.reduce((acc, state) => acc.tensorProduct(state));
}

/**
 * Composes multiple operators via tensor product
 */
export function composeOperators(operators: IOperator[]): IOperator {
  if (operators.length === 0) {
    throw new Error('Empty operators array');
  }

  const [first, ...rest] = operators;
  return rest.reduce((acc, op) => acc.tensorProduct(op), first);
}

/**
 * Creates a bipartite split of a Hilbert space
 */
export function bipartiteSplit(
  space: HilbertSpace,
  firstDimension: number
): [HilbertSpace, HilbertSpace] {
  const totalDim = space.dimension;
  if (totalDim % firstDimension !== 0) {
    throw new Error('First dimension must divide total dimension');
  }

  const secondDimension = totalDim / firstDimension;
  return space.decompose([firstDimension, secondDimension]) as [HilbertSpace, HilbertSpace];
}

/**
 * Wrapper for partial trace operation that handles composite systems.
 * This function provides a convenient interface for performing partial trace
 * operations on composite quantum systems.
 * 
 * @param operator - The quantum operator to perform partial trace on
 * @param dims - Array of dimensions for each subsystem
 * @param traceOutIndices - Indices of subsystems to trace out
 * @returns Reduced operator after tracing out specified subsystems
 */
export function partialTrace(
  operator: IOperator,
  dims: number[],
  traceOutIndices: number[]
): IOperator {
  // Use standardized validation
  validatePartialTrace(dims, operator.dimension, traceOutIndices);
  
  // Delegate to operator's implementation
  return operator.partialTrace(dims, traceOutIndices);
}