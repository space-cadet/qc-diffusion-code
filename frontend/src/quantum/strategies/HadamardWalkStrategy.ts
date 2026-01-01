import { StateVector, MatrixOperator, Hadamard } from 'ts-quantum';
import { complex } from 'mathjs';

/**
 * Optimized step using sparse logic within a MatrixOperator framework.
 * We manually handle the non-zero transitions to maintain O(N) performance.
 */
export const hadamardWalkStep = (
  state: StateVector,
  numPositions: number,
  _centerOffset: number
): StateVector => {
  const dimension = numPositions * 2;
  const amplitudes = state.getAmplitudes();
  const nextAmplitudes = new Array(dimension).fill(null).map(() => complex(0, 0));
  const hMatrix = Hadamard.toMatrix();

  for (let x = 0; x < numPositions; x++) {
    const idxUp = x * 2;
    const idxDown = x * 2 + 1;

    const psiUp = amplitudes[idxUp];
    const psiDown = amplitudes[idxDown];

    // 1. Apply Hadamard Coin (C):
    const phiUp = complex(
      hMatrix[0][0].re * psiUp.re - hMatrix[0][0].im * psiUp.im + hMatrix[0][1].re * psiDown.re - hMatrix[0][1].im * psiDown.im,
      hMatrix[0][0].re * psiUp.im + hMatrix[0][0].im * psiUp.re + hMatrix[0][1].re * psiDown.im + hMatrix[0][1].im * psiDown.re
    );
    const phiDown = complex(
      hMatrix[1][0].re * psiUp.re - hMatrix[1][0].im * psiUp.im + hMatrix[1][1].re * psiDown.re - hMatrix[1][1].im * psiDown.im,
      hMatrix[1][0].re * psiUp.im + hMatrix[1][0].im * psiUp.re + hMatrix[1][1].re * psiDown.im + hMatrix[1][1].im * psiDown.re
    );

    // 2. Apply Shift Operator (S):
    if (x > 0) {
      nextAmplitudes[(x - 1) * 2] = complex(
        nextAmplitudes[(x - 1) * 2].re + phiUp.re,
        nextAmplitudes[(x - 1) * 2].im + phiUp.im
      );
    } else {
      nextAmplitudes[x * 2] = complex(
        nextAmplitudes[x * 2].re + phiUp.re,
        nextAmplitudes[x * 2].im + phiUp.im
      );
    }

    if (x < numPositions - 1) {
      nextAmplitudes[(x + 1) * 2 + 1] = complex(
        nextAmplitudes[(x + 1) * 2 + 1].re + phiDown.re,
        nextAmplitudes[(x + 1) * 2 + 1].im + phiDown.im
      );
    } else {
      nextAmplitudes[x * 2 + 1] = complex(
        nextAmplitudes[x * 2 + 1].re + phiDown.re,
        nextAmplitudes[x * 2 + 1].im + phiDown.im
      );
    }
  }

  return new StateVector(dimension, nextAmplitudes);
};
