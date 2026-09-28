import { describe, expect, test } from 'vitest';
import { ParameterManager } from '../core/ParameterManager';
import { createPhysicsStrategies } from '../factories/StrategyFactory';
import { KacGoldsteinStrategy } from '../strategies/KacGoldsteinStrategy';
import { MasoliverLindenberghWalkStrategy } from '../strategies/MasoliverLindenberghWalkStrategy';
import { BallisticStrategy } from '../strategies/BallisticStrategy';
import { InterparticleCollisionStrategy2D } from '../strategies/InterparticleCollisionStrategy2D';
import type { BoundaryConfig } from '../types/BoundaryConfig';

const boundaries: BoundaryConfig = { type: 'unbounded', xMin: -100, xMax: 100, yMin: -100, yMax: 100 };

function strategies(dimension: '1D' | '2D', selected: NonNullable<ParameterManager['strategies']>, collisions = false) {
  const parameters = new ParameterManager({
    collisionRate: 0.75,
    jumpLength: 1,
    velocity: 1,
    particleCount: 8,
    dimension,
    interparticleCollisions: collisions,
    strategies: selected,
    canvasWidth: 800,
    canvasHeight: 600,
  });
  return createPhysicsStrategies(parameters, boundaries);
}

describe('persistent walk strategy factory', () => {
  test('selects the exported Kac-Goldstein strategy for 1D runs', () => {
    expect(strategies('1D', ['kac-goldstein'])[0]).toBeInstanceOf(KacGoldsteinStrategy);
  });

  test('selects the exported Masoliver-Lindenbergh strategy for 2D runs', () => {
    expect(strategies('2D', ['masoliver-lindenbergh'])[0]).toBeInstanceOf(MasoliverLindenberghWalkStrategy);
  });

  test('keeps Kac-Goldstein one-dimensional and still composes 2D collisions', () => {
    expect(strategies('2D', ['kac-goldstein'])[0]).toBeInstanceOf(BallisticStrategy);
    const composed = strategies('2D', ['masoliver-lindenbergh'], true);
    expect(composed[0]).toBeInstanceOf(MasoliverLindenberghWalkStrategy);
    expect(composed[1]).toBeInstanceOf(InterparticleCollisionStrategy2D);
  });
});
