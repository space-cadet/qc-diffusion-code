
import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import { CTRWStrategy1D } from '../strategies/CTRWStrategy1D';
import { CTRWStrategy2D } from '../strategies/CTRWStrategy2D';
import { LegacyBallisticStrategy as BallisticStrategy } from '../strategies/LegacyBallisticStrategy';
import { CompositeStrategy } from '../strategies/CompositeStrategy';
import { InterparticleCollisionStrategy } from '../strategies/InterparticleCollisionStrategy';
import { InterparticleCollisionStrategy1D } from '../strategies/InterparticleCollisionStrategy1D';

interface SimulatorParams {
  dimension: '1D' | '2D';
  strategies?: ('ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions')[];
}

export function createStrategies(config: SimulatorParams, boundaryConfig: BoundaryConfig): RandomWalkStrategy[] {
  const selectedStrategies = config.strategies || [];

  // For 1D, compose strategies: base is CTRW1D if selected else Ballistic; collisions added if selected
  if (config.dimension === '1D') {
    const oneDStrategies: RandomWalkStrategy[] = [];
    if (selectedStrategies.includes('ctrw')) {
      oneDStrategies.push(new CTRWStrategy1D({
        collisionRate: 1,
        jumpLength: 1,
        velocity: 1,
        boundaryConfig: boundaryConfig,
        interparticleCollisions: false, // collisions handled via separate 1D strategy below
      }));
    } else {
      oneDStrategies.push(new BallisticStrategy({ boundaryConfig: boundaryConfig }));
    }
    if (selectedStrategies.includes('collisions')) {
      oneDStrategies.push(new InterparticleCollisionStrategy1D({ boundaryConfig: boundaryConfig }));
    }
    return oneDStrategies.length === 1 ? [oneDStrategies[0]] : [new CompositeStrategy(oneDStrategies)];
  }

  // For 2D, compose strategies: base is Ballistic; others are added if selected
  else {
    const twoDStrategies: RandomWalkStrategy[] = [new BallisticStrategy({ boundaryConfig: boundaryConfig })];

    if (selectedStrategies.includes('ctrw')) {
      twoDStrategies.push(new CTRWStrategy2D({
        collisionRate: 1,
        jumpLength: 1,
        velocity: 1,
        boundaryConfig: boundaryConfig,
      }));
    }

    if (selectedStrategies.includes('collisions')) {
      twoDStrategies.push(new InterparticleCollisionStrategy({ boundaryConfig: boundaryConfig }));
    }

    return twoDStrategies.length === 1 ? [twoDStrategies[0]] : [new CompositeStrategy(twoDStrategies)];
  }
}
