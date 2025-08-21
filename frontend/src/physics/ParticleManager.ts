import type { Particle } from '../physics/types';
import type { PhysicsRandomWalk } from '../physics/PhysicsRandomWalk';

export class ParticleManager {
  private physicsEngine: PhysicsRandomWalk;
  private ctrwParticles: Map<string, Particle> = new Map();

  constructor(physicsEngine: PhysicsRandomWalk) {
    this.physicsEngine = physicsEngine;
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
      trajectory: [],
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

    this.physicsEngine.updateParticle(ctrwParticle);
    
    tsParticle.position.x = ctrwParticle.position.x;
    tsParticle.position.y = ctrwParticle.position.y;
    tsParticle.velocity.x = ctrwParticle.velocity.vx;
    tsParticle.velocity.y = ctrwParticle.velocity.vy;
  }

  getAllParticles(): Particle[] {
    return Array.from(this.ctrwParticles.values());
  }

  updatePhysicsEngine(newEngine: PhysicsRandomWalk): void {
    this.physicsEngine = newEngine;
  }

  getDensityData() {
    const particles = this.getAllParticles();
    return this.physicsEngine.calculateDensity(particles);
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
