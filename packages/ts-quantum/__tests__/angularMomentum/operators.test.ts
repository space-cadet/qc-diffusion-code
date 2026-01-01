import { describe, it, expect } from 'vitest';

import { Complex } from '../../src/core/types';
import { StateVector } from '../../src/states/stateVector';
import {
  createJplus,
  createJminus,
  createJz,
  createJx,
  createJy,
  createJ2,
  createJ2FromComponents,
  createJmState,
  jmExpectationValue
} from '../../src/angularMomentum/core';
import * as math from 'mathjs';

describe('Angular Momentum Operators', () => {
  // Test operator creation and basic properties
  describe('Operator Creation', () => {
    it('should create valid operators for j=1/2', () => {
      const j = 1/2;
      expect(() => createJplus(j)).not.toThrow();
      expect(() => createJminus(j)).not.toThrow();
      expect(() => createJz(j)).not.toThrow();
      expect(() => createJx(j)).not.toThrow();
      expect(() => createJy(j)).not.toThrow();
      expect(() => createJ2(j)).not.toThrow();
    });

    it('should throw for invalid j values', () => {
      expect(() => createJplus(-1)).toThrow();
      expect(() => createJplus(1.3)).toThrow();
    });
  });

  // Test j=1/2 matrix representations
  describe('j=1/2 Matrix Representations', () => {
    const j = 1/2;
    const jplus = createJplus(j);
    const jminus = createJminus(j);
    const jz = createJz(j);
    const jx = createJx(j);
    const jy = createJy(j);

    it('should have correct Jz matrix elements', () => {
      const matrix = jz.toMatrix();

      // console.log('Jz:', jz.toString());
      // console.log('Matrix:', matrix);

      // console.log(matrix[0][0], math.complex(1/2, 0));

      expect(matrix[0][0]).toEqual(math.complex(1/2, 0));
      expect(matrix[1][1]).toEqual(math.complex(-1/2, 0));
    });

    it('should have correct J± matrix elements', () => {
      const jplusMatrix = jplus.toMatrix();
      const jminusMatrix = jminus.toMatrix();

      console.log('J+:', jplus.toString());
      console.log('J-:', jminus.toString());

      console.log(jplusMatrix)
      
      expect(jplusMatrix[0][1]).toEqual(math.complex(1, 0));
      expect(jplusMatrix[1][0]).toEqual(math.complex(0, 0));
      expect(jminusMatrix[0][1]).toEqual(math.complex(0, 0));
      expect(jminusMatrix[1][0]).toEqual(math.complex(1, 0));
    });

    it('should have correct Jx matrix elements', () => {
      const matrix = jx.toMatrix();
      expect(matrix[0][1]).toEqual(math.complex(1/2, 0));
      expect(matrix[1][0]).toEqual(math.complex(1/2, 0));
    });

    it('should have correct Jy matrix elements', () => {
      const matrix = jy.toMatrix();

      console.log('Jy:', jy.toString());
      console.log('Matrix:', matrix);

      expect(matrix[0][1]).toEqual(math.complex(0, -1/2));
      expect(matrix[1][0]).toEqual(math.complex(0, 1/2));
    });
  });

  // Test eigenvalue equations
  describe('Eigenvalue Equations', () => {
    const j = 1/2;
    
    it('should satisfy Jz eigenvalue equation', () => {
      const jz = createJz(j);
      const state = createJmState(j, 1/2);
      const result = jz.apply(state);

      console.log('Jz', jz.toString());

      // console.log(result, typeof result);
      
      expect(result.equals(state.scale(math.complex(1/2, 0)))).toBe(true);
    });

    it('should satisfy J² eigenvalue equation', () => {
      const j2 = createJ2(j);
      const state = createJmState(j, 1/2);
      const result = j2.apply(state);
      
      // j(j+1) = 3/4 for j=1/2
      expect(result.equals(state.scale(math.complex(3/4, 0)))).toBe(true);
    });
  });

  // Test commutation relations
  describe('Commutation Relations', () => {
    const j = 1;
    const jx = createJx(j);
    const jy = createJy(j);
    const jz = createJz(j);

    console.log('Jx:', jx.toString());
    console.log('Jy:', jy.toString());
    console.log('Jz:', jz.toString());

    it('should satisfy [Jx,Jy] = iJz', () => {
      const commutator = jx.compose(jy).add(jy.compose(jx).scale(math.complex(-1, 0)));
      const expectedResult = jz.scale(math.complex(0, 1));
      
      console.log('Commutator:', commutator.toString());
      console.log('Expected Result:', expectedResult.toString());

      const matrix1 = commutator.toMatrix();
      const matrix2 = expectedResult.toMatrix();

      // console.log('Matrix 1:', matrix1);
      // console.log('Matrix 2:', matrix2);
      
      // Compare matrix elements within numerical precision
      for (let i = 0; i < matrix1.length; i++) {
        for (let j = 0; j < matrix1[i].length; j++) {
          expect(Number(math.abs(math.subtract(matrix1[i][j], matrix2[i][j]))) < 1e-10).toBe(true);
        }
      }
    });
  });

  // Test J² construction methods
  describe('J² Construction', () => {
    const j = 1;
    
    it('should give same results for both J² construction methods', () => {
      const j2Direct = createJ2(j);
      const j2FromComponents = createJ2FromComponents(j);

      console.log('J² Direct:', j2Direct.toString());
      console.log('J² From Components:', j2FromComponents.toString());
      
      const matrix1 = j2Direct.toMatrix();
      const matrix2 = j2FromComponents.toMatrix();
      
      // Compare matrix elements
      for (let i = 0; i < matrix1.length; i++) {
        for (let j = 0; j < matrix1[i].length; j++) {
          expect(Number(math.abs(math.subtract(matrix1[i][j], matrix2[i][j]))) < 1e-10).toBe(true);
        }
      }
    });
  });

  // Test expectation values
  describe('Expectation Values', () => {
    const j = 1/2;
    
    it('should compute correct Jz expectation values', () => {
      const jz = createJz(j);
      const expectUp = jmExpectationValue(jz, j, 1/2);
      const expectDown = jmExpectationValue(jz, j, -1/2);
      
      expect(Number(math.abs(math.subtract(expectUp, math.complex(1/2, 0)))) < 1e-10).toBe(true);
      expect(Number(math.abs(math.subtract(expectDown, math.complex(-1/2, 0)))) < 1e-10).toBe(true);
    });
  });
});
