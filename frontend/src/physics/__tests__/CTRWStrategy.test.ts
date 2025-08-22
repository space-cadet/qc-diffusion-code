import { CTRWStrategy } from '../strategies/CTRWStrategy';
import { CircularBuffer } from '../utils/CircularBuffer';
import type { Particle, TrajectoryPoint } from '../types/Particle';

describe('CTRWStrategy', () => {
  let strategy: CTRWStrategy;
  let mockParticle: Particle;

  beforeEach(() => {
    strategy = new CTRWStrategy({
      collisionRate: 1.0,
      jumpLength: 1.0,
      velocity: 50.0
    });

    mockParticle = {
      id: 'test-1',
      position: { x: 0, y: 0 },
      velocity: { vx: 50, vy: 0 },
      lastCollisionTime: Date.now() / 1000,
      nextCollisionTime: (Date.now() / 1000) + 1.0,
      collisionCount: 0,
      trajectory: new CircularBuffer<TrajectoryPoint>(100),
      isActive: true
    };
  });

  test('particle updates preserve momentum in absence of collisions', () => {
    const initialVelocity = { ...mockParticle.velocity };
    strategy.updateParticle(mockParticle);
    expect(mockParticle.velocity).toEqual(initialVelocity);
  });

  test('collision changes velocity direction but preserves speed', () => {
    mockParticle.nextCollisionTime = 0; // Force collision
    const initialSpeed = Math.sqrt(
      mockParticle.velocity.vx ** 2 + mockParticle.velocity.vy ** 2
    );
    
    strategy.updateParticle(mockParticle);
    
    const newSpeed = Math.sqrt(
      mockParticle.velocity.vx ** 2 + mockParticle.velocity.vy ** 2
    );
    expect(newSpeed).toBeCloseTo(initialSpeed, 5);
  });

  test('trajectory buffer maintains fixed size', () => {
    const bufferSize = mockParticle.trajectory.getCapacity();
    
    // Fill buffer beyond capacity
    for (let i = 0; i < bufferSize + 10; i++) {
      strategy.updateParticle(mockParticle);
    }
    
    expect(mockParticle.trajectory.getSize()).toBe(bufferSize);
  });

  test('collision rate follows Poisson process', () => {
    const samples = 1000;
    const times: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      mockParticle.nextCollisionTime = 0; // Force collision
      strategy.updateParticle(mockParticle);
      times.push(mockParticle.nextCollisionTime - mockParticle.lastCollisionTime);
    }
    
    const mean = times.reduce((a, b) => a + b) / times.length;
    expect(mean).toBeCloseTo(1.0, 1); // Should be close to 1/λ where λ=1.0
  });
});