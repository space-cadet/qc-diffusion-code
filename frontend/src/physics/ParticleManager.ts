import type { Particle, TrajectoryPoint } from './types/Particle';
import type { RandomWalkStrategy } from './interfaces/RandomWalkStrategy';
import { CircularBuffer } from './utils/CircularBuffer';

export class ParticleManager {
  private strategy: RandomWalkStrategy;
  private ctrwParticles: Map<string, Particle> = new Map();

  constructor(strategy: RandomWalkStrategy) {
    this.strategy = strategy;
  }

  initializeParticle(tsParticle: any): Particle {
    const angle = Math.random() * 2 * Math.PI;
    const speed = 50;
    const currentTime = Date.now() / 1000;
    
    const particle: Particle = {
      id: tsParticle.id,
      position: {
        x: tsParticle.position.x,
        y: tsParticle.position.y
      },
      velocity: {
        vx: speed * Math.cos(angle),
        vy: speed * Math.sin(angle)
      },
      lastCollisionTime: currentTime,
      nextCollisionTime: currentTime + Math.random() * 0.5,
      collisionCount: 0,
      trajectory: new CircularBuffer<TrajectoryPoint>(100),
      isActive: true
    };
    
    tsParticle.velocity.x = particle.velocity.vx;
    tsParticle.velocity.y = particle.velocity.vy;
    
    this.ctrwParticles.set(particle.id, particle);
    return particle;
  }

  updateParticle(tsParticle: any): void {
    let ctrwParticle = this.ctrwParticles.get(tsParticle.id);
    
    if (!ctrwParticle) {
      ctrwParticle = this.initializeParticle(tsParticle);
    }

    this.strategy.updateParticle(ctrwParticle);
    
    // Update trajectory
    ctrwParticle.trajectory.push({
      position: { x: ctrwParticle.position.x, y: ctrwParticle.position.y },
      timestamp: Date.now() / 1000
    });
    
    tsParticle.position.x = ctrwParticle.position.x;
    tsParticle.position.y = ctrwParticle.position.y;
    tsParticle.velocity.x = ctrwParticle.velocity.vx;
    tsParticle.velocity.y = ctrwParticle.velocity.vy;
  }

  getAllParticles(): Particle[] {
    return Array.from(this.ctrwParticles.values());
  }

  updatePhysicsEngine(newStrategy: RandomWalkStrategy): void {
    this.strategy = newStrategy;
  }

  getDensityData() {
    return {
      error: 0,
      effectiveDiffusion: 0,
      effectiveVelocity: 0,
      x: [],
      rho: [],
      u: [],
      moments: { mean: 0, variance: 0, skewness: 0, kurtosis: 0 },
      collisionRate: []
    };
  }

  clearAllParticles(): void {
    this.ctrwParticles.clear();
  }

  getCollisionStats() {
    const particles = this.getAllParticles();
    const totalCollisions = particles.reduce((sum, p) => sum + p.collisionCount, 0);
    const avgCollisions = particles.length > 0 ? totalCollisions / particles.length : 0;
    
    return {
      totalCollisions,
      avgCollisions,
      activeParticles: particles.filter(p => p.isActive).length
    };
  }
}