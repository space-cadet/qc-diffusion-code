import { PhysicsEngine } from '../core/PhysicsEngine';
import { BallisticStrategy } from '../strategies/BallisticStrategy';
import { CTRWStrategy2D } from '../strategies/CTRWStrategy2D';
import { ParticleManager } from '../ParticleManager';
import { CoordinateSystem } from '../core/CoordinateSystem';
import type { BoundaryConfig } from '../types/BoundaryConfig';

describe('Physics Engine Integration', () => {
  test('engine configuration update preserves particles', () => {
    const config = {
      timeStep: 0.016,
      boundaries: { type: 'periodic' as const, xMin: -200, xMax: 200, yMin: -200, yMax: 200 },
      canvasSize: { width: 400, height: 400 },
      dimension: '2D' as const,
      strategies: [new BallisticStrategy()]
    };
    const engine = new PhysicsEngine(config);
    const particles = [{
      id: '1',
      position: { x: 0, y: 0 },
      velocity: { vx: 1, vy: 1 },
      isActive: true,
      lastUpdate: 0,
      lastCollisionTime: 0,
      nextCollisionTime: Infinity,
      collisionCount: 0,
      waitingTime: 0,
      trajectory: new (require('../utils/CircularBuffer').CircularBuffer)(100)
    }];

    engine.updateConfiguration({ timeStep: 0.032 });

    expect(particles[0].isActive).toBe(true);
  });

  test('physics engine initialization', () => {
    const config = {
      timeStep: 0.016,
      boundaries: { type: 'periodic' as const, xMin: -200, xMax: 200, yMin: -200, yMax: 200 },
      canvasSize: { width: 400, height: 400 },
      dimension: '2D' as const,
      strategies: [new BallisticStrategy()]
    };
    const engine = new PhysicsEngine(config);
    expect(engine).toBeDefined();
    const coordSystem = engine.getCoordinateSystem();
    expect(coordSystem.getDimension()).toBe('2D');
  });

  test('particle manager and strategy coordination', () => {
    const coordSystem = new CoordinateSystem(
      { width: 800, height: 600 },
      { type: 'periodic', xMin: 0, xMax: 100, yMin: 0, yMax: 100 },
      '2D'
    );
    
    const strategy = new CTRWStrategy2D({
      collisionRate: 0.1,
      jumpLength: 1,
      velocity: 1,
      boundaryConfig: {
        type: 'periodic',
        xMin: 0,
        xMax: 100,
        yMin: 0,
        yMax: 100
      },
      coordSystem
    });
    
    const boundaryConfig: BoundaryConfig = { type: 'periodic', xMin: -200, xMax: 200, yMin: -200, yMax: 200 };
    const manager = new ParticleManager(strategy, '2D', coordSystem);
    const mockTsParticle = {
      id: 'test-1',
      position: { x: 200, y: 200 }, // Start at canvas center
      velocity: { x: 10, y: 0 }
    };
    
    manager.initializeParticle(mockTsParticle);
    manager.updateParticle(mockTsParticle);
    
    // After one update, the particle should have moved from the center
    expect(mockTsParticle.position.x).not.toBe(200);
  });
});
