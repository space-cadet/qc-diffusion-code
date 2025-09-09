import { CTRWStrategy2D } from '../strategies/CTRWStrategy2D';
import { CircularBuffer } from '../utils/CircularBuffer';
import type { Particle, TrajectoryPoint } from '../types/Particle';
import { CoordinateSystem } from '../core/CoordinateSystem';

describe('CTRWStrategy2D', () => {
  let strategy: CTRWStrategy2D;
  let mockParticle: Particle;

  beforeEach(() => {
    const coordSystem = new CoordinateSystem(
      { width: 800, height: 600 },
      {
        type: 'periodic',
        xMin: -200,
        xMax: 200,
        yMin: -200,
        yMax: 200
      },
      '2D'
    );

    strategy = new CTRWStrategy2D({
      collisionRate: 1.0,
      jumpLength: 1.0,
      velocity: 50.0,
      boundaryConfig: {
        type: 'periodic',
        xMin: -200,
        xMax: 200,
        yMin: -200,
        yMax: 200
      },
      coordSystem
    });

    mockParticle = {
      id: 'test-1',
      position: { x: 0, y: 0 },
      velocity: { vx: 50, vy: 0 },
      lastCollisionTime: Date.now() / 1000,
      nextCollisionTime: (Date.now() / 1000) + 1.0,
      collisionCount: 0,
      trajectory: new CircularBuffer<TrajectoryPoint>(100),
      waitingTime: 0,
      isActive: true,
      lastUpdate: 0
    };
  });

  test('particle updates preserve momentum in absence of collisions', () => {
    const initialVelocity = { ...mockParticle.velocity };
    strategy.preUpdate(mockParticle, [], {} as any);
    strategy.integrate(mockParticle, 0.01, {} as any);
    expect(mockParticle.velocity).toEqual(initialVelocity);
  });

  test('collision changes velocity direction but preserves speed', () => {
    mockParticle.nextCollisionTime = 0; // Force collision
    const initialSpeed = Math.sqrt(
      mockParticle.velocity.vx ** 2 + mockParticle.velocity.vy ** 2
    );
    
    strategy.preUpdate(mockParticle, [], {} as any);
    strategy.integrate(mockParticle, 0.01, {} as any);
    
    const newSpeed = Math.sqrt(
      mockParticle.velocity.vx ** 2 + mockParticle.velocity.vy ** 2
    );
    expect(newSpeed).toBeCloseTo(initialSpeed, 5);
  });

  test('trajectory buffer maintains fixed size', () => {
    const bufferSize = mockParticle.trajectory.getCapacity();
    
    // Fill buffer beyond capacity
    for (let i = 0; i < bufferSize + 10; i++) {
      strategy.preUpdate(mockParticle, [], {} as any);
      strategy.integrate(mockParticle, 0.01, {} as any);
    }
    
    expect(mockParticle.trajectory.getSize()).toBe(bufferSize);
  });

  test('collision rate follows Poisson process', () => {
    const samples = 1000;
    const times: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      mockParticle.nextCollisionTime = 0; // Force collision
      strategy.preUpdate(mockParticle, [], {} as any);
      strategy.integrate(mockParticle, 0.01, {} as any);
      times.push(mockParticle.nextCollisionTime - mockParticle.lastCollisionTime);
    }
    
    const mean = times.reduce((a, b) => a + b) / times.length;
    expect(mean).toBeCloseTo(1.0, 1); // Should be close to 1/λ where λ=1.0
  });
});