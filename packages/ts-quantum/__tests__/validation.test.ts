import { describe, it, expect, test } from 'vitest';

import {
  validateMatDims,
  validatePosDim,
  validateIdx,
  validateAmps,
  validateNorm,
  validateMatchDims
} from '../src/utils/validation';
import { Complex } from '../src/core/types';
import * as math from 'mathjs';

describe('Validation Utilities', () => {
  describe('validateMatDims', () => {
    test('accepts valid square matrix', () => {
      const matrix: Complex[][] = [
        [math.complex(1,  0), math.complex(0,  0)],
        [math.complex(0,  0), math.complex(1,  0)]
      ];
      expect(() => validateMatDims(matrix)).not.toThrow();
    });

    test('rejects empty matrix', () => {
      const matrix: Complex[][] = [];
      expect(() => validateMatDims(matrix)).toThrow('Invalid matrix: empty or undefined');
    });

    test('rejects non-square matrix', () => {
      const matrix: Complex[][] = [
        [math.complex(1,  0)],
        [math.complex(0,  0), math.complex(1,  0)]
      ];
      expect(() => validateMatDims(matrix)).toThrow('Matrix must be square');
    });
  });

  describe('validatePosDim', () => {
    test('accepts positive dimensions', () => {
      expect(() => validatePosDim(1)).not.toThrow();
      expect(() => validatePosDim(2)).not.toThrow();
      expect(() => validatePosDim(10)).not.toThrow();
    });

    test('rejects zero dimension', () => {
      expect(() => validatePosDim(0)).toThrow('Dimension must be positive');
    });

    test('rejects negative dimensions', () => {
      expect(() => validatePosDim(-1)).toThrow('Dimension must be positive');
      expect(() => validatePosDim(-10)).toThrow('Dimension must be positive');
    });
  });

  describe('validateIdx', () => {
    test('accepts valid indices', () => {
      expect(() => validateIdx(0, 2)).not.toThrow();
      expect(() => validateIdx(1, 2)).not.toThrow();
      expect(() => validateIdx(2, 5)).not.toThrow();
    });

    test('rejects negative indices', () => {
      expect(() => validateIdx(-1, 2)).toThrow('Index -1 out of bounds');
    });

    test('rejects out of bounds indices', () => {
      expect(() => validateIdx(2, 2)).toThrow('Index 2 out of bounds');
      expect(() => validateIdx(5, 3)).toThrow('Index 5 out of bounds');
    });
  });

  describe('validateAmps', () => {
    test('accepts matching dimensions', () => {
      const amps: Complex[] = [
        math.complex(1,  0),
        math.complex(0,  0)
      ];
      expect(() => validateAmps(amps, 2)).not.toThrow();
    });

    test('rejects mismatched dimensions', () => {
      const amps: Complex[] = [
        math.complex(1,  0),
        math.complex(0,  0)
      ];
      expect(() => validateAmps(amps, 3)).toThrow('Number of amplitudes must match dimension');
    });
  });

  describe('validateNorm', () => {
    test('accepts normalized amplitudes', () => {
      const amps: Complex[] = [
        math.complex(1/Math.sqrt(2),  0),
        math.complex(1/Math.sqrt(2),  0)
      ];
      expect(() => validateNorm(amps)).not.toThrow();
    });

    test('rejects non-normalized amplitudes', () => {
      const amps: Complex[] = [
        math.complex(1,  0),
        math.complex(1,  0)
      ];
      expect(() => validateNorm(amps)).toThrow('State vector must be normalized');
    });
  });

  describe('validateMatchDims', () => {
    test('accepts matching dimensions', () => {
      expect(() => validateMatchDims(2, 2)).not.toThrow();
      expect(() => validateMatchDims(3, 3)).not.toThrow();
    });

    test('rejects mismatched dimensions', () => {
      expect(() => validateMatchDims(2, 3)).toThrow('Dimension mismatch');
      expect(() => validateMatchDims(3, 2)).toThrow('Dimension mismatch');
    });
  });
});