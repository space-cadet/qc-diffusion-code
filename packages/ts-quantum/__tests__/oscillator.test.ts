/**
 * Tests for quantum harmonic oscillator operators
 */

import { describe, it, expect } from 'vitest';

import { creationOp, destructionOp, numberOp, positionOp, momentumOp, harmonicOscillator } from '../src/utils/oscillator';
import { StateVector } from '../src/states/stateVector';
import * as math from 'mathjs';

describe('Quantum Oscillator Operators', () => {
    const dim = 4; // Use 4-dimensional Hilbert space for tests

    describe('Creation/Annihilation Operators', () => {
        it('should have correct matrix elements', () => {
            const aUp = creationOp(dim);
            const aDown = destructionOp(dim);

            // Check creation operator elements
            const upMatrix = aUp.toMatrix();
            expect(upMatrix[1][0].re).toBeCloseTo(1);
            expect(upMatrix[2][1].re).toBeCloseTo(Math.sqrt(2));
            expect(upMatrix[3][2].re).toBeCloseTo(Math.sqrt(3));

            // Check annihilation operator elements
            const downMatrix = aDown.toMatrix();
            expect(downMatrix[0][1].re).toBeCloseTo(1);
            expect(downMatrix[1][2].re).toBeCloseTo(Math.sqrt(2));
            expect(downMatrix[2][3].re).toBeCloseTo(Math.sqrt(3));
        });

        it('should be adjoint of each other', () => {
            const aUp = creationOp(dim);
            const aDown = destructionOp(dim);
            const adj = aUp.adjoint();

            const adjMatrix = adj.toMatrix();
            const downMatrix = aDown.toMatrix();

            for (let i = 0; i < dim; i++) {
                for (let j = 0; j < dim; j++) {
                    expect(adjMatrix[i][j].re).toBeCloseTo(downMatrix[i][j].re);
                    expect(adjMatrix[i][j].im).toBeCloseTo(downMatrix[i][j].im);
                }
            }
        });
    });

    describe('Number Operator', () => {
        it('should have correct eigenvalues', () => {
            const n = numberOp(dim);
            const { values } = n.eigenDecompose();

            for (let i = 0; i < dim; i++) {
                expect(values[i].re).toBeCloseTo(i);
                expect(values[i].im).toBeCloseTo(0);
            }
        });
    });

    describe('Harmonic Oscillator', () => {
        it('should have correct energy eigenvalues', () => {
            const H = harmonicOscillator(dim);
            const { values } = H.eigenDecompose();

            // Energy eigenvalues should be (n + 1/2)ℏω, with ℏω = 1
            for (let i = 0; i < dim; i++) {
                expect(values[i].re).toBeCloseTo(i + 0.5);
                expect(values[i].im).toBeCloseTo(0);
            }
        });
    });

    describe('Position and Momentum', () => {
        it('should be hermitian', () => {
            const x = positionOp(dim);
            const p = momentumOp(dim);

            // Check x is Hermitian
            const xAdj = x.adjoint();
            const xMatrix = x.toMatrix();
            const xAdjMatrix = xAdj.toMatrix();

            for (let i = 0; i < dim; i++) {
                for (let j = 0; j < dim; j++) {
                    expect(xMatrix[i][j].re).toBeCloseTo(xAdjMatrix[i][j].re);
                    expect(xMatrix[i][j].im).toBeCloseTo(xAdjMatrix[i][j].im);
                }
            }

            // Check p is Hermitian
            const pAdj = p.adjoint();
            const pMatrix = p.toMatrix();
            const pAdjMatrix = pAdj.toMatrix();

            for (let i = 0; i < dim; i++) {
                for (let j = 0; j < dim; j++) {
                    expect(pMatrix[i][j].re).toBeCloseTo(pAdjMatrix[i][j].re);
                    expect(pMatrix[i][j].im).toBeCloseTo(pAdjMatrix[i][j].im);
                }
            }
        });
    });
});