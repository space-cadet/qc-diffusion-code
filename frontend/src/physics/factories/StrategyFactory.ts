
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
import { LevyFlightStrategy } from '../strategies/LevyFlightStrategy';
import { FractionalDiffusionStrategy } from '../strategies/FractionalDiffusionStrategy';

import { ParameterManager } from '../core/ParameterManager';

interface SimulatorParams {
  dimension: '1D' | '2D';
  strategies?: ('ctrw' | 'simple' | 'levy' | 'fractional' | 'collisions')[];
}

export function createStrategies(parameterManager: ParameterManager, boundaryConfig: BoundaryConfig): PhysicsStrategy[] {
  return createStrategiesInternal(parameterManager, boundaryConfig, false) as PhysicsStrategy[];
}

export function createPhysicsStrategies(parameterManager: ParameterManager, boundaryConfig: BoundaryConfig): PhysicsStrategy[] {
  return createStrategiesInternal(parameterManager, boundaryConfig, true) as PhysicsStrategy[];
}

function createStrategiesInternal(parameterManager: ParameterManager, boundaryConfig: BoundaryConfig, forPhysicsEngine: boolean): PhysicsStrategy[] {
  const config = { dimension: parameterManager.dimension, strategies: parameterManager.strategies };
  const physicsParams = parameterManager.getPhysicsParameters();
  const selectedStrategies = config.strategies || [];
  const motionStrategy = selectedStrategies.find((strategy) =>
    ['simple', 'ctrw', 'levy', 'fractional'].includes(strategy)
  ) ?? 'simple';
  const includeInterparticleCollisions = parameterManager.interparticleCollisions || selectedStrategies.includes('collisions');

  // Create coordinate system instance for strategies that need it (use actual canvas size)
  const coordSystem = new CoordinateSystem(
    { width: parameterManager.canvasWidth, height: parameterManager.canvasHeight },
    boundaryConfig,
    config.dimension
  );

  if (config.dimension === '1D') {
    const oneDStrategies: PhysicsStrategy[] = [];
    if (motionStrategy === 'ctrw') {
      oneDStrategies.push(new CTRWStrategy1D({
        collisionRate: physicsParams.collisionRate,
        jumpLength: physicsParams.jumpLength,
        velocity: physicsParams.velocity,
        boundaryConfig: boundaryConfig,
        interparticleCollisions: false, // collisions handled via separate 1D strategy below
        coordSystem,
      }));
    } else if (motionStrategy === 'levy') {
      oneDStrategies.push(new LevyFlightStrategy({ collisionRate: physicsParams.collisionRate, alpha: parameterManager.levyAlpha, scale: parameterManager.levyScale, dimension: '1D', boundaryConfig }));
    } else if (motionStrategy === 'fractional') {
      oneDStrategies.push(new FractionalDiffusionStrategy({ beta: parameterManager.fractionalBeta, waitingScale: parameterManager.fractionalWaitingScale, jumpLength: parameterManager.fractionalJumpLength, dimension: '1D', boundaryConfig }));
    } else {
      oneDStrategies.push(new BallisticStrategy({ boundaryConfig, coordSystem }));
    }
    if (includeInterparticleCollisions) {
      oneDStrategies.push(new InterparticleCollisionStrategy1D({ boundaryConfig: boundaryConfig, coordSystem }));
    }
    
    if (forPhysicsEngine) {
      // For physics engine, return array of PhysicsStrategy instances directly
      return oneDStrategies as PhysicsStrategy[];
    } else {
      // For legacy path, wrap in CompositeStrategy if needed
      return oneDStrategies.length === 1 ? [oneDStrategies[0]] : [new CompositeStrategy(oneDStrategies)];
    }
  }

  else {
    const twoDStrategies: PhysicsStrategy[] = [];
    if (motionStrategy === 'ctrw') {
      twoDStrategies.push(new CTRWStrategy2D({
        collisionRate: physicsParams.collisionRate,
        jumpLength: physicsParams.jumpLength,
        velocity: physicsParams.velocity,
        boundaryConfig: boundaryConfig,
        coordSystem
      }));
    } else if (motionStrategy === 'levy') {
      twoDStrategies.push(new LevyFlightStrategy({ collisionRate: physicsParams.collisionRate, alpha: parameterManager.levyAlpha, scale: parameterManager.levyScale, dimension: '2D', boundaryConfig }));
    } else if (motionStrategy === 'fractional') {
      twoDStrategies.push(new FractionalDiffusionStrategy({ beta: parameterManager.fractionalBeta, waitingScale: parameterManager.fractionalWaitingScale, jumpLength: parameterManager.fractionalJumpLength, dimension: '2D', boundaryConfig }));
    } else {
      twoDStrategies.push(new BallisticStrategy({ boundaryConfig, coordSystem }));
    }

    if (includeInterparticleCollisions) {
      twoDStrategies.push(new InterparticleCollisionStrategy2D({ boundaryConfig, coordSystem }));
    }

    if (forPhysicsEngine) {
      // For physics engine, return array of PhysicsStrategy instances directly
      return twoDStrategies as PhysicsStrategy[];
    } else {
      // For legacy path, wrap in CompositeStrategy if needed
      return twoDStrategies.length === 1 ? [twoDStrategies[0]] : [new CompositeStrategy(twoDStrategies)];
    }
  }
}
