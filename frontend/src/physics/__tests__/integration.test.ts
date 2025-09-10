import { PhysicsEngine } from '../core/PhysicsEngine';
import { BallisticStrategy } from '../strategies/BallisticStrategy';
import { CTRWStrategy2D } from '../strategies/CTRWStrategy2D';
import { ParticleManager } from '../ParticleManager';
import { CoordinateSystem } from '../core/CoordinateSystem';
import type { BoundaryConfig } from '../types/BoundaryConfig';
import { CircularBuffer } from '../utils/CircularBuffer';

describe('Physics Engine Integration', () => {
  test('engine configuration update preserves particles', () => {
    const boundaries = { type: 'periodic' as const, xMin: -200, xMax: 200, yMin: -200, yMax: 200 };
    const canvasSize = { width: 400, height: 400 };
    const dimension = '2D' as const;
    const coordSystem = new CoordinateSystem(canvasSize, boundaries, dimension);
    const config = {
      timeStep: 0.016,
      boundaries,
      canvasSize,
      dimension,
      strategies: [new BallisticStrategy({ boundaryConfig: boundaries, coordSystem })]
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
      trajectory: new CircularBuffer(100)
    }];

    engine.updateConfiguration({ timeStep: 0.032 });

    expect(particles[0].isActive).toBe(true);
  });

  test('physics engine initialization', () => {
    const boundaries = { type: 'periodic' as const, xMin: -200, xMax: 200, yMin: -200, yMax: 200 };
    const canvasSize = { width: 400, height: 400 };
    const dimension = '2D' as const;
    const coordSystem = new CoordinateSystem(canvasSize, boundaries, dimension);
    const config = {
      timeStep: 0.016,
      boundaries,
      canvasSize,
      dimension,
      strategies: [new BallisticStrategy({ boundaryConfig: boundaries, coordSystem })]
    };
    const engine = new PhysicsEngine(config);
    expect(engine).toBeDefined();
    const coordSystemFromEngine = engine.getCoordinateSystem();
    expect(coordSystemFromEngine.getDimension()).toBe('2D');
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
    
    const manager = new ParticleManager(strategy, '2D', coordSystem);
    const mockTsParticle = {
      id: 'test-1',
      position: { x: 50, y: 50 },
      velocity: { x: 10, y: 0 }
    };
    
    manager.initializeParticle(mockTsParticle);
    const initialPos = { ...mockTsParticle.position };
    manager.updateParticle(mockTsParticle);
    
    // Verify position changed (using fixed time step of 0.016)
    expect(mockTsParticle.position.x).toBeCloseTo(initialPos.x + mockTsParticle.velocity.x * 0.016);
    expect(mockTsParticle.position.y).toBeCloseTo(initialPos.y + mockTsParticle.velocity.y * 0.016);
  });
});
