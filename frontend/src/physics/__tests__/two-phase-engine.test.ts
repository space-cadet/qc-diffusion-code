import { PhysicsEngine } from '../core/PhysicsEngine';
import { BallisticStrategy } from '../strategies/BallisticStrategy';
import type { Particle } from '../types/Particle';
import type { TrajectoryPoint } from '../types/Particle';
import { CircularBuffer } from '../utils/CircularBuffer';

describe('Two-Phase Physics Engine', () => {
  const boundaries = {
    type: 'reflective' as const,
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10
  };

  const config = {
    timeStep: 0.016,
    boundaries,
    canvasSize: { width: 800, height: 600 },
    dimension: '2D' as const,
    strategies: [new BallisticStrategy({ 
      boundaryConfig: boundaries,
      coordSystem: new (require('../core/CoordinateSystem')).CoordinateSystem({ width: 800, height: 600 }, boundaries, '2D')
    })]
  };

  let engine: PhysicsEngine;
  let particles: Particle[];

  beforeEach(() => {
    engine = new PhysicsEngine(config);
    particles = [
      {
        id: '1',
        position: { x: 0, y: 0 },
        velocity: { vx: 5, vy: 0 },
        isActive: true,
        lastUpdate: 0,
        lastCollisionTime: 0,
        nextCollisionTime: Infinity,
        collisionCount: 0,
        waitingTime: 0,
        trajectory: new CircularBuffer<TrajectoryPoint>(100)
      }
    ];
  });

  it('executes collision phase before motion phase', () => {
    const dt = engine.step(particles);
    expect(dt).toBeCloseTo(0.016);
    
    // After one step, particle should move according to ballistic motion
    expect(particles[0].position.x).toBeCloseTo(5 * 0.016);
    expect(particles[0].position.y).toBeCloseTo(0);
  });

  it('handles boundary collisions correctly', () => {
    // Move particle close to boundary
    particles[0].position.x = 9.95;
    
    const dt = engine.step(particles);
    
    // Particle should reflect off boundary at x=10
    expect(particles[0].position.x).toBeLessThan(10);
    expect(particles[0].velocity.vx).toBe(-5); // Velocity should reverse
  });

  it('preserves momentum in boundary collisions', () => {
    particles[0].position.x = 9.95;
    particles[0].velocity.vx = 5;
    const initialKE = 0.5 * (particles[0].velocity.vx ** 2 + particles[0].velocity.vy ** 2);
    
    engine.step(particles);
    
    const finalKE = 0.5 * (particles[0].velocity.vx ** 2 + particles[0].velocity.vy ** 2);
    expect(finalKE).toBeCloseTo(initialKE);
  });
});
