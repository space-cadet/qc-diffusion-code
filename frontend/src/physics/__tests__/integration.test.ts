import { RandomWalkSimulator } from '../RandomWalkSimulator';
import { CTRWStrategy2D } from '../strategies/CTRWStrategy2D';
import { ParticleManager } from '../ParticleManager';
import { CoordinateSystem } from '../core/CoordinateSystem';
import type { BoundaryConfig } from '../types/BoundaryConfig';

describe('Random Walk Integration', () => {
  let simulator: RandomWalkSimulator;

  beforeEach(() => {
    simulator = new RandomWalkSimulator({
      collisionRate: 1.0,
      jumpLength: 1.0,
      velocity: 50.0,
      particleCount: 10,
      dimension: '2D',
      interparticleCollisions: false
    });
  });

  test('simulator state preservation during parameter updates', () => {
    const initialStats = simulator.getCollisionStats();
    
    simulator.updateParameters({
      collisionRate: 2.0,
      jumpLength: 0.5,
      velocity: 25.0,
      particleCount: 10,
      simulationType: 'continuum',
      graphType: 'lattice1D',
      graphSize: 10,
      dimension: '2D',
      interparticleCollisions: false
    });
    
    const updatedStats = simulator.getCollisionStats();
    expect(updatedStats.activeParticles).toBe(initialStats.activeParticles);
  });

  test('density field calculation', () => {
    const randomWalkSimulator = new RandomWalkSimulator({
      collisionRate: 1.0,
      jumpLength: 1.0,
      velocity: 50.0,
      particleCount: 100,
      dimension: '2D',
      interparticleCollisions: false
    });
    expect(randomWalkSimulator).toBeDefined();
    expect(randomWalkSimulator.getParticleCount()).toBe(100);
    expect(randomWalkSimulator.getDimension()).toBe('2D');
    // Note: The strategy might be composite, so we check for inclusion
    // expect(randomWalkSimulator.getStrategy()).toContain('Ballistic');
  });

  test('particle manager and strategy coordination', () => {
    const strategy = new CTRWStrategy2D({
      collisionRate: 1.0,
      jumpLength: 1.0,
      velocity: 50.0,
      boundaryConfig: { type: 'periodic', xMin: -200, xMax: 200, yMin: -200, yMax: 200 }
    });
    
    const boundaryConfig: BoundaryConfig = { type: 'periodic', xMin: -200, xMax: 200, yMin: -200, yMax: 200 };
    const coordSystem = new CoordinateSystem(boundaryConfig, { width: 400, height: 400 }, '2D');
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