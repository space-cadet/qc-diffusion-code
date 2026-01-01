import { StateVector } from 'ts-quantum';
import { type Complex, complex } from 'mathjs';

export interface QuantumWalkState {
  position: number;
  coin: number; // 0 for |up>, 1 for |down>
}

export class QuantumWalker {
  private state: StateVector;
  private numPositions: number;
  private centerOffset: number;

  constructor(numSteps: number) {
    // Total positions needed: 2 * numSteps + 1
    this.numPositions = 2 * numSteps + 1;
    this.centerOffset = numSteps;
    
    // Total dimension: numPositions * 2 (for coin state)
    const dimension = this.numPositions * 2;
    this.state = new StateVector(dimension);
    
    // Initial state: |0>|up> 
    // Index mapping: pos * 2 + coin
    const initialIdx = this.centerOffset * 2 + 0;
    this.state.setState(initialIdx, complex(1, 0));
  }

  public step(evolutionOp: (state: StateVector, numPositions: number, centerOffset: number) => StateVector): void {
    this.state = evolutionOp(this.state, this.numPositions, this.centerOffset);
  }

  public getProbabilityDistribution(): number[] {
    const dist = new Array(this.numPositions).fill(0);
    const amplitudes = this.state.getAmplitudes();
    
    for (let i = 0; i < this.numPositions; i++) {
      const ampUp = amplitudes[i * 2] as Complex;
      const ampDown = amplitudes[i * 2 + 1] as Complex;
      
      const probUp = Math.pow(ampUp.re, 2) + Math.pow(ampUp.im, 2);
      const probDown = Math.pow(ampDown.re, 2) + Math.pow(ampDown.im, 2);
      
      dist[i] = probUp + probDown;
    }
    
    return dist;
  }

  public getPositions(): number[] {
    return Array.from({ length: this.numPositions }, (_, i) => i - this.centerOffset);
  }

  public getStateVector(): StateVector {
    return this.state;
  }
}
