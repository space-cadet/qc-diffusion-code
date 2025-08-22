import type { RandomWalkStrategy } from './interfaces/RandomWalkStrategy';
import { ParticleManager } from './ParticleManager';
import { CTRWStrategy } from './strategies/CTRWStrategy';

interface SimulatorParams {
  collisionRate: number;
  jumpLength: number;
  velocity: number;
  particleCount: number;
  simulationType?: string;
  graphType?: string;
  graphSize?: number;
}

export class RandomWalkSimulator {
  private particleManager: ParticleManager;
  private strategy: RandomWalkStrategy;
  private particleCount: number;
  private time: number = 0;

  constructor(params: SimulatorParams) {
    this.strategy = new CTRWStrategy({
      collisionRate: params.collisionRate,
      jumpLength: params.jumpLength,
      velocity: params.velocity
    });
    
    this.particleManager = new ParticleManager(this.strategy);
    this.particleCount = params.particleCount;
    this.initializeParticles();
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const tsParticle = {
        id: `p${i}`,
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 }
      };
      this.particleManager.initializeParticle(tsParticle);
    }
  }

  step(dt: number): void {
    this.time += dt;
    const particles = this.particleManager.getAllParticles();
    particles.forEach(particle => {
      this.particleManager.updateParticle({
        id: particle.id,
        position: particle.position,
        velocity: { x: particle.velocity.vx, y: particle.velocity.vy }
      });
    });
  }

  reset(): void {
    this.time = 0;
    this.initializeParticles();
  }

  updateParameters(params: SimulatorParams): void {
    const newStrategy = new CTRWStrategy({
      collisionRate: params.collisionRate,
      jumpLength: params.jumpLength,
      velocity: params.velocity
    });
    
    this.strategy = newStrategy;
    this.particleManager.updatePhysicsEngine(newStrategy);
  }

  getDensityField() {
    const particles = this.particleManager.getAllParticles();
    const positions = particles.map(p => p.position);
    const dx = 0.1;
    const xMin = Math.min(...positions.map(p => p.x)) - dx;
    const xMax = Math.max(...positions.map(p => p.x)) + dx;
    const bins = Math.ceil((xMax - xMin) / dx);
    
    const rho = new Array(bins).fill(0);
    positions.forEach(pos => {
      const bin = Math.floor((pos.x - xMin) / dx);
      if (bin >= 0 && bin < bins) {
        rho[bin]++;
      }
    });
    
    return {
      error: 0.01,
      rho: rho.map(count => count / (this.particleCount * dx))
    };
  }

  getCollisionStats() {
    return this.particleManager.getCollisionStats();
  }

  getTime(): number {
    return this.time;
  }

  getParticleManager(): ParticleManager {
    return this.particleManager;
  }
}