import { RandomWalkSimulator } from '../RandomWalkSimulator';
import { CTRWStrategy } from '../strategies/CTRWStrategy';
import { ParticleManager } from '../ParticleManager';

describe('Random Walk Integration', () => {
  let simulator: RandomWalkSimulator;

  beforeEach(() => {
    simulator = new RandomWalkSimulator({
      collisionRate: 1.0,
      jumpLength: 1.0,
      velocity: 50.0,
      particleCount: 10
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
      graphSize: 10
    });
    
    const updatedStats = simulator.getCollisionStats();
    expect(updatedStats.activeParticles).toBe(initialStats.activeParticles);
  });

  test('density field calculation', () => {
    const density = simulator.getDensityField();
    expect(density.error).toBeGreaterThanOrEqual(0);
    expect(density.rho.length).toBeGreaterThan(0);
  });

  test('particle manager and strategy coordination', () => {
    const strategy = new CTRWStrategy({
      collisionRate: 1.0,
      jumpLength: 1.0,
      velocity: 50.0
    });
    
    const manager = new ParticleManager(strategy);
    const mockTsParticle = {
      id: 'test-1',
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 }
    };
    
    manager.initializeParticle(mockTsParticle);
    manager.updateParticle(mockTsParticle);
    
    expect(mockTsParticle.position.x).not.toBe(0);
  });
});