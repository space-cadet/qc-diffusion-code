import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import { CoordinateSystem } from '../core/CoordinateSystem';
import { CTRWStrategy1D } from '../strategies/CTRWStrategy1D';
import { CTRWStrategy2D } from '../strategies/CTRWStrategy2D';
import { LegacyBallisticStrategy } from '../strategies/LegacyBallisticStrategy';
import { CompositeStrategy } from '../strategies/CompositeStrategy';
import { InterparticleCollisionStrategy } from '../strategies/InterparticleCollisionStrategy';
import { InterparticleCollisionStrategy1D } from '../strategies/InterparticleCollisionStrategy1D';
import { getNewEngineFlag } from '../config/flags';
import { BallisticStrategy } from '../strategies/BallisticStrategy';

import { ParameterManager } from '../core/ParameterManager';

interface SimulatorParams {
  dimension: '1D' | '2D';
  strategies?: ('ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions')[];
}

export function createStrategies(parameterManager: ParameterManager, boundaryConfig: BoundaryConfig): RandomWalkStrategy[] {
  const config = { dimension: parameterManager.dimension, strategies: parameterManager.strategies };
  const physicsParams = parameterManager.getPhysicsParameters();
  const selectedStrategies = config.strategies || [];

  // Create coordinate system instance for strategies that need it
  const coordSystem = new CoordinateSystem(
    { width: 800, height: 600 }, // Default canvas size
    boundaryConfig,
    config.dimension
  );

  // For 1D, compose strategies: base is CTRW1D if selected else Ballistic; collisions added if selected
  if (config.dimension === '1D') {
    const oneDStrategies: RandomWalkStrategy[] = [];
    if (selectedStrategies.includes('ctrw')) {
      oneDStrategies.push(new CTRWStrategy1D({
        collisionRate: physicsParams.collisionRate,
        jumpLength: physicsParams.jumpLength,
        velocity: physicsParams.velocity,
        boundaryConfig: boundaryConfig,
        interparticleCollisions: false, // collisions handled via separate 1D strategy below
      }));
    } else {
      oneDStrategies.push(getNewEngineFlag() 
        ? new BallisticStrategy({ boundaryConfig })
        : new LegacyBallisticStrategy({ boundaryConfig: boundaryConfig }));
    }
    if (selectedStrategies.includes('collisions')) {
      oneDStrategies.push(new InterparticleCollisionStrategy1D({ boundaryConfig: boundaryConfig }));
    }
    return oneDStrategies.length === 1 ? [oneDStrategies[0]] : [new CompositeStrategy(oneDStrategies)];
  }

  // For 2D, compose strategies: base is Ballistic; others are added if selected
  else {
    const twoDStrategies: RandomWalkStrategy[] = [
      getNewEngineFlag()
        ? new BallisticStrategy({ boundaryConfig })
        : new LegacyBallisticStrategy({ boundaryConfig: boundaryConfig })
    ];

    if (selectedStrategies.includes('ctrw')) {
      twoDStrategies.push(new CTRWStrategy2D({
        collisionRate: physicsParams.collisionRate,
        jumpLength: physicsParams.jumpLength,
        velocity: physicsParams.velocity,
        boundaryConfig: boundaryConfig,
        coordSystem
      }));
    }

    if (selectedStrategies.includes('collisions')) {
      twoDStrategies.push(new InterparticleCollisionStrategy(boundaryConfig, coordSystem));
    }

    return twoDStrategies.length === 1 ? [twoDStrategies[0]] : [new CompositeStrategy(twoDStrategies)];
  }
}
