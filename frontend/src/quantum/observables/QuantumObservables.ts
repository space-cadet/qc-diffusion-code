import { StateVector, MatrixOperator, expectationValue } from 'ts-quantum';
import { type Complex, complex } from 'mathjs';

export interface QuantumObservables {
  mean: number;
  variance: number;
}

/**
 * Creates a Position Operator X = Σ x |x><x| ⊗ I_coin
 */
export const createPositionOperator = (numPositions: number, centerOffset: number): MatrixOperator => {
  const dimension = numPositions * 2;
  const matrix = Array(dimension).fill(null)
    .map(() => Array(dimension).fill(null).map(() => complex(0, 0)));

  for (let i = 0; i < numPositions; i++) {
    const x = i - centerOffset;
    const val = complex(x, 0);
    matrix[i * 2][i * 2] = val;         // |x><x| for |up>
    matrix[i * 2 + 1][i * 2 + 1] = val; // |x><x| for |down>
  }

  return new MatrixOperator(matrix, 'hermitian', false);
};

/**
 * Creates a Position Squared Operator X^2 = Σ x^2 |x><x| ⊗ I_coin
 */
export const createPositionSquaredOperator = (numPositions: number, centerOffset: number): MatrixOperator => {
  const dimension = numPositions * 2;
  const matrix = Array(dimension).fill(null)
    .map(() => Array(dimension).fill(null).map(() => complex(0, 0)));

  for (let i = 0; i < numPositions; i++) {
    const x = i - centerOffset;
    const val = complex(x * x, 0);
    matrix[i * 2][i * 2] = val;
    matrix[i * 2 + 1][i * 2 + 1] = val;
  }

  return new MatrixOperator(matrix, 'hermitian', false);
};

export const calculateObservables = (
  state: StateVector,
  numPositions: number,
  centerOffset: number
): QuantumObservables => {
  const X = createPositionOperator(numPositions, centerOffset);
  const X2 = createPositionSquaredOperator(numPositions, centerOffset);

  const meanComplex = expectationValue(state, X);
  const meanSqComplex = expectationValue(state, X2);

  const mean = meanComplex.re;
  const meanSq = meanSqComplex.re;

  return {
    mean,
    variance: Math.max(0, meanSq - (mean * mean))
  };
};
