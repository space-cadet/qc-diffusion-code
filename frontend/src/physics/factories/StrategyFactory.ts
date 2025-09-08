import type { RandomWalkStrategy } from '../interfaces/RandomWalkStrategy';
import type { PhysicsStrategy } from '../interfaces/PhysicsStrategy';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import { CoordinateSystem } from '../core/CoordinateSystem';
import { CTRWStrategy1D } from '../strategies/CTRWStrategy1D';
import { CTRWStrategy2D } from '../strategies/CTRWStrategy2D';
import { CompositeStrategy } from '../strategies/CompositeStrategy';
import { InterparticleCollisionStrategy2D } from '../strategies/InterparticleCollisionStrategy2D';
import { InterparticleCollisionStrategy1D } from '../strategies/InterparticleCollisionStrategy1D';
import { getNewEngineFlag } from '../config/flags';
import { BallisticStrategy } from '../strategies/BallisticStrategy';

import { ParameterManager } from '../core/ParameterManager';

interface SimulatorParams {
  dimension: '1D' | '2D';
  strategies?: ('ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions')[];
}

export function createStrategies(parameterManager: ParameterManager, boundaryConfig: BoundaryConfig): RandomWalkStrategy[] {
  return createStrategiesInternal(parameterManager, boundaryConfig, false) as RandomWalkStrategy[];
}

export function createPhysicsStrategies(parameterManager: ParameterManager, boundaryConfig: BoundaryConfig): PhysicsStrategy[] {
  return createStrategiesInternal(parameterManager, boundaryConfig, true) as PhysicsStrategy[];
}

function createStrategiesInternal(parameterManager: ParameterManager, boundaryConfig: BoundaryConfig, forPhysicsEngine: boolean): (RandomWalkStrategy | PhysicsStrategy)[] {
  const config = { dimension: parameterManager.dimension, strategies: parameterManager.strategies };
  const physicsParams = parameterManager.getPhysicsParameters();
  const selectedStrategies = config.strategies || [];

  // Create coordinate system instance for strategies that need it (use actual canvas size)
  const coordSystem = new CoordinateSystem(
    { width: parameterManager.canvasWidth, height: parameterManager.canvasHeight },
    boundaryConfig,
    config.dimension
  );

  // For 1D, compose strategies: base is CTRW1D if selected else Ballistic; collisions added if selected
  if (config.dimension === '1D') {
    const oneDStrategies: (RandomWalkStrategy | PhysicsStrategy)[] = [];
    if (selectedStrategies.includes('ctrw')) {
      oneDStrategies.push(new CTRWStrategy1D({
        collisionRate: physicsParams.collisionRate,
        jumpLength: physicsParams.jumpLength,
        velocity: physicsParams.velocity,
        boundaryConfig: boundaryConfig,
        interparticleCollisions: false, // collisions handled via separate 1D strategy below
        coordSystem,
      }));
    } else {
      // Always use modern BallisticStrategy (uses BoundaryManager). LegacyBallisticStrategy is deprecated.
      oneDStrategies.push(new BallisticStrategy({ boundaryConfig }));
    }
    if (selectedStrategies.includes('collisions')) {
      oneDStrategies.push(new InterparticleCollisionStrategy1D({ boundaryConfig: boundaryConfig }));
    }
    
    if (forPhysicsEngine) {
      // For physics engine, return array of PhysicsStrategy instances directly
      return oneDStrategies as PhysicsStrategy[];
    } else {
      // For legacy path, wrap in CompositeStrategy if needed
      return oneDStrategies.length === 1 ? [oneDStrategies[0]] : [new CompositeStrategy(oneDStrategies as RandomWalkStrategy[])];
    }
  }

  // For 2D, compose strategies: base is Ballistic; others are added if selected
  else {
    // Always use modern BallisticStrategy (uses BoundaryManager). LegacyBallisticStrategy is deprecated.
    const twoDStrategies: (RandomWalkStrategy | PhysicsStrategy)[] = [
      new BallisticStrategy({ boundaryConfig })
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
      twoDStrategies.push(new InterparticleCollisionStrategy2D(boundaryConfig, coordSystem));
    }

    if (forPhysicsEngine) {
      // For physics engine, return array of PhysicsStrategy instances directly
      return twoDStrategies as PhysicsStrategy[];
    } else {
      // For legacy path, wrap in CompositeStrategy if needed
      return twoDStrategies.length === 1 ? [twoDStrategies[0]] : [new CompositeStrategy(twoDStrategies as RandomWalkStrategy[])];
    }
  }
}
