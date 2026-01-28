import { SimulationController } from '../interfaces/SimulationController';
import * as math from 'mathjs';
import { StateVector, MatrixOperator, SparseOperator, createSparseMatrix, setSparseEntry } from 'ts-quantum';

export interface QuantumWalkState {
  step: number;
  quantumState: StateVector;
  classicalProbs: number[];
  quantumVariance: number;
  classicalVariance: number;
  quantumSpread: number;
  classicalSpread: number;
  regime: string;
}

export interface QuantumWalkParams {
  latticeSize: number;
  coinType: 'hadamard' | 'grover' | 'rotation';
  theta: number;
  boundaryType: 'periodic' | 'reflecting';
  compareClassical: boolean;
  classicalModel: 'simple' | 'persistent';
  persistence: number;
  decoherence: number;
  maxSteps: number;
}

export class QuantumWalkController implements SimulationController<QuantumWalkState, QuantumWalkParams> {
  private state: QuantumWalkState | null = null;
  private history: QuantumWalkState[] = [];
  private currentStep = 0;
  private running = false;
  private params: QuantumWalkParams | null = null;

  // Simulation state refs
  private quantumStateRef: any = null;
  private classicalStateRef: any = null;
  private coinOperator: MatrixOperator | null = null;
  private shiftOperator: SparseOperator | null = null;

  initialize(params: QuantumWalkParams): void {
    console.debug('[QuantumWalkController] Initialize with params:', params);
    this.params = params;
    this.currentStep = 0;
    this.running = false;
    this.history = [];

    // Initialize quantum state
    const dim = 2 * params.latticeSize;
    const center = Math.floor(params.latticeSize / 2);

    this.coinOperator = this.buildCoinOperator(params.coinType, params.theta);
    this.shiftOperator = this.buildShiftOperator(params.latticeSize, params.boundaryType);

    const amps = new Array(dim).fill(0).map(() => math.complex(0, 0));
    const invSqrt2 = 1 / Math.sqrt(2);
    amps[center] = math.complex(invSqrt2, 0);
    amps[params.latticeSize + center] = math.complex(invSqrt2, 0);

    const quantumState = new StateVector(dim, amps);
    this.quantumStateRef = { state: quantumState, latticeSize: params.latticeSize, currentStep: 0 };

    // Initialize classical state
    const probs = new Array(params.latticeSize).fill(0);
    probs[center] = 1.0;
    this.classicalStateRef = { probabilities: probs, latticeSize: params.latticeSize, currentStep: 0 };

    if (params.classicalModel === 'persistent') {
      const pL = new Array(params.latticeSize).fill(0);
      const pR = new Array(params.latticeSize).fill(0);
      pL[center] = 0.5;
      pR[center] = 0.5;
      this.classicalStateRef.pLeft = pL;
      this.classicalStateRef.pRight = pR;
      this.classicalStateRef.persistence = params.persistence;
    }

    this.state = this.extractState(quantumState, probs);
    this.history = [this.state];

    console.debug('[QuantumWalkController] Initialized - lattice:', params.latticeSize);
  }

