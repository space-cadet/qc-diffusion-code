import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import { CTRWStrategy2D } from './CTRWStrategy2D';

export type StrategyType = 'CTRW' | 'Brownian';

export interface StrategyParams {
  type: StrategyType;
  collisionRate: number;
  jumpLength: number;
  velocity?: number;
  simulationType?: 'continuum' | 'graph';
  graphType?: 'lattice1D' | 'lattice2D' | 'path' | 'complete';
  graphSize?: number;
}

export class StrategyFactory {
  static createStrategy(params: StrategyParams): RandomWalkStrategy {
    switch (params.type) {
      case 'CTRW':
        return new CTRWStrategy2D({
          collisionRate: params.collisionRate,
          jumpLength: params.jumpLength,
          velocity: params.velocity
        });
      case 'Brownian':
        // TODO: Implement when Brownian strategy is needed
        throw new Error('Brownian strategy not yet implemented');
      default:
        throw new Error(`Unknown strategy type: ${params.type}`);
    }
  }
}