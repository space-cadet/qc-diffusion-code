import { describe, expect, test, vi } from 'vitest';
import { CoordinateSystem } from '../core/CoordinateSystem';
import { TimeManager } from '../core/TimeManager';
import { CircularBuffer } from '../utils/CircularBuffer';
import { KacGoldsteinStrategy } from '../strategies/KacGoldsteinStrategy';
import { MasoliverLindenberghWalkStrategy } from '../strategies/MasoliverLindenberghWalkStrategy';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import type { Particle, TrajectoryPoint } from '../types/Particle';
import type { PhysicsContext, StrategyEvent } from '../types/PhysicsContext';

const boundaries: BoundaryConfig = { type: 'unbounded', xMin: -100, xMax: 100, yMin: -100, yMax: 100 };

function particle(vx: number, vy: number): Particle {
  return {
    id: 'walker-1',
    position: { x: 0, y: 0 },
    velocity: { vx, vy },
    lastCollisionTime: 0,
    lastEventTime: 0,
    nextCollisionTime: 0.25,
    collisionCount: 0,
    waitingTime: 0,
    trajectory: new CircularBuffer<TrajectoryPoint>(10),
    isActive: true,
    lastUpdate: 0,
    initial: { position: { x: 0, y: 0 }, velocity: { vx, vy }, timestamp: 0 },
  };
}

function context(randomValues: number[], events: StrategyEvent[]): PhysicsContext {
  const coordinateSystem = new CoordinateSystem({ width: 200, height: 200 }, boundaries, '2D');
  const random = vi.fn(() => randomValues.shift() ?? 0.5);
  return {
    timeManager: new TimeManager(0.5),
    coordinateSystem,
    currentTime: 0.5,
    dt: 0.5,
    random,
    onStrategyEvent: (event) => events.push(event),
  };
}

describe('persistent walk strategies', () => {
  test('Kac-Goldstein flips velocity at the sampled event and integrates both segments', () => {
    const walker = particle(2, 0);
    const events: StrategyEvent[] = [];
    const physicsContext = context([0.5], events);
    const strategy = new KacGoldsteinStrategy(2, 1, boundaries);

    strategy.preUpdate(walker, [walker], physicsContext);
    strategy.integrate(walker, 0.5, physicsContext);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ time: 0.25, kind: 'turn', waitTime: 0.25, jumpLength: 0.5 });
    expect(walker.position.x).toBeCloseTo(0);
    expect(walker.velocity).toEqual({ vx: -2, vy: 0 });
    expect(walker.collisionCount).toBe(1);
  });

  test('Masoliver-Lindenbergh resets heading while preserving speed and exact event segments', () => {
    const walker = particle(3, 4);
    const events: StrategyEvent[] = [];
    const physicsContext = context([0.25, 0.5], events);
    const strategy = new MasoliverLindenberghWalkStrategy(5, 1, boundaries);

    strategy.preUpdate(walker, [walker], physicsContext);
    strategy.integrate(walker, 0.5, physicsContext);

    expect(events).toHaveLength(1);
    expect(events[0].position).toEqual({ x: 0.75, y: 1 });
    expect(Math.hypot(walker.velocity.vx, walker.velocity.vy)).toBeCloseTo(5);
    expect(walker.position.x).toBeCloseTo(0.75);
    expect(walker.position.y).toBeCloseTo(2.25);
    expect(walker.collisionCount).toBe(1);
  });
});