  step(): QuantumWalkState {
    if (!this.params || !this.state || !this.quantumStateRef || !this.shiftOperator || !this.coinOperator) {
      throw new Error('Controller not initialized');
    }

    // Step quantum walk
    const qState = this.quantumStateRef;
    const size = qState.latticeSize;
    const identityMatrix = Array.from({ length: size }, (_, i) =>
      Array.from({ length: size }, (_, j) => (i === j ? math.complex(1, 0) : math.complex(0, 0)))
    );
    const identityOp = new MatrixOperator(identityMatrix, 'unitary');
    const fullCoinOp = this.coinOperator.tensorProduct(identityOp);

    let nextQState = fullCoinOp.apply(qState.state);
    nextQState = this.shiftOperator.apply(nextQState);

    // Apply decoherence
    if (this.params.decoherence > 0 && Math.random() < this.params.decoherence) {
      console.debug('[QuantumWalkController] Decoherence applied at step', this.currentStep);
      const amplitudes = nextQState.amplitudes;
      const probLeft = amplitudes.slice(0, size).reduce((sum, amp) => sum + Math.abs(amp.re) ** 2 + Math.abs(amp.im) ** 2, 0);
      const probRight = amplitudes.slice(size).reduce((sum, amp) => sum + Math.abs(amp.re) ** 2 + Math.abs(amp.im) ** 2, 0);
      const total = probLeft + probRight;
      const newAmps = new Array(size * 2).fill(math.complex(0, 0));

      if (Math.random() < probLeft / total) {
        for (let i = 0; i < size; i++) {
          newAmps[i] = math.divide(amplitudes[i], Math.sqrt(probLeft / total));
        }
      } else {
        for (let i = 0; i < size; i++) {
          newAmps[size + i] = math.divide(amplitudes[size + i], Math.sqrt(probRight / total));
        }
      }
      nextQState = new StateVector(size * 2, newAmps);
    }

    nextQState = nextQState.normalize();
    qState.state = nextQState;
    qState.currentStep++;

    // Step classical walk
    const cState = this.classicalStateRef;
    const nextProbs = new Array(cState.latticeSize).fill(0);

    if (!cState.pLeft || !cState.pRight) {
      // Simple walk
      for (let i = 0; i < cState.latticeSize; i++) {
        if (cState.probabilities[i] > 0) {
          nextProbs[i > 0 ? i - 1 : 0] += cState.probabilities[i] * 0.5;
          nextProbs[i < cState.latticeSize - 1 ? i + 1 : cState.latticeSize - 1] += cState.probabilities[i] * 0.5;
        }
      }
    } else {
      // Persistent walk
      const nextPL = new Array(cState.latticeSize).fill(0);
      const nextPR = new Array(cState.latticeSize).fill(0);
      const p = cState.persistence;

      for (let i = 0; i < cState.latticeSize; i++) {
        if (cState.pLeft[i] > 0) {
          if (i > 0) {
            nextPL[i - 1] += cState.pLeft[i] * p;
            nextPR[i - 1] += cState.pLeft[i] * (1 - p);
          } else {
            nextPR[0] += cState.pLeft[i];
          }
        }
        if (cState.pRight[i] > 0) {
          if (i < cState.latticeSize - 1) {
            nextPR[i + 1] += cState.pRight[i] * p;
            nextPL[i + 1] += cState.pRight[i] * (1 - p);
          } else {
            nextPL[cState.latticeSize - 1] += cState.pRight[i];
          }
        }
      }

      cState.pLeft = nextPL;
      cState.pRight = nextPR;
    }

    cState.probabilities = nextProbs;
    cState.currentStep++;

    this.currentStep++;
    this.state = this.extractState(nextQState, nextProbs);
    this.history.push(this.state);

    console.debug('[QuantumWalkController] Step', this.currentStep, 'variance:', this.state.quantumVariance);
    return this.state;
  }

  reset(): void {
    console.debug('[QuantumWalkController] Reset');
    if (this.params) {
      this.initialize(this.params);
    }
  }

  getState(): QuantumWalkState {
    if (!this.state) throw new Error('Controller not initialized');
    return this.state;
  }

  getHistory(): QuantumWalkState[] {
    return this.history;
  }

  seekToStep(n: number): QuantumWalkState {
    if (n < 0 || n >= this.history.length) {
      throw new Error(`Invalid step: ${n}`);
    }
    console.debug('[QuantumWalkController] Seeking to step', n);
    this.currentStep = n;
    this.state = this.history[n];
    return this.state;
  }

  isRunning(): boolean {
    return this.running;
  }

  getCurrentStep(): number {
    return this.currentStep;
  }

  setRunning(running: boolean): void {
    this.running = running;
  }

