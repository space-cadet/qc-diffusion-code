import { CTRWStrategy2D } from '../strategies/CTRWStrategy2D';
import { CircularBuffer } from '../utils/CircularBuffer';
import type { Particle, TrajectoryPoint } from '../types/Particle';
import { CoordinateSystem } from '../core/CoordinateSystem';
import { TimeManager } from '../core/TimeManager';
import type { PhysicsContext } from '../types/PhysicsContext';

describe('CTRWStrategy2D', () => {
  let strategy: CTRWStrategy2D;
  let mockParticle: Particle;
  let context: PhysicsContext;

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
    const timeManager = new TimeManager(0.01);
    context = {
      timeManager,
      coordinateSystem: coordSystem,
      currentTime: 0,
      dt: 0.01,
      random: Math.random,
    };

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
    strategy.preUpdate(mockParticle, [], context);
    strategy.integrate(mockParticle, 0.01, context);
    expect(mockParticle.velocity).toEqual(initialVelocity);
  });

  test('collision changes velocity direction but preserves speed', () => {
    mockParticle.nextCollisionTime = 0; // Force collision
    const initialSpeed = Math.sqrt(
      mockParticle.velocity.vx ** 2 + mockParticle.velocity.vy ** 2
    );
    
    strategy.preUpdate(mockParticle, [], context);
    strategy.integrate(mockParticle, 0.01, context);
    
    const newSpeed = Math.sqrt(
      mockParticle.velocity.vx ** 2 + mockParticle.velocity.vy ** 2
    );
    expect(newSpeed).toBeCloseTo(initialSpeed, 5);
  });

  test('trajectory buffer maintains fixed size', () => {
    const bufferSize = mockParticle.trajectory.getCapacity();
    
    // Fill buffer beyond capacity
    for (let i = 0; i < bufferSize + 10; i++) {
      strategy.preUpdate(mockParticle, [], context);
      strategy.integrate(mockParticle, 0.01, context);
    }
    
    expect(mockParticle.trajectory.getSize()).toBe(bufferSize);
  });

  test('collision rate follows Poisson process', () => {
    const samples = 1000;
    const times: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      mockParticle.nextCollisionTime = 0; // Force collision
      strategy.preUpdate(mockParticle, [], context);
      strategy.integrate(mockParticle, 0.01, context);
      times.push(mockParticle.nextCollisionTime - mockParticle.lastCollisionTime);
    }
    
    const mean = times.reduce((a, b) => a + b) / times.length;
    expect(mean).toBeCloseTo(1.0, 0); // Reduced precision to account for statistical variation
  });
});