  private buildCoinOperator(type: string, angle: number): MatrixOperator {
    if (type === 'hadamard') {
      const h = 1 / Math.sqrt(2);
      return new MatrixOperator(
        [[math.complex(h, 0), math.complex(h, 0)], [math.complex(h, 0), math.complex(-h, 0)]],
        'unitary'
      );
    }
    if (type === 'grover') {
      return new MatrixOperator(
        [[math.complex(0, 0), math.complex(1, 0)], [math.complex(1, 0), math.complex(0, 0)]],
        'unitary'
      );
    }
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new MatrixOperator(
      [[math.complex(c, 0), math.complex(-s, 0)], [math.complex(s, 0), math.complex(c, 0)]],
      'unitary'
    );
  }

  private buildShiftOperator(size: number, boundary: string): SparseOperator {
    const dim = 2 * size;
    const matrix = createSparseMatrix(dim, dim);

    for (let pos = 0; pos < size; pos++) {
      const leftIdx = pos;
      if (boundary === 'periodic') {
        setSparseEntry(matrix, ((pos - 1 + size) % size) + size, leftIdx, math.complex(1, 0));
      } else {
        if (pos > 0) {
          setSparseEntry(matrix, pos - 1 + size, leftIdx, math.complex(1, 0));
        } else {
          setSparseEntry(matrix, 0 + size, leftIdx, math.complex(1, 0));
        }
      }

      const rightIdx = size + pos;
      if (boundary === 'periodic') {
        setSparseEntry(matrix, (pos + 1) % size, rightIdx, math.complex(1, 0));
      } else {
        if (pos < size - 1) {
          setSparseEntry(matrix, pos + 1, rightIdx, math.complex(1, 0));
        } else {
          setSparseEntry(matrix, size - 1, rightIdx, math.complex(1, 0));
        }
      }
    }

    return new SparseOperator(matrix, 'unitary');
  }

  private extractState(quantumState: StateVector, classicalProbs: number[]): QuantumWalkState {
    const size = this.params!.latticeSize;
    const x0 = (size - 1) / 2;

    // Extract quantum metrics
    const quantumProbs: number[] = [];
    for (let pos = 0; pos < size; pos++) {
      const leftAmp = quantumState.amplitudes[pos];
      const rightAmp = quantumState.amplitudes[size + pos];
      const prob = Math.abs(leftAmp.re) ** 2 + Math.abs(leftAmp.im) ** 2 + Math.abs(rightAmp.re) ** 2 + Math.abs(rightAmp.im) ** 2;
      quantumProbs.push(prob);
    }

    // Calculate metrics
    const positions = Array.from({ length: size }, (_, i) => i - x0);
    const weightedAvg = (vals: number[], weights: number[]) => {
      const total = weights.reduce((a, b) => a + b, 0);
      return total === 0 ? 0 : vals.reduce((sum, v, i) => sum + v * weights[i], 0) / total;
    };
    const calcVariance = (vals: number[], weights: number[]) => {
      const mean = weightedAvg(vals, weights);
      return weightedAvg(vals.map(v => (v - mean) ** 2), weights);
    };

    const quantumVariance = calcVariance(positions, quantumProbs);
    const classicalVariance = calcVariance(positions, classicalProbs);

    const regime = this.determineRegime(this.currentStep, size, quantumVariance);

    return {
      step: this.currentStep,
      quantumState,
      classicalProbs,
      quantumVariance,
      classicalVariance,
      quantumSpread: Math.sqrt(quantumVariance),
      classicalSpread: Math.sqrt(classicalVariance),
      regime,
    };
  }

  private determineRegime(step: number, size: number, variance: number): string {
    if (step === 0) return 'Initial';
    if (Math.sqrt(variance) > size / 4) return 'Boundary effects';
    if (step < 5) return 'Ballistic';
    return 'Diffusive';
  }
}
